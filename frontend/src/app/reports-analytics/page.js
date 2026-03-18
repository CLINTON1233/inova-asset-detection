"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
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
  Database,
  Activity,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Printer,
  FileDown,
  Package,
  List,
  Grid,
  FileSpreadsheet,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  QrCode,
  ScanLine,
} from "lucide-react";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

export default function ReportsAnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState({ id: "date", desc: true });
  const [expandedPeriod, setExpandedPeriod] = useState(null);

  const router = useRouter();

  const periodReports = [
    {
      periodId: "PERIOD-2025-10-28",
      periodType: "daily",
      date: "2025-10-28",
      displayDate: "Monday, 28 October 2025",
      totalScans: 3,
      valid: 2,
      error: 1,
      pending: 0,
      items: [
        {
          id: "RPT-001",
          scanId: "PC-IT-2025-001",
          assetType: "Computer",
          category: "Perangkat",
          location: "Infrastructure & Networking",
          serialNumber: "NS-PC-887632",
          status: "Valid",
          scanDate: "2025-10-28",
          scanTime: "14:30:15",
          verifiedBy: "Clinton Alfaro",
          department: "IT Infrastructure & Networking",
          validationTime: "2s",
          uniqueCode: "V-901-XYZ-A",
          scanMethod: "QR Code Scan",
          notes: "Device in good condition",
        },
        {
          id: "RPT-002",
          scanId: "MAT-KBL-045",
          assetType: "RJ45 Cable",
          category: "Material",
          location: "Workshop 2",
          barcode: "BC-RJ45-554321",
          status: "Valid",
          scanDate: "2025-10-28",
          scanTime: "14:25:40",
          verifiedBy: "Wahyu Hidayat",
          department: "Facilities & Networking",
          validationTime: "1.5s",
          uniqueCode: "V-902-ABC-B",
          scanMethod: "Barcode Scan",
          notes: "Cable available in sufficient stock",
        },
        {
          id: "RPT-003",
          scanId: "SRV-NET-012",
          assetType: "Server",
          category: "Perangkat",
          location: "Server Room L3",
          serialNumber: "NS-SRV-992345",
          status: "Error",
          scanDate: "2025-10-28",
          scanTime: "14:18:22",
          verifiedBy: "Ikhsan Kurniawan",
          department: "System Operation",
          validationTime: "3s",
          uniqueCode: "V-903-DEF-C",
          scanMethod: "QR Code Scan",
          notes: "Server experiencing overheating",
        },
      ],
    },
    {
      periodId: "PERIOD-2025-10-27",
      periodType: "daily",
      date: "2025-10-27",
      displayDate: "Sunday, 27 October 2025",
      totalScans: 2,
      valid: 1,
      error: 0,
      pending: 1,
      items: [
        {
          id: "RPT-004",
          scanId: "CCTV-SEC-003",
          assetType: "CCTV",
          category: "Perangkat",
          location: "Main Gate",
          serialNumber: "NS-CCTV-661234",
          status: "Valid",
          scanDate: "2025-10-27",
          scanTime: "16:20:15",
          verifiedBy: "Yovan Sakti",
          department: "Facilities & Networking",
          validationTime: "2.2s",
          uniqueCode: "V-905-JKL-E",
          scanMethod: "QR Code Scan",
          notes: "CCTV functioning optimally",
        },
        {
          id: "RPT-005",
          scanId: "LPT-IT-2025-002",
          assetType: "Laptop",
          category: "Perangkat",
          location: "Main Office L2",
          serialNumber: "NS-LPT-445321",
          status: "Pending",
          scanDate: "2025-10-27",
          scanTime: "15:45:30",
          verifiedBy: "Clinton Alfaro",
          department: "IT Infrastructure & Networking",
          validationTime: "2.5s",
          uniqueCode: "V-906-MNO-F",
          scanMethod: "Manual Input",
          notes: "Waiting for supervisor confirmation",
        },
      ],
    },
    {
      periodId: "PERIOD-2025-10-26",
      periodType: "daily",
      date: "2025-10-26",
      displayDate: "Saturday, 26 October 2025",
      totalScans: 2,
      valid: 1,
      error: 1,
      pending: 0,
      items: [
        {
          id: "RPT-006",
          scanId: "MAT-TRK-987",
          assetType: "Trunking",
          category: "Material",
          location: "Main Office L1",
          barcode: "BC-TRK-773216",
          status: "Valid",
          scanDate: "2025-10-26",
          scanTime: "13:10:05",
          verifiedBy: "Mahmud Amma Rizki",
          department: "Operations & End User Service",
          validationTime: "1.8s",
          uniqueCode: "V-904-GHI-D",
          scanMethod: "Barcode Scan",
          notes: "Trunking installed neatly",
        },
        {
          id: "RPT-007",
          scanId: "MAT-PIP-056",
          assetType: "Network Pipe",
          category: "Material",
          location: "Workshop 1",
          barcode: "BC-PIP-998765",
          status: "Error",
          scanDate: "2025-10-26",
          scanTime: "12:45:10",
          verifiedBy: "Wahyu Hidayat",
          department: "Facilities & Networking",
          validationTime: "4s",
          uniqueCode: "V-907-PQR-G",
          scanMethod: "Barcode Scan",
          notes: "Pipe damaged at connection",
        },
      ],
    },
    {
      periodId: "WEEK-2025-43",
      periodType: "weekly",
      date: "2025-10-20",
      endDate: "2025-10-26",
      displayDate: "Week 43 (20-26 Oct 2025)",
      totalScans: 15,
      valid: 12,
      error: 2,
      pending: 1,
      items: [
        {
          id: "RPT-008",
          scanId: "SWT-NET-008",
          assetType: "Network Switch",
          category: "Perangkat",
          location: "Server Room L3",
          serialNumber: "NS-SWT-778899",
          status: "Valid",
          scanDate: "2025-10-25",
          scanTime: "11:20:15",
          verifiedBy: "Ikhsan Kurniawan",
          department: "System Operation",
          validationTime: "1.7s",
          uniqueCode: "V-908-STU-H",
          scanMethod: "QR Code Scan",
          notes: "Switch operating normally",
        },
      ],
    },
  ];

  // Statistics
  const stats = {
    total: periodReports.reduce((sum, period) => sum + period.totalScans, 0),
    valid: periodReports.reduce((sum, period) => sum + period.valid, 0),
    error: periodReports.reduce((sum, period) => sum + period.error, 0),
    pending: periodReports.reduce((sum, period) => sum + period.pending, 0),
    daily: periodReports.filter((period) => period.periodType === "daily").length,
    weekly: periodReports.filter((period) => period.periodType === "weekly").length,
  };

  const analyticsData = {
    successRate: Math.round((stats.valid / stats.total) * 100) || 0,
    avgValidationTime: "2.1s",
    mostActiveUser: "Clinton Alfaro",
    mostScannedLocation: "Infrastructure & Networking",
  };

  // Filter and sort data
  const filteredPeriods = useMemo(() => {
    let filtered = periodReports.filter((period) => {
      const matchesPeriod = selectedPeriod === "all" || period.periodType === selectedPeriod;
      const matchesSearch = searchTerm === "" ||
        period.displayDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        period.items.some(item => 
          item.assetType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.scanId.toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchesPeriod && matchesSearch;
    });

    // Sorting
    if (sorting.id) {
      filtered.sort((a, b) => {
        let aVal = a[sorting.id] || a.date;
        let bVal = b[sorting.id] || b.date;
        if (aVal < bVal) return sorting.desc ? 1 : -1;
        if (aVal > bVal) return sorting.desc ? -1 : 1;
        return 0;
      });
    }

    return filtered;
  }, [periodReports, selectedPeriod, searchTerm, sorting]);

  const handleSort = (columnId) => {
    setSorting((prev) => ({
      id: columnId,
      desc: prev.id === columnId ? !prev.desc : false,
    }));
  };

  const getSortIcon = (columnId) => {
    if (sorting.id !== columnId) {
      return (
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
        </svg>
      );
    }
    return sorting.desc ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />;
  };

  const toggleSelectPeriod = (periodId) => {
    setSelectedItems((prev) =>
      prev.includes(periodId)
        ? prev.filter((id) => id !== periodId)
        : [...prev, periodId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredPeriods.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredPeriods.map((period) => period.periodId));
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Valid":
        return "bg-green-100 text-green-700 border-green-200";
      case "Error":
        return "bg-red-100 text-red-700 border-red-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Perangkat":
        return <Cpu className="w-4 h-4 text-blue-600" />;
      case "Material":
        return <Cable className="w-4 h-4 text-green-600" />;
      default:
        return <Cpu className="w-4 h-4 text-gray-600" />;
    }
  };

  const togglePeriodExpansion = (periodId) => {
    setExpandedPeriod(expandedPeriod === periodId ? null : periodId);
  };

  const showPeriodDetail = (period) => {
    Swal.fire({
      title: `<div class="font-dm-sans text-lg font-semibold text-gray-900">${period.displayDate}</div>`,
      html: `
        <div class="font-dm-sans text-left space-y-4 max-h-[70vh] overflow-y-auto">
          <div class="grid grid-cols-4 gap-2">
            <div class="bg-gray-100 p-2 rounded-lg text-center">
              <div class="text-lg font-bold text-gray-800">${period.totalScans}</div>
              <div class="text-xs text-gray-600">Total</div>
            </div>
            <div class="bg-green-100 p-2 rounded-lg text-center">
              <div class="text-lg font-bold text-green-700">${period.valid}</div>
              <div class="text-xs text-green-600">Valid</div>
            </div>
            <div class="bg-red-100 p-2 rounded-lg text-center">
              <div class="text-lg font-bold text-red-700">${period.error}</div>
              <div class="text-xs text-red-600">Error</div>
            </div>
            <div class="bg-yellow-100 p-2 rounded-lg text-center">
              <div class="text-lg font-bold text-yellow-700">${period.pending}</div>
              <div class="text-xs text-yellow-600">Pending</div>
            </div>
          </div>

          <div>
            <h5 class="text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">SCANNED ITEMS (${period.items.length})</h5>
            <div class="space-y-2">
              ${period.items.map(item => `
                <div class="border border-gray-200 rounded-lg p-3">
                  <div class="flex justify-between items-start mb-2">
                    <span class="font-medium text-gray-900">${item.assetType}</span>
                    <span class="text-xs px-2 py-1 rounded-full ${getStatusStyle(item.status)}">${item.status}</span>
                  </div>
                  <div class="grid grid-cols-2 gap-1 text-xs text-gray-600">
                    <div><span class="text-gray-400">ID:</span> ${item.scanId}</div>
                    <div><span class="text-gray-400">Loc:</span> ${item.location}</div>
                    <div><span class="text-gray-400">By:</span> ${item.verifiedBy}</div>
                    <div><span class="text-gray-400">Time:</span> ${item.scanTime}</div>
                  </div>
                  ${item.notes ? `<div class="mt-2 text-xs text-gray-500">${item.notes}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `,
      width: "500px",
      padding: "16px",
      showCloseButton: true,
      showConfirmButton: true,
      confirmButtonText: "Close",
      confirmButtonColor: "#2563eb",
      customClass: {
        popup: "rounded-xl font-dm-sans",
        closeButton: "text-gray-400 hover:text-gray-600 text-lg -mt-1 -mr-1",
        confirmButton: "font-dm-sans font-medium text-sm px-10 py-2",
      },
    });
  };

  const handleBulkExport = (type, selectedOnly = false) => {
    if (selectedOnly && selectedItems.length === 0) {
      Swal.fire("No Selection", "Please select periods to export.", "warning");
      return;
    }

    if (type === 'excel') {
      try {
        const dataToExport = selectedOnly
          ? periodReports.filter(p => selectedItems.includes(p.periodId))
          : filteredPeriods;

        const ws = XLSX.utils.json_to_sheet(
          dataToExport.flatMap(p => 
            p.items.map(item => ({
              "Period": p.displayDate,
              "Scan ID": item.scanId,
              "Asset Type": item.assetType,
              "Category": item.category,
              "Location": item.location,
              "Status": item.status,
              "Verified By": item.verifiedBy,
              "Date": item.scanDate,
              "Time": item.scanTime,
            }))
          )
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reports");
        XLSX.writeFile(wb, `reports_${new Date().toISOString().slice(0,10)}.xlsx`);
        setShowExportDropdown(false);
      } catch (error) {
        Swal.fire("Error", "Failed to export data", "error");
      }
    }
  };

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu={4}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
          .bm-root { font-family: 'DM Sans', sans-serif; }
          .bm-root .mono { font-family: 'DM Mono', monospace; }
          .card { 
            background: #ffffff; 
            border-radius: 16px; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: box-shadow 0.2s ease;
          }
          .card:hover {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          }
          .section-title { font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
          .period-badge { background: #1e3a5f; color: #fff; padding: 4px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; }
          .stat-box-grey {
            background-color: #f9fafb;
            border: 1px solid #f3f4f6;
            border-radius: 12px;
            padding: 12px;
          }
          .stat-box-grey .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
          }
          .stat-box-grey .stat-label {
            font-size: 0.75rem;
            font-weight: 500;
            color: #6b7280;
            margin-top: 4px;
          }

          /* Custom SweetAlert styles */
          .swal2-popup {
            font-family: 'DM Sans', sans-serif !important;
            border-radius: 16px !important;
          }
          .swal2-title {
            color: #111827 !important;
            font-size: 1.1rem !important;
            font-weight: 600 !important;
          }
        `}</style>

        <div className="bm-root space-y-5 p-3 md:p-6 bg-gray-50 min-h-screen">
          {/* HEADER SECTION */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                  Reports & Analytics
                </h1>
              </div>
              <p className="text-gray-500 text-sm">
                Periodic inspection reports and analytics for asset validation
              </p>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* TOTAL SCANS CARD */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <ScanLine className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-2xl md:text-3xl font-bold">{stats.total}</span>
              </div>
              <p className="mt-2 text-sm font-medium uppercase opacity-90">Total Scans</p>
              <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <span className="truncate">All scanning activities</span>
              </div>
            </div>

            {/* VALID SCANS CARD */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-2xl md:text-3xl font-bold">{stats.valid}</span>
              </div>
              <p className="mt-2 text-sm font-medium uppercase opacity-90">Valid</p>
              <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <span className="truncate">Successfully verified</span>
              </div>
            </div>

            {/* ERROR SCANS CARD */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <XCircle className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-2xl md:text-3xl font-bold">{stats.error}</span>
              </div>
              <p className="mt-2 text-sm font-medium uppercase opacity-90">Error</p>
              <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <span className="truncate">Need attention</span>
              </div>
            </div>

            {/* PENDING SCANS CARD */}
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Clock className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-2xl md:text-3xl font-bold">{stats.pending}</span>
              </div>
              <p className="mt-2 text-sm font-medium uppercase opacity-90">Pending</p>
              <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <span className="truncate">Awaiting verification</span>
              </div>
            </div>

            {/* REPORTS COUNT CARD */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileText className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-2xl md:text-3xl font-bold">{periodReports.length}</span>
              </div>
              <p className="mt-2 text-sm font-medium uppercase opacity-90">Reports</p>
              <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <span className="truncate">{stats.daily} Daily • {stats.weekly} Weekly</span>
              </div>
            </div>
          </div>

          {/* ANALYTICS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="section-title">Success Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData.successRate}%</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="section-title">Avg Validation Time</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData.avgValidationTime}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="section-title">Most Active User</p>
                  <p className="text-xl font-semibold text-gray-900 mt-2 truncate">{analyticsData.mostActiveUser}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="section-title">Top Location</p>
                  <p className="text-xl font-semibold text-gray-900 mt-2 truncate">{analyticsData.mostScannedLocation}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* REPORTS TABLE SECTION */}
          <div className="card overflow-hidden">
            {/* Card Header with Action Buttons */}
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Periodic Reports
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    View and export inspection reports by period
                  </p>
                </div>

                {/* Action Buttons Group */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Period Filter */}
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
                  >
                    <option value="all">All Periods</option>
                    <option value="daily">Daily Reports</option>
                    <option value="weekly">Weekly Reports</option>
                  </select>

                  {/* Export Dropdown */}
                  <div className="relative w-full md:w-auto">
                    <button
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm transition-all w-full md:w-auto"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Export Excel</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {showExportDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowExportDropdown(false)}
                        />
                        <div className="absolute right-0 mt-2 w-full md:w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                          <div className="p-2">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
                              Export Options
                            </div>
                            <button
                              onClick={() => handleBulkExport('excel', false)}
                              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                              <div className="text-left">
                                <div className="font-medium">Export Current View</div>
                                <div className="text-xs text-gray-500">{filteredPeriods.length} reports</div>
                              </div>
                            </button>
                            {selectedItems.length > 0 && (
                              <button
                                onClick={() => handleBulkExport('excel', true)}
                                className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                                <div className="text-left">
                                  <div className="font-medium">Export Selected</div>
                                  <div className="text-xs text-gray-500">{selectedItems.length} reports</div>
                                </div>
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={() => window.location.reload()}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-all disabled:opacity-50 w-full md:w-auto"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    {loading ? "Refreshing..." : "Refresh"}
                  </button>

                  {/* Start New Scan Button */}
                  <button
                    onClick={() => router.push("/scanning")}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-600 hover:to-blue-600 text-white px-4 py-2.5 rounded-lg text-sm transition-all w-full md:w-auto"
                  >
                    <ScanLine className="w-4 h-4" />
                    <span>New Scan</span>
                  </button>

                  {/* View Toggle */}
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden w-full md:w-auto">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`flex-1 md:flex-none p-2.5 text-center ${viewMode === "list" ? "bg-gray-100 text-gray-900" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                    >
                      <List className="w-4 h-4 inline" />
                      <span className="ml-2 text-sm md:hidden">List</span>
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`flex-1 md:flex-none p-2.5 text-center ${viewMode === "grid" ? "bg-gray-100 text-gray-900" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                    >
                      <Grid className="w-4 h-4 inline" />
                      <span className="ml-2 text-sm md:hidden">Grid</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-800" />
                  <input
                    type="text"
                    placeholder="Search by date or asset type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <div className="mx-4 md:mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800">{selectedItems.length} reports selected</span>
                  </div>
                  <button
                    onClick={() => setSelectedItems([])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-3 md:p-6">
              {/* Loading State */}
              {loading ? (
                <div className="py-8 md:py-12 text-center">
                  <div className="inline-flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">Loading reports...</span>
                  </div>
                </div>
              ) : /* Empty State */
              periodReports.length === 0 ? (
                <div className="py-8 md:py-12 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl inline-block mb-4">
                      <FileText className="w-10 h-10 md:w-12 md:h-12 text-blue-400" />
                    </div>
                    <h3 className="text-gray-900 font-semibold text-base md:text-lg mb-2">
                      No reports available
                    </h3>
                    <p className="text-gray-500 text-sm mb-6">
                      Start scanning assets to generate inspection reports
                    </p>
                    <button
                      onClick={() => router.push("/scanning")}
                      className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 inline-flex items-center gap-2 text-sm"
                    >
                      <ScanLine className="w-4 h-4" />
                      Start New Scan
                    </button>
                  </div>
                </div>
              ) : /* No Results State */
              filteredPeriods.length === 0 ? (
                <div className="py-8 md:py-12 text-center">
                  <Search className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-gray-900 font-semibold text-base mb-2">
                    No matching reports
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Try adjusting your search or filter criteria
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedPeriod("all");
                    }}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 inline-flex items-center gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Clear Filters
                  </button>
                </div>
              ) : /* Grid View */
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {filteredPeriods.map((period) => (
                    <div
                      key={period.periodId}
                      className="bg-white border border-gray-200 rounded-xl p-3 md:p-4 hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => showPeriodDetail(period)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectPeriod(period.periodId);
                            }}
                            className="mr-1"
                          >
                            {selectedItems.includes(period.periodId) ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-300" />
                            )}
                          </button>
                          <div className={`p-1.5 md:p-2 rounded-lg ${period.periodType === "daily" ? "bg-blue-100" : "bg-purple-100"}`}>
                            {period.periodType === "daily" ? (
                              <Calendar className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Activity className="w-4 h-4 text-purple-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 truncate">
                              {period.periodType === "daily" ? "Daily Report" : "Weekly Report"}
                            </h4>
                            <p className="text-xs text-gray-500 truncate">
                              {period.displayDate}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-1 mb-3">
                        <div className="bg-gray-100 p-1 rounded text-center">
                          <div className="text-xs font-bold text-gray-800">{period.totalScans}</div>
                          <div className="text-[10px] text-gray-500">Total</div>
                        </div>
                        <div className="bg-green-100 p-1 rounded text-center">
                          <div className="text-xs font-bold text-green-700">{period.valid}</div>
                          <div className="text-[10px] text-green-600">Valid</div>
                        </div>
                        <div className="bg-red-100 p-1 rounded text-center">
                          <div className="text-xs font-bold text-red-700">{period.error}</div>
                          <div className="text-[10px] text-red-600">Error</div>
                        </div>
                        <div className="bg-yellow-100 p-1 rounded text-center">
                          <div className="text-xs font-bold text-yellow-700">{period.pending}</div>
                          <div className="text-[10px] text-yellow-600">Pending</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {period.items.length} scanned items
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            showPeriodDetail(period);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3 px-3 text-left">
                          <button
                            onClick={toggleSelectAll}
                            className="flex items-center text-xs font-semibold text-gray-700 uppercase tracking-wider"
                          >
                            {selectedItems.length === filteredPeriods.length && filteredPeriods.length > 0 ? (
                              <CheckSquare className="w-4 h-4 mr-2 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 mr-2 text-gray-400" />
                            )}
                            Period
                          </button>
                        </th>
                        <th
                          className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort("date")}
                        >
                          <div className="flex items-center">
                            Date
                            <div className="ml-1">{getSortIcon("date")}</div>
                          </div>
                        </th>
                        <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                          Summary
                        </th>
                        <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                          Status Breakdown
                        </th>
                        <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                          Type
                        </th>
                        <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPeriods.map((period) => (
                        <tr
                          key={period.periodId}
                          className="hover:bg-gray-50 transition-colors cursor-pointer group"
                          onClick={() => showPeriodDetail(period)}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectPeriod(period.periodId);
                                }}
                                className="mr-3"
                              >
                                {selectedItems.includes(period.periodId) ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${period.periodType === "daily" ? "bg-blue-100" : "bg-purple-100"}`}>
                                  {period.periodType === "daily" ? (
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <Activity className="w-4 h-4 text-purple-600" />
                                  )}
                                </div>
                                <span className="font-semibold text-gray-900 text-sm">
                                  {period.displayDate}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-sm text-gray-600">
                            {period.date}
                            {period.endDate && ` - ${period.endDate}`}
                          </td>
                          <td className="py-3 px-3 hidden md:table-cell">
                            <div className="text-sm text-gray-900">{period.totalScans} scans</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {period.items.length} items
                            </div>
                          </td>
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <div className="flex gap-1">
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">{period.valid}</span>
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">{period.error}</span>
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">{period.pending}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              period.periodType === "daily" 
                                ? "bg-blue-100 text-blue-700" 
                                : "bg-purple-100 text-purple-700"
                            }`}>
                              {period.periodType === "daily" ? "Daily" : "Weekly"}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showPeriodDetail(period);
                                }}
                                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Stats */}
            {!loading && filteredPeriods.length > 0 && (
              <div className="px-4 md:px-6 py-3 md:py-4 border-t bg-gray-50">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                  <div className="text-xs md:text-sm text-gray-500 text-center sm:text-left">
                    Showing {filteredPeriods.length} of {periodReports.length} reports
                    {selectedPeriod !== "all" && ` • ${selectedPeriod === "daily" ? "Daily" : "Weekly"} only`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedPage>
  );
}