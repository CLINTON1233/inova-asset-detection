"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Clock,
  ChevronRight,
  BarChart3,
  FileBarChart,
  CalendarRange,
  ChevronLeft,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import API_BASE_URL from "../../config/api";

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState("weekly");
  const [selectedYear, setSelectedYear] = useState(null); // Mulai dengan null
  const [selectedMonth, setSelectedMonth] = useState(null); // Mulai dengan null
  const [availableYears, setAvailableYears] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [userRole, setUserRole] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Gunakan ref untuk mencegah infinite loop
  const isFetchingRef = useRef(false);
  const lastFetchParamsRef = useRef({ periodType: null, year: null, month: null });

  useEffect(() => {
    setMounted(true);
    // Get user role from localStorage
    const userData = localStorage.getItem("user_data");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUserRole(parsed.role);
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    fetchAvailableYears();
  }, []);

  // Effect untuk mengatur nilai default setelah years tersedia
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === null) {
      setSelectedYear(availableYears[0]);
      setSelectedMonth(new Date().getMonth() + 1);
    }
  }, [availableYears, selectedYear]);

  // Effect untuk fetch reports - dengan guard untuk mencegah duplicate fetch
  useEffect(() => {
    if (mounted && selectedYear !== null && selectedMonth !== null) {
      // Cek apakah parameter berubah
      const currentParams = {
        periodType,
        year: selectedYear,
        month: selectedMonth
      };

      const lastParams = lastFetchParamsRef.current;

      if (lastParams.periodType === currentParams.periodType &&
        lastParams.year === currentParams.year &&
        lastParams.month === currentParams.month &&
        !isInitialLoad) {
        // Parameter sama, skip fetch
        return;
      }

      // Update last params
      lastFetchParamsRef.current = currentParams;

      // Fetch reports
      fetchReports();
      setIsInitialLoad(false);
    }
  }, [mounted, periodType, selectedYear, selectedMonth]);

  const fetchAvailableYears = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/years`);
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        setAvailableYears(result.data);
      } else {
        setAvailableYears([new Date().getFullYear()]);
      }
    } catch (error) {
      console.error("Error fetching years:", error);
      setAvailableYears([new Date().getFullYear()]);
    }
  };

  const fetchReports = useCallback(async () => {
    // Cegah multiple fetch bersamaan
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);

    try {
      let url = `${API_BASE_URL}/api/reports?period=${periodType}`;
      if (periodType === "monthly" && selectedYear && selectedMonth) {
        url += `&year=${selectedYear}&month=${selectedMonth}`;
      }

      console.log("Fetching reports:", url); // Debug

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setReports(result.data);
      } else {
        throw new Error(result.error || "Failed to load reports");
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to load reports",
        icon: "error",
      });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [periodType, selectedYear, selectedMonth]);

  const handlePeriodTypeChange = (newType) => {
    if (newType === periodType) return; // Jika sama, skip
    setPeriodType(newType);
    // Reset loading state
    setReports([]);
  };

  const handleYearChange = (year) => {
    setSelectedYear(parseInt(year));
    setReports([]); // Clear old data
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(parseInt(month));
    setReports([]); // Clear old data
  };

  const handleRefresh = () => {
    // Reset last params untuk memaksa fetch
    lastFetchParamsRef.current = { periodType: null, year: null, month: null };
    fetchReports();
  };

  const handleViewReportDetail = (report) => {
    const year = report.year || selectedYear;
    const month = report.month || selectedMonth;
    const periodTypeParam = report.period_type || periodType;

    router.push(
      `/reports/detail?period_type=${periodTypeParam}&period_key=${encodeURIComponent(report.period_key)}&year=${year}&month=${month}&report_id=${report.id_report || ''}`,
    );
  };

  // Get verification badge configuration
  const getVerificationBadge = (status) => {
    switch (status) {
      case "approved":
        return {
          icon: <CheckCircle className="w-3.5 h-3.5" />,
          text: "Approved",
          bgClass: "bg-green-100",
          textClass: "text-green-700",
          iconClass: "text-green-500",
        };
      case "rejected":
        return {
          icon: <XCircle className="w-3.5 h-3.5" />,
          text: "Rejected",
          bgClass: "bg-red-100",
          textClass: "text-red-700",
          iconClass: "text-red-500",
        };
      case "on_review":
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          text: "On Review",
          bgClass: "bg-yellow-100",
          textClass: "text-yellow-700",
          iconClass: "text-yellow-500",
        };
      default:
        return {
          icon: <Clock className="w-3.5 h-3.5" />,
          text: "Pending Review",
          bgClass: "bg-gray-100",
          textClass: "text-gray-600",
          iconClass: "text-gray-500",
        };
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const stats = {
    total: reports.length,
    totalItems: reports.reduce((sum, r) => sum + (r.total_items || 0), 0),
    totalDevices: reports.reduce((sum, r) => sum + (r.total_devices || 0), 0),
    totalMaterials: reports.reduce((sum, r) => sum + (r.total_materials || 0), 0),
  };

  // Loading state untuk initial load atau saat data belum siap
  if (!mounted || selectedYear === null || selectedMonth === null) {
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
      <LayoutDashboard activeMenu="reports">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
          .rp-root { font-family: 'DM Sans', sans-serif; }
          
          .rp-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s ease;
          }
          
          .rp-stat-card {
            border-radius: 14px;
            padding: 16px;
            color: #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            transition: transform 0.2s;
          }
          .rp-stat-card:hover { transform: translateY(-2px); }
          
          .rp-section {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            overflow: hidden;
          }
          
          .rp-grid-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .rp-grid-card:hover {
            box-shadow: 0 6px 20px rgba(37,99,235,0.1);
            border-color: #bfdbfe;
            transform: translateY(-2px);
          }
          
          .rp-view-tog {
            display: flex;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            overflow: hidden;
          }
          .rp-view-tog button {
            padding: 7px 10px;
            background: #fff;
            color: #6b7280;
            border: none;
            cursor: pointer;
            transition: all 0.15s;
          }
          .rp-view-tog button.active,
          .rp-view-tog button:hover {
            background: #2563eb;
            color: #fff;
          }
          
          .rp-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 72px 24px;
            text-align: center;
          }
          
          .badge-device { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
          .badge-material { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          
          @media (max-width: 640px) {
            .rp-stat-val { font-size: 24px !important; }
          }
        `}</style>

        <div className="rp-root space-y-5">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileBarChart className="w-5 h-5 text-blue-600" />
                Reports Assets
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Monitor and manage asset reports by weekly or monthly periods
              </p>
            </div>
          </div>

          {/* Period Filter */}
          <div className="rp-card p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-blue-500" />
                  Period:
                </span>
                <div className="flex rounded-lg overflow-hidden border border-gray-300">
                  <button
                    onClick={() => handlePeriodTypeChange("weekly")}
                    className={`px-4 py-2 text-sm font-medium transition ${periodType === "weekly"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => handlePeriodTypeChange("monthly")}
                    className={`px-4 py-2 text-sm font-medium transition ${periodType === "monthly"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {periodType === "monthly" && (
                <div className="flex items-center gap-3">
                  <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {months.map((month, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="rp-card">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
              {[
                {
                  title: "Total Reports",
                  value: stats.total,
                  sub: "Periods",
                  accent: "#2563eb",
                  icon: FileBarChart,
                },
                {
                  title: "Total Assets",
                  value: stats.totalItems,
                  sub: "All items",
                  accent: "#10b981",
                  icon: Box,
                },
                {
                  title: "Devices",
                  value: stats.totalDevices,
                  sub: "Device items",
                  accent: "#3b82f6",
                  icon: Laptop,
                },
                {
                  title: "Materials",
                  value: stats.totalMaterials,
                  sub: "Material items",
                  accent: "#8b5cf6",
                  icon: Package,
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
                    padding: "20px 16px",
                    textAlign: "center",
                  }}
                >
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {d.title}
                  </p>
                  <span
                    className="rp-stat-val text-3xl sm:text-4xl font-bold"
                    style={{ color: d.accent }}
                  >
                    {Math.floor(d.value)}
                  </span>
                  <p className="text-xs text-gray-400 mt-1.5">{d.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Main Section */}
          <div className="rp-section">
            {/* Header */}
            <div className="p-5 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    {periodType === "weekly"
                      ? "Weekly Reports"
                      : "Monthly Reports"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {periodType === "weekly"
                      ? "View reports grouped by week"
                      : `Reports for ${months[selectedMonth - 1]} ${selectedYear}`}
                  </p>
                </div>

                {/* View Toggle */}
                <div className="rp-view-tog">
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

            {/* Content */}
            {loading ? (
              <div className="rp-empty">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
                <p className="text-gray-500 text-sm font-medium">
                  Loading reports...
                </p>
              </div>
            ) : reports.length === 0 ? (
              <div className="rp-empty">
                <FileBarChart
                  className="w-12 h-12 text-gray-300 mb-4"
                  strokeWidth={1.5}
                />
                <h3 className="text-gray-500 font-medium text-sm mb-1">
                  No reports available
                </h3>
                <p className="text-gray-400 text-xs max-w-xs">
                  Complete asset validations to generate reports.
                </p>
                <button
                  onClick={() => router.push("/validation_verification")}
                  className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-white text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 transition"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Go to Validations
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* Grid View - same as before */
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reports.map((report, idx) => {
                    const verificationBadge = getVerificationBadge(report.verification_status);
                    return (
                      <div
                        key={idx}
                        className="rp-grid-card"
                        onClick={() => handleViewReportDetail(report)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            {report.period_type === "weekly" ? (
                              <Calendar className="w-5 h-5 text-blue-600" />
                            ) : (
                              <CalendarRange className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700">
                              {report.period_type === "weekly"
                                ? "Weekly"
                                : "Monthly"}
                            </span>
                            <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${verificationBadge.bgClass} ${verificationBadge.textClass}`}>
                              {verificationBadge.icon}
                              {verificationBadge.text}
                            </span>
                          </div>
                        </div>

                        <h3 className="font-semibold text-gray-900 text-base mb-1">
                          {report.period_label}
                        </h3>
                        {report.period_type === "weekly" && report.start_date && (
                          <p className="text-xs text-gray-500 mb-3">
                            {report.start_date} - {report.end_date}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                            <span className="text-xl font-bold text-gray-800">
                              {report.session_count || 0}
                            </span>
                            <span className="text-[10px] text-gray-400 block">
                              Sessions
                            </span>
                          </div>
                          <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                            <span className="text-xl font-bold text-gray-800">
                              {report.total_items || 0}
                            </span>
                            <span className="text-[10px] text-gray-400 block">
                              Total Items
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex gap-2">
                            <span className="text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                              🔵 {report.total_devices || 0} Devices
                            </span>
                            <span className="text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-600 font-medium">
                              🟢 {report.total_materials || 0} Materials
                            </span>
                          </div>
                          <button className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                            {userRole === "superadmin" ? "Review" : "View Details"} <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* List View Table - same as before */
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Weekly/Monthly
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Sessions
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Devices
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Materials
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Total Items
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report, idx) => {
                      const verificationBadge = getVerificationBadge(report.verification_status);
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              {report.period_type === "weekly" ? (
                                <Calendar className="w-4 h-4 text-gray-400" />
                              ) : (
                                <CalendarRange className="w-4 h-4 text-gray-400" />
                              )}
                              <span className="font-medium text-gray-700 text-sm">
                                {report.period_label}
                              </span>
                            </div>
                            {report.period_type === "weekly" &&
                              report.start_date && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {report.start_date} - {report.end_date}
                                </p>
                              )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                              {report.period_type === "weekly"
                                ? "Weekly"
                                : "Monthly"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-sm font-medium text-gray-700">
                              {Math.floor(report.session_count || 0)} session
                              {Math.floor(report.session_count || 0) !== 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-sm text-gray-600">
                              {Math.floor(report.total_devices || 0)} device
                              {Math.floor(report.total_devices || 0) !== 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-sm text-gray-600">
                              {Math.floor(report.total_materials || 0)} material
                              {Math.floor(report.total_materials || 0) !== 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-sm font-bold text-gray-800">
                              {Math.floor(report.total_items || 0)} item
                              {Math.floor(report.total_items || 0) !== 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${verificationBadge.bgClass} ${verificationBadge.textClass}`}>
                              {verificationBadge.icon}
                              {verificationBadge.text}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleViewReportDetail(report)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${userRole === "superadmin"
                                ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                                : "bg-gray-500 hover:bg-gray-600 text-white"
                                }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {userRole === "superadmin" ? "Review" : "View Details"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            {!loading && reports.length > 0 && (
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Showing {reports.length} report(s)
                  {periodType === "monthly" &&
                    ` for ${months[selectedMonth - 1]} ${selectedYear}`}
                </p>
              </div>
            )}
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedPage>
  );
}