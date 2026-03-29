"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  FileText,
  Calendar,
  MapPin,
  Hash,
  Package,
  Smartphone,
  Laptop,
  Cable,
  Server,
  User,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ExternalLink,
  Image as ImageIcon,
  ArrowUp,
  CheckCircle,
  ArrowDown,
  ChevronDown,
  X,
  Camera,
} from "lucide-react";
import Swal from "sweetalert2";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";

export default function ValidationVerificationPage() {
  const router = useRouter();
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [sorting, setSorting] = useState({ id: "created_at", desc: true });
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  const itemsPerPageOptions = [10, 25, 50, 100];

  useEffect(() => {
    setMounted(true);
    loadValidations();
  }, []);

  const loadValidations = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.VALIDATIONS_LIST, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Validations data:", result);

      if (result.success) {
        setValidations(result.data || []);

        const pending = (result.data || []).filter(v => v.validation_status === 'pending').length;
        const approved = (result.data || []).filter(v => v.validation_status === 'approved').length;
        const rejected = (result.data || []).filter(v => v.validation_status === 'rejected').length;

        setStats({
          pending,
          approved,
          rejected,
          total: result.data?.length || 0,
        });
      } else {
        throw new Error(result.error || "Failed to load validations");
      }
    } catch (error) {
      console.error("Error loading validations:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to load validation data",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "pending":
        return {
          dot: "bg-amber-400",
          text: "text-amber-700",
          bg: "bg-amber-50",
          border: "border-amber-200",
          badge: "bg-amber-100 text-amber-700",
          icon: Clock,
          label: "Pending",
        };
      case "approved":
        return {
          dot: "bg-emerald-500",
          text: "text-emerald-700",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          badge: "bg-emerald-100 text-emerald-700",
          icon: CheckCircle,
          label: "Approved",
        };
      case "rejected":
        return {
          dot: "bg-red-500",
          text: "text-red-700",
          bg: "bg-red-50",
          border: "border-red-200",
          badge: "bg-red-100 text-red-700",
          icon: XCircle,
          label: "Rejected",
        };
      default:
        return {
          dot: "bg-gray-400",
          text: "text-gray-700",
          bg: "bg-gray-50",
          border: "border-gray-200",
          badge: "bg-gray-100 text-gray-700",
          icon: Clock,
          label: status,
        };
    }
  };

  const getTypeIcon = (type) => {
    if (type === "device") return <Laptop className="w-4 h-4 text-blue-600" />;
    if (type === "material") return <Cable className="w-4 h-4 text-green-600" />;
    return <Package className="w-4 h-4 text-gray-500" />;
  };

  const handleViewDetail = async (validation) => {
    try {
      const response = await fetch(API_ENDPOINTS.VALIDATIONS_DETAIL(validation.id_validation));
      const result = await response.json();

      if (result.success) {
        setDetailModal(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error loading detail:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to load validation details",
        icon: "error",
      });
    }
  };

  const handleApprove = async (validation) => {
    const result = await Swal.fire({
      title: "Approve Validation?",
      html: `
        <div class="text-left">
          <p class="text-sm text-gray-600 mb-2">Item: <span class="font-semibold">${validation.item_name || '-'}</span></p>
          <p class="text-sm text-gray-600 mb-4">Code: <span class="font-mono">${validation.serial_or_code || '-'}</span></p>
          <textarea id="notes" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" rows="3" placeholder="Validation notes (optional)"></textarea>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Approve",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#22c55e",
      preConfirm: () => {
        const notes = document.getElementById("notes").value;
        return { notes };
      },
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        const response = await fetch(API_ENDPOINTS.VALIDATIONS_UPDATE(validation.id_validation), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            validation_status: "approved",
            is_approved: true,
            validation_notes: result.value.notes,
            validated_by: 1,
          }),
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            title: "Approved!",
            text: "Validation has been approved successfully.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          loadValidations();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to approve validation",
          icon: "error",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleReject = async (validation) => {
    const result = await Swal.fire({
      title: "Reject Validation?",
      html: `
        <div class="text-left">
          <p class="text-sm text-gray-600 mb-2">Item: <span class="font-semibold">${validation.item_name || '-'}</span></p>
          <p class="text-sm text-gray-600 mb-4">Code: <span class="font-mono">${validation.serial_or_code || '-'}</span></p>
          <label class="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
          <textarea id="reason" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" rows="3" placeholder="Please provide reason for rejection..." required></textarea>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Reject",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      preConfirm: () => {
        const reason = document.getElementById("reason").value;
        if (!reason || reason.trim() === "") {
          Swal.showValidationMessage("Please provide a rejection reason");
          return false;
        }
        return { reason };
      },
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        const response = await fetch(API_ENDPOINTS.VALIDATIONS_UPDATE(validation.id_validation), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            validation_status: "rejected",
            is_approved: false,
            rejection_reason: result.value.reason,
            validated_by: 1,
          }),
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            title: "Rejected!",
            text: "Validation has been rejected.",
            icon: "warning",
            timer: 2000,
            showConfirmButton: false,
          });
          loadValidations();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to reject validation",
          icon: "error",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.length === 0) {
      Swal.fire({
        title: "No Items Selected",
        text: "Please select at least one item to process.",
        icon: "info",
      });
      return;
    }

    const isApprove = action === "approve";

    const result = await Swal.fire({
      title: isApprove ? "Approve Selected Items?" : "Reject Selected Items?",
      text: `Are you sure you want to ${action} ${selectedItems.length} item(s)?`,
      icon: isApprove ? "question" : "warning",
      showCancelButton: true,
      confirmButtonText: isApprove ? "Yes, Approve" : "Yes, Reject",
      confirmButtonColor: isApprove ? "#22c55e" : "#ef4444",
      ...(isApprove ? {} : {
        input: "textarea",
        inputPlaceholder: "Rejection reason for all selected items...",
        inputLabel: "Rejection Reason",
        inputValidator: (value) => {
          if (!value || value.trim() === "") {
            return "Please provide a rejection reason";
          }
          return null;
        },
      }),
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        const response = await fetch(API_ENDPOINTS.VALIDATIONS_BULK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            validation_ids: selectedItems,
            action: action,
            rejection_reason: result.value,
            validated_by: 1,
          }),
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            title: "Success!",
            text: data.message,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          setSelectedItems([]);
          loadValidations();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: error.message || `Failed to ${action} items`,
          icon: "error",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredValidations.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredValidations.map(v => v.id_validation));
    }
  };

  const handleSelectItem = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(i => i !== id));
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
    if (sorting.id !== columnId)
      return <span className="text-gray-300 ml-1 text-xs">⇅</span>;
    return sorting.desc ? (
      <ArrowDown className="w-3 h-3 ml-1 text-blue-500" />
    ) : (
      <ArrowUp className="w-3 h-3 ml-1 text-blue-500" />
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Filter validations
  let filteredValidations = validations.filter(validation => {
    const matchesSearch =
      (validation.item_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (validation.serial_or_code?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (validation.checking_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (validation.unique_code?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || validation.validation_status === statusFilter;
    const matchesType = typeFilter === "all" || validation.validation_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Sorting
  if (sorting.id) {
    filteredValidations = [...filteredValidations].sort((a, b) => {
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

  // Pagination
  const totalPages = Math.ceil(filteredValidations.length / itemsPerPage);
  const paginatedValidations = filteredValidations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const kpis = [
    {
      title: "Total",
      value: stats.total,
      sub: "All validations",
      accent: "#2563eb",
    },
    {
      title: "Pending",
      value: stats.pending,
      sub: "Awaiting review",
      accent: "#d97706",
    },
    {
      title: "Approved",
      value: stats.approved,
      sub: "Validated items",
      accent: "#10b981",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      sub: "Declined items",
      accent: "#ef4444",
    },
  ];

  if (!mounted) {
    return (
      <ProtectedPage>
        <LayoutDashboard activeMenu={1}>
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </LayoutDashboard>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu={1}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
          .vv-root { font-family: 'DM Sans', sans-serif; }
          .vv-root .mono { font-family: 'DM Mono', monospace; }

          .vv-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
            transition: box-shadow 0.2s ease;
          }
          .vv-card:hover {
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
          }

          .kpi-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            text-align: center;
          }

          .vv-th {
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
          .vv-th:hover { color: #374151; }
          .vv-td {
            padding: 13px 16px;
            font-size: 13px;
            color: #374151;
            border-top: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          .vv-row:hover { background: #f8faff; }

          .approve-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #16a34a;
            color: #fff;
            padding: 7px 16px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            transition: background 0.15s;
            border: none;
            cursor: pointer;
            white-space: nowrap;
            box-shadow: 0 1px 3px rgba(22,163,74,0.3);
          }
          .approve-btn:hover { background: #15803d; }
          .approve-btn:disabled { opacity: 0.5; cursor: not-allowed; }

          .reject-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #dc2626;
            color: #fff;
            padding: 7px 16px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            transition: background 0.15s;
            border: none;
            cursor: pointer;
            white-space: nowrap;
            box-shadow: 0 1px 3px rgba(220,38,38,0.3);
          }
          .reject-btn:hover { background: #b91c1c; }
          .reject-btn:disabled { opacity: 0.5; cursor: not-allowed; }

          .view-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #1e40af;
            color: #fff;
            padding: 7px 16px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            transition: background 0.15s;
            border: none;
            cursor: pointer;
            white-space: nowrap;
            box-shadow: 0 1px 3px rgba(30,64,175,0.3);
          }
          .view-btn:hover { background: #1d3a9e; }
        `}</style>

        <div className="vv-root space-y-5 max-w-7xl mx-auto px-4 py-2">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">
                  Validation & Verification
                </h1>
              </div>
              <p className="text-sm text-gray-500">
                Review and validate scanned assets before added to inventory assets
              </p>
            </div>
          </div>

          {/* KPI Card */}
          <div className="vv-card">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
              {kpis.map((d, i) => (
                <div key={i} className="kpi-cell">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    {d.title}
                  </p>
                  <span
                    className="text-4xl font-bold"
                    style={{ color: d.accent }}
                  >
                    {d.value}
                  </span>
                  <p className="text-xs text-gray-400 mt-2">{d.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Main Table Card */}
          <div className="vv-card overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-4 md:p-5 border-b border-gray-100">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by item name, serial/scan code, checking number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
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

              {/* Type Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[130px]"
                >
                  <option value="all">All Types</option>
                  <option value="device">Devices</option>
                  <option value="material">Materials</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[130px]"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {/* Bulk Actions */}
                {selectedItems.length > 0 && (
                  <>
                    <span className="text-xs text-gray-500 font-medium">
                      {selectedItems.length} selected
                    </span>
                    <button
                      onClick={() => handleBulkAction("approve")}
                      disabled={isProcessing}
                      className="approve-btn"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Approve</span>
                    </button>
                    <button
                      onClick={() => handleBulkAction("reject")}
                      disabled={isProcessing}
                      className="reject-btn"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reject</span>
                    </button>
                  </>
                )}
                <button
                  onClick={loadValidations}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading validations...</p>
              </div>
            ) : validations.length === 0 ? (
              <div className="py-20 text-center">
                <Shield className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                <h3 className="text-gray-800 font-semibold text-lg mb-1">
                  No validations found
                </h3>
                <p className="text-gray-400 text-sm">
                  Scan results will appear here for review
                </p>
              </div>
            ) : filteredValidations.length === 0 ? (
              <div className="py-16 text-center">
                <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <h3 className="text-gray-800 font-semibold mb-1">
                  No matching validations
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Try adjusting your filters
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="vv-th w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === filteredValidations.length && filteredValidations.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="vv-th text-left">Photo</th>
                      <th className="vv-th text-left" onClick={() => handleSort("item_name")}>
                        <span className="flex items-center">Item {getSortIcon("item_name")}</span>
                      </th>
                      <th className="vv-th text-left hidden md:table-cell" onClick={() => handleSort("serial_or_code")}>
                        <span className="flex items-center">Code {getSortIcon("serial_or_code")}</span>
                      </th>
                      <th className="vv-th text-left hidden lg:table-cell" onClick={() => handleSort("checking_name")}>
                        <span className="flex items-center">Session {getSortIcon("checking_name")}</span>
                      </th>
                      <th className="vv-th text-left hidden lg:table-cell" onClick={() => handleSort("location_name")}>
                        <span className="flex items-center">Location {getSortIcon("location_name")}</span>
                      </th>
                      <th className="vv-th text-left" onClick={() => handleSort("validation_status")}>
                        <span className="flex items-center">Status {getSortIcon("validation_status")}</span>
                      </th>
                      <th className="vv-th text-left hidden xl:table-cell" onClick={() => handleSort("created_at")}>
                        <span className="flex items-center">Submitted {getSortIcon("created_at")}</span>
                      </th>
                      <th className="vv-th text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedValidations.map((validation, idx) => {
                      const sc = getStatusConfig(validation.validation_status);
                      const StatusIcon = sc.icon;
                      const photoUrl = validation.photo_url;

                      return (
                        <tr key={validation.id_validation} className="vv-row transition-colors">
                          <td className="vv-td text-center">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(validation.id_validation)}
                              onChange={() => handleSelectItem(validation.id_validation)}
                              disabled={validation.validation_status !== "pending"}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            />
                          </td>
                          <td className="vv-td">
                            {photoUrl ? (
                              <img
                                src={photoUrl.startsWith('http') ? photoUrl : `http://localhost:5001${photoUrl}`}
                                alt="Scan result"
                                className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:opacity-80 transition"
                                onClick={() => {
                                  Swal.fire({
                                    imageUrl: photoUrl.startsWith('http') ? photoUrl : `http://localhost:5001${photoUrl}`,
                                    imageAlt: "Scan Result",
                                    title: "Scan Result Preview",
                                    imageWidth: 400,
                                    imageHeight: "auto",
                                    confirmButtonColor: "#2563eb",
                                    customClass: {
                                      popup: "rounded-xl",
                                      confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg"
                                    }
                                  });
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = '<div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><Camera className="w-5 h-5 text-gray-400" /></div>';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Camera className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </td>
                          <td className="vv-td">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                {getTypeIcon(validation.validation_type)}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 text-sm leading-tight">
                                  {validation.item_name || "-"}
                                </div>
                                <div className="mt-0.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${validation.validation_type === "device"
                                      ? "bg-blue-100 text-blue-700"
                                      : validation.validation_type === "material"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-700"
                                      }`}
                                  >
                                    {validation.validation_type === "device"
                                      ? "Device"
                                      : validation.validation_type === "material"
                                        ? "Material"
                                        : validation.validation_type || "Unknown"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="vv-td hidden md:table-cell">
                            <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                              {validation.serial_or_code || "-"}
                            </code>
                          </td>
                          <td className="vv-td hidden lg:table-cell">
                            <div className="font-medium text-gray-800 text-sm">{validation.checking_name || "-"}</div>
                            <div className="text-xs text-gray-400 mono mt-0.5">{validation.checking_number || "-"}</div>
                          </td>
                          <td className="vv-td hidden lg:table-cell">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-xs text-gray-600 truncate max-w-[140px]">
                                {validation.location_name || "-"}
                              </span>
                            </div>
                          </td>
                          <td className="vv-td">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0`} />
                              {sc.label}
                            </span>
                            {validation.rejection_reason && validation.validation_status === "rejected" && (
                              <p className="text-xs text-red-500 mt-1 max-w-[160px] truncate">
                                {validation.rejection_reason}
                              </p>
                            )}
                          </td>
                          <td className="vv-td hidden xl:table-cell">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-xs text-gray-600">
                                {formatDate(validation.created_at)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              by {validation.created_by_name || "System"}
                            </div>
                          </td>
                          <td className="vv-td text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleViewDetail(validation)}
                                className="view-btn"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">View</span>
                              </button>
                              {validation.validation_status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleApprove(validation)}
                                    disabled={isProcessing}
                                    className="approve-btn"
                                    title="Approve"
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Approve</span>
                                  </button>
                                  <button
                                    onClick={() => handleReject(validation)}
                                    disabled={isProcessing}
                                    className="reject-btn"
                                    title="Reject"
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Reject</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer / Pagination */}
            {!loading && filteredValidations.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-2 rounded-b-2xl">
                <p className="text-xs text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredValidations.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-700">
                    {filteredValidations.length}
                  </span>{" "}
                  validations
                  {typeFilter !== "all" && (
                    <span className="text-gray-400"> · {typeFilter === "device" ? "Devices" : "Materials"}</span>
                  )}
                  {statusFilter !== "all" && (
                    <span className="text-gray-400"> · {statusFilter}</span>
                  )}
                  {searchTerm && (
                    <span className="text-gray-400"> · "{searchTerm}"</span>
                  )}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 text-xs text-gray-600 font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
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
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setDetailModal(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {getTypeIcon(detailModal.validation_type)}
                  <h2 className="text-lg font-semibold text-gray-900">Validation Details</h2>
                  {(() => {
                    const sc = getStatusConfig(detailModal.validation_status);
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    );
                  })()}
                </div>
                <button onClick={() => setDetailModal(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
                {detailModal.photo_url && (
                  <div className="bg-gray-100 rounded-lg p-2 flex justify-center">
                    <img
                      src={detailModal.photo_url.startsWith('http') ? detailModal.photo_url : `http://localhost:5001${detailModal.photo_url}`}
                      alt="Scan result"
                      className="max-w-full max-h-48 rounded-lg object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Item Name</p>
                    <p className="font-semibold text-gray-900 text-sm">{detailModal.item_name || "-"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Type</p>
                    <p className="font-semibold text-gray-900 capitalize text-sm">{detailModal.validation_type}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      {detailModal.validation_type === "device" ? "Serial Number" : "Scan Code"}
                    </p>
                    <code className="text-sm font-mono text-gray-800">{detailModal.serial_or_code || "-"}</code>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Unique Code</p>
                    <code className="text-sm font-mono text-gray-800">{detailModal.unique_code || "-"}</code>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Session</p>
                  <p className="font-semibold text-gray-900 text-sm">{detailModal.checking_name || "-"}</p>
                  <p className="text-xs text-gray-500 font-mono">{detailModal.checking_number || "-"}</p>
                  {detailModal.checking_date && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(detailModal.checking_date).toLocaleDateString("id-ID")}
                    </p>
                  )}
                </div>

                {detailModal.location_name && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Location</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900 text-sm">{detailModal.location_name}</span>
                    </div>
                  </div>
                )}

                {detailModal.detection_data && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Detection Data</p>
                    <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap">
                      {JSON.stringify(detailModal.detection_data, null, 2)}
                    </pre>
                  </div>
                )}

                {(detailModal.validation_notes || detailModal.rejection_reason) && (
                  <div className={`rounded-lg p-3 ${detailModal.validation_status === 'rejected' ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                    <p className="text-xs font-semibold mb-1 text-gray-700">
                      {detailModal.validation_status === 'rejected' ? 'Rejection Reason' : 'Validation Notes'}
                    </p>
                    <p className="text-sm text-gray-800">{detailModal.validation_notes || detailModal.rejection_reason}</p>
                    {detailModal.validated_by_name && (
                      <p className="text-xs text-gray-500 mt-2">
                        Validated by {detailModal.validated_by_name} at {detailModal.validated_at ? new Date(detailModal.validated_at).toLocaleString() : "-"}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setDetailModal(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                >
                  Close
                </button>
                {detailModal.validation_status === "pending" && (
                  <>
                    <button
                      onClick={() => {
                        setDetailModal(null);
                        handleApprove(detailModal);
                      }}
                      className="approve-btn"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setDetailModal(null);
                        handleReject(detailModal);
                      }}
                      className="reject-btn"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </LayoutDashboard>
    </ProtectedPage>
  );
}