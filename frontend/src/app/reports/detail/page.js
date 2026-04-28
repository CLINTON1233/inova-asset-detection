"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Laptop,
  LayoutGrid,
  List,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  ChevronRight,
  FileBarChart,
  CalendarRange,
  Printer,
  Download,
  ArrowLeft,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import LayoutDashboard from "../../components/LayoutDashboard";
import ProtectedPage from "../../components/ProtectedPage";
import API_BASE_URL from "../../../config/api";

export default function ReportDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const periodType = searchParams.get("period_type") || "monthly";
  const periodKey = searchParams.get("period_key") || "";
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sorting, setSorting] = useState({ id: "checking_date", desc: true });
  const [viewMode, setViewMode] = useState("list");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchReportDetail();
  }, [periodType, periodKey, year, month]);

  const fetchReportDetail = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/reports/detail?period_type=${periodType}&period_key=${periodKey}`;
      if (year) url += `&year=${year}`;
      if (month) url += `&month=${month}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setReportData(result.data);
      } else {
        throw new Error(result.error || "Failed to load report detail");
      }
    } catch (error) {
      console.error("Error fetching report detail:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to load report detail",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewSessionAssets = (sessionId, type) => {
    router.push(`/assets/${sessionId}?type=${type}`);
  };

  const handleExport = async () => {
    setExporting(true);
    setShowExportDropdown(false);

    try {
      let url = `${API_BASE_URL}/api/reports/export?period_type=${periodType}&period_key=${periodKey}`;
      if (year) url += `&year=${year}`;
      if (month) url += `&month=${month}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        const dataToExport = result.data.map((asset) => ({
          "Asset Code": asset.asset_code || "-",
          "Asset Name": asset.asset_name || "-",
          Type: asset.asset_type === "device" ? "Device" : "Material",
          Category: asset.category || "-",
          "Serial/Scan Code": asset.serial_number || asset.scan_code || "-",
          "Brand/Vendor": asset.brand || asset.vendor || "-",
          Model: asset.model || "-",
          Project: asset.project_name || "-",
          Department: asset.department_name || "-",
          Receiver: asset.receiver_name || "-",
          Location: asset.location_name || "-",
          Quantity: asset.quantity || 1,
          UOM: asset.uom || "-",
          Status: asset.status || "active",
          Session: asset.session_name || "-",
          "Session Number": asset.session_number || "-",
          "Validated Date": asset.validated_at
            ? new Date(asset.validated_at).toLocaleDateString("id-ID")
            : "-",
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        ws["!cols"] = [
          { wch: 15 },
          { wch: 30 },
          { wch: 12 },
          { wch: 15 },
          { wch: 20 },
          { wch: 20 },
          { wch: 15 },
          { wch: 25 },
          { wch: 20 },
          { wch: 20 },
          { wch: 20 },
          { wch: 10 },
          { wch: 8 },
          { wch: 12 },
          { wch: 25 },
          { wch: 20 },
          { wch: 16 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report Assets");

        const periodLabel =
          reportData?.period_key || `${periodType}_${year}_${month}`;
        const fileName = `report_${periodLabel}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`;
        XLSX.writeFile(wb, fileName);

        Swal.fire({
          title: "Export Successful!",
          text: `${result.data.length} assets exported to Excel`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          title: "No Data",
          text: "No assets found to export",
          icon: "info",
        });
      }
    } catch (error) {
      console.error("Error exporting:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to export report",
        icon: "error",
      });
    } finally {
      setExporting(false);
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

  // Filter and sort sessions
  let filteredSessions = reportData?.sessions || [];

  if (searchTerm) {
    filteredSessions = filteredSessions.filter(
      (s) =>
        s.checking_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.checking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.location_name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (s.project_name || "").toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }

  if (typeFilter !== "all") {
    filteredSessions = filteredSessions.filter((s) => s.type === typeFilter);
  }

  if (sorting.id) {
    filteredSessions = [...filteredSessions].sort((a, b) => {
      let aVal = a[sorting.id];
      let bVal = b[sorting.id];
      if (sorting.id === "checking_date") {
        aVal = new Date(a.checking_date);
        bVal = new Date(b.checking_date);
      }
      if (aVal < bVal) return sorting.desc ? 1 : -1;
      if (aVal > bVal) return sorting.desc ? -1 : 1;
      return 0;
    });
  }

  const stats = {
    totalSessions: reportData?.session_count || 0,
    totalItems: reportData?.total_items || 0,
    totalDevices: reportData?.total_devices || 0,
    totalMaterials: reportData?.total_materials || 0,
  };

  if (!mounted) {
    return (
      <ProtectedPage>
        <LayoutDashboard activeMenu={4}>
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
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
          .rd-root { font-family: 'DM Sans', sans-serif; }
          
          .rd-section {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            overflow: hidden;
          }
          
          .rd-grid-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .rd-grid-card:hover {
            box-shadow: 0 6px 20px rgba(37,99,235,0.1);
            border-color: #bfdbfe;
            transform: translateY(-2px);
          }
          
          .rd-view-tog {
            display: flex;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            overflow: hidden;
          }
          .rd-view-tog button {
            padding: 7px 10px;
            background: #fff;
            color: #6b7280;
            border: none;
            cursor: pointer;
            transition: all 0.15s;
          }
          .rd-view-tog button.active,
          .rd-view-tog button:hover {
            background: #2563eb;
            color: #fff;
          }
          
          .rd-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 72px 24px;
            text-align: center;
          }
          
          .badge-device { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
          .badge-material { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          
          .rd-search {
            border: 1px solid #d1d5db;
            border-radius: 12px;
          }
          .rd-search:focus {
            box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
            border-color: #93c5fd;
            outline: none;
          }
          
          .rd-export-drop {
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
        `}</style>

        <div className="rd-root space-y-5">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Reports</span>
            </button>
          </div>

          {/* Report Header */}
          <div className="rd-section">
            <div className="p-5 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {periodType === "weekly" ? (
                      <Calendar className="w-5 h-5 text-blue-600" />
                    ) : (
                      <CalendarRange className="w-5 h-5 text-blue-600" />
                    )}
                    <h1 className="text-xl font-bold text-gray-800">
                      {periodType === "weekly"
                        ? "Weekly Report"
                        : "Monthly Report"}
                    </h1>
                  </div>
                  <p className="text-gray-600">
                    {reportData?.period_key || `${periodType} ${year} ${month}`}
                  </p>
                  {reportData?.start_date && reportData?.end_date && (
                    <p className="text-sm text-gray-500 mt-1">
                      Period: {reportData.start_date} - {reportData.end_date}
                    </p>
                  )}
                </div>

                {/* Export Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
                    style={{
                      background: "linear-gradient(135deg,#059669,#10b981)",
                    }}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {exporting ? "Exporting..." : "Export to Excel"}
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showExportDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowExportDropdown(false)}
                      />
                      <div className="rd-export-drop">
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase border-b">
                          Export Options
                        </div>
                        <button
                          onClick={handleExport}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 transition"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-green-600" />
                          <div>
                            <div className="font-medium text-gray-800">
                              Export Full Report
                            </div>
                            <div className="text-xs text-gray-400">
                              All assets in this period
                            </div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
              {[
                {
                  title: "Sessions",
                  value: stats.totalSessions,
                  accent: "#2563eb",
                  icon: FileBarChart,
                },
                {
                  title: "Total Assets",
                  value: stats.totalItems,
                  accent: "#10b981",
                  icon: Box,
                },
                {
                  title: "Devices",
                  value: stats.totalDevices,
                  accent: "#3b82f6",
                  icon: Laptop,
                },
                {
                  title: "Materials",
                  value: stats.totalMaterials,
                  accent: "#8b5cf6",
                  icon: Package,
                },
              ].map((d, i) => (
                <div
                  key={i}
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
                    className="text-3xl font-bold"
                    style={{ color: d.accent }}
                  >
                    {Math.floor(d.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sessions List Section */}
          <div className="rd-section">
            <div className="p-5 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Box className="w-4 h-4 text-blue-600" />
                    Reports in this Period
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {filteredSessions.length} Session Found
                  </p>
                </div>

                {/* View Toggle */}
                <div className="rd-view-tog">
                  <button
                    className={viewMode === "list" ? "active" : ""}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    className={viewMode === "grid" ? "active" : ""}
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by session name, number, location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rd-search w-full pl-9 pr-8 py-2.5 rounded-xl text-sm text-gray-800 bg-white"
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
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none min-w-[140px]"
                >
                  <option value="all">All Types</option>
                  <option value="device">Devices Only</option>
                  <option value="material">Materials Only</option>
                </select>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="rd-empty">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
                <p className="text-gray-500 text-sm">Loading report data...</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="rd-empty">
                <Search className="w-12 h-12 text-gray-300 mb-3" />
                <h3 className="text-gray-500 font-medium text-sm">
                  No sessions found
                </h3>
                <p className="text-gray-400 text-xs mt-1">
                  Try adjusting your search or filter
                </p>
              </div>
            ) : viewMode === "grid" ? (
              /* Grid View */
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSessions.map((session) => (
                    <div
                      key={`${session.type}_${session.id_preparation}`}
                      className="rd-grid-card"
                      onClick={() =>
                        handleViewSessionAssets(
                          session.id_preparation,
                          session.type,
                        )
                      }
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            session.type === "device"
                              ? "bg-blue-100"
                              : "bg-emerald-100"
                          }`}
                        >
                          {session.type === "device" ? (
                            <Laptop className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Package className="w-5 h-5 text-emerald-600" />
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                            session.type === "device"
                              ? "badge-device"
                              : "badge-material"
                          }`}
                        >
                          {session.type === "device" ? "Device" : "Material"}
                        </span>
                      </div>

                      <h3 className="font-semibold text-gray-900 text-base truncate">
                        {session.checking_name}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5 mb-3">
                        {session.checking_number}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(session.checking_date)}</span>
                      </div>

                      {session.location_name && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">
                            {session.location_name}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex gap-2">
                          <span className="text-xs font-bold text-gray-800">
                            {Math.floor(session.total_items || 0)} items
                          </span>
                        </div>
                        <button className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                          View Assets <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Table View */
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Session
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                        Location
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                        Project
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSessions.map((session) => (
                      <tr
                        key={`${session.type}_${session.id_preparation}`}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() =>
                          handleViewSessionAssets(
                            session.id_preparation,
                            session.type,
                          )
                        }
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                session.type === "device"
                                  ? "bg-blue-100"
                                  : "bg-emerald-100"
                              }`}
                            >
                              {session.type === "device" ? (
                                <Laptop className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Package className="w-4 h-4 text-emerald-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm truncate max-w-[200px]">
                                {session.checking_name}
                              </div>
                              <div className="text-xs text-gray-400 font-mono">
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
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              session.type === "device"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {session.type === "device" ? "Device" : "Material"}
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm text-gray-600 truncate max-w-[150px]">
                              {session.location_name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm text-gray-600 truncate max-w-[120px]">
                              {session.project_name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-bold text-gray-900">
                            {Math.floor(session.total_items || 0)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewSessionAssets(
                                session.id_preparation,
                                session.type,
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition"
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
            {!loading && filteredSessions.length > 0 && (
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Showing {filteredSessions.length} of{" "}
                  {reportData?.session_count || 0} sessions
                  {typeFilter !== "all" && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px]">
                      {typeFilter === "device" ? "Devices" : "Materials"}
                    </span>
                  )}
                  {searchTerm && (
                    <span className="ml-2 text-gray-400">· "{searchTerm}"</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  Total Assets: {Math.floor(stats.totalItems)}
                </p>
              </div>
            )}
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedPage>
  );
}
