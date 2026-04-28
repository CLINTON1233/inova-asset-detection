"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  History,
  RefreshCw,
  TrendingUp,
  ScanLine,
  Shield,
  Box,
  CheckCircle,
  XCircle,
  Clock,
  Cpu,
  Cable,
  Calendar,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Eye,
  MapPin,
  BarChart2,
  Activity,
  Zap,
  Loader2,
  Package,
  Laptop,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import Swal from "sweetalert2";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";

// ─── Mini Donut ──────────────────────────────────────────────────────────────
const MiniDonut = ({ pct, color, size = 100, stroke = 10 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        style={{ position: "absolute", transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <span className="text-base font-bold text-gray-800 z-10">
        {Math.round(pct)}%
      </span>
    </div>
  );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
      }}
    >
      <p style={{ fontWeight: 700, color: "#374151", marginBottom: 6 }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <p
          key={i}
          style={{
            color: p.color,
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: p.color,
              display: "inline-block",
            }}
          />
          {p.name}:{" "}
          <span style={{ fontWeight: 700, marginLeft: 4 }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function HistoryLogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [validations, setValidations] = useState([]);
  const [assets, setAssets] = useState([]);

  const [logTypeFilter, setLogTypeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setMounted(true);
    fetchAll();
  }, []);

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [sessRes, valRes, assRes] = await Promise.all([
        fetch(API_ENDPOINTS.SCANNING_PREP_LIST_ALL).then((r) => r.json()),
        fetch(API_ENDPOINTS.VALIDATIONS_LIST).then((r) => r.json()),
        fetch(API_ENDPOINTS.ASSETS_LIST).then((r) => r.json()),
      ]);
      if (sessRes.success) setSessions(sessRes.data || []);
      if (valRes.success) setValidations(valRes.data || []);
      if (assRes.success) setAssets(assRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─── Derived stats ──────────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const totalSessions = sessions.length;
    const deviceSessions = sessions.filter((s) => s.type === "device").length;
    const materialSessions = sessions.filter(
      (s) => s.type === "material",
    ).length;
    const completedSessions = sessions.filter(
      (s) => s.status === "completed",
    ).length;
    const inProgressSessions = sessions.filter(
      (s) => s.status === "in-progress",
    ).length;
    const pendingSessions = sessions.filter(
      (s) => s.status === "pending",
    ).length;

    const totalQty = sessions.reduce((s, sess) => s + (sess.totalQty || 0), 0);
    const totalScanned = sessions.reduce(
      (s, sess) => s + (sess.totalScanned || 0),
      0,
    );

    const totalValidations = validations.length;
    const approvedVal = validations.filter(
      (v) => v.validation_status === "approved",
    ).length;
    const pendingVal = validations.filter(
      (v) => v.validation_status === "pending",
    ).length;
    const rejectedVal = validations.filter(
      (v) => v.validation_status === "rejected",
    ).length;

    const totalAssets = assets.length;
    const deviceAssets = assets.filter((a) => a.category === "Device").length;
    const materialAssets = assets.filter(
      (a) => a.category === "Material",
    ).length;

    const completionPct =
      totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
    const approvalPct =
      totalValidations > 0 ? (approvedVal / totalValidations) * 100 : 0;
    const rejectionPct =
      totalValidations > 0 ? (rejectedVal / totalValidations) * 100 : 0;
    const scanPct = totalQty > 0 ? (totalScanned / totalQty) * 100 : 0;

    // ── Weekly bar chart (last 7 days)
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyData = days.map((day) => ({
      name: day,
      Sessions: 0,
      Validations: 0,
      Assets: 0,
    }));
    sessions.forEach((s) => {
      const d = new Date(s.checking_date || s.created_at);
      const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      weeklyData[idx].Sessions += 1;
    });
    validations.forEach((v) => {
      const d = new Date(v.created_at);
      const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      weeklyData[idx].Validations += 1;
    });
    assets.forEach((a) => {
      const d = new Date(a.validated_at || a.created_at);
      const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      weeklyData[idx].Assets += 1;
    });

    // ── Line chart — cumulative trend (last 14 days)
    const trendDays = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return {
        name: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ts: d.toDateString(),
        Sessions: 0,
        Validations: 0,
        Assets: 0,
      };
    });
    sessions.forEach((s) => {
      const ts = new Date(s.created_at || s.checking_date).toDateString();
      const day = trendDays.find((d) => d.ts === ts);
      if (day) day.Sessions += 1;
    });
    validations.forEach((v) => {
      const ts = new Date(v.created_at).toDateString();
      const day = trendDays.find((d) => d.ts === ts);
      if (day) day.Validations += 1;
    });
    assets.forEach((a) => {
      const ts = new Date(a.validated_at || a.created_at).toDateString();
      const day = trendDays.find((d) => d.ts === ts);
      if (day) day.Assets += 1;
    });

    // ── Area chart — validation trend (approval vs rejection)
    const valTrend = trendDays.map((d) => ({
      name: d.name,
      Approved: 0,
      Pending: 0,
      Rejected: 0,
    }));
    validations.forEach((v) => {
      const ts = new Date(v.created_at).toDateString();
      const idx = trendDays.findIndex((d) => d.ts === ts);
      if (idx >= 0) {
        if (v.validation_status === "approved") valTrend[idx].Approved += 1;
        else if (v.validation_status === "pending") valTrend[idx].Pending += 1;
        else if (v.validation_status === "rejected")
          valTrend[idx].Rejected += 1;
      }
    });

    // ── Session progress bars
    const sessionProgress = sessions.slice(0, 8).map((s) => ({
      name: (s.checking_name || "").substring(0, 18),
      scanned: s.totalScanned || 0,
      total: s.totalQty || 0,
      pct:
        s.totalQty > 0
          ? Math.round(((s.totalScanned || 0) / s.totalQty) * 100)
          : 0,
    }));

    // ── Asset distribution
    const assetTypeMap = new Map();
    assets.forEach((a) => {
      const key = a.asset_type || a.category || "Other";
      assetTypeMap.set(key, (assetTypeMap.get(key) || 0) + 1);
    });
    const assetDistribution = Array.from(assetTypeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // ── Unified logs
    const logs = [];
    sessions.forEach((s, i) => {
      logs.push({
        id: `sess-${s.id_preparation || s.id}-${i}`,
        type: "session",
        title: s.checking_name || "Scanning Session",
        sub: s.checking_number || "",
        category: s.type === "device" ? "Device" : "Material",
        status: s.status,
        location: s.location_name || "-",
        date: s.created_at || s.checking_date,
        detail: `${s.totalScanned || 0}/${s.totalQty || 0} scanned`,
        progress:
          s.totalQty > 0
            ? Math.round(((s.totalScanned || 0) / s.totalQty) * 100)
            : 0,
      });
    });
    validations.forEach((v, i) => {
      logs.push({
        id: `val-${v.id_validation || v.id}-${i}`,
        type: "validation",
        title: v.item_name || "Unknown Item",
        sub: v.serial_or_code || "",
        category: v.validation_type === "device" ? "Device" : "Material",
        status: v.validation_status,
        location: v.location_name || "-",
        date: v.created_at,
        detail: v.checking_name || "-",
        progress:
          v.validation_status === "approved"
            ? 100
            : v.validation_status === "rejected"
              ? 0
              : 50,
      });
    });
    assets.forEach((a, i) => {
      logs.push({
        id: `asset-${a.id_assets || a.id}-${i}`,
        type: "asset",
        title: a.asset_name || "Unknown Asset",
        sub: a.asset_code || "",
        category: a.category,
        status: a.status || "active",
        location: a.location_name || "-",
        date: a.validated_at || a.created_at,
        detail: a.department_name || "-",
        progress: 100,
      });
    });
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Validation Status Data untuk chart donut
    const validationStatusData = [
      { name: "Approved", value: approvedVal, color: "#10b981" },
      { name: "Pending", value: pendingVal, color: "#f59e0b" },
      { name: "Rejected", value: rejectedVal, color: "#ef4444" },
    ].filter((d) => d.value > 0);

    return {
      totalSessions,
      deviceSessions,
      materialSessions,
      completedSessions,
      inProgressSessions,
      pendingSessions,
      totalQty,
      totalScanned,
      totalValidations,
      approvedVal,
      pendingVal,
      rejectedVal,
      totalAssets,
      deviceAssets,
      materialAssets,
      completionPct,
      approvalPct,
      rejectionPct,
      scanPct,
      weeklyData,
      trendDays,
      valTrend,
      validationStatusData,
      assetDistribution,
      sessionProgress,
      logs,
    };
  }, [sessions, validations, assets]);

  // ─── Filter logs ─────────────────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    let r = derived.logs;
    if (logTypeFilter !== "all") r = r.filter((l) => l.type === logTypeFilter);
    if (typeFilter !== "all")
      r = r.filter((l) => l.category?.toLowerCase() === typeFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      r = r.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.sub.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q),
      );
    }
    return r;
  }, [derived.logs, logTypeFilter, typeFilter, searchTerm]);

  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLogStatus = (type, status) => {
    if (type === "session") {
      if (status === "completed")
        return {
          label: "Completed",
          cls: "bg-emerald-100 text-emerald-700",
          dot: "#10b981",
        };
      if (status === "in-progress")
        return {
          label: "In Progress",
          cls: "bg-blue-100 text-blue-700",
          dot: "#2563eb",
        };
      return {
        label: "Pending",
        cls: "bg-amber-100 text-amber-700",
        dot: "#f59e0b",
      };
    }
    if (type === "validation") {
      if (status === "approved")
        return {
          label: "Approved",
          cls: "bg-emerald-100 text-emerald-700",
          dot: "#10b981",
        };
      if (status === "rejected")
        return {
          label: "Rejected",
          cls: "bg-red-100 text-red-700",
          dot: "#ef4444",
        };
      return {
        label: "Pending",
        cls: "bg-amber-100 text-amber-700",
        dot: "#f59e0b",
      };
    }
    if (status === "active")
      return {
        label: "Active",
        cls: "bg-emerald-100 text-emerald-700",
        dot: "#10b981",
      };
    return { label: status, cls: "bg-gray-100 text-gray-700", dot: "#9ca3af" };
  };

  const getTypeIcon = (type, category) => {
    if (type === "session")
      return <ScanLine className="w-4 h-4 text-blue-600" />;
    if (type === "validation")
      return <Shield className="w-4 h-4 text-purple-600" />;
    if (category === "Device") return <Cpu className="w-4 h-4 text-blue-600" />;
    return <Cable className="w-4 h-4 text-emerald-600" />;
  };

  // Dropdown options
  const DROPDOWN_OPTIONS = [
    { id: "overview", label: "Overview", icon: BarChart2 },
    { id: "scanning", label: "Scanning", icon: ScanLine },
    { id: "validation", label: "Validation", icon: Shield },
    { id: "assets", label: "Assets", icon: Box },
    { id: "logs", label: "Activity Logs", icon: Activity },
  ];

  const currentOption =
    DROPDOWN_OPTIONS.find((opt) => opt.id === activeTab) || DROPDOWN_OPTIONS[0];
  const CurrentIcon = currentOption.icon;

  if (!mounted || loading) {
    return (
      <ProtectedPage>
        <LayoutDashboard activeMenu={3}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">
                Loading history & logs...
              </p>
            </div>
          </div>
        </LayoutDashboard>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu={3}>
        <style jsx>{`
          @import url("https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap");

          .hl-root {
            font-family: "DM Sans", sans-serif;
            color: #374151;
          }
          .hl-root * {
            box-sizing: border-box;
          }
          .hl-root .mono {
            font-family: "DM Mono", monospace;
          }

          .hl-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow:
              0 4px 6px -1px rgba(0, 0, 0, 0.1),
              0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: box-shadow 0.2s ease;
          }
          .hl-card:hover {
            box-shadow:
              0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05);
          }

          .hl-section-title {
            font-size: 13px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .hl-kpi-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
          }
          @media (max-width: 1024px) {
            .hl-kpi-row {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (max-width: 640px) {
            .hl-kpi-row {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          .hl-kpi-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 22px 12px;
            text-align: center;
            border-right: 1px solid #f3f4f6;
          }
          .hl-kpi-cell:last-child {
            border-right: none;
          }
          .hl-kpi-label {
            font-size: 10px;
            font-weight: 700;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            margin-bottom: 8px;
          }
          .hl-kpi-value {
            font-size: 2.25rem;
            font-weight: 700;
            line-height: 1;
          }
          .hl-kpi-sub {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 6px;
          }

          .hl-donut-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 12px;
            text-align: center;
            border-right: 1px solid #f3f4f6;
          }
          .hl-donut-cell:last-child {
            border-right: none;
          }
          .hl-donut-title {
            font-size: 11px;
            font-weight: 600;
            color: #374151;
            text-align: center;
            margin-bottom: 10px;
          }

          /* Dropdown style seperti All Types di Assets Page */
          .hl-dropdown {
            position: relative;
            display: inline-block;
          }
          .hl-dropdown-btn {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 8px 16px;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            font-family: "DM Sans", sans-serif;
            font-size: 13px;
            font-weight: 500;
            color: #374151;
            cursor: pointer;
            transition: all 0.15s;
            min-width: 140px;
          }
          .hl-dropdown-btn:hover {
            border-color: #2563eb;
            background: #f8faff;
          }
          .hl-dropdown-menu {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            z-index: 50;
            min-width: 160px;
            overflow: hidden;
          }
          .hl-dropdown-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 500;
            color: #6b7280;
            cursor: pointer;
            transition: background 0.1s;
          }
          .hl-dropdown-item:hover {
            background: #f3f4f6;
            color: #1f2937;
          }
          .hl-dropdown-item.active {
            background: #eff6ff;
            color: #2563eb;
          }

          .hl-prog-track {
            background: #f3f4f6;
            border-radius: 99px;
            height: 5px;
          }
          .hl-prog-fill {
            border-radius: 99px;
            height: 5px;
            transition: width 0.4s ease;
          }

          .hl-log-row {
            transition: background 0.1s;
            cursor: default;
          }
          .hl-log-row:hover {
            background: #f8faff;
          }

          .hl-root thead th {
            font-family: "DM Sans", sans-serif;
            font-size: 11px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            background: #f9fafb;
            padding: 10px 16px;
            border-bottom: 1px solid #e5e7eb;
            white-space: nowrap;
            text-align: center;
          }
          .hl-root tbody td {
            font-family: "DM Sans", sans-serif;
            font-size: 13px;
            color: #374151;
            padding: 12px 16px;
            border-top: 1px solid #f3f4f6;
            vertical-align: middle;
            text-align: center;
          }
          .hl-root tbody tr:hover {
            background: #f8faff;
          }

          .hl-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 18px;
            background: #f9fafb;
            border-top: 1px solid #f3f4f6;
            font-family: "DM Sans", sans-serif;
          }

          .hl-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 64px 24px;
            text-align: center;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }

          .hl-chart-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          @media (max-width: 768px) {
            .hl-chart-grid {
              grid-template-columns: 1fr;
            }
          }

          .validation-distribution-card {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            overflow: hidden;
          }
        `}</style>

        <div className="hl-root space-y-5">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                History & Activity Logs
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Realtime statistics & complete activity records from all modules
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Dropdown Selector - style seperti All Types */}
              <div className="hl-dropdown">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="hl-dropdown-btn"
                >
                  <span className="flex items-center gap-2">
                    <CurrentIcon className="w-4 h-4" />
                    {currentOption.label}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowDropdown(false)}
                    />
                    <div className="hl-dropdown-menu">
                      {DROPDOWN_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <div
                            key={opt.id}
                            className={`hl-dropdown-item ${activeTab === opt.id ? "active" : ""}`}
                            onClick={() => {
                              setActiveTab(opt.id);
                              setShowDropdown(false);
                            }}
                          >
                            <Icon className="w-4 h-4" />
                            {opt.label}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => fetchAll(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* ══════════════ OVERVIEW ══════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* KPI Row */}
              <div className="hl-card">
                <div className="hl-kpi-row divide-x divide-gray-100">
                  {[
                    {
                      label: "Total Sessions",
                      value: derived.totalSessions,
                      sub: `${derived.completedSessions} completed`,
                      accent: "#2563eb",
                    },
                    {
                      label: "Total Validations",
                      value: derived.totalValidations,
                      sub: `${derived.approvedVal} approved`,
                      accent: "#6366f1",
                    },
                    {
                      label: "Total Assets",
                      value: derived.totalAssets,
                      sub: `${derived.deviceAssets} devices`,
                      accent: "#10b981",
                    },
                    {
                      label: "Items Scanned",
                      value: derived.totalScanned,
                      sub: `of ${derived.totalQty} total`,
                      accent: "#f59e0b",
                    },
                  ].map((d, i) => (
                    <div className="hl-kpi-cell" key={i}>
                      <p className="hl-kpi-label">{d.label}</p>
                      <span
                        className="hl-kpi-value"
                        style={{ color: d.accent }}
                      >
                        {d.value}
                      </span>
                      <p className="hl-kpi-sub">{d.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Donut Row */}
              <div className="hl-card">
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
                  {[
                    {
                      title: "Scan Progress",
                      pct: derived.scanPct,
                      color: "#2563eb",
                      sub: `${Math.round(derived.scanPct)}% items scanned`,
                    },
                    {
                      title: "Session Completion",
                      pct: derived.completionPct,
                      color: "#6366f1",
                      sub: `${derived.completedSessions}/${derived.totalSessions} done`,
                    },
                    {
                      title: "Approval Rate",
                      pct: derived.approvalPct,
                      color: "#10b981",
                      sub: `${derived.approvedVal} approved`,
                    },
                    {
                      title: "Rejection Rate",
                      pct: derived.rejectionPct,
                      color: "#ef4444",
                      sub: `${derived.rejectedVal} rejected`,
                    },
                  ].map((d, i) => (
                    <div key={i} className="hl-donut-cell">
                      <p className="hl-donut-title">{d.title}</p>
                      <MiniDonut
                        pct={d.pct}
                        color={d.color}
                        size={100}
                        stroke={10}
                      />
                      <p className="text-xs text-gray-400 mt-3 text-center">
                        {d.sub}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Weekly Bar Chart + Validation Status (seperti Asset Type Distribution) */}
              <div className="hl-chart-grid">
                {/* Weekly Activity - Card diperkecil */}
                <div className="hl-card p-4">
                  <p className="hl-section-title">
                    <BarChart2 className="w-4 h-4" /> Weekly Activity
                  </p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={derived.weeklyData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid vertical={false} stroke="#f3f4f6" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="Sessions"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                      <Bar
                        dataKey="Validations"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                      <Bar
                        dataKey="Assets"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 justify-center mt-2">
                    {[
                      { color: "#2563eb", label: "Sessions" },
                      { color: "#6366f1", label: "Validations" },
                      { color: "#10b981", label: "Assets" },
                    ].map((item) => (
                      <span
                        key={item.label}
                        className="flex items-center gap-1.5 text-[11px] text-gray-500"
                      >
                        <span
                          className="w-2 h-2 rounded-sm inline-block"
                          style={{ background: item.color }}
                        />
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Validation Status - Diperkecil */}
                <div className="validation-distribution-card">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4 text-blue-600" />
                      Validation Status
                    </h2>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Distribution of validation records
                    </p>
                  </div>

                  <div className="p-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 text-xs">
                          Total Validations Distribution
                        </h4>
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          Total: {derived.totalValidations}
                        </span>
                      </div>

                      <div className="flex flex-row items-center gap-4">
                        {/* Donut Chart - Lebih kecil */}
                        <div
                          className="relative flex-shrink-0"
                          style={{ width: 100, height: 100 }}
                        >
                          <svg
                            viewBox="0 0 100 100"
                            className="w-full h-full -rotate-90"
                          >
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="none"
                              stroke="#e5e7eb"
                              strokeWidth="8"
                            />
                            {derived.totalValidations > 0 &&
                              derived.approvedVal > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="38"
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="8"
                                  strokeDasharray={`${(derived.approvedVal / derived.totalValidations) * 238.76} 238.76`}
                                  strokeLinecap="round"
                                  className="transition-all duration-700"
                                />
                              )}
                            {derived.pendingVal > 0 &&
                              derived.totalValidations > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="38"
                                  fill="none"
                                  stroke="#f59e0b"
                                  strokeWidth="8"
                                  strokeDasharray={`${(derived.pendingVal / derived.totalValidations) * 238.76} 238.76`}
                                  strokeDashoffset={`-${(derived.approvedVal / derived.totalValidations) * 238.76}`}
                                  strokeLinecap="round"
                                  className="transition-all duration-700"
                                />
                              )}
                            {derived.rejectedVal > 0 &&
                              derived.totalValidations > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="38"
                                  fill="none"
                                  stroke="#ef4444"
                                  strokeWidth="8"
                                  strokeDasharray={`${(derived.rejectedVal / derived.totalValidations) * 238.76} 238.76`}
                                  strokeDashoffset={`-${((derived.approvedVal + derived.pendingVal) / derived.totalValidations) * 238.76}`}
                                  strokeLinecap="round"
                                  className="transition-all duration-700"
                                />
                              )}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-sm font-bold text-gray-800">
                              {derived.totalValidations}
                            </span>
                            <span className="text-[8px] text-gray-400 font-medium">
                              Total
                            </span>
                          </div>
                        </div>

                        {/* Legend dengan progress bar - Lebih kecil dan compact */}
                        <div className="flex-1 space-y-2">
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-[10px] font-medium text-gray-600">
                                  Approved
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-gray-800">
                                  {derived.approvedVal}
                                </span>
                                <span className="text-[9px] text-gray-400">
                                  (
                                  {derived.totalValidations
                                    ? Math.round(
                                        (derived.approvedVal /
                                          derived.totalValidations) *
                                          100,
                                      )
                                    : 0}
                                  %)
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1">
                              <div
                                className="h-1 rounded-full bg-green-500 transition-all duration-700"
                                style={{
                                  width: `${derived.totalValidations ? (derived.approvedVal / derived.totalValidations) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                <span className="text-[10px] font-medium text-gray-600">
                                  Pending
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-gray-800">
                                  {derived.pendingVal}
                                </span>
                                <span className="text-[9px] text-gray-400">
                                  (
                                  {derived.totalValidations
                                    ? Math.round(
                                        (derived.pendingVal /
                                          derived.totalValidations) *
                                          100,
                                      )
                                    : 0}
                                  %)
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1">
                              <div
                                className="h-1 rounded-full bg-amber-500 transition-all duration-700"
                                style={{
                                  width: `${derived.totalValidations ? (derived.pendingVal / derived.totalValidations) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="text-[10px] font-medium text-gray-600">
                                  Rejected
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-gray-800">
                                  {derived.rejectedVal}
                                </span>
                                <span className="text-[9px] text-gray-400">
                                  (
                                  {derived.totalValidations
                                    ? Math.round(
                                        (derived.rejectedVal /
                                          derived.totalValidations) *
                                          100,
                                      )
                                    : 0}
                                  %)
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1">
                              <div
                                className="h-1 rounded-full bg-red-500 transition-all duration-700"
                                style={{
                                  width: `${derived.totalValidations ? (derived.rejectedVal / derived.totalValidations) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1.5 mt-3 pt-2 border-t border-gray-100">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-semibold">
                          ● {derived.approvedVal} Approved
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold">
                          ● {derived.pendingVal} Pending
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-semibold">
                          ● {derived.rejectedVal} Rejected
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2 Charts in 1 Card: Activity Trend (kiri) + Validation Trend (kanan) */}
              <div className="hl-card p-5">
                <div className="hl-chart-grid">
                  {/* Activity Trend - Kiri */}
                  <div>
                    <p className="hl-section-title">
                      <TrendingUp className="w-4 h-4" /> Activity Trend — Last
                      14 Days
                    </p>
                    <p className="text-xs text-gray-400 mb-4">
                      Daily count of sessions, validations, and assets
                    </p>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart
                        data={derived.trendDays}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f3f4f6"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          tickLine={false}
                          axisLine={false}
                          interval={1}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="Sessions"
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Validations"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Assets"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-4 justify-center mt-3">
                      {[
                        { color: "#2563eb", label: "Sessions" },
                        { color: "#6366f1", label: "Validations" },
                        { color: "#10b981", label: "Assets" },
                      ].map((item) => (
                        <span
                          key={item.label}
                          className="flex items-center gap-1.5 text-xs text-gray-500"
                        >
                          <span
                            style={{
                              width: 20,
                              height: 2,
                              background: item.color,
                              display: "inline-block",
                              borderRadius: 2,
                            }}
                          />
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Validation Trend - Kanan */}
                  <div>
                    <p className="hl-section-title">
                      <Shield className="w-4 h-4" /> Validation Trend — Approved
                      vs Rejected
                    </p>
                    <p className="text-xs text-gray-400 mb-4">
                      Daily breakdown of validation statuses
                    </p>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart
                        data={derived.valTrend}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="gradApproved"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10b981"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10b981"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="gradPending"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#f59e0b"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#f59e0b"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="gradRejected"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#ef4444"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#ef4444"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f3f4f6"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          tickLine={false}
                          axisLine={false}
                          interval={1}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="Approved"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#gradApproved)"
                          dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Pending"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fill="url(#gradPending)"
                          dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Rejected"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fill="url(#gradRejected)"
                          dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-4 justify-center mt-3">
                      {[
                        { color: "#10b981", label: "Approved" },
                        { color: "#f59e0b", label: "Pending" },
                        { color: "#ef4444", label: "Rejected" },
                      ].map((item) => (
                        <span
                          key={item.label}
                          className="flex items-center gap-1.5 text-xs text-gray-500"
                        >
                          <span
                            style={{
                              width: 20,
                              height: 2,
                              background: item.color,
                              display: "inline-block",
                              borderRadius: 2,
                            }}
                          />
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Session Progress Overview ── */}
              <div className="hl-card p-5">
                <p className="hl-section-title">
                  <ScanLine className="w-4 h-4" /> Session Progress Overview
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Scan completion percentage per session
                </p>
                {derived.sessionProgress.length > 0 ? (
                  <div className="space-y-3">
                    {derived.sessionProgress.map((s, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm text-gray-700 font-medium truncate max-w-[200px]">
                            {s.name}
                          </span>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>
                              {s.scanned}/{s.total} items
                            </span>
                            <span
                              className="font-bold"
                              style={{
                                color: s.pct === 100 ? "#10b981" : "#2563eb",
                              }}
                            >
                              {s.pct}%
                            </span>
                          </div>
                        </div>
                        <div className="hl-prog-track">
                          <div
                            className="hl-prog-fill"
                            style={{
                              width: `${s.pct}%`,
                              background:
                                s.pct === 100
                                  ? "#10b981"
                                  : s.pct > 50
                                    ? "#2563eb"
                                    : "#f59e0b",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-400 text-sm">
                    No session data available
                  </div>
                )}
              </div>

              {/* ── Asset Type Distribution ── */}
              {derived.assetDistribution.length > 0 && (
                <div className="hl-card p-5">
                  <p className="hl-section-title">
                    <BarChart2 className="w-4 h-4" /> Asset Type Distribution
                  </p>
                  <div className="space-y-3">
                    {derived.assetDistribution.map((item, i) => {
                      const total = derived.assetDistribution.reduce(
                        (s, a) => s + a.value,
                        0,
                      );
                      const pct = total > 0 ? (item.value / total) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-gray-600 font-medium">
                              {item.name}
                            </span>
                            <span className="font-semibold text-gray-800 text-xs">
                              {item.value}{" "}
                              <span className="text-gray-400 font-normal">
                                ({Math.round(pct)}%)
                              </span>
                            </span>
                          </div>
                          <div className="hl-prog-track">
                            <div
                              className="hl-prog-fill"
                              style={{
                                width: `${pct}%`,
                                background: i % 2 === 0 ? "#2563eb" : "#10b981",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ SCANNING ══════════════ */}
          {activeTab === "scanning" && (
            <div className="space-y-5">
              <div className="hl-card">
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
                  {[
                    {
                      label: "Total Sessions",
                      value: derived.totalSessions,
                      sub: "All sessions",
                      accent: "#2563eb",
                    },
                    {
                      label: "Device Sessions",
                      value: derived.deviceSessions,
                      sub: "Device type",
                      accent: "#3b82f6",
                    },
                    {
                      label: "Material Sessions",
                      value: derived.materialSessions,
                      sub: "Material type",
                      accent: "#10b981",
                    },
                    {
                      label: "Completed",
                      value: derived.completedSessions,
                      sub: `${Math.round(derived.completionPct)}% rate`,
                      accent: "#059669",
                    },
                  ].map((d, i) => (
                    <div className="hl-kpi-cell" key={i}>
                      <p className="hl-kpi-label">{d.label}</p>
                      <span
                        className="hl-kpi-value"
                        style={{ color: d.accent }}
                      >
                        {d.value}
                      </span>
                      <p className="hl-kpi-sub">{d.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hl-card p-5">
                <p className="hl-section-title">
                  <ScanLine className="w-4 h-4" /> Session Breakdown
                </p>
                <div
                  className="stat-cards-row-session"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "12px",
                  }}
                >
                  {/* In Progress Card */}
                  <div
                    className="stat-item-session"
                    style={{
                      borderRadius: "14px",
                      border: "1px solid #e5e7eb",
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      transition: "box-shadow 0.2s, transform 0.2s",
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#eff6ff",
                          flexShrink: 0,
                        }}
                      >
                        <Clock
                          className="w-5 h-5"
                          style={{ color: "#2563eb" }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "28px",
                          fontWeight: 700,
                          lineHeight: 1,
                          color: "#2563eb",
                        }}
                      >
                        {derived.inProgressSessions}
                      </span>
                    </div>
                    <div>
                      <p
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: "8px",
                        }}
                      >
                        In Progress
                      </p>
                      <div
                        style={{
                          width: "100%",
                          height: "4px",
                          background: "#f3f4f6",
                          borderRadius: "99px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${derived.totalSessions > 0 ? (derived.inProgressSessions / derived.totalSessions) * 100 : 0}%`,
                            height: "100%",
                            borderRadius: "99px",
                            background: "#2563eb",
                            transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
                          }}
                        />
                      </div>
                      <p
                        style={{
                          fontSize: "10px",
                          color: "#9ca3af",
                          marginTop: "6px",
                        }}
                      >
                        Active now
                      </p>
                    </div>
                  </div>

                  {/* Pending Card */}
                  <div
                    className="stat-item-session"
                    style={{
                      borderRadius: "14px",
                      border: "1px solid #e5e7eb",
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      transition: "box-shadow 0.2s, transform 0.2s",
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#fef3c7",
                          flexShrink: 0,
                        }}
                      >
                        <Clock
                          className="w-5 h-5"
                          style={{ color: "#d97706" }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "28px",
                          fontWeight: 700,
                          lineHeight: 1,
                          color: "#d97706",
                        }}
                      >
                        {derived.pendingSessions}
                      </span>
                    </div>
                    <div>
                      <p
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: "8px",
                        }}
                      >
                        Pending
                      </p>
                      <div
                        style={{
                          width: "100%",
                          height: "4px",
                          background: "#f3f4f6",
                          borderRadius: "99px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${derived.totalSessions > 0 ? (derived.pendingSessions / derived.totalSessions) * 100 : 0}%`,
                            height: "100%",
                            borderRadius: "99px",
                            background: "#d97706",
                            transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
                          }}
                        />
                      </div>
                      <p
                        style={{
                          fontSize: "10px",
                          color: "#9ca3af",
                          marginTop: "6px",
                        }}
                      >
                        Not started
                      </p>
                    </div>
                  </div>

                  {/* Total Scanned Card */}
                  <div
                    className="stat-item-session"
                    style={{
                      borderRadius: "14px",
                      border: "1px solid #e5e7eb",
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      transition: "box-shadow 0.2s, transform 0.2s",
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#ecfdf5",
                          flexShrink: 0,
                        }}
                      >
                        <ScanLine
                          className="w-5 h-5"
                          style={{ color: "#10b981" }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "28px",
                          fontWeight: 700,
                          lineHeight: 1,
                          color: "#10b981",
                        }}
                      >
                        {derived.totalScanned}
                      </span>
                    </div>
                    <div>
                      <p
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: "8px",
                        }}
                      >
                        Total Scanned
                      </p>
                      <div
                        style={{
                          width: "100%",
                          height: "4px",
                          background: "#f3f4f6",
                          borderRadius: "99px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${derived.totalQty > 0 ? (derived.totalScanned / derived.totalQty) * 100 : 0}%`,
                            height: "100%",
                            borderRadius: "99px",
                            background: "#10b981",
                            transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
                          }}
                        />
                      </div>
                      <p
                        style={{
                          fontSize: "10px",
                          color: "#9ca3af",
                          marginTop: "6px",
                        }}
                      >
                        of {derived.totalQty} items
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hl-card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="hl-section-title mb-0">
                    <ScanLine className="w-4 h-4" /> All Scanning Sessions
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th>Session</th>
                        <th>Type</th>
                        <th>Location</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.length === 0 ? (
                        <td>
                          <td
                            colSpan={6}
                            className="text-center py-12 text-gray-400"
                          >
                            No sessions found
                          </td>
                        </td>
                      ) : (
                        sessions.map((s, i) => {
                          const pct =
                            s.totalQty > 0
                              ? Math.round(
                                  ((s.totalScanned || 0) / s.totalQty) * 100,
                                )
                              : 0;
                          const sc =
                            s.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : s.status === "in-progress"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700";
                          return (
                            <tr key={i}>
                              <td className="text-left">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.type === "device" ? "bg-blue-100" : "bg-emerald-100"}`}
                                  >
                                    {s.type === "device" ? (
                                      <Laptop className="w-4 h-4 text-blue-600" />
                                    ) : (
                                      <Package className="w-4 h-4 text-emerald-600" />
                                    )}
                                  </div>
                                  <div className="text-left">
                                    <div className="font-medium text-gray-900 text-sm">
                                      {s.checking_name}
                                    </div>
                                    <div className="text-xs text-gray-400 mono">
                                      {s.checking_number}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.type === "device" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}
                                >
                                  {s.type === "device" ? "Device" : "Material"}
                                </span>
                              </td>
                              <td>
                                <span className="text-sm text-gray-600">
                                  {s.location_name || "—"}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <div className="hl-prog-track w-20">
                                    <div
                                      className="hl-prog-fill"
                                      style={{
                                        width: `${pct}%`,
                                        background:
                                          pct === 100 ? "#10b981" : "#2563eb",
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-gray-600">
                                    {pct}%
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${sc}`}
                                >
                                  {s.status}
                                </span>
                              </td>
                              <td>
                                <span className="text-sm text-gray-500">
                                  {formatDate(s.created_at || s.checking_date)}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ VALIDATION ══════════════ */}
          {activeTab === "validation" && (
            <div className="space-y-5">
              <div className="hl-card">
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
                  {[
                    {
                      label: "Total Validations",
                      value: derived.totalValidations,
                      sub: "All records",
                      accent: "#6366f1",
                    },
                    {
                      label: "Approved",
                      value: derived.approvedVal,
                      sub: `${Math.round(derived.approvalPct)}% rate`,
                      accent: "#10b981",
                    },
                    {
                      label: "Pending Review",
                      value: derived.pendingVal,
                      sub: "Awaiting action",
                      accent: "#f59e0b",
                    },
                    {
                      label: "Rejected",
                      value: derived.rejectedVal,
                      sub: "Declined items",
                      accent: "#ef4444",
                    },
                  ].map((d, i) => (
                    <div className="hl-kpi-cell" key={i}>
                      <p className="hl-kpi-label">{d.label}</p>
                      <span
                        className="hl-kpi-value"
                        style={{ color: d.accent }}
                      >
                        {d.value}
                      </span>
                      <p className="hl-kpi-sub">{d.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hl-card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="hl-section-title mb-0">
                    <Shield className="w-4 h-4" /> Validation Records
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Type</th>
                        <th>Serial/Code</th>
                        <th>Session</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validations.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-12 text-gray-400"
                          >
                            No validations found
                          </td>
                        </tr>
                      ) : (
                        validations.map((v, i) => {
                          const sc =
                            v.validation_status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : v.validation_status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700";
                          const label =
                            v.validation_status === "approved"
                              ? "Approved"
                              : v.validation_status === "rejected"
                                ? "Rejected"
                                : "Pending";
                          return (
                            <tr key={i}>
                              <td className="text-left">
                                <span className="font-medium text-gray-900 text-sm">
                                  {v.item_name || "-"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${v.validation_type === "device" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}
                                >
                                  {v.validation_type === "device"
                                    ? "Device"
                                    : "Material"}
                                </span>
                              </td>
                              <td>
                                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                  {v.serial_or_code || "-"}
                                </code>
                              </td>
                              <td>
                                <span className="text-sm text-gray-500">
                                  {v.checking_name || "-"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${sc}`}
                                >
                                  {label}
                                </span>
                              </td>
                              <td>
                                <span className="text-sm text-gray-500">
                                  {formatDate(v.created_at)}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="hl-footer">
                  <p className="text-xs text-gray-500">
                    Showing{" "}
                    <span className="font-semibold">{validations.length}</span>{" "}
                    validations
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Updated {new Date().toLocaleTimeString("id-ID")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ ASSETS ══════════════ */}
          {activeTab === "assets" && (
            <div className="space-y-5">
              <div className="hl-card">
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
                  {[
                    {
                      label: "Total Assets",
                      value: derived.totalAssets,
                      sub: "In inventory",
                      accent: "#2563eb",
                    },
                    {
                      label: "Devices",
                      value: derived.deviceAssets,
                      sub: "IT devices",
                      accent: "#3b82f6",
                    },
                    {
                      label: "Materials",
                      value: derived.materialAssets,
                      sub: "IT materials",
                      accent: "#10b981",
                    },
                    {
                      label: "Validated",
                      value: derived.approvedVal,
                      sub: "From validations",
                      accent: "#6366f1",
                    },
                  ].map((d, i) => (
                    <div className="hl-kpi-cell" key={i}>
                      <p className="hl-kpi-label">{d.label}</p>
                      <span
                        className="hl-kpi-value"
                        style={{ color: d.accent }}
                      >
                        {d.value}
                      </span>
                      <p className="hl-kpi-sub">{d.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {derived.assetDistribution.length > 0 && (
                <div className="hl-card p-5">
                  <p className="hl-section-title">
                    <BarChart2 className="w-4 h-4" /> Asset Type Distribution
                  </p>
                  <div className="space-y-3">
                    {derived.assetDistribution.map((item, i) => {
                      const total = derived.assetDistribution.reduce(
                        (s, a) => s + a.value,
                        0,
                      );
                      const pct = total > 0 ? (item.value / total) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-gray-600 font-medium">
                              {item.name}
                            </span>
                            <span className="font-semibold text-gray-800 text-xs">
                              {item.value}{" "}
                              <span className="text-gray-400 font-normal">
                                ({Math.round(pct)}%)
                              </span>
                            </span>
                          </div>
                          <div className="hl-prog-track">
                            <div
                              className="hl-prog-fill"
                              style={{
                                width: `${pct}%`,
                                background: i % 2 === 0 ? "#2563eb" : "#10b981",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="hl-card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="hl-section-title mb-0">
                    <Box className="w-4 h-4" /> Asset Records
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th>Asset Code</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Department</th>
                        <th>Location</th>
                        <th>Validated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-12 text-gray-400"
                          >
                            No assets found
                          </td>
                        </tr>
                      ) : (
                        assets.map((a, i) => (
                          <tr key={i}>
                            <td>
                              <span className="font-medium text-gray-700">
                                {a.asset_code}
                              </span>
                            </td>
                            <td className="text-left">
                              <div className="font-medium text-gray-900 text-sm">
                                {a.asset_name}
                              </div>
                              <div className="text-xs text-gray-400">
                                {a.asset_type || "-"}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${a.category === "Device" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}
                              >
                                {a.category}
                              </span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-500">
                                {a.department_name || "-"}
                              </span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-500">
                                {a.location_name || "-"}
                              </span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-500">
                                {formatDateTime(a.validated_at)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="hl-footer">
                  <p className="text-xs text-gray-500">
                    Showing{" "}
                    <span className="font-semibold">{assets.length}</span>{" "}
                    assets
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Updated {new Date().toLocaleTimeString("id-ID")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ ACTIVITY LOGS ══════════════ */}
          {activeTab === "logs" && (
            <div className="space-y-4">
              <div className="hl-card p-4">
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, code, location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
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
                  <div className="flex gap-2">
                    <select
                      value={logTypeFilter}
                      onChange={(e) => setLogTypeFilter(e.target.value)}
                      className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
                    >
                      <option value="all">All Types</option>
                      <option value="session">Sessions</option>
                      <option value="validation">Validations</option>
                      <option value="asset">Assets</option>
                    </select>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
                    >
                      <option value="all">All Categories</option>
                      <option value="device">Device</option>
                      <option value="material">Material</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-400 ml-auto self-center">
                    {filteredLogs.length} records
                  </p>
                </div>
              </div>

              <div className="hl-card overflow-hidden">
                {filteredLogs.length === 0 ? (
                  <div className="hl-empty">
                    <Activity className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-gray-500 font-medium text-sm">
                      No log entries found
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your filters
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filteredLogs.map((log) => {
                      const sc = getLogStatus(log.type, log.status);
                      const typeBadgeCls =
                        log.type === "session"
                          ? "bg-blue-100 text-blue-700"
                          : log.type === "validation"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-emerald-100 text-emerald-700";
                      return (
                        <div
                          key={log.id}
                          className="hl-log-row px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                              {getTypeIcon(log.type, log.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                <span className="font-semibold text-gray-900 text-sm truncate max-w-[180px]">
                                  {log.title}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${typeBadgeCls}`}
                                >
                                  {log.type}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                {log.sub && (
                                  <span className="truncate max-w-[120px] mono">
                                    {log.sub}
                                  </span>
                                )}
                                {log.location && log.location !== "-" && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5" />{" "}
                                    {log.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                            {log.type === "session" && (
                              <div className="flex items-center gap-1.5 w-20">
                                <div className="hl-prog-track flex-1">
                                  <div
                                    className="hl-prog-fill"
                                    style={{
                                      width: `${log.progress}%`,
                                      background:
                                        log.progress === 100
                                          ? "#10b981"
                                          : log.progress > 50
                                            ? "#2563eb"
                                            : "#f59e0b",
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">
                                  {log.progress}%
                                </span>
                              </div>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${sc.cls}`}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: sc.dot,
                                  display: "inline-block",
                                }}
                              />
                              {sc.label}
                            </span>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs text-gray-500">
                                {formatDate(log.date)}
                              </div>
                              <div className="text-xs text-gray-400 hidden sm:block">
                                {formatTime(log.date)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {filteredLogs.length > 0 && (
                  <div className="hl-footer">
                    <p className="text-xs text-gray-500">
                      Showing{" "}
                      <span className="font-semibold">
                        {filteredLogs.length}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold">
                        {derived.logs.length}
                      </span>{" "}
                      records
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Updated {new Date().toLocaleTimeString("id-ID")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </LayoutDashboard>
    </ProtectedPage>
  );
}
