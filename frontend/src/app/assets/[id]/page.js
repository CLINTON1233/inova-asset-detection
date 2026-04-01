"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  Box,
  Calendar,
  MapPin,
  Loader2,
  ArrowLeft,
  Eye,
  Building2,
  User,
  Cpu,
  Cable,
  CheckCircle,
  Camera,
  X,
  ChevronLeft,
  Package,
  Laptop,
} from "lucide-react";
import Swal from "sweetalert2";
import LayoutDashboard from "../../components/LayoutDashboard";
import ProtectedPage from "../../components/ProtectedPage";
import API_BASE_URL from "../../../config/api";

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const prepId = params.id;
  const prepType = searchParams.get("type") || "device";

  const [assets, setAssets] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchAssets();
  }, [prepId, prepType]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/assets/by-preparation/${prepId}?type=${prepType}`
      );
      const result = await response.json();

      if (result.success) {
        setAssets(result.data);
        setSessionInfo(result.session_info);
      } else {
        throw new Error(result.error || "Failed to load assets");
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to load asset details",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeIcon = (type) => {
    if (type === "Device")
      return <Cpu className="w-5 h-5 text-blue-600" />;
    return <Cable className="w-5 h-5 text-green-600" />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "text-emerald-600";
      case "inactive":
        return "text-gray-500";
      case "maintenance":
        return "text-amber-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      case "maintenance":
        return "Maintenance";
      default:
        return status;
    }
  };

  const handleShowDetail = (asset) => {
    setSelectedAsset(asset);
  };

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
          .asset-root { font-family: 'DM Sans', sans-serif; }
          .asset-root .mono { font-family: 'DM Mono', monospace; }

          .asset-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
            transition: box-shadow 0.2s ease;
          }

          .asset-th {
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 10px 16px;
            background: #f9fafb;
            white-space: nowrap;
          }
          .asset-td {
            padding: 13px 16px;
            font-size: 13px;
            color: #374151;
            border-top: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          .asset-row:hover { background: #f8faff; }
          .asset-row { cursor: pointer; }
        `}</style>

        <div className="asset-root space-y-5 max-w-7xl mx-auto px-4 py-2">
          {/* Back Button */}
          <button
            onClick={() => router.push("/assets")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Inventory</span>
          </button>

          {/* Session Info Card */}
          {sessionInfo && (
            <div className="asset-card p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      prepType === "device" ? "bg-blue-50" : "bg-green-50"
                    }`}
                  >
                    {prepType === "device" ? (
                      <Laptop className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Package className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {sessionInfo.session_name}
                    </h1>
                    <p className="text-sm text-gray-500 font-mono mt-0.5">
                      {sessionInfo.session_number}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {formatDate(sessionInfo.session_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {sessionInfo.location_name || "No location"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assets Table */}
          <div className="asset-card overflow-hidden">
            <div className="p-4 md:p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Assets in this session
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {assets.length} validated items
              </p>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading assets...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="py-20 text-center">
                <Box className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                <h3 className="text-gray-800 font-semibold text-lg mb-1">
                  No assets found
                </h3>
                <p className="text-gray-400 text-sm">
                  This session has no validated assets
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th className="asset-th text-left">Photo</th>
                      <th className="asset-th text-left">Asset Code</th>
                      <th className="asset-th text-left">Asset Name</th>
                      <th className="asset-th text-left hidden md:table-cell">
                        Brand/Vendor
                      </th>
                      <th className="asset-th text-left hidden md:table-cell">
                        Type
                      </th>
                      <th className="asset-th text-left hidden lg:table-cell">
                        Serial/Code
                      </th>
                      <th className="asset-th text-left hidden xl:table-cell">
                        Department
                      </th>
                      <th className="asset-th text-left hidden xl:table-cell">
                        Receiver
                      </th>
                      <th className="asset-th text-left">Status</th>
                      <th className="asset-th text-left hidden lg:table-cell">
                        Validated
                      </th>
                      <th className="asset-th text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset, idx) => (
                      <tr
                        key={asset.id_assets}
                        className="asset-row transition-colors"
                        onClick={() => handleShowDetail(asset)}
                      >
                        <td className="asset-td">
                          {asset.photo_url ? (
                            <img
                              src={
                                asset.photo_url.startsWith("http")
                                  ? asset.photo_url
                                  : `http://localhost:5001${asset.photo_url}`
                              }
                              alt="Asset"
                              className="w-10 h-10 rounded-lg object-cover"
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
                        <td className="asset-td">
                          <span className="font-mono text-xs font-semibold text-blue-700">
                            {asset.asset_code}
                          </span>
                        </td>
                        <td className="asset-td">
                          <div className="font-semibold text-gray-900 text-sm">
                            {asset.asset_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {asset.specifications?.substring(0, 50)}
                          </div>
                        </td>
                        <td className="asset-td hidden md:table-cell">
                          <span className="text-xs text-gray-700">
                            {asset.brand || asset.vendor || "-"}
                          </span>
                        </td>
                        <td className="asset-td hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            {getTypeIcon(asset.category)}
                            <span className="text-xs text-gray-600">
                              {asset.category === "Device" ? "Device" : "Material"}
                            </span>
                          </div>
                        </td>
                        <td className="asset-td hidden lg:table-cell">
                          <span className="text-xs font-mono text-gray-600">
                            {asset.serial_number || asset.scan_code || "-"}
                          </span>
                        </td>
                        <td className="asset-td hidden xl:table-cell">
                          <span className="text-xs text-gray-600">
                            {asset.department_name || "-"}
                          </span>
                        </td>
                        <td className="asset-td hidden xl:table-cell">
                          <span className="text-xs text-gray-600">
                            {asset.receiver_name || "-"}
                          </span>
                        </td>
                        <td className="asset-td">
                          <span
                            className={`text-xs font-medium ${getStatusColor(asset.status)}`}
                          >
                            {getStatusLabel(asset.status)}
                          </span>
                        </td>
                        <td className="asset-td hidden lg:table-cell">
                          <div className="text-xs text-gray-700">
                            {formatDate(asset.validated_at)}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            by {asset.validated_by_name || "System"}
                          </div>
                        </td>
                        <td className="asset-td text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowDetail(asset);
                            }}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            {!loading && assets.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-2xl">
                <p className="text-xs text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    {assets.length}
                  </span>{" "}
                  assets
                </p>
                <p className="text-xs text-gray-400">
                  Updated {new Date().toLocaleTimeString("id-ID")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal */}
        {selectedAsset && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAsset(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {getTypeIcon(selectedAsset.category)}
                  <h2 className="text-lg font-semibold text-gray-900">
                    Asset Details
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
                {selectedAsset.photo_url && (
                  <div className="rounded-lg overflow-hidden bg-gray-100 max-h-64">
                    <img
                      src={
                        selectedAsset.photo_url.startsWith("http")
                          ? selectedAsset.photo_url
                          : `http://localhost:5001${selectedAsset.photo_url}`
                      }
                      alt="Asset"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Asset Code</p>
                    <code className="text-sm font-mono text-blue-600">
                      {selectedAsset.asset_code}
                    </code>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Asset Name</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {selectedAsset.asset_name}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Type</p>
                    <p className="font-semibold text-gray-900 capitalize text-sm">
                      {selectedAsset.category} {selectedAsset.asset_type && `(${selectedAsset.asset_type})`}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      {selectedAsset.category === "Device" ? "Brand" : "Vendor"}
                    </p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {selectedAsset.brand || selectedAsset.vendor || "-"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      {selectedAsset.category === "Device" ? "Serial Number" : "Scan Code"}
                    </p>
                    <code className="text-sm font-mono text-gray-800">
                      {selectedAsset.serial_number || selectedAsset.scan_code || "-"}
                    </code>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span className={`text-sm font-medium ${getStatusColor(selectedAsset.status)}`}>
                      {getStatusLabel(selectedAsset.status)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Specifications</p>
                  <p className="text-sm text-gray-800">
                    {selectedAsset.specifications || "No specifications"}
                  </p>
                  {selectedAsset.model && (
                    <p className="text-xs text-gray-500 mt-1">Model: {selectedAsset.model}</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Assignment</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Project</span>
                      <span className="text-xs font-medium text-gray-700">
                        {selectedAsset.project_name || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Department</span>
                      <span className="text-xs font-medium text-gray-700">
                        {selectedAsset.department_name || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Receiver</span>
                      <span className="text-xs font-medium text-gray-700">
                        {selectedAsset.receiver_name || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Location</span>
                      <span className="text-xs font-medium text-gray-700">
                        {selectedAsset.location_name || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Validation</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Validated By</span>
                      <span className="text-xs font-medium text-gray-700">
                        {selectedAsset.validated_by_name || "System"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Validated At</span>
                      <span className="text-xs font-medium text-gray-700">
                        {formatDateTime(selectedAsset.validated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </LayoutDashboard>
    </ProtectedPage>
  );
}