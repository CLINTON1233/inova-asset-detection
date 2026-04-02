"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import LayoutDashboard from "../components/LayoutDashboard";
import {
  Box,
  Calendar,
  MapPin,
  Loader2,
  Plus,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
  ArrowUp,
  Edit,
  ArrowDown,
  ScanLine,
  Filter,
  ChevronDown,
  X,
  Trash2,
  Cpu,
  Cable,
  Users,
  User,
  Building2,
} from "lucide-react";
import Swal from "sweetalert2";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";

export default function ScanningPreparationListPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sorting, setSorting] = useState({ id: "created_at", desc: true });
  const [mounted, setMounted] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchSessions();

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    let filtered = [...sessions];

    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.checking_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.checking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.location_name || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (s.project_name || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }

    if (sorting.id) {
      filtered.sort((a, b) => {
        let aVal = a[sorting.id];
        let bVal = b[sorting.id];
        if (sorting.id === "created_at") {
          aVal = new Date(a.created_at || a.checking_date);
          bVal = new Date(b.created_at || b.checking_date);
        }
        if (aVal < bVal) return sorting.desc ? 1 : -1;
        if (aVal > bVal) return sorting.desc ? -1 : 1;
        return 0;
      });
    }

    setFilteredSessions(filtered);
  }, [searchTerm, statusFilter, typeFilter, sessions, sorting]);

  const fetchSessionDetail = async (sessionId, type) => {
    if (sessionDetails[sessionId]) return sessionDetails[sessionId];

    try {
      let endpoint;
      if (type === "device") {
        endpoint = API_ENDPOINTS.DEVICES_SCANNING_PREP_DETAIL(sessionId);
      } else {
        endpoint = API_ENDPOINTS.MATERIALS_SCANNING_PREP_DETAIL(sessionId);
      }

      const response = await fetch(endpoint);
      const result = await response.json();

      if (result.success) {
        const data = result.data;

        const departmentsList = [];
        const receiversList = [];
        const itemsList = [];
        let projectName = "-";

        data.items.forEach((item) => {
          if (item.project_name && projectName === "-") {
            projectName = item.project_name;
          }

          itemsList.push({
            name:
              type === "device"
                ? item.device_name
                : item.item_name || item.material_name,
            detail:
              type === "device" ? item.device_detail : item.specifications,
            quantity: item.quantity,
            brand: item.brand,
            model: item.model,
            vendor: item.vendor,
            specifications: item.specifications,
            uom: item.uom,
          });

          // Departments
          if (item.departments && item.departments.length > 0) {
            item.departments.forEach((d) => {
              const existing = departmentsList.find(
                (dept) => dept.id === d.department_id,
              );
              if (existing) {
                existing.quantity += d.quantity;
              } else {
                departmentsList.push({
                  id: d.department_id,
                  name: d.department_name,
                  quantity: d.quantity,
                });
              }
            });
          }

          // Receivers - sekarang menggunakan receiver_name dari backend
          if (item.receivers && item.receivers.length > 0) {
            item.receivers.forEach((r) => {
              receiversList.push({
                name: r.receiver_name || `Receiver ${r.receiver_id}`,
                department: r.department_name,
                item_name:
                  type === "device"
                    ? item.device_name
                    : item.item_name || item.material_name,
                receiver_id: r.receiver_id,
              });
            });
          }
        });

        const detail = {
          departments: departmentsList,
          receivers: receiversList,
          items: itemsList,
          project_name: projectName,
          totalItems: data.items.length,
          totalQty: data.items.reduce((sum, i) => sum + (i.quantity || 0), 0),
        };

        setSessionDetails((prev) => ({ ...prev, [sessionId]: detail }));
        return detail;
      }
    } catch (error) {
      console.error("Error fetching session detail:", error);
      return null;
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.SCANNING_PREP_LIST_ALL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("API Response:", result);

      if (result.success) {
        const sessionsWithDetails = result.data.map((session) => {
          const items = session.items || [];
          const totalItems = items.length;
          const totalQty =
            session.totalQty ||
            items.reduce((sum, i) => sum + (i.quantity || 0), 0);

          const projectName = items[0]?.project_name || "-";

          const receiversList = [];
          items.forEach((item) => {
            if (item.receivers && item.receivers.length > 0) {
              item.receivers.forEach((r) => {
                if (r.receiver_name || r.receiver_id) {
                  receiversList.push({
                    name: r.receiver_name,
                    department: r.department_name,
                    item_name:
                      session.type === "device"
                        ? item.device_name
                        : item.material_name,
                  });
                }
              });
            }
          });

          const departmentsList = [];
          items.forEach((item) => {
            if (item.departments && item.departments.length > 0) {
              item.departments.forEach((d) => {
                if (
                  !departmentsList.find((dept) => dept.id === d.department_id)
                ) {
                  departmentsList.push({
                    id: d.department_id,
                    name: d.department_name,
                    quantity: d.quantity,
                  });
                } else {
                  const existing = departmentsList.find(
                    (dept) => dept.id === d.department_id,
                  );
                  if (existing) existing.quantity += d.quantity;
                }
              });
            }
          });

          let progress = session.progress || 0;
          let status = session.status || "pending";

          if (session.items && session.items.length > 0 && !session.progress) {
            const totalScanned = session.items.reduce(
              (sum, i) => sum + (i.scanned_count || 0),
              0,
            );
            progress =
              totalQty > 0 ? Math.round((totalScanned / totalQty) * 100) : 0;
            if (progress === 100) status = "completed";
            else if (progress > 0) status = "in-progress";
          }

          const sessionType =
            session.type || (session.category_id === 1 ? "device" : "material");

          return {
            ...session,
            type: sessionType,
            status: session.status || status,
            progress: session.progress || progress,
            totalItems,
            totalQty,
            project_name: projectName,
            receivers: receiversList,
            departments: departmentsList,
            category_name: session.category_name || "General",
            location_name: session.location_name || "No location",
            uniqueCode:
              session.checking_number || `SESS-${session.id_preparation}`,
          };
        });
        setSessions(sessionsWithDetails);
        setFilteredSessions(sessionsWithDetails);
      } else {
        throw new Error(
          result.message || result.error || "Failed to load sessions",
        );
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      Swal.fire({
        title: "Error!",
        text:
          error.message ||
          "Failed to load sessions. Please check if backend server is running.",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: sessions.length,
    pending: sessions.filter((s) => s.status === "pending").length,
    inProgress: sessions.filter((s) => s.status === "in-progress").length,
    completed: sessions.filter((s) => s.status === "completed").length,
    totalItems: sessions.reduce((sum, s) => sum + (s.totalItems || 0), 0),
    devices: sessions.filter((s) => s.type === "device").length,
    materials: sessions.filter((s) => s.type === "material").length,
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

  const getStatusConfig = (status) => {
    switch (status) {
      case "pending":
        return {
          dot: "bg-amber-400",
          text: "text-amber-700",
          bg: "bg-amber-50",
          border: "border-amber-200",
          label: "Pending",
        };
      case "in-progress":
        return {
          dot: "bg-blue-500",
          text: "text-blue-700",
          bg: "bg-blue-50",
          border: "border-blue-200",
          label: "In Progress",
        };
      case "completed":
        return {
          dot: "bg-emerald-500",
          text: "text-emerald-700",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          label: "Completed",
        };
      default:
        return {
          dot: "bg-gray-400",
          text: "text-gray-700",
          bg: "bg-gray-50",
          border: "border-gray-200",
          label: status,
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleDelete = async (prepId, checkingName, type) => {
    try {
      const result = await Swal.fire({
        title: "Delete Session?",
        text: `Are you sure you want to delete session "${checkingName}"? All related scanning data will also be deleted.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, Delete!",
        cancelButtonText: "Cancel",
        reverseButtons: true,
      });

      if (result.isConfirmed) {
        setLoading(true);

        let deleteEndpoint;
        if (type === "device") {
          deleteEndpoint = API_ENDPOINTS.DEVICES_SCANNING_PREP_DELETE(prepId);
        } else if (type === "material") {
          deleteEndpoint = API_ENDPOINTS.MATERIALS_SCANNING_PREP_DELETE(prepId);
        } else {
          throw new Error("Unknown session type");
        }

        const response = await fetch(deleteEndpoint, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (data.success) {
          setSessions((prevSessions) =>
            prevSessions.filter((s) => s.id_preparation !== prepId),
          );
          setFilteredSessions((prevFiltered) =>
            prevFiltered.filter((s) => s.id_preparation !== prepId),
          );
          setSessionDetails((prev) => {
            const newDetails = { ...prev };
            delete newDetails[prepId];
            return newDetails;
          });

          Swal.fire({
            title: "Success!",
            text: "Session deleted successfully",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          throw new Error(data.error || "Failed to delete session");
        }
      }
    } catch (error) {
      console.error("Delete error:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "An error occurred while deleting the session",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandSession = async (sessionId, type) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      if (!sessionDetails[sessionId]) {
        await fetchSessionDetail(sessionId, type);
      }
    }
  };

  if (!mounted) {
    return (
      <LayoutDashboard activeMenu={2}>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </LayoutDashboard>
    );
  }

  // Responsive KPI cards - mobile friendly
  const kpis = [
    {
      title: "Total Sessions",
      value: stats.total,
      sub: "All sessions",
      accent: "#2563eb",
    },
    {
      title: "Devices",
      value: stats.devices,
      sub: "Device sessions",
      accent: "#3b82f6",
    },
    {
      title: "Materials",
      value: stats.materials,
      sub: "Material sessions",
      accent: "#10b981",
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      sub: "Sessions active",
      accent: "#6366f1",
    },
    {
      title: "Completed",
      value: stats.completed,
      sub: "Sessions done",
      accent: "#10b981",
    },
  ];

  // For mobile, show fewer KPIs in a scrollable row
  const mobileKpis = kpis.slice(0, 4);

  return (
    <LayoutDashboard activeMenu={1}>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .sp-root { font-family: 'DM Sans', sans-serif; }
        .sp-root .mono { font-family: 'DM Mono', monospace; }

        .sp-card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          transition: box-shadow 0.2s ease;
        }
        .sp-card:hover {
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
        }

        .kpi-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px 12px;
          text-align: center;
        }

        .sp-th {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 10px 12px;
          background: #f9fafb;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        .sp-th:hover { color: #374151; }
        .sp-td {
          padding: 12px 12px;
          font-size: 13px;
          color: #374151;
          border-top: 1px solid #f3f4f6;
          vertical-align: middle;
        }
        .sp-row:hover { background: #f8faff; }

        .prog-track { background: #e5e7eb; border-radius: 99px; height: 5px; }
        .prog-fill  { background: #3b82f6; border-radius: 99px; height: 5px; transition: width 0.3s; }
        
        .expandable-row {
          transition: all 0.2s ease;
        }
        .expandable-content {
          background: #fafcff;
          border-top: 1px solid #f0f2f5;
        }

        @media (max-width: 768px) {
          .sp-td {
            padding: 10px 8px;
            font-size: 12px;
          }
          .sp-th {
            padding: 8px 8px;
            font-size: 10px;
          }
          .kpi-cell {
            padding: 12px 8px;
          }
          .kpi-cell span:first-of-type {
            font-size: 20px !important;
          }
        }
      `}</style>

      <div className="sp-root space-y-4 md:space-y-5">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ScanLine className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <h1 className="text-lg md:text-xl font-bold text-gray-900">
                Scanning Preparation List
              </h1>
            </div>
            <p className="text-xs md:text-sm text-gray-500">
              List of sessions prepared for asset scanning
            </p>
          </div>
          <button
            onClick={() => router.push("/create_scanning_preparation")}
            className="inline-flex items-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">New Session</span>
            <span className="xs:hidden">Create</span>
          </button>
        </div>

        {/* KPI Card - Responsive */}
        <div className="sp-card overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-gray-100">
            {(isMobile ? mobileKpis : kpis).map((d, i) => (
              <div key={i} className="kpi-cell">
                <p className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 md:mb-3">
                  {d.title}
                </p>
                <span
                  className="text-2xl md:text-3xl lg:text-4xl font-bold"
                  style={{ color: d.accent }}
                >
                  {d.value}
                </span>
                <p className="text-[10px] md:text-xs text-gray-400 mt-1 md:mt-2">
                  {d.sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Table Card */}
        <div className="sp-card overflow-hidden">
          {/* Toolbar - Responsive */}
          <div className="flex flex-col xs:flex-row flex-wrap items-stretch xs:items-center gap-2 p-3 md:p-5 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search session..."
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

            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[110px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="device">Devices</option>
                  <option value="material">Materials</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative flex-1 min-w-[110px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              <button
                onClick={fetchSessions}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden xs:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Table/List View - Responsive */}
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-20 text-center">
              <ScanLine className="w-14 h-14 text-gray-200 mx-auto mb-3" />
              <h3 className="text-gray-800 font-semibold text-lg mb-1">
                No sessions found
              </h3>
              <p className="text-gray-400 text-sm mb-5">
                Create your first scanning session to get started
              </p>
              <button
                onClick={() => router.push("/create_scanning_preparation")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-3.5 h-3.5" /> Create Session
              </button>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-16 text-center">
              <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <h3 className="text-gray-800 font-semibold mb-1">
                No matching sessions
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
              {/* Desktop Table View */}
              <table className="min-w-full hidden md:table">
                <thead>
                  <tr>
                    <th
                      className="sp-th text-left"
                      onClick={() => handleSort("checking_name")}
                    >
                      <span className="flex items-center">
                        Session {getSortIcon("checking_name")}
                      </span>
                    </th>
                    <th
                      className="sp-th text-left hidden lg:table-cell"
                      onClick={() => handleSort("checking_date")}
                    >
                      <span className="flex items-center">
                        Date {getSortIcon("checking_date")}
                      </span>
                    </th>
                    <th
                      className="sp-th text-left hidden xl:table-cell"
                      onClick={() => handleSort("location_name")}
                    >
                      <span className="flex items-center">
                        Location {getSortIcon("location_name")}
                      </span>
                    </th>
                    <th className="sp-th text-left hidden 2xl:table-cell">
                      <span className="flex items-center">Project</span>
                    </th>
                    <th
                      className="sp-th text-left"
                      onClick={() => handleSort("status")}
                    >
                      <span className="flex items-center">
                        Status {getSortIcon("status")}
                      </span>
                    </th>
                    <th className="sp-th text-left">Progress</th>
                    <th className="sp-th text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
            {filteredSessions.map((session, idx) => {
  const sc = getStatusConfig(session.status);
  const isExpanded = expandedSession === session.id_preparation;
  const detail = sessionDetails[session.id_preparation];
  const projectName = detail?.project_name || session?.project_name || "-"; 
  const uniqueKey = `${session.type}_${session.id_preparation}`; 

  return (
    <Fragment key={uniqueKey}>
      <tr className="sp-row transition-colors">
        <td className="sp-td">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                toggleExpandSession(
                  session.id_preparation,
                  session.type,
                )
              }
              className="p-1 hover:bg-gray-100 rounded transition flex-shrink-0"
            >
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
              {idx + 1}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 text-sm leading-tight truncate max-w-[200px]">
                {session.checking_name}
              </div>
              <div className="text-xs text-gray-400 mono mt-0.5 truncate">
                {session.checking_number}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    session.type === "device"
                      ? "bg-blue-100 text-blue-700"
                      : session.type === "material"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {session.type === "device"
                    ? "Device"
                    : session.type === "material"
                      ? "Material"
                      : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </td>
        <td className="sp-td hidden lg:table-cell">
          <span className="text-xs text-gray-600">
            {formatDate(session.checking_date)}
          </span>
        </td>
        <td className="sp-td hidden xl:table-cell">
          <span className="text-xs text-gray-600 truncate max-w-[140px] block">
            {session.location_name}
          </span>
        </td>
        <td className="sp-td hidden 2xl:table-cell">
          <span className="text-xs text-gray-600 truncate max-w-[120px] block">
            {projectName}
          </span>
        </td>
        <td className="sp-td">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border} whitespace-nowrap`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0`}
            />
            {sc.label}
          </span>
        </td>
        <td className="sp-td">
          <div className="flex items-center gap-2">
            <div className="prog-track w-16 md:w-20">
              <div
                className="prog-fill"
                style={{ width: `${session.progress || 0}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-600">
              {session.progress || 0}%
            </span>
          </div>
        </td>
        <td className="sp-td text-center">
          <div className="flex items-center justify-center gap-1 md:gap-2">
            <button
              onClick={() =>
                router.push(
                  `/scanning?prep_id=${session.id_preparation}&type=${session.type}`,
                )
              }
              className="inline-flex items-center gap-1 px-2 md:px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              title="Start Scanning"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scan</span>
            </button>
            <button
              onClick={() =>
                router.push(
                  `/edit_scanning_preparation?id=${session.id_preparation}&type=${session.type}`,
                )
              }
              className="inline-flex items-center gap-1 px-2 md:px-3 py-1.5 text-xs font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition"
              title="Edit Session"
            >
              <Edit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={() =>
                handleDelete(
                  session.id_preparation,
                  session.checking_name,
                  session.type,
                )
              }
              className="inline-flex items-center gap-1 px-2 md:px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              title="Delete Session"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Del</span>
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && detail && (
        <tr className="expandable-content">
          <td colSpan={7} className="p-4">
            <div className="space-y-4">
              {/* Project Info */}
              {projectName !== "-" && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-semibold text-gray-800">
                      Project Information
                    </h4>
                  </div>
                  <p className="text-sm text-gray-700">
                    Project:{" "}
                    <span className="font-medium">
                      {projectName}
                    </span>
                  </p>
                </div>
              )}

              {/* Items List */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-3 md:px-4 py-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-purple-600" />
                    <h4 className="text-sm font-semibold text-gray-800">
                      Items Preparation (
                      {detail.items?.length || 0} items)
                    </h4>
                  </div>
                </div>
                <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                  {detail.items?.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="p-3 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm break-words">
                            {item.name}
                          </div>
                          {item.detail && (
                            <div className="text-xs text-gray-500 mt-0.5 break-words">
                              {item.detail}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1 md:gap-2 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              Qty: {item.quantity}{" "}
                              {item.uom || ""}
                            </span>
                            {item.brand && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                Brand: {item.brand}
                              </span>
                            )}
                            {item.model && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                Model: {item.model}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Department Distribution */}
              {detail.departments &&
                detail.departments.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-semibold text-gray-800">
                        Department Distribution
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detail.departments.map(
                        (dept, deptIdx) => (
                          <span
                            key={deptIdx}
                            className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs"
                          >
                            {dept.name}: {dept.quantity}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Receiver Assignments */}
              {detail.receivers &&
                detail.receivers.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-green-600" />
                      <h4 className="text-sm font-semibold text-gray-800">
                        Receiver Assignments
                      </h4>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {detail.receivers.map((rec, recIdx) => (
                        <div
                          key={recIdx}
                          className="text-xs text-gray-600 break-words"
                        >
                          {rec.name} - {rec.department} (
                          {rec.item_name})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Items Summary */}
              <div className="border border-gray-200 rounded-lg p-3 bg-blue-50">
                <div className="flex items-center gap-2 mb-2">
                  <Box className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-gray-800">
                    Items Summary
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    Total Items:{" "}
                    <span className="font-semibold">
                      {detail.totalItems || 0}
                    </span>
                  </div>
                  <div>
                    Total Quantity:{" "}
                    <span className="font-semibold">
                      {detail.totalQty || 0}
                    </span>
                  </div>
                  <div>
                    Scanned:{" "}
                    <span className="font-semibold text-green-600">
                      {session.scannedCount || 0}
                    </span>
                  </div>
                  <div>
                    Remaining:{" "}
                    <span className="font-semibold text-orange-600">
                      {(detail.totalQty || 0) -
                        (session.scannedCount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
})}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100">
         {filteredSessions.map((session, idx) => {
  const sc = getStatusConfig(session.status);
  const isExpanded = expandedSession === session.id_preparation;
  const detail = sessionDetails[session.id_preparation];
  // PERBAIKAN: Ambil project_name dari session jika tidak ada di detail
  const projectName = detail?.project_name || session?.project_name || "-";
  const uniqueKey = `${session.type}_${session.id_preparation}`; // Key unik

  return (
    <Fragment key={uniqueKey}>
      <div className="p-3 hover:bg-gray-50 transition-colors">
        {/* Header with expand button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm leading-tight break-words">
                  {session.checking_name}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mono ml-8 break-words">
              {session.checking_number}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2 ml-8">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  session.type === "device"
                    ? "bg-blue-100 text-blue-700"
                    : session.type === "material"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {session.type === "device"
                  ? "Device"
                  : session.type === "material"
                    ? "Material"
                    : "Unknown"}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}
              >
                <span
                  className={`w-1 h-1 rounded-full ${sc.dot}`}
                />
                {sc.label}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(session.checking_date)}
              </span>
            </div>
          </div>
          <button
            onClick={() =>
              toggleExpandSession(
                session.id_preparation,
                session.type,
              )
            }
            className="p-1 hover:bg-gray-100 rounded transition flex-shrink-0"
          >
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Location and Project Info */}
        <div className="mt-2 ml-8 space-y-1">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{session.location_name}</span>
          </div>
          {/* PERBAIKAN: Tampilkan project_name langsung tanpa perlu dropdown */}
          {projectName && projectName !== "-" && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Building2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{projectName}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-3 ml-8">
          <div className="flex items-center gap-2">
            <div className="prog-track flex-1">
              <div
                className="prog-fill"
                style={{ width: `${session.progress || 0}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-600">
              {session.progress || 0}%
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 ml-8 flex flex-wrap gap-2">
          <button
            onClick={() =>
              router.push(
                `/scanning?prep_id=${session.id_preparation}&type=${session.type}`,
              )
            }
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            <ScanLine className="w-3.5 h-3.5" />
            Scan
          </button>
          <button
            onClick={() =>
              router.push(
                `/edit_scanning_preparation?id=${session.id_preparation}&type=${session.type}`,
              )
            }
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() =>
              handleDelete(
                session.id_preparation,
                session.checking_name,
                session.type,
              )
            }
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>

        {/* Expanded Details for Mobile */}
        {isExpanded && detail && (
          <div className="mt-3 ml-8 space-y-3 border-t border-gray-100 pt-3">
            {/* Items List - Mobile */}
            {detail.items && detail.items.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Box className="w-4 h-4 text-purple-600" />
                  <h4 className="text-xs font-semibold text-gray-800">
                    Items ({detail.items.length})
                  </h4>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {detail.items.slice(0, 5).map((item, itemIdx) => (
                    <div key={itemIdx} className="bg-gray-50 rounded p-2">
                      <div className="font-medium text-gray-900 text-xs break-words">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Qty: {item.quantity} {item.uom || ""}
                        {item.brand && ` · Brand: ${item.brand}`}
                        {item.model && ` · Model: ${item.model}`}
                      </div>
                    </div>
                  ))}
                  {detail.items.length > 5 && (
                    <p className="text-xs text-gray-400 text-center">
                      +{detail.items.length - 5} more items
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Department Distribution - Mobile */}
            {detail.departments && detail.departments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-semibold text-gray-800">
                    Departments
                  </h4>
                </div>
                <div className="flex flex-wrap gap-1">
                  {detail.departments.map((dept, deptIdx) => (
                    <span
                      key={deptIdx}
                      className="bg-gray-100 px-2 py-0.5 rounded-full text-xs"
                    >
                      {dept.name}: {dept.quantity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Receiver Assignments - Mobile */}
            {detail.receivers && detail.receivers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-green-600" />
                  <h4 className="text-xs font-semibold text-gray-800">
                    Receivers
                  </h4>
                </div>
                <div className="space-y-1">
                  {detail.receivers.map((rec, recIdx) => (
                    <div key={recIdx} className="text-xs text-gray-600">
                      {rec.name} - {rec.department} ({rec.item_name})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="bg-blue-50 rounded p-2">
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>
                  Total Items:{" "}
                  <span className="font-semibold">
                    {detail.totalItems || 0}
                  </span>
                </div>
                <div>
                  Total Qty:{" "}
                  <span className="font-semibold">
                    {detail.totalQty || 0}
                  </span>
                </div>
                <div>
                  Scanned:{" "}
                  <span className="font-semibold text-green-600">
                    {session.scannedCount || 0}
                  </span>
                </div>
                <div>
                  Remaining:{" "}
                  <span className="font-semibold text-orange-600">
                    {(detail.totalQty || 0) -
                      (session.scannedCount || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Fragment>
  );
})}
              </div>
            </div>
          )}

          {/* Footer */}
          {!loading && filteredSessions.length > 0 && (
            <div className="px-3 md:px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-2 rounded-b-2xl">
              <p className="text-xs text-gray-500 text-center sm:text-left">
                Showing{" "}
                <span className="font-semibold text-gray-700">
                  {filteredSessions.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-700">
                  {sessions.length}
                </span>{" "}
                sessions
                {(typeFilter !== "all" || statusFilter !== "all" || searchTerm) && (
                  <span className="text-gray-400 block sm:inline sm:ml-1">
                    {typeFilter !== "all" && ` · ${typeFilter === "device" ? "Devices" : "Materials"}`}
                    {statusFilter !== "all" && ` · ${statusFilter === "pending" ? "Pending" : statusFilter === "in-progress" ? "In Progress" : "Completed"}`}
                    {searchTerm && ` · "${searchTerm}"`}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400">
                Updated {new Date().toLocaleTimeString("en-US")}
              </p>
            </div>
          )}
        </div>
      </div>
    </LayoutDashboard>
  );
}