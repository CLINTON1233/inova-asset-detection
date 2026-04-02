"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  Box,
  Calendar,
  MapPin,
  Loader2,
  ArrowLeft,
  Eye,
  Building2,
  User,
  Cpu,
  Cable,
  CheckCircle,
  Camera,
  X,
  ChevronLeft,
  Package,
  Laptop,
  Tag,
  QrCode,
  Globe,
  Info,
  Award,
  Clock,
  FileText,
  Activity,
  Shield,
  Download,
  FileSpreadsheet,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import LayoutDashboard from "../../components/LayoutDashboard";
import ProtectedPage from "../../components/ProtectedPage";
import API_BASE_URL from "../../../config/api";

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const prepId = params.id;
  const prepType = searchParams.get("type") || "device";

  const [assets, setAssets] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedAssets, setExpandedAssets] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchAssets();
  }, [prepId, prepType]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/assets/by-preparation/${prepId}?type=${prepType}`
      );
      const result = await response.json();

      if (result.success) {
        setAssets(result.data);
        setSessionInfo(result.session_info);
      } else {
        throw new Error(result.error || "Failed to load assets");
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to load asset details",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) {
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeIcon = (type) => {
    if (type === "Device") return <Cpu className="w-5 h-5 text-blue-600" />;
    return <Cable className="w-5 h-5 text-green-600" />;
  };

  const getTypeBadge = (type) => {
    if (type === "Device") {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }
    return "bg-green-100 text-green-700 border-green-200";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 border-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "maintenance":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      case "maintenance":
        return "Maintenance";
      default:
        return status || "Unknown";
    }
  };

  const handleShowDetail = (asset) => {
    setSelectedAsset(asset);
  };

  const handleExportExcel = async () => {
    if (!assets.length) return;

    setIsExporting(true);
    try {
      const summaryData = [
        ["ASSET INVENTORY REPORT"],
        ["Generated:", new Date().toLocaleString()],
        ["Session:", sessionInfo?.session_name || "N/A"],
        ["Session Number:", sessionInfo?.session_number || "N/A"],
        ["Type:", prepType === "device" ? "Device" : "Material"],
        ["Location:", sessionInfo?.location_name || "N/A"],
        [],
        ["ASSETS DETAILS"],
        [],
        [
          "No.",
          "Asset Code",
          "Asset Name",
          "Type",
          "Brand/Vendor",
          "Serial/Code",
          "Status",
          "Department",
          "Receiver",
          "Validated By",
          "Validated At",
        ],
      ];

      assets.forEach((asset, index) => {
        summaryData.push([
          index + 1,
          asset.asset_code,
          asset.asset_name,
          asset.category || "-",
          asset.brand || asset.vendor || "-",
          asset.serial_number || asset.scan_code || "-",
          getStatusLabel(asset.status),
          asset.department_name || "-",
          asset.receiver_name || "-",
          asset.validated_by_name || "System",
          formatDateTime(asset.validated_at),
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(summaryData);
      ws["!cols"] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 30 },
        { wch: 12 },
        { wch: 20 },
        { wch: 25 },
        { wch: 12 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 22 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Assets Report");
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, "-");
      XLSX.writeFile(wb, `assets_report_${timestamp}.xlsx`);

      Swal.fire({
        title: "Success!",
        text: "Excel report exported successfully",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error exporting Excel:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to export Excel file",
        icon: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!mounted) {
    return (
      <ProtectedPage>
        <LayoutDashboard activeMenu={2}>
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </LayoutDashboard>
      </ProtectedPage>
    );
  }

  const stats = {
    total: assets.length,
    active: assets.filter((a) => a.status === "active").length,
    inactive: assets.filter((a) => a.status === "inactive").length,
    maintenance: assets.filter((a) => a.status === "maintenance").length,
    devices: assets.filter((a) => a.category === "Device").length,
    materials: assets.filter((a) => a.category === "Material").length,
  };

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu={2}>
        <style jsx>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
          .asset-root { font-family: 'DM Sans', sans-serif; }
          .asset-root .mono { font-family: 'DM Mono', monospace; }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin { animation: spin 1s linear infinite; }

          .asset-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
            transition: box-shadow 0.2s ease;
          }
          .asset-card:hover {
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
          }

          .asset-th {
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 12px 16px;
            background: #f9fafb;
            white-space: nowrap;
          }
          .asset-td {
            padding: 14px 16px;
            font-size: 13px;
            color: #374151;
            border-top: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          .asset-row {
            transition: background 0.2s ease;
            cursor: pointer;
          }
          .asset-row:hover {
            background: #f8faff;
          }

          .stat-card {
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            transition: all 0.2s ease;
          }
          .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
        `}</style>

        <div className="asset-root space-y-6 max-w-7xl mx-auto px-4 py-4">
          {/* Header with Back Button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/assets")}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Box className="w-6 h-6 text-blue-600" />
                  Asset Details
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  View and manage assets from scanning session
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportExcel}
                disabled={isExporting || assets.length === 0}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    Export Excel
                  </>
                )}
              </button>
              <button
                onClick={fetchAssets}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Session Info Card */}
          {sessionInfo && (
            <div className="asset-card p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      prepType === "device" ? "bg-blue-100" : "bg-green-100"
                    }`}
                  >
                    {prepType === "device" ? (
                      <Laptop className="w-7 h-7 text-blue-600" />
                    ) : (
                      <Package className="w-7 h-7 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {sessionInfo.session_name}
                    </h2>
                    <p className="text-sm text-gray-500 font-mono mt-0.5">
                      {sessionInfo.session_number}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{formatDate(sessionInfo.session_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{sessionInfo.location_name || "No location"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          {assets.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="stat-card border border-gray-100">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-xs text-gray-500 mt-1">Total Assets</div>
              </div>
              <div className="stat-card border border-gray-100">
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <div className="text-xs text-gray-500 mt-1">Active</div>
              </div>
              <div className="stat-card border border-gray-100">
                <div className="text-2xl font-bold text-gray-500">{stats.inactive}</div>
                <div className="text-xs text-gray-500 mt-1">Inactive</div>
              </div>
              <div className="stat-card border border-gray-100">
                <div className="text-2xl font-bold text-orange-600">{stats.maintenance}</div>
                <div className="text-xs text-gray-500 mt-1">Maintenance</div>
              </div>
              <div className="stat-card border border-gray-100">
                <div className="text-2xl font-bold text-blue-600">{stats.devices}</div>
                <div className="text-xs text-gray-500 mt-1">Devices</div>
              </div>
              <div className="stat-card border border-gray-100">
                <div className="text-2xl font-bold text-green-600">{stats.materials}</div>
                <div className="text-xs text-gray-500 mt-1">Materials</div>
              </div>
            </div>
          )}

          {/* Assets Table Card */}
          <div className="asset-card overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Box className="w-5 h-5 text-blue-600" />
                    Assets in this session
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {assets.length} validated items
                  </p>
                </div>
                {assets.length > 3 && (
                  <button
                    onClick={() => setExpandedAssets(!expandedAssets)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {expandedAssets ? (
                      <>Show Less <ChevronUp className="w-4 h-4" /></>
                    ) : (
                      <>Show All ({assets.length}) <ChevronDown className="w-4 h-4" /></>
                    )}
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading assets...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="py-20 text-center">
                <div className="inline-block p-4 bg-gray-50 rounded-full mb-4">
                  <Box className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-gray-500 font-medium text-base mb-1">
                  No assets found
                </h3>
                <p className="text-gray-400 text-sm">
                  This session has no validated assets
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="asset-th text-left">Photo</th>
                      <th className="asset-th text-left">Asset Code</th>
                      <th className="asset-th text-left">Asset Name</th>
                      <th className="asset-th text-left hidden md:table-cell">Type</th>
                      <th className="asset-th text-left hidden lg:table-cell">Serial/Code</th>
                      <th className="asset-th text-left">Status</th>
                      <th className="asset-th text-left hidden xl:table-cell">Validated</th>
                      <th className="asset-th text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(expandedAssets ? assets : assets.slice(0, 5)).map((asset, idx) => (
                      <tr
                        key={asset.id_assets}
                        className="asset-row"
                        onClick={() => handleShowDetail(asset)}
                      >
                        <td className="asset-td">
                          {asset.photo_url ? (
                            <img
                              src={
                                asset.photo_url.startsWith("http")
                                  ? asset.photo_url
                                  : `http://localhost:5001${asset.photo_url}`
                              }
                              alt="Asset"
                              className="w-10 h-10 rounded-lg object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.parentElement.innerHTML =
                                  '<div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><Camera className="w-5 h-5 text-gray-400" /></div>';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Camera className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="asset-td">
                          <span className="font-mono text-xs font-semibold text-blue-700">
                            {asset.asset_code}
                          </span>
                        </td>
                        <td className="asset-td">
                          <div className="font-semibold text-gray-900 text-sm">
                            {asset.asset_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
                            {asset.brand || asset.vendor || "-"}
                          </div>
                        </td>
                        <td className="asset-td hidden md:table-cell">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTypeBadge(asset.category)}`}>
                            {getTypeIcon(asset.category)}
                            <span>{asset.category === "Device" ? "Device" : "Material"}</span>
                          </span>
                        </td>
                        <td className="asset-td hidden lg:table-cell">
                          <code className="text-xs font-mono text-gray-600">
                            {asset.serial_number || asset.scan_code || "-"}
                          </code>
                        </td>
                        <td className="asset-td">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(asset.status)}`}>
                            {getStatusLabel(asset.status)}
                          </span>
                        </td>
                        <td className="asset-td hidden xl:table-cell">
                          <div className="text-xs text-gray-700">
                            {formatDateTime(asset.validated_at)}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            by {asset.validated_by_name || "System"}
                          </div>
                        </td>
                        <td className="asset-td text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowDetail(asset);
                            }}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
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
            {!loading && assets.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-2xl">
                <p className="text-xs text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    {expandedAssets ? assets.length : Math.min(5, assets.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-700">{assets.length}</span>{" "}
                  assets
                </p>
                <p className="text-xs text-gray-400">
                  Updated {new Date().toLocaleTimeString("id-ID")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal */}
        {selectedAsset && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAsset(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeBadge(selectedAsset.category)}`}>
                    {getTypeIcon(selectedAsset.category)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Asset Details
                    </h2>
                    <p className="text-xs text-gray-500 font-mono">
                      {selectedAsset.asset_code}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-5">
                {selectedAsset.photo_url && (
                  <div className="rounded-xl overflow-hidden bg-gray-100 max-h-64 border border-gray-200">
                    <img
                      src={
                        selectedAsset.photo_url.startsWith("http")
                          ? selectedAsset.photo_url
                          : `http://localhost:5001${selectedAsset.photo_url}`
                      }
                      alt="Asset"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Main Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Asset Name</p>
                    </div>
                    <p className="font-semibold text-gray-900 text-base">
                      {selectedAsset.asset_name}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <QrCode className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        {selectedAsset.category === "Device" ? "Serial Number" : "Scan Code"}
                      </p>
                    </div>
                    <code className="text-sm font-mono text-gray-800 break-all">
                      {selectedAsset.serial_number || selectedAsset.scan_code || "-"}
                    </code>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Brand / Vendor</p>
                    </div>
                    <p className="font-medium text-gray-800">
                      {selectedAsset.brand || selectedAsset.vendor || "-"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedAsset.status)}`}>
                      {getStatusLabel(selectedAsset.status)}
                    </span>
                  </div>
                </div>

                {/* Specifications */}
                {selectedAsset.specifications && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Specifications</p>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {selectedAsset.specifications}
                    </p>
                    {selectedAsset.model && (
                      <p className="text-xs text-gray-500 mt-2">Model: {selectedAsset.model}</p>
                    )}
                  </div>
                )}

                {/* Assignment Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Assignment</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Project</span>
                      <span className="text-sm font-medium text-gray-800">
                        {selectedAsset.project_name || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Department</span>
                      <span className="text-sm font-medium text-gray-800">
                        {selectedAsset.department_name || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Receiver</span>
                      <span className="text-sm font-medium text-gray-800">
                        {selectedAsset.receiver_name || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Location</span>
                      <span className="text-sm font-medium text-gray-800">
                        {selectedAsset.location_name || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Validation Info */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold">Validation Information</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-blue-600">Validated By</span>
                      <span className="text-sm font-medium text-blue-800">
                        {selectedAsset.validated_by_name || "System"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-blue-600">Validated At</span>
                      <span className="text-sm font-medium text-blue-800">
                        {formatDateTime(selectedAsset.validated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </LayoutDashboard>
    </ProtectedPage>
  );
}