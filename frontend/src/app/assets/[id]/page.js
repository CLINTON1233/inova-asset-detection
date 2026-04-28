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
        `${API_BASE_URL}/api/assets/by-preparation/${prepId}?type=${prepType}`,
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
    if (type === "Device") return <Cpu className="w-4 h-4 text-blue-600" />;
    return <Cable className="w-4 h-4 text-emerald-600" />;
  };

  const getTypeBadge = (type) => {
    if (type === "Device") return "badge-device";
    return "badge-material";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "badge-active";
      case "inactive":
        return "badge-inactive";
      default:
        return "badge-inactive";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      default:
        return status || "Unknown";
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
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:]/g, "-");
      XLSX.writeFile(wb, `assets_report_${timestamp}.xlsx`);
      Swal.fire({
        title: "Success!",
        text: "Excel report exported successfully",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
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

  // ── stat card config ──
  const statCards = [
    {
      label: "Total Assets",
      value: stats.total,
      icon: <Box className="w-5 h-5" />,
      accent: "#2563eb",
      bg: "#eff6ff",
      iconColor: "#2563eb",
      bar: 100,
    },
    {
      label: "Active",
      value: stats.active,
      icon: <CheckCircle className="w-5 h-5" />,
      accent: "#059669",
      bg: "#ecfdf5",
      iconColor: "#059669",
      bar: stats.total ? Math.round((stats.active / stats.total) * 100) : 0,
    },
    {
      label: "Inactive",
      value: stats.inactive,
      icon: <Clock className="w-5 h-5" />,
      accent: "#6b7280",
      bg: "#f3f4f6",
      iconColor: "#6b7280",
      bar: stats.total ? Math.round((stats.inactive / stats.total) * 100) : 0,
    },
    {
      label: "Devices",
      value: stats.devices,
      icon: <Laptop className="w-5 h-5" />,
      accent: "#3b82f6",
      bg: "#eff6ff",
      iconColor: "#3b82f6",
      bar: stats.total ? Math.round((stats.devices / stats.total) * 100) : 0,
    },
    {
      label: "Materials",
      value: stats.materials,
      icon: <Package className="w-5 h-5" />,
      accent: "#10b981",
      bg: "#ecfdf5",
      iconColor: "#10b981",
      bar: stats.total ? Math.round((stats.materials / stats.total) * 100) : 0,
    },
  ];

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu="assets_inventory">
        <style jsx global>{`
          @import url("https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap");

          /* ── root font (sama dengan assets page) ── */
          .ad-root {
            font-family: "DM Sans", sans-serif;
            font-size: 14px;
            color: #374151;
          }
          .ad-root * {
            box-sizing: border-box;
          }
          .ad-root .mono {
            font-family: "DM Mono", monospace;
          }

          /* ── shared card shell ── */
          .vv-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow:
              0 4px 6px -1px rgba(0, 0, 0, 0.08),
              0 2px 4px -1px rgba(0, 0, 0, 0.05);
            transition: box-shadow 0.2s ease;
          }

          /* ── session header card ── */
          .session-header-card {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
            overflow: hidden;
          }

          /* ── NEW: stat cards row ── */
          .stat-cards-row {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            padding: 16px;
          }
          @media (max-width: 1024px) {
            .stat-cards-row {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          @media (max-width: 640px) {
            .stat-cards-row {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          .stat-item {
            border-radius: 14px;
            border: 1px solid #e5e7eb;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            transition:
              box-shadow 0.2s,
              transform 0.2s;
            background: #fff;
          }
          .stat-item:hover {
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
            transform: translateY(-2px);
          }

          .stat-item-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .stat-icon-wrap {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .stat-value {
            font-family: "DM Sans", sans-serif;
            font-size: 28px;
            font-weight: 700;
            line-height: 1;
          }
          .stat-label {
            font-family: "DM Sans", sans-serif;
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .stat-progress-track {
            width: 100%;
            height: 4px;
            background: #f3f4f6;
            border-radius: 99px;
            overflow: hidden;
          }
          .stat-progress-fill {
            height: 100%;
            border-radius: 99px;
            transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* ── table section ── */
          .ai-section {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
            overflow: hidden;
          }

          /* ── table typography — semua DM Sans, konsisten ── */
          .ad-root table {
            font-family: "DM Sans", sans-serif;
            font-size: 13px;
          }
          .ad-root thead th {
            font-family: "DM Sans", sans-serif;
            font-size: 11px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            background: #f9fafb;
            padding: 10px 14px;
            border-bottom: 1px solid #e5e7eb;
            white-space: nowrap;
          }
          .ad-root tbody td {
            font-family: "DM Sans", sans-serif;
            font-size: 13px;
            color: #374151;
            padding: 12px 14px;
            border-top: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          .ad-root tbody tr:hover {
            background: #f8faff;
          }

          /* asset code — biru, DM Sans medium */
          .asset-code {
            font-family: "DM Sans", sans-serif;
            font-size: 13px;
            font-weight: 500;
            color: #2563eb;
          }

          /* serial number — mono, lebih kecil */
          .asset-serial {
            font-family: "DM Mono", monospace;
            font-size: 11px;
            color: #6b7280;
          }

          /* badge base */
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 10px;
            border-radius: 9999px;
            font-family: "DM Sans", sans-serif;
            font-size: 11px;
            font-weight: 600;
          }
          .badge-device {
            background: #dbeafe;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
          }
          .badge-material {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }
          .badge-active {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }
          .badge-inactive {
            background: #f3f4f6;
            color: #6b7280;
            border: 1px solid #e5e7eb;
          }

          /* footer bar */
          .ai-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 18px;
            background: #f9fafb;
            border-top: 1px solid #f3f4f6;
            font-family: "DM Sans", sans-serif;
          }

          .ai-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 72px 24px;
            text-align: center;
            font-family: "DM Sans", sans-serif;
          }

          /* modal */
          .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
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
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
            font-family: "DM Sans", sans-serif;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
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
                style={{
                  background: "linear-gradient(135deg,#059669,#10b981)",
                }}
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
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* ── Session Info Card ── */}
          {sessionInfo && (
            <div className="session-header-card">
              {/* Session identity row */}
              <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${prepType === "device" ? "bg-blue-50" : "bg-emerald-50"}`}
                  >
                    {prepType === "device" ? (
                      <Laptop className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Package className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">
                      {sessionInfo.session_name}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      {sessionInfo.session_number}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {formatDate(sessionInfo.session_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {sessionInfo.location_name || "No location"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── IMPROVED STAT CARDS ── */}
              <div className="stat-cards-row">
                {statCards.map((s, i) => (
                  <div className="stat-item" key={i}>
                    <div className="stat-item-top">
                      <div
                        className="stat-icon-wrap"
                        style={{ background: s.bg }}
                      >
                        <span style={{ color: s.iconColor }}>{s.icon}</span>
                      </div>
                      <span className="stat-value" style={{ color: s.accent }}>
                        {s.value}
                      </span>
                    </div>
                    <div>
                      <p className="stat-label mb-2">{s.label}</p>
                      <div className="stat-progress-track">
                        <div
                          className="stat-progress-fill"
                          style={{ width: `${s.bar}%`, background: s.accent }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Assets Table Card ── */}
          <div className="ai-section">
            <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Box className="w-4 h-4 text-blue-600" />
                  Assets in this session
                </h4>
                <p className="text-sm text-gray-500 mt-0.5">
                  {assets.length} validated items
                </p>
              </div>

              {assets.length > 5 && (
                <button
                  onClick={() => setExpandedAssets(!expandedAssets)}
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {expandedAssets ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show All ({assets.length})
                    </>
                  )}
                </button>
              )}
            </div>

            {loading ? (
              <div className="ai-empty">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
                <p className="text-sm text-gray-600 font-medium">
                  Loading assets...
                </p>
              </div>
            ) : assets.length === 0 ? (
              <div className="ai-empty">
                <Box
                  className="w-10 h-10 text-gray-300 mb-4"
                  strokeWidth={1.5}
                />
                <h3 className="text-sm font-medium text-gray-600 mb-1">
                  No assets found
                </h3>
                <p className="text-xs text-gray-400">
                  This session has no validated assets
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Asset Code</th>
                      <th>Asset Name</th>
                      <th className="hidden lg:table-cell">Serial/Code</th>
                      <th className="hidden md:table-cell">Brand/Vendor</th>
                      <th className="hidden xl:table-cell">Project</th>
                      <th className="hidden 2xl:table-cell">Department</th>
                      <th className="hidden lg:table-cell">Receiver</th>
                      <th>Status</th>
                      <th className="hidden xl:table-cell">Validated By</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedAssets.map((asset) => (
                      <tr
                        key={asset.id_assets}
                        className="cursor-pointer group"
                        onClick={() => handleShowDetail(asset)}
                      >
                        {/* Photo */}
                        <td>
                          {asset.photo_url ? (
                            <img
                              src={
                                asset.photo_url.startsWith("http")
                                  ? asset.photo_url
                                  : `http://localhost:5001${asset.photo_url}`
                              }
                              alt="Asset"
                              className="w-9 h-9 rounded-lg object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.parentElement.innerHTML = `<div style="width:36px;height:36px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#9ca3af" stroke-width="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>`;
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Camera className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </td>

                        {/* Asset Code */}
                        <td>
                          <span className="asset-code">{asset.asset_code}</span>
                        </td>

                        {/* Asset Name */}
                        <td>
                          <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate block max-w-[180px]">
                            {asset.asset_name}
                          </span>
                        </td>

                        {/* Serial / Code */}
                        <td className="hidden lg:table-cell">
                          <span className="asset-serial">
                            {asset.serial_number || asset.scan_code || "-"}
                          </span>
                        </td>

                        {/* Brand / Vendor */}
                        <td
                          className="hidden md:table-cell"
                          style={{ textAlign: "center" }}
                        >
                          <span className="text-xs font-medium text-gray-600">
                            {asset.brand || asset.vendor || "-"}
                          </span>
                        </td>

                        {/* Project */}
                        <td className="hidden xl:table-cell">
                          <span
                            className="text-xs text-gray-600 truncate max-w-[100px] block"
                            title={asset.project_name || "-"}
                          >
                            {asset.project_name || "-"}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="hidden 2xl:table-cell">
                          <span className="text-xs text-gray-600 truncate max-w-[100px] block">
                            {asset.department_name || "-"}
                          </span>
                        </td>

                        {/* Receiver */}
                        <td className="hidden lg:table-cell">
                          <span
                            className="text-xs text-gray-600 truncate max-w-[120px] block"
                            title={asset.receiver_name || "-"}
                          >
                            {asset.receiver_name || "-"}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className={`badge ${asset.status === "active" ? "badge-active" : "badge-inactive"}`}
                          >
                            {asset.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Validated */}
                        <td className="hidden xl:table-cell text-center">
                          <div className="text-xs text-gray-600">
                            {formatDateTime(asset.validated_at)}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#9ca3af",
                              marginTop: 2,
                            }}
                          >
                            by {asset.validated_by_name || "System"}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowDetail(asset);
                            }}
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
                    {expandedAssets
                      ? assets.length
                      : Math.min(5, assets.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-700">
                    {assets.length}
                  </span>{" "}
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
          <div
            className="modal-backdrop"
            onClick={() => setSelectedAsset(null)}
          >
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedAsset.category === "Device" ? "bg-blue-50" : "bg-emerald-50"}`}
                  >
                    {selectedAsset.category === "Device" ? (
                      <Laptop className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Package className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Asset Details
                    </h2>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                        fontFamily: "'DM Mono', monospace",
                        marginTop: 2,
                      }}
                    >
                      {selectedAsset.asset_code}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div
                className="p-5 overflow-y-auto space-y-4"
                style={{ maxHeight: "calc(90vh - 140px)" }}
              >
                {selectedAsset.photo_url && (
                  <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-200 max-h-56">
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

                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      icon: <Tag className="w-3.5 h-3.5 text-gray-400" />,
                      label: "Asset Name",
                      value: selectedAsset.asset_name,
                      mono: false,
                    },
                    {
                      icon: <QrCode className="w-3.5 h-3.5 text-gray-400" />,
                      label:
                        selectedAsset.category === "Device"
                          ? "Serial Number"
                          : "Scan Code",
                      value:
                        selectedAsset.serial_number ||
                        selectedAsset.scan_code ||
                        "-",
                      mono: true,
                    },
                    {
                      icon: <Building2 className="w-3.5 h-3.5 text-gray-400" />,
                      label: "Brand / Vendor",
                      value: selectedAsset.brand || selectedAsset.vendor || "-",
                      mono: false,
                    },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {row.icon}
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#9ca3af",
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                          }}
                        >
                          {row.label}
                        </p>
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#111827",
                          fontFamily: row.mono
                            ? "'DM Mono',monospace"
                            : "'DM Sans',sans-serif",
                          wordBreak: "break-all",
                        }}
                      >
                        {row.value}
                      </p>
                    </div>
                  ))}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-3.5 h-3.5 text-gray-400" />
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#9ca3af",
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                        }}
                      >
                        Status
                      </p>
                    </div>
                    <span
                      className={`badge ${getStatusColor(selectedAsset.status)}`}
                    >
                      {getStatusLabel(selectedAsset.status)}
                    </span>
                  </div>
                </div>

                {selectedAsset.specifications && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#9ca3af",
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                        }}
                      >
                        Specifications
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedAsset.specifications}
                    </p>
                    {selectedAsset.model && (
                      <p
                        style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}
                      >
                        Model: {selectedAsset.model}
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      Assignment
                    </p>
                  </div>
                  <div className="space-y-2">
                    {[
                      {
                        label: "Project",
                        value: selectedAsset.project_name || "-",
                      },
                      {
                        label: "Department",
                        value: selectedAsset.department_name || "-",
                      },
                      {
                        label: "Receiver",
                        value: selectedAsset.receiver_name || "-",
                      },
                      {
                        label: "Location",
                        value: selectedAsset.location_name || "-",
                      },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <span className="text-xs text-gray-400">
                          {row.label}
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#1d4ed8",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      Validation Information
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-600">
                        Validated By
                      </span>
                      <span className="text-sm font-semibold text-blue-800">
                        {selectedAsset.validated_by_name || "System"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-600">
                        Validated At
                      </span>
                      <span className="text-sm font-semibold text-blue-800">
                        {formatDateTime(selectedAsset.validated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition"
                  style={{
                    background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                  }}
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
