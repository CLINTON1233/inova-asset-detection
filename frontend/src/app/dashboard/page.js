"use client";

import { useState, useEffect } from "react";
import {
  Box,
  CheckCircle,
  AlertTriangle,
  Shield,
  Zap,
  TrendingUp,
  Filter,
  FileText,
  ChevronDown,
  Camera,
  Cpu,
  Cable,
  Server,
  ScanLine,
  Eye,
  Settings,
  BarChart2,
  QrCode,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useRouter } from "next/navigation";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";
import Swal from "sweetalert2";

// ─── Inline Donut Component ─────────────────────────────────────────────────
const InlineDonut = ({ pct, color, size = 100, stroke = 10 }) => {
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
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="text-lg font-bold text-gray-800 z-10">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [validations, setValidations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentChecks, setRecentChecks] = useState([]);
  const [recentValidations, setRecentValidations] = useState([]);
  const [recentAssets, setRecentAssets] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const sessionsResponse = await fetch(API_ENDPOINTS.SCANNING_PREP_LIST_ALL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const sessionsResult = await sessionsResponse.json();

      const validationsResponse = await fetch(API_ENDPOINTS.VALIDATIONS_LIST, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const validationsResult = await validationsResponse.json();

      const assetsResponse = await fetch(API_ENDPOINTS.ASSETS_LIST, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const assetsResult = await assetsResponse.json();

      let sessionsData = [];
      let validationsData = [];
      let assetsData = [];

      if (sessionsResult.success) {
        sessionsData = sessionsResult.data.map((session) => ({
          ...session,
          type: session.type || (session.category_id === 1 ? "device" : "material"),
          totalQty: session.totalQty || session.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0,
          totalScanned: session.items?.reduce((sum, i) => sum + (i.scanned_count || 0), 0) || 0,
          totalItems: session.items?.length || 0,
          status: session.status || "pending",
          progress: session.progress || 0,
        }));
        setSessions(sessionsData);
      }

      if (validationsResult.success) {
        validationsData = validationsResult.data || [];
        setValidations(validationsData);
        setRecentValidations(validationsData.slice(0, 5));
      }

      if (assetsResult.success) {
        assetsData = assetsResult.data || [];
        setAssets(assetsData);
        setRecentAssets(assetsData.slice(0, 5));
      }

      const allScanResults = [];

      for (const session of sessionsData) {
        try {
          let progressResponse;
          if (session.type === "device") {
            progressResponse = await fetch(API_ENDPOINTS.DEVICES_SCANNING_PREP_PROGRESS(session.id_preparation));
          } else {
            progressResponse = await fetch(API_ENDPOINTS.MATERIALS_SCANNING_PREP_PROGRESS(session.id_preparation));
          }

          const progressData = await progressResponse.json();

          if (progressData.success && progressData.data.scan_results) {
            for (const scan of progressData.data.scan_results) {
              const item = session.items?.find(i => i.id_item === scan.scanning_item_id);
              if (item) {
                allScanResults.push({
                  id: scan.id_scan || `SCAN-${Date.now()}`,
                  jenisAset: item.device_name || item.material_name || item.item_name || "Unknown",
                  kategori: session.type === "device" ? "Perangkat" : "Material",
                  lokasi: session.location_name || "Unknown",
                  status: scan.status === "submitted" ? "Valid" :
                    scan.status === "rejected" ? "Error" : "Tertunda",
                  tanggal: scan.scanned_at ? new Date(scan.scanned_at).toLocaleDateString("id-ID") : new Date().toLocaleDateString("id-ID"),
                  waktu: scan.scanned_at ? new Date(scan.scanned_at).toLocaleTimeString("id-ID") : new Date().toLocaleTimeString("id-ID"),
                  nomorSeri: scan.serial_number || scan.scan_code || "-",
                  validation_status: scan.status === "submitted" ? "Submitted" :
                    scan.status === "rejected" ? "Rejected" : "Pending",
                  preparation_id: session.id_preparation,
                  scan_id: scan.id_scan,
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching scan results for session ${session.id_preparation}:`, error);
        }
      }

      allScanResults.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
      setRecentChecks(allScanResults.slice(0, 5));

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to load dashboard data",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalSessions = sessions.length;
  const totalDevices = sessions.filter(s => s.type === "device").length;
  const totalMaterials = sessions.filter(s => s.type === "material").length;
  const totalQuantity = sessions.reduce((sum, s) => sum + (s.totalQty || 0), 0);
  const totalScanned = sessions.reduce((sum, s) => sum + (s.totalScanned || 0), 0);
  const pendingSessions = sessions.filter(s => s.status === "pending").length;
  const inProgressSessions = sessions.filter(s => s.status === "in-progress").length;
  const completedSessions = sessions.filter(s => s.status === "completed").length;

  const totalValidations = validations.length;
  const approvedValidations = validations.filter(v => v.validation_status === "approved").length;
  const pendingValidations = validations.filter(v => v.validation_status === "pending").length;
  const rejectedValidations = validations.filter(v => v.validation_status === "rejected").length;

  const totalAssets = assets.length;
  const deviceAssets = assets.filter(a => a.asset_type === "device" || a.type === "device").length;
  const materialAssets = assets.filter(a => a.asset_type === "material" || a.type === "material").length;

  const validPct = totalValidations > 0 ? (approvedValidations / totalValidations) * 100 : 0;
  const errorPct = totalValidations > 0 ? (rejectedValidations / totalValidations) * 100 : 0;
  const pendingPct = totalValidations > 0 ? (pendingValidations / totalValidations) * 100 : 0;
  const scanSuccessRate = totalScanned > 0 ? (approvedValidations / totalScanned) * 100 : 0;

  const errorAssets = rejectedValidations;

  const todayScanned = sessions.reduce((sum, s) => {
    const today = new Date().toDateString();
    const sessionDate = s.checking_date ? new Date(s.checking_date).toDateString() : null;
    return sum + (sessionDate === today ? (s.totalScanned || 0) : 0);
  }, 0);

  const stats = [
    {
      label: "Total IT Assets",
      value: totalAssets,
      description: "IT Devices & Materials",
    },
    {
      label: "Verified Today",
      value: todayScanned,
      description: "Serial Numbers & Scan Code",
    },
    {
      label: "Pending Validations",
      value: pendingValidations,
      description: "Awaiting Validation",
    },
    {
      label: "Rejected Items",
      value: errorAssets,
      description: "Requires Re-Scanning",
    },
  ];

  const getWeeklyData = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyData = days.map(day => ({
      name: day,
      Approved: 0,
      Pending: 0,
      Rejected: 0,
    }));

    validations.forEach(validation => {
      const date = new Date(validation.created_at);
      const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
      const dayData = weeklyData.find(d => d.name === dayName);
      if (dayData) {
        if (validation.validation_status === "approved") dayData.Approved += 1;
        else if (validation.validation_status === "pending") dayData.Pending += 1;
        else if (validation.validation_status === "rejected") dayData.Rejected += 1;
      }
    });

    return weeklyData;
  };

  const chartData = getWeeklyData();

  const assetStatusData = [
    { name: "Approved", value: approvedValidations, color: "#2563eb" },
    { name: "Pending", value: pendingValidations, color: "#f59e0b" },
    { name: "Rejected", value: rejectedValidations, color: "#dc2626" },
  ];

  const getAssetTypeDistribution = () => {
    const typeMap = new Map();
    assets.forEach(asset => {
      const category = asset.asset_type === "device" ? "Perangkat" : "Material";
      typeMap.set(category, (typeMap.get(category) || 0) + 1);
    });
    if (assets.length === 0) {
      sessions.forEach(session => {
        const category = session.type === "device" ? "Perangkat" : "Material";
        typeMap.set(category, (typeMap.get(category) || 0) + (session.totalQty || 0));
      });
    }
    return Array.from(typeMap.entries())
      .map(([name, jumlah]) => ({ name, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);
  };

  const assetTypeData = getAssetTypeDistribution();
  const totalAset = assetTypeData.reduce((sum, item) => sum + item.jumlah, 0);

  const getStatusColor = (status) => {
    switch (status) {
      case "Valid":
      case "Approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "Error":
      case "Rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "Tertunda":
      case "Pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Submitted":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getCategoryIcon = (kategori) => {
    switch (kategori) {
      case "Perangkat":
        return <Cpu className="w-4 h-4 text-blue-600" />;
      case "Material":
        return <Cable className="w-4 h-4 text-green-600" />;
      default:
        return <Server className="w-4 h-4 text-gray-600" />;
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = assetStatusData.reduce((sum, item) => sum + item.value, 0);
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value} validations ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <ProtectedPage>
        <LayoutDashboard>
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
            </div>
          </div>
        </LayoutDashboard>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <LayoutDashboard>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

          .db-root {
            font-family: 'DM Sans', sans-serif;
          }

          .db-root .mono {
            font-family: 'DM Mono', monospace;
          }

          /* ── Card — sama persis dengan profile page ── */
          .db-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: box-shadow 0.2s ease;
          }
          .db-card:hover {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          }

          /* ── Section Title — sama persis dengan profile page ── */
          .db-section-title {
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

          /* ── Stat Box — sama persis dengan profile page ── */
          .db-stat-box {
            background-color: #f9fafb;
            border: 1px solid #f3f4f6;
            border-radius: 12px;
            padding: 12px;
          }
          .db-stat-box .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            line-height: 1.2;
          }
          .db-stat-box .stat-label {
            font-size: 0.75rem;
            font-weight: 500;
            color: #6b7280;
            margin-top: 4px;
          }
          .db-stat-box .stat-desc {
            font-size: 0.7rem;
            color: #9ca3af;
            margin-top: 4px;
          }

          /* ── Donut Card ── */
          .db-donut-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 12px;
          }
          .db-donut-card h4 {
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            text-align: center;
            margin-bottom: 12px;
          }

          /* ── Quick Action Button — mengikuti gaya profile page ── */
          .db-action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px 12px;
            background: #f9fafb;
            border: 1px solid #f3f4f6;
            border-radius: 12px;
            transition: all 0.2s ease;
            cursor: pointer;
          }
          .db-action-btn:hover {
            background: #f3f4f6;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07);
          }
          .db-action-btn .icon-wrap {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
            transition: transform 0.2s ease;
          }
          .db-action-btn:hover .icon-wrap {
            transform: scale(1.1);
          }
          .db-action-btn .btn-label {
            font-size: 0.8125rem;
            font-weight: 600;
            color: #1f2937;
          }
          .db-action-btn .btn-desc {
            font-size: 0.7rem;
            color: #6b7280;
            margin-top: 4px;
            text-align: center;
          }

          /* ── Sidebar Quick Action Row ── */
          .db-sidebar-action {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px;
            border-radius: 10px;
            transition: background 0.2s ease;
            cursor: pointer;
            border: none;
            background: transparent;
          }
          .db-sidebar-action:hover {
            background: #f3f4f6;
          }
          .db-sidebar-action .icon-wrap {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .db-sidebar-action span {
            font-size: 0.8125rem;
            font-weight: 500;
            color: #4b5563;
          }

          /* ── Bullet dot ── */
          .bullet-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 6px;
            flex-shrink: 0;
          }
        `}</style>

        <div className="db-root space-y-5">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                IT Assets Inventory System
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Automatic Validation of IT Asset Serial Numbers or Scan Code (Devices &amp; Materials)
              </p>
            </div>
          </div>

          {/* ── Main Layout ── */}
          <div className="flex flex-col xl:flex-row gap-5">

            {/* ══ LEFT COLUMN ══ */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* ── Row 1: 4 Donut KPIs ── */}
              <div className="db-card">
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
                  {[
                    {
                      title: "Validation Rate",
                      pct: validPct,
                      color: "#2563eb",
                      sub: `${approvedValidations} of ${totalValidations} approved`,
                    },
                    {
                      title: "Pending",
                      pct: pendingPct,
                      color: "#f59e0b",
                      sub: `${pendingValidations} need review`,
                    },
                    {
                      title: "Success Rate",
                      pct: scanSuccessRate,
                      color: "#10b981",
                      sub: `${Math.round(scanSuccessRate)}% accuracy`,
                    },
                    {
                      title: "Complete Sessions",
                      pct: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
                      color: "#6366f1",
                      sub: `${completedSessions} of ${totalSessions} sessions`,
                    },
                  ].map((d, i) => (
                    <div key={i} className="db-donut-card">
                      <h4>{d.title}</h4>
                      <InlineDonut pct={d.pct} color={d.color} size={100} stroke={10} />
                      <p className="text-xs text-gray-500 mt-3 text-center">{d.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Row 2: Quick Actions ── */}
              <div className="db-card p-5">
                <p className="db-section-title">
                  <ScanLine className="w-4 h-4" /> Start Asset Checking
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      icon: ScanLine,
                      label: "Start Scan",
                      desc: "Check Devices & Materials",
                      href: "/scanning",
                    },
                    {
                      icon: CheckCircle,
                      label: "Validation",
                      desc: "Review Asset Checking Results",
                      href: "/validation_verification",
                    },
                    {
                      icon: FileText,
                      label: "Reports",
                      desc: "View Asset Checking Report Data",
                      href: "/reports",
                    },
                    {
                      icon: BarChart2,
                      label: "Monitoring",
                      desc: "View Device Checking Percentage",
                      href: "/history",
                    },
                  ].map((item, index) => (
                    <button
                      key={index}
                      onClick={() => router.push(item.href)}
                      className="db-action-btn"
                    >
                      <div className="icon-wrap">
                        <item.icon className="w-6 h-6 text-gray-700" strokeWidth={2} />
                      </div>
                      <span className="btn-label">{item.label}</span>
                      <span className="btn-desc">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Row 3: Charts ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Pie Chart */}
                <div className="db-card p-5 lg:col-span-1">
                  <p className="db-section-title">
                    <span className="bullet-dot bg-blue-600" /> Validation Status
                  </p>
                  <div className="flex flex-col items-center justify-center h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {assetStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-4 mt-2">
                      {assetStatusData.map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-sm"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs text-gray-600">
                            {item.name}: {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="db-card p-5 lg:col-span-2">
                  <p className="db-section-title">
                    <span className="bullet-dot bg-blue-600" /> Weekly Validation Activity
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#f3f4f6" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: 13,
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      />
                      <Bar dataKey="Approved" stackId="a" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="Pending" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="Rejected" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-4 justify-center mt-3">
                    {[
                      { color: "#2563eb", label: "Approved" },
                      { color: "#f59e0b", label: "Pending" },
                      { color: "#dc2626", label: "Rejected" },
                    ].map((item) => (
                      <span key={item.label} className="flex items-center gap-2 text-xs text-gray-500">
                        <span style={{ width: 20, height: 2, background: item.color, display: "inline-block" }} />
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Row 4: Asset Distribution ── */}
              <div className="db-card p-5">
                <p className="db-section-title">Asset Type Distribution</p>
                <div className="space-y-4">
                  {assetTypeData.length > 0 ? (
                    assetTypeData.map((item, index) => {
                      const percentage = totalAset > 0 ? (item.jumlah / totalAset) * 100 : 0;
                      return (
                        <div key={index}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 font-medium">{item.name}</span>
                            <span className="font-semibold text-gray-900">
                              {item.jumlah}{" "}
                              <span className="text-xs text-gray-500 font-normal">
                                ({percentage.toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                background: percentage > 50 ? "#10b981" : "#2563eb",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No asset data available
                    </div>
                  )}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">Total: {totalAset} Assets</span>
                    <br />
                    <span className="text-gray-600">
                      System automatically reads Serial Numbers for Devices and Scan Code for Materials.
                    </span>
                  </p>
                </div>
              </div>

              {/* ── Latest Asset Scanning Table ── */}
              <div className="db-card overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" /> Latest Asset Scans
                  </h3>
                  <button
                    onClick={() => router.push("/validation_verification")}
                    className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors"
                  >
                    View All Validations →
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {["Asset Name", "Type", "Location", "Status", "Date"].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentChecks.length > 0 ? (
                        recentChecks.map((row, index) => {
                          const handleRowClick = () => {
                            if (row.preparation_id) {
                              router.push(`/scanning?prep_id=${row.preparation_id}&type=${row.kategori === "Perangkat" ? "device" : "material"}`);
                            } else {
                              router.push(`/validation_verification`);
                            }
                          };

                          return (
                            <tr
                              key={index}
                              onClick={handleRowClick}
                              className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                    {getCategoryIcon(row.kategori)}
                                  </div>
                                  <span className="font-medium text-gray-900 max-w-[200px] truncate">
                                    {row.jenisAset}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${row.kategori === "Perangkat"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-green-100 text-green-700"
                                  }`}>
                                  {row.kategori === "Perangkat" ? "Device" : "Material"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600 max-w-[150px] truncate">
                                {row.lokasi}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(row.validation_status || row.status)}`}>
                                  {row.validation_status || row.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-xs text-gray-600">{row.tanggal}</div>
                                <div className="text-xs text-gray-400">{row.waktu}</div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-gray-500 text-sm">
                            No scan history available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Recent Validations Table ── */}
              {recentValidations.length > 0 && (
                <div className="db-card overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-500" /> Recent Validations
                    </h3>
                    <button
                      onClick={() => router.push("/validation_verification")}
                      className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          {["Item Name", "Serial/Code", "Type", "Status", "Date"].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentValidations.map((validation, index) => (
                          <tr key={index} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-900 font-medium">{validation.item_name || "-"}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{validation.serial_or_code || "-"}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${validation.validation_type === "device"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                                }`}>
                                {validation.validation_type === "device" ? "Device" : "Material"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(validation.validation_status)}`}>
                                {validation.validation_status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {validation.created_at
                                ? new Date(validation.created_at).toLocaleDateString("id-ID")
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ══ RIGHT COLUMN — System Summary ══ */}
            <div className="w-full xl:w-80 flex-shrink-0">
              <div className="db-card sticky top-4 overflow-hidden">

                {/* Header */}
                <div className="bg-[#1e3a5f] text-white text-center py-3 px-4 font-bold text-sm uppercase tracking-wide">
                  System Summary
                </div>

                <div className="p-4 space-y-4">

                  {/* Stat Cards — menggunakan db-stat-box sama seperti profile page */}
                  <div className="grid grid-cols-2 gap-2">
                    {stats.slice(0, 2).map((item, i) => (
                      <div key={i} className="db-stat-box">
                        <div className="stat-value">{item.value}</div>
                        <div className="stat-label">{item.label}</div>
                        <div className="stat-desc">{item.description}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {stats.slice(2, 4).map((item, i) => (
                      <div key={i} className="db-stat-box">
                        <div className="stat-value">{item.value}</div>
                        <div className="stat-label">{item.label}</div>
                        <div className="stat-desc">{item.description}</div>
                      </div>
                    ))}
                  </div>

                  {/* Session Breakdown */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Session Breakdown
                    </p>
                    <div className="space-y-1">
                      {[
                        { label: "Total Sessions", value: totalSessions, color: "text-gray-900" },
                        { label: "Device Sessions", value: totalDevices, color: "text-gray-900" },
                        { label: "Material Sessions", value: totalMaterials, color: "text-gray-900" },
                        { label: "In Progress", value: inProgressSessions, color: "text-gray-900" },
                        { label: "Completed", value: completedSessions, color: "text-gray-900" },
                      ].map((row, i) => (
                        <div key={i} className="flex justify-between items-center py-2 text-sm border-b border-gray-50">
                          <span className="text-gray-500">{row.label}</span>
                          <span className={`font-bold ${row.color}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Validation Summary */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Validation Summary
                    </p>
                    <div className="space-y-1">
                      {[
                        { label: "Total Validations", value: totalValidations, color: "text-gray-900" },
                        { label: "Approved", value: approvedValidations, color: "text-green-600" },
                        { label: "Rejected", value: rejectedValidations, color: "text-red-600" },
                      ].map((row, i) => (
                        <div key={i} className="flex justify-between items-center py-2 text-sm border-b border-gray-50">
                          <span className="text-gray-500">{row.label}</span>
                          <span className={`font-bold ${row.color}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Assets Summary */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Assets Summary
                    </p>
                    <div className="space-y-1">
                      {[
                        { label: "Total Assets", value: totalAssets, color: "text-gray-900" },
                        { label: "Devices", value: deviceAssets, color: "text-blue-600" },
                        { label: "Materials", value: materialAssets, color: "text-green-600" },
                      ].map((row, i) => (
                        <div key={i} className="flex justify-between items-center py-2 text-sm border-b border-gray-50">
                          <span className="text-gray-500">{row.label}</span>
                          <span className={`font-bold ${row.color}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Quick Actions
                    </p>
                    <div className="space-y-1">
                      {[
                        { label: "Start Scan", icon: ScanLine, href: "/scanning" },
                        { label: "View Validations", icon: Shield, href: "/validation_verification" },
                        { label: "Asset Inventory", icon: Box, href: "/assets" },
                        { label: "View Reports", icon: FileText, href: "/reports" },
                      ].map((action, i) => (
                        <button
                          key={i}
                          onClick={() => router.push(action.href)}
                          className="db-sidebar-action"
                        >
                          <div className="icon-wrap">
                            <action.icon className="w-4 h-4 text-gray-600" />
                          </div>
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </LayoutDashboard>
    </ProtectedPage>
  );
}