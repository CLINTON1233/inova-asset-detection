"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import LayoutDashboard from "../components/LayoutDashboard";
import {
  Package,
  Calendar,
  MapPin,
  Box,
  Eye,
  Trash2,
  Loader2,
  Plus,
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  X,
  Cpu,
  Cable,
  RefreshCw,
  Grid,
  List,
  ChevronDown,
  FileSpreadsheet,
  ArrowUp,
  ArrowDown,
  MoreVertical,
} from "lucide-react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";

export default function ScanningSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [sorting, setSorting] = useState({ id: "created_at", desc: true });
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
    .bm-root { font-family: 'DM Sans', sans-serif; }
    .card { 
      background: #ffffff; 
      border-radius: 16px; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      transition: box-shadow 0.2s ease;
    }
    .card:hover {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
    .section-title { 
      font-size: 13px; 
      font-weight: 600; 
      color: #6b7280; 
      text-transform: uppercase; 
      letter-spacing: 0.05em; 
      margin-bottom: 16px; 
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-in-progress { background: #dbeafe; color: #1e40af; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    
    /* Gradient cards */
    .stat-card-blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
    .stat-card-indigo { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); }
    .stat-card-emerald { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .stat-card-amber { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .stat-card-purple { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
  `;

  useEffect(() => {
    setMounted(true);
    fetchSessions();
  }, []);

  useEffect(() => {
    // Filter sessions based on search and status
    let filtered = [...sessions];
    
    if (searchTerm) {
      filtered = filtered.filter(session => 
        session.checking_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.checking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (session.location_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(session => session.status === statusFilter);
    }

    // Sorting
    if (sorting.id) {
      filtered.sort((a, b) => {
        let aVal = a[sorting.id];
        let bVal = b[sorting.id];
        
        if (sorting.id === "totalItems") {
          aVal = a.totalItems;
          bVal = b.totalItems;
        } else if (sorting.id === "totalQty") {
          aVal = a.totalQty;
          bVal = b.totalQty;
        } else if (sorting.id === "created_at") {
          aVal = new Date(a.created_at || a.checking_date);
          bVal = new Date(b.created_at || b.checking_date);
        }
        
        if (aVal < bVal) return sorting.desc ? 1 : -1;
        if (aVal > bVal) return sorting.desc ? -1 : 1;
        return 0;
      });
    }
    
    setFilteredSessions(filtered);
  }, [searchTerm, statusFilter, sessions, sorting]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.SCANNING_PREP_LIST);
      const data = await response.json();
      
      if (data.success) {
        // Hitung status berdasarkan progress (simulasi)
        const sessionsWithStatus = data.data.map(session => {
          const totalItems = session.items?.length || 0;
          const totalQty = session.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
          
          // Tentukan status (contoh, nanti bisa dari database)
          let status = 'pending';
          if (session.created_at) {
            const createdDate = new Date(session.created_at);
            const now = new Date();
            const diffDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays > 7) status = 'completed';
            else if (diffDays > 2) status = 'in-progress';
          }
          
          return {
            ...session,
            status,
            totalItems,
            totalQty,
            category: session.category_name || 'General',
            uniqueCode: `SESS-${session.id_preparation}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          };
        });
        
        setSessions(sessionsWithStatus);
        setFilteredSessions(sessionsWithStatus);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to load scanning sessions",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
    } finally {
      setLoading(false);
    }
  };

  // Hitung statistik
  const stats = {
    total: sessions.length,
    pending: sessions.filter(s => s.status === 'pending').length,
    inProgress: sessions.filter(s => s.status === 'in-progress').length,
    completed: sessions.filter(s => s.status === 'completed').length,
    totalItems: sessions.reduce((sum, s) => sum + (s.totalItems || 0), 0),
    totalQty: sessions.reduce((sum, s) => sum + (s.totalQty || 0), 0),
  };

  const handleViewSession = (sessionId) => {
    router.push(`/scanning?prep_id=${sessionId}`);
  };

  const handleDeleteSession = async (session) => {
    const result = await Swal.fire({
      title: "Delete Session?",
      html: `
        <div class="text-left text-sm font-sans">
          <p class="font-semibold text-gray-900">${session.checking_name}</p>
          <p class="text-gray-600 text-xs mt-1 font-mono">${session.checking_number}</p>
          <div class="mt-3 pt-3 border-t border-gray-200">
            <div class="flex justify-between text-xs">
              <span class="text-gray-500">Items:</span>
              <span class="font-medium text-gray-900">${session.totalItems}</span>
            </div>
            <div class="flex justify-between text-xs mt-1">
              <span class="text-gray-500">Total Quantity:</span>
              <span class="font-medium text-gray-900">${session.totalQty}</span>
            </div>
            <div class="flex justify-between text-xs mt-1">
              <span class="text-gray-500">Location:</span>
              <span class="font-medium text-gray-900">${session.location_name || 'No location'}</span>
            </div>
          </div>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      reverseButtons: true,
      customClass: {
        popup: "rounded-xl",
        confirmButton: "px-6 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition",
        cancelButton: "px-6 py-2 text-sm font-medium rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition mr-2",
      },
    });

    if (result.isConfirmed) {
      // Di sini nanti panggil API delete
      Swal.fire({
        title: "Deleted!",
        text: "Session has been deleted.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      
      // Refresh list
      fetchSessions();
    }
  };

  const handleShowDetail = (session) => {
    Swal.fire({
      title: `<div class="font-dm-sans text-lg font-semibold text-gray-900">Session Details</div>`,
      html: `
        <div class="font-dm-sans text-left space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          <div>
            <h4 class="text-base font-semibold text-gray-900">${session.checking_name}</h4>
            <p class="text-xs text-gray-500 mt-1 font-mono">${session.checking_number}</p>
          </div>

          <div>
            <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">INFORMATION</h5>
            <div class="bg-gray-50 rounded-lg p-3 space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-600">Category</span>
                <span class="text-xs font-medium text-blue-700">${session.category_name || 'General'}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-600">Unique Code</span>
                <span class="text-xs font-mono text-blue-600">${session.uniqueCode}</span>
              </div>
            </div>
          </div>

          <div>
            <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">ITEMS</h5>
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="space-y-2 max-h-32 overflow-y-auto">
                ${session.items?.map((item, idx) => `
                  <div key=${idx} class="flex justify-between items-center text-xs border-b border-gray-200 pb-1 last:border-0">
                    <span class="text-gray-700">${item.item_name}</span>
                    <span class="text-gray-500 font-mono">x${item.quantity}</span>
                  </div>
                `).join('') || '<p class="text-xs text-gray-500">No items</p>'}
              </div>
              <div class="mt-2 pt-2 border-t border-gray-200 flex justify-between text-xs font-medium">
                <span class="text-gray-700">Total</span>
                <span class="text-gray-900">${session.totalItems} items (${session.totalQty} qty)</span>
              </div>
            </div>
          </div>

          <div>
            <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">LOCATION</h5>
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-600">Location</span>
                <span class="text-xs font-medium text-gray-700">${session.location_name || 'No location'}</span>
              </div>
            </div>
          </div>

          <div>
            <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">DATE</h5>
            <div class="bg-gray-50 rounded-lg p-3 space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-600">Checking Date</span>
                <span class="text-xs font-medium text-gray-700">${new Date(session.checking_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-600">Created At</span>
                <span class="text-xs font-medium text-gray-700">${new Date(session.created_at).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <div>
            <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">STATUS</h5>
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-600">Current Status</span>
                <span class="text-xs font-medium px-2 py-1 rounded-full ${
                  session.status === 'completed' ? 'bg-green-100 text-green-700' :
                  session.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }">
                  ${session.status === 'completed' ? 'Completed' : 
                    session.status === 'in-progress' ? 'In Progress' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          ${session.remarks ? `
            <div>
              <h5 class="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">REMARKS</h5>
              <div class="bg-gray-50 rounded-lg p-3">
                <p class="text-xs text-gray-700">${session.remarks}</p>
              </div>
            </div>
          ` : ''}
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

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending':
        return { bg: "bg-amber-100", text: "text-amber-700", label: "Pending", icon: Clock };
      case 'in-progress':
        return { bg: "bg-blue-100", text: "text-blue-700", label: "In Progress", icon: Loader2 };
      case 'completed':
        return { bg: "bg-green-100", text: "text-green-700", label: "Completed", icon: CheckCircle };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", label: status, icon: Clock };
    }
  };

  const getCategoryIcon = (category) => {
    if (category === "Materials") {
      return <Cable className="w-4 h-4 text-green-600" />;
    }
    return <Cpu className="w-4 h-4 text-blue-600" />;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return "Never";
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

  // Export to Excel
  const exportToExcel = (exportType = "current") => {
    try {
      let dataToExport = [];

      if (exportType === "current") {
        dataToExport = filteredSessions.map((session) => ({
          "Session Name": session.checking_name,
          "Session Number": session.checking_number,
          "Category": session.category_name || 'General',
          "Location": session.location_name || 'No location',
          "Items Count": session.totalItems,
          "Total Quantity": session.totalQty,
          "Status": session.status === 'pending' ? 'Pending' : 
                   session.status === 'in-progress' ? 'In Progress' : 'Completed',
          "Checking Date": new Date(session.checking_date).toLocaleDateString('id-ID'),
          "Created At": new Date(session.created_at).toLocaleString('id-ID'),
          "Remarks": session.remarks || '',
        }));
      } else if (exportType === "all") {
        dataToExport = sessions.map((session) => ({
          "Session Name": session.checking_name,
          "Session Number": session.checking_number,
          "Category": session.category_name || 'General',
          "Location": session.location_name || 'No location',
          "Items Count": session.totalItems,
          "Total Quantity": session.totalQty,
          "Status": session.status === 'pending' ? 'Pending' : 
                   session.status === 'in-progress' ? 'In Progress' : 'Completed',
          "Checking Date": new Date(session.checking_date).toLocaleDateString('id-ID'),
          "Created At": new Date(session.created_at).toLocaleString('id-ID'),
          "Remarks": session.remarks || '',
        }));
      } else {
        const statusMap = {
          pending: 'Pending',
          'in-progress': 'In Progress',
          completed: 'Completed'
        };
        dataToExport = sessions
          .filter(session => session.status === exportType)
          .map((session) => ({
            "Session Name": session.checking_name,
            "Session Number": session.checking_number,
            "Category": session.category_name || 'General',
            "Location": session.location_name || 'No location',
            "Items Count": session.totalItems,
            "Total Quantity": session.totalQty,
            "Status": statusMap[exportType],
            "Checking Date": new Date(session.checking_date).toLocaleDateString('id-ID'),
            "Created At": new Date(session.created_at).toLocaleString('id-ID'),
            "Remarks": session.remarks || '',
          }));
      }

      if (dataToExport.length === 0) {
        Swal.fire("No Data", "No data to export", "info");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wscols = [
        { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 25 },
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 20 }, { wch: 30 }
      ];
      ws["!cols"] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Scanning Sessions");

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      let filename = `scanning_sessions_${exportType}_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
      setShowExportDropdown(false);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      Swal.fire("Error", "Failed to export data", "error");
    }
  };

  if (!mounted) {
    return (
      <LayoutDashboard activeMenu={2}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </LayoutDashboard>
    );
  }

  return (
    <LayoutDashboard activeMenu={2}>
      <style>{styles}</style>

      <div className="bm-root space-y-5 p-3 md:p-6 bg-gray-50 min-h-screen">
        {/* HEADER SECTION */}
         <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Package className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                 Scanning Sessions Management
                </h1>
              </div>
              <p className="text-gray-500 text-sm">
                List Scanning Sessions
              </p>
            </div>
          </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* TOTAL SESSIONS CARD */}
          <div className="stat-card-blue text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
              <div className="p-2 bg-white/20 rounded-lg">
                <Package className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-2xl md:text-3xl font-bold">{stats.total}</span>
            </div>
            <p className="mt-2 text-sm font-medium uppercase opacity-90">Total Sessions</p>
            <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              <span className="truncate">All scanning sessions</span>
            </div>
          </div>

          {/* IN PROGRESS CARD */}
          <div className="stat-card-indigo text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
              <div className="p-2 bg-white/20 rounded-lg">
                <Loader2 className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-2xl md:text-3xl font-bold">{stats.inProgress}</span>
            </div>
            <p className="mt-2 text-sm font-medium uppercase opacity-90">In Progress</p>
            <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              <span className="truncate">Active scanning sessions</span>
            </div>
          </div>

          {/* COMPLETED CARD */}
          <div className="stat-card-emerald text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-2xl md:text-3xl font-bold">{stats.completed}</span>
            </div>
            <p className="mt-2 text-sm font-medium uppercase opacity-90">Completed</p>
            <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              <span className="truncate">Finished sessions</span>
            </div>
          </div>

          {/* PENDING CARD */}
          <div className="stat-card-amber text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
              <div className="p-2 bg-white/20 rounded-lg">
                <Clock className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-2xl md:text-3xl font-bold">{stats.pending}</span>
            </div>
            <p className="mt-2 text-sm font-medium uppercase opacity-90">Pending</p>
            <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              <span className="truncate">Not started yet</span>
            </div>
          </div>

          {/* TOTAL ITEMS CARD */}
          <div className="stat-card-purple text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
              <div className="p-2 bg-white/20 rounded-lg">
                <Box className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-2xl md:text-3xl font-bold">{stats.totalItems}</span>
            </div>
            <p className="mt-2 text-sm font-medium uppercase opacity-90">Total Items</p>
            <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              <span className="truncate">Across all sessions</span>
            </div>
          </div>
        </div>

        {/* SESSIONS TABLE SECTION */}
        <div className="card overflow-hidden">
          {/* Card Header with Action Buttons */}
          <div className="p-4 md:p-6 border-b border-gray-200">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  All Scanning Sessions
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Manage and monitor all your scanning sessions
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
                              <div className="text-xs text-gray-500">{filteredSessions.length} sessions</div>
                            </div>
                          </button>
                          <button
                            onClick={() => exportToExcel("all")}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                            <div className="text-left">
                              <div className="font-medium">Export All Sessions</div>
                              <div className="text-xs text-gray-500">{sessions.length} total sessions</div>
                            </div>
                          </button>
                          <button
                            onClick={() => exportToExcel("completed")}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                            <div className="text-left">
                              <div className="font-medium">Export Completed Only</div>
                              <div className="text-xs text-gray-500">{stats.completed} completed</div>
                            </div>
                          </button>
                          <button
                            onClick={() => exportToExcel("in-progress")}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                            <div className="text-left">
                              <div className="font-medium">Export In Progress</div>
                              <div className="text-xs text-gray-500">{stats.inProgress} in progress</div>
                            </div>
                          </button>
                          <button
                            onClick={() => exportToExcel("pending")}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                            <div className="text-left">
                              <div className="font-medium">Export Pending Only</div>
                              <div className="text-xs text-gray-500">{stats.pending} pending</div>
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
                  onClick={fetchSessions}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-all disabled:opacity-50 w-full md:w-auto"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Refreshing..." : "Refresh"}
                </button>

                {/* Create New Session Button */}
                <button
                  onClick={() => router.push("/scanning_preparation")}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-600 hover:to-blue-600 text-white px-4 py-2.5 rounded-lg text-sm transition-all w-full md:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Session</span>
                </button>

                {/* View Toggle */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden w-full md:w-auto">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`flex-1 md:flex-none p-2.5 text-center ${viewMode === "grid" ? "bg-gray-100 text-gray-900" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                  >
                    <Grid className="w-4 h-4 inline" />
                    <span className="ml-2 text-sm md:hidden">Grid</span>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex-1 md:flex-none p-2.5 text-center ${viewMode === "list" ? "bg-gray-100 text-gray-900" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                  >
                    <List className="w-4 h-4 inline" />
                    <span className="ml-2 text-sm md:hidden">List</span>
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
                  placeholder="Search by session name, number, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
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
                  <span className="text-gray-600">Loading sessions...</span>
                </div>
              </div>
            ) : /* Empty State */
            sessions.length === 0 ? (
              <div className="py-8 md:py-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl inline-block mb-4">
                    <Package className="w-10 h-10 md:w-12 md:h-12 text-blue-400" />
                  </div>
                  <h3 className="text-gray-900 font-semibold text-base md:text-lg mb-2">
                    No scanning sessions found
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Start by creating your first scanning session
                  </p>
                  <button
                    onClick={() => router.push("/scanning_preparation")}
                    className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 inline-flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Session
                  </button>
                </div>
              </div>
            ) : /* No Results State */
            filteredSessions.length === 0 ? (
              <div className="py-8 md:py-12 text-center">
                <Search className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-gray-900 font-semibold text-base mb-2">
                  No matching sessions
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  Try adjusting your search or filter criteria
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
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
                {filteredSessions.map((session) => {
                  const statusBadge = getStatusBadge(session.status);
                  const StatusIcon = statusBadge.icon;
                  return (
                    <div
                      key={session.id_preparation}
                      className="bg-white border border-gray-200 rounded-xl p-3 md:p-4 hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => handleShowDetail(session)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 md:p-2 rounded-lg bg-blue-100">
                            <Package className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 truncate">
                                {session.checking_name}
                              </h4>
                            </div>
                            <p className="text-xs text-gray-500 font-mono truncate">
                              {session.checking_number}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Status</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                            <StatusIcon className={`w-3 h-3 ${session.status === 'in-progress' ? 'animate-spin' : ''}`} />
                            {statusBadge.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Location</span>
                          <span className="text-xs text-gray-700 truncate ml-2">
                            {session.location_name || 'No location'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Items</span>
                          <span className="text-xs font-medium text-gray-700">
                            {session.totalItems} items ({session.totalQty} qty)
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Date</span>
                          <span className="text-xs text-gray-600">
                            {formatDate(session.checking_date)}
                          </span>
                        </div>

                        <div className="pt-2 border-t mt-2">
                          <div className="flex justify-between">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSession(session.id_preparation);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View & Scan
                            </button>
                            <span className="text-xs text-gray-400">
                              {formatLastUpdate(session.created_at)}
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
                        onClick={() => handleSort("checking_name")}
                      >
                        <div className="flex items-center">
                          Session Details
                          <div className="ml-1">{getSortIcon("checking_name")}</div>
                        </div>
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                        Info
                      </th>
                      <th
                        className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
                        onClick={() => handleSort("location_name")}
                      >
                        <div className="flex items-center">
                          Location
                          <div className="ml-1">{getSortIcon("location_name")}</div>
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center">
                          Status
                          <div className="ml-1">{getSortIcon("status")}</div>
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hidden xl:table-cell"
                        onClick={() => handleSort("checking_date")}
                      >
                        <div className="flex items-center">
                          Date
                          <div className="ml-1">{getSortIcon("checking_date")}</div>
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hidden xl:table-cell"
                        onClick={() => handleSort("totalItems")}
                      >
                        <div className="flex items-center">
                          Items
                          <div className="ml-1">{getSortIcon("totalItems")}</div>
                        </div>
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSessions.map((session) => {
                      const statusBadge = getStatusBadge(session.status);
                      const StatusIcon = statusBadge.icon;
                      return (
                        <tr
                          key={session.id_preparation}
                          className="hover:bg-gray-50 transition-colors cursor-pointer group"
                          onClick={() => handleShowDetail(session)}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center">
                              <div className="p-1.5 rounded-lg mr-2 bg-blue-100">
                                <Package className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-blue-700 text-sm">{session.checking_name}</div>
                                <div className="text-xs text-gray-500 font-mono mt-0.5">
                                  {session.checking_number}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 hidden md:table-cell">
                            <div className="text-xs">
                              <span className="text-gray-600 font-medium">{session.category_name || 'General'}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {session.remarks ? session.remarks.substring(0, 30) + '...' : 'No remarks'}
                            </div>
                          </td>
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <div className="text-sm text-gray-700">{session.location_name || '-'}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                              <StatusIcon className={`w-3 h-3 ${session.status === 'in-progress' ? 'animate-spin' : ''}`} />
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 hidden xl:table-cell">
                            <div className="text-xs text-gray-600">{formatDate(session.checking_date)}</div>
                          </td>
                          <td className="py-3 px-3 hidden xl:table-cell">
                            <div className="text-xs text-gray-600">
                              {session.totalItems} items
                            </div>
                            <div className="text-xs text-gray-500">
                              {session.totalQty} total qty
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewSession(session.id_preparation);
                                }}
                                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View & Scan"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSession(session);
                                }}
                                className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Session"
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
          {!loading && filteredSessions.length > 0 && (
            <div className="px-4 md:px-6 py-3 md:py-4 border-t bg-gray-50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="text-xs md:text-sm text-gray-500 text-center sm:text-left">
                  Showing {filteredSessions.length} of {sessions.length} sessions
                  {statusFilter !== "all" && ` • ${statusFilter} status`}
                  {searchTerm && ` • matching "${searchTerm}"`}
                </div>
                <div className="text-xs text-gray-400">
                  Last updated: {new Date().toLocaleTimeString('id-ID')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutDashboard>
  );
}