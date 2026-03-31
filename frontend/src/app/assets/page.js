"use client";

import { useState, useEffect, useMemo } from "react";
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
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";

export default function InventoryDataPage() {
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [sorting, setSorting] = useState({ id: "created_at", desc: true });

  // Load assets dari API
  const loadAssets = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.ASSETS_LIST);
      const result = await response.json();

      if (result.success) {
        setAssets(result.data || []);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error loading assets:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to load inventory data",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // Hitung statistik
  const stats = useMemo(() => {
    return {
      total: assets.length,
      devices: assets.filter((item) => item.category === "Device").length,
      materials: assets.filter((item) => item.category === "Material").length,
      active: assets.filter((item) => item.status === "active").length,
    };
  }, [assets]);

  // Filter data
  const filteredItems = useMemo(() => {
    let filtered = assets.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        (item.asset_code?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.asset_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.location_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.serial_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.scan_code?.toLowerCase() || "").includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sorting
    if (sorting.id) {
      filtered.sort((a, b) => {
        let aVal = a[sorting.id];
        let bVal = b[sorting.id];

        if (sorting.id === "created_at") {
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
        }

        if (aVal < bVal) return sorting.desc ? 1 : -1;
        if (aVal > bVal) return sorting.desc ? -1 : 1;
        return 0;
      });
    }

    return filtered;
  }, [assets, searchTerm, categoryFilter, statusFilter, sorting]);

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
      case "active":
        return "text-emerald-600";
      case "inactive":
        return "text-gray-500";
      case "maintenance":
        return "text-amber-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      case "maintenance":
        return "Maintenance";
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  // Fungsi untuk menampilkan detail dengan SweetAlert
  const handleShowDetail = (item) => {
    Swal.fire({
      title: `<div class="font-dm-sans text-lg font-semibold text-gray-900">Asset Details</div>`,
      html: `
      <div class="font-dm-sans text-left space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        <div>
          <h4 class="text-base font-semibold text-gray-900">${item.asset_name}</h4>
          <p class="text-xs text-gray-500 mt-1">${item.asset_type || item.category} • ${item.category}</p>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">INFORMATION</h5>
          <div class="bg-gray-50 rounded-lg p-3 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Asset Code</span>
              <span class="text-xs font-mono text-blue-600">${item.asset_code}</span>
            </div>
            ${item.serial_number
          ? `
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Serial Number</span>
              <span class="text-xs font-mono text-gray-700">${item.serial_number}</span>
            </div>
            `
          : ""
        }
            ${item.scan_code
          ? `
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Scan Code</span>
              <span class="text-xs font-mono text-gray-700">${item.scan_code}</span>
            </div>
            `
          : ""
        }
          </div>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">SPECIFICATION</h5>
          <div class="bg-gray-50 rounded-lg p-3">
            <p class="text-xs text-gray-700">${item.specifications || "No specifications"}</p>
            ${item.brand ? `<p class="text-xs text-gray-500 mt-1">Brand: ${item.brand}</p>` : ""}
            ${item.model ? `<p class="text-xs text-gray-500">Model: ${item.model}</p>` : ""}
            ${item.vendor ? `<p class="text-xs text-gray-500">Vendor: ${item.vendor}</p>` : ""}
          </div>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">ASSIGNMENT</h5>
          <div class="bg-gray-50 rounded-lg p-3 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Project</span>
              <span class="text-xs font-medium text-gray-700">${item.project_name || "-"}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Department</span>
              <span class="text-xs font-medium text-gray-700">${item.department_name || "-"}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Receiver</span>
              <span class="text-xs font-medium text-gray-700">${item.receiver_name || "-"}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Location</span>
              <span class="text-xs font-medium text-gray-700">${item.location_name || "-"}</span>
            </div>
          </div>
        </div>

        <div>
          <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">VALIDATION</h5>
          <div class="bg-gray-50 rounded-lg p-3 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Validated By</span>
              <span class="text-xs font-medium text-gray-700">${item.validated_by_name || "System"}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-600">Validated At</span>
              <span class="text-xs font-medium text-gray-700">${formatDate(item.validated_at)}</span>
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
  const handleDeleteItem = async (item) => {
    const result = await Swal.fire({
      title: "Delete Asset?",
      text: `Are you sure you want to delete ${item.asset_name} (${item.asset_code})?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4CAF50",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Delete!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(API_ENDPOINTS.ASSETS_DELETE(item.id_assets), {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            title: "Deleted!",
            text: `The asset ${item.asset_name} has been successfully deleted.`,
            icon: "success",
            confirmButtonColor: "#2563eb",
          });
          loadAssets();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: "Failed to delete asset",
          icon: "error",
        });
      }
    }
  };

  // Export to Excel
  const exportToExcel = (exportType = "current") => {
    try {
      let dataToExport = [];

      if (exportType === "current") {
        dataToExport = filteredItems.map((item) => ({
          "Asset Code": item.asset_code,
          "Asset Name": item.asset_name,
          "Type": item.asset_type,
          "Category": item.category,
          "Serial/Barcode": item.serial_number || item.scan_code || "N/A",
          "Project": item.project_name || "-",
          "Department": item.department_name || "-",
          "Receiver": item.receiver_name || "-",
          "Location": item.location_name || "-",
          "Status": getStatusLabel(item.status),
          "Validated At": formatDate(item.validated_at),
          "Validated By": item.validated_by_name || "System",
        }));
      } else if (exportType === "all") {
        dataToExport = assets.map((item) => ({
          "Asset Code": item.asset_code,
          "Asset Name": item.asset_name,
          "Type": item.asset_type,
          "Category": item.category,
          "Serial/Barcode": item.serial_number || item.scan_code || "N/A",
          "Project": item.project_name || "-",
          "Department": item.department_name || "-",
          "Receiver": item.receiver_name || "-",
          "Location": item.location_name || "-",
          "Status": getStatusLabel(item.status),
          "Validated At": formatDate(item.validated_at),
          "Validated By": item.validated_by_name || "System",
        }));
      }

      if (dataToExport.length === 0) {
        Swal.fire("No Data", "No data to export", "info");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Assets");

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      let filename = `assets_${exportType}_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
      setShowExportDropdown(false);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      Swal.fire("Error", "Failed to export data", "error");
    }
  };

  const kpis = [
    { title: "Total Assets", value: stats.total, sub: "All IT assets", accent: "#2563eb" },
    { title: "Devices", value: stats.devices, sub: "Computers, Servers, etc", accent: "#6366f1" },
    { title: "Materials", value: stats.materials, sub: "Cables, Connectors, etc", accent: "#10b981" },
    { title: "Active", value: stats.active, sub: "Active assets", accent: "#059669" },
  ];

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

          .kpi-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            text-align: center;
          }

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
        `}</style>

        <div className="inv-root space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Box className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">IT Asset Inventory</h1>
              </div>
              <p className="text-sm text-gray-500">Monitor and manage all validated IT assets</p>
            </div>
            <button
              onClick={() => router.push("/validation_verification")}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Go to Validations
            </button>
          </div>

          {/* KPI Card */}
          <div className="inv-card">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
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

          {/* Main Table Card */}
          <div className="inv-card overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-4 md:p-5 border-b border-gray-100">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by code, name, location, serial..."
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
                  <option value="Device">Devices</option>
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
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
                  onClick={loadAssets}
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
                          <FileSpreadsheet className="w-4 h-4 text-blue-600" /> All Assets ({assets.length})
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
            ) : assets.length === 0 ? (
              <div className="py-20 text-center">
                <Box className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                <h3 className="text-gray-800 font-semibold text-lg mb-1">No assets found</h3>
                <p className="text-gray-400 text-sm mb-5">Start by approving validations</p>
                <button
                  onClick={() => router.push("/validation_verification")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
                >
                  <CheckCircle className="w-4 h-4" /> Go to Validations
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 p-4">
                {filteredItems.map((item, idx) => (
                  <div
                    key={item.id_assets}
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
                            {item.asset_name}
                          </h4>
                          <p className="text-xs text-gray-500 font-mono truncate mt-0.5">
                            {item.asset_code}
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
                          {getStatusLabel(item.status)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Type</span>
                        <span className="text-xs font-medium text-gray-700">
                          {item.asset_type || item.category}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Location</span>
                        <span className="text-xs text-gray-700 truncate max-w-[120px]">
                          {item.location_name || "-"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Department</span>
                        <span className="text-xs text-gray-700 truncate max-w-[120px]">
                          {item.department_name || "-"}
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
                            {formatDate(item.validated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="inv-th text-left" onClick={() => handleSort("asset_code")}>
                        <span className="flex items-center">Asset Code {getSortIcon("asset_code")}</span>
                      </th>
                      <th className="inv-th text-left" onClick={() => handleSort("asset_name")}>
                        <span className="flex items-center">Asset Name {getSortIcon("asset_name")}</span>
                      </th>
                      <th className="inv-th text-left">Type</th>
                      <th className="inv-th text-left hidden lg:table-cell">Serial/Code</th>
                      <th className="inv-th text-left hidden lg:table-cell" onClick={() => handleSort("location_name")}>
                        <span className="flex items-center">Location {getSortIcon("location_name")}</span>
                      </th>
                      <th className="inv-th text-left hidden xl:table-cell" onClick={() => handleSort("department_name")}>
                        <span className="flex items-center">Department {getSortIcon("department_name")}</span>
                      </th>
                      <th className="inv-th text-left" onClick={() => handleSort("status")}>
                        <span className="flex items-center">Status {getSortIcon("status")}</span>
                      </th>
                      <th className="inv-th text-left hidden xl:table-cell" onClick={() => handleSort("validated_at")}>
                        <span className="flex items-center">Validated {getSortIcon("validated_at")}</span>
                      </th>
                      <th className="inv-th text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <tr
                        key={item.id_assets}
                        className="inv-row transition-colors cursor-pointer"
                        onClick={() => handleShowDetail(item)}
                      >
                        <td className="inv-td">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                              {idx + 1}
                            </div>
                            <span className="font-mono text-xs font-semibold text-blue-700">
                              {item.asset_code}
                            </span>
                          </div>
                        </td>
                        <td className="inv-td">
                          <div className="font-semibold text-gray-900 text-sm">{item.asset_name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{item.specifications?.substring(0, 50)}</div>
                        </td>
                        <td className="inv-td">
                          <span className="text-xs text-gray-600">{item.asset_type || "-"}</span>
                          <div className="text-[10px] text-gray-400 mt-0.5">{item.category}</div>
                        </td>
                        <td className="inv-td hidden lg:table-cell">
                          <span className="text-xs font-mono text-gray-600">
                            {item.serial_number || item.scan_code || "-"}
                          </span>
                        </td>
                        <td className="inv-td hidden lg:table-cell">
                          <div className="text-sm text-gray-700">{item.location_name || "-"}</div>
                        </td>
                        <td className="inv-td hidden xl:table-cell">
                          <div className="text-sm text-gray-700">{item.department_name || "-"}</div>
                          {item.receiver_name && (
                            <div className="text-xs text-gray-400">Receiver: {item.receiver_name}</div>
                          )}
                        </td>
                        <td className="inv-td">
                          <span className={`text-sm font-medium ${getStatusColor(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="inv-td hidden xl:table-cell">
                          <div className="text-sm text-gray-700">{formatDate(item.validated_at)}</div>
                          <div className="text-xs text-gray-400">{item.validated_by_name || "System"}</div>
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
                  <span className="font-semibold text-gray-700">{assets.length}</span>{" "}
                  assets
                  {categoryFilter !== "all" && <span className="text-gray-400"> · {categoryFilter === "Device" ? "Devices" : "Materials"}</span>}
                  {statusFilter !== "all" && <span className="text-gray-400"> · {statusFilter}</span>}
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