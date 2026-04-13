"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Calendar,
  Loader2,
  Search,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  X,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Package,
  Laptop,
  LayoutGrid,
  List,
  FileSpreadsheet,
  BarChart3,
  PieChart,
  Download,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import API_BASE_URL from "../../config/api";

export default function ReportsAnalyticsPage() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sorting, setSorting] = useState({ id: "report_date", desc: true });
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [summary, setSummary] = useState({
    total_reports: 0,
    total_assets: 0,
    avg_success_rate: 0,
    weekly_data: [],
  });
  const [stats, setStats] = useState({
    monthly_stats: [],
    type_stats: { total_devices: 0, total_materials: 0 },
  });

  useEffect(() => {
    setMounted(true);
    fetchReports();
    fetchSummary();
    fetchStats();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports`);
      const result = await response.json();
      if (result.success) {
        setReports(result.data);
      } else {
        throw new Error(result.error || "Failed to load reports");
      }
    } catch (error) {
      Swal.fire({ title: "Error!", text: error.message, icon: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/summary`);
      const result = await response.json();
      if (result.success) {
        setSummary(result.data);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/stats`);
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleViewReport = (reportId) => {
    router.push(`/reports/${reportId}`);
  };

  const handleDeleteReport = async (report) => {
    const result = await Swal.fire({
      title: "Delete Report?",
      text: `Are you sure you want to delete report "${report.report_name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, Delete!",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/reports/${report.id_report}`, {
          method: "DELETE",
        });
        const data = await response.json();
        if (data.success) {
          Swal.fire({
            title: "Deleted!",
            text: "Report deleted successfully",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
          fetchReports();
          fetchSummary();
          fetchStats();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        Swal.fire({ title: "Error!", text: error.message, icon: "error" });
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
      return <span style={{ color: "#d1d5db", marginLeft: 4, fontSize: 11 }}>⇅</span>;
    return sorting.desc ? (
      <ArrowDown style={{ width: 12, height: 12, marginLeft: 4, color: "#2563eb" }} />
    ) : (
      <ArrowUp style={{ width: 12, height: 12, marginLeft: 4, color: "#2563eb" }} />
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getSuccessRateColor = (rate) => {
    if (rate >= 80) return "#10b981";
    if (rate >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const getStatusBadge = (rate) => {
    if (rate >= 80) return "badge-success";
    if (rate >= 60) return "badge-warning";
    return "badge-danger";
  };

  const exportToExcel = async (exportType = "current") => {
    const source = exportType === "current" ? filteredReports : reports;
    if (!source.length) {
      alert("No data to export");
      return;
    }

    try {
      const dataToExport = source.map((r) => ({
        "Report Code": r.report_code,
        "Report Name": r.report_name,
        "Report Date": formatDate(r.report_date),
        "Total Scans": r.total_scans,
        "Valid Scans": r.valid_scans,
        "Error Scans": r.error_scans,
        "Success Rate": `${r.success_rate}%`,
        "Total Assets": r.total_assets,
        "Devices": r.devices_count,
        "Materials": r.materials_count,
        "Locations": r.locations_count,
        "Departments": r.departments_count,
        "Projects": r.projects_count,
        "Generated By": r.generated_by_name || "System",
        "Generated At": new Date(r.generated_at).toLocaleString(),
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      ws["!cols"] = [{ wch: 18 }, { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 22 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reports");
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, "-");
      XLSX.writeFile(wb, `reports_${exportType}_${timestamp}.xlsx`);
      setShowExportDropdown(false);
    } catch (error) {
      alert("Failed to export data");
    }
  };

  const filteredReports = useMemo(() => {
    let filtered = [...reports];
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.report_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.report_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (sorting.id) {
      filtered.sort((a, b) => {
        let aVal = a[sorting.id];
        let bVal = b[sorting.id];
        if (sorting.id === "report_date") {
          aVal = new Date(a.report_date);
          bVal = new Date(b.report_date);
        }
        if (aVal < bVal) return sorting.desc ? 1 : -1;
        if (aVal > bVal) return sorting.desc ? -1 : 1;
        return 0;
      });
    }
    return filtered;
  }, [reports, searchTerm, sorting]);

  const kpis = [
    { title: "Total Reports", value: summary.total_reports, icon: FileText, color: "#2563eb", sub: "All time" },
    { title: "Total Assets", value: summary.total_assets, icon: Package, color: "#10b981", sub: "Validated items" },
    { title: "Avg Success Rate", value: `${summary.avg_success_rate}%`, icon: TrendingUp, color: "#f59e0b", sub: "Overall" },
    { title: "Devices vs Materials", value: `${stats.type_stats.total_devices || 0} / ${stats.type_stats.total_materials || 0}`, icon: Laptop, color: "#8b5cf6", sub: "Devices / Materials" },
  ];

  if (!mounted) {
    return (
      <ProtectedPage>
        <LayoutDashboard activeMenu={3}>
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </LayoutDashboard>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu={4}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
          .rr-root { font-family: 'DM Sans', sans-serif; }
          .rr-root * { box-sizing: border-box; }

          .rr-stat-card {
            border-radius: 14px;
            padding: 16px;
            color: #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            transition: box-shadow 0.2s, transform 0.2s;
          }
          .rr-stat-card:hover {
            box-shadow: 0 8px 24px rgba(0,0,0,0.16);
            transform: translateY(-2px);
          }

          .rr-section {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            overflow: hidden;
          }

          .rr-th {
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
          .rr-th:hover { color: #374151; }
          .rr-td {
            padding: 13px 14px;
            font-size: 13px;
            color: #374151;
            border-top: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          .rr-row { cursor: pointer; transition: background 0.1s; }
          .rr-row:hover { background: #f8faff; }

          .rr-grid-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 16px;
            cursor: pointer;
            transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
          }
          .rr-grid-card:hover {
            box-shadow: 0 6px 20px rgba(37,99,235,0.1);
            border-color: #bfdbfe;
            transform: translateY(-2px);
          }

          .badge-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          .badge-warning { background: #fed7aa; color: #9a3412; border: 1px solid #fed7aa; }
          .badge-danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

          .rr-view-tog {
            display: flex;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            overflow: hidden;
          }
          .rr-view-tog button {
            padding: 7px 10px; background: #fff; color: #6b7280;
            border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: background 0.15s, color 0.15s;
          }
          .rr-view-tog button.active,
          .rr-view-tog button:hover { background: #2563eb; color: #fff; }

          .rr-export-drop {
            position: absolute; right: 0; top: calc(100% + 6px);
            background: #fff; border: 1px solid #e5e7eb;
            border-radius: 14px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.12);
            z-index: 50; min-width: 220px; overflow: hidden;
          }

          .rr-search { border: 1px solid #d1d5db; border-radius: 12px; }
          .rr-search:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.12); border-color: #93c5fd; outline: none; }

          .rr-footer {
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 18px; background: #f9fafb;
            border-top: 1px solid #f3f4f6;
            border-radius: 0 0 18px 18px;
          }

          .rr-empty {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; padding: 72px 24px; text-align: center;
          }

          .kpi-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            text-align: center;
          }

          .view-btn-sm {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #2563eb;
            color: #fff;
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
            transition: background 0.15s;
            border: none;
            cursor: pointer;
          }
          .view-btn-sm:hover { background: #1d4ed8; }
        `}</style>

        <div className="rr-root space-y-5 max-w-7xl mx-auto px-4 py-2">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Reports & Analytics
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                View and manage asset validation reports
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="rr-section">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
              {kpis.map((d, i) => (
                <div key={i} className="kpi-cell">
                  <div className="flex items-center justify-center mb-2">
                    <d.icon style={{ width: 24, height: 24, color: d.color }} />
                  </div>
                  <span className="text-3xl font-bold" style={{ color: d.color }}>
                    {d.value}
                  </span>
                  <p className="text-xs font-semibold text-gray-600 mt-2">{d.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{d.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Chart Card */}
          {summary.weekly_data && summary.weekly_data.length > 0 && (
            <div className="rr-section">
              <div className="p-5 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Last 7 Days Performance
                </h2>
              </div>
              <div className="p-5 overflow-x-auto">
                <div className="flex items-end gap-4 min-w-[600px]">
                  {summary.weekly_data.map((day, idx) => (
                    <div key={idx} className="flex-1 text-center">
                      <div className="relative h-40 mb-2">
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-lg transition-all duration-300 hover:bg-blue-600"
                          style={{ height: `${(day.valid_scans / (day.total_scans || 1)) * 100}%`, maxHeight: "100%" }}
                        />
                      </div>
                      <p className="text-xs font-medium text-gray-600">
                        {new Date(day.report_date).toLocaleDateString("id-ID", { weekday: "short" })}
                      </p>
                      <p className="text-xs text-gray-400">{day.valid_scans}/{day.total_scans}</p>
                      <p className="text-xs font-semibold" style={{ color: getSuccessRateColor(day.success_rate) }}>
                        {day.success_rate}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Section Card */}
          <div className="rr-section">
            {/* Section Header */}
            <div className="p-5 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    All Reports
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    View and manage all generated reports
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Export Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
                      style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export Excel
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {showExportDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)} />
                        <div className="rr-export-drop">
                          <div style={{ padding: "10px 16px 8px", fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", borderBottom: "1px solid #f3f4f6" }}>
                            Export Options
                          </div>
                          {[
                            { label: "Export Current View", sub: `${filteredReports.length} reports`, type: "current", color: "#059669" },
                            { label: "Export All Reports", sub: `${reports.length} total`, type: "all", color: "#2563eb" },
                          ].map((opt) => (
                            <button
                              key={opt.type}
                              onClick={() => exportToExcel(opt.type)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors"
                              style={{ background: "transparent" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <Download className="w-4 h-4 flex-shrink-0" style={{ color: opt.color }} />
                              <div>
                                <div style={{ fontWeight: 500, color: "#111827", fontSize: 13 }}>{opt.label}</div>
                                <div style={{ fontSize: 11, color: "#9ca3af" }}>{opt.sub}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={() => { fetchReports(); fetchSummary(); fetchStats(); }}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    {loading ? "Refreshing..." : "Refresh"}
                  </button>

                  {/* View Toggle */}
                  <div className="rr-view-tog" style={{ marginLeft: "auto" }}>
                    <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} title="List View">
                      <List className="w-4 h-4" />
                    </button>
                    <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")} title="Grid View">
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Filter */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by report name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rr-search w-full pl-9 pr-8 py-2.5 rounded-xl text-sm text-gray-800 bg-white transition"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="rr-empty">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
                <p className="text-gray-500 text-sm font-medium">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="rr-empty">
                <div style={{ padding: 12, borderRadius: 60, background: "transparent", display: "inline-block", marginBottom: 16 }}>
                  <FileText className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-gray-500 font-medium text-sm mb-1">No reports yet</h3>
                <p className="text-gray-400 text-xs max-w-xs">Reports will be generated automatically when validations are approved.</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="rr-empty">
                <Search className="w-10 h-10 text-gray-300 mb-3" strokeWidth={1.5} />
                <h3 className="text-gray-500 font-medium text-sm mb-1">No matching reports</h3>
                <p className="text-gray-400 text-xs mb-4">Try adjusting your search.</p>
                <button onClick={() => setSearchTerm("")} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition">
                  <RefreshCw className="w-3 h-3" /> Clear Search
                </button>
              </div>
            ) : viewMode === "grid" ? (
              <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16 }}>
                {filteredReports.map((report) => (
                  <div key={report.id_report} className="rr-grid-card" onClick={() => handleViewReport(report.id_report)}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${getStatusBadge(report.success_rate)}`}>
                        {report.success_rate}%
                      </span>
                    </div>
                    <h3 style={{ fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 2 }} className="truncate">
                      {report.report_name}
                    </h3>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
                      {report.report_code}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Calendar style={{ width: 12, height: 12, color: "#9ca3af" }} />
                        <span style={{ fontSize: 11, color: "#6b7280" }}>{formatDate(report.report_date)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Package style={{ width: 12, height: 12, color: "#9ca3af" }} />
                        <span style={{ fontSize: 11, color: "#6b7280" }}>{report.total_assets} assets</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                      <div>
                        <span style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{report.total_scans}</span>
                        <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>scans</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleViewReport(report.id_report); }} className="view-btn-sm">
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="rr-th text-left" onClick={() => handleSort("report_name")}>
                        <span style={{ display: "flex", alignItems: "center" }}>Report Name {getSortIcon("report_name")}</span>
                      </th>
                      <th className="rr-th text-left hidden md:table-cell" onClick={() => handleSort("report_code")}>
                        <span style={{ display: "flex", alignItems: "center" }}>Code {getSortIcon("report_code")}</span>
                      </th>
                      <th className="rr-th text-left" onClick={() => handleSort("report_date")}>
                        <span style={{ display: "flex", alignItems: "center" }}>Date {getSortIcon("report_date")}</span>
                      </th>
                      <th className="rr-th text-left hidden lg:table-cell">Scans</th>
                      <th className="rr-th text-left">Success Rate</th>
                      <th className="rr-th text-left hidden xl:table-cell">Assets</th>
                      <th className="rr-th text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr key={report.id_report} className="rr-row" onClick={() => handleViewReport(report.id_report)}>
                        <td className="rr-td">
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{report.report_name}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>by {report.generated_by_name || "System"}</div>
                        </td>
                        <td className="rr-td hidden md:table-cell">
                          <code style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#6b7280" }}>{report.report_code}</code>
                        </td>
                        <td className="rr-td">
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Calendar style={{ width: 13, height: 13, color: "#9ca3af" }} />
                            <span style={{ fontSize: 12, color: "#4b5563" }}>{formatDate(report.report_date)}</span>
                          </div>
                        </td>
                        <td className="rr-td hidden lg:table-cell">
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{report.valid_scans}</span>
                          <span style={{ fontSize: 11, color: "#9ca3af" }}> / {report.total_scans}</span>
                        </td>
                        <td className="rr-td">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(report.success_rate)}`}>
                            {report.success_rate}%
                          </span>
                        </td>
                        <td className="rr-td hidden xl:table-cell">
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{report.total_assets}</span>
                          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>items</span>
                        </td>
                        <td className="rr-td text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); handleViewReport(report.id_report); }} className="view-btn-sm" title="View Details">
                              <Eye className="w-3 h-3" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteReport(report); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition" title="Delete">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            {!loading && filteredReports.length > 0 && (
              <div className="rr-footer">
                <p style={{ fontSize: 12, color: "#6b7280" }}>
                  Showing <span style={{ fontWeight: 600, color: "#374151" }}>{filteredReports.length}</span> of{" "}
                  <span style={{ fontWeight: 600, color: "#374151" }}>{reports.length}</span> reports
                  {searchTerm && <span style={{ color: "#9ca3af", marginLeft: 4 }}>· "{searchTerm}"</span>}
                </p>
                <p style={{ fontSize: 11, color: "#9ca3af" }}>Updated {new Date().toLocaleTimeString("id-ID")}</p>
              </div>
            )}
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedPage>
  );
}