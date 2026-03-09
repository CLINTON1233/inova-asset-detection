"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  Cpu,
  Cable,
  Server,
  Monitor,
  Camera,
  Box,
  CheckCircle,
  Trash,
  MapPin,
  ScanLine,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  X,
  FileSpreadsheet,
  RefreshCw,
  Grid,
  List,
  Wifi,
  WifiOff,
  AlertCircle,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  MoreVertical,
} from "lucide-react";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

export default function InventoryDataPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState({ id: "id", desc: false });

  const router = useRouter();

  // Data inventory sesuai dengan proposal
  const inventoryData = [
    {
      id: "PC-IT-2025-001",
      nama: "Komputer Workstation",
      jenisAset: "Komputer",
      kategori: "Perangkat",
      serialNumber: "NS-PC-887632",
      lokasi: "Infrastruktur & Jaringan",
      departemen: "IT Infrastructure & Networking",
      tanggalPengecekan: "2025-10-28",
      terakhirDiperbarui: "2025-10-28 14:30:15",
      diperbaruiOleh: "Clinton Alfaro",
      spesifikasi: "Intel i7, 16GB RAM, 512GB SSD",
      kodeUnik: "V-901-XYZ-A",
      status: "Valid",
    },
    {
      id: "MAT-KBL-045",
      nama: "Kabel RJ45 CAT6",
      jenisAset: "Kabel RJ45",
      kategori: "Material",
      barcode: "BC-RJ45-554321",
      lokasi: "Workshop 2",
      departemen: "Facilities & Networking",
      tanggalPengecekan: "2025-10-28",
      terakhirDiperbarui: "2025-10-28 14:25:40",
      diperbaruiOleh: "Wahyu Hidayat",
      spesifikasi: "CAT6, 5 meter, UTP",
      kodeUnik: "V-902-ABC-B",
      status: "Valid",
    },
    {
      id: "SRV-NET-012",
      nama: "Server Rack",
      jenisAset: "Server",
      kategori: "Perangkat",
      serialNumber: "NS-SRV-992345",
      lokasi: "Ruang Server L3",
      departemen: "System Operation",
      tanggalPengecekan: "2025-10-28",
      terakhirDiperbarui: "2025-10-28 14:18:22",
      diperbaruiOleh: "Ikhsan Kurniawan",
      spesifikasi: "Dell PowerEdge, 32GB RAM, 1TB SSD",
      kodeUnik: "V-903-DEF-C",
      status: "Valid",
    },
    {
      id: "MAT-TRK-987",
      nama: "Trunking PVC",
      jenisAset: "Trunking",
      kategori: "Material",
      barcode: "BC-TRK-773216",
      lokasi: "Kantor Utama L1",
      departemen: "Operations & End User Service",
      tanggalPengecekan: "2025-10-28",
      terakhirDiperbarui: "2025-10-28 14:10:05",
      diperbaruiOleh: "Mahmud Amma Rizki",
      spesifikasi: "PVC 50x50mm, 2 meter",
      kodeUnik: "V-904-GHI-D",
      status: "Tertunda",
    },
    {
      id: "CCTV-SEC-003",
      nama: "Camera CCTV HD",
      jenisAset: "CCTV",
      kategori: "Perangkat",
      serialNumber: "NS-CCTV-661234",
      lokasi: "Pintu Gerbang",
      departemen: "Facilities & Networking",
      tanggalPengecekan: "2025-10-28",
      terakhirDiperbarui: "2025-10-28 14:05:33",
      diperbaruiOleh: "Yovan Sakti",
      spesifikasi: "1080p, Night Vision, IP Camera",
      kodeUnik: "V-905-JKL-E",
      status: "Error",
    },
  ];

  // Hitung statistik
  const stats = {
    total: inventoryData.length,
    perangkat: inventoryData.filter((item) => item.kategori === "Perangkat").length,
    material: inventoryData.filter((item) => item.kategori === "Material").length,
    valid: inventoryData.filter((item) => item.status === "Valid").length,
    pending: inventoryData.filter((item) => item.status === "Tertunda").length,
    error: inventoryData.filter((item) => item.status === "Error").length,
  };

  // Filter data
  const filteredItems = useMemo(() => {
    let filtered = inventoryData.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.lokasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        categoryFilter === "all" || item.kategori === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sorting
    if (sorting.id) {
      filtered.sort((a, b) => {
        let aVal = a[sorting.id];
        let bVal = b[sorting.id];
        
        if (sorting.id === "jumlah") {
          aVal = a.jumlah;
          bVal = b.jumlah;
        }
        
        if (aVal < bVal) return sorting.desc ? 1 : -1;
        if (aVal > bVal) return sorting.desc ? -1 : 1;
        return 0;
      });
    }

    return filtered;
  }, [inventoryData, searchTerm, categoryFilter, statusFilter, sorting]);

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

  const getCategoryIcon = (kategori, jenisAset) => {
    if (kategori === "Material") {
      return <Cable className="w-4 h-4 text-green-600" />;
    }
    return <Cpu className="w-4 h-4 text-blue-600" />;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Valid":
        return { bg: "bg-green-100", text: "text-green-700", label: "Valid" };
      case "Error":
        return { bg: "bg-red-100", text: "text-red-700", label: "Error" };
      case "Tertunda":
        return { bg: "bg-blue-100", text: "text-blue-700", label: "Pending" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", label: status };
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

  // Fungsi untuk menampilkan detail dengan SweetAlert
  const handleShowDetail = (item) => {
    Swal.fire({
      title: `<div class="font-dm-sans text-lg font-semibold text-gray-900">IT Asset Details</div>`,
      html: `
      <div class="font-dm-sans text-left space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        <div>
          <h4 class="text-base font-semibold text-gray-900">${item.nama}</h4>
          <p class="text-xs text-gray-500 mt-1">${item.jenisAset} • ${item.kategori}</p>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">INFORMATION</h5>
          <div class="bg-gray-50 rounded-lg p-3 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Asset ID</span>
              <span class="text-xs font-medium text-blue-700">${item.id}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Unique Code</span>
              <span class="text-xs font-mono text-blue-600">${item.kodeUnik}</span>
            </div>
          </div>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">IDENTIFICATION</h5>
          <div class="bg-gray-50 rounded-lg p-3 space-y-2">
            ${
              item.serialNumber
                ? `
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Serial Number</span>
              <span class="text-xs font-mono text-gray-700">${item.serialNumber}</span>
            </div>
            `
                : ""
            }
            ${
              item.barcode
                ? `
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Barcode</span>
              <span class="text-xs font-mono text-gray-700">${item.barcode}</span>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">SPECIFICATION</h5>
          <div class="bg-gray-50 rounded-lg p-3">
            <p class="text-xs text-gray-700">${item.spesifikasi}</p>
          </div>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">LOCATION</h5>
          <div class="bg-gray-50 rounded-lg p-3 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Location</span>
              <span class="text-xs font-medium text-gray-700">${item.lokasi}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Department</span>
              <span class="text-xs font-medium text-gray-700">${item.departemen}</span>
            </div>
          </div>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">LAST UPDATE</h5>
          <div class="bg-gray-50 rounded-lg p-3 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Checking Date</span>
              <span class="text-xs font-medium text-gray-700">${item.tanggalPengecekan}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Checked By</span>
              <span class="text-xs font-medium text-gray-700">${item.diperbaruiOleh}</span>
            </div>
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

  // Function to delete an item with confirmation
  const handleDeleteItem = (item) => {
    Swal.fire({
      title: "Delete Asset?",
      text: `Are you sure you want to delete ${item.nama} (${item.id})?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4CAF50",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Delete!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      customClass: {
        confirmButton: "px-6 py-2 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition",
        cancelButton: "px-6 py-2 text-sm font-medium rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition mr-2",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Success!",
          text: `The asset ${item.nama} has been successfully deleted.`,
          icon: "success",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });
      }
    });
  };

  // Export to Excel
  const exportToExcel = (exportType = "current") => {
    try {
      let dataToExport = [];

      if (exportType === "current") {
        dataToExport = filteredItems.map((item) => ({
          "Asset ID": item.id,
          "Asset Name": item.nama,
          "Type": item.jenisAset,
          "Category": item.kategori,
          "Serial/Barcode": item.serialNumber || item.barcode || "N/A",
          "Location": item.lokasi,
          "Department": item.departemen,
          "Status": item.status,
          "Last Checked": item.tanggalPengecekan,
          "Checked By": item.diperbaruiOleh,
        }));
      } else if (exportType === "all") {
        dataToExport = inventoryData.map((item) => ({
          "Asset ID": item.id,
          "Asset Name": item.nama,
          "Type": item.jenisAset,
          "Category": item.kategori,
          "Serial/Barcode": item.serialNumber || item.barcode || "N/A",
          "Location": item.lokasi,
          "Department": item.departemen,
          "Status": item.status,
          "Last Checked": item.tanggalPengecekan,
          "Checked By": item.diperbaruiOleh,
        }));
      } else if (exportType === "valid") {
        dataToExport = inventoryData
          .filter((item) => item.status === "Valid")
          .map((item) => ({
            "Asset ID": item.id,
            "Asset Name": item.nama,
            "Type": item.jenisAset,
            "Category": item.kategori,
            "Serial/Barcode": item.serialNumber || item.barcode || "N/A",
            "Location": item.lokasi,
            "Department": item.departemen,
            "Status": "Valid",
            "Last Checked": item.tanggalPengecekan,
            "Checked By": item.diperbaruiOleh,
          }));
      } else if (exportType === "error") {
        dataToExport = inventoryData
          .filter((item) => item.status === "Error")
          .map((item) => ({
            "Asset ID": item.id,
            "Asset Name": item.nama,
            "Type": item.jenisAset,
            "Category": item.kategori,
            "Serial/Barcode": item.serialNumber || item.barcode || "N/A",
            "Location": item.lokasi,
            "Department": item.departemen,
            "Status": "Error",
            "Last Checked": item.tanggalPengecekan,
            "Checked By": item.diperbaruiOleh,
          }));
      }

      if (dataToExport.length === 0) {
        Swal.fire("No Data", "No data to export", "info");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wscols = [
        { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
        { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 10 },
        { wch: 12 }, { wch: 15 }
      ];
      ws["!cols"] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      let filename = `inventory_${exportType}_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
      setShowExportDropdown(false);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      Swal.fire("Error", "Failed to export data", "error");
    }
  };

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu={1}>
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
          .swal2-confirm-btn, .swal2-cancel-btn {
            padding: 0.625rem 1.25rem !important;
            font-size: 0.875rem !important;
            border-radius: 0.5rem !important;
            margin: 0 0.25rem !important;
            min-width: 120px !important;
          }
        `}</style>

        <div className="bm-root space-y-5 p-3 md:p-6 bg-gray-50 min-h-screen">
          {/* HEADER SECTION */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Box className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                  IT Asset Inventory Management
                </h1>
              </div>
              <p className="text-gray-500 text-sm">
                Monitor and manage all IT devices and materials in your system
              </p>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* TOTAL ASSETS CARD */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Box className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-2xl md:text-3xl font-bold">{stats.total}</span>
              </div>
              <p className="mt-2 text-sm font-medium uppercase opacity-90">Total Assets</p>
              <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <span className="truncate">All IT assets</span>
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
                <span className="truncate">Cables, Trunking, etc</span>
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
                <span className="truncate">Verified assets</span>
              </div>
            </div>

            {/* ERROR CARD */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <div className="p-2 bg-white/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 md:w-6 md:h-6" />
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

          {/* INVENTORY TABLE SECTION */}
          <div className="card overflow-hidden">
            {/* Card Header with Action Buttons */}
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Box className="w-5 h-5 text-blue-600" />
                    All Inventory Items
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage and monitor all IT assets in your system
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
                                <div className="text-xs text-gray-500">{inventoryData.length} total items</div>
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

                  {/* Scan New Asset Button */}
                  <button
                    onClick={() => router.push("/scanning")}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-600 hover:to-blue-600 text-white px-4 py-2.5 rounded-lg text-sm transition-all w-full md:w-auto"
                  >
                    <ScanLine className="w-4 h-4" />
                    <span>Scan New Asset</span>
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
                    placeholder="Search by ID, asset name, location, or identification number..."
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
                    <option value="Tertunda">Pending</option>
                    <option value="Error">Error</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 md:p-6">
              {/* Loading State */}
              {loading ? (
                <div className="py-8 md:py-12 text-center">
                  <div className="inline-flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">Loading assets...</span>
                  </div>
                </div>
              ) : /* Empty State */
              inventoryData.length === 0 ? (
                <div className="py-8 md:py-12 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl inline-block mb-4">
                      <Box className="w-10 h-10 md:w-12 md:h-12 text-blue-400" />
                    </div>
                    <h3 className="text-gray-900 font-semibold text-base md:text-lg mb-2">
                      No assets configured
                    </h3>
                    <p className="text-gray-500 text-sm mb-6">
                      Start by adding your first asset or scanning a new item
                    </p>
                    <button
                      onClick={() => router.push("/scanning")}
                      className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 inline-flex items-center gap-2 text-sm"
                    >
                      <ScanLine className="w-4 h-4" />
                      Scan Your First Asset
                    </button>
                  </div>
                </div>
              ) : /* No Results State */
              filteredItems.length === 0 ? (
                <div className="py-8 md:py-12 text-center">
                  <Search className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-gray-900 font-semibold text-base mb-2">
                    No matching assets
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
                  {filteredItems.map((item) => {
                    const statusBadge = getStatusBadge(item.status);
                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-200 rounded-xl p-3 md:p-4 hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => handleShowDetail(item)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 md:p-2 rounded-lg ${item.kategori === "Perangkat" ? "bg-blue-100" : "bg-green-100"}`}>
                              {getCategoryIcon(item.kategori, item.jenisAset)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 truncate">
                                  {item.nama}
                                </h4>
                              </div>
                              <p className="text-xs text-gray-500 font-mono truncate">
                                {item.id}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Status</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                              {statusBadge.label}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Category</span>
                            <span className="text-xs font-medium text-gray-700">
                              {item.kategori === "Perangkat" ? "Device" : "Material"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Location</span>
                            <span className="text-xs text-gray-700 truncate ml-2">
                              {item.lokasi}
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
                                {formatLastCheck(item.tanggalPengecekan)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List View */
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort("id")}
                        >
                          <div className="flex items-center">
                            Asset ID
                            <div className="ml-1">{getSortIcon("id")}</div>
                          </div>
                        </th>
                        <th
                          className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort("nama")}
                        >
                          <div className="flex items-center">
                            Asset Details
                            <div className="ml-1">{getSortIcon("nama")}</div>
                          </div>
                        </th>
                        <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                          Identification
                        </th>
                        <th
                          className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
                          onClick={() => handleSort("lokasi")}
                        >
                          <div className="flex items-center">
                            Location
                            <div className="ml-1">{getSortIcon("lokasi")}</div>
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
                          Last Updated
                        </th>
                        <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredItems.map((item) => {
                        const statusBadge = getStatusBadge(item.status);
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-50 transition-colors cursor-pointer group"
                            onClick={() => handleShowDetail(item)}
                          >
                            <td className="py-3 px-3">
                              <div className="flex items-center">
                                <div className={`p-1.5 rounded-lg mr-2 ${item.kategori === "Perangkat" ? "bg-blue-100" : "bg-green-100"}`}>
                                  {getCategoryIcon(item.kategori, item.jenisAset)}
                                </div>
                                <div>
                                  <div className="font-semibold text-blue-700 text-sm">{item.id}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {item.kategori === "Perangkat" ? "Device" : "Material"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-gray-900 text-sm">{item.nama}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{item.jenisAset}</div>
                              <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                                {item.spesifikasi}
                              </div>
                            </td>
                            <td className="py-3 px-3 hidden md:table-cell">
                              <div className="space-y-1">
                                <div className="text-xs">
                                  <span className="text-blue-600 font-mono">{item.kodeUnik}</span>
                                </div>
                                {item.serialNumber && (
                                  <div className="text-xs text-gray-600 font-mono">
                                    {item.serialNumber}
                                  </div>
                                )}
                                {item.barcode && (
                                  <div className="text-xs text-gray-600 font-mono">
                                    {item.barcode}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 hidden lg:table-cell">
                              <div className="text-sm text-gray-700">{item.lokasi}</div>
                              <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]">
                                {item.departemen}
                              </div>
                            </td>
                            <td className="py-3 px-3 hidden lg:table-cell">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="py-3 px-3 hidden xl:table-cell">
                              <div className="text-xs text-gray-600">{item.tanggalPengecekan}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{item.diperbaruiOleh}</div>
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
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(item);
                                  }}
                                  className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Asset"
                                >
                                  <Trash2 className="w-4 h-4" />
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
            </div>

            {/* Footer Stats */}
            {!loading && filteredItems.length > 0 && (
              <div className="px-4 md:px-6 py-3 md:py-4 border-t bg-gray-50">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                  <div className="text-xs md:text-sm text-gray-500 text-center sm:text-left">
                    Showing {filteredItems.length} of {inventoryData.length} items
                    {categoryFilter !== "all" && ` • ${categoryFilter} only`}
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