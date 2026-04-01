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
  Calendar,
  MapPin,
  Package,
  Laptop,
  Cable,
  Server,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ArrowUp,
  CheckCircle,
  ArrowDown,
  ChevronDown,
  X,
  Camera,
  Trash2,
  Cpu,
  Box,
  FileSpreadsheet,
  LayoutGrid,
  List,
} from "lucide-react";
import * as XLSX from "xlsx";
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
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [itemDetails, setItemDetails] = useState({});
  const [viewMode, setViewMode] = useState("list");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  useEffect(() => {
    setMounted(true);
    loadValidations();
  }, []);

  useEffect(() => {
    const loadAllItemDetails = async () => {
      if (validations.length > 0) {
        for (const validation of validations) {
          if (!itemDetails[validation.id_validation]) {
            await fetchItemDetails(validation);
          }
        }
      }
    };
    loadAllItemDetails();
  }, [validations]);

  const toggleCheckboxMode = () => {
    setShowCheckboxes(!showCheckboxes);
    if (showCheckboxes) {
      setSelectedItems([]);
    }
  };

  const fetchItemDetails = async (validation) => {
    if (itemDetails[validation.id_validation])
      return itemDetails[validation.id_validation];

    try {
      if (
        validation.project_name ||
        validation.departments ||
        validation.receivers ||
        validation.brand
      ) {
        const detail = {
          project_name: validation.project_name || "-",
          departments: validation.departments || [],
          receivers: validation.receivers || [],
          brand: validation.brand || null,
        };

        setItemDetails((prev) => ({
          ...prev,
          [validation.id_validation]: detail,
        }));

        return detail;
      }

      const response = await fetch(
        API_ENDPOINTS.VALIDATIONS_DETAIL(validation.id_validation),
      );
      const result = await response.json();

      if (result.success && result.data) {
        const data = result.data;
        const detail = {
          project_name: data.project_name || "-",
          departments: data.departments || [],
          receivers: data.receivers || [],
          brand: data.brand || null,
          vendor: data.vendor || null,
        };

        setItemDetails((prev) => ({
          ...prev,
          [validation.id_validation]: detail,
        }));

        return detail;
      }

      return {
        project_name: "-",
        departments: [],
        receivers: [],
        brand: null,
        vendor: null,
      };
    } catch (error) {
      console.error("Error fetching item details:", error);
      return {
        project_name: "-",
        departments: [],
        receivers: [],
        brand: null,
        vendor: null,
      };
    }
  };

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

      if (result.success) {
        setValidations(result.data || []);

        const pending = (result.data || []).filter(
          (v) => v.validation_status === "pending",
        ).length;
        const approved = (result.data || []).filter(
          (v) => v.validation_status === "approved",
        ).length;
        const rejected = (result.data || []).filter(
          (v) => v.validation_status === "rejected",
        ).length;

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

  useEffect(() => {
    if (validations.length > 0) {
      const newDetails = {};
      validations.forEach((validation) => {
        newDetails[validation.id_validation] = {
          project_name: validation.project_name || "-",
          departments: validation.departments || [],
          receivers: validation.receivers || [],
          brand: validation.brand || null,
        };
      });
      setItemDetails((prev) => ({ ...prev, ...newDetails }));
    }
  }, [validations]);

  const getStatusConfig = (status) => {
    switch (status) {
      case "pending":
        return {
          dot: "bg-amber-400",
          text: "text-amber-700",
          bg: "bg-amber-50",
          border: "border-amber-200",
          badge: "bg-amber-100 text-amber-700",
          label: "Pending",
        };
      case "approved":
        return {
          dot: "bg-emerald-500",
          text: "text-emerald-700",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          badge: "bg-emerald-100 text-emerald-700",
          label: "Approved",
        };
      case "rejected":
        return {
          dot: "bg-red-500",
          text: "text-red-700",
          bg: "bg-red-50",
          border: "border-red-200",
          badge: "bg-red-100 text-red-700",
          label: "Rejected",
        };
      default:
        return {
          dot: "bg-gray-400",
          text: "text-gray-700",
          bg: "bg-gray-50",
          border: "border-gray-200",
          badge: "bg-gray-100 text-gray-700",
          label: status,
        };
    }
  };

  const getTypeIcon = (type) => {
    if (type === "device") return <Laptop className="w-4 h-4 text-blue-600" />;
    if (type === "material")
      return <Package className="w-4 h-4 text-emerald-600" />;
    return <Package className="w-4 h-4 text-gray-500" />;
  };

  const handleViewDetail = async (validation) => {
    try {
      const response = await fetch(
        API_ENDPOINTS.VALIDATIONS_DETAIL(validation.id_validation),
      );
      const result = await response.json();

      if (result.success) {
        const detail = itemDetails[validation.id_validation] || {};
        setDetailModal({
          ...result.data,
          project_name: detail.project_name,
          departments: detail.departments,
          receivers: detail.receivers,
          brand: detail.brand,
          vendor: detail.vendor,
        });
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
        <p class="text-sm text-gray-600 mb-2">Item: <span class="font-semibold">${validation.item_name || "-"}</span></p>
        <p class="text-sm text-gray-600 mb-2">Brand: <span class="font-semibold">${validation.brand || "-"}</span></p>
        <p class="text-sm text-gray-600 mb-4">Code: <span class="font-mono">${validation.serial_or_code || "-"}</span></p>
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
        const response = await fetch(
          API_ENDPOINTS.VALIDATIONS_UPDATE(validation.id_validation),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              validation_status: "approved",
              is_approved: true,
              validation_notes: result.value.notes,
              validated_by: 1,
            }),
          },
        );

        const data = await response.json();

        if (data.success) {
          const assetResponse = await fetch(
            API_ENDPOINTS.ASSETS_CREATE_FROM_VALIDATION,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                validation_id: validation.id_validation,
                user_id: 1,
                validated_by: 1,
              }),
            },
          );

          const assetResult = await assetResponse.json();

          if (assetResult.success) {
            Swal.fire({
              title: "Approved & Added to Assets!",
              html: `Validation approved and asset <strong>${assetResult.asset_code}</strong> has been added to inventory.`,
              icon: "success",
              timer: 2000,
              showConfirmButton: false,
            });
          } else {
            Swal.fire({
              title: "Approved!",
              text: "Validation has been approved successfully, but asset creation failed.",
              icon: "warning",
              timer: 2000,
              showConfirmButton: false,
            });
          }

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
          <p class="text-sm text-gray-600 mb-2">Item: <span class="font-semibold">${validation.item_name || "-"}</span></p>
          <p class="text-sm text-gray-600 mb-2">Brand: <span class="font-semibold">${validation.brand || "-"}</span></p>
          <p class="text-sm text-gray-600 mb-4">Code: <span class="font-mono">${validation.serial_or_code || "-"}</span></p>
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
        const response = await fetch(
          API_ENDPOINTS.VALIDATIONS_UPDATE(validation.id_validation),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              validation_status: "rejected",
              is_approved: false,
              rejection_reason: result.value.reason,
              validated_by: 1,
            }),
          },
        );

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
      ...(isApprove
        ? {}
        : {
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

  const handleDeleteSingle = async (validation) => {
    const result = await Swal.fire({
      title: "Delete Validation?",
      text: `Are you sure you want to delete validation for "${validation.item_name || validation.serial_or_code}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/validations/${validation.id_validation}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          },
        );

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            title: "Deleted!",
            text: "Validation has been deleted successfully.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
          loadValidations();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to delete validation",
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
        text: "Please select at least one item to delete.",
        icon: "info",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Delete Selected Items?",
      text: `Are you sure you want to delete ${selectedItems.length} validation(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: `Yes, Delete ${selectedItems.length} Item(s)`,
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/validations/bulk-delete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ validation_ids: selectedItems }),
          },
        );

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
          loadValidations();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to delete validations",
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
      setSelectedItems(filteredValidations.map((v) => v.id_validation));
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
    if (sorting.id !== columnId)
      return <span style={{ color: "#d1d5db", marginLeft: 4, fontSize: 11 }}>⇅</span>;
    return sorting.desc ? (
      <ArrowDown style={{ width: 12, height: 12, marginLeft: 4, color: "#2563eb" }} />
    ) : (
      <ArrowUp style={{ width: 12, height: 12, marginLeft: 4, color: "#2563eb" }} />
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const exportToExcel = (exportType = "current") => {
    try {
      const source = exportType === "current" ? filteredValidations : validations;

      if (!source.length) {
        alert("No data to export");
        return;
      }

      const dataToExport = source.map((v) => ({
        "Item Name": v.item_name || "-",
        Brand: v.brand || "-",
        "Serial/Code": v.serial_or_code || "-",
        Type: v.validation_type === "device" ? "Device" : "Material",
        Status: v.validation_status === "pending" ? "Pending" : v.validation_status === "approved" ? "Approved" : "Rejected",
        "Session Name": v.checking_name || "-",
        "Session Number": v.checking_number || "-",
        "Submitted Date": formatDate(v.created_at),
        "Submitted By": v.created_by_name || "System",
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      ws["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Validations");
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      XLSX.writeFile(wb, `validations_${exportType}_${ts}.xlsx`);
      setShowExportDropdown(false);
    } catch {
      alert("Failed to export data.");
    }
  };

  // Filter validations
  let filteredValidations = validations.filter((validation) => {
    const matchesSearch =
      (validation.item_name?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (validation.serial_or_code?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (validation.checking_number?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (validation.unique_code?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (validation.brand?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      );

    const matchesStatus =
      statusFilter === "all" || validation.validation_status === statusFilter;
    const matchesType =
      typeFilter === "all" || validation.validation_type === typeFilter;

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
    currentPage * itemsPerPage,
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
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
          .vv-root { font-family: 'DM Sans', sans-serif; }
          .vv-root * { box-sizing: border-box; }

          .vv-stat-card {
            border-radius: 14px;
            padding: 16px;
            color: #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            transition: box-shadow 0.2s, transform 0.2s;
          }
          .vv-stat-card:hover {
            box-shadow: 0 8px 24px rgba(0,0,0,0.16);
            transform: translateY(-2px);
          }

          .vv-section {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            overflow: hidden;
          }

          .vv-th {
            padding: 10px 14px;
            font-size: 11px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            background: #f9fafb;
            cursor: pointer;
            user-select: none;
            white-space: nowrap;
            border-bottom: 1px solid #e5e7eb;
          }
          .vv-th:hover { color: #374151; }
          .vv-td {
            padding: 13px 14px;
            font-size: 13px;
            color: #374151;
            border-top: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          .vv-row { cursor: pointer; transition: background 0.1s; }
          .vv-row:hover { background: #f8faff; }

          .vv-grid-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 16px;
            cursor: pointer;
            transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
          }
          .vv-grid-card:hover {
            box-shadow: 0 6px 20px rgba(37,99,235,0.1);
            border-color: #bfdbfe;
            transform: translateY(-2px);
          }

          .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fed7aa; }
          .badge-approved { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          .badge-rejected { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

          .vv-view-tog {
            display: flex;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            overflow: hidden;
          }
          .vv-view-tog button {
            padding: 7px 10px; background: #fff; color: #6b7280;
            border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: background 0.15s, color 0.15s;
          }
          .vv-view-tog button.active,
          .vv-view-tog button:hover { background: #2563eb; color: #fff; }

          .vv-export-drop {
            position: absolute; right: 0; top: calc(100% + 6px);
            background: #fff; border: 1px solid #e5e7eb;
            border-radius: 14px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.12);
            z-index: 50; min-width: 220px; overflow: hidden;
          }

          .vv-search { border: 1px solid #d1d5db; border-radius: 12px; }
          .vv-search:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.12); border-color: #93c5fd; outline: none; }

          .vv-footer {
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 18px; background: #f9fafb;
            border-top: 1px solid #f3f4f6;
            border-radius: 0 0 18px 18px;
          }

          .vv-empty {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; padding: 72px 24px; text-align: center;
          }

          .kpi-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            text-align: center;
          }

          .approve-btn-sm {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #16a34a;
            color: #fff;
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
            transition: background 0.15s;
            border: none;
            cursor: pointer;
            white-space: nowrap;
          }
          .approve-btn-sm:hover { background: #15803d; }

          .reject-btn-sm {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #dc2626;
            color: #fff;
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
            transition: background 0.15s;
            border: none;
            cursor: pointer;
            white-space: nowrap;
          }
          .reject-btn-sm:hover { background: #b91c1c; }

          .view-btn-sm {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #2563eb;
            color: #fff;
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
            transition: background 0.15s;
            border: none;
            cursor: pointer;
            white-space: nowrap;
          }
          .view-btn-sm:hover { background: #1d4ed8; }
        `}</style>

        <div className="vv-root space-y-5 max-w-7xl mx-auto px-4 py-2">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Validation & Verification
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Review and validate scanned assets before adding to inventory
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="vv-section" style={{ border: "none", boxShadow: "none" }}>
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

          {/* Main Section Card */}
          <div className="vv-section">
            {/* Section Header */}
            <div className="p-5 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    All Validations
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Manage and review all validation requests
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Export Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
                      style={{
                        background: "linear-gradient(135deg,#059669,#10b981)",
                      }}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export Excel
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {showExportDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowExportDropdown(false)}
                        />
                        <div className="vv-export-drop">
                          <div
                            style={{
                              padding: "10px 16px 8px",
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#9ca3af",
                              textTransform: "uppercase",
                              letterSpacing: "0.07em",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            Export Options
                          </div>
                          {[
                            {
                              label: "Export Current View",
                              sub: `${filteredValidations.length} validations`,
                              type: "current",
                              color: "#059669",
                            },
                            {
                              label: "Export All Validations",
                              sub: `${validations.length} total`,
                              type: "all",
                              color: "#2563eb",
                            },
                          ].map((opt) => (
                            <button
                              key={opt.type}
                              onClick={() => exportToExcel(opt.type)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors"
                              style={{ background: "transparent" }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#f9fafb")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <FileSpreadsheet
                                className="w-4 h-4 flex-shrink-0"
                                style={{ color: opt.color }}
                              />
                              <div>
                                <div
                                  style={{
                                    fontWeight: 500,
                                    color: "#111827",
                                    fontSize: 13,
                                  }}
                                >
                                  {opt.label}
                                </div>
                                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                                  {opt.sub}
                                </div>
                              </div>
                            </button>
                          ))}
                          <div
                            style={{
                              padding: "8px 16px",
                              fontSize: 11,
                              color: "#9ca3af",
                              borderTop: "1px solid #f3f4f6",
                            }}
                          >
                            Downloads as .xlsx format
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={loadValidations}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                    />
                    {loading ? "Refreshing..." : "Refresh"}
                  </button>

                  {/* Multi Select Toggle */}
                  <button
                    onClick={toggleCheckboxMode}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      showCheckboxes
                        ? "bg-gray-500 text-white hover:bg-gray-600"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {showCheckboxes ? "Cancel" : "Multi Select"}
                  </button>

                  {/* View Toggle */}
                  <div className="vv-view-tog" style={{ marginLeft: "auto" }}>
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
                    <span className="text-xs font-medium text-gray-500">
                      {selectedItems.length} selected
                    </span>
                    <button
                      onClick={() => handleBulkAction("approve")}
                      disabled={isProcessing}
                      className="approve-btn-sm"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleBulkAction("reject")}
                      disabled={isProcessing}
                      className="reject-btn-sm"
                    >
                      <ThumbsDown className="w-3 h-3" />
                      Reject
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Search & Filter */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #e5e7eb",
                background: "#f9fafb",
              }}
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by item name, brand, serial/scan code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="vv-search w-full pl-9 pr-8 py-2.5 rounded-xl text-sm text-gray-800 bg-white transition"
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
                <div className="flex items-center gap-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{ border: "1px solid #d1d5db" }}
                    className="rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none min-w-[130px]"
                  >
                    <option value="all">All Types</option>
                    <option value="device">Devices</option>
                    <option value="material">Materials</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ border: "1px solid #d1d5db" }}
                    className="rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none min-w-[130px]"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="vv-empty">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
                <p className="text-gray-500 text-sm font-medium">
                  Loading validations...
                </p>
              </div>
            ) : validations.length === 0 ? (
              <div className="vv-empty">
                <div
                  style={{
                    padding: 20,
                    borderRadius: 20,
                    background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
                    display: "inline-block",
                    marginBottom: 16,
                  }}
                >
                  <Shield className="w-12 h-12 text-blue-400" />
                </div>
                <h3 className="text-gray-900 font-semibold text-base mb-2">
                  No validations found
                </h3>
                <p className="text-gray-500 text-sm mb-5 max-w-xs">
                  Scan results will appear here for review.
                </p>
              </div>
            ) : filteredValidations.length === 0 ? (
              <div className="vv-empty">
                <Search className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-gray-900 font-semibold mb-2">
                  No matching validations
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  Try adjusting your search or filter.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition"
                >
                  <RefreshCw className="w-4 h-4" /> Clear Filters
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* Grid View */
              <div
                style={{
                  padding: 20,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))",
                  gap: 16,
                }}
              >
                {paginatedValidations.map((validation) => {
                  const sc = getStatusConfig(validation.validation_status);
                  const photoUrl = validation.photo_url;
                  return (
                    <div
                      key={validation.id_validation}
                      className="vv-grid-card"
                      onClick={() => handleViewDetail(validation)}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            flexShrink: 0,
                            background:
                              validation.validation_type === "device"
                                ? "#eff6ff"
                                : "#ecfdf5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          {photoUrl ? (
                            <img
                              src={
                                photoUrl.startsWith("http")
                                  ? photoUrl
                                  : `http://localhost:5001${photoUrl}`
                              }
                              alt="Scan result"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.parentElement.innerHTML = validation.validation_type === "device" ? '<Laptop className="w-5 h-5 text-blue-600" />' : '<Package className="w-5 h-5 text-emerald-600" />';
                              }}
                            />
                          ) : validation.validation_type === "device" ? (
                            <Laptop className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Package className="w-5 h-5 text-emerald-600" />
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${sc.badge} ${sc.border}`}
                        >
                          {sc.label}
                        </span>
                      </div>
                      <h3
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: "#111827",
                          marginBottom: 2,
                        }}
                        className="truncate"
                      >
                        {validation.item_name || "-"}
                      </h3>
                      <p
                        style={{
                          fontFamily: "DM Mono, monospace",
                          fontSize: 11,
                          color: "#9ca3af",
                          marginBottom: 8,
                        }}
                        className="truncate"
                      >
                        {validation.serial_or_code || "-"}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Calendar
                            style={{
                              width: 12,
                              height: 12,
                              color: "#9ca3af",
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 11, color: "#6b7280" }}>
                            {formatDate(validation.created_at)}
                          </span>
                        </div>
                        {validation.brand && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span style={{ fontSize: 11, color: "#6b7280" }}>
                              Brand: {validation.brand}
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingTop: 12,
                          borderTop: "1px solid #e5e7eb",
                        }}
                      >
                        <span
                          className={`px-2 py-1 text-[10px] font-medium rounded-full ${
                            validation.validation_type === "device"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {validation.validation_type === "device"
                            ? "Device"
                            : "Material"}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetail(validation);
                            }}
                            className="view-btn-sm"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                          {validation.validation_status === "pending" && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(validation);
                                }}
                                className="approve-btn-sm"
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(validation);
                                }}
                                className="reject-btn-sm"
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List View */
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      {showCheckboxes && (
                        <th className="vv-th w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              selectedItems.length ===
                                filteredValidations.length &&
                              filteredValidations.length > 0
                            }
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                      )}
                      <th
                        className="vv-th text-left hidden lg:table-cell"
                        onClick={() => handleSort("checking_name")}
                      >
                        <span style={{ display: "flex", alignItems: "center" }}>
                          Session {getSortIcon("checking_name")}
                        </span>
                      </th>
                      <th className="vv-th text-left">Photo</th>
                      <th
                        className="vv-th text-left"
                        onClick={() => handleSort("item_name")}
                      >
                        <span style={{ display: "flex", alignItems: "center" }}>
                          Item {getSortIcon("item_name")}
                        </span>
                      </th>
                      <th
                        className="vv-th text-left hidden md:table-cell"
                        onClick={() => handleSort("brand")}
                      >
                        <span style={{ display: "flex", alignItems: "center" }}>
                          Brand {getSortIcon("brand")}
                        </span>
                      </th>
                      <th
                        className="vv-th text-left hidden md:table-cell"
                        onClick={() => handleSort("serial_or_code")}
                      >
                        <span style={{ display: "flex", alignItems: "center" }}>
                          Code {getSortIcon("serial_or_code")}
                        </span>
                      </th>
                      <th
                        className="vv-th text-left"
                        onClick={() => handleSort("validation_status")}
                      >
                        <span style={{ display: "flex", alignItems: "center" }}>
                          Status {getSortIcon("validation_status")}
                        </span>
                      </th>
                      <th
                        className="vv-th text-left hidden xl:table-cell"
                        onClick={() => handleSort("created_at")}
                      >
                        <span style={{ display: "flex", alignItems: "center" }}>
                          Submitted {getSortIcon("created_at")}
                        </span>
                      </th>
                      <th className="vv-th text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedValidations.map((validation) => {
                      const sc = getStatusConfig(validation.validation_status);
                      const photoUrl = validation.photo_url;
                      const brand = validation.brand || "-";

                      return (
                        <tr
                          key={validation.id_validation}
                          className="vv-row"
                          onClick={() => handleViewDetail(validation)}
                        >
                          {showCheckboxes && (
                            <td className="vv-td text-center">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(
                                  validation.id_validation,
                                )}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleSelectItem(validation.id_validation);
                                }}
                                disabled={
                                  validation.validation_status !== "pending"
                                }
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                              />
                            </td>
                          )}
                          <td className="vv-td hidden lg:table-cell">
                            <div className="font-medium text-gray-800 text-sm">
                              {validation.checking_name || "-"}
                            </div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">
                              {validation.checking_number || "-"}
                            </div>
                          </td>
                          <td className="vv-td">
                            {photoUrl ? (
                              <img
                                src={
                                  photoUrl.startsWith("http")
                                    ? photoUrl
                                    : `http://localhost:5001${photoUrl}`
                                }
                                alt="Scan result"
                                className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:opacity-80 transition"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  Swal.fire({
                                    imageUrl: photoUrl.startsWith("http")
                                      ? photoUrl
                                      : `http://localhost:5001${photoUrl}`,
                                    imageAlt: "Scan Result",
                                    title: "Scan Result Preview",
                                    imageWidth: 400,
                                    imageHeight: "auto",
                                    confirmButtonColor: "#2563eb",
                                  });
                                }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.parentElement.innerHTML =
                                    '<div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><Camera className="w-5 h-5 text-gray-400" /></div>';
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
                              <div>
                                <div className="font-semibold text-gray-900 text-sm leading-tight">
                                  {validation.item_name || "-"}
                                </div>
                                <div className="mt-0.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      validation.validation_type === "device"
                                        ? "bg-blue-100 text-blue-700"
                                        : validation.validation_type ===
                                            "material"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {validation.validation_type === "device"
                                      ? "Device"
                                      : validation.validation_type ===
                                          "material"
                                        ? "Material"
                                        : "Unknown"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="vv-td hidden md:table-cell">
                            <span className="text-xs font-medium text-gray-500">
                              {brand}
                            </span>
                          </td>
                          <td className="vv-td hidden md:table-cell">
                            <code className="text-xs font-mono px-2 py-1 rounded text-gray-500">
                              {validation.serial_or_code || "-"}
                            </code>
                          </td>
                          <td className="vv-td">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0`}
                              />
                              {sc.label}
                            </span>
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
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetail(validation);
                                }}
                                className="view-btn-sm"
                                title="View Details"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              {validation.validation_status === "pending" && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApprove(validation);
                                    }}
                                    disabled={isProcessing}
                                    className="approve-btn-sm disabled:opacity-50"
                                    title="Approve"
                                  >
                                    <ThumbsUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReject(validation);
                                    }}
                                    disabled={isProcessing}
                                    className="reject-btn-sm disabled:opacity-50"
                                    title="Reject"
                                  >
                                    <ThumbsDown className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSingle(validation);
                                }}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
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

            {/* Footer / Pagination */}
            {!loading && filteredValidations.length > 0 && (
              <div className="vv-footer">
                <p style={{ fontSize: 12, color: "#6b7280" }}>
                  Showing{" "}
                  <span style={{ fontWeight: 600, color: "#374151" }}>
                    {(currentPage - 1) * itemsPerPage + 1}–
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredValidations.length,
                    )}
                  </span>{" "}
                  of{" "}
                  <span style={{ fontWeight: 600, color: "#374151" }}>
                    {filteredValidations.length}
                  </span>{" "}
                  validations
                  {typeFilter !== "all" && (
                    <span
                      style={{
                        marginLeft: 6,
                        padding: "2px 8px",
                        background: "#eff6ff",
                        color: "#2563eb",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {typeFilter === "device" ? "Devices" : "Materials"}
                    </span>
                  )}
                  {statusFilter !== "all" && (
                    <span
                      style={{
                        marginLeft: 6,
                        padding: "2px 8px",
                        background: "#fef3c7",
                        color: "#b45309",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {statusFilter}
                    </span>
                  )}
                  {searchTerm && (
                    <span style={{ color: "#9ca3af", marginLeft: 4 }}>
                      · "{searchTerm}"
                    </span>
                  )}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 text-xs text-gray-600 font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
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

        {/* Detail Modal - Keep existing modal code */}
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
                  <h2 className="text-lg font-semibold text-gray-900">
                    Validation Details
                  </h2>
                  {(() => {
                    const sc = getStatusConfig(detailModal.validation_status);
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}
                        />
                        {sc.label}
                      </span>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setDetailModal(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
                {detailModal.photo_url && (
                  <div className="rounded-lg overflow-hidden bg-gray-100 max-h-64">
                    <img
                      src={
                        detailModal.photo_url.startsWith("http")
                          ? detailModal.photo_url
                          : `http://localhost:5001${detailModal.photo_url}`
                      }
                      alt="Scan result"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.parentElement.innerHTML =
                          '<div class="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center"><Camera className="w-10 h-10 text-gray-400" /></div>';
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Item Name</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {detailModal.item_name || "-"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Type</p>
                    <p className="font-semibold text-gray-900 capitalize text-sm">
                      {detailModal.validation_type}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Brand</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {detailModal.brand || "-"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      {detailModal.validation_type === "device"
                        ? "Serial Number"
                        : "Scan Code"}
                    </p>
                    <code className="text-sm font-mono text-gray-800">
                      {detailModal.serial_or_code || "-"}
                    </code>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Unique Code</p>
                    <code className="text-sm font-mono text-gray-800">
                      {detailModal.unique_code || "-"}
                    </code>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Session</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {detailModal.checking_name || "-"}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    {detailModal.checking_number || "-"}
                  </p>
                  {detailModal.checking_date && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(detailModal.checking_date).toLocaleDateString(
                        "id-ID",
                      )}
                    </p>
                  )}
                </div>

                {/* Project Information */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Project</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {detailModal.project_name || "-"}
                  </p>
                </div>

                {/* Department Distribution */}
                {detailModal.departments &&
                  detailModal.departments.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-2">
                        Department Distribution
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {detailModal.departments.map((dept, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 bg-gray-200 px-2 py-1 rounded-full text-xs"
                          >
                            {dept.department_name}: {dept.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Receiver Assignments */}
                {detailModal.receivers && detailModal.receivers.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Receiver Assignments
                    </p>
                    <div className="space-y-1">
                      {detailModal.receivers.map((rec, idx) => (
                        <div key={idx} className="text-xs text-gray-600">
                          {rec.receiver_name || `Receiver ${rec.receiver_id}`} -{" "}
                          {rec.department_name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailModal.location_name && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Location</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900 text-sm">
                        {detailModal.location_name}
                      </span>
                    </div>
                  </div>
                )}

                {(detailModal.validation_notes ||
                  detailModal.rejection_reason) && (
                  <div
                    className={`rounded-lg p-3 ${
                      detailModal.validation_status === "rejected"
                        ? "bg-red-50 border border-red-100"
                        : "bg-emerald-50 border border-emerald-100"
                    }`}
                  >
                    <p className="text-xs font-semibold mb-1 text-gray-700">
                      {detailModal.validation_status === "rejected"
                        ? "Rejection Reason"
                        : "Validation Notes"}
                    </p>
                    <p className="text-sm text-gray-800">
                      {detailModal.validation_notes ||
                        detailModal.rejection_reason}
                    </p>
                    {detailModal.validated_by_name && (
                      <p className="text-xs text-gray-500 mt-2">
                        Validated by {detailModal.validated_by_name} at{" "}
                        {detailModal.validated_at
                          ? new Date(detailModal.validated_at).toLocaleString()
                          : "-"}
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
                      className="approve-btn-sm px-3 py-2"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setDetailModal(null);
                        handleReject(detailModal);
                      }}
                      className="reject-btn-sm px-3 py-2"
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