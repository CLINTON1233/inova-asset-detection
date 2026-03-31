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
  Filter,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  Eye,
  MapPin,
  BarChart2,
  Activity,
  Zap,
  AlertCircle,
  Loader2,
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
} from "recharts";
import Swal from "sweetalert2";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";

// ─── Mini Donut ──────────────────────────────────────────────────────────────
const MiniDonut = ({ pct, color, size = 80, stroke = 8 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <span className="text-xs font-bold text-gray-800 z-10">{Math.round(pct)}%</span>
    </div>
  );
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent, icon: Icon, trend }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + "18" }}>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
    </div>
    <span className="text-3xl font-bold" style={{ color: accent }}>{value}</span>
    {sub && <p className="text-xs text-gray-400">{sub}</p>}
  </div>
);

export default function HistoryLogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Raw data
  const [sessions, setSessions] = useState([]);
  const [validations, setValidations] = useState([]);
  const [assets, setAssets] = useState([]);

  // Filters
  const [timeRange, setTimeRange] = useState("30d");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [logTypeFilter, setLogTypeFilter] = useState("all");
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
        fetch(API_ENDPOINTS.SCANNING_PREP_LIST_ALL).then(r => r.json()),
        fetch(API_ENDPOINTS.VALIDATIONS_LIST).then(r => r.json()),
        fetch(API_ENDPOINTS.ASSETS_LIST).then(r => r.json()),
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

  // ─── Derived stats ──────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const totalSessions = sessions.length;
    const deviceSessions = sessions.filter(s => s.type === "device").length;
    const materialSessions = sessions.filter(s => s.type === "material").length;
    const completedSessions = sessions.filter(s => s.status === "completed").length;
    const inProgressSessions = sessions.filter(s => s.status === "in-progress").length;
    const pendingSessions = sessions.filter(s => s.status === "pending").length;

    const totalQty = sessions.reduce((s, sess) => s + (sess.totalQty || 0), 0);
    const totalScanned = sessions.reduce((s, sess) => s + (sess.totalScanned || 0), 0);

    const totalValidations = validations.length;
    const approvedVal = validations.filter(v => v.validation_status === "approved").length;
    const pendingVal = validations.filter(v => v.validation_status === "pending").length;
    const rejectedVal = validations.filter(v => v.validation_status === "rejected").length;

    const totalAssets = assets.length;
    const deviceAssets = assets.filter(a => a.category === "Device").length;
    const materialAssets = assets.filter(a => a.category === "Material").length;

    const successRate = totalScanned > 0 ? (approvedVal / totalScanned) * 100 : 0;
    const scanPct = totalQty > 0 ? (totalScanned / totalQty) * 100 : 0;
    const completionPct = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    // Weekly chart data (last 7 days)
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyData = days.map(day => ({ name: day, Sessions: 0, Validations: 0, Assets: 0 }));

    sessions.forEach(s => {
      const d = new Date(s.checking_date || s.created_at);
      const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      weeklyData[idx].Sessions += 1;
    });
    validations.forEach(v => {
      const d = new Date(v.created_at);
      const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      weeklyData[idx].Validations += 1;
    });
    assets.forEach(a => {
      const d = new Date(a.validated_at || a.created_at);
      const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      weeklyData[idx].Assets += 1;
    });

    // Session status pie
    const sessionStatusData = [
      { name: "Completed", value: completedSessions, color: "#10b981" },
      { name: "In Progress", value: inProgressSessions, color: "#2563eb" },
      { name: "Pending", value: pendingSessions, color: "#f59e0b" },
    ].filter(d => d.value > 0);

    // Validation status pie
    const validationStatusData = [
      { name: "Approved", value: approvedVal, color: "#10b981" },
      { name: "Pending", value: pendingVal, color: "#f59e0b" },
      { name: "Rejected", value: rejectedVal, color: "#ef4444" },
    ].filter(d => d.value > 0);

    // Asset distribution
    const assetTypeMap = new Map();
    assets.forEach(a => {
      const key = a.asset_type || a.category || "Other";
      assetTypeMap.set(key, (assetTypeMap.get(key) || 0) + 1);
    });
    const assetDistribution = Array.from(assetTypeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Scanning progress per session
    const sessionProgress = sessions.slice(0, 8).map(s => ({
      name: (s.checking_name || "").substring(0, 16),
      scanned: s.totalScanned || 0,
      total: s.totalQty || 0,
      pct: s.totalQty > 0 ? Math.round(((s.totalScanned || 0) / s.totalQty) * 100) : 0,
    }));

    // Build unified log entries
    const logs = [];

    sessions.forEach(s => {
      logs.push({
        id: `sess-${s.id_preparation}`,
        type: "session",
        title: s.checking_name || "Scanning Session",
        sub: s.checking_number || "",
        category: s.type === "device" ? "Device" : "Material",
        status: s.status,
        location: s.location_name || "-",
        date: s.created_at || s.checking_date,
        detail: `${s.totalScanned || 0}/${s.totalQty || 0} scanned`,
        progress: s.totalQty > 0 ? Math.round(((s.totalScanned || 0) / s.totalQty) * 100) : 0,
      });
    });

    validations.forEach(v => {
      logs.push({
        id: `val-${v.id_validation}`,
        type: "validation",
        title: v.item_name || "Unknown Item",
        sub: v.serial_or_code || "",
        category: v.validation_type === "device" ? "Device" : "Material",
        status: v.validation_status,
        location: v.location_name || "-",
        date: v.created_at,
        detail: v.checking_name || "-",
        progress: v.validation_status === "approved" ? 100 : v.validation_status === "rejected" ? 0 : 50,
      });
    });

    assets.forEach(a => {
      logs.push({
        id: `asset-${a.id_assets}`,
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

    return {
      totalSessions, deviceSessions, materialSessions,
      completedSessions, inProgressSessions, pendingSessions,
      totalQty, totalScanned, totalValidations,
      approvedVal, pendingVal, rejectedVal,
      totalAssets, deviceAssets, materialAssets,
      successRate, scanPct, completionPct,
      weeklyData, sessionStatusData, validationStatusData,
      assetDistribution, sessionProgress, logs,
    };
  }, [sessions, validations, assets]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = derived.logs;
    if (logTypeFilter !== "all") result = result.filter(l => l.type === logTypeFilter);
    if (typeFilter !== "all") result = result.filter(l => l.category?.toLowerCase() === typeFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.sub.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q)
      );
    }
    return result;
  }, [derived.logs, logTypeFilter, typeFilter, searchTerm]);

  const formatDate = (d) => {
    if (!d) return "-";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  };
  const formatTime = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const getLogStatusConfig = (type, status) => {
    if (type === "session") {
      if (status === "completed") return { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", label: "Completed" };
      if (status === "in-progress") return { dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50", label: "In Progress" };
      return { dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50", label: "Pending" };
    }
    if (type === "validation") {
      if (status === "approved") return { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", label: "Approved" };
      if (status === "rejected") return { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", label: "Rejected" };
      return { dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50", label: "Pending" };
    }
    if (status === "active") return { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", label: "Active" };
    return { dot: "bg-gray-400", text: "text-gray-700", bg: "bg-gray-50", label: status };
  };

  const getTypeIcon = (type, category) => {
    if (type === "session") return <ScanLine className="w-4 h-4 text-blue-600" />;
    if (type === "validation") return <Shield className="w-4 h-4 text-purple-600" />;
    if (category === "Device") return <Cpu className="w-4 h-4 text-blue-600" />;
    return <Cable className="w-4 h-4 text-green-600" />;
  };

  const getTypeBadge = (type) => {
    if (type === "session") return "bg-blue-100 text-blue-700";
    if (type === "validation") return "bg-purple-100 text-purple-700";
    return "bg-emerald-100 text-emerald-700";
  };

  if (!mounted || loading) {
    return (
      <ProtectedPage>
        <LayoutDashboard activeMenu={3}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">Loading history & logs...</p>
            </div>
          </div>
        </LayoutDashboard>
      </ProtectedPage>
    );
  }

  const TABS = [
    { id: "overview", label: "Overview", icon: BarChart2 },
    { id: "scanning", label: "Scanning", icon: ScanLine },
    { id: "validation", label: "Validation", icon: Shield },
    { id: "assets", label: "Assets", icon: Box },
    { id: "logs", label: "Activity Logs", icon: Activity },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}: <span className="font-bold ml-1">{p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu={3}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
          .hl-root { font-family: 'DM Sans', sans-serif; }
          .hl-root .mono { font-family: 'DM Mono', monospace; }
          .hl-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04);
            transition: box-shadow 0.2s ease;
          }
          .hl-card:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04); }
          .tab-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 500;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.15s;
            border: none;
            background: none;
            white-space: nowrap;
          }
          .tab-btn:hover { background: #f3f4f6; color: #374151; }
          .tab-btn.active { background: #2563eb; color: #fff; }
          .log-row { transition: background 0.12s; }
          .log-row:hover { background: #f8faff; }
          .prog-bar { background: #e5e7eb; border-radius: 99px; height: 4px; }
          .prog-fill { border-radius: 99px; height: 4px; transition: width 0.4s ease; }
          .section-label {
            font-size: 11px;
            font-weight: 700;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .kpi-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
        `}</style>

        <div className="hl-root space-y-5 max-w-7xl mx-auto">
          {/* ── Header ── */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <History className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">History & Activity Logs</h1>
              </div>
              <p className="text-sm text-gray-500">
                Realtime statistics & complete activity records from all modules
              </p>
            </div>
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 bg-white shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ═══════════ OVERVIEW ═══════════ */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* KPI row */}
              <div className="kpi-grid">
                <StatCard label="Total Sessions" value={derived.totalSessions} sub={`${derived.completedSessions} completed`} accent="#2563eb" icon={ScanLine} />
                <StatCard label="Items Scanned" value={derived.totalScanned} sub={`of ${derived.totalQty} total qty`} accent="#6366f1" icon={Zap} />
                <StatCard label="Validations" value={derived.totalValidations} sub={`${derived.approvedVal} approved`} accent="#10b981" icon={Shield} />
                <StatCard label="Assets Created" value={derived.totalAssets} sub={`${derived.deviceAssets} devices, ${derived.materialAssets} materials`} accent="#f59e0b" icon={Box} />
              </div>

              {/* Donut row */}
              <div className="hl-card p-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
                  {[
                    { title: "Scan Progress", pct: derived.scanPct, color: "#2563eb", sub: `${Math.round(derived.scanPct)}% items scanned` },
                    { title: "Session Completion", pct: derived.completionPct, color: "#6366f1", sub: `${derived.completedSessions}/${derived.totalSessions} done` },
                    { title: "Approval Rate", pct: derived.totalValidations > 0 ? (derived.approvedVal / derived.totalValidations) * 100 : 0, color: "#10b981", sub: `${derived.approvedVal} approved` },
                    { title: "Rejection Rate", pct: derived.totalValidations > 0 ? (derived.rejectedVal / derived.totalValidations) * 100 : 0, color: "#ef4444", sub: `${derived.rejectedVal} rejected` },
                  ].map((d, i) => (
                    <div key={i} className="flex flex-col items-center py-5 px-3 gap-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">{d.title}</p>
                      <MiniDonut pct={d.pct} color={d.color} size={80} stroke={8} />
                      <p className="text-xs text-gray-400 text-center">{d.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly activity chart */}
              <div className="hl-card p-5">
                <p className="section-label"><TrendingUp className="w-3.5 h-3.5" /> Weekly Activity</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={derived.weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Sessions" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="Validations" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="Assets" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-4 justify-center mt-3">
                  {[
                    { color: "#2563eb", label: "Sessions" },
                    { color: "#6366f1", label: "Validations" },
                    { color: "#10b981", label: "Assets" },
                  ].map(item => (
                    <span key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Two pie charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Session status */}
                <div className="hl-card p-5">
                  <p className="section-label"><ScanLine className="w-3.5 h-3.5" /> Session Status Breakdown</p>
                  <div className="flex items-center gap-6">
                    <div style={{ width: 130, height: 130 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={derived.sessionStatusData} dataKey="value" cx="50%" cy="50%"
                            innerRadius={38} outerRadius={58} paddingAngle={2} strokeWidth={0}>
                            {derived.sessionStatusData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                      {derived.sessionStatusData.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                            <span className="text-gray-600">{d.name}</span>
                          </div>
                          <span className="font-semibold text-gray-800">{d.value}</span>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
                        Total: {derived.totalSessions} sessions
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation status */}
                <div className="hl-card p-5">
                  <p className="section-label"><Shield className="w-3.5 h-3.5" /> Validation Status Breakdown</p>
                  <div className="flex items-center gap-6">
                    <div style={{ width: 130, height: 130 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={derived.validationStatusData} dataKey="value" cx="50%" cy="50%"
                            innerRadius={38} outerRadius={58} paddingAngle={2} strokeWidth={0}>
                            {derived.validationStatusData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                      {derived.validationStatusData.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                            <span className="text-gray-600">{d.name}</span>
                          </div>
                          <span className="font-semibold text-gray-800">{d.value}</span>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
                        Total: {derived.totalValidations} validations
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ SCANNING ═══════════ */}
          {activeTab === "scanning" && (
            <div className="space-y-5">
              <div className="kpi-grid">
                <StatCard label="Total Sessions" value={derived.totalSessions} sub="All sessions" accent="#2563eb" icon={ScanLine} />
                <StatCard label="Device Sessions" value={derived.deviceSessions} sub="Device type" accent="#3b82f6" icon={Cpu} />
                <StatCard label="Material Sessions" value={derived.materialSessions} sub="Material type" accent="#10b981" icon={Cable} />
                <StatCard label="Completed" value={derived.completedSessions} sub={`${Math.round(derived.completionPct)}% rate`} accent="#10b981" icon={CheckCircle} />
                <StatCard label="In Progress" value={derived.inProgressSessions} sub="Active now" accent="#6366f1" icon={Activity} />
                <StatCard label="Pending" value={derived.pendingSessions} sub="Not started" accent="#f59e0b" icon={Clock} />
              </div>

              {/* Scan progress per session */}
              <div className="hl-card p-5">
                <p className="section-label"><BarChart2 className="w-3.5 h-3.5" /> Session Scan Progress</p>
                {derived.sessionProgress.length > 0 ? (
                  <div className="space-y-4">
                    {derived.sessionProgress.map((s, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-700 font-medium">{s.name}</span>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{s.scanned}/{s.total}</span>
                            <span className="font-semibold" style={{ color: s.pct === 100 ? "#10b981" : "#2563eb" }}>{s.pct}%</span>
                          </div>
                        </div>
                        <div className="prog-bar">
                          <div
                            className="prog-fill"
                            style={{
                              width: `${s.pct}%`,
                              background: s.pct === 100 ? "#10b981" : s.pct > 50 ? "#2563eb" : "#f59e0b"
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-400 text-sm">No session data available</div>
                )}
              </div>

              {/* Sessions table */}
              <div className="hl-card overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <p className="section-label mb-0" style={{ marginBottom: 0 }}>
                    <ScanLine className="w-3.5 h-3.5" /> All Scanning Sessions
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {["Session", "Type", "Location", "Progress", "Status", "Date"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No sessions found</td></tr>
                      ) : sessions.map((s, i) => {
                        const pct = s.totalQty > 0 ? Math.round(((s.totalScanned || 0) / s.totalQty) * 100) : 0;
                        const sc = s.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : s.status === "in-progress"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200";
                        return (
                          <tr key={i} className="log-row border-t border-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900">{s.checking_name}</div>
                              <div className="text-xs text-gray-400 font-mono">{s.checking_number}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.type === "device" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                                {s.type === "device" ? "Device" : "Material"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{s.location_name || "-"}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="prog-bar w-20">
                                  <div className="prog-fill" style={{ width: `${pct}%`, background: pct === 100 ? "#10b981" : "#2563eb" }} />
                                </div>
                                <span className="text-xs font-semibold text-gray-600">{pct}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full border capitalize ${sc}`}>{s.status}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{formatDate(s.created_at || s.checking_date)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ VALIDATION ═══════════ */}
          {activeTab === "validation" && (
            <div className="space-y-5">
              <div className="kpi-grid">
                <StatCard label="Total Validations" value={derived.totalValidations} sub="All records" accent="#6366f1" icon={Shield} />
                <StatCard label="Approved" value={derived.approvedVal} sub={`${derived.totalValidations > 0 ? Math.round((derived.approvedVal / derived.totalValidations) * 100) : 0}% rate`} accent="#10b981" icon={CheckCircle} />
                <StatCard label="Pending Review" value={derived.pendingVal} sub="Awaiting action" accent="#f59e0b" icon={Clock} />
                <StatCard label="Rejected" value={derived.rejectedVal} sub="Declined items" accent="#ef4444" icon={XCircle} />
              </div>

              {/* Validation detail table */}
              <div className="hl-card overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <p className="section-label mb-0" style={{ marginBottom: 0 }}>
                    <Shield className="w-3.5 h-3.5" /> Validation Records
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {["Item", "Type", "Code", "Session", "Status", "Date"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validations.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No validations found</td></tr>
                      ) : validations.map((v, i) => {
                        const sc = v.validation_status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : v.validation_status === "rejected"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-amber-50 text-amber-700 border-amber-200";
                        const label = v.validation_status === "approved" ? "Approved"
                          : v.validation_status === "rejected" ? "Rejected" : "Pending";
                        return (
                          <tr key={i} className="log-row border-t border-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900">{v.item_name || "-"}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v.validation_type === "device" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                                {v.validation_type === "device" ? "Device" : "Material"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">{v.serial_or_code || "-"}</code>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{v.checking_name || "-"}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${sc}`}>{label}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{formatDate(v.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ ASSETS ═══════════ */}
          {activeTab === "assets" && (
            <div className="space-y-5">
              <div className="kpi-grid">
                <StatCard label="Total Assets" value={derived.totalAssets} sub="In inventory" accent="#2563eb" icon={Box} />
                <StatCard label="Devices" value={derived.deviceAssets} sub="IT devices" accent="#3b82f6" icon={Cpu} />
                <StatCard label="Materials" value={derived.materialAssets} sub="IT materials" accent="#10b981" icon={Cable} />
                <StatCard label="Validated" value={derived.approvedVal} sub="From validations" accent="#6366f1" icon={CheckCircle} />
              </div>

              {/* Asset distribution */}
              {derived.assetDistribution.length > 0 && (
                <div className="hl-card p-5">
                  <p className="section-label"><BarChart2 className="w-3.5 h-3.5" /> Asset Type Distribution</p>
                  <div className="space-y-3">
                    {derived.assetDistribution.map((item, i) => {
                      const total = derived.assetDistribution.reduce((s, a) => s + a.value, 0);
                      const pct = total > 0 ? (item.value / total) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{item.name}</span>
                            <span className="font-semibold text-gray-800">{item.value} <span className="text-xs text-gray-400 font-normal">({Math.round(pct)}%)</span></span>
                          </div>
                          <div className="prog-bar">
                            <div className="prog-fill" style={{ width: `${pct}%`, background: i % 2 === 0 ? "#2563eb" : "#10b981" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assets table */}
              <div className="hl-card overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <p className="section-label mb-0" style={{ marginBottom: 0 }}>
                    <Box className="w-3.5 h-3.5" /> Asset Records
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {["Asset Code", "Name", "Category", "Department", "Location", "Validated"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {assets.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No assets found</td></tr>
                      ) : assets.map((a, i) => (
                        <tr key={i} className="log-row border-t border-gray-50">
                          <td className="px-4 py-3">
                            <code className="text-xs font-mono text-blue-700 font-semibold">{a.asset_code}</code>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-sm">{a.asset_name}</div>
                            <div className="text-xs text-gray-400">{a.asset_type || "-"}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.category === "Device" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                              {a.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{a.department_name || "-"}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{a.location_name || "-"}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{formatDate(a.validated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ ACTIVITY LOGS ═══════════ */}
          {activeTab === "logs" && (
            <div className="space-y-4">
              {/* Filters toolbar */}
              <div className="hl-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <select
                    value={logTypeFilter}
                    onChange={e => setLogTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="session">Sessions</option>
                    <option value="validation">Validations</option>
                    <option value="asset">Assets</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="device">Device</option>
                    <option value="material">Material</option>
                  </select>

                  <p className="text-xs text-gray-400 ml-auto">
                    {filteredLogs.length} records
                  </p>
                </div>
              </div>

              {/* Log entries */}
              <div className="hl-card overflow-hidden">
                {filteredLogs.length === 0 ? (
                  <div className="py-16 text-center">
                    <Activity className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No log entries found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filteredLogs.map((log, i) => {
                      const sc = getLogStatusConfig(log.type, log.status);
                      return (
                        <div key={log.id} className="log-row px-5 py-3.5 flex items-center gap-4">
                          {/* Icon */}
                          <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                            {getTypeIcon(log.type, log.category)}
                          </div>

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-semibold text-gray-900 text-sm truncate">{log.title}</span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${getTypeBadge(log.type)}`}>
                                {log.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              {log.sub && <span className="font-mono">{log.sub}</span>}
                              {log.location && log.location !== "-" && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" /> {log.location}
                                </span>
                              )}
                              {log.detail && log.detail !== "-" && <span>{log.detail}</span>}
                            </div>
                          </div>

                          {/* Progress (for sessions) */}
                          {log.type === "session" && (
                            <div className="hidden md:flex items-center gap-2 w-28">
                              <div className="prog-bar flex-1">
                                <div className="prog-fill" style={{
                                  width: `${log.progress}%`,
                                  background: log.progress === 100 ? "#10b981" : log.progress > 50 ? "#2563eb" : "#f59e0b"
                                }} />
                              </div>
                              <span className="text-xs text-gray-500 w-8 text-right">{log.progress}%</span>
                            </div>
                          )}

                          {/* Status */}
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text} flex-shrink-0`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>

                          {/* Date */}
                          <div className="text-right hidden sm:block flex-shrink-0">
                            <div className="text-xs text-gray-500">{formatDate(log.date)}</div>
                            <div className="text-xs text-gray-400">{formatTime(log.date)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer */}
                {filteredLogs.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                    <p className="text-xs text-gray-400">
                      Showing <span className="font-semibold text-gray-600">{filteredLogs.length}</span> of{" "}
                      <span className="font-semibold text-gray-600">{derived.logs.length}</span> total records
                      {" "}· Updated {new Date().toLocaleTimeString("en-US")}
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