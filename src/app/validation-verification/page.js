"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  Send,
  AlertTriangle,
  CheckSquare,
  Square,
  FileText,
  User,
  Calendar,
  MapPin,
  Shield,
  Cpu,
  Cable,
  Camera,
  Eye,
  Zap,
  BarChart3,
  Database,
  Brain,
  QrCode,
  ScanLine,
  ChevronDown,
  ChevronUp,
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

export default function ValidationVerificationPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanData, setScanData] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState({ id: "id", desc: false });

  const router = useRouter();

  // Get data from localStorage when component mounts
  useEffect(() => {
    const savedScanData = localStorage.getItem("lastSubmittedScan");
    if (savedScanData) {
      setScanData(JSON.parse(savedScanData));
    }
  }, []);

  // Data according to proposal - IT Devices and Materials
  const validationItems = [
    {
      id: 1,
      serialNumber: scanData?.serial || "PC-IT-2025-001",
      assetType: "Computer",
      category: "Perangkat",
      location: scanData?.location || "Infrastructure & Networking",
      department: "IT Infrastructure & Networking",
      lastVerified: "2025-09-20",
      status: "pending",
      uniqueCode: scanData?.uniqueCode || "V-901-XYZ-A",
      scanDate: scanData?.date || "2025-10-28",
      scanTime: scanData?.time || "14:30:15",
      verifiedBy: "Clinton Alfaro",
      photoEvidence: "/api/placeholder/80/60",
      idType: "Serial Number",
      idValue: scanData?.serial || "NS-PC-887632",
    },
    {
      id: 2,
      serialNumber: "MAT-KBL-045",
      assetType: "RJ45 Cable",
      category: "Material",
      location: "Workshop 2",
      department: "Facilities & Networking",
      lastVerified: "2025-09-18",
      status: "valid",
      uniqueCode: "V-902-ABC-B",
      scanDate: "2025-10-28",
      scanTime: "14:25:40",
      verifiedBy: "Wahyu Hidayat",
      photoEvidence: "/api/placeholder/80/60",
      idType: "Barcode",
      idValue: "BC-RJ45-554321",
    },
    {
      id: 3,
      serialNumber: "SRV-NET-012",
      assetType: "Server",
      category: "Perangkat",
      location: "Server Room L3",
      department: "System Operation",
      lastVerified: "2025-09-15",
      status: "error",
      uniqueCode: "V-903-DEF-C",
      scanDate: "2025-10-28",
      scanTime: "14:18:22",
      verifiedBy: "Ikhsan Kurniawan",
      photoEvidence: "/api/placeholder/80/60",
      idType: "Serial Number",
      idValue: "NS-SRV-992345",
    },
    {
      id: 4,
      serialNumber: "MAT-TRK-987",
      assetType: "Trunking",
      category: "Material",
      location: "Main Office L1",
      department: "Operations & End User Service",
      lastVerified: "2025-09-22",
      status: "pending",
      uniqueCode: "V-904-GHI-D",
      scanDate: "2025-10-28",
      scanTime: "14:10:05",
      verifiedBy: "Mahmud Amma Rizki",
      photoEvidence: "/api/placeholder/80/60",
      idType: "Barcode",
      idValue: "BC-TRK-773216",
    },
    {
      id: 5,
      serialNumber: "CCTV-SEC-003",
      assetType: "CCTV",
      category: "Perangkat",
      location: "Main Gate",
      department: "Facilities & Networking",
      lastVerified: "2025-09-19",
      status: "valid",
      uniqueCode: "V-905-JKL-E",
      scanDate: "2025-10-28",
      scanTime: "14:05:33",
      verifiedBy: "Yovan Sakti",
      photoEvidence: "/api/placeholder/80/60",
      idType: "Serial Number",
      idValue: "NS-CCTV-661234",
    },
    {
      id: 6,
      serialNumber: "LPT-IT-2025-002",
      assetType: "Laptop",
      category: "Perangkat",
      location: "Main Office L2",
      department: "IT Infrastructure & Networking",
      lastVerified: "2025-09-25",
      status: "pending",
      uniqueCode: "V-906-MNO-F",
      scanDate: "2025-10-28",
      scanTime: "13:55:20",
      verifiedBy: "Clinton Alfaro",
      photoEvidence: "/api/placeholder/80/60",
      idType: "Serial Number",
      idValue: "NS-LPT-445321",
    },
    {
      id: 7,
      serialNumber: "MAT-PIP-056",
      assetType: "Network Pipe",
      category: "Material",
      location: "Workshop 1",
      department: "Facilities & Networking",
      lastVerified: "2025-09-28",
      status: "error",
      uniqueCode: "V-907-PQR-G",
      scanDate: "2025-10-28",
      scanTime: "13:45:10",
      verifiedBy: "Wahyu Hidayat",
      photoEvidence: "/api/placeholder/80/60",
      idType: "Barcode",
      idValue: "BC-PIP-998765",
    },
  ];

  // Calculate statistics
  const stats = {
    total: validationItems.length,
    valid: validationItems.filter((item) => item.status === "valid").length,
    pending: validationItems.filter((item) => item.status === "pending").length,
    error: validationItems.filter((item) => item.status === "error").length,
    perangkat: validationItems.filter((item) => item.category === "Perangkat").length,
    material: validationItems.filter((item) => item.category === "Material").length,
  };

  // Filter data
  const filteredItems = useMemo(() => {
    let filtered = validationItems.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.assetType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.idValue.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    // Sorting
    if (sorting.id) {
      filtered.sort((a, b) => {
        let aVal = a[sorting.id];
        let bVal = b[sorting.id];
        
        if (aVal < bVal) return sorting.desc ? 1 : -1;
        if (aVal > bVal) return sorting.desc ? -1 : 1;
        return 0;
      });
    }

    return filtered;
  }, [validationItems, searchTerm, statusFilter, categoryFilter, sorting]);

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

  // Toggle select item
  const toggleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Select all items
  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map((item) => item.id));
    }
  };

  // Handle bulk action
  const handleBulkAction = (action) => {
    if (selectedItems.length === 0) return;

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      Swal.fire({
        title: "Success!",
        text: `${action} successfully performed on ${selectedItems.length} items`,
        icon: "success",
        confirmButtonColor: "#2563eb",
      });
      setSelectedItems([]);
      setIsSubmitting(false);
    }, 2000);
  };

  // Handle individual verification
  const handleVerifyItem = (itemId, status) => {
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      Swal.fire({
        title: "Success!",
        text: `Item successfully verified as ${status}`,
        icon: "success",
        confirmButtonColor: "#2563eb",
      });
      setIsSubmitting(false);
    }, 1500);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "valid":
        return "bg-green-100 text-green-700 border-green-200";
      case "error":
        return "bg-red-100 text-red-700 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="w-4 h-4" />;
      case "error":
        return <XCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Perangkat":
        return <Cpu className="w-4 h-4 text-blue-600" />;
      case "Material":
        return <Cable className="w-4 h-4 text-green-600" />;
      default:
        return <Shield className="w-4 h-4 text-gray-600" />;
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

  // Function to show details with SweetAlert
  const handleShowDetail = (item) => {
    Swal.fire({
      title: `<div class="font-dm-sans text-lg font-semibold text-gray-900">Scanning Result Details</div>`,
      html: `
      <div class="font-dm-sans text-left space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        <div>
          <h4 class="text-base font-semibold text-gray-900">${item.assetType}</h4>
          <p class="text-xs text-gray-500 mt-1">${item.category} • ${item.idType}</p>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">ASSET INFORMATION</h5>
          <div class="bg-gray-50 rounded-lg p-3 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Asset ID</span>
              <span class="text-xs font-medium text-blue-700">${item.serialNumber}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">${item.idType}</span>
              <span class="text-xs font-mono text-blue-600">${item.idValue}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Unique Code</span>
              <span class="text-xs font-mono text-gray-700">${item.uniqueCode}</span>
            </div>
          </div>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">LOCATION & DEPARTMENT</h5>
          <div class="bg-gray-50 rounded-lg p-3 space-y-2">
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
          <div class="bg-gray-50 rounded-lg p-3 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Date</span>
              <span class="text-xs font-medium text-gray-700">${item.scanDate}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Time</span>
              <span class="text-xs font-medium text-gray-700">${item.scanTime}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Inspected By</span>
              <span class="text-xs font-medium text-gray-700">${item.verifiedBy}</span>
            </div>
          </div>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">VALIDATION STATUS</h5>
          <div class="bg-gray-50 rounded-lg p-3">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Status</span>
              <span class="text-xs font-medium ${
                item.status === "valid"
                  ? "text-green-600"
                  : item.status === "pending"
                  ? "text-yellow-600"
                  : "text-red-600"
              }">
                ${
                  item.status === "valid"
                    ? "Validated"
                    : item.status === "pending"
                    ? "Pending Validation"
                    : "Validation Error"
                }
              </span>
            </div>
            <div class="flex justify-between items-center mt-2">
              <span class="text-xs text-gray-600">Last Verified</span>
              <span class="text-xs font-medium text-gray-700">${item.lastVerified}</span>
            </div>
          </div>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">PHOTO EVIDENCE</h5>
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="w-20 h-16 bg-gray-200 rounded mx-auto flex items-center justify-center">
              <Camera class="w-6 h-6 text-gray-400" />
            </div>
            <p class="text-xs text-gray-600 mt-2">Scanning result photo evidence</p>
            <button class="text-xs text-blue-600 mt-1 hover:text-blue-700">
              View Full Photo
            </button>
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

  // Export to Excel
  const exportToExcel = (exportType = "current") => {
    try {
      let dataToExport = [];

      if (exportType === "current") {
        dataToExport = filteredItems.map((item) => ({
          "Asset ID": item.serialNumber,
          "Asset Type": item.assetType,
          "Category": item.category,
          "ID Type": item.idType,
          "ID Value": item.idValue,
          "Location": item.location,
          "Department": item.department,
          "Status": item.status === "valid" ? "Valid" : item.status === "pending" ? "Pending" : "Error",
          "Scan Date": item.scanDate,
          "Scan Time": item.scanTime,
          "Verified By": item.verifiedBy,
          "Unique Code": item.uniqueCode,
        }));
      } else if (exportType === "all") {
        dataToExport = validationItems.map((item) => ({
          "Asset ID": item.serialNumber,
          "Asset Type": item.assetType,
          "Category": item.category,
          "ID Type": item.idType,
          "ID Value": item.idValue,
          "Location": item.location,
          "Department": item.department,
          "Status": item.status === "valid" ? "Valid" : item.status === "pending" ? "Pending" : "Error",
          "Scan Date": item.scanDate,
          "Scan Time": item.scanTime,
          "Verified By": item.verifiedBy,
          "Unique Code": item.uniqueCode,
        }));
      } else if (exportType === "pending") {
        dataToExport = validationItems
          .filter((item) => item.status === "pending")
          .map((item) => ({
            "Asset ID": item.serialNumber,
            "Asset Type": item.assetType,
            "Category": item.category,
            "ID Type": item.idType,
            "ID Value": item.idValue,
            "Location": item.location,
            "Department": item.department,
            "Status": "Pending",
            "Scan Date": item.scanDate,
            "Scan Time": item.scanTime,
            "Verified By": item.verifiedBy,
            "Unique Code": item.uniqueCode,
          }));
      } else if (exportType === "valid") {
        dataToExport = validationItems
          .filter((item) => item.status === "valid")
          .map((item) => ({
            "Asset ID": item.serialNumber,
            "Asset Type": item.assetType,
            "Category": item.category,
            "ID Type": item.idType,
            "ID Value": item.idValue,
            "Location": item.location,
            "Department": item.department,
            "Status": "Valid",
            "Scan Date": item.scanDate,
            "Scan Time": item.scanTime,
            "Verified By": item.verifiedBy,
            "Unique Code": item.uniqueCode,
          }));
      } else if (exportType === "error") {
        dataToExport = validationItems
          .filter((item) => item.status === "error")
          .map((item) => ({
            "Asset ID": item.serialNumber,
            "Asset Type": item.assetType,
            "Category": item.category,
            "ID Type": item.idType,
            "ID Value": item.idValue,
            "Location": item.location,
            "Department": item.department,
            "Status": "Error",
            "Scan Date": item.scanDate,
            "Scan Time": item.scanTime,
            "Verified By": item.verifiedBy,
            "Unique Code": item.uniqueCode,
          }));
      }

      if (dataToExport.length === 0) {
        Swal.fire("No Data", "No data to export", "info");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wscols = [
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
        { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 10 },
        { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
      ];
      ws["!cols"] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Validation");

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      let filename = `validation_${exportType}_${timestamp}.xlsx`;

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
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                  IT Asset Validation & Verification
                </h1>
              </div>
              <p className="text-gray-500 text-sm">
                Automated validation system using AI technology for serial numbers and barcodes
              </p>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* TOTAL ASSETS CARD */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <QrCode className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-2xl md:text-3xl font-bold">{stats.total}</span>
              </div>
              <p className="mt-2 text-sm font-medium uppercase opacity-90">Total Scans</p>
              <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <span className="truncate">All validation items</span>
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

            {/* VALID CARD */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-2xl md:text-3xl font-bold">{stats.valid}</span>
              </div>
              <p className="mt-2 text-sm font-medium uppercase opacity-90">Validated</p>
              <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <span className="truncate">Successfully verified</span>
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
                <span className="truncate">Need attention</span>
              </div>
            </div>
          </div>

          {/* VALIDATION TABLE SECTION */}
          <div className="card overflow-hidden">
            {/* Card Header with Action Buttons */}
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ScanLine className="w-5 h-5 text-blue-600" />
                    Asset Validation Results
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Review and validate scanned assets from serial numbers and barcodes
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
                                <div className="font-medium">Export All Items</div>
                                <div className="text-xs text-gray-500">{validationItems.length} total items</div>
                              </div>
                            </button>
                            <button
                              onClick={() => exportToExcel("pending")}
                              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-yellow-600" />
                              <div className="text-left">
                                <div className="font-medium">Export Pending Only</div>
                                <div className="text-xs text-gray-500">{stats.pending} pending items</div>
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

                  {/* Start New Scan Button */}
                  <button
                    onClick={() => router.push("/scanning")}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-600 hover:to-blue-600 text-white px-4 py-2.5 rounded-lg text-sm transition-all w-full md:w-auto"
                  >
                    <ScanLine className="w-4 h-4" />
                    <span>Start New Scan</span>
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
                    placeholder="Search by serial number, barcode, asset type, or location..."
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
                    <option value="pending">Pending</option>
                    <option value="valid">Valid</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <div className="mx-4 md:mx-6 mt-4 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3">
                  <div className="text-blue-800 text-sm font-medium flex items-center">
                    <CheckSquare className="w-4 h-4 mr-2" />
                    {selectedItems.length} items selected for bulk verification
                  </div>
                  <div className="flex gap-1 md:gap-2 flex-wrap">
                    <button
                      onClick={() => handleBulkAction("approve")}
                      disabled={isSubmitting}
                      className="flex items-center px-3 py-1.5 md:px-4 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-xs"
                    >
                      <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      Approve All
                    </button>
                    <button
                      onClick={() => handleBulkAction("reject")}
                      disabled={isSubmitting}
                      className="flex items-center px-3 py-1.5 md:px-4 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-xs"
                    >
                      <XCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      Reject All
                    </button>
                    <button
                      onClick={() => setSelectedItems([])}
                      className="flex items-center px-3 py-1.5 md:px-4 md:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-xs"
                    >
                      Clear
                    </button>
                  </div>
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
                    <span className="text-gray-600">Loading validation data...</span>
                  </div>
                </div>
              ) : /* Empty State */
              validationItems.length === 0 ? (
                <div className="py-8 md:py-12 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl inline-block mb-4">
                      <ScanLine className="w-10 h-10 md:w-12 md:h-12 text-blue-400" />
                    </div>
                    <h3 className="text-gray-900 font-semibold text-base md:text-lg mb-2">
                      No validation data available
                    </h3>
                    <p className="text-gray-500 text-sm mb-6">
                      Start by scanning a new asset to begin validation
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
              filteredItems.length === 0 ? (
                <div className="py-8 md:py-12 text-center">
                  <Search className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-gray-900 font-semibold text-base mb-2">
                    No matching items
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Try adjusting your search or filter criteria
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCategoryFilter("all");
                      setStatusFilter("all");
                    }}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 inline-flex items-center gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Clear Filters
                  </button>
                </div>
              ) : /* Grid View */
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-gray-200 rounded-xl p-3 md:p-4 hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => handleShowDetail(item)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectItem(item.id);
                            }}
                            className="mr-1"
                          >
                            {selectedItems.includes(item.id) ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                          <div className={`p-1.5 md:p-2 rounded-lg ${item.category === "Perangkat" ? "bg-blue-100" : "bg-green-100"}`}>
                            {getCategoryIcon(item.category)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 truncate">
                              {item.assetType}
                            </h4>
                            <p className="text-xs text-gray-500 font-mono truncate">
                              {item.serialNumber}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">ID Type</span>
                          <span className="text-xs font-medium text-gray-700">
                            {item.idType}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Status</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1 capitalize">
                              {item.status === "valid" ? "Valid" : item.status === "pending" ? "Pending" : "Error"}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Location</span>
                          <span className="text-xs text-gray-700 truncate ml-2">
                            {item.location}
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
                            {item.status === "pending" && (
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVerifyItem(item.id, "valid");
                                  }}
                                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVerifyItem(item.id, "error");
                                  }}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
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
                        <th className="py-3 px-3 text-left">
                          <button
                            onClick={toggleSelectAll}
                            className="flex items-center text-xs font-semibold text-gray-700 uppercase tracking-wider"
                          >
                            {selectedItems.length === filteredItems.length && filteredItems.length > 0 ? (
                              <CheckSquare className="w-4 h-4 mr-2 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 mr-2 text-gray-400" />
                            )}
                            Asset ID
                          </button>
                        </th>
                        <th
                          className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort("assetType")}
                        >
                          <div className="flex items-center">
                            Type & Category
                            <div className="ml-1">{getSortIcon("assetType")}</div>
                          </div>
                        </th>
                        <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                          ID Details
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
                        <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden xl:table-cell">
                          Scan Details
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
                            <div className="flex items-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectItem(item.id);
                                }}
                                className="mr-2"
                              >
                                {selectedItems.includes(item.id) ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                              <div>
                                <div className="font-semibold text-blue-700 text-sm">{item.serialNumber}</div>
                                <div className="text-xs text-gray-500 mt-0.5 flex items-center">
                                  {getCategoryIcon(item.category)}
                                  <span className="ml-1">{item.category}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-gray-900 text-sm">{item.assetType}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${item.category === "Perangkat" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                                {item.category}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 hidden md:table-cell">
                            <div className="space-y-1">
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">{item.idType}:</span>{" "}
                                <span className="font-mono">{item.idValue}</span>
                              </div>
                              <div className="text-xs text-gray-400 font-mono">
                                {item.uniqueCode}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <div className="text-sm text-gray-700">{item.location}</div>
                            <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]">
                              {item.department}
                            </div>
                          </td>
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {getStatusIcon(item.status)}
                              <span className="ml-1 capitalize">
                                {item.status === "valid" ? "Valid" : item.status === "pending" ? "Pending" : "Error"}
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-3 hidden xl:table-cell">
                            <div className="text-xs text-gray-600">
                              <div>{item.scanDate}</div>
                              <div className="text-gray-400 mt-0.5">{item.scanTime}</div>
                              <div className="text-gray-400 mt-0.5">{item.verifiedBy}</div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
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
                              {item.status === "pending" && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVerifyItem(item.id, "valid");
                                    }}
                                    className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Approve"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVerifyItem(item.id, "error");
                                    }}
                                    className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Reject"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
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
            {!loading && filteredItems.length > 0 && (
              <div className="px-4 md:px-6 py-3 md:py-4 border-t bg-gray-50">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                  <div className="text-xs md:text-sm text-gray-500 text-center sm:text-left">
                    Showing {filteredItems.length} of {validationItems.length} items
                    {categoryFilter !== "all" && ` • ${categoryFilter === "Perangkat" ? "Devices" : "Materials"} only`}
                    {statusFilter !== "all" && ` • ${statusFilter} status`}
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