"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LayoutDashboard from "../components/LayoutDashboard";
import {
  Box,
  Calendar,
  MapPin,
  Loader2,
  Plus,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
  FileSpreadsheet,
  ArrowUp,
  Edit,
  ArrowDown,
  ScanLine,
  Filter,
  ChevronDown,
  X,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";

export default function ScanningPreparationListPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sorting, setSorting] = useState({ id: "created_at", desc: true });
  const [mounted, setMounted] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchSessions();
  }, []);

  useEffect(() => {
    let filtered = [...sessions];
    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.checking_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.checking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.location_name || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
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
    setFilteredSessions(filtered);
  }, [searchTerm, statusFilter, sessions, sorting]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      console.log(
        "Fetching all sessions from:",
        API_ENDPOINTS.SCANNING_PREP_LIST_ALL,
      );

      const response = await fetch(API_ENDPOINTS.SCANNING_PREP_LIST_ALL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Response is not JSON:", text.substring(0, 200));
        throw new Error("Server returned non-JSON response");
      }

      const result = await response.json();
      console.log("API Response:", result);

      if (result.success) {
        const sessionsWithDetails = result.data.map((session) => {
          const totalItems = session.items?.length || 0;
          const totalQty =
            session.totalQty ||
            session.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) ||
            0;
          let status = session.status || "pending";
          let progress = session.progress || 0;

          if (session.items && session.items.length > 0 && !session.progress) {
            const totalScanned = session.items.reduce(
              (sum, i) => sum + (i.scanned_count || 0),
              0,
            );
            progress =
              totalQty > 0 ? Math.round((totalScanned / totalQty) * 100) : 0;
            if (progress === 100) status = "completed";
            else if (progress > 0) status = "in-progress";
          }

          // PASTIKAN TYPE TERSIMPAN DENGAN BENAR
          const sessionType =
            session.type || (session.category_id === 1 ? "device" : "material");

          // Tentukan display name berdasarkan tipe
          let displayName = session.checking_name;
          if (sessionType === "device") {
            displayName = `[Device] ${session.checking_name}`;
          } else if (sessionType === "material") {
            displayName = `[Material] ${session.checking_name}`;
          }

          return {
            ...session,
            type: sessionType, // <-- PASTIKAN INI ADA
            status,
            progress,
            totalItems,
            totalQty,
            category_name: session.category_name || "General",
            location_name: session.location_name || "No location",
            uniqueCode:
              session.checking_number || `SESS-${session.id_preparation}`,
            display_name: displayName,
          };
        });
        setSessions(sessionsWithDetails);
        setFilteredSessions(sessionsWithDetails);
      } else {
        throw new Error(
          result.message || result.error || "Failed to load sessions",
        );
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      Swal.fire({
        title: "Error!",
        text:
          error.message ||
          "Failed to load sessions. Please check if backend server is running.",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: sessions.length,
    pending: sessions.filter((s) => s.status === "pending").length,
    inProgress: sessions.filter((s) => s.status === "in-progress").length,
    completed: sessions.filter((s) => s.status === "completed").length,
    totalItems: sessions.reduce((sum, s) => sum + (s.totalItems || 0), 0),
  };

  const handleSort = (columnId) => {
    setSorting((prev) => ({
      id: columnId,
      desc: prev.id === columnId ? !prev.desc : false,
    }));
  };

  const getSortIcon = (columnId) => {
    if (sorting.id !== columnId)
      return <span className="text-gray-300 ml-1 text-xs">⇅</span>;
    return sorting.desc ? (
      <ArrowDown className="w-3 h-3 ml-1 text-blue-500" />
    ) : (
      <ArrowUp className="w-3 h-3 ml-1 text-blue-500" />
    );
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "pending":
        return {
          dot: "bg-amber-400",
          text: "text-amber-700",
          bg: "bg-amber-50",
          border: "border-amber-200",
          label: "Pending",
        };
      case "in-progress":
        return {
          dot: "bg-blue-500",
          text: "text-blue-700",
          bg: "bg-blue-50",
          border: "border-blue-200",
          label: "In Progress",
        };
      case "completed":
        return {
          dot: "bg-emerald-500",
          text: "text-emerald-700",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          label: "Completed",
        };
      default:
        return {
          dot: "bg-gray-400",
          text: "text-gray-700",
          bg: "bg-gray-50",
          border: "border-gray-200",
          label: status,
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const exportToExcel = (exportType = "current") => {
    try {
      const data = (exportType === "all" ? sessions : filteredSessions).map(
        (s) => ({
          "Session Name": s.checking_name,
          "Session Number": s.checking_number,
          Category: s.category_name,
          Location: s.location_name,
          "Items Count": s.totalItems,
          "Total Quantity": s.totalQty,
          Progress: `${s.progress || 0}%`,
          Status: s.status,
          "Checking Date": formatDate(s.checking_date),
        }),
      );
      if (!data.length) {
        Swal.fire("No Data", "No data to export", "info");
        return;
      }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sessions");
      XLSX.writeFile(wb, `scanning_sessions_${exportType}_${Date.now()}.xlsx`);
      setShowExportDropdown(false);
    } catch {
      Swal.fire("Error", "Failed to export", "error");
    }
  };

  const handleDelete = async (prepId, checkingName, type) => {
    try {
      const result = await Swal.fire({
        title: "Delete Session?",
        text: `Are you sure you want to delete session "${checkingName}"? All related scanning data will also be deleted.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, Delete!",
        cancelButtonText: "Cancel",
        reverseButtons: true,
      });

      if (result.isConfirmed) {
        setLoading(true);

        // Pilih endpoint berdasarkan tipe
        let deleteEndpoint;
        if (type === "device") {
          deleteEndpoint = API_ENDPOINTS.DEVICES_SCANNING_PREP_DELETE(prepId);
        } else if (type === "material") {
          deleteEndpoint = API_ENDPOINTS.MATERIALS_SCANNING_PREP_DELETE(prepId);
        } else {
          throw new Error("Unknown session type");
        }

        console.log("Deleting with endpoint:", deleteEndpoint);

        const response = await fetch(deleteEndpoint, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.success) {
          setSessions((prevSessions) =>
            prevSessions.filter((s) => s.id_preparation !== prepId),
          );
          setFilteredSessions((prevFiltered) =>
            prevFiltered.filter((s) => s.id_preparation !== prepId),
          );

          Swal.fire({
            title: "Success!",
            text: "Session deleted successfully",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          throw new Error(data.error || "Failed to delete session");
        }
      }
    } catch (error) {
      console.error("Delete error:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "An error occurred while deleting the session",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <LayoutDashboard activeMenu={2}>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </LayoutDashboard>
    );
  }

  const kpis = [
    {
      title: "Total Sessions",
      value: stats.total,
      sub: "All sessions",
      accent: "#2563eb",
    },
    {
      title: "Pending",
      value: stats.pending,
      sub: "Awaiting scan",
      accent: "#f59e0b",
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      sub: "Sessions active",
      accent: "#6366f1",
    },
    {
      title: "Completed",
      value: stats.completed,
      sub: "Sessions done",
      accent: "#10b981",
    },
    {
      title: "Total Items",
      value: stats.totalItems,
      sub: "Items prepared",
      accent: "#8b5cf6",
    },
  ];

  return (
    <LayoutDashboard activeMenu={1}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .sp-root { font-family: 'DM Sans', sans-serif; }
        .sp-root .mono { font-family: 'DM Mono', monospace; }

        .sp-card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          transition: box-shadow 0.2s ease;
        }
        .sp-card:hover {
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
        }

        .kpi-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          text-align: center;
        }

        .sp-th {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 10px 16px;
          background: #f9fafb;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        .sp-th:hover { color: #374151; }
        .sp-td {
          padding: 13px 16px;
          font-size: 13px;
          color: #374151;
          border-top: 1px solid #f3f4f6;
          vertical-align: middle;
        }
        .sp-row:hover { background: #f8faff; }

        .scan-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #1e40af;
          color: #fff;
          padding: 7px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          transition: background 0.15s;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(30,64,175,0.3);
        }
        .scan-btn:hover { background: #1d3a9e; }

        .delete-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #dc2626;
          color: #fff;
          padding: 7px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          transition: background 0.15s;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(220,38,38,0.3);
        }
        .delete-btn:hover { background: #b91c1c; }

      .new-session-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #1e40af;
        color: #fff;
        padding: 7px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        transition: background 0.15s;
        border: none;
        cursor: pointer;
        white-space: nowrap;
        box-shadow: 0 1px 3px rgba(30,64,175,0.3);
      }
      .new-session-btn:hover { background: #1d3a9e; }

        .prog-track { background: #e5e7eb; border-radius: 99px; height: 5px; }
        .prog-fill  { background: #3b82f6; border-radius: 99px; height: 5px; transition: width 0.3s; }
      `}</style>

      <div className="sp-root space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ScanLine className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">
                Scanning Preparation List
              </h1>
            </div>
            <p className="text-sm text-gray-500">
              List of sessions prepared for asset scanning
            </p>
          </div>
          <button
            onClick={() => router.push("/create_scanning_preparation")}
            className="new-session-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Session</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* KPI Card */}
        <div className="sp-card">
          <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-gray-100">
            {kpis.map((d, i) => (
              <div key={i} className="kpi-cell">
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

        {/* Main Table Card */}
        <div className="sp-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 p-4 md:p-5 border-b border-gray-100">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search session name, number, location..."
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

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={fetchSessions}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showExportDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowExportDropdown(false)}
                    />
                    <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                      <button
                        onClick={() => exportToExcel("current")}
                        className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />{" "}
                        Export Current ({filteredSessions.length})
                      </button>
                      <button
                        onClick={() => exportToExcel("all")}
                        className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-blue-600" />{" "}
                        Export All ({sessions.length})
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-20 text-center">
              <ScanLine className="w-14 h-14 text-gray-200 mx-auto mb-3" />
              <h3 className="text-gray-800 font-semibold text-lg mb-1">
                No sessions found
              </h3>
              <p className="text-gray-400 text-sm mb-5">
                Create your first scanning session to get started
              </p>
              <button
                onClick={() => router.push("/create_scanning_preparation")}
                className="new-session-btn"
              >
                <Plus className="w-3.5 h-3.5" /> Create Session
              </button>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-16 text-center">
              <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <h3 className="text-gray-800 font-semibold mb-1">
                No matching sessions
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Try adjusting your filters
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th
                      className="sp-th text-left"
                      onClick={() => handleSort("checking_name")}
                    >
                      <span className="flex items-center">
                        Session {getSortIcon("checking_name")}
                      </span>
                    </th>
                    <th
                      className="sp-th text-left hidden md:table-cell"
                      onClick={() => handleSort("checking_date")}
                    >
                      <span className="flex items-center">
                        Date {getSortIcon("checking_date")}
                      </span>
                    </th>
                    <th
                      className="sp-th text-left hidden lg:table-cell"
                      onClick={() => handleSort("location_name")}
                    >
                      <span className="flex items-center">
                        Location {getSortIcon("location_name")}
                      </span>
                    </th>
                    <th
                      className="sp-th text-left"
                      onClick={() => handleSort("status")}
                    >
                      <span className="flex items-center">
                        Status {getSortIcon("status")}
                      </span>
                    </th>
                    <th
                      className="sp-th text-left hidden xl:table-cell"
                      onClick={() => handleSort("totalItems")}
                    >
                      <span className="flex items-center">
                        Items {getSortIcon("totalItems")}
                      </span>
                    </th>
                    <th className="sp-th text-left">Progress</th>
                    <th className="sp-th text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session, idx) => {
                    const sc = getStatusConfig(session.status);
                    // Buat key yang unik dengan menggabungkan type dan id_preparation
                    const uniqueKey = `${session.type || "unknown"}_${session.id_preparation}`;
                    return (
                      <tr key={uniqueKey} className="sp-row transition-colors">
                        <td className="sp-td">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm leading-tight">
                                {session.checking_name}
                              </div>
                              <div className="text-xs text-gray-400 mono mt-0.5">
                                {session.checking_number}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    session.type === "device"
                                      ? "bg-blue-100 text-blue-700"
                                      : session.type === "material"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {session.type === "device"
                                    ? "Device"
                                    : session.type === "material"
                                      ? "Material"
                                      : "Unknown"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="sp-td hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-600">
                              {formatDate(session.checking_date)}
                            </span>
                          </div>
                        </td>
                        <td className="sp-td hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-600 truncate max-w-[140px]">
                              {session.location_name}
                            </span>
                          </div>
                        </td>
                        <td className="sp-td">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0`}
                            />
                            {sc.label}
                          </span>
                        </td>
                        <td className="sp-td hidden xl:table-cell">
                          <div className="text-sm font-semibold text-gray-800">
                            {session.totalItems}{" "}
                            <span className="font-normal text-gray-400 text-xs">
                              items
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {session.totalQty} qty total
                          </div>
                        </td>
                        <td className="sp-td">
                          <div className="flex items-center gap-2">
                            <div className="prog-track w-20">
                              <div
                                className="prog-fill"
                                style={{ width: `${session.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-600">
                              {session.progress || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="sp-td text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/scanning?prep_id=${session.id_preparation}&type=${session.type}`,
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                              title="Start Scanning"
                            >
                              <ScanLine className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Scan</span>
                            </button>

                            {/* Ganti link edit untuk menyertakan type */}
                            <button
                              onClick={() =>
                                router.push(
                                  `/edit_scanning_preparation?id=${session.id_preparation}&type=${session.type}`,
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition"
                              title="Edit Session"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>

                            {/* Pastikan tombol delete mengirimkan type yang benar */}
                            <button
                              onClick={() =>
                                handleDelete(
                                  session.id_preparation,
                                  session.checking_name,
                                  session.type,
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                              title="Delete Session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {!loading && filteredSessions.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-2 rounded-b-2xl">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-700">
                  {filteredSessions.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-700">
                  {sessions.length}
                </span>{" "}
                sessions
                {statusFilter !== "all" && (
                  <span className="text-gray-400"> · {statusFilter}</span>
                )}
                {searchTerm && (
                  <span className="text-gray-400"> · "{searchTerm}"</span>
                )}
              </p>
              <p className="text-xs text-gray-400">
                Updated {new Date().toLocaleTimeString("en-US")}
              </p>
            </div>
          )}
        </div>
      </div>
    </LayoutDashboard>
  );
}
