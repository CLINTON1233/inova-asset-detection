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
  ChevronDown,
  ChevronUp,
  Package,
  Laptop,
  Tag,
  QrCode,
  Info,
  Clock,
  FileText,
  Activity,
  FileSpreadsheet,
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
      Swal.fire({ title: "Error!", text: error.message || "Failed to load asset details", icon: "error" });
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
      return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getTypeIcon = (type) => {
    if (type === "Device") return <Cpu className="w-4 h-4 text-blue-600" />;
    return <Cable className="w-4 h-4 text-emerald-600" />;
  };

  const getTypeBadge = (type) => {
    if (type === "Device") return "badge-device";
    return "badge-material";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "badge-active";
      case "inactive": return "badge-inactive";
      default: return "badge-inactive";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "active": return "Active";
      case "inactive": return "Inactive";
      default: return status || "Unknown";
    }
  };

  const handleShowDetail = (asset) => setSelectedAsset(asset);

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
        ["No.", "Asset Code", "Asset Name", "Type", "Brand/Vendor", "Serial/Code", "Status", "Department", "Receiver", "Validated By", "Validated At"],
      ];
      assets.forEach((asset, index) => {
        summaryData.push([
          index + 1, asset.asset_code, asset.asset_name, asset.category || "-",
          asset.brand || asset.vendor || "-",
          asset.serial_number || asset.scan_code || "-",
          getStatusLabel(asset.status), asset.department_name || "-",
          asset.receiver_name || "-", asset.validated_by_name || "System",
          formatDateTime(asset.validated_at),
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(summaryData);
      ws["!cols"] = [{ wch: 6 }, { wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 22 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Assets Report");
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, "-");
      XLSX.writeFile(wb, `assets_report_${timestamp}.xlsx`);
      Swal.fire({ title: "Success!", text: "Excel report exported successfully", icon: "success", timer: 2000, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ title: "Error!", text: "Failed to export Excel file", icon: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  if (!mounted) {
    return (
      <ProtectedPage>
        <LayoutDashboard activeMenu={2}>
          <div className="min-h-screen flex items-center justify-center">
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
    devices: assets.filter((a) => a.category === "Device").length,
    materials: assets.filter((a) => a.category === "Material").length,
  };

  const displayedAssets = expandedAssets ? assets : assets.slice(0, 5);

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu={2}>
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
          .ad-root { font-family: 'DM Sans', sans-serif; }
          .ad-root * { box-sizing: border-box; }

          .vv-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
            transition: box-shadow 0.2s ease;
          }
          .vv-card:hover {
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
          }

          .ai-section {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            overflow: hidden;
          }

          .ai-th {
            padding: 10px 14px;
            font-size: 11px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            background: #f9fafb;
            white-space: nowrap;
            border-bottom: 1px solid #e5e7eb;
          }
          .ai-td {
            padding: 13px 14px;
            font-size: 13px;
            color: #374151;
            border-top: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          .ai-row { cursor: pointer; transition: background 0.1s; }
          .ai-row:hover { background: #f8faff; }

          .badge-device   { background:#dbeafe; color:#1d4ed8; border:1px solid #bfdbfe; }
          .badge-material { background:#d1fae5; color:#065f46; border:1px solid #a7f3d0; }
          .badge-active    { background:#d1fae5; color:#065f46; border:1px solid #a7f3d0; }
          .badge-inactive  { background:#f3f4f6; color:#6b7280; border:1px solid #e5e7eb; }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
          }

          .ai-view-btn {
            opacity: 1;
            transition: opacity 0.15s, transform 0.15s;
          }

          .ai-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 18px;
            background: #f9fafb;
            border-top: 1px solid #f3f4f6;
          }

          .ai-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 72px 24px;
            text-align: center;
          }

          .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 50;
            padding: 16px;
          }
          .modal-box {
            background: #fff;
            border-radius: 20px;
            max-width: 640px;
            width: 100%;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0,0,0,0.25);
          }

          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          .animate-spin { animation: spin 1s linear infinite; }
          
          .font-mono {
            font-family: 'DM Mono', monospace;
          }
        `}</style>

        <div className="ad-root space-y-5">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/assets")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Box className="w-5 h-5 text-blue-600" />
                  Asset Details
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  View and manage assets from scanning session
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                disabled={isExporting || assets.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}
              >
                {isExporting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Exporting...</>
                ) : (
                  <><FileSpreadsheet className="w-4 h-4" />Export Excel</>
                )}
              </button>
              <button
                onClick={fetchAssets}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* ── Session Info KPI Card ── */}
          {sessionInfo && (
            <div className="vv-card">
              <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${prepType === "device" ? "bg-blue-50" : "bg-emerald-50"}`}>
                    {prepType === "device"
                      ? <Laptop className="w-6 h-6 text-blue-600" />
                      : <Package className="w-6 h-6 text-emerald-600" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{sessionInfo.session_name}</h2>
                    <p className="text-xs text-gray-400 font-mono mt-1">{sessionInfo.session_number}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{formatDate(sessionInfo.session_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{sessionInfo.location_name || "No location"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-gray-100">
                {[
                  { label: "Total Assets", value: stats.total, accent: "#2563eb" },
                  { label: "Active", value: stats.active, accent: "#059669" },
                  { label: "Inactive", value: stats.inactive, accent: "#6b7280" },
                  { label: "Devices", value: stats.devices, accent: "#3b82f6" },
                  { label: "Materials", value: stats.materials, accent: "#10b981" },
                ].map((d, i) => (
                  <div key={i} className="flex flex-col items-center justify-center py-5 px-3 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">{d.label}</p>
                    <span className="text-3xl font-bold" style={{ color: d.accent }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Assets Table Card ── */}
          {/* ── Assets Table Card ── */}
          <div className="ai-section">
            <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Box className="w-4 h-4 text-blue-600" />
                  Assets in this session
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{assets.length} validated items</p>
              </div>

              {assets.length > 5 && (
                <button
                  onClick={() => setExpandedAssets(!expandedAssets)}
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {expandedAssets
                    ? <><ChevronUp className="w-4 h-4" />Show Less</>
                    : <><ChevronDown className="w-4 h-4" />Show All ({assets.length})</>}
                </button>
              )}
            </div>

            {loading ? (
              <div className="ai-empty">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
                <p className="text-sm text-gray-600 font-medium">Loading assets...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="ai-empty">
                <div className="p-3 rounded-full bg-transparent inline-block mb-4">
                  <Box className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">No assets found</h3>
                <p className="text-xs text-gray-400">This session has no validated assets</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Photo</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Asset Code</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Asset Name</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">Type</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Serial Number/Scan Code</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden xl:table-cell">Validated</th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayedAssets.map((asset) => (
                      <tr
                        key={asset.id_assets}
                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => handleShowDetail(asset)}
                      >
                        {/* Photo */}
                        <td className="py-3 px-4">
                          {asset.photo_url ? (
                            <img
                              src={asset.photo_url.startsWith("http") ? asset.photo_url : `http://localhost:5001${asset.photo_url}`}
                              alt="Asset"
                              className="w-9 h-9 rounded-lg object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.parentElement.innerHTML = `<div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#9ca3af" stroke-width="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>`;
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Camera className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </td>

                        {/* Asset Code */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] font-medium text-blue-600">
                            {asset.asset_code}
                          </span>
                        </td>
                        {/* Asset Name */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors truncate max-w-[180px]">
                            {asset.asset_name}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate max-w-[180px] mt-0.5">
                            {asset.brand || asset.vendor || "-"}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${asset.category === "Device" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {asset.category === "Device" ? (
                              <Laptop className="w-3 h-3 mr-1" />
                            ) : (
                              <Package className="w-3 h-3 mr-1" />
                            )}
                            {asset.category === "Device" ? "Device" : "Material"}
                          </span>
                        </td>

                        {/* Serial / Code */}
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <code className="font-mono text-[11px] text-gray-600">
                            {asset.serial_number || asset.scan_code || "-"}
                          </code>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${asset.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {asset.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Validated */}
                        <td className="py-3 px-4 hidden xl:table-cell">
                          <div className="text-xs text-gray-600">{formatDateTime(asset.validated_at)}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">by {asset.validated_by_name || "System"}</div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleShowDetail(asset); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && assets.length > 0 && (
              <div className="ai-footer">
                <p className="text-xs text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    {expandedAssets ? assets.length : Math.min(5, assets.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-700">{assets.length}</span>{" "}
                  assets
                </p>
                <p className="text-[11px] text-gray-400">
                  Updated {new Date().toLocaleTimeString("id-ID")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Detail Modal ── */}
        {selectedAsset && (
          <div className="modal-backdrop" onClick={() => setSelectedAsset(null)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedAsset.category === "Device" ? "bg-blue-50" : "bg-emerald-50"}`}>
                    {selectedAsset.category === "Device"
                      ? <Laptop className="w-5 h-5 text-blue-600" />
                      : <Package className="w-5 h-5 text-emerald-600" />}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Asset Details</h2>
                    <p className="text-[11px] text-gray-400 font-mono">{selectedAsset.asset_code}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedAsset(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4" style={{ maxHeight: "calc(90vh - 140px)" }}>
                {selectedAsset.photo_url && (
                  <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-200 max-h-56">
                    <img
                      src={selectedAsset.photo_url.startsWith("http") ? selectedAsset.photo_url : `http://localhost:5001${selectedAsset.photo_url}`}
                      alt="Asset"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Asset Name</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{selectedAsset.asset_name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <QrCode className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{selectedAsset.category === "Device" ? "Serial Number" : "Scan Code"}</p>
                    </div>
                    <p className="text-sm font-mono text-gray-800 break-all">{selectedAsset.serial_number || selectedAsset.scan_code || "-"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Brand / Vendor</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{selectedAsset.brand || selectedAsset.vendor || "-"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Status</p>
                    </div>
                    <span className={`badge ${getStatusColor(selectedAsset.status)}`}>{getStatusLabel(selectedAsset.status)}</span>
                  </div>
                </div>

                {selectedAsset.specifications && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Specifications</p>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedAsset.specifications}</p>
                    {selectedAsset.model && <p className="text-xs text-gray-400 mt-2">Model: {selectedAsset.model}</p>}
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Assignment</p>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Project", value: selectedAsset.project_name || "-" },
                      { label: "Department", value: selectedAsset.department_name || "-" },
                      { label: "Receiver", value: selectedAsset.receiver_name || "-" },
                      { label: "Location", value: selectedAsset.location_name || "-" },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{row.label}</span>
                        <span className="text-sm font-medium text-gray-800">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                    <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Validation Information</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-600">Validated By</span>
                      <span className="text-sm font-semibold text-blue-800">{selectedAsset.validated_by_name || "System"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-600">Validated At</span>
                      <span className="text-sm font-semibold text-blue-800">{formatDateTime(selectedAsset.validated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition"
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