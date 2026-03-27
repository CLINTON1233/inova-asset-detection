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
  const [scanResults, setScanResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentChecks, setRecentChecks] = useState([]);

  // Fetch all sessions and scan results
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all scanning sessions
      const sessionsResponse = await fetch(API_ENDPOINTS.SCANNING_PREP_LIST_ALL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const sessionsResult = await sessionsResponse.json();

      if (sessionsResult.success) {
        const sessionsWithType = sessionsResult.data.map((session) => ({
          ...session,
          type: session.type || (session.category_id === 1 ? "device" : "material"),
          totalQty: session.totalQty || session.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0,
          totalScanned: session.items?.reduce((sum, i) => sum + (i.scanned_count || 0), 0) || 0,
        }));
        setSessions(sessionsWithType);

        // Build recent checks from sessions
        const allScanResults = [];
        for (const session of sessionsWithType) {
          if (session.items) {
            for (const item of session.items) {
              if (item.scanned_count > 0) {
                allScanResults.push({
                  id: `${session.type === "device" ? "DEV" : "MAT"}-${session.id_preparation}-${item.id_item}`,
                  jenisAset: item.device_name || item.material_name || item.item_name,
                  kategori: session.type === "device" ? "Perangkat" : "Material",
                  lokasi: session.location_name || "Unknown",
                  status: item.scanned_count === item.quantity ? "Valid" : "Tertunda",
                  tanggal: new Date(session.checking_date).toLocaleDateString("id-ID"),
                  waktu: new Date().toLocaleTimeString("id-ID"),
                  nomorSeri: item.scanned_count > 0 ? "Scanned" : "-",
                  barcode: item.scanned_count > 0 ? "Scanned" : "-",
                });
              }
            }
          }
        }
        setRecentChecks(allScanResults.slice(0, 5));
      }

      // Fetch scan results from localStorage or API
      const storedHistory = localStorage.getItem("scanCheckHistory");
      if (storedHistory) {
        const history = JSON.parse(storedHistory);
        setScanResults(history);
      }

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

  // Calculate statistics from sessions
  const totalSessions = sessions.length;
  const totalDevices = sessions.filter(s => s.type === "device").length;
  const totalMaterials = sessions.filter(s => s.type === "material").length;

  const totalItems = sessions.reduce((sum, s) => sum + (s.totalItems || 0), 0);
  const totalQuantity = sessions.reduce((sum, s) => sum + (s.totalQty || 0), 0);
  const totalScanned = sessions.reduce((sum, s) => sum + (s.totalScanned || 0), 0);

  const pendingSessions = sessions.filter(s => s.status === "pending").length;
  const inProgressSessions = sessions.filter(s => s.status === "in-progress").length;
  const completedSessions = sessions.filter(s => s.status === "completed").length;

  const validAssets = totalScanned;
  const pendingAssets = totalQuantity - totalScanned;
  const errorAssets = 0; // Placeholder, bisa diambil dari validations nanti

  const validPct = totalQuantity > 0 ? (validAssets / totalQuantity) * 100 : 0;
  const errorPct = totalQuantity > 0 ? (errorAssets / totalQuantity) * 100 : 0;
  const pendingPct = totalQuantity > 0 ? (pendingAssets / totalQuantity) * 100 : 0;

  const scanSuccessRate = totalQuantity > 0 ? (validAssets / totalQuantity) * 100 : 0;
  const todayScanned = 0; // Placeholder, bisa dihitung dari scan results hari ini

  // Statistik untuk KPI
  const stats = [
    {
      label: "Total IT Assets",
      value: totalQuantity,
      icon: Box,
      color: "bg-blue-600",
      trend: 12,
      change: "up",
      description: "IT Devices & Materials",
      pct: 100,
    },
    {
      label: "Verified Today",
      value: todayScanned,
      icon: CheckCircle,
      color: "bg-green-600",
      trend: 3,
      change: "up",
      description: "Serial Numbers & Barcodes",
      pct: 92,
    },
    {
      label: "Pending Inspections",
      value: pendingAssets,
      icon: AlertTriangle,
      color: "bg-blue-400",
      trend: 2,
      change: "down",
      description: "Awaiting Validation",
      pct: pendingPct,
    },
    {
      label: "Serial/Scan Code Errors",
      value: errorAssets,
      icon: QrCode,
      color: "bg-red-600",
      trend: 1,
      change: "up",
      description: "Requires Re-Scanning",
      pct: errorPct,
    },
  ];

  // Data Grafik Aktivitas (dari sessions per hari)
  const getWeeklyData = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyData = days.map(day => ({
      name: day,
      Valid: 0,
      Tertunda: 0,
      Error: 0,
    }));

    sessions.forEach(session => {
      const date = new Date(session.checking_date);
      const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
      const dayData = weeklyData.find(d => d.name === dayName);
      if (dayData) {
        const scanned = session.totalScanned || 0;
        const pending = (session.totalQty || 0) - scanned;
        dayData.Valid += scanned;
        dayData.Tertunda += pending;
      }
    });

    return weeklyData;
  };

  const chartData = getWeeklyData();

  // Ringkasan Status Aset
  const assetStatusData = [
    { name: "Valid", value: validAssets, color: "#2563eb" },
    { name: "Pending", value: pendingAssets, color: "#6366f1" },
    { name: "Error", value: errorAssets, color: "#dc2626" },
  ];

  // Distribusi Jenis Aset dari sessions
  const getAssetTypeDistribution = () => {
    const typeMap = new Map();

    sessions.forEach(session => {
      if (session.items) {
        session.items.forEach(item => {
          let category = "";
          if (session.type === "device") {
            const deviceName = (item.device_name || "").toLowerCase();
            if (deviceName.includes("laptop") || deviceName.includes("pc") || deviceName.includes("komputer")) {
              category = "Komputer & Laptop";
            } else if (deviceName.includes("monitor") || deviceName.includes("display")) {
              category = "Monitor & Display";
            } else if (deviceName.includes("server") || deviceName.includes("switch") || deviceName.includes("router")) {
              category = "Perangkat Jaringan";
            } else if (deviceName.includes("keyboard") || deviceName.includes("mouse")) {
              category = "Periferal";
            } else {
              category = "Perangkat Lainnya";
            }
          } else {
            const materialName = (item.material_name || "").toLowerCase();
            if (materialName.includes("kabel") || materialName.includes("cable")) {
              category = "Kabel";
            } else if (materialName.includes("connector") || materialName.includes("rj45")) {
              category = "Konektor";
            } else if (materialName.includes("trunking") || materialName.includes("pipa")) {
              category = "Instalasi";
            } else {
              category = "Material Lainnya";
            }
          }

          const qty = item.quantity || 0;
          typeMap.set(category, (typeMap.get(category) || 0) + qty);
        });
      }
    });

    return Array.from(typeMap.entries())
      .map(([name, jumlah]) => ({ name, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);
  };

  const assetTypeData = getAssetTypeDistribution();
  const totalAset = assetTypeData.reduce((sum, item) => sum + item.jumlah, 0);

  const getStatusColor = (status) => {
    switch (status) {
      case "Valid":
        return "bg-green-100 text-green-700 border-green-200";
      case "Error":
        return "bg-red-100 text-red-700 border-red-200";
      case "Tertunda":
        return "bg-blue-100 text-blue-700 border-blue-200";
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

  // Custom Tooltip untuk pie chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = assetStatusData.reduce((sum, item) => sum + item.value, 0);
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value} aset ({percentage}%)
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
          .bm-root { font-family: 'DM Sans', sans-serif; }
          .bm-root .mono { font-family: 'DM Mono', monospace; }
          .card { 
            background: #ffffff; 
            border-radius: 16px; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: box-shadow 0.2s ease;
          }
          .card:hover {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          }
          .section-title { font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
          .period-badge { background: #1e3a5f; color: #fff; padding: 4px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; }
          .donut-card { display: flex; flex-direction: column; align-items: center; padding: 20px 12px; }
          .donut-card h4 { font-size: 12px; font-weight: 600; color: #374151; text-align: center; margin-bottom: 12px; }
          .bullet-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
          .stat-box-grey {
            background-color: #f9fafb;
            border: 1px solid #f3f4f6;
            border-radius: 12px;
            padding: 12px;
          }
          .stat-box-grey .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
          }
          .stat-box-grey .stat-label {
            font-size: 0.75rem;
            font-weight: 500;
            color: #6b7280;
            margin-top: 4px;
          }
        `}</style>

        <div className="bm-root space-y-5">
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  IT Assets Inventory System
                </h1>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Automatic Validation of IT Asset Serial Numbers or Barcodes
                (Devices & Materials)
              </p>
            </div>
          </div>

          {/* ── Main Layout ── */}
          <div className="flex flex-col xl:flex-row gap-5">
            {/* ══ LEFT COLUMN ══ */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* ── Row 1: 4 Donut KPIs ── */}
              <div className="card">
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
                  {[
                    {
                      title: "Valid Assets",
                      pct: validPct,
                      color: "#2563eb",
                      sub: `${validAssets} of ${totalQuantity} assets`,
                    },
                    {
                      title: "Pending",
                      pct: pendingPct,
                      color: "#f59e0b",
                      sub: `${pendingAssets} assets need scanning`,
                    },
                    {
                      title: "Scan Success",
                      pct: scanSuccessRate,
                      color: "#10b981",
                      sub: `${Math.round(scanSuccessRate)}% accuracy rate`,
                    },
                    {
                      title: "Completed Sessions",
                      pct: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
                      color: "#6366f1",
                      sub: `${completedSessions} of ${totalSessions} sessions`,
                    },
                  ].map((d, i) => (
                    <div key={i} className="donut-card">
                      <h4>{d.title}</h4>
                      <InlineDonut
                        pct={d.pct}
                        color={d.color}
                        size={100}
                        stroke={10}
                      />
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        {d.sub}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Row 2: Quick Actions ── */}
              <div className="card p-5">
                <p className="section-title flex items-center gap-2">
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
                      label: "Checking Status",
                      desc: "Review Asset Checking Results",
                      href: "/validation-verification",
                    },
                    {
                      icon: FileText,
                      label: "Checking Reports",
                      desc: "View Asset Checking Report Data",
                      href: "/reports-analytics",
                    },
                    {
                      icon: BarChart2,
                      label: "Statistics",
                      desc: "View Device Checking Percentage",
                      href: "/monitoring",
                    },
                  ].map((item, index) => (
                    <button
                      key={index}
                      onClick={() => router.push(item.href)}
                      className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                        <item.icon
                          className="w-6 h-6 text-gray-700"
                          strokeWidth={2}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-800">
                        {item.label}
                      </span>
                      <span className="text-xs text-gray-500 mt-1 text-center">
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Row 3: Charts Section ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Pie Chart */}
                <div className="card p-5 lg:col-span-1">
                  <p className="section-title flex items-center gap-2">
                    <span className="bullet-dot bg-blue-600" /> Asset Validation
                    Status
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
                        <div
                          key={item.name}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-sm"
                            style={{ backgroundColor: item.color }}
                          ></span>
                          <span className="text-xs text-gray-600">
                            {item.name}: {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="card p-5 lg:col-span-2">
                  <p className="section-title flex items-center gap-2">
                    <span className="bullet-dot bg-blue-600" /> Daily Asset
                    Checking Activity
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
                        }}
                      />
                      <Bar
                        dataKey="Valid"
                        stackId="a"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                      <Bar
                        dataKey="Tertunda"
                        stackId="a"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                      <Bar
                        dataKey="Error"
                        stackId="a"
                        fill="#dc2626"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-4 justify-center mt-3">
                    {[
                      { color: "#2563eb", label: "Valid" },
                      { color: "#6366f1", label: "Pending" },
                      { color: "#dc2626", label: "Error" },
                    ].map((item) => (
                      <span
                        key={item.label}
                        className="flex items-center gap-2 text-xs text-gray-500"
                      >
                        <span
                          style={{
                            width: 20,
                            height: 2,
                            background: item.color,
                          }}
                        />
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Row 4: Asset Distribution ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card p-5 lg:col-span-2">
                  <p className="section-title">Asset Type Distribution</p>
                  <div className="space-y-4">
                    {assetTypeData.length > 0 ? (
                      assetTypeData.map((item, index) => {
                        const percentage = totalAset > 0 ? (item.jumlah / totalAset) * 100 : 0;
                        return (
                          <div key={index}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">{item.name}</span>
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
                                  background:
                                    percentage > 50 ? "#10b981" : "#2563eb",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No asset data available
                      </div>
                    )}
                  </div>

                  {/* Summary Box */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                    <p className="text-xs text-gray-700">
                      <span className="font-semibold">
                        Total: {totalAset} Assets
                      </span>
                      <br />
                      <span className="text-gray-600">
                        System automatically reads Serial Numbers for Devices
                        and Barcodes for Materials.
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Latest Asset Checking Table ── */}
              <div className="card overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-600" /> Latest Asset
                    Checking
                  </h3>
                  <button
                    onClick={() => router.push("/history")}
                    className="text-sm text-blue-600 font-medium hover:text-blue-700"
                  >
                    View All →
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {[
                          "Asset ID",
                          "Type",
                          "Category",
                          "Location",
                          "Status",
                          "Date",
                        ].map((h) => (
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
                        recentChecks.map((row, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                  {getCategoryIcon(row.kategori)}
                                </div>
                                <span className="font-semibold text-gray-900">
                                  {row.id}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {row.jenisAset}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 text-xs font-semibold rounded-full ${row.kategori === "Perangkat"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-green-100 text-green-700"
                                  }`}
                              >
                                {row.kategori === "Perangkat"
                                  ? "Device"
                                  : "Material"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {row.lokasi}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(row.status)}`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs text-gray-600">
                                {row.tanggal}
                              </div>
                              <div className="text-xs text-gray-400">
                                {row.waktu}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-500">
                            No scan history available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ══ RIGHT COLUMN — Asset Summary ══ */}
            <div className="w-full xl:w-80 flex-shrink-0">
              <div className="card sticky top-4 overflow-hidden">
                {/* Header */}
                <div className="bg-[#1e3a5f] text-white text-center py-3 px-4 font-bold text-sm uppercase tracking-wide">
                  Asset Summary
                </div>

                {/* Quick Stats */}
                <div className="p-4 space-y-4">
                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 gap-2">
                    {stats.slice(0, 2).map((item, i) => (
                      <div key={i} className="stat-box-grey">
                        <div className="stat-value text-lg">{item.value}</div>
                        <div className="stat-label">{item.label}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {item.description}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {stats.slice(2, 4).map((item, i) => (
                      <div key={i} className="stat-box-grey">
                        <div className="stat-value text-lg">{item.value}</div>
                        <div className="stat-label">{item.label}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {item.description}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Detail Summary */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Session Breakdown
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-2 text-sm border-b border-gray-50">
                        <span className="text-gray-500">Total Sessions</span>
                        <span className="font-bold text-gray-900">{totalSessions}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 text-sm border-b border-gray-50">
                        <span className="text-gray-500">Device Sessions</span>
                        <span className="font-bold text-gray-900">{totalDevices}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 text-sm border-b border-gray-50">
                        <span className="text-gray-500">Material Sessions</span>
                        <span className="font-bold text-gray-900">{totalMaterials}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 text-sm border-b border-gray-50">
                        <span className="text-gray-500">In Progress</span>
                        <span className="font-bold text-gray-900">{inProgressSessions}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 text-sm">
                        <span className="text-gray-500">Completed</span>
                        <span className="font-bold text-gray-900">{completedSessions}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Quick Actions
                    </p>
                    <div className="space-y-1">
                      {[
                        {
                          label: "Start New Scan",
                          icon: ScanLine,
                          href: "/scanning",
                        },
                        {
                          label: "View Reports",
                          icon: FileText,
                          href: "/reports-analytics",
                        },
                        {
                          label: "Check Status",
                          icon: CheckCircle,
                          href: "/validation-verification",
                        },
                        {
                          label: "Inventory Data",
                          icon: FileText,
                          href: "/inventory-data",
                        },
                      ].map((action, i) => (
                        <button
                          key={i}
                          onClick={() => router.push(action.href)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                            <action.icon className="w-4 h-4 text-gray-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-600">
                            {action.label}
                          </span>
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