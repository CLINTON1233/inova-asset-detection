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
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Loader2,
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

  // KPI data untuk card baru
  const kpis = [
    { title: "Total Assets", value: stats.total, sub: "All IT assets", accent: "#2563eb" },
    { title: "Devices", value: stats.perangkat, sub: "Computers, Servers, CCTV", accent: "#6366f1" },
    { title: "Materials", value: stats.material, sub: "Cables, Trunking, etc", accent: "#10b981" },
    { title: "Valid", value: stats.valid, sub: "Verified assets", accent: "#059669" },
    { title: "Error", value: stats.error, sub: "Need attention", accent: "#dc2626" },
  ];

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
      return <span className="text-gray-300 ml-1 text-xs">⇅</span>;
    }
    return sorting.desc
      ? <ArrowDown className="w-3 h-3 ml-1 text-blue-500" />
      : <ArrowUp className="w-3 h-3 ml-1 text-blue-500" />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Valid":
        return "text-emerald-600";
      case "Error":
        return "text-red-600";
      case "Tertunda":
        return "text-amber-600";
      default:
        return "text-gray-600";
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

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
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
      <LayoutDashboard activeMenu={2}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
          .inv-root { font-family: 'DM Sans', sans-serif; }
          .inv-root .mono { font-family: 'DM Mono', monospace; }

          .inv-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
            transition: box-shadow 0.2s ease;
          }
          .inv-card:hover {
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
          }

          /* KPI cell */
          .kpi-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            text-align: center;
          }

          /* Table */
          .inv-th {
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
          .inv-th:hover { color: #374151; }
          .inv-td {
            padding: 13px 16px;
            font-size: 13px;
            color: #374151;
            border-top: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          .inv-row:hover { background: #f8faff; }

          .action-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #1e40af;
            color: #fff;
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            transition: background 0.15s;
            border: none;
            cursor: pointer;
            white-space: nowrap;
            box-shadow: 0 1px 3px rgba(30,64,175,0.3);
          }
          .action-btn:hover { background: #1d3a9e; }
        `}</style>

        <div className="inv-root space-y-5">

          {/* ── Header ── */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Box className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">IT Asset Inventory</h1>
              </div>
              <p className="text-sm text-gray-500">Monitor and manage all IT devices and materials</p>
            </div>
            <button
              onClick={() => router.push("/scanning")}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              <ScanLine className="w-4 h-4" />
              Scan New Asset
            </button>
          </div>

          {/* ── KPI Card — 1 card, 5 columns ── */}
          <div className="inv-card">
            <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-gray-100">
              {kpis.map((d, i) => (
                <div key={i} className="kpi-cell">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    {d.title}
                  </p>
                  <span className="text-4xl font-bold" style={{ color: d.accent }}>
                    {d.value}
                  </span>
                  <p className="text-xs text-gray-400 mt-2">{d.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Main Table Card ── */}
          <div className="inv-card overflow-hidden">

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-4 md:p-5 border-b border-gray-100">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by ID, name, location, serial number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="Perangkat">Devices</option>
                  <option value="Material">Materials</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="Valid">Valid</option>
                  <option value="Tertunda">Pending</option>
                  <option value="Error">Error</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* View Toggle */}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-blue-50 text-blue-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-blue-50 text-blue-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => window.location.reload()}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
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
                      <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)} />
                      <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                        <button onClick={() => exportToExcel("current")} className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Current View ({filteredItems.length})
                        </button>
                        <button onClick={() => exportToExcel("all")} className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-blue-600" /> All Items ({inventoryData.length})
                        </button>
                        <button onClick={() => exportToExcel("valid")} className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-green-600" /> Valid Only ({stats.valid})
                        </button>
                        <button onClick={() => exportToExcel("error")} className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-red-600" /> Error Only ({stats.error})
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading assets...</p>
              </div>
            ) : inventoryData.length === 0 ? (
              <div className="py-20 text-center">
                <Box className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                <h3 className="text-gray-800 font-semibold text-lg mb-1">No assets found</h3>
                <p className="text-gray-400 text-sm mb-5">Start by scanning your first asset</p>
                <button
                  onClick={() => router.push("/scanning")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
                >
                  <ScanLine className="w-4 h-4" /> Scan New Asset
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center">
                <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <h3 className="text-gray-800 font-semibold mb-1">No matching assets</h3>
                <p className="text-gray-400 text-sm mb-4">Try adjusting your filters</p>
                <button onClick={() => { setSearchTerm(""); setCategoryFilter("all"); setStatusFilter("all"); }} className="text-sm text-blue-600 hover:underline">
                  Clear filters
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* Grid View - Simplified */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 p-4">
                {filteredItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => handleShowDetail(item)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">
                            {item.nama}
                          </h4>
                          <p className="text-xs text-gray-500 font-mono truncate mt-0.5">
                            {item.id}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Status</span>
                        <span className={`text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status === "Tertunda" ? "Pending" : item.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Type</span>
                        <span className="text-xs font-medium text-gray-700">
                          {item.jenisAset}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Location</span>
                        <span className="text-xs text-gray-700 truncate max-w-[120px]">
                          {item.lokasi}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Last Check</span>
                        <span className="text-xs text-gray-600">
                          {formatDate(item.tanggalPengecekan)}
                        </span>
                      </div>

                      <div className="pt-2 border-t mt-2">
                        <div className="flex justify-between items-center">
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
                ))}
              </div>
            ) : (
              /* List View - Simplified, no icons, status just text color */
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="inv-th text-left" onClick={() => handleSort("id")}>
                        <span className="flex items-center"># {getSortIcon("id")}</span>
                      </th>
                      <th className="inv-th text-left" onClick={() => handleSort("nama")}>
                        <span className="flex items-center">Asset Details {getSortIcon("nama")}</span>
                      </th>
                      <th className="inv-th text-left" onClick={() => handleSort("jenisAset")}>
                        <span className="flex items-center">Type {getSortIcon("jenisAset")}</span>
                      </th>
                      <th className="inv-th text-left hidden lg:table-cell">Unique Code</th>
                      <th className="inv-th text-left hidden lg:table-cell" onClick={() => handleSort("lokasi")}>
                        <span className="flex items-center">Location {getSortIcon("lokasi")}</span>
                      </th>
                      <th className="inv-th text-left" onClick={() => handleSort("status")}>
                        <span className="flex items-center">Status {getSortIcon("status")}</span>
                      </th>
                      <th className="inv-th text-left hidden xl:table-cell" onClick={() => handleSort("tanggalPengecekan")}>
                        <span className="flex items-center">Last Check {getSortIcon("tanggalPengecekan")}</span>
                      </th>
                      <th className="inv-th text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="inv-row transition-colors cursor-pointer"
                        onClick={() => handleShowDetail(item)}
                      >
                        <td className="inv-td">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">{item.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="inv-td">
                          <div className="font-semibold text-gray-900 text-sm">{item.nama}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{item.spesifikasi}</div>
                        </td>
                        <td className="inv-td">
                          <span className="text-sm text-gray-700">{item.jenisAset}</span>
                        </td>
                        <td className="inv-td hidden lg:table-cell">
                          <span className="text-xs font-mono text-gray-600">{item.kodeUnik}</span>
                          {item.serialNumber && (
                            <div className="text-xs text-gray-400 mt-0.5">SN: {item.serialNumber}</div>
                          )}
                          {item.barcode && (
                            <div className="text-xs text-gray-400 mt-0.5">BC: {item.barcode}</div>
                          )}
                        </td>
                        <td className="inv-td hidden lg:table-cell">
                          <div className="text-sm text-gray-700">{item.lokasi}</div>
                          <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px]">
                            {item.departemen}
                          </div>
                        </td>
                        <td className="inv-td">
                          <span className={`text-sm font-medium ${getStatusColor(item.status)}`}>
                            {item.status === "Tertunda" ? "Pending" : item.status}
                          </span>
                        </td>
                        <td className="inv-td hidden xl:table-cell">
                          <div className="text-sm text-gray-700">{formatDate(item.tanggalPengecekan)}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{item.diperbaruiOleh}</div>
                        </td>
                        <td className="inv-td text-center">
                          <div className="flex items-center justify-center gap-1">
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            {!loading && filteredItems.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-2 rounded-b-2xl">
                <p className="text-xs text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-700">{filteredItems.length}</span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-700">{inventoryData.length}</span>{" "}
                  assets
                  {categoryFilter !== "all" && <span className="text-gray-400"> · {categoryFilter === "Perangkat" ? "Devices" : "Materials"}</span>}
                  {statusFilter !== "all" && <span className="text-gray-400"> · {statusFilter === "Tertunda" ? "Pending" : statusFilter}</span>}
                  {searchTerm && <span className="text-gray-400"> · "{searchTerm}"</span>}
                </p>
                <p className="text-xs text-gray-400">Updated {new Date().toLocaleTimeString("id-ID")}</p>
              </div>
            )}
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedPage>
  );
}