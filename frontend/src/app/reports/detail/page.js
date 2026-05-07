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
  CheckSquare,
  XCircle,
  Clock as ClockIcon,
  AlertCircle,
  UserCheck,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import LayoutDashboard from "../../components/LayoutDashboard";
import ProtectedPage from "../../components/ProtectedPage";
import API_BASE_URL from "../../../config/api";
import { useAuth } from "../../context/AuthContext";

export default function ReportDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const periodType = searchParams.get("period_type") || "monthly";
  const periodKey = searchParams.get("period_key") || "";
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const reportId = searchParams.get("report_id");

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sorting, setSorting] = useState({ id: "checking_date", desc: true });
  const [viewMode, setViewMode] = useState("list");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationAction, setVerificationAction] = useState(null);
  const [updatingVerification, setUpdatingVerification] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentReportId, setCurrentReportId] = useState(reportId);

  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem("user_data");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUserRole(parsed.role);
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    fetchReportDetail();
    if (reportId) {
      fetchVerificationStatus(reportId);
    }
  }, [periodType, periodKey, year, month]);

  useEffect(() => {
    ensureAndFetchVerification();
  }, [periodType, periodKey, year, month, reportId]);

  const ensureAndFetchVerification = async () => {
    try {
      if (reportId) {
        fetchVerificationStatus(reportId);
        return;
      }

      // Create report if doesn't exist
      const res = await fetch(`${API_BASE_URL}/api/reports/ensure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_key: periodKey, period_type: periodType, year, month })
      });
      const result = await res.json();
      if (result.success) {
        setCurrentReportId(result.data.id_report);
        fetchVerificationStatus(result.data.id_report);
      }
    } catch (err) {
      console.error('Error ensuring report:', err);
    }
  };

  const fetchVerificationStatus = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/verification/${id}`);
      const result = await response.json();
      if (result.success) {
        setVerificationStatus(result.data);
        setVerificationNotes(result.data.verification_notes || '');
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  };

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

  const handleVerification = async (status) => {
    if (!currentReportId) {
      Swal.fire({ title: 'Error!', text: 'Report ID not found', icon: 'error' });
      return;
    }

    let notes = verificationNotes;

    if (status === "rejected") {
      const result = await Swal.fire({
        title: "Alasan Penolakan",
        text: "Silakan masukkan alasan mengapa laporan ini ditolak:",
        input: "textarea",
        inputPlaceholder: "Contoh: Pengecekan laptop masih kurang 5 unit, silakan lengkapi...",
        showCancelButton: true,
        confirmButtonText: "Kirim",
        cancelButtonText: "Batal",
      });

      if (!result.isConfirmed) return;
      notes = result.value;
      if (!notes || notes.trim() === "") {
        Swal.fire({
          title: "Error!",
          text: "Alasan penolakan harus diisi",
          icon: "error",
        });
        return;
      }
      setVerificationNotes(notes);
    } else if (status === "approved") {
      const result = await Swal.fire({
        title: "Konfirmasi Persetujuan",
        text: "Apakah Anda yakin ingin menyetujui laporan ini?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Ya, Setujui",
        cancelButtonText: "Batal",
      });

      if (!result.isConfirmed) return;
    } else if (status === "on_review") {
      const result = await Swal.fire({
        title: "Mulai Review",
        text: "Laporan akan ditandai sebagai sedang direview",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Ya, Mulai Review",
        cancelButtonText: "Batal",
      });

      if (!result.isConfirmed) return;
    }

    setUpdatingVerification(true);

    try {
      const userId = user?.id_user;
      if (!userId) {
        const userData = localStorage.getItem("user_data");
        if (userData) {
          const parsed = JSON.parse(userData);
          var verifiedById = parsed.id;
        }
      }

      const response = await fetch(
        `${API_BASE_URL}/api/reports/verify/${currentReportId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            verification_status: status,
            verification_notes: notes,
            verified_by: user?.id_user || verifiedById,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        Swal.fire({
          title: "Berhasil!",
          text:
            status === "approved"
              ? "Laporan telah disetujui"
              : status === "rejected"
                ? "Laporan telah ditolak"
                : "Laporan sedang dalam review",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        fetchVerificationStatus(currentReportId);
        setShowVerificationModal(false);
        setVerificationAction(null);
      } else {
        throw new Error(result.error || "Failed to update verification");
      }
    } catch (error) {
      console.error("Error updating verification:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to update verification",
        icon: "error",
      });
    } finally {
      setUpdatingVerification(false);
    }
  };

  // Bulk verification for multiple sessions
  const handleBulkVerification = async (status) => {
    if (selectedSessions.length === 0) {
      Swal.fire({
        title: "No Items Selected",
        text: "Please select at least one session to process.",
        icon: "info",
      });
      return;
    }

    let notes = "";

    if (status === "rejected") {
      const result = await Swal.fire({
        title: "Alasan Penolakan",
        text: "Silakan masukkan alasan mengapa sesi-sesi ini ditolak:",
        input: "textarea",
        inputPlaceholder: "Contoh: Pengecekan laptop masih kurang 5 unit, silakan lengkapi...",
        showCancelButton: true,
        confirmButtonText: "Kirim",
        cancelButtonText: "Batal",
      });

      if (!result.isConfirmed) return;
      notes = result.value;
      if (!notes || notes.trim() === "") {
        Swal.fire({
          title: "Error!",
          text: "Alasan penolakan harus diisi",
          icon: "error",
        });
        return;
      }
    } else if (status === "approved") {
      const result = await Swal.fire({
        title: "Konfirmasi Persetujuan",
        text: `Apakah Anda yakin ingin menyetujui ${selectedSessions.length} sesi laporan?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Ya, Setujui",
        cancelButtonText: "Batal",
      });

      if (!result.isConfirmed) return;
    } else if (status === "on_review") {
      const result = await Swal.fire({
        title: "Mulai Review",
        text: `Apakah Anda yakin ingin mereview ${selectedSessions.length} sesi laporan?`,
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Ya, Mulai Review",
        cancelButtonText: "Batal",
      });

      if (!result.isConfirmed) return;
    }

    setUpdatingVerification(true);

    try {
      const userId = user?.id_user;
      let verifiedById = userId;
      if (!verifiedById) {
        const userData = localStorage.getItem("user_data");
        if (userData) {
          const parsed = JSON.parse(userData);
          verifiedById = parsed.id;
        }
      }

      const response = await fetch(
        `${API_BASE_URL}/api/reports/bulk-verify-sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_ids: selectedSessions,
            report_id: currentReportId,
            verification_status: status,
            verification_notes: notes,
            verified_by: verifiedById,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        Swal.fire({
          title: "Berhasil!",
          text: `${selectedSessions.length} sesi laporan telah ${status === "approved" ? "disetujui" : status === "rejected" ? "ditolak" : "direview"}`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        setSelectedSessions([]);
        fetchReportDetail();
      } else {
        throw new Error(result.error || "Failed to update verification");
      }
    } catch (error) {
      console.error("Error updating verification:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to update verification",
        icon: "error",
      });
    } finally {
      setUpdatingVerification(false);
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

  const getVerificationBadge = () => {
    if (!verificationStatus) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
          <ClockIcon className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">Pending Review</span>
        </div>
      );
    }

    const status = verificationStatus.verification_status;
    const config = {
      pending_review: {
        icon: <ClockIcon className="w-4 h-4" />,
        text: "Belum Direview",
        bgClass: "bg-gray-100",
        textClass: "text-gray-600",
        iconClass: "text-gray-500",
      },
      on_review: {
        icon: <AlertCircle className="w-4 h-4" />,
        text: "On Review",
        bgClass: "bg-yellow-100",
        textClass: "text-yellow-700",
        iconClass: "text-yellow-500",
      },
      approved: {
        icon: <CheckCircle className="w-4 h-4" />,
        text: "Disetujui",
        bgClass: "bg-green-100",
        textClass: "text-green-700",
        iconClass: "text-green-500",
      },
      rejected: {
        icon: <XCircle className="w-4 h-4" />,
        text: "Ditolak",
        bgClass: "bg-red-100",
        textClass: "text-red-700",
        iconClass: "text-red-500",
      },
    };

    const current = config[status] || config.pending_review;

    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${current.bgClass}`}>
        <span className={current.iconClass}>{current.icon}</span>
        <span className={`text-xs font-medium ${current.textClass}`}>{current.text}</span>
      </div>
    );
  };

  const toggleCheckboxMode = () => {
    setShowCheckboxes(!showCheckboxes);
    if (showCheckboxes) {
      setSelectedSessions([]);
    }
  };

  const handleSelectAll = () => {
    if (selectedSessions.length === filteredSessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(filteredSessions.map((s) => s.id_preparation));
    }
  };

  const handleSelectSession = (id) => {
    if (selectedSessions.includes(id)) {
      setSelectedSessions(selectedSessions.filter((i) => i !== id));
    } else {
      setSelectedSessions([...selectedSessions, id]);
    }
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

  // Check if user is superadmin
  const isSuperAdmin = userRole === "superadmin";

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
      <LayoutDashboard activeMenu="reports">
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
          
          .rd-bulk-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #1e293b;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 40;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
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
                <div className="flex-1">
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

                {/* Verification Badge & Actions for Super Admin */}
                <div className="flex items-center gap-3 flex-wrap">
                  {getVerificationBadge()}

                  {isSuperAdmin && currentReportId && (
                    <>
                      {verificationStatus?.verification_status !== "approved" && (
                        <button
                          onClick={() => handleVerification("approved")}
                          disabled={updatingVerification}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          Approve
                        </button>
                      )}

                      {verificationStatus?.verification_status !== "rejected" && (
                        <button
                          onClick={() => handleVerification("rejected")}
                          disabled={updatingVerification}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                        >
                          <ThumbsDown className="w-4 h-4" />
                          Reject
                        </button>
                      )}

                      {verificationStatus?.verification_status === "pending_review" && (
                        <button
                          onClick={() => handleVerification("on_review")}
                          disabled={updatingVerification}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
                        >
                          <ClockIcon className="w-4 h-4" />
                          Start Review
                        </button>
                      )}
                    </>
                  )}

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

              {/* Verification Notes for Rejected/On Review */}
              {verificationStatus?.verification_status === "rejected" && verificationStatus?.verification_notes && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-700">Alasan Penolakan:</p>
                      <p className="text-sm text-red-600">{verificationStatus.verification_notes}</p>
                      {verificationStatus.verified_by_name && (
                        <p className="text-xs text-red-400 mt-1">
                          Diverifikasi oleh: {verificationStatus.verified_by_name} pada {formatDate(verificationStatus.verified_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {verificationStatus?.verification_status === "on_review" && verificationStatus?.verification_notes && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-yellow-700">Catatan Review:</p>
                      <p className="text-sm text-yellow-600">{verificationStatus.verification_notes}</p>
                      {verificationStatus.verified_by_name && (
                        <p className="text-xs text-yellow-400 mt-1">
                          Direview oleh: {verificationStatus.verified_by_name} pada {formatDate(verificationStatus.verified_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {verificationStatus?.verification_status === "approved" && verificationStatus?.verified_by_name && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-2">
                    <UserCheck className="w-4 h-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-green-600">
                        Disetujui oleh: <span className="font-semibold">{verificationStatus.verified_by_name}</span>
                      </p>
                      <p className="text-xs text-green-500">
                        Pada tanggal: {formatDate(verificationStatus.verified_at)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
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

                <div className="flex items-center gap-2">
                  {/* Multi Select Toggle - Only for Superadmin */}
                  {isSuperAdmin && (
                    <button
                      onClick={toggleCheckboxMode}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${showCheckboxes
                        ? "bg-gray-500 text-white hover:bg-gray-600"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                      {showCheckboxes ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Cancel</span>
                        </>
                      ) : (
                        <>
                          <span>☑</span>
                          <span className="hidden sm:inline">Multi Select</span>
                        </>
                      )}
                    </button>
                  )}

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

              {/* Bulk Action Buttons for Superadmin */}
              {isSuperAdmin && showCheckboxes && selectedSessions.length > 0 && (
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleBulkVerification("approved")}
                    disabled={updatingVerification}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50 rounded-lg"
                  >
                    <ThumbsUp className="w-3 h-3" /> Approve ({selectedSessions.length})
                  </button>
                  <button
                    onClick={() => handleBulkVerification("rejected")}
                    disabled={updatingVerification}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 rounded-lg"
                  >
                    <ThumbsDown className="w-3 h-3" /> Reject ({selectedSessions.length})
                  </button>
                  <button
                    onClick={() => handleBulkVerification("on_review")}
                    disabled={updatingVerification}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 transition disabled:opacity-50 rounded-lg"
                  >
                    <ClockIcon className="w-3 h-3" /> Review ({selectedSessions.length})
                  </button>
                  <span className="text-xs font-medium text-gray-500 ml-2">
                    {selectedSessions.length} selected
                  </span>
                </div>
              )}
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
                        {showCheckboxes && isSuperAdmin && (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedSessions.includes(session.id_preparation)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectSession(session.id_preparation);
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              style={{ width: 18, height: 18 }}
                            />
                          </div>
                        )}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${session.type === "device"
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
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${session.type === "device"
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
                      {showCheckboxes && isSuperAdmin && (
                        <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-10">
                          <input
                            type="checkbox"
                            checked={selectedSessions.length === filteredSessions.length && filteredSessions.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                      )}
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
                        {showCheckboxes && isSuperAdmin && (
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedSessions.includes(session.id_preparation)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectSession(session.id_preparation);
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${session.type === "device"
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
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${session.type === "device"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                              }`}
                          >
                            {session.type === "device" ? "Device" : "Material"}
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-gray-600 truncate max-w-[150px]">
                              {session.location_name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-gray-600 truncate max-w-[120px]">
                              {session.project_name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-bold text-gray-900">
                            {Math.floor(session.total_items || 0)}
                          </span>{" "}
                          Items
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

        {/* Mobile Bulk Action Bar */}
        {isSuperAdmin && showCheckboxes && selectedSessions.length > 0 && (
          <div className="rd-bulk-bar">
            <span className="text-xs font-semibold text-white opacity-70">
              {selectedSessions.length} selected
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => handleBulkVerification("approved")}
                disabled={updatingVerification}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50 rounded-lg"
              >
                <ThumbsUp className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                onClick={() => handleBulkVerification("rejected")}
                disabled={updatingVerification}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 rounded-lg"
              >
                <ThumbsDown className="w-3.5 h-3.5" /> Reject
              </button>
              <button
                onClick={() => handleBulkVerification("on_review")}
                disabled={updatingVerification}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 transition disabled:opacity-50 rounded-lg"
              >
                <ClockIcon className="w-3.5 h-3.5" /> Review
              </button>
            </div>
          </div>
        )}

        {/* Extra padding for mobile bulk bar */}
        {isSuperAdmin && showCheckboxes && selectedSessions.length > 0 && (
          <div className="h-16" />
        )}
      </LayoutDashboard>
    </ProtectedPage>
  );
}