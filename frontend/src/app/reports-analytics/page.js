"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  CheckSquare,
  Square,
  FileText,
  User,
  Calendar,
  MapPin,
  Cpu,
  Cable,
  Eye,
  BarChart3,
  Activity,
  ChevronDown,
  TrendingUp,
  Package,
  List,
  Grid,
  FileSpreadsheet,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ScanLine,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Trash2,
  X,
  Box,
  Laptop,
} from "lucide-react";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

export default function ReportsAnalyticsPage() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [sorting, setSorting] = useState({ id: "report_date", desc: true });
  const [mounted, setMounted] = useState(false);
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    error: 0,
    pending: 0,
    daily: 0,
    weekly: 0,
    monthly: 0,
    totalReports: 0,
  });

  useEffect(() => {
    setMounted(true);
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.REPORTS_LIST);
      const result = await response.json();
      if (result.success) {
        setReports(result.data || []);

        const total = (result.data || []).reduce((sum, r) => sum + (r.total_scans || 0), 0);
        const valid = (result.data || []).reduce((sum, r) => sum + (r.valid_scans || 0), 0);
        const error = (result.data || []).reduce((sum, r) => sum + (r.error_scans || 0), 0);
        const pending = (result.data || []).reduce((sum, r) => sum + (r.pending_scans || 0), 0);
        const daily = (result.data || []).filter((r) => r.report_type === "daily").length;
        const weekly = (result.data || []).filter((r) => r.report_type === "weekly").length;
        const monthly = (result.data || []).filter((r) => r.report_type === "monthly").length;

        setStats({
          total,
          valid,
          error,
          pending,
          daily,
          weekly,
          monthly,
          totalReports: result.data?.length || 0,
        });
      } else {
        throw new Error(result.error || "Failed to load reports");
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to load reports data",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetail = async (reportId) => {
    try {
      const response = await fetch(API_ENDPOINTS.REPORTS_DETAIL(reportId));
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching report detail:", error);
      return null;
    }
  };

  const generateReport = async () => {
    Swal.fire({
      title: "Generate Report",
      html: `
        <div class="text-left">
          <p class="text-sm text-gray-600 mb-3">Select date for report:</p>
          <input type="date" id="report-date" class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${new Date().toISOString().split('T')[0]}">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Generate",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
      preConfirm: () => {
        const date = document.getElementById("report-date").value;
        if (!date) {
          Swal.showValidationMessage("Please select a date");
          return false;
        }
        return { date };
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          const response = await fetch(API_ENDPOINTS.REPORTS_GENERATE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              report_type: "daily",
              report_date: result.value.date,
            }),
          });
          const data = await response.json();
          if (data.success) {
            Swal.fire({
              title: "Success!",
              text: `Report has been generated.`,
              icon: "success",
              timer: 2000,
              showConfirmButton: false,
            });
            fetchReports();
          } else {
            throw new Error(data.error);
          }
        } catch (error) {
          Swal.fire({
            title: "Error!",
            text: error.message || "Failed to generate report",
            icon: "error",
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const toggleCheckboxMode = () => {
    setShowCheckboxes(!showCheckboxes);
    if (showCheckboxes) {
      setSelectedItems([]);
    }
  };

  const handleViewDetail = async (report) => {
    const detail = await fetchReportDetail(report.id_report);
    if (!detail) return;
    setDetailModal(detail);
  };

  const handleDeleteSingle = async (report) => {
    const result = await Swal.fire({
      title: "Delete Report?",
      text: `Are you sure you want to delete this report?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        const response = await fetch(API_ENDPOINTS.REPORTS_DELETE(report.id_report), {
          method: "DELETE",
        });
        const data = await response.json();
        if (data.success) {
          Swal.fire({
            title: "Deleted!",
            text: "Report has been deleted successfully.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
          fetchReports();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to delete report",
          icon: "error",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      Swal.fire({
        title: "No Items Selected",
        text: "Please select at least one report to delete.",
        icon: "info",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Delete Selected Reports?",
      text: `Are you sure you want to delete ${selectedItems.length} report(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: `Yes, Delete ${selectedItems.length} Report(s)`,
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        const response = await fetch(API_ENDPOINTS.REPORTS_BULK_DELETE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report_ids: selectedItems }),
        });
        const data = await response.json();
        if (data.success) {
          Swal.fire({
            title: "Deleted!",
            text: data.message,
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
          setSelectedItems([]);
          fetchReports();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to delete reports",
          icon: "error",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredReports.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredReports.map((r) => r.id_report));
    }
  };

  const handleSelectItem = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((i) => i !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleSort = (columnId) => {
    setSorting((prev) => ({
      id: columnId,
      desc: prev.id === columnId ? !prev.desc : false,
    }));
  };

  const getSortIcon = (columnId) => {
    if (sorting.id !== columnId) {
      return <span className="text-gray-300 ml-1">⇅</span>;
    }
    return sorting.desc ? <ArrowDown className="w-3 h-3 ml-1 text-blue-600" /> : <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const exportToExcel = async (selectedOnly = false) => {
    if (selectedOnly && selectedItems.length === 0) {
      Swal.fire("No Selection", "Please select reports to export.", "warning");
      return;
    }

    try {
      const dataToExport = selectedOnly
        ? reports.filter(r => selectedItems.includes(r.id_report))
        : filteredReports;

      const wsData = [];

      for (const report of dataToExport) {
        const detail = await fetchReportDetail(report.id_report);
        const items = detail?.items || [];

        if (items.length > 0) {
          items.forEach(item => {
            wsData.push({
              "Report Code": report.report_code,
              "Report Date": formatDate(report.report_date),
              "Report Type": report.report_type === "daily" ? "Daily" : report.report_type === "weekly" ? "Weekly" : "Monthly",
              "Asset Name": item.asset_name || "-",
              "Asset Type": item.asset_type || "-",
              "Category": item.category || "-",
              "Location": item.location_name || "-",
              "Serial/Code": item.serial_or_code || "-",
              "Status": item.status || "-",
              "Verified By": item.verified_by_name || "-",
              "Scan Date": item.scan_date || "-",
              "Scan Time": item.scan_time || "-",
            });
          });
        } else {
          wsData.push({
            "Report Code": report.report_code,
            "Report Date": formatDate(report.report_date),
            "Report Type": report.report_type === "daily" ? "Daily" : report.report_type === "weekly" ? "Weekly" : "Monthly",
            "Total Scans": report.total_scans || 0,
            "Valid": report.valid_scans || 0,
            "Error": report.error_scans || 0,
            "Pending": report.pending_scans || 0,
            "Success Rate": `${report.success_rate || 0}%`,
          });
        }
      }

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reports");
      XLSX.writeFile(wb, `reports_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setShowExportDropdown(false);

      Swal.fire({
        title: "Success!",
        text: "Export completed successfully",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Export error:", error);
      Swal.fire("Error", "Failed to export data", "error");
    }
  };

  // Filter reports
  let filteredReports = [...reports];

  if (typeFilter !== "all") {
    filteredReports = filteredReports.filter((r) => r.report_type === typeFilter);
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredReports = filteredReports.filter(
      (r) =>
        r.report_code?.toLowerCase().includes(term) ||
        r.report_date?.toString().includes(term)
    );
  }

  // Sorting
  if (sorting.id) {
    filteredReports.sort((a, b) => {
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

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getReportTypeIcon = (type) => {
    if (type === "daily") return <Calendar className="w-4 h-4 text-blue-600" />;
    if (type === "weekly") return <Activity className="w-4 h-4 text-purple-600" />;
    return <BarChart3 className="w-4 h-4 text-green-600" />;
  };

  const getReportTypeLabel = (type) => {
    if (type === "daily") return "Daily";
    if (type === "weekly") return "Weekly";
    return "Monthly";
  };

  const getReportTypeBg = (type) => {
    if (type === "daily") return "bg-blue-100 text-blue-700";
    if (type === "weekly") return "bg-purple-100 text-purple-700";
    return "bg-green-100 text-green-700";
  };

  const kpis = [
    { title: "Total Reports", value: stats.totalReports, sub: "All reports", accent: "#2563eb", icon: <FileText className="w-5 h-5" /> },
    { title: "Total Scans", value: stats.total, sub: "All scans across reports", accent: "#3b82f6", icon: <ScanLine className="w-5 h-5" /> },
    { title: "Valid", value: stats.valid, sub: "Successfully verified", accent: "#10b981", icon: <CheckCircle className="w-5 h-5" /> },
    { title: "Error", value: stats.error, sub: "Need attention", accent: "#ef4444", icon: <XCircle className="w-5 h-5" /> },
    { title: "Pending", value: stats.pending, sub: "Awaiting verification", accent: "#d97706", icon: <Clock className="w-5 h-5" /> },
  ];

  const analyticsData = {
    successRate: stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0,
    avgValidationTime: "2.1s",
    mostActiveUser: "System",
    mostScannedLocation: "Multiple Locations",
  };

  if (!mounted) {
    return (
      <ProtectedPage>
        <LayoutDashboard activeMenu={4}>
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
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

          .rr-section {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            overflow: hidden;
          }

          .rr-th {
            padding: 12px 16px;
            font-size: 11px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            background: #f9fafb;
            cursor: pointer;
            border-bottom: 1px solid #e5e7eb;
          }
          .rr-th:hover { color: #374151; }
          .rr-td {
            padding: 14px 16px;
            font-size: 13px;
            color: #374151;
            border-top: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          .rr-row { cursor: pointer; transition: background 0.1s; }
          .rr-row:hover { background: #f8faff; }

          .rr-grid-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .rr-grid-card:hover {
            box-shadow: 0 6px 20px rgba(37,99,235,0.1);
            border-color: #bfdbfe;
            transform: translateY(-2px);
          }

          .rr-view-tog {
            display: flex;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            overflow: hidden;
          }
          .rr-view-tog button {
            padding: 7px 10px;
            background: #fff;
            color: #6b7280;
            border: none;
            cursor: pointer;
            transition: all 0.15s;
          }
          .rr-view-tog button.active,
          .rr-view-tog button:hover { background: #2563eb; color: #fff; }

          .rr-export-drop {
            position: absolute;
            right: 0;
            top: calc(100% + 6px);
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.12);
            z-index: 50;
            min-width: 220px;
            overflow: hidden;
          }

          .rr-search {
            border: 1px solid #d1d5db;
            border-radius: 12px;
          }
          .rr-search:focus {
            box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
            border-color: #93c5fd;
            outline: none;
          }

          .rr-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 20px;
            background: #f9fafb;
            border-top: 1px solid #f3f4f6;
            border-radius: 0 0 18px 18px;
          }

          .rr-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 72px 24px;
            text-align: center;
          }

          .kpi-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px 16px;
            text-align: center;
          }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
          }
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
                Periodic inspection reports and analytics for asset validation
              </p>
            </div>
            <button
              onClick={generateReport}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              <FileText className="w-4 h-4" />
              Generate Report
            </button>
          </div>

          {/* KPI Cards */}
          <div className="rr-section">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-gray-100">
              {kpis.map((d, i) => (
                <div key={i} className="kpi-cell">
                  <div className="p-2 rounded-full bg-opacity-10 mb-2" style={{ backgroundColor: `${d.accent}20` }}>
                    {d.icon}
                  </div>
                  <span className="text-2xl font-bold" style={{ color: d.accent }}>
                    {d.value}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{d.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{analyticsData.successRate}%</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg Validation Time</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{analyticsData.avgValidationTime}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Most Active User</p>
                  <p className="text-base font-semibold text-gray-900 mt-1 truncate">{analyticsData.mostActiveUser}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top Location</p>
                  <p className="text-base font-semibold text-gray-900 mt-1 truncate">{analyticsData.mostScannedLocation}</p>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

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
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b">
                            Export Options
                          </div>
                          <button
                            onClick={() => exportToExcel(false)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <div>
                              <div className="font-medium">Export Current View</div>
                              <div className="text-xs text-gray-500">{filteredReports.length} reports</div>
                            </div>
                          </button>
                          {selectedItems.length > 0 && (
                            <button
                              onClick={() => exportToExcel(true)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                              <div>
                                <div className="font-medium">Export Selected</div>
                                <div className="text-xs text-gray-500">{selectedItems.length} reports</div>
                              </div>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={fetchReports}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>

                  <button
                    onClick={toggleCheckboxMode}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${showCheckboxes ? "bg-gray-500 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    {showCheckboxes ? "Cancel" : "Multi Select"}
                  </button>

                  <div className="rr-view-tog ml-auto">
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

                {/* Bulk Action Buttons */}
                {showCheckboxes && selectedItems.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-500">{selectedItems.length} selected</span>
                    <button
                      onClick={handleBulkDelete}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Search & Filter */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by report code or date..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rr-search w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-gray-800 bg-white"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white border border-gray-300 focus:outline-none min-w-[130px]"
                >
                  <option value="all">All Types</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="rr-empty">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-500 text-sm font-medium">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="rr-empty">
                <div className="p-4 bg-blue-50 rounded-2xl inline-block mb-4">
                  <FileText className="w-12 h-12 text-blue-400" />
                </div>
                <h3 className="text-gray-900 font-semibold text-lg mb-2">No reports available</h3>
                <p className="text-gray-500 text-sm mb-6">Generate a report to get started</p>
                <button
                  onClick={generateReport}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  Generate Report
                </button>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="rr-empty">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-gray-900 font-semibold text-lg mb-2">No matching reports</h3>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                  }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm"
                >
                  Clear Filters
                </button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedReports.map((report) => (
                  <div
                    key={report.id_report}
                    className="rr-grid-card"
                    onClick={() => handleViewDetail(report)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectReport(report.id_report);
                          }}
                          className="mr-1"
                        >
                          {selectedItems.includes(report.id_report) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-300" />
                          )}
                        </button>
                        <div className={`p-2 rounded-lg ${getReportTypeBg(report.report_type)}`}>
                          {getReportTypeIcon(report.report_type)}
                        </div>
                      </div>
                      <span className={`badge ${report.success_rate >= 80 ? "bg-green-100 text-green-700" : report.success_rate >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        {report.success_rate || 0}% Success
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{report.report_code}</h3>
                    <p className="text-xs text-gray-500 mb-3">{formatDate(report.report_date)}</p>

                    <div className="grid grid-cols-4 gap-1 mb-3">
                      <div className="bg-gray-100 p-1 rounded text-center">
                        <div className="text-xs font-bold">{report.total_scans || 0}</div>
                        <div className="text-[10px] text-gray-500">Total</div>
                      </div>
                      <div className="bg-green-100 p-1 rounded text-center">
                        <div className="text-xs font-bold text-green-700">{report.valid_scans || 0}</div>
                        <div className="text-[10px] text-green-600">Valid</div>
                      </div>
                      <div className="bg-red-100 p-1 rounded text-center">
                        <div className="text-xs font-bold text-red-700">{report.error_scans || 0}</div>
                        <div className="text-[10px] text-red-600">Error</div>
                      </div>
                      <div className="bg-yellow-100 p-1 rounded text-center">
                        <div className="text-xs font-bold text-yellow-700">{report.pending_scans || 0}</div>
                        <div className="text-[10px] text-yellow-600">Pending</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">{getReportTypeLabel(report.report_type)} Report</span>
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View Details
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
                      {showCheckboxes && (
                        <th className="rr-th w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedItems.length === filteredReports.length && filteredReports.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-blue-600"
                          />
                        </th>
                      )}
                      <th className="rr-th text-left" onClick={() => handleSort("report_code")}>
                        Report Code {getSortIcon("report_code")}
                      </th>
                      <th className="rr-th text-left" onClick={() => handleSort("report_date")}>
                        Date {getSortIcon("report_date")}
                      </th>
                      <th className="rr-th text-left hidden md:table-cell">Type</th>
                      <th className="rr-th text-left">Total</th>
                      <th className="rr-th text-left hidden md:table-cell">Breakdown</th>
                      <th className="rr-th text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReports.map((report) => (
                      <tr key={report.id_report} className="rr-row" onClick={() => handleViewDetail(report)}>
                        {showCheckboxes && (
                          <td className="rr-td text-center">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(report.id_report)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectItem(report.id_report);
                              }}
                              className="rounded border-gray-300 text-blue-600"
                            />
                          </td>
                        )}
                        <td className="rr-td">
                          <span className="font-mono text-sm font-semibold text-gray-900">{report.report_code}</span>
                        </td>
                        <td className="rr-td">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm">{formatDate(report.report_date)}</span>
                          </div>
                        </td>
                        <td className="rr-td hidden md:table-cell">
                          <span className={`badge ${getReportTypeBg(report.report_type)}`}>
                            {getReportTypeIcon(report.report_type)}
                            {getReportTypeLabel(report.report_type)}
                          </span>
                        </td>
                        <td className="rr-td">
                          <span className="text-sm font-semibold">{report.total_scans || 0}</span>
                        </td>
                        <td className="rr-td hidden md:table-cell">
                          <div className="flex gap-1">
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">{report.valid_scans || 0}</span>
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">{report.error_scans || 0}</span>
                            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">{report.pending_scans || 0}</span>
                          </div>
                        </td>
                        <td className="rr-td">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetail(report);
                              }}
                              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSingle(report);
                              }}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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
                <p className="text-xs text-gray-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredReports.length)} of {filteredReports.length} reports
                  {typeFilter !== "all" && ` • ${typeFilter} only`}
                  {searchTerm && ` • "${searchTerm}"`}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 text-xs text-gray-600 font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal */}
        {detailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setDetailModal(null)}>
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {getReportTypeIcon(detailModal.report_type)}
                  <h2 className="text-lg font-semibold text-gray-900">Report Details</h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    {detailModal.report_code}
                  </span>
                </div>
                <button onClick={() => setDetailModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-gray-800">{detailModal.total_scans || 0}</p>
                    <p className="text-xs text-gray-500">Total Scans</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-green-700">{detailModal.valid_scans || 0}</p>
                    <p className="text-xs text-green-600">Valid</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-red-700">{detailModal.error_scans || 0}</p>
                    <p className="text-xs text-red-600">Error</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-yellow-700">{detailModal.pending_scans || 0}</p>
                    <p className="text-xs text-yellow-600">Pending</p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Report Type</p>
                    <p className="font-semibold text-gray-900 capitalize">{detailModal.report_type}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Generated By</p>
                    <p className="font-semibold text-gray-900">{detailModal.generated_by_name || "System"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Period Start</p>
                    <p className="font-semibold text-gray-900">{formatDate(detailModal.report_date)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Success Rate</p>
                    <p className="font-semibold text-gray-900">{detailModal.success_rate || 0}%</p>
                  </div>
                </div>

                {/* Scanned Items */}
                {detailModal.items && detailModal.items.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      SCANNED ITEMS ({detailModal.items.length})
                    </h5>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {detailModal.items.slice(0, 20).map((item, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-gray-900 text-sm">{item.asset_name || "-"}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${item.status === "Valid" ? "bg-green-100 text-green-700" :
                                item.status === "Error" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                              }`}>
                              {item.status || "Pending"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                            <div><span className="text-gray-400">Type:</span> {item.asset_type || "-"}</div>
                            <div><span className="text-gray-400">Location:</span> {item.location_name || "-"}</div>
                            <div><span className="text-gray-400">Code:</span> {item.serial_or_code || "-"}</div>
                            <div><span className="text-gray-400">Verified:</span> {item.verified_by_name || "-"}</div>
                          </div>
                        </div>
                      ))}
                      {detailModal.items.length > 20 && (
                        <div className="text-center text-sm text-gray-500 py-2">... and {detailModal.items.length - 20} more items</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setDetailModal(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Close
                </button>
                <button
                  onClick={() => {
                    setDetailModal(null);
                    exportToExcel(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export
                </button>
              </div>
            </div>
          </div>
        )}
      </LayoutDashboard>
    </ProtectedPage>
  );
}