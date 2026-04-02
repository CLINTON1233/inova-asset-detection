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
    return new Date(dateString).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
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
      case "maintenance": return "badge-maintenance";
      default: return "badge-inactive";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "active": return "Active";
      case "inactive": return "Inactive";
      case "maintenance": return "Maintenance";
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
    maintenance: assets.filter((a) => a.status === "maintenance").length,
    devices: assets.filter((a) => a.category === "Device").length,
    materials: assets.filter((a) => a.category === "Material").length,
  };

  const displayedAssets = expandedAssets ? assets : assets.slice(0, 5);

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu={2}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
          .ad-root { font-family: 'DM Sans', sans-serif; }
          .ad-root * { box-sizing: border-box; }

          /* ─── Shared card shell ─── */
          .vv-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
            transition: box-shadow 0.2s ease;
          }
          .vv-card:hover {
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
          }

          /* ─── Section card (table container) ─── */
          .ai-section {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            overflow: hidden;
          }

          /* ─── Table ─── */
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

          /* ─── Badges ─── */
          .badge-device   { background:#dbeafe; color:#1d4ed8; border:1px solid #bfdbfe; }
          .badge-material { background:#d1fae5; color:#065f46; border:1px solid #a7f3d0; }
          .badge-active      { background:#d1fae5; color:#065f46; border:1px solid #a7f3d0; }
          .badge-inactive    { background:#f3f4f6; color:#6b7280; border:1px solid #e5e7eb; }
          .badge-maintenance { background:#ffedd5; color:#9a3412; border:1px solid #fed7aa; }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
          }

          /* ─── View button ─── */
          .ai-view-btn {
            opacity: 1;
            transition: opacity 0.15s, transform 0.15s;
          }

          /* ─── Footer bar ─── */
          .ai-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 18px;
            background: #f9fafb;
            border-top: 1px solid #f3f4f6;
          }

          /* ─── Empty state ─── */
          .ai-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 72px 24px;
            text-align: center;
          }

          /* ─── Modal backdrop ─── */
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

          /* ─── Spin ─── */
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          .animate-spin { animation: spin 1s linear infinite; }
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
              {/* Session identity row */}
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: prepType === "device" ? "#eff6ff" : "#ecfdf5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {prepType === "device"
                      ? <Laptop className="w-6 h-6 text-blue-600" />
                      : <Package className="w-6 h-6 text-emerald-600" />}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
                      {sessionInfo.session_name}
                    </h2>
                    <p style={{ fontFamily: "DM Mono,monospace", fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                      {sessionInfo.session_number}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Calendar style={{ width: 14, height: 14, color: "#9ca3af" }} />
                    <span style={{ fontSize: 13, color: "#6b7280" }}>{formatDate(sessionInfo.session_date)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin style={{ width: 14, height: 14, color: "#9ca3af" }} />
                    <span style={{ fontSize: 13, color: "#6b7280" }}>{sessionInfo.location_name || "No location"}</span>
                  </div>
                </div>
              </div>

              {/* KPI stats row — same pattern as inventory page */}
              <div className="grid grid-cols-3 lg:grid-cols-6 divide-x divide-gray-100">
                {[
                  { label: "Total Assets", value: stats.total, accent: "#2563eb" },
                  { label: "Active", value: stats.active, accent: "#059669" },
                  { label: "Inactive", value: stats.inactive, accent: "#6b7280" },
                  { label: "Maintenance", value: stats.maintenance, accent: "#d97706" },
                  { label: "Devices", value: stats.devices, accent: "#3b82f6" },
                  { label: "Materials", value: stats.materials, accent: "#10b981" },
                ].map((d, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "20px 12px",
                      textAlign: "center",
                    }}
                  >
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                      {d.label}
                    </p>
                    <span style={{ fontSize: 30, fontWeight: 700, color: d.accent }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Assets Table Card ── */}
          <div className="ai-section">
            {/* Section Header */}
            <div style={{ padding: "18px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 8 }}>
                  <Box className="w-4 h-4 text-blue-600" />
                  Assets in this session
                </h2>
                <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
                  {assets.length} validated items
                </p>
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

            {/* Content */}
            {loading ? (
              <div className="ai-empty">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
                <p style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>Loading assets...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="ai-empty">
                <div style={{ padding: 12, borderRadius: 60, background: "transparent", display: "inline-block", marginBottom: 16 }}>
                  <Box className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", marginBottom: 4 }}>No assets found</h3>
                <p style={{ fontSize: 12, color: "#9ca3af" }}>This session has no validated assets</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="ai-th text-left">Photo</th>
                      <th className="ai-th text-left">Asset Code</th>
                      <th className="ai-th text-left">Asset Name</th>
                      <th className="ai-th text-left" style={{ display: "none" }} data-md="true">Type</th>
                      <th className="ai-th text-left hidden md:table-cell">Type</th>
                      <th className="ai-th text-left hidden lg:table-cell">Serial / Code</th>
                      <th className="ai-th text-left">Status</th>
                      <th className="ai-th text-left hidden xl:table-cell">Validated</th>
                      <th className="ai-th text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedAssets.map((asset) => (
                      <tr
                        key={asset.id_assets}
                        className="ai-row"
                        onClick={() => handleShowDetail(asset)}
                      >
                        {/* Photo */}
                        <td className="ai-td">
                          {asset.photo_url ? (
                            <img
                              src={asset.photo_url.startsWith("http") ? asset.photo_url : `http://localhost:5001${asset.photo_url}`}
                              alt="Asset"
                              style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }}
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.parentElement.innerHTML = `<div style="width:36px;height:36px;border-radius:10px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#9ca3af" stroke-width="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>`;
                              }}
                            />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Camera style={{ width: 16, height: 16, color: "#9ca3af" }} />
                            </div>
                          )}
                        </td>

                        {/* Asset Code */}
                        <td className="ai-td">
                          <span style={{ fontFamily: "DM Mono,", fontSize: 11, fontWeight: 600, color: "#2563eb" }}>
                            {asset.asset_code}
                          </span>
                        </td>

                        {/* Asset Name */}
                        <td className="ai-td">
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {asset.asset_name}
                          </div>
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {asset.brand || asset.vendor || "-"}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="ai-td hidden md:table-cell">
                          <span className={`badge ${getTypeBadge(asset.category)}`}>
                            {getTypeIcon(asset.category)}
                            {asset.category === "Device" ? "Device" : "Material"}
                          </span>
                        </td>

                        {/* Serial */}
                        <td className="ai-td hidden lg:table-cell">
                          <code style={{ fontFamily: "DM Mono,monospace", fontSize: 11, color: "#6b7280" }}>
                            {asset.serial_number || asset.scan_code || "-"}
                          </code>
                        </td>

                        {/* Status */}
                        <td className="ai-td">
                          <span className={`badge ${getStatusColor(asset.status)}`}>
                            {getStatusLabel(asset.status)}
                          </span>
                        </td>

                        {/* Validated */}
                        <td className="ai-td hidden xl:table-cell">
                          <div style={{ fontSize: 12, color: "#374151" }}>{formatDateTime(asset.validated_at)}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>by {asset.validated_by_name || "System"}</div>
                        </td>

                        {/* Actions */}
                        <td className="ai-td text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleShowDetail(asset); }}
                            className="ai-view-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
                            style={{ background: "#2563eb" }}
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

            {/* Footer */}
            {!loading && assets.length > 0 && (
              <div className="ai-footer">
                <p style={{ fontSize: 12, color: "#6b7280" }}>
                  Showing{" "}
                  <span style={{ fontWeight: 600, color: "#374151" }}>
                    {expandedAssets ? assets.length : Math.min(5, assets.length)}
                  </span>{" "}
                  of{" "}
                  <span style={{ fontWeight: 600, color: "#374151" }}>{assets.length}</span>{" "}
                  assets
                </p>
                <p style={{ fontSize: 11, color: "#9ca3af" }}>
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
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: selectedAsset.category === "Device" ? "#eff6ff" : "#ecfdf5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {selectedAsset.category === "Device"
                      ? <Laptop className="w-5 h-5 text-blue-600" />
                      : <Package className="w-5 h-5 text-emerald-600" />}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Asset Details</h2>
                    <p style={{ fontFamily: "DM Mono,monospace", fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                      {selectedAsset.asset_code}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  style={{ padding: 6, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#374151"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9ca3af"; }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "20px", overflowY: "auto", maxHeight: "calc(90vh - 140px)", display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Photo */}
                {selectedAsset.photo_url && (
                  <div style={{ borderRadius: 14, overflow: "hidden", background: "#f9fafb", border: "1px solid #e5e7eb", maxHeight: 220 }}>
                    <img
                      src={selectedAsset.photo_url.startsWith("http") ? selectedAsset.photo_url : `http://localhost:5001${selectedAsset.photo_url}`}
                      alt="Asset"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>
                )}

                {/* Main Info — 2-col grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { icon: <Tag style={{ width: 14, height: 14, color: "#9ca3af" }} />, label: "Asset Name", value: selectedAsset.asset_name, mono: false },
                    {
                      icon: <QrCode style={{ width: 14, height: 14, color: "#9ca3af" }} />,
                      label: selectedAsset.category === "Device" ? "Serial Number" : "Scan Code",
                      value: selectedAsset.serial_number || selectedAsset.scan_code || "-",
                      mono: true,
                    },
                    { icon: <Building2 style={{ width: 14, height: 14, color: "#9ca3af" }} />, label: "Brand / Vendor", value: selectedAsset.brand || selectedAsset.vendor || "-", mono: false },
                    {
                      icon: <Activity style={{ width: 14, height: 14, color: "#9ca3af" }} />,
                      label: "Status",
                      value: null,
                      badge: getStatusColor(selectedAsset.status),
                      badgeLabel: getStatusLabel(selectedAsset.status),
                    },
                  ].map((item, i) => (
                    <div key={i} style={{ background: "#f9fafb", borderRadius: 12, padding: "12px 14px", border: "1px solid #f3f4f6" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        {item.icon}
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>{item.label}</p>
                      </div>
                      {item.badge ? (
                        <span className={`badge ${item.badge}`}>{item.badgeLabel}</span>
                      ) : (
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", fontFamily: item.mono ? "DM Mono,monospace" : "inherit", wordBreak: "break-all" }}>
                          {item.value}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Specifications */}
                {selectedAsset.specifications && (
                  <div style={{ background: "#f9fafb", borderRadius: 12, padding: "14px", border: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <FileText style={{ width: 14, height: 14, color: "#9ca3af" }} />
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>Specifications</p>
                    </div>
                    <p style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap" }}>{selectedAsset.specifications}</p>
                    {selectedAsset.model && (
                      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>Model: {selectedAsset.model}</p>
                    )}
                  </div>
                )}

                {/* Assignment */}
                <div style={{ background: "#f9fafb", borderRadius: 12, padding: "14px", border: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <User style={{ width: 14, height: 14, color: "#9ca3af" }} />
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>Assignment</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "Project", value: selectedAsset.project_name || "-" },
                      { label: "Department", value: selectedAsset.department_name || "-" },
                      { label: "Receiver", value: selectedAsset.receiver_name || "-" },
                      { label: "Location", value: selectedAsset.location_name || "-" },
                    ].map((row, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>{row.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validation Info */}
                <div style={{ background: "#eff6ff", borderRadius: 12, padding: "14px", border: "1px solid #bfdbfe" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <CheckCircle style={{ width: 14, height: 14, color: "#2563eb" }} />
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Validation Information</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#3b82f6" }}>Validated By</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>{selectedAsset.validated_by_name || "System"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#3b82f6" }}>Validated At</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>{formatDateTime(selectedAsset.validated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: "14px 20px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl"
                  style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)" }}
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