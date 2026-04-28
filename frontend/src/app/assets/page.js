"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Calendar,
  MapPin,
  Loader2,
  Search,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Filter,
  ChevronDown,
  X,
  Eye,
  Building2,
  CheckCircle,
  Package,
  Trash2,
  Laptop,
  LayoutGrid,
  List,
  FileSpreadsheet,
  TrendingUp,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import API_BASE_URL from "../../config/api";

export default function AssetsInventoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sorting, setSorting] = useState({ id: "created_at", desc: true });
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchCompletedSessions();
  }, []);

  const fetchCompletedSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/assets/sessions-with-assets`,
      );
      const result = await response.json();
      if (result.success) {
        setSessions(result.data);
      } else throw new Error(result.error || "Failed to load sessions");
    } catch (error) {
      Swal.fire({ title: "Error!", text: error.message, icon: "error" });
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];
    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.checking_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.checking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.location_name || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (s.project_name || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }
    if (sorting.id) {
      filtered.sort((a, b) => {
        let aVal = a[sorting.id];
        let bVal = b[sorting.id];
        if (sorting.id === "created_at") {
          aVal = new Date(a.created_at || a.checking_date);
          bVal = new Date(b.created_at || b.checking_date);
        }
        if (aVal < bVal) return sorting.desc ? 1 : -1;
        if (aVal > bVal) return sorting.desc ? -1 : 1;
        return 0;
      });
    }
    return filtered;
  }, [sessions, searchTerm, typeFilter, sorting]);

  const handleViewAssets = (sessionId, type) => {
    router.push(`/assets/${sessionId}?type=${type}`);
  };

  const handleDeleteSession = async (session) => {
    const result = await Swal.fire({
      title: "Delete Assets?",
      html: `
      <div class="text-left">
        <p class="text-sm text-gray-600 mb-2">Session: <span class="font-semibold">${session.checking_name || "-"}</span></p>
        <p class="text-sm text-gray-600 mb-2">Number: <span class="font-mono">${session.checking_number || "-"}</span></p>
        <p class="text-sm text-gray-600 mb-4">Type: <span class="font-medium">${session.type === "device" ? "Device" : "Material"}</span></p>
        <p class="text-sm text-red-600 font-medium">⚠️ Warning: This will delete ALL data in this session!</p>
        <div class="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
          <p class="text-xs text-red-700 font-medium mb-1">The following data will be deleted:</p>
          <ul class="text-xs text-red-600 list-disc list-inside space-y-0.5">
            <li>All Assets in this session</li>
            <li>All Validations</li>
            <li>All Scan Results</li>
            <li>All Items </li>
            <li>The Session itself</li>
          </ul>
        </div>
        <p class="text-xs text-gray-500 mt-3">This action cannot be undone!</p>
      </div>
    `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete Session!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        // Delete session based on type
        const endpoint =
          session.type === "device"
            ? `${API_BASE_URL}/api/devices/scanning-preparation/${session.id_preparation}`
            : `${API_BASE_URL}/api/materials/scanning-preparation/${session.id_preparation}`;

        const response = await fetch(endpoint, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            title: "Deleted!",
            html: `Session "<strong>${session.checking_name}</strong>" and all its data has been deleted successfully.`,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          // Refresh the sessions list
          fetchCompletedSessions();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error("Error deleting session:", error);
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to delete session",
          icon: "error",
          confirmButtonText: "OK",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSort = (columnId) => {
    setSorting((prev) => ({
      id: columnId,
      desc: prev.id === columnId ? !prev.desc : false,
    }));
  };

  const getSortIcon = (columnId) => {
    if (sorting.id !== columnId)
      return (
        <span style={{ color: "#d1d5db", marginLeft: 4, fontSize: 11 }}>⇅</span>
      );
    return sorting.desc ? (
      <ArrowDown
        style={{ width: 12, height: 12, marginLeft: 4, color: "#2563eb" }}
      />
    ) : (
      <ArrowUp
        style={{ width: 12, height: 12, marginLeft: 4, color: "#2563eb" }}
      />
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const exportToExcel = (exportType = "current") => {
    try {
      const source =
        exportType === "devices"
          ? sessions.filter((s) => s.type === "device")
          : exportType === "materials"
            ? sessions.filter((s) => s.type === "material")
            : exportType === "current"
              ? filteredSessions
              : sessions;

      if (!source.length) {
        alert("No data to export");
        return;
      }

      const dataToExport = source.map((s) => ({
        "Session Name": s.checking_name,
        "Session Number": s.checking_number,
        Type: s.type === "device" ? "Device" : "Material",
        "Checking Date": formatDate(s.checking_date),
        Location: s.location_name || "—",
        Project: s.project_name || "—",
        "Total Items": s.total_items || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      ws["!cols"] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 12 },
        { wch: 16 },
        { wch: 24 },
        { wch: 24 },
        { wch: 12 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Assets");
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      XLSX.writeFile(wb, `assets_${exportType}_${ts}.xlsx`);
      setShowExportDropdown(false);
    } catch {
      alert("Failed to export data.");
    }
  };

  const stats = {
    total: sessions.length,
    devices: sessions.filter((s) => s.type === "device").length,
    materials: sessions.filter((s) => s.type === "material").length,
    totalItems: sessions.reduce((sum, s) => sum + (s.total_items || 0), 0),
  };

  if (!mounted)
    return (
      <ProtectedPage>
        <LayoutDashboard activeMenu={2}>
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </LayoutDashboard>
      </ProtectedPage>
    );

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu="assets_inventory">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
          .vv-root { font-family: 'DM Sans', sans-serif; }
          .vv-root .mono { font-family: 'DM Mono', monospace; }

          .vv-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
            transition: box-shadow 0.2s ease;
          }
          .vv-card:hover {
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
          }
          .ai-root { font-family: 'DM Sans', sans-serif; }
          .ai-root * { box-sizing: border-box; }

          .ai-stat-card {
            border-radius: 14px;
            padding: 16px;
            color: #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            transition: box-shadow 0.2s, transform 0.2s;
          }
          .ai-stat-card:hover {
            box-shadow: 0 8px 24px rgba(0,0,0,0.16);
            transform: translateY(-2px);
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
            cursor: pointer;
            user-select: none;
            white-space: nowrap;
            border-bottom: 1px solid #e5e7eb;
          }
          .ai-th:hover { color: #374151; }
          .ai-td {
            padding: 13px 14px;
            font-size: 13px;
            color: #374151;
            border-top: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          .ai-row { cursor: pointer; transition: background 0.1s; }
          .ai-row:hover { background: #f8faff; }
       
          .ai-view-btn {
            opacity: 1; transform: translateX(0);
            transition: opacity 0.15s, transform 0.15s;
          }

          .ai-grid-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 16px;
            cursor: pointer;
            transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
          }
          .ai-grid-card:hover {
            box-shadow: 0 6px 20px rgba(37,99,235,0.1);
            border-color: #bfdbfe;
            transform: translateY(-2px);
          }
  
          .ai-grid-btn { 
            opacity: 1; 
            transition: opacity 0.15s; 
          }
          .badge-device { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
          .badge-material { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }

          .ai-view-tog {
            display: flex;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            overflow: hidden;
          }
          .ai-view-tog button {
            padding: 7px 10px; background: #fff; color: #6b7280;
            border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: background 0.15s, color 0.15s;
          }
          .ai-view-tog button.active,
          .ai-view-tog button:hover { background: #2563eb; color: #fff; }

          .ai-export-drop {
            position: absolute; right: 0; top: calc(100% + 6px);
            background: #fff; border: 1px solid #e5e7eb;
            border-radius: 14px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.12);
            z-index: 50; min-width: 220px; overflow: hidden;
          }

          .ai-search { border: 1px solid #d1d5db; }
          .ai-search:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.12); border-color: #93c5fd; outline: none; }

          .ai-footer {
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 18px; background: #f9fafb;
            border-top: 1px solid #f3f4f6;
          }

          .ai-empty {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; padding: 72px 24px; text-align: center;
          }

          .distribution-card {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            overflow: hidden;
          }
          .progress-bar {
            transition: width 0.5s ease;
          }
        `}</style>

        <div className="ai-root space-y-5">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-600" />
                IT Asset Inventory
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Monitor and manage all validated IT assets
              </p>
            </div>
          </div>

          {/* ── Stat Cards ── */}
          <div className="vv-card">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
              {[
                {
                  title: "Total Sessions",
                  value: stats.total,
                  sub: "All completed sessions",
                  accent: "#2563eb",
                },
                {
                  title: "Device Sessions",
                  value: stats.devices,
                  sub: "Device checking",
                  accent: "#3b82f6",
                },
                {
                  title: "Material Sessions",
                  value: stats.materials,
                  sub: "Material checking",
                  accent: "#10b981",
                },
                {
                  title: "Total Assets",
                  value: stats.totalItems,
                  sub: "Validated items",
                  accent: "#059669",
                },
              ].map((d, i) => (
                <div
                  key={i}
                  className="kpi-cell"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px 16px",
                    textAlign: "center",
                  }}
                >
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    {d.title}
                  </p>
                  <span
                    className="text-4xl font-bold"
                    style={{ color: d.accent }}
                  >
                    {d.value}
                  </span>
                  <p className="text-xs text-gray-400 mt-2">{d.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Asset Type Distribution ── */}
          <div className="distribution-card">
            <div className="p-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Asset Type Distribution
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">
                Distribution of asset sessions and total items
              </p>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Total Assets Distribution (Donut Chart) */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900 text-sm">
                      Total Assets Distribution
                    </h4>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Total Items: {stats.totalItems}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    {/* Donut Chart - Ukuran 150px */}
                    <div
                      className="relative flex-shrink-0"
                      style={{ width: 170, height: 170 }}
                    >
                      <svg
                        viewBox="0 0 100 100"
                        className="w-full h-full -rotate-90"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="10"
                        />
                        {stats.totalItems > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="10"
                            strokeDasharray={`${(stats.devices / stats.totalItems) * 251.2} 251.2`}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                          />
                        )}
                        {stats.materials > 0 && stats.totalItems > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#8b5cf6"
                            strokeWidth="10"
                            strokeDasharray={`${(stats.materials / stats.totalItems) * 251.2} 251.2`}
                            strokeDashoffset={`-${(stats.devices / stats.totalItems) * 251.2}`}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                          />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl font-bold text-gray-800">
                          {stats.totalItems}
                        </span>
                        <span className="text-[9px] text-gray-400 font-medium">
                          Total
                        </span>
                      </div>
                    </div>

                    {/* Legend dengan progress bar */}
                    <div className="w-full space-y-2 mt-1">
                      {/* Device Items */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                            <span className="text-xs font-medium text-gray-600">
                              Device Assets
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-800">
                              {stats.devices}
                            </span>
                            <span className="text-xs text-gray-400">
                              (
                              {stats.totalItems
                                ? Math.round(
                                    (stats.devices / stats.totalItems) * 100,
                                  )
                                : 0}
                              %)
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-blue-500 transition-all duration-700"
                            style={{
                              width: `${stats.totalItems ? (stats.devices / stats.totalItems) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Material Items */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                            <span className="text-xs font-medium text-gray-600">
                              Material Assets
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-800">
                              {stats.materials}
                            </span>
                            <span className="text-xs text-gray-400">
                              (
                              {stats.totalItems
                                ? Math.round(
                                    (stats.materials / stats.totalItems) * 100,
                                  )
                                : 0}
                              %)
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-indigo-500 transition-all duration-700"
                            style={{
                              width: `${stats.totalItems ? (stats.materials / stats.totalItems) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                    <span className="text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-semibold">
                      ● {stats.devices} Device Items
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 font-semibold">
                      ● {stats.materials} Material Items
                    </span>
                  </div>
                </div>

                {/* Items by Session */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-blue-500" />
                      <h4 className="font-medium text-gray-900 text-sm">
                        Items by Session
                      </h4>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Total Sessions: {sessions.length}
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {/* DEVICES SECTION */}
                    {sessions.filter((s) => s.type === "device").length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-200">
                          <Laptop className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                            DEVICES (
                            {sessions.filter((s) => s.type === "device").length}
                            )
                          </span>
                        </div>
                        {sessions
                          .filter((s) => s.type === "device")
                          .slice(0, 5)
                          .map((session) => (
                            <div
                              key={`device-session-${session.id_preparation}`}
                              className="group cursor-pointer rounded-lg p-2 hover:bg-blue-50 transition-all duration-200 border border-transparent hover:border-blue-200 mb-2"
                              onClick={() =>
                                handleViewAssets(
                                  session.id_preparation,
                                  session.type,
                                )
                              }
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Laptop className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                    <p className="font-medium text-gray-800 text-sm truncate">
                                      {session.checking_name}
                                    </p>
                                  </div>
                                  <p className="text-[10px] text-gray-400 font-mono mt-0.5 ml-5">
                                    {session.checking_number}
                                  </p>
                                  {session.project_name &&
                                    session.project_name !== "-" && (
                                      <p className="text-[10px] text-gray-500 mt-0.5 ml-5 truncate">
                                        <span className="font-medium">
                                          Project:
                                        </span>{" "}
                                        {session.project_name}
                                      </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  <div className="text-right">
                                    <span className="text-sm font-bold text-gray-800">
                                      {session.total_items || 0}
                                    </span>
                                    <span className="text-[10px] text-gray-400 ml-0.5">
                                      items
                                    </span>
                                  </div>
                                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Eye className="w-3 h-3 text-blue-600" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 ml-5">
                                <div className="w-full bg-gray-100 rounded-full h-1">
                                  <div
                                    className="h-1 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-blue-600"
                                    style={{ width: `100%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* MATERIALS SECTION */}
                    {sessions.filter((s) => s.type === "material").length >
                      0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-200">
                          <Package className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                            MATERIALS (
                            {
                              sessions.filter((s) => s.type === "material")
                                .length
                            }
                            )
                          </span>
                        </div>
                        {sessions
                          .filter((s) => s.type === "material")
                          .slice(0, 5)
                          .map((session) => (
                            <div
                              key={`material-session-${session.id_preparation}`}
                              className="group cursor-pointer rounded-lg p-2 hover:bg-emerald-50 transition-all duration-200 border border-transparent hover:border-emerald-200 mb-2"
                              onClick={() =>
                                handleViewAssets(
                                  session.id_preparation,
                                  session.type,
                                )
                              }
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                    <p className="font-medium text-gray-800 text-sm truncate">
                                      {session.checking_name}
                                    </p>
                                  </div>
                                  <p className="text-[10px] text-gray-400 font-mono mt-0.5 ml-5">
                                    {session.checking_number}
                                  </p>
                                  {session.project_name &&
                                    session.project_name !== "-" && (
                                      <p className="text-[10px] text-gray-500 mt-0.5 ml-5 truncate">
                                        <span className="font-medium">
                                          Project:
                                        </span>{" "}
                                        {session.project_name}
                                      </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  <div className="text-right">
                                    <span className="text-sm font-bold text-gray-800">
                                      {session.total_items || 0}
                                    </span>
                                    <span className="text-[10px] text-gray-400 ml-0.5">
                                      items
                                    </span>
                                  </div>
                                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                      <Eye className="w-3 h-3 text-emerald-600" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 ml-5">
                                <div className="w-full bg-gray-100 rounded-full h-1">
                                  <div
                                    className="h-1 rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-emerald-600"
                                    style={{ width: `100%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Tombol View All Sessions */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => {
                        const allSessionsSection =
                          document.querySelector(".ai-section");
                        if (allSessionsSection) {
                          allSessionsSection.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }
                        setTypeFilter("all");
                        setSearchTerm("");
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all duration-200 group"
                    >
                      <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      View All {sessions.length} Sessions
                      <ChevronDown className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
                    </button>
                    <p className="text-[9px] text-gray-400 text-center mt-2">
                      Click any session above to view its assets
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Main Section Card ── */}
          <div className="ai-section">
            {/* Section Header */}
            <div className="p-5 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Box className="w-4 h-4 text-blue-600" />
                    All Sessions
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    View and manage all asset checking sessions
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Export */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
                      style={{
                        background: "linear-gradient(135deg,#059669,#10b981)",
                      }}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export Excel
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {showExportDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowExportDropdown(false)}
                        />
                        <div className="ai-export-drop">
                          <div
                            style={{
                              padding: "10px 16px 8px",
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#9ca3af",
                              textTransform: "uppercase",
                              letterSpacing: "0.07em",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            Export Options
                          </div>
                          {[
                            {
                              label: "Export Current View",
                              sub: `${filteredSessions.length} sessions`,
                              type: "current",
                              color: "#059669",
                            },
                            {
                              label: "Export All Sessions",
                              sub: `${sessions.length} total`,
                              type: "all",
                              color: "#2563eb",
                            },
                            {
                              label: "Export Devices Only",
                              sub: `${stats.devices} sessions`,
                              type: "devices",
                              color: "#1d4ed8",
                            },
                            {
                              label: "Export Materials Only",
                              sub: `${stats.materials} sessions`,
                              type: "materials",
                              color: "#047857",
                            },
                          ].map((opt) => (
                            <button
                              key={opt.type}
                              onClick={() => exportToExcel(opt.type)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors"
                              style={{ background: "transparent" }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#f9fafb")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <FileSpreadsheet
                                className="w-4 h-4 flex-shrink-0"
                                style={{ color: opt.color }}
                              />
                              <div>
                                <div
                                  style={{
                                    fontWeight: 500,
                                    color: "#111827",
                                    fontSize: 13,
                                  }}
                                >
                                  {opt.label}
                                </div>
                                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                                  {opt.sub}
                                </div>
                              </div>
                            </button>
                          ))}
                          <div
                            style={{
                              padding: "8px 16px",
                              fontSize: 11,
                              color: "#9ca3af",
                              borderTop: "1px solid #f3f4f6",
                            }}
                          >
                            Downloads as .xlsx format
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Refresh */}
                  <button
                    onClick={fetchCompletedSessions}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                    />
                    {loading ? "Refreshing..." : "Refresh"}
                  </button>

                  {/* Go to Validations */}
                  <button
                    onClick={() => router.push("/validation_verification")}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
                    style={{
                      background: "linear-gradient(135deg,#1d4ed8,#2563eb)",
                    }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Go to Validations
                  </button>

                  {/* View Toggle */}
                  <div className="ai-view-tog" style={{ marginLeft: "auto" }}>
                    <button
                      className={viewMode === "list" ? "active" : ""}
                      onClick={() => setViewMode("list")}
                      title="List View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      className={viewMode === "grid" ? "active" : ""}
                      onClick={() => setViewMode("grid")}
                      title="Grid View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Filter */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #e5e7eb",
                background: "#f9fafb",
              }}
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by session name, number, location, project..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ai-search w-full pl-9 pr-8 py-2.5 rounded-xl text-sm text-gray-800 bg-white transition"
                    style={{ border: "1px solid #d1d5db" }}
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
                <div className="flex items-center gap-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{ border: "1px solid #d1d5db" }}
                    className="rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none min-w-[140px]"
                  >
                    <option value="all">All Types</option>
                    <option value="device">Devices</option>
                    <option value="material">Materials</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Content ── */}
            {loading ? (
              <div className="ai-empty">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
                <p className="text-gray-500 text-sm font-medium">
                  Loading sessions...
                </p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="ai-empty">
                <div
                  style={{
                    padding: 12,
                    borderRadius: 60,
                    background: "transparent",
                    display: "inline-block",
                    marginBottom: 16,
                  }}
                >
                  <Box className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-gray-500 font-medium text-sm mb-1">
                  No assets yet
                </h3>
                <p className="text-gray-400 text-xs max-w-xs">
                  Start by approving validations to build your asset inventory.
                </p>
                <button
                  onClick={() => router.push("/validation_verification")}
                  className="inline-flex items-center gap-2 px-4 py-2 mt-2 text-white text-xs font-medium rounded-lg transition-all"
                  style={{
                    background: "#2563eb",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#1d4ed8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#2563eb")
                  }
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Go to Validations
                </button>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="ai-empty">
                <Search
                  className="w-10 h-10 text-gray-300 mb-3"
                  strokeWidth={1.5}
                />
                <h3 className="text-gray-500 font-medium text-sm mb-1">
                  No matching sessions
                </h3>
                <p className="text-gray-400 text-xs mb-4">
                  Try adjusting your search or filter.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Clear Filters
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* ── GRID VIEW ── */
              <div
                style={{
                  padding: 20,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))",
                  gap: 16,
                }}
              >
                {filteredSessions.map((session) => (
                  <div
                    key={`${session.type}_${session.id_preparation}`}
                    className="ai-grid-card"
                    onClick={() =>
                      handleViewAssets(session.id_preparation, session.type)
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          flexShrink: 0,
                          background:
                            session.type === "device" ? "#eff6ff" : "#ecfdf5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {session.type === "device" ? (
                          <Laptop className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Package className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${session.type === "device" ? "badge-device" : "badge-material"}`}
                      >
                        {session.type === "device" ? "Device" : "Material"}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#111827",
                        marginBottom: 2,
                      }}
                      className="truncate"
                    >
                      {session.checking_name}
                    </h3>
                    <p
                      style={{
                        fontFamily: "DM Mono,monospace",
                        fontSize: 11,
                        color: "#9ca3af",
                        marginBottom: 10,
                      }}
                    >
                      {session.checking_number}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Calendar
                          style={{
                            width: 12,
                            height: 12,
                            color: "#9ca3af",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 11, color: "#6b7280" }}>
                          {formatDate(session.checking_date)}
                        </span>
                      </div>
                      {session.location_name && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <MapPin
                            style={{
                              width: 12,
                              height: 12,
                              color: "#9ca3af",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 11,
                              color: "#6b7280",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {session.location_name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: 12,
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: "#111827",
                          }}
                        >
                          {session.total_items || 0}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "#9ca3af",
                            marginLeft: 4,
                          }}
                        >
                          items
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewAssets(
                            session.id_preparation,
                            session.type,
                          );
                        }}
                        className="ai-grid-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
                        style={{ background: "#2563eb" }}
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── LIST VIEW ── */
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Session
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                        Type
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                        Location
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden xl:table-cell">
                        Project
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* DEVICES SECTION */}
                    {filteredSessions.filter((s) => s.type === "device")
                      .length > 0 && (
                      <>
                        <tr className="bg-white">
                          <td
                            colSpan={7}
                            className="py-2 px-4 border-b border-gray-200"
                          >
                            <div className="flex items-center gap-2">
                              <Laptop className="w-4 h-4 text-blue-600" />
                              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                DEVICES (
                                {
                                  filteredSessions.filter(
                                    (s) => s.type === "device",
                                  ).length
                                }
                                )
                              </span>
                            </div>
                          </td>
                        </tr>
                        {filteredSessions
                          .filter((s) => s.type === "device")
                          .map((session) => (
                            <tr
                              key={`device-${session.id_preparation}`}
                              className="hover:bg-gray-50 transition-colors cursor-pointer group"
                              onClick={() =>
                                handleViewAssets(
                                  session.id_preparation,
                                  session.type,
                                )
                              }
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100">
                                    <Laptop className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-gray-900 text-sm group-hover:text-blue-600 transition-colors truncate max-w-[200px]">
                                      {session.checking_name}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono mt-0.5">
                                      {session.checking_number}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    {formatDate(session.checking_date)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 hidden md:table-cell">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                  Device
                                </span>
                              </td>
                              <td className="py-3 px-4 hidden lg:table-cell">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm text-gray-600 truncate max-w-[150px]">
                                    {session.location_name || "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 hidden xl:table-cell">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm text-gray-600 truncate max-w-[120px]">
                                    {session.project_name || "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-bold text-gray-900">
                                    {session.total_items || 0}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    items
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewAssets(
                                        session.id_preparation,
                                        session.type,
                                      );
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSession(session);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </>
                    )}

                    {/* MATERIALS SECTION */}
                    {filteredSessions.filter((s) => s.type === "material")
                      .length > 0 && (
                      <>
                        <tr className="bg-white">
                          <td
                            colSpan={7}
                            className="py-2 px-4 border-b border-gray-200"
                          >
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-emerald-600" />
                              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                MATERIALS (
                                {
                                  filteredSessions.filter(
                                    (s) => s.type === "material",
                                  ).length
                                }
                                )
                              </span>
                            </div>
                          </td>
                        </tr>
                        {filteredSessions
                          .filter((s) => s.type === "material")
                          .map((session) => (
                            <tr
                              key={`material-${session.id_preparation}`}
                              className="hover:bg-gray-50 transition-colors cursor-pointer group"
                              onClick={() =>
                                handleViewAssets(
                                  session.id_preparation,
                                  session.type,
                                )
                              }
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-100">
                                    <Package className="w-4 h-4 text-emerald-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-gray-900 text-sm group-hover:text-emerald-600 transition-colors truncate max-w-[200px]">
                                      {session.checking_name}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono mt-0.5">
                                      {session.checking_number}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    {formatDate(session.checking_date)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 hidden md:table-cell">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                  Material
                                </span>
                              </td>
                              <td className="py-3 px-4 hidden lg:table-cell">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm text-gray-600 truncate max-w-[150px]">
                                    {session.location_name || "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 hidden xl:table-cell">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm text-gray-600 truncate max-w-[120px]">
                                    {session.project_name || "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-bold text-gray-900">
                                    {session.total_items || 0}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    items
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewAssets(
                                        session.id_preparation,
                                        session.type,
                                      );
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSession(session);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            {!loading && filteredSessions.length > 0 && (
              <div className="ai-footer">
                <p style={{ fontSize: 12, color: "#6b7280" }}>
                  Showing{" "}
                  <span style={{ fontWeight: 600, color: "#374151" }}>
                    {filteredSessions.length}
                  </span>{" "}
                  of{" "}
                  <span style={{ fontWeight: 600, color: "#374151" }}>
                    {sessions.length}
                  </span>{" "}
                  sessions
                  {typeFilter !== "all" && (
                    <span
                      style={{
                        marginLeft: 6,
                        padding: "2px 8px",
                        background: "#eff6ff",
                        color: "#2563eb",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {typeFilter === "device" ? "Devices" : "Materials"}
                    </span>
                  )}
                  {searchTerm && (
                    <span style={{ color: "#9ca3af", marginLeft: 4 }}>
                      · "{searchTerm}"
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 11, color: "#9ca3af" }}>
                  Updated {new Date().toLocaleTimeString("id-ID")}
                </p>
              </div>
            )}
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedPage>
  );
}
