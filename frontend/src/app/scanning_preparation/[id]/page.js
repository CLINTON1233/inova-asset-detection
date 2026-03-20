"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import LayoutDashboard from "../../components/LayoutDashboard";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Loader2,
  Package,
  Cpu,
  Cable,
  Server,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Users,
  RefreshCw,
  BarChart2,
  Target,
  Hash,
  Tag,
  Box,
} from "lucide-react";
import Swal from "sweetalert2";
import API_BASE_URL, { API_ENDPOINTS } from "../../../config/api";

export default function ScanningPreparationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const prepId = params.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preparation, setPreparation] = useState(null);
  const [items, setItems] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchPreparationDetail();
  }, [prepId]);

  const fetchPreparationDetail = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.SCANNING_PREP_DETAIL(prepId));
      const result = await response.json();
      
      if (result.success) {
        setPreparation(result.data);
        
        // Process items with scanned data
        const processedItems = result.data.items.map(item => {
          const scannedCount = item.scanned_count || 0;
          const progress = item.quantity > 0 
            ? Math.round((scannedCount / item.quantity) * 100) 
            : 0;
          
          return {
            ...item,
            scannedCount,
            progress,
            status: progress === 100 ? "completed" : scannedCount > 0 ? "in-progress" : "pending"
          };
        });
        setItems(processedItems);

        // Fetch scan history if available
        fetchScanHistory();
      }
    } catch (error) {
      console.error("Failed to load preparation detail:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to load preparation details",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchScanHistory = async () => {
    try {
      // This would be an actual API endpoint to get scan history for this preparation
      // For now, we'll use mock data or localStorage
      const savedHistory = localStorage.getItem(`scanHistory_${prepId}`);
      if (savedHistory) {
        setScanHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load scan history:", error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPreparationDetail();
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "completed":
        return {
          dot: "bg-green-500",
          text: "text-green-700",
          bg: "bg-green-50",
          border: "border-green-200",
          label: "Completed",
          icon: CheckCircle,
        };
      case "in-progress":
        return {
          dot: "bg-blue-500",
          text: "text-blue-700",
          bg: "bg-blue-50",
          border: "border-blue-200",
          label: "In Progress",
          icon: Clock,
        };
      default:
        return {
          dot: "bg-amber-400",
          text: "text-amber-700",
          bg: "bg-amber-50",
          border: "border-amber-200",
          label: "Pending",
          icon: AlertTriangle,
        };
    }
  };

  const getCategoryIcon = (kategori) => {
    if (kategori?.toLowerCase() === "perangkat" || kategori?.toLowerCase() === "devices")
      return <Cpu className="w-4 h-4 text-blue-600" />;
    if (kategori?.toLowerCase() === "material" || kategori?.toLowerCase() === "materials")
      return <Cable className="w-4 h-4 text-green-600" />;
    return <Server className="w-4 h-4 text-gray-500" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateOverallProgress = () => {
    if (!items.length) return 0;
    const totalScanned = items.reduce((sum, item) => sum + (item.scannedCount || 0), 0);
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return totalQuantity > 0 ? Math.round((totalScanned / totalQuantity) * 100) : 0;
  };

  const overallProgress = calculateOverallProgress();
  const overallStatus = overallProgress === 100 ? "completed" : overallProgress > 0 ? "in-progress" : "pending";
  const statusConfig = getStatusConfig(overallStatus);

  if (!mounted || loading) {
    return (
      <LayoutDashboard activeMenu={1}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-sm text-gray-500">Loading preparation details...</p>
          </div>
        </div>
      </LayoutDashboard>
    );
  }

  if (!preparation) {
    return (
      <LayoutDashboard activeMenu={1}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Preparation Not Found</h2>
            <p className="text-sm text-gray-500 mb-6">
              The scanning preparation you're looking for doesn't exist or has been deleted.
            </p>
            <button
              onClick={() => router.push("/scanning_preparation_list")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </button>
          </div>
        </div>
      </LayoutDashboard>
    );
  }

  return (
    <LayoutDashboard activeMenu={1}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .detail-root { font-family: 'DM Sans', sans-serif; }
        .detail-root .mono { font-family: 'DM Mono', monospace; }

        .detail-card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          transition: box-shadow 0.2s ease;
        }
        .detail-card:hover {
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
        }

        .section-title {
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

        .progress-bar {
          background: #e5e7eb;
          border-radius: 999px;
          height: 8px;
          overflow: hidden;
        }
        .progress-fill {
          background: #2563eb;
          border-radius: 999px;
          height: 100%;
          transition: width 0.3s ease;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .info-item {
          padding: 12px;
          background: #f9fafb;
          border-radius: 12px;
          border: 1px solid #f3f4f6;
        }
        .info-label {
          font-size: 11px;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .info-value {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .item-row {
          transition: background 0.15s ease;
        }
        .item-row:hover {
          background: #f9fafb;
        }
      `}</style>

      <div className="detail-root max-w-7xl mx-auto px-4 py-4 space-y-5">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/scanning_preparation_list")}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Preparation Details</h1>
            <p className="text-sm text-gray-500">
              View detailed information and scan progress
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => router.push(`/scanning?prep_id=${prepId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Target className="w-4 h-4" />
              Start Scanning
            </button>
          </div>
        </div>

        {/* Main Info Card */}
        <div className="detail-card p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{preparation.checking_name}</h2>
                  <p className="text-sm font-mono text-blue-600 mt-1">{preparation.checking_number}</p>
                </div>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Category</div>
                  <div className="info-value">
                    <Tag className="w-4 h-4 text-gray-400" />
                    {preparation.category_name || "General"}
                  </div>
                </div>

                <div className="info-item">
                  <div className="info-label">Location</div>
                  <div className="info-value">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {preparation.location_name || "No location"}
                  </div>
                </div>

                <div className="info-item">
                  <div className="info-label">Checking Date</div>
                  <div className="info-value">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formatDate(preparation.checking_date)}
                  </div>
                </div>

                <div className="info-item">
                  <div className="info-label">Status</div>
                  <div className="info-value">
                    <span className={`status-badge ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              </div>

              {preparation.remarks && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="info-label mb-2">Remarks</div>
                  <p className="text-sm text-gray-700">{preparation.remarks}</p>
                </div>
              )}
            </div>

            {/* Overall Progress Circle */}
            <div className="flex flex-col items-center p-6 bg-gray-50 rounded-xl min-w-[180px]">
              <div className="relative w-24 h-24 mb-3">
                <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={overallProgress === 100 ? "#10b981" : "#2563eb"}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - overallProgress / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-800">
                  {overallProgress}%
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Overall Progress</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <span>{items.reduce((sum, i) => sum + (i.scannedCount || 0), 0)} scanned</span>
                <span>•</span>
                <span>{items.reduce((sum, i) => sum + (i.quantity || 0), 0)} total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="detail-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Box className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{items.length}</p>
                <p className="text-xs text-gray-500">Total Items</p>
              </div>
            </div>
          </div>

          <div className="detail-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {items.filter(i => i.status === "completed").length}
                </p>
                <p className="text-xs text-gray-500">Completed Items</p>
              </div>
            </div>
          </div>

          <div className="detail-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {items.filter(i => i.status === "in-progress").length}
                </p>
                <p className="text-xs text-gray-500">In Progress</p>
              </div>
            </div>
          </div>

          <div className="detail-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {items.filter(i => i.status === "pending").length}
                </p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="detail-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-gray-600" />
              Items to Scan
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {items.map((item, index) => {
              const itemStatus = getStatusConfig(item.status);
              const ItemIcon = itemStatus.icon;

              return (
                <div key={item.id_item || index} className="p-6 item-row">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          {getCategoryIcon(item.kategori)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{item.item_name}</h4>
                          {(item.brand || item.model) && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {[item.brand, item.model].filter(Boolean).join(" • ")}
                            </p>
                          )}
                        </div>
                      </div>

                      {item.specifications && (
                        <p className="text-xs text-gray-500 mt-1 pl-11">
                          <span className="font-medium">Specs:</span> {item.specifications}
                        </p>
                      )}
                    </div>

                    {/* Quantity Info */}
                    <div className="flex items-center gap-4">
                      <div className="text-right min-w-[100px]">
                        <p className="text-sm font-semibold text-gray-900">
                          {item.scannedCount || 0} / {item.quantity}
                        </p>
                        <p className="text-xs text-gray-500">scanned</p>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-32">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className="text-xs font-medium text-gray-600 mt-1 text-right">
                          {item.progress}%
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span className={`status-badge ${itemStatus.bg} ${itemStatus.text} min-w-[100px]`}>
                        <ItemIcon className="w-3 h-3" />
                        {itemStatus.label}
                      </span>
                    </div>
                  </div>

                  {/* Department Distribution if any */}
                  {item.departments && item.departments.length > 0 && (
                    <div className="mt-4 pl-11">
                      <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Department Distribution:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.departments.map((dept, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full border border-gray-200"
                          >
                            <span className="text-xs text-gray-700">{dept.department_name}</span>
                            <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full">
                              {dept.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {items.length === 0 && (
              <div className="py-12 text-center">
                <Box className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No items found</p>
                <p className="text-sm text-gray-400 mt-1">This preparation has no items to scan</p>
              </div>
            )}
          </div>
        </div>

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="detail-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-600" />
                Scan History
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Serial/Barcode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scanHistory.map((scan, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-xs text-gray-600">
                        {formatDateTime(scan.timestamp)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(scan.kategori)}
                          <span className="text-xs font-medium text-gray-900">
                            {scan.jenisAset}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs text-gray-600">
                          {scan.nomorSeri || scan.barcode || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          scan.status === "success" || scan.status === "serial_scanned"
                            ? "bg-green-100 text-green-700"
                            : scan.status === "error"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {scan.status === "serial_scanned" ? "Scanned" : scan.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-semibold ${
                          scan.confidencePercent >= 80
                            ? "text-green-600"
                            : scan.confidencePercent >= 60
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}>
                          {scan.confidencePercent || 100}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </LayoutDashboard>
  );
}