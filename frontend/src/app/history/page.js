"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Scan,
  Clipboard,
  Search,
  CheckCircle,
  AlertTriangle,
  Send,
  AlertCircle,
  Calendar,
  Cpu,
  Cable,
  Server,
  Box,
  MapPin,
  X,
  Trash2,
  Filter,
  Download,
  Eye,
  FileText,
  User,
  Clock,
  BarChart3,
  PieChart,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Database,
  Shield,
  CheckSquare,
  XCircle,
  Zap,
  Activity,
  History as HistoryIcon,
  FileSpreadsheet,
  RefreshCw,
  Grid,
  List,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from "lucide-react";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState({ id: "date", desc: true });

  const router = useRouter();

  // History data according to proposal
  const historyData = [
    {
      id: "HIS-001",
      scanId: "PC-IT-2025-001",
      assetType: "Computer",
      category: "Perangkat",
      location: "Infrastructure & Networking",
      serialNumber: "NS-PC-887632",
      barcode: null,
      status: "Valid",
      statusColor: "green",
      date: "2025-10-28",
      time: "14:30:15",
      verifiedBy: "Clinton Alfaro",
      department: "IT Infrastructure & Networking",
      scanMethod: "Camera",
      validationTime: "2 seconds",
      uniqueCode: "V-901-XYZ-A",
      notes: "Serial number valid, device condition good",
      activityType: "scan_validation",
    },
    {
      id: "HIS-002",
      scanId: "MAT-KBL-045",
      assetType: "RJ45 Cable",
      category: "Material",
      location: "Workshop 2",
      serialNumber: null,
      barcode: "BC-RJ45-554321",
      status: "Valid",
      statusColor: "green",
      date: "2025-10-28",
      time: "14:25:40",
      verifiedBy: "Wahyu Hidayat",
      department: "Facilities & Networking",
      scanMethod: "Camera",
      validationTime: "1.5 seconds",
      uniqueCode: "V-902-ABC-B",
      notes: "Barcode read clearly",
      activityType: "scan_validation",
    },
    {
      id: "HIS-003",
      scanId: "SRV-NET-012",
      assetType: "Server",
      category: "Perangkat",
      location: "Server Room L3",
      serialNumber: "NS-SRV-992345",
      barcode: null,
      status: "Error",
      statusColor: "red",
      date: "2025-10-28",
      time: "14:18:22",
      verifiedBy: "Ikhsan Kurniawan",
      department: "System Operation",
      scanMethod: "Manual Input",
      validationTime: "3 seconds",
      uniqueCode: "V-903-DEF-C",
      notes: "Serial number format does not match standard",
      activityType: "validation_error",
    },
    {
      id: "HIS-004",
      scanId: "MAT-TRK-987",
      assetType: "Trunking",
      category: "Material",
      location: "Main Office L1",
      serialNumber: null,
      barcode: "BC-TRK-773216",
      status: "Valid",
      statusColor: "green",
      date: "2025-10-28",
      time: "14:10:05",
      verifiedBy: "Mahmud Amma Rizki",
      department: "Operations & End User Service",
      scanMethod: "Camera",
      validationTime: "1.8 seconds",
      uniqueCode: "V-904-GHI-D",
      notes: "Material in new condition",
      activityType: "scan_validation",
    },
    {
      id: "HIS-005",
      scanId: "CCTV-SEC-003",
      assetType: "CCTV",
      category: "Perangkat",
      location: "Main Gate",
      serialNumber: "NS-CCTV-661234",
      barcode: null,
      status: "Valid",
      statusColor: "green",
      date: "2025-10-28",
      time: "14:05:33",
      verifiedBy: "Yovan Sakti",
      department: "Facilities & Networking",
      scanMethod: "Camera",
      validationTime: "2.2 seconds",
      uniqueCode: "V-905-JKL-E",
      notes: "Device functioning normally",
      activityType: "scan_validation",
    },
    {
      id: "HIS-006",
      scanId: "LPT-IT-2025-002",
      assetType: "Laptop",
      category: "Perangkat",
      location: "Main Office L2",
      serialNumber: "NS-LPT-445321",
      barcode: null,
      status: "Pending",
      statusColor: "yellow",
      date: "2025-10-28",
      time: "13:55:20",
      verifiedBy: "Clinton Alfaro",
      department: "IT Infrastructure & Networking",
      scanMethod: "Manual Input",
      validationTime: "2.5 seconds",
      uniqueCode: "V-906-MNO-F",
      notes: "Waiting for supervisor confirmation",
      activityType: "pending_validation",
    },
    {
      id: "HIS-007",
      scanId: "MAT-PIP-056",
      assetType: "Network Pipe",
      category: "Material",
      location: "Workshop 1",
      serialNumber: null,
      barcode: "BC-PIP-998765",
      status: "Error",
      statusColor: "red",
      date: "2025-10-28",
      time: "13:45:10",
      verifiedBy: "Wahyu Hidayat",
      department: "Facilities & Networking",
      scanMethod: "Camera",
      validationTime: "4 seconds",
      uniqueCode: "V-907-PQR-G",
      notes: "Barcode damaged, requires manual input",
      activityType: "validation_error",
    },
    {
      id: "HIS-008",
      scanId: "SWT-NET-008",
      assetType: "Network Switch",
      category: "Perangkat",
      location: "Server Room L3",
      serialNumber: "NS-SWT-778899",
      barcode: null,
      status: "Valid",
      statusColor: "green",
      date: "2025-10-27",
      time: "16:20:15",
      verifiedBy: "Ikhsan Kurniawan",
      department: "System Operation",
      scanMethod: "Camera",
      validationTime: "1.7 seconds",
      uniqueCode: "V-908-STU-H",
      notes: "Switch functioning optimally",
      activityType: "scan_validation",
    },
  ];

  // Activity log data
  const activityLog = [
    {
      id: "ACT-001",
      action: "scan_success",
      description: "Successfully scanned Computer device",
      user: "Clinton Alfaro",
      timestamp: "2025-10-28 14:30:15",
      icon: "scan",
      color: "blue",
    },
    {
      id: "ACT-002",
      action: "validation_success",
      description: "Validation successful for RJ45 Cable",
      user: "Wahyu Hidayat",
      timestamp: "2025-10-28 14:25:40",
      icon: "check",
      color: "green",
    },
    {
      id: "ACT-003",
      action: "validation_error",
      description: "Serial number format validation error for Server",
      user: "Ikhsan Kurniawan",
      timestamp: "2025-10-28 14:18:22",
      icon: "alert",
      color: "red",
    },
    {
      id: "ACT-004",
      action: "manual_input",
      description: "Manual input for Trunking data",
      user: "Mahmud Amma Rizki",
      timestamp: "2025-10-28 14:10:05",
      icon: "clipboard",
      color: "orange",
    },
    {
      id: "ACT-005",
      action: "scan_success",
      description: "CCTV scanning successful",
      user: "Yovan Sakti",
      timestamp: "2025-10-28 14:05:33",
      icon: "scan",
      color: "blue",
    },
    {
      id: "ACT-006",
      action: "pending_validation",
      description: "Laptop validation waiting for approval",
      user: "Clinton Alfaro",
      timestamp: "2025-10-28 13:55:20",
      icon: "clock",
      color: "yellow",
    },
  ];

  // Calculate statistics
  const stats = {
    total: historyData.length,
    valid: historyData.filter((item) => item.status === "Valid").length,
    error: historyData.filter((item) => item.status === "Error").length,
    pending: historyData.filter((item) => item.status === "Pending").length,
    perangkat: historyData.filter((item) => item.category === "Perangkat").length,
    material: historyData.filter((item) => item.category === "Material").length,
  };

  // Filter data
  const filteredItems = useMemo(() => {
    let filtered = historyData.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.scanId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.assetType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      const matchesDate = !selectedDate || item.date === selectedDate;

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "valid" && item.status === "Valid") ||
        (activeTab === "error" && item.status === "Error") ||
        (activeTab === "pending" && item.status === "Pending");

      return matchesSearch && matchesStatus && matchesCategory && matchesDate && matchesTab;
    });

    // Sorting
    if (sorting.id) {
      filtered.sort((a, b) => {
        let aVal = a[sorting.id];
        let bVal = b[sorting.id];
        
        if (sorting.id === "date") {
          aVal = a.date + " " + a.time;
          bVal = b.date + " " + b.time;
        }
        
        if (aVal < bVal) return sorting.desc ? 1 : -1;
        if (aVal > bVal) return sorting.desc ? -1 : 1;
        return 0;
      });
    }

    return filtered;
  }, [historyData, searchTerm, statusFilter, categoryFilter, selectedDate, activeTab, sorting]);

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

  const getStatusColor = (color) => {
    switch (color) {
      case "green":
        return "bg-green-100 text-green-700 border-green-200";
      case "red":
        return "bg-red-100 text-red-700 border-red-200";
      case "yellow":
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
        return <Server className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityIcon = (iconType) => {
    switch (iconType) {
      case "scan":
        return <Scan className="w-4 h-4" />;
      case "check":
        return <CheckCircle className="w-4 h-4" />;
      case "alert":
        return <AlertTriangle className="w-4 h-4" />;
      case "clipboard":
        return <Clipboard className="w-4 h-4" />;
      case "clock":
        return <Clock className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (color) => {
  switch (color) {
    case "blue":
      return "bg-blue-100 text-blue-600";
    case "green":
      return "bg-green-100 text-green-600";
    case "red":
      return "bg-red-100 text-red-600";
    case "orange":
      return "bg-orange-100 text-orange-600";
    case "yellow":
      return "bg-yellow-100 text-yellow-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

  const formatLastCheck = (timestamp) => {
    if (!timestamp) return "Never checked";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Function to show history details with SweetAlert
  const handleShowDetail = (item) => {
    Swal.fire({
      title: `<div class="font-dm-sans text-lg font-semibold text-gray-900">Inspection History Details</div>`,
      html: `
      <div class="font-dm-sans text-left space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        <div class="bg-white rounded-lg p-3 border border-gray-200">
          <h4 class="text-base font-semibold text-gray-900">${item.assetType}</h4>
          <p class="text-xs text-gray-500 mt-1">${item.category} • ${item.scanMethod}</p>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">ASSET INFORMATION</h5>
          <div class="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Scan ID</span>
              <span class="text-xs font-medium text-blue-700">${item.scanId}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">History ID</span>
              <span class="text-xs font-medium text-gray-700">${item.id}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">${item.serialNumber ? 'Serial Number' : 'Barcode'}</span>
              <span class="text-xs font-mono text-blue-600">${item.serialNumber || item.barcode}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Unique Code</span>
              <span class="text-xs font-mono text-gray-700">${item.uniqueCode}</span>
            </div>
          </div>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">LOCATION & DEPARTMENT</h5>
          <div class="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Location</span>
              <span class="text-xs font-medium text-gray-700">${item.location}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Department</span>
              <span class="text-xs font-medium text-gray-700">${item.department}</span>
            </div>
          </div>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">INSPECTION TIME</h5>
          <div class="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Date</span>
              <span class="text-xs font-medium text-gray-700">${item.date}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Time</span>
              <span class="text-xs font-medium text-gray-700">${item.time}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Validation Time</span>
              <span class="text-xs font-medium text-gray-700">${item.validationTime}</span>
            </div>
          </div>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">STATUS & VERIFICATION</h5>
          <div class="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Status</span>
              <span class="text-xs font-medium ${
                item.status === "Valid"
                  ? "text-green-600"
                  : item.status === "Pending"
                  ? "text-yellow-600"
                  : "text-red-600"
              }">
                ${item.status}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Scan Method</span>
              <span class="text-xs font-medium text-gray-700">${item.scanMethod}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Verified By</span>
              <span class="text-xs font-medium text-gray-700">${item.verifiedBy}</span>
            </div>
          </div>
        </div>

        ${
          item.notes
            ? `
        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">NOTES</h5>
          <div class="bg-white rounded-lg p-3 border border-gray-200">
            <p class="text-xs text-gray-700">${item.notes}</p>
          </div>
        </div>
        `
            : ""
        }
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

  const [expandedItem, setExpandedItem] = useState(null);

  const toggleItemExpansion = (id) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  // Export to Excel
  const exportToExcel = (exportType = "current") => {
    try {
      let dataToExport = [];

      if (exportType === "current") {
        dataToExport = filteredItems.map((item) => ({
          "Scan ID": item.scanId,
          "Asset Type": item.assetType,
          "Category": item.category,
          "Location": item.location,
          "Department": item.department,
          "Serial/Barcode": item.serialNumber || item.barcode,
          "Status": item.status,
          "Date": item.date,
          "Time": item.time,
          "Verified By": item.verifiedBy,
          "Scan Method": item.scanMethod,
          "Unique Code": item.uniqueCode,
        }));
      } else if (exportType === "all") {
        dataToExport = historyData.map((item) => ({
          "Scan ID": item.scanId,
          "Asset Type": item.assetType,
          "Category": item.category,
          "Location": item.location,
          "Department": item.department,
          "Serial/Barcode": item.serialNumber || item.barcode,
          "Status": item.status,
          "Date": item.date,
          "Time": item.time,
          "Verified By": item.verifiedBy,
          "Scan Method": item.scanMethod,
          "Unique Code": item.uniqueCode,
        }));
      } else if (exportType === "valid") {
        dataToExport = historyData
          .filter((item) => item.status === "Valid")
          .map((item) => ({
            "Scan ID": item.scanId,
            "Asset Type": item.assetType,
            "Category": item.category,
            "Location": item.location,
            "Department": item.department,
            "Serial/Barcode": item.serialNumber || item.barcode,
            "Status": "Valid",
            "Date": item.date,
            "Time": item.time,
            "Verified By": item.verifiedBy,
            "Scan Method": item.scanMethod,
            "Unique Code": item.uniqueCode,
          }));
      } else if (exportType === "error") {
        dataToExport = historyData
          .filter((item) => item.status === "Error")
          .map((item) => ({
            "Scan ID": item.scanId,
            "Asset Type": item.assetType,
            "Category": item.category,
            "Location": item.location,
            "Department": item.department,
            "Serial/Barcode": item.serialNumber || item.barcode,
            "Status": "Error",
            "Date": item.date,
            "Time": item.time,
            "Verified By": item.verifiedBy,
            "Scan Method": item.scanMethod,
            "Unique Code": item.uniqueCode,
          }));
      }

      if (dataToExport.length === 0) {
        Swal.fire("No Data", "No data to export", "info");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wscols = [
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 20 },
        { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 12 },
        { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      ws["!cols"] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "History");

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      let filename = `history_${exportType}_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
      setShowExportDropdown(false);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      Swal.fire("Error", "Failed to export data", "error");
    }
  };

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu={3}>
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
                  <HistoryIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                  History & Activity Log
                </h1>
              </div>
              <p className="text-gray-500 text-sm">
                Complete history of scanning, validation, and IT asset system activities
              </p>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* TOTAL SCANS CARD */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Database className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-2xl md:text-3xl font-bold">{stats.total}</span>
              </div>
              <p className="mt-2 text-sm font-medium uppercase opacity-90">Total Scans</p>
              <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <span className="truncate">All history records</span>
              </div>
            </div>

            {/* VALID CARD */}
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

            {/* ERROR CARD */}
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
                <span className="truncate">Validation errors</span>
              </div>
            </div>

            {/* PENDING CARD */}
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

            {/* DEVICES CARD */}
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Cpu className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-2xl md:text-3xl font-bold">{stats.perangkat}</span>
              </div>
              <p className="mt-2 text-sm font-medium uppercase opacity-90">Devices</p>
              <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <span className="truncate">Computers, Servers, CCTV</span>
              </div>
            </div>

            {/* MATERIALS CARD */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Cable className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-2xl md:text-3xl font-bold">{stats.material}</span>
              </div>
              <p className="mt-2 text-sm font-medium uppercase opacity-90">Materials</p>
              <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <span className="truncate">Cables, Trunking, Pipes</span>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* LEFT COLUMN - History Table */}
            <div className="xl:col-span-2">
              <div className="card overflow-hidden">
                {/* Card Header with Action Buttons */}
                <div className="p-4 md:p-6 border-b border-gray-200">
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <HistoryIcon className="w-5 h-5 text-blue-600" />
                        Inspection History
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Complete history of all asset inspections and validations
                      </p>
                    </div>

                    {/* Action Buttons Group */}
                    <div className="flex flex-wrap items-center gap-2">
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
                                  onClick={() => exportToExcel("current")}
                                  className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                  <div className="text-left">
                                    <div className="font-medium">Export Current View</div>
                                    <div className="text-xs text-gray-500">{filteredItems.length} items</div>
                                  </div>
                                </button>
                                <button
                                  onClick={() => exportToExcel("all")}
                                  className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                                  <div className="text-left">
                                    <div className="font-medium">Export All History</div>
                                    <div className="text-xs text-gray-500">{historyData.length} total items</div>
                                  </div>
                                </button>
                                <button
                                  onClick={() => exportToExcel("valid")}
                                  className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                  <div className="text-left">
                                    <div className="font-medium">Export Valid Only</div>
                                    <div className="text-xs text-gray-500">{stats.valid} valid items</div>
                                  </div>
                                </button>
                                <button
                                  onClick={() => exportToExcel("error")}
                                  className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-red-600" />
                                  <div className="text-left">
                                    <div className="font-medium">Export Error Only</div>
                                    <div className="text-xs text-gray-500">{stats.error} error items</div>
                                  </div>
                                </button>
                              </div>
                              <div className="px-3 py-2 text-xs text-gray-500 border-t">
                                Files are downloaded in Excel (.xlsx) format
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
                        placeholder="Search by ID, asset type, location, or serial number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="all">All Categories</option>
                        <option value="Perangkat">Devices</option>
                        <option value="Material">Materials</option>
                      </select>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="all">All Status</option>
                        <option value="Valid">Valid</option>
                        <option value="Error">Error</option>
                        <option value="Pending">Pending</option>
                      </select>

                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="px-4 md:px-6 pt-4">
                  <div className="flex space-x-1 overflow-x-auto border-b border-gray-200">
                    {[
                      { id: "all", label: "All", count: stats.total, color: "blue" },
                      { id: "valid", label: "Valid", count: stats.valid, color: "green" },
                      { id: "error", label: "Error", count: stats.error, color: "red" },
                      { id: "pending", label: "Pending", count: stats.pending, color: "yellow" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-shrink-0 py-2 px-3 md:px-4 rounded-t-lg text-xs md:text-sm font-medium transition-all ${
                          activeTab === tab.id
                            ? `bg-${tab.color}-50 text-${tab.color}-700 border-b-2 border-${tab.color}-600`
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center space-x-1 md:space-x-2">
                          <span>{tab.label}</span>
                          <span
                            className={`px-1.5 md:px-2 py-0.5 rounded-full text-xs ${
                              activeTab === tab.id
                                ? `bg-${tab.color}-100 text-${tab.color}-700`
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {tab.count}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 md:p-6">
                  {/* Loading State */}
                  {loading ? (
                    <div className="py-8 md:py-12 text-center">
                      <div className="inline-flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-gray-600">Loading history data...</span>
                      </div>
                    </div>
                  ) : /* Empty State */
                  historyData.length === 0 ? (
                    <div className="py-8 md:py-12 text-center">
                      <div className="max-w-md mx-auto">
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl inline-block mb-4">
                          <HistoryIcon className="w-10 h-10 md:w-12 md:h-12 text-blue-400" />
                        </div>
                        <h3 className="text-gray-900 font-semibold text-base md:text-lg mb-2">
                          No history data available
                        </h3>
                        <p className="text-gray-500 text-sm mb-6">
                          Start scanning assets to build your history
                        </p>
                        <button
                          onClick={() => router.push("/scanning")}
                          className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 inline-flex items-center gap-2 text-sm"
                        >
                          <Scan className="w-4 h-4" />
                          Start New Scan
                        </button>
                      </div>
                    </div>
                  ) : /* No Results State */
                  filteredItems.length === 0 ? (
                    <div className="py-8 md:py-12 text-center">
                      <Search className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-gray-900 font-semibold text-base mb-2">
                        No matching records
                      </h3>
                      <p className="text-gray-500 text-sm mb-6">
                        Try adjusting your search or filter criteria
                      </p>
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setCategoryFilter("all");
                          setStatusFilter("all");
                          setSelectedDate("");
                          setActiveTab("all");
                        }}
                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 inline-flex items-center gap-2 text-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Clear Filters
                      </button>
                    </div>
                  ) : /* Grid View */
                  viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      {filteredItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-gray-200 rounded-xl p-3 md:p-4 hover:shadow-lg transition-all cursor-pointer group"
                          onClick={() => handleShowDetail(item)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 md:p-2 rounded-lg ${item.category === "Perangkat" ? "bg-blue-100" : "bg-green-100"}`}>
                                {getCategoryIcon(item.category)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 truncate">
                                  {item.assetType}
                                </h4>
                                <p className="text-xs text-gray-500 font-mono truncate">
                                  {item.scanId}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Status</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.statusColor)}`}>
                                {item.status === "Valid" ? (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                ) : item.status === "Error" ? (
                                  <XCircle className="w-3 h-3 mr-1" />
                                ) : (
                                  <Clock className="w-3 h-3 mr-1" />
                                )}
                                {item.status}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Location</span>
                              <span className="text-xs text-gray-700 truncate ml-2">
                                {item.location}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Date</span>
                              <span className="text-xs text-gray-700">
                                {item.date}
                              </span>
                            </div>

                            <div className="pt-2 border-t mt-2">
                              <div className="flex justify-between">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowDetail(item);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  View Details
                                </button>
                                <span className="text-xs text-gray-400">
                                  {item.time}
                                </span>
                              </div>
                            </div>
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
                            <th
                              className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
                              onClick={() => handleSort("scanId")}
                            >
                              <div className="flex items-center">
                                Scan ID
                                <div className="ml-1">{getSortIcon("scanId")}</div>
                              </div>
                            </th>
                            <th
                              className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
                              onClick={() => handleSort("assetType")}
                            >
                              <div className="flex items-center">
                                Asset Type
                                <div className="ml-1">{getSortIcon("assetType")}</div>
                              </div>
                            </th>
                            <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                              Category
                            </th>
                            <th
                              className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
                              onClick={() => handleSort("location")}
                            >
                              <div className="flex items-center">
                                Location
                                <div className="ml-1">{getSortIcon("location")}</div>
                              </div>
                            </th>
                            <th
                              className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
                              onClick={() => handleSort("status")}
                            >
                              <div className="flex items-center">
                                Status
                                <div className="ml-1">{getSortIcon("status")}</div>
                              </div>
                            </th>
                            <th
                              className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hidden xl:table-cell"
                              onClick={() => handleSort("date")}
                            >
                              <div className="flex items-center">
                                Date & Time
                                <div className="ml-1">{getSortIcon("date")}</div>
                              </div>
                            </th>
                            <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredItems.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-gray-50 transition-colors cursor-pointer group"
                              onClick={() => handleShowDetail(item)}
                            >
                              <td className="py-3 px-3">
                                <div className="font-semibold text-blue-700 text-sm">{item.scanId}</div>
                                <div className="text-xs text-gray-500 mt-0.5 flex items-center">
                                  {getCategoryIcon(item.category)}
                                  <span className="ml-1">{item.category}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-gray-900 text-sm">{item.assetType}</div>
                                <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]">
                                  {item.serialNumber || item.barcode}
                                </div>
                              </td>
                              <td className="py-3 px-3 hidden md:table-cell">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${item.category === "Perangkat" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                                  {item.category}
                                </span>
                              </td>
                              <td className="py-3 px-3 hidden lg:table-cell">
                                <div className="text-sm text-gray-700">{item.location}</div>
                                <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]">
                                  {item.department}
                                </div>
                              </td>
                              <td className="py-3 px-3 hidden lg:table-cell">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.statusColor)}`}>
                                  {item.status === "Valid" ? (
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                  ) : item.status === "Error" ? (
                                    <XCircle className="w-3 h-3 mr-1" />
                                  ) : (
                                    <Clock className="w-3 h-3 mr-1" />
                                  )}
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 hidden xl:table-cell">
                                <div className="text-sm text-gray-900">{item.date}</div>
                                <div className="text-xs text-gray-500">{item.time}</div>
                              </td>
                              <td className="py-3 px-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowDetail(item);
                                  }}
                                  className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Footer Stats */}
                {!loading && filteredItems.length > 0 && (
                  <div className="px-4 md:px-6 py-3 md:py-4 border-t bg-gray-50">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                      <div className="text-xs md:text-sm text-gray-500 text-center sm:text-left">
                        Showing {filteredItems.length} of {historyData.length} records
                        {categoryFilter !== "all" && ` • ${categoryFilter === "Perangkat" ? "Devices" : "Materials"} only`}
                        {statusFilter !== "all" && ` • ${statusFilter} status`}
                        {selectedDate && ` • ${selectedDate}`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN - Activity Log & Analytics */}
            <div className="space-y-5">
              {/* Activity Log */}
              <div className="card p-5">
                <p className="section-title flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Latest Activity Log
                </p>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {activityLog.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
                    >
                      <div className={`p-2 rounded-lg ${getActivityColor(activity.color)} bg-opacity-20`}>
                        {getActivityIcon(activity.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600">
                          {activity.description}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500 flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {activity.user}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatLastCheck(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-4 text-center text-sm font-medium text-blue-600 hover:text-blue-700 transition">
                  View All Activities →
                </button>
              </div>

              {/* Quick Analytics */}
              <div className="card p-5">
                <p className="section-title flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Quick Analytics
                </p>

                <div className="space-y-3">
                  <div className="stat-box-grey">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="stat-label">Success Rate</div>
                        <div className="text-xs text-gray-500">Validation success ratio</div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round((stats.valid / stats.total) * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="stat-box-grey">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="stat-label">Avg. Validation Time</div>
                        <div className="text-xs text-gray-500">Average validation time</div>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">2.1s</div>
                    </div>
                  </div>

                  <div className="stat-box-grey">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="stat-label">Most Active User</div>
                        <div className="text-xs text-gray-500">User with most activities</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 text-right">
                        Clinton Alfaro
                      </div>
                    </div>
                  </div>

                  <div className="stat-box-grey">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="stat-label">Most Scanned Location</div>
                        <div className="text-xs text-gray-500">Location with most scans</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 text-right">
                        Infrastructure
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mini Chart Placeholder */}
                <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Today's Activity</span>
                    <span className="text-xs text-blue-600">+12%</span>
                  </div>
                  <div className="flex gap-1 h-16 items-end">
                    {[65, 45, 80, 55, 70, 85, 60].map((height, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600"
                          style={{ height: `${height}%` }}
                        ></div>
                        <span className="text-[8px] text-gray-500">{['M','T','W','T','F','S','S'][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedPage>
  );
}