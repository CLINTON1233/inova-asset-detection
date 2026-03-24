"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Camera,
  Scan,
  Clipboard,
  Search,
  CheckCircle,
  AlertTriangle,
  Send,
  AlertCircle,
  Calendar,
  ScanLine,
  Cpu,
  Cable,
  Server,
  Box,
  X,
  Trash2,
  Loader2,
  Plus,
  Eye,
  Package,
  Hash,
  ChevronRight,
  Zap,
  Target,
} from "lucide-react";
import Swal from "sweetalert2";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import FullscreenCamera from "../components/FullscreenCamera";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";
import {
  SerialScanningModal,
  showDeviceSelectionModal,
  showDeleteItemModal,
  showDeleteAllModal,
  showSubmitSingleModal,
  showSubmitAllModal,
  showSuccessDetectionModal,
  showSerialDetectedModal,
  showManualProcessingSuccessModal,
} from "../components/ScanningModal";

export default function SerialScanningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [manualInput, setManualInput] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputType, setInputType] = useState("");
  const [checkHistory, setCheckHistory] = useState([]);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState("device");
  const [pendingDevice, setPendingDevice] = useState(null);

  const [currentPreparation, setCurrentPreparation] = useState(null);
  const [scanningProgress, setScanningProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingSubMessage, setLoadingSubMessage] = useState("");

  const [availableSessions, setAvailableSessions] = useState([]);
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedItemForSerial, setSelectedItemForSerial] = useState(null);

  const LoadingSpinner = ({ message, subMessage }) => (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 font-medium">
          {message || "Loading..."}
        </p>
        {subMessage && (
          <p className="mt-2 text-sm text-gray-500">{subMessage}</p>
        )}
      </div>
    </div>
  );

  const loadAvailableSessions = async () => {
    setLoadingSessions(true);
    setLoadingMessage("Loading sessions...");

    try {
      // Gunakan endpoint list-all yang sudah dibuat
      const response = await fetch(API_ENDPOINTS.SCANNING_PREP_LIST_ALL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Cek response status
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Cek content type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Response is not JSON:", text.substring(0, 200));
        throw new Error("Server returned non-JSON response");
      }

      const result = await response.json();
      console.log("Available sessions:", result);

      if (result.success) {
        // Filter hanya session yang statusnya pending atau in-progress
        const activeSessions = result.data.filter(
          (s) => s.status === "pending" || s.status === "in-progress",
        );
        setAvailableSessions(activeSessions);

        if (activeSessions.length > 0) {
          setShowSessionSelector(true);
        } else {
          Swal.fire({
            title: "No Active Sessions",
            text: "There are no active scanning sessions. Please create a new session or select from preparation list.",
            icon: "info",
            confirmButtonText: "Go to Preparation List",
            showCancelButton: true,
            cancelButtonText: "Create New",
          }).then((result) => {
            if (result.isConfirmed) {
              router.push("/scanning_preparation_list");
            } else {
              router.push("/create_scanning_preparation");
            }
          });
        }
      } else {
        throw new Error(
          result.message || result.error || "Failed to load sessions",
        );
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
      Swal.fire({
        title: "Error!",
        text:
          error.message ||
          "Failed to load scanning sessions. Please check if backend server is running.",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
    } finally {
      setLoadingSessions(false);
      setLoadingMessage("");
      setLoadingSubMessage("");
    }
  };

  const checkSerialExists = async (serialNumber) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/scan-results/check-serial?serial=${encodeURIComponent(serialNumber)}`,
      );
      const result = await response.json();
      return result.exists;
    } catch (error) {
      console.error("Error checking serial:", error);
      return false;
    }
  };

  const saveManualSerial = async (serialNumber, targetItem, availableItem) => {
    if (!serialNumber || serialNumber.trim() === "") {
      Swal.fire({
        title: "Error!",
        text: "Serial number cannot be empty",
        icon: "error",
      });
      return false;
    }

    // Cek apakah serial number sudah ada
    const exists = await checkSerialExists(serialNumber);
    if (exists) {
      Swal.fire({
        title: "Serial Number Already Exists!",
        text: `Serial number "${serialNumber}" has already been used. Please use a different serial number.`,
        icon: "warning",
      });
      return false;
    }

    try {
      // Save to scan_results
      const scanResultData = {
        preparation_id: currentPreparation.id_preparation,
        scanning_item_id: targetItem.id_item,
        item_preparation_id: availableItem?.id_item_preparation || null,
        user_id: 1,
        scan_value: targetItem.item_name,
        serial_number: serialNumber,
        scan_code: serialNumber,
        detection_data: {
          confidence: 100,
          asset_type: targetItem.item_name,
          category: targetItem.kategori || "Perangkat",
          source: "manual",
        },
        status: "serial_scanned",
        scanned_by: 1,
        scanned_at: new Date().toISOString(),
        notes: `Manual serial input: ${serialNumber}`,
      };

      const savedResult = await saveScanResult(scanResultData);

      if (savedResult.success) {
        // Update items_preparation
        if (availableItem?.id_item_preparation) {
          await fetch(
            API_ENDPOINTS.ITEMS_PREPARATION_UPDATE(
              availableItem.id_item_preparation,
            ),
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "scanned" }),
            },
          );
        }

        return savedResult;
      }
      return false;
    } catch (error) {
      console.error("Error saving manual serial:", error);
      return false;
    }
  };

  // ─── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Cek apakah ada preparation_id di URL
    const prepId = searchParams.get("prep_id");

    if (prepId) {
      loadPreparation(prepId);
    } else {
      // Jika tidak ada preparation_id, hapus localStorage dan load sessions
      // Ini akan membersihkan data lama yang mungkin masih tersimpan
      if (localStorage.getItem("scanCheckHistory")) {
        // Cek apakah data masih relevan atau hapus saja
        localStorage.removeItem("scanCheckHistory");
        setCheckHistory([]);
      }
      setLoading(false);
      loadAvailableSessions();
    }
  }, []);

  useEffect(() => {
    const prepId = searchParams.get("prep_id");
    if (prepId) {
      loadPreparation(prepId);
    }
  }, [searchParams]);

  const loadPreparation = async (prepId) => {
    setLoading(true);
    setLoadingMessage("Loading");

    try {
      // Coba load dari devices terlebih dahulu
      let response = await fetch(
        API_ENDPOINTS.DEVICES_SCANNING_PREP_DETAIL(prepId),
      );
      let data = await response.json();
      let prepType = "device";

      // Jika tidak ditemukan, coba dari materials
      if (!data.success) {
        response = await fetch(
          API_ENDPOINTS.MATERIALS_SCANNING_PREP_DETAIL(prepId),
        );
        data = await response.json();
        prepType = "material";
      }

      if (data.success) {
        setCurrentPreparation(data.data);

        // Load progress berdasarkan tipe
        let progressResponse;
        if (prepType === "device") {
          progressResponse = await fetch(
            API_ENDPOINTS.DEVICES_SCANNING_PREP_PROGRESS(prepId),
          );
        } else {
          progressResponse = await fetch(
            API_ENDPOINTS.MATERIALS_SCANNING_PREP_PROGRESS(prepId),
          );
        }
        const progressData = await progressResponse.json();

        const progress = {};
        if (progressData.success) {
          progressData.data.progress.forEach((item) => {
            progress[item.id_item] = {
              total: item.quantity,
              scanned: item.scanned,
              items: [],
              item_name: item.item_name,
              brand: item.brand,
              model: item.model,
              uom: item.uom,
            };
          });
        }

        // Build checkHistory dari scan_results
        const scannedItems = [];
        if (progressData.success && progressData.data.scan_results) {
          progressData.data.scan_results.forEach((scan) => {
            const item = data.data.items.find(
              (i) => i.id_item === scan.scanning_item_id,
            );

            scannedItems.push({
              id: scan.id_scan,
              jenisAset:
                scan.scan_value ||
                (item ? item.device_name || item.material_name : "Unknown"),
              kategori:
                scan.scan_category === "Devices" ? "Perangkat" : "Material",
              brand: item ? item.brand || "N/A" : "Unknown",
              confidencePercent: 85,
              status: scan.serial_number
                ? "serial_scanned"
                : scan.status === "completed"
                  ? "Submitted"
                  : "device_detected",
              nomorSeri: scan.serial_number || "",
              timestamp: scan.scanned_at,
              tanggal: scan.scanned_at
                ? new Date(scan.scanned_at).toLocaleDateString("id-ID")
                : new Date().toLocaleDateString("id-ID"),
              waktu: scan.scanned_at
                ? new Date(scan.scanned_at).toLocaleTimeString("id-ID")
                : new Date().toLocaleTimeString("id-ID"),
              item_id: scan.scanning_item_id,
              preparation_id: parseInt(prepId),
              preparation_name: data.data.checking_name,
              lokasi: data.data.location_name,
              lokasiLabel: data.data.location_name,
              scan_id: scan.id_scan,
              item_preparation_id: scan.item_preparation_id,
              submitted: scan.status === "completed",
            });
          });
        }

        setScanningProgress(progress);

        if (scannedItems.length > 0) {
          setCheckHistory(scannedItems);
          localStorage.setItem(
            "scanCheckHistory",
            JSON.stringify(scannedItems),
          );
        }
      }
    } catch (error) {
      console.error("Error loading preparation:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to load scanning session",
        icon: "error",
      }).then(() => router.push("/scanning_sessions"));
    } finally {
      setLoading(false);
      setLoadingMessage("");
      setLoadingSubMessage("");
    }
  };

  // ─── Camera detection handler ──────────────────────────────────────────
  const handleCameraDetection = async (detection) => {
    if (detection.type === "device") {
      const deviceData = detection.data;
      if (currentPreparation) {
        const detectedAssetType = deviceData.asset_type?.toLowerCase() || "";
        const detectedCategory = deviceData.category || "";

        // Perbaiki pencarian item - gunakan device_name untuk devices
        const matchingItems = currentPreparation.items.filter((item) => {
          // Untuk devices, gunakan device_name
          const itemName =
            (
              item.device_name ||
              item.item_name ||
              item.material_name ||
              ""
            )?.toLowerCase() || "";
          return (
            itemName.includes(detectedAssetType) ||
            detectedAssetType.includes(itemName) ||
            (detectedCategory === "Perangkat" && itemName.includes("laptop")) ||
            (detectedCategory === "Perangkat" && itemName.includes("pc")) ||
            (detectedCategory === "Perangkat" &&
              itemName.includes("komputer")) ||
            (detectedCategory === "Perangkat" &&
              itemName.includes("monitor")) ||
            (detectedCategory === "Material" && itemName.includes("kabel"))
          );
        });

        if (matchingItems.length === 0) {
          Swal.fire({
            title: "Item Tidak Sesuai!",
            html: `
            <div class="text-center">
              <p class="text-lg font-semibold text-gray-800 mb-2">Detected: ${deviceData.asset_type}</p>
              <p class="text-sm text-gray-600">Item yang discan tidak sesuai dengan session ini.</p>
              <div class="mt-4 p-3 bg-gray-100 rounded-lg text-left">
                <p class="text-xs font-semibold text-gray-700 mb-2">Items in this session:</p>
                <ul class="text-xs text-gray-600 space-y-1">
                  ${currentPreparation.items.map((item) => `<li>• ${item.device_name || item.material_name || item.item_name} ${item.brand ? `(${item.brand})` : ""}</li>`).join("")}
                </ul>
              </div>
            </div>
          `,
            icon: "warning",
            confirmButtonText: "OK",
          });
          return;
        }

        const targetItem = matchingItems[0];
        const progress = scanningProgress[targetItem.id_item];

        if (progress && progress.scanned >= progress.total) {
          Swal.fire({
            title: "Kuota Penuh",
            text: `Target ${targetItem.device_name || targetItem.material_name} sudah tercapai`,
            icon: "warning",
          });
          return;
        }

        let availableItem = null;
        try {
          // Tentukan endpoint items preparation berdasarkan tipe
          const isDevicePrep = currentPreparation.type === "device";
          const endpoint = isDevicePrep
            ? `${API_BASE_URL}/api/devices/items-preparation/${currentPreparation.id_preparation}/item/${targetItem.id_item}/available`
            : `${API_BASE_URL}/api/materials/items-preparation/${currentPreparation.id_preparation}/item/${targetItem.id_item}/available`;

          const response = await fetch(endpoint);

          if (!response.ok) {
            const errorData = await response.json();
            if (errorData.all_scanned) {
              Swal.fire({
                title: "Kuota Penuh",
                text: `Target ${targetItem.device_name || targetItem.material_name} sudah tercapai (semua item sudah di-scan)`,
                icon: "warning",
              });
              return;
            }
            throw new Error(errorData.error || "No available item");
          }

          const result = await response.json();
          if (result.success && result.data) {
            availableItem = result.data;
          }
        } catch (error) {
          console.error("Error fetching available item:", error);
          if (error.message === "No available item") {
            Swal.fire({
              title: "No Items Left",
              text: `No remaining items for ${targetItem.device_name || targetItem.material_name} to scan`,
              icon: "info",
            });
            return;
          }
        }

        // Tentukan endpoint create scan result berdasarkan tipe
        const isDevice = currentPreparation.type === "device";
        const createEndpoint = isDevice
          ? API_ENDPOINTS.SCAN_RESULTS_CREATE_DEVICE
          : API_ENDPOINTS.SCAN_RESULTS_CREATE_MATERIAL;

        // Save to scan_results
        const scanResultData = {
          item_preparation_id: availableItem?.id_item_preparation || null,
          user_id: 1,
          scan_category: isDevice ? "Devices" : "Materials",
          scan_value: deviceData.asset_type,
          ...(isDevice ? { serial_number: null } : { scan_code: null }),
          detection_data: {
            bounding_box: deviceData.bounding_box || null,
            photo_proof: deviceData.photo_proof || null,
            confidence: deviceData.confidence || 0.85,
            asset_type: deviceData.asset_type,
            category: deviceData.category,
          },
          status: "pending",
          notes: `${isDevice ? "Device" : "Material"} detected: ${deviceData.asset_type}`,
        };

        const savedResult = await saveScanResult(scanResultData, isDevice);

        const scanItem = {
          id:
            deviceData.id ||
            `SCAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          jenisAset:
            targetItem.device_name ||
            targetItem.material_name ||
            deviceData.asset_type,
          kategori: isDevice ? "Perangkat" : "Material",
          brand: targetItem.brand || deviceData.brand || "Unknown",
          confidencePercent: Math.round((deviceData.confidence || 0.85) * 100),
          status: "device_detected",
          timestamp: new Date().toISOString(),
          tanggal: new Date().toLocaleDateString("id-ID"),
          waktu: new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          needsSerialScan: isDevice,
          item_id: targetItem.id_item,
          preparation_id: currentPreparation?.id_preparation,
          preparation_name: currentPreparation?.checking_name,
          lokasi: currentPreparation?.location_name || "",
          lokasiLabel: currentPreparation?.location_name || "",
          scan_id: savedResult.success ? savedResult.scan_id : null,
          item_preparation_id: availableItem?.id_item_preparation || null,
        };

        setPendingDevice(scanItem);
        setCheckHistory((prev) => [scanItem, ...prev]);
        setScanningProgress((prev) => {
          const np = { ...prev };
          if (np[targetItem.id_item]) {
            np[targetItem.id_item] = {
              ...np[targetItem.id_item],
              scanned: Math.min(
                np[targetItem.id_item].scanned + 1,
                np[targetItem.id_item].total,
              ),
              items: [...(np[targetItem.id_item].items || []), scanItem.id],
            };
          }
          return np;
        });

        const itemName = targetItem.device_name || targetItem.material_name;
        Swal.fire({
          title: `${isDevice ? "Device" : "Material"} Detected!`,
          html: `<p class="text-lg font-semibold">${itemName}</p><p class="text-sm text-gray-600">Brand: ${targetItem.brand || "Unknown"} &nbsp;|&nbsp; Confidence: ${Math.round((deviceData.confidence || 0.85) * 100)}%</p>${isDevice ? '<p class="text-sm text-blue-600 mt-2">Scan serial number?</p>' : '<p class="text-sm text-green-600 mt-2">Material detected successfully!</p>'}`,
          icon: "success",
          showCancelButton: isDevice,
          showConfirmButton: !isDevice,
          confirmButtonText: isDevice ? "Scan Serial" : "OK",
          cancelButtonText: "Skip",
        }).then((result) => {
          if (result.isConfirmed && isDevice) {
            setCameraMode("serial");
            setIsCameraOpen(true);
          } else {
            setIsCameraOpen(false);
            if (scanItem.scan_id) {
              const updateEndpoint = isDevice
                ? API_ENDPOINTS.SCAN_RESULTS_UPDATE_DEVICE(scanItem.scan_id)
                : API_ENDPOINTS.SCAN_RESULTS_UPDATE_MATERIAL(scanItem.scan_id);
              fetch(updateEndpoint, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: "completed",
                  notes: `${isDevice ? "Device" : "Material"} detected, ${isDevice ? "serial scan skipped" : "scan completed"}`,
                }),
              });
            }
          }
        });
      }
    } else if (detection.type === "serial") {
      const serialData = detection.data;
      const targetItem = selectedItemForSerial || pendingDevice;

      if (targetItem) {
        const exists = await checkSerialExists(serialData.detected_text);
        if (exists) {
          Swal.fire({
            title: "Serial Number Already Exists!",
            text: `Serial number "${serialData.detected_text}" has already been used. Please use a different serial number.`,
            icon: "warning",
          });
          setIsCameraOpen(false);
          setSelectedItemForSerial(null);
          return;
        }

        if (targetItem.scan_id) {
          const updateData = {
            serial_number: serialData.detected_text,
            status: "serial_scanned",
            scanned_by: 1,
            scanned_at: new Date().toISOString(),
            notes: `Serial number detected: ${serialData.detected_text}`,
          };

          try {
            await fetch(
              API_ENDPOINTS.SCAN_RESULTS_UPDATE_DEVICE(targetItem.scan_id),
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData),
              },
            );

            if (targetItem.item_preparation_id) {
              await fetch(
                `${API_BASE_URL}/api/devices/items-preparation/${targetItem.item_preparation_id}`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "scanned" }),
                },
              );
            }

            setCheckHistory((prev) =>
              prev.map((item) =>
                item.id === targetItem.id
                  ? {
                      ...item,
                      nomorSeri: serialData.detected_text,
                      status: "serial_scanned",
                      confidencePercent: Math.round(
                        (serialData.confidence || 0.9) * 100,
                      ),
                    }
                  : item,
              ),
            );

            Swal.fire({
              title: "Serial Detected!",
              html: `<p class="text-xl font-mono text-blue-600 font-bold">${serialData.detected_text}</p><p class="text-sm text-gray-500 mt-2">Serial number saved successfully!</p>`,
              icon: "success",
            });
          } catch (error) {
            console.error("Error updating scan result:", error);
            Swal.fire({
              title: "Error!",
              text: "Failed to save serial number",
              icon: "error",
            });
          }
        }

        setPendingDevice(null);
        setSelectedItemForSerial(null);
        setIsCameraOpen(false);
      }
    }
  };

  // Update saveScanResult untuk menerima tipe
  const saveScanResult = async (scanData, isDevice = true) => {
    try {
      const endpoint = isDevice
        ? API_ENDPOINTS.SCAN_RESULTS_CREATE_DEVICE
        : API_ENDPOINTS.SCAN_RESULTS_CREATE_MATERIAL;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scanData),
      });

      const result = await response.json();
      if (result.success) {
        console.log("Scan result saved:", result);
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error saving scan result:", error);
      return { success: false, error: error.message };
    }
  };

  const handleManualCheck = async (e) => {
    e.preventDefault();
    if (!manualInput) return;

    setScanResult("loading");

    try {
      const serialNumber = manualInput.trim();

      // Cek apakah serial number sudah ada
      const exists = await checkSerialExists(serialNumber);
      if (exists) {
        Swal.fire({
          title: "Serial Number Already Exists!",
          text: `Serial number "${serialNumber}" has already been used. Please use a different serial number.`,
          icon: "warning",
        });
        setScanResult(null);
        setManualInput("");
        return;
      }

      // Cari item yang cocok dari current preparation
      let targetItem = null;
      let availableItem = null;

      if (currentPreparation) {
        // Cari item yang belum mencapai kuota
        for (const item of currentPreparation.items) {
          const progress = scanningProgress[item.id_item];
          if (progress && progress.scanned < progress.total) {
            targetItem = item;
            break;
          }
        }

        if (!targetItem) {
          Swal.fire({
            title: "No Available Items",
            text: "All items have reached their quota. Please create a new session.",
            icon: "info",
          });
          setScanResult(null);
          setManualInput("");
          return;
        }

        // Dapatkan available item preparation
        try {
          const response = await fetch(
            API_ENDPOINTS.ITEMS_PREPARATION_AVAILABLE(
              currentPreparation.id_preparation,
              targetItem.id_item,
            ),
          );

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              availableItem = result.data;
            }
          }
        } catch (error) {
          console.error("Error fetching available item:", error);
        }

        // Simpan serial number manual
        const savedResult = await saveManualSerial(
          serialNumber,
          targetItem,
          availableItem,
        );

        if (savedResult && savedResult.success) {
          const scanItem = {
            id: savedResult.scan_id,
            jenisAset: targetItem.item_name,
            kategori: targetItem.kategori || "Perangkat",
            brand: targetItem.brand || "Unknown",
            confidencePercent: 100,
            status: "serial_scanned",
            nomorSeri: serialNumber,
            timestamp: new Date().toISOString(),
            tanggal: new Date().toLocaleDateString("id-ID"),
            waktu: new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            item_id: targetItem.id_item,
            preparation_id: currentPreparation.id_preparation,
            preparation_name: currentPreparation.checking_name,
            lokasi: currentPreparation.location_name || "",
            lokasiLabel: currentPreparation.location_name || "",
            scan_id: savedResult.scan_id,
            item_preparation_id: availableItem?.id_item_preparation || null,
            submitted: false,
          };

          setCheckHistory((prev) => [scanItem, ...prev]);
          setScanResult(scanItem);

          // Update progress
          setScanningProgress((prev) => {
            const np = { ...prev };
            if (np[targetItem.id_item]) {
              np[targetItem.id_item] = {
                ...np[targetItem.id_item],
                scanned: Math.min(
                  np[targetItem.id_item].scanned + 1,
                  np[targetItem.id_item].total,
                ),
                items: [...(np[targetItem.id_item].items || []), scanItem.id],
              };
            }
            return np;
          });

          Swal.fire({
            title: "Success!",
            text: `Serial number "${serialNumber}" has been saved successfully.`,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            title: "Error!",
            text: "Failed to save serial number. Please try again.",
            icon: "error",
          });
        }
      }

      setManualInput("");
    } catch (error) {
      console.error("Error in manual check:", error);
      Swal.fire({
        title: "Error!",
        text: "An error occurred while processing your input.",
        icon: "error",
      });
    } finally {
      setScanResult(null);
    }
  };

  const handleScanSerialForItem = (item) => {
    setSelectedItemForSerial(item);
    setCameraMode("serial");
    setIsCameraOpen(true);
  };

  const updateScanningProgress = (scanItem) => {
    if (!currentPreparation || !scanItem.item_id) return;
    setScanningProgress((prev) => {
      const np = { ...prev };
      if (np[scanItem.item_id]) {
        const { scanned, total } = np[scanItem.item_id];
        if (scanned < total) {
          np[scanItem.item_id] = {
            ...np[scanItem.item_id],
            scanned: Math.min(scanned + 1, total),
            items: [...(np[scanItem.item_id].items || []), scanItem.id],
          };
        }
      }
      return np;
    });
  };

  const handleSubmitSingle = async (item) => {
    showSubmitSingleModal(item, async () => {
      setIsSubmitting(true);
      try {
        const response = await fetch(API_ENDPOINTS.LOCATION_ASSIGN_MULTIPLE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset_ids: [item.id],
            location_code: item.lokasi,
            scanned_by: "Scanner User",
            notes: `Scanned via scanning page - ${item.jenisAset}`,
          }),
        });
        const result = await response.json();
        if (result.success) {
          setCheckHistory((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? { ...p, submitted: true, status: "Submitted" }
                : p,
            ),
          );
          Swal.fire({
            title: "Success!",
            text: `${item.jenisAset} submitted.`,
            icon: "success",
          });
        } else {
          Swal.fire({ title: "Failed", text: result.message, icon: "error" });
        }
      } catch {
        Swal.fire({
          title: "Error",
          text: "Failed to connect to server.",
          icon: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const handleSubmitAll = async () => {
    const itemsToSubmit = checkHistory.filter(
      (item) => item.status !== "Submitted" && item.lokasi,
    );

    if (itemsToSubmit.length === 0) {
      Swal.fire({
        title: "No Items",
        text: "All submitted or no location set.",
        icon: "info",
      });
      return;
    }

    showSubmitAllModal(itemsToSubmit, async () => {
      setIsSubmittingAll(true);
      try {
        const results = [];

        for (const item of itemsToSubmit) {
          // Create validation record for each item
          const validationData = {
            scan_id: item.scan_id,
            user_id: 1,
            validation_status: "pending",
            validation_notes: `Submitted from scanning page - ${item.jenisAset}`,
            location: item.lokasi,
          };

          const response = await fetch(API_ENDPOINTS.VALIDATIONS_CREATE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validationData),
          });

          const result = await response.json();
          if (result.success) {
            results.push(result);

            // Update item status
            setCheckHistory((prev) =>
              prev.map((p) =>
                p.id === item.id
                  ? {
                      ...p,
                      submitted: true,
                      status: "Submitted",
                      validation_id: result.validation_id,
                    }
                  : p,
              ),
            );
          }
        }

        if (results.length > 0) {
          Swal.fire({
            title: "Success!",
            text: `${results.length} items submitted for validation`,
            icon: "success",
          });
        }
      } catch (error) {
        Swal.fire({
          title: "Error",
          text: error.message || "Failed to submit items",
          icon: "error",
        });
      } finally {
        setIsSubmittingAll(false);
      }
    });
  };

  const handleDeleteData = async (item) => {
    showDeleteItemModal(item, async () => {
      try {
        // Tentukan endpoint delete berdasarkan tipe item
        let deleteEndpoint;
        if (item.kategori === "Perangkat") {
          deleteEndpoint = API_ENDPOINTS.SCAN_RESULTS_DELETE_DEVICE(
            item.scan_id,
          );
        } else {
          deleteEndpoint = API_ENDPOINTS.SCAN_RESULTS_DELETE_MATERIAL(
            item.scan_id,
          );
        }

        if (item.scan_id) {
          const response = await fetch(deleteEndpoint, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || "Failed to delete from database");
          }
        }

        // Update local state
        setCheckHistory((prev) => prev.filter((p) => p.id !== item.id));

        if (item.item_id && scanningProgress[item.item_id]) {
          setScanningProgress((prev) => {
            const np = { ...prev };
            if (np[item.item_id]) {
              np[item.item_id] = {
                ...np[item.item_id],
                scanned: Math.max(0, np[item.item_id].scanned - 1),
                items: (np[item.item_id].items || []).filter(
                  (id) => id !== item.id,
                ),
              };
            }
            return np;
          });
        }

        // Update localStorage
        const updatedHistory = checkHistory.filter((p) => p.id !== item.id);
        localStorage.setItem(
          "scanCheckHistory",
          JSON.stringify(updatedHistory),
        );

        Swal.fire({ title: "Deleted!", icon: "success" });

        // Refresh data
        if (currentPreparation) {
          loadPreparation(currentPreparation.id_preparation);
        }
      } catch (error) {
        console.error("Error deleting scan result:", error);
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to delete item",
          icon: "error",
        });
      }
    });
  };

  const handleDeleteAll = async () => {
    if (!checkHistory.length) return;

    showDeleteAllModal(checkHistory.length, async () => {
      try {
        // Delete semua scan results dari database
        for (const item of checkHistory) {
          let deleteEndpoint;
          if (item.kategori === "Perangkat") {
            deleteEndpoint = API_ENDPOINTS.SCAN_RESULTS_DELETE_DEVICE(
              item.scan_id,
            );
          } else {
            deleteEndpoint = API_ENDPOINTS.SCAN_RESULTS_DELETE_MATERIAL(
              item.scan_id,
            );
          }

          if (item.scan_id) {
            await fetch(deleteEndpoint, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        // Reset local state
        setCheckHistory([]);
        localStorage.removeItem("scanCheckHistory");

        if (currentPreparation) {
          const resetProgress = {};
          currentPreparation.items.forEach((item) => {
            resetProgress[item.id_item] = {
              total: item.quantity,
              scanned: 0,
              items: [],
            };
          });
          setScanningProgress(resetProgress);
        }

        Swal.fire({ title: "Deleted!", icon: "success" });

        // Refresh data
        if (currentPreparation) {
          loadPreparation(currentPreparation.id_preparation);
        }
      } catch (error) {
        console.error("Error deleting all scan results:", error);
        Swal.fire({
          title: "Error!",
          text: "Failed to delete all items",
          icon: "error",
        });
      }
    });
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getStatusConfig = (status) => {
    const map = {
      success: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        badge: "bg-green-100 text-green-700",
        dot: "bg-green-500",
        label: "Success",
      },
      serial_scanned: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        badge: "bg-green-100 text-green-700",
        dot: "bg-green-500",
        label: "Serial Number Scanned",
      },
      error: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        badge: "bg-red-100 text-red-700",
        dot: "bg-red-500",
        label: "Error",
      },
      device_detected: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        badge: "bg-blue-100 text-blue-700",
        dot: "bg-blue-500",
        label: "Detected",
      },
      Checked: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        badge: "bg-amber-100 text-amber-700",
        dot: "bg-amber-500",
        label: "Checked",
      },
      Submitted: {
        bg: "bg-gray-50",
        text: "text-gray-500",
        border: "border-gray-200",
        badge: "bg-gray-100 text-gray-500",
        dot: "bg-gray-400",
        label: "Submitted",
      },
    };
    return map[status] || map.Submitted;
  };

  const getCategoryIcon = (kategori) => {
    if (kategori === "Perangkat")
      return <Cpu className="w-4 h-4 text-blue-600" />;
    if (kategori === "Material")
      return <Cable className="w-4 h-4 text-green-600" />;
    return <Server className="w-4 h-4 text-gray-500" />;
  };

  const readyToSubmitCount = checkHistory.filter(
    (i) => i.status !== "Submitted" && i.lokasi,
  ).length;
  const totalScanned = Object.values(scanningProgress).reduce(
    (s, p) => s + p.scanned,
    0,
  );
  const totalTarget =
    currentPreparation?.items.reduce((s, i) => s + i.quantity, 0) || 0;
  const overallPct =
    totalTarget > 0 ? Math.round((totalScanned / totalTarget) * 100) : 0;

  // Session Selector Modal Component
  const SessionSelectorModal = () => {
    if (!showSessionSelector) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Select Scanning Session
            </h2>
            <button
              onClick={() => setShowSessionSelector(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto max-h-[60vh]">
            {loadingSessions ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600 font-medium">Loading</p>
              </div>
            ) : availableSessions.length === 0 ? (
              <div className="py-10 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium mb-1">
                  No active sessions
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  Create a new session or go to preparation list
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => router.push("/create_scanning_preparation")}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> New Session
                  </button>
                  <button
                    onClick={() => router.push("/scanning_preparation_list")}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                  >
                    View All Sessions
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {availableSessions.map((session) => {
                  const totalItems = session.items?.length || 0;
                  const totalQty =
                    session.items?.reduce(
                      (sum, i) => sum + (i.quantity || 0),
                      0,
                    ) || 0;
                  const scannedCount =
                    session.items?.reduce(
                      (sum, i) => sum + (i.scanned_count || 0),
                      0,
                    ) || 0;
                  const progress =
                    totalQty > 0
                      ? Math.round((scannedCount / totalQty) * 100)
                      : 0;

                  return (
                    <div
                      key={session.id_preparation}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition cursor-pointer"
                      onClick={() => {
                        setShowSessionSelector(false);
                        router.push(
                          `/scanning?prep_id=${session.id_preparation}`,
                        );
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {session.checking_name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {session.checking_number} •{" "}
                            {session.location_name || "No location"}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            session.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {session.status === "pending"
                            ? "Pending"
                            : "In Progress"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div>
                          <span className="text-gray-400">Items:</span>
                          <span className="ml-1 font-semibold text-gray-700">
                            {totalItems} types
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Quantity:</span>
                          <span className="ml-1 font-semibold text-gray-700">
                            {totalQty} total
                          </span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-semibold text-gray-700">
                            {progress}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button className="text-xs text-blue-600 font-medium flex items-center gap-1">
                          Select Session <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between">
            <button
              onClick={() => router.push("/scanning_preparation_list")}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              View All Sessions
            </button>
            <button
              onClick={() => router.push("/create_scanning_preparation")}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New Session
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading state yang konsisten
  if (loading || loadingSessions) {
    return (
      <ProtectedPage>
        <LayoutDashboard activeMenu={1}>
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">
                {loadingMessage || (loadingSessions ? "Loading" : "Loading")}
              </p>
              {loadingSubMessage && (
                <p className="mt-2 text-sm text-gray-500">
                  {loadingSubMessage}
                </p>
              )}
            </div>
          </div>
        </LayoutDashboard>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu={1}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
          .scan-root { font-family: 'DM Sans', sans-serif; }
          .scan-root .mono { font-family: 'DM Mono', monospace; }
          .scan-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: box-shadow 0.2s ease;
          }
          .scan-card:hover {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          }
          .section-label {
            font-size: 13px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .scan-viewfinder {
            position: relative;
            width: 100%;
            aspect-ratio: 16/9;
            background: #0f172a;
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .scan-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            color: #9ca3af;
          }
          .scan-placeholder svg {
            width: 48px;
            height: 48px;
            opacity: 0.5;
          }
          .scan-placeholder p {
            font-size: 14px;
            font-weight: 500;
          }
          .scan-placeholder span {
            font-size: 12px;
            opacity: 0.7;
          }
          .scan-corner {
            position: absolute;
            width: 24px; height: 24px;
            border-color: rgba(255,255,255,.8);
            border-style: solid;
          }
          .scan-corner.tl { top: 16px; left: 16px; border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
          .scan-corner.tr { top: 16px; right: 16px; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
          .scan-corner.bl { bottom: 16px; left: 16px; border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
          .scan-corner.br { bottom: 16px; right: 16px; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }
          .scan-line {
            position: absolute;
            left: 10%; right: 10%;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(59,130,246,.9), transparent);
            animation: scanmove 2.2s ease-in-out infinite;
          }
          @keyframes scanmove {
            0%,100% { top: 20%; opacity: .7; }
            50% { top: 78%; opacity: 1; }
          }
          .progress-fill { transition: width .4s ease; }
          .history-row { transition: background .15s ease; }
          .history-row:hover { background: #f9fafb; }
          .btn-primary {
            background: #1e40af;
            color: #fff;
            border-radius: 10px;
            font-weight: 600;
            font-size: 14px;
            padding: 11px 20px;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            transition: background .2s, transform .1s;
            border: none; cursor: pointer; width: 100%;
          }
          .btn-primary:hover { background: #1e3a8a; }
          .btn-primary:active { transform: scale(.98); }
          .btn-secondary {
            background: #f1f5f9;
            color: #334155;
            border-radius: 10px;
            font-weight: 600;
            font-size: 14px;
            padding: 11px 20px;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            transition: background .2s, transform .1s;
            border: none; cursor: pointer; width: 100%;
          }
          .btn-secondary:hover { background: #e2e8f0; }
          .input-field {
            width: 100%; padding: 11px 14px;
            border: 1.5px solid #e2e8f0;
            border-radius: 10px;
            font-size: 14px;
            color: #1e293b;
            background: #f8fafc;
            transition: border .2s, box-shadow .2s;
            outline: none;
            font-family: 'DM Mono', monospace;
          }
          .input-field:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.15); background: #fff; }
          .input-field::placeholder { color: #94a3b8; font-family: 'DM Sans', sans-serif; }
          .btn-danger {
            background: #ef4444;
            color: #fff;
            border-radius: 10px;
            font-weight: 600;
            font-size: 14px;
            padding: 11px 20px;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            transition: background .2s, transform .1s;
            border: none; cursor: pointer;
          }
          .btn-danger:hover { background: #dc2626; }
          .btn-danger:active { transform: scale(.98); }
          .btn-outline-danger {
            background: #fee2e2;
            color: #dc2626;
            border: 1.5px solid #fecaca;
            border-radius: 10px;
            font-weight: 600;
            font-size: 14px;
            padding: 7px 14px;
            display: flex; align-items: center; gap: 6px;
            transition: all .15s;
            cursor: pointer;
          }
          .btn-outline-danger:hover { background: #fecaca; border-color: #f87171; }
          .stat-box {
            background-color: #f9fafb;
            border: 1px solid #f3f4f6;
            border-radius: 12px;
            padding: 12px;
          }
          .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
          }
          .stat-label {
            font-size: 0.75rem;
            font-weight: 500;
            color: #6b7280;
            margin-top: 4px;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
        `}</style>

        <div className="scan-root max-w-7xl mx-auto px-4 py-4 space-y-5">
          {/* ── Page Header ─────────────────────────────────────── */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ScanLine className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">
                  Scanning Assets
                </h1>
              </div>
              <p className="text-sm text-gray-500">
                Scan devices or materials from your active session
              </p>
            </div>
            <div className="flex gap-2">
              {!currentPreparation && (
                <button
                  onClick={() => {
                    setShowSessionSelector(true);
                    loadAvailableSessions();
                  }}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-1.5"
                >
                  <Package className="w-4 h-4" /> Select Session
                </button>
              )}
              <button
                onClick={() => router.push("/create_scanning_preparation")}
                className="btn-primary"
                style={{ width: "auto", padding: "10px 16px" }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Session</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>

          {/* ── Active Session Banner ────────────────────────────── */}
          {currentPreparation && (
            <div
              className="scan-card p-4"
              style={{ borderLeft: "4px solid #2563eb" }}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {currentPreparation.checking_name}
                      </h3>
                      <span
                        style={{
                          background: "#dbeafe",
                          color: "#1d4ed8",
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "20px",
                        }}
                      >
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {currentPreparation.checking_number} &nbsp;·&nbsp;{" "}
                      {currentPreparation.location_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className="relative w-12 h-12">
                      <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="18"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="4"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="18"
                          fill="none"
                          stroke={overallPct === 100 ? "#22c55e" : "#2563eb"}
                          strokeWidth="4"
                          strokeDasharray={`${2 * Math.PI * 18}`}
                          strokeDashoffset={`${2 * Math.PI * 18 * (1 - overallPct / 100)}`}
                          strokeLinecap="round"
                          style={{ transition: "stroke-dashoffset .5s ease" }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-800">
                        {overallPct}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentPreparation(null);
                      setScanningProgress({});
                      router.push("/scanning");
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {currentPreparation.items.map((item) => {
                  const prog = scanningProgress[item.id_item] || {
                    scanned: 0,
                    total: item.quantity,
                  };
                  const pct = Math.round((prog.scanned / prog.total) * 100);
                  const done = pct === 100;
                  return (
                    <div key={item.id_item}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${done ? "bg-green-500" : "bg-blue-400"}`}
                          />
                          <span className="text-xs text-gray-700">
                            {item.item_name}
                          </span>
                          {item.brand && (
                            <span className="text-xs text-gray-400">
                              {item.brand}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-600">
                            {prog.scanned}/{prog.total}
                          </span>
                          {done && (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full progress-fill ${done ? "bg-green-500" : pct > 50 ? "bg-blue-500" : "bg-amber-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {Object.values(scanningProgress).every(
                (p) => p.scanned === p.total,
              ) &&
                totalTarget > 0 && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">
                      All items scanned — session complete!
                    </span>
                  </div>
                )}
            </div>
          )}

          {/* ── Main Grid: Camera + Input ────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Camera — spans 3 cols - CAMERA MATI (tidak ada preview) */}
            <div className="lg:col-span-3 scan-card p-4 sm:p-5">
              <p className="section-label flex items-center gap-2">
                <Camera className="w-3.5 h-3.5" /> Camera Scanner
              </p>

              <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center mb-4">
                <div className="text-center">
                  <Camera className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400 text-base font-semibold mb-2">
                    Camera Off
                  </p>
                  <p className="text-gray-500 text-sm">
                    Click Start Scan to activate camera
                  </p>
                </div>
              </div>

              <div className="w-full">
                <button
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 text-base shadow-md"
                  onClick={() => {
                    setCameraMode("device");
                    setIsCameraOpen(true);
                  }}
                >
                  <Camera className="w-5 h-5" />
                  Start Scan
                </button>
              </div>
            </div>

            {/* Right Panel — spans 2 cols */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              {/* Manual Input */}
              <div className="scan-card p-4 sm:p-5">
                <p className="section-label flex items-center gap-2">
                  <Clipboard className="w-3.5 h-3.5" /> Manual Input
                </p>
                <form onSubmit={handleManualCheck} className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">
                      Serial number or Scan Code
                    </label>
                    <input
                      type="text"
                      placeholder="NS-PC-887632 atau BC-RJ45-554321"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm"
                    disabled={scanResult === "loading"}
                  >
                    {scanResult === "loading" ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></div>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Validasi
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Last Detection Result */}
              <div className="scan-card p-4 sm:p-5 flex-1">
                <p className="section-label flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5" /> Last Detection Result
                </p>

                {!scanResult && checkHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                      <Scan className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-lg text-gray-500 font-medium">
                      No scan results yet
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Scan a device or material and enter the serial number or
                      scan the code
                    </p>
                  </div>
                )}

                {!scanResult &&
                  checkHistory.length > 0 &&
                  (() => {
                    const latestScan = checkHistory[0];
                    const cfg = getStatusConfig(latestScan.status);
                    return (
                      <div
                        className={`rounded-xl p-3.5 border ${cfg.bg} ${cfg.border}`}
                      >
                        <div
                          className={`flex items-center gap-2 mb-3 ${cfg.text}`}
                        >
                          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span className="text-xs font-semibold uppercase tracking-wide">
                            {cfg.label}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {[
                            {
                              label: "Asset ID",
                              value: latestScan.id,
                              mono: true,
                            },
                            { label: "Type", value: latestScan.jenisAset },
                            {
                              label: "Brand",
                              value: latestScan.brand || "N/A",
                            },
                            latestScan.nomorSeri && {
                              label: "Serial",
                              value: latestScan.nomorSeri,
                              mono: true,
                            },
                            {
                              label: "Confidence",
                              value: `${latestScan.confidencePercent}%`,
                            },
                            {
                              label: "Waktu Scan",
                              value: `${latestScan.tanggal} ${latestScan.waktu}`,
                            },
                          ]
                            .filter(Boolean)
                            .map((row) => (
                              <div
                                key={row.label}
                                className="flex justify-between items-center text-xs"
                              >
                                <span className="text-gray-500">
                                  {row.label}
                                </span>
                                <span
                                  className={`text-gray-800 ${row.mono ? "font-mono" : ""}`}
                                >
                                  {row.value}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })()}

                {scanResult === "loading" && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-2"></div>
                    <p className="text-sm text-gray-500">Memproses...</p>
                  </div>
                )}

                {scanResult &&
                  scanResult !== "loading" &&
                  (() => {
                    const cfg = getStatusConfig(scanResult.status);
                    return (
                      <div
                        className={`rounded-xl p-3.5 border ${cfg.bg} ${cfg.border}`}
                      >
                        <div
                          className={`flex items-center gap-2 mb-3 ${cfg.text}`}
                        >
                          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span className="text-xs font-semibold uppercase tracking-wide">
                            {cfg.label}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {[
                            {
                              label: "Asset ID",
                              value: scanResult.id,
                              mono: true,
                            },
                            { label: "Type", value: scanResult.jenisAset },
                            {
                              label: "Brand",
                              value: scanResult.brand || "N/A",
                            },
                            scanResult.nomorSeri && {
                              label: "Serial",
                              value: scanResult.nomorSeri,
                              mono: true,
                            },
                            {
                              label: "Confidence",
                              value: `${scanResult.confidencePercent}%`,
                            },
                            {
                              label: "Waktu Scan",
                              value: `${scanResult.tanggal} ${scanResult.waktu}`,
                            },
                          ]
                            .filter(Boolean)
                            .map((row) => (
                              <div
                                key={row.label}
                                className="flex justify-between items-center text-xs"
                              >
                                <span className="text-gray-500">
                                  {row.label}
                                </span>
                                <span
                                  className={`text-gray-800 ${row.mono ? "font-mono" : ""}`}
                                >
                                  {row.value}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            </div>
          </div>

          {/* ── Scan History (Full width table) ──────────────────────────── */}
          <div className="scan-card p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <p className="section-label mb-0" style={{ marginBottom: 0 }}>
                  <Calendar className="w-3.5 h-3.5" /> Detection History
                </p>
                <div className="flex items-center gap-2">
                  {checkHistory.length > 0 && (
                    <span
                      style={{
                        background: "#f1f5f9",
                        color: "#475569",
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 10px",
                        borderRadius: "20px",
                      }}
                    >
                      {checkHistory.length} items
                    </span>
                  )}
                </div>
              </div>
              {checkHistory.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="bg-white border border-red-500 text-red-500 hover:bg-red-50 rounded-lg px-2.5 py-1 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              )}
            </div>

            {checkHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <Box className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-lg text-gray-500">No scan history</p>
                <p className="text-sm text-gray-400 mt-1">
                  Your scanned items will appear here
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {[
                          "Asset ID",
                          "Type",
                          "Category",
                          "Brand",
                          "Serial",
                          "Confidence",
                          "Status",
                          "Time",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left"
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#6b7280",
                              textTransform: "uppercase",
                              letterSpacing: ".06em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {checkHistory.map((item, idx) => {
                        const cfg = getStatusConfig(item.status);
                        return (
                          <tr
                            key={item.id}
                            className="history-row border-t border-gray-50"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  {getCategoryIcon(item.kategori)}
                                </div>
                                <span className="font-mono text-gray-900 text-xs">
                                  {item.id}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {item.jenisAset}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                style={{
                                  background:
                                    item.kategori === "Perangkat"
                                      ? "#dbeafe"
                                      : "#dcfce7",
                                  color:
                                    item.kategori === "Perangkat"
                                      ? "#1d4ed8"
                                      : "#15803d",
                                  fontSize: 11,
                                  fontWeight: 500,
                                  padding: "3px 8px",
                                  borderRadius: 20,
                                }}
                              >
                                {item.kategori === "Perangkat"
                                  ? "Device"
                                  : "Material"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {item.brand || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-gray-600">
                                {item.nomorSeri || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                style={{
                                  background:
                                    item.confidencePercent >= 80
                                      ? "#dcfce7"
                                      : item.confidencePercent >= 60
                                        ? "#fef9c3"
                                        : "#fee2e2",
                                  color:
                                    item.confidencePercent >= 80
                                      ? "#15803d"
                                      : item.confidencePercent >= 60
                                        ? "#854d0e"
                                        : "#b91c1c",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "2px 8px",
                                  borderRadius: 20,
                                }}
                              >
                                {item.confidencePercent || "—"}%
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 500,
                                  padding: "3px 10px",
                                  borderRadius: 20,
                                }}
                                className={cfg.badge}
                              >
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs text-gray-500">
                                {item.tanggal}
                              </p>
                              <p className="text-xs text-gray-400">
                                {item.waktu}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {item.status === "device_detected" &&
                                  !item.nomorSeri && (
                                    <button
                                      onClick={() =>
                                        handleScanSerialForItem(item)
                                      }
                                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white transition"
                                      title="Scan Serial Number"
                                    >
                                      <ScanLine className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                {item.status !== "Submitted" && item.lokasi && (
                                  <button
                                    onClick={() => handleSubmitSingle(item)}
                                    disabled={isSubmitting}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50"
                                    title="Submit"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteData(item)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-2">
                  {checkHistory.map((item) => {
                    const cfg = getStatusConfig(item.status);
                    return (
                      <div
                        key={item.id}
                        className="border border-gray-100 rounded-xl p-3 bg-white"
                      >
                        <div className="flex items-start justify-between mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                              {getCategoryIcon(item.kategori)}
                            </div>
                            <div>
                              <p className="font-mono text-xs text-gray-900">
                                {item.id}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.jenisAset}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs mb-2.5">
                          <div>
                            <span className="text-gray-400">Brand: </span>
                            <span className="text-gray-700">
                              {item.brand || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Confidence: </span>
                            <span className="font-bold text-gray-700">
                              {item.confidencePercent}%
                            </span>
                          </div>
                          {item.nomorSeri && (
                            <div className="col-span-2">
                              <span className="text-gray-400">Serial: </span>
                              <span className="font-mono text-gray-700">
                                {item.nomorSeri}
                              </span>
                            </div>
                          )}
                          <div className="col-span-2 text-gray-400">
                            {item.tanggal} &nbsp;{item.waktu}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-gray-50">
                          {item.status !== "Submitted" && item.lokasi && (
                            <button
                              onClick={() => handleSubmitSingle(item)}
                              disabled={isSubmitting}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition"
                            >
                              <Send className="w-3 h-3" /> Submit
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteData(item)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {readyToSubmitCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={handleSubmitAll}
                      disabled={isSubmittingAll}
                      className="btn-primary"
                      style={{ maxWidth: "100%" }}
                    >
                      {isSubmittingAll ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting {readyToSubmitCount} items...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" /> Submit All (
                          {readyToSubmitCount} items)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <SessionSelectorModal />

        <FullscreenCamera
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onDetect={handleCameraDetection}
          mode={cameraMode}
          sessionData={currentPreparation}
        />
      </LayoutDashboard>
    </ProtectedPage>
  );
}
