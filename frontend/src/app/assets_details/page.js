"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Box,
    ArrowLeft,
    Calendar,
    MapPin,
    Package,
    Laptop,
    Cable,
    Server,
    User,
    Building2,
    Hash,
    Camera,
    Eye,
    Loader2,
    Download,
    FileSpreadsheet,
    ChevronDown,
    X,
    Search,
    Filter,
    Printer,
} from "lucide-react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";

export default function AssetsDetailsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const prepId = searchParams.get("prep_id");
    const prepType = searchParams.get("type");

    const [assets, setAssets] = useState([]);
    const [sessionInfo, setSessionInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [showPhotoModal, setShowPhotoModal] = useState(false);

    useEffect(() => {
        if (prepId && prepType) {
            loadAssetsByPreparation();
        } else {
            router.push("/inventory_data");
        }
    }, [prepId, prepType]);

    const loadAssetsByPreparation = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/assets/by-preparation/${prepId}?type=${prepType}`
            );
            const result = await response.json();

            if (result.success) {
                setAssets(result.data || []);
                setSessionInfo(result.session_info);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Error loading assets:", error);
            Swal.fire({
                title: "Error!",
                text: "Failed to load asset details",
                icon: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredAssets = assets.filter((asset) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            asset.asset_name?.toLowerCase().includes(searchLower) ||
            asset.asset_code?.toLowerCase().includes(searchLower) ||
            asset.serial_number?.toLowerCase().includes(searchLower) ||
            asset.scan_code?.toLowerCase().includes(searchLower) ||
            asset.department_name?.toLowerCase().includes(searchLower) ||
            asset.receiver_name?.toLowerCase().includes(searchLower)
        );
    });

    const getTypeIcon = (category) => {
        if (category === "Device") return <Laptop className="w-4 h-4 text-blue-600" />;
        if (category === "Material") return <Cable className="w-4 h-4 text-green-600" />;
        return <Server className="w-4 h-4 text-gray-500" />;
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleViewPhoto = (asset) => {
        if (asset.photo_url) {
            setSelectedAsset(asset);
            setShowPhotoModal(true);
        } else {
            Swal.fire({
                title: "No Photo",
                text: "No photo available for this asset",
                icon: "info",
            });
        }
    };

    const exportToExcel = () => {
        try {
            const dataToExport = filteredAssets.map((asset) => ({
                "Asset Code": asset.asset_code,
                "Asset Name": asset.asset_name,
                "Type": asset.asset_type,
                "Category": asset.category,
                "Serial Number": asset.serial_number || "-",
                "Scan Code": asset.scan_code || "-",
                "Project": asset.project_name || "-",
                "Department": asset.department_name || "-",
                "Receiver": asset.receiver_name || "-",
                "Location": asset.location_name || "-",
                "Brand/Vendor": asset.brand || asset.vendor || "-",
                "Model": asset.model || "-",
                "Specifications": asset.specifications || "-",
                "Status": asset.status === "active" ? "Active" : asset.status,
                "Validated By": asset.validated_by_name || "System",
                "Validated At": formatDateTime(asset.validated_at),
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Assets");

            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
            XLSX.writeFile(wb, `assets_${sessionInfo?.session_number || "session"}_${timestamp}.xlsx`);
            setShowExportDropdown(false);
        } catch (error) {
            console.error("Error exporting to Excel:", error);
            Swal.fire("Error", "Failed to export data", "error");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const stats = {
        total: assets.length,
        devices: assets.filter((a) => a.category === "Device").length,
        materials: assets.filter((a) => a.category === "Material").length,
    };

    if (loading) {
        return (
            <ProtectedPage>
                <LayoutDashboard activeMenu={2}>
                    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                        <div className="text-center">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                            <p className="text-gray-600 font-medium">Loading assets...</p>
                        </div>
                    </div>
                </LayoutDashboard>
            </ProtectedPage>
        );
    }

    return (
        <ProtectedPage>
            <LayoutDashboard activeMenu={2}>
                <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
          .details-root { font-family: 'DM Sans', sans-serif; }
          .details-root .mono { font-family: 'DM Mono', monospace; }

          .details-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          }

          .stats-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
          }

          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background: white;
            }
            .details-card {
              box-shadow: none;
              border: 1px solid #e5e7eb;
            }
          }
        `}</style>

                <div className="details-root space-y-5">
                    {/* Header with Back Button */}
                    <div className="flex items-center justify-between no-print">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push("/inventory_data")}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Box className="w-5 h-5 text-blue-600" />
                                    <h1 className="text-xl font-bold text-gray-900">
                                        Assets Details
                                    </h1>
                                </div>
                                <p className="text-sm text-gray-500">
                                    View all validated assets from this scanning session
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                <Printer className="w-4 h-4" />
                                Print
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Export
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                                {showExportDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)} />
                                        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                                            <button
                                                onClick={exportToExcel}
                                                className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                            >
                                                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                                Export to Excel
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Session Info Card */}
                    {sessionInfo && (
                        <div className="details-card p-5 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Package className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Session Name</p>
                                        <p className="font-semibold text-gray-900">{sessionInfo.session_name}</p>
                                        <p className="text-xs text-gray-400 font-mono">{sessionInfo.session_number}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Date</p>
                                        <p className="font-semibold text-gray-900">{formatDate(sessionInfo.session_date)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Location</p>
                                        <p className="font-semibold text-gray-900">{sessionInfo.location_name || "-"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                        <Box className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Total Assets</p>
                                        <p className="font-semibold text-gray-900">{stats.total} items</p>
                                        <p className="text-xs text-gray-400">
                                            {stats.devices} Devices • {stats.materials} Materials
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats Summary */}
                    <div className="grid grid-cols-3 gap-4 no-print">
                        <div className="details-card p-4 text-center">
                            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                            <p className="text-xs text-gray-500">Total Assets</p>
                        </div>
                        <div className="details-card p-4 text-center">
                            <p className="text-2xl font-bold text-purple-600">{stats.devices}</p>
                            <p className="text-xs text-gray-500">Devices</p>
                        </div>
                        <div className="details-card p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">{stats.materials}</p>
                            <p className="text-xs text-gray-500">Materials</p>
                        </div>
                    </div>

                    {/* Search and Filter */}
                    <div className="flex flex-wrap items-center gap-3 no-print">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, code, serial, department, receiver..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={loadAssetsByPreparation}
                            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Refresh
                        </button>
                    </div>

                    {/* Assets Table */}
                    <div className="details-card overflow-hidden">
                        {filteredAssets.length === 0 ? (
                            <div className="py-20 text-center">
                                <Box className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                                <h3 className="text-gray-800 font-semibold text-lg mb-1">No assets found</h3>
                                <p className="text-gray-400 text-sm">
                                    {searchTerm ? "Try adjusting your search" : "No assets in this session"}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr style={{ background: "#f8fafc" }}>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Photo</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Asset Info</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Serial/Code</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Department</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Receiver</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden xl:table-cell">Location</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAssets.map((asset, idx) => (
                                            <tr key={asset.id_assets} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    {asset.photo_url ? (
                                                        <img
                                                            src={
                                                                asset.photo_url.startsWith("http")
                                                                    ? asset.photo_url
                                                                    : `http://localhost:5001${asset.photo_url}`
                                                            }
                                                            alt={asset.asset_name}
                                                            className="w-12 h-12 rounded-lg object-cover cursor-pointer hover:opacity-80 transition"
                                                            onClick={() => handleViewPhoto(asset)}
                                                            onError={(e) => {
                                                                e.target.style.display = "none";
                                                                e.target.parentElement.innerHTML = `
                                  <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <Camera class="w-5 h-5 text-gray-400" />
                                  </div>
                                `;
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                                            <Camera className="w-5 h-5 text-gray-400" />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {getTypeIcon(asset.category)}
                                                        <div>
                                                            <div className="font-semibold text-gray-900 text-sm">
                                                                {asset.asset_name}
                                                            </div>
                                                            <div className="text-xs text-gray-500 font-mono">
                                                                {asset.asset_code}
                                                            </div>
                                                            {asset.specifications && (
                                                                <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                                                                    {asset.specifications}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                                                        {asset.serial_number || asset.scan_code || "-"}
                                                    </code>
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    <div className="flex items-center gap-1">
                                                        <Building2 className="w-3 h-3 text-gray-400" />
                                                        <span className="text-sm text-gray-600">
                                                            {asset.department_name || "-"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    <div className="flex items-center gap-1">
                                                        <User className="w-3 h-3 text-gray-400" />
                                                        <span className="text-sm text-gray-600">
                                                            {asset.receiver_name || "-"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 hidden xl:table-cell">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3 text-gray-400" />
                                                        <span className="text-sm text-gray-600">
                                                            {asset.location_name || "-"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => handleViewPhoto(asset)}
                                                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Photo"
                                                        disabled={!asset.photo_url}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Footer */}
                        {filteredAssets.length > 0 && (
                            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-2xl">
                                <p className="text-xs text-gray-500">
                                    Showing {filteredAssets.length} of {assets.length} assets
                                    {searchTerm && <span className="text-gray-400"> · "{searchTerm}"</span>}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Photo Modal */}
                {showPhotoModal && selectedAsset && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowPhotoModal(false)}
                    >
                        <div
                            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-900">{selectedAsset.asset_name}</h3>
                                <button
                                    onClick={() => setShowPhotoModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4">
                                <img
                                    src={
                                        selectedAsset.photo_url.startsWith("http")
                                            ? selectedAsset.photo_url
                                            : `http://localhost:5001${selectedAsset.photo_url}`
                                    }
                                    alt={selectedAsset.asset_name}
                                    className="w-full h-auto rounded-lg"
                                />
                                <div className="mt-4 space-y-2">
                                    <p className="text-sm text-gray-600">
                                        <strong>Asset Code:</strong> {selectedAsset.asset_code}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <strong>Serial/Code:</strong> {selectedAsset.serial_number || selectedAsset.scan_code || "-"}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <strong>Department:</strong> {selectedAsset.department_name || "-"}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <strong>Receiver:</strong> {selectedAsset.receiver_name || "-"}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <strong>Validated At:</strong> {formatDateTime(selectedAsset.validated_at)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </LayoutDashboard>
        </ProtectedPage>
    );
}