"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Calendar,
  MapPin,
  Loader2,
  Search,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ScanLine,
  Filter,
  ChevronDown,
  X,
  Eye,
  Building2,
  Clock,
  CheckCircle,
  Package,
  Laptop,
} from "lucide-react";
import Swal from "sweetalert2";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";

export default function AssetsInventoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sorting, setSorting] = useState({ id: "created_at", desc: true });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchCompletedSessions();
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
  }, [searchTerm, typeFilter, sessions, sorting]);

  const fetchCompletedSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/assets/sessions-with-assets`,
      );
      const result = await response.json();

      if (result.success) {
        setSessions(result.data);
        setFilteredSessions(result.data);
      } else {
        throw new Error(result.error || "Failed to load sessions");
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to load inventory data",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewAssets = (sessionId, type) => {
    router.push(`/assets/${sessionId}?type=${type}`);
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

  const getTypeIcon = (type) => {
    if (type === "device") return <Laptop className="w-4 h-4 text-blue-600" />;
    return <Package className="w-4 h-4 text-green-600" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const stats = {
    total: sessions.length,
    devices: sessions.filter((s) => s.type === "device").length,
    materials: sessions.filter((s) => s.type === "material").length,
    totalItems: sessions.reduce((sum, s) => sum + (s.total_items || 0), 0),
  };

  const kpis = [
    {
      title: "Total Sessions",
      value: stats.total,
      sub: "Completed sessions",
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
      title: "Total Assets",
      value: stats.totalItems,
      sub: "Validated items",
      accent: "#059669",
    },
  ];

  if (!mounted) {
    return (
      <ProtectedPage>
        <LayoutDashboard activeMenu={2}>
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </LayoutDashboard>
      </ProtectedPage>
    );
  }

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
          .inv-row { cursor: pointer; }
        `}</style>

        <div className="inv-root space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Box className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">
                  IT Asset Inventory
                </h1>
              </div>
              <p className="text-sm text-gray-500">
                Monitor and manage all validated IT assets
              </p>
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
          <div className="inv-card overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-4 md:p-5 border-b border-gray-100">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by session name, number, location, project..."
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

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={fetchCompletedSessions}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading assets...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-20 text-center">
                <Box className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                <h3 className="text-gray-800 font-semibold text-lg mb-1">
                  No assets found
                </h3>
                <p className="text-gray-400 text-sm mb-5">
                  Start by approving validations
                </p>
                <button
                  onClick={() => router.push("/validation_verification")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
                >
                  <CheckCircle className="w-4 h-4" /> Go to Validations
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
                    setTypeFilter("all");
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th
                        className="inv-th text-left"
                        onClick={() => handleSort("checking_name")}
                      >
                        <span className="flex items-center">
                          Session {getSortIcon("checking_name")}
                        </span>
                      </th>
                      <th
                        className="inv-th text-left"
                        onClick={() => handleSort("checking_date")}
                      >
                        <span className="flex items-center">
                          Date {getSortIcon("checking_date")}
                        </span>
                      </th>
                      <th className="inv-th text-left hidden md:table-cell">
                        <span>Type</span>
                      </th>
                      <th className="inv-th text-left hidden lg:table-cell">
                        <span>Location</span>
                      </th>
                      <th className="inv-th text-left hidden xl:table-cell">
                        <span>Project</span>
                      </th>
                      <th className="inv-th text-left">
                        <span>Items</span>
                      </th>
                      <th className="inv-th text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session, idx) => (
                      <tr
                        key={`${session.type}_${session.id_preparation}`}
                        className="inv-row transition-colors"
                        onClick={() =>
                          handleViewAssets(session.id_preparation, session.type)
                        }
                      >
                        <td className="inv-td">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                              {getTypeIcon(session.type)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm leading-tight">
                                {session.checking_name}
                              </div>
                              <div className="text-xs text-gray-400 font-mono mt-0.5">
                                {session.checking_number}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="inv-td">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {formatDate(session.checking_date)}
                            </span>
                          </div>
                        </td>
                        <td className="inv-td hidden md:table-cell">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              session.type === "device"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {session.type === "device" ? "Device" : "Material"}
                          </span>
                        </td>
                        <td className="inv-td hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-600 truncate max-w-[140px]">
                              {session.location_name || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="inv-td hidden xl:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-600 truncate max-w-[120px]">
                              {session.project_name || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="inv-td">
                          <span className="text-xs font-semibold text-gray-700">
                            {session.total_items || 0}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">
                            items
                          </span>
                        </td>
                        <td className="inv-td text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewAssets(
                                session.id_preparation,
                                session.type,
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Assets
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
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-2 rounded-b-2xl">
                <p className="text-xs text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    {filteredSessions.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-700">
                    {sessions.length}
                  </span>{" "}
                  sessions
                  {typeFilter !== "all" && (
                    <span className="text-gray-400">
                      {" "}
                      · {typeFilter === "device" ? "Devices" : "Materials"}
                    </span>
                  )}
                  {searchTerm && (
                    <span className="text-gray-400"> · "{searchTerm}"</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  Updated {new Date().toLocaleTimeString("id-ID")}
                </p>
              </div>
            )}
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedPage>
  );
}
