// app/scanning/page.js
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
  MapPin,
  X,
  Trash2,
  Loader2,
  Hash,
  Info,
  Plus,
  Eye,
  Package,
} from "lucide-react";
import Swal from "sweetalert2";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
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
  const [cameraError, setCameraError] = useState(null);
  const [inputType, setInputType] = useState("");
  const [checkHistory, setCheckHistory] = useState([]);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [locationSearch, setLocationSearch] = useState("");
  const [isScanningSerial, setIsScanningSerial] = useState(false);
  const [selectedDeviceForSerial, setSelectedDeviceForSerial] = useState(null);
  const [serialScanResult, setSerialScanResult] = useState(null);
  const [isDetectingSerial, setIsDetectingSerial] = useState(false);
  const [pendingSerialScans, setPendingSerialScans] = useState([]);
  
  // State untuk menyimpan data preparation
  const [currentPreparation, setCurrentPreparation] = useState(null);
  const [scanningProgress, setScanningProgress] = useState({});

  const videoRef = useRef(null);
  const serialVideoRef = useRef(null);

  // CSS Styles
  const styles = `
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
    .section-title { 
      font-size: 13px; 
      font-weight: 600; 
      color: #6b7280; 
      text-transform: uppercase; 
      letter-spacing: 0.05em; 
      margin-bottom: 16px; 
    }
    .bullet-dot { 
      width: 8px; 
      height: 8px; 
      border-radius: 50%; 
      display: inline-block; 
      margin-right: 6px; 
    }
  `;

  // Load data saat komponen mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("scanCheckHistory");
    if (savedHistory) {
      setCheckHistory(JSON.parse(savedHistory));
    }
    
    // Cek apakah ada preparation_id di URL
    const prepId = searchParams.get('prep_id');
    if (prepId) {
      loadPreparation(prepId);
    } else {
      // Jika tidak ada prep_id, redirect ke halaman sessions
      router.push("/scanning_sessions");
    }
    
    fetchLocations();
  }, []);

  useEffect(() => {
    if (checkHistory.length > 0) {
      localStorage.setItem("scanCheckHistory", JSON.stringify(checkHistory));
    }
  }, [checkHistory]);

  // Load detail preparation
  const loadPreparation = async (prepId) => {
    try {
      const response = await fetch(API_ENDPOINTS.SCANNING_PREP_DETAIL(prepId));
      const data = await response.json();
      if (data.success) {
        setCurrentPreparation(data.data);
        
        // Inisialisasi progress scanning
        const progress = {};
        data.data.items.forEach((item) => {
          progress[item.id_item] = {
            total: item.quantity,
            scanned: 0, // Mulai dari 0
            items: [],
          };
        });
        setScanningProgress(progress);
      }
    } catch (error) {
      console.error("Error loading preparation:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to load scanning session",
        icon: "error",
        confirmButtonColor: "#1e40af",
      }).then(() => {
        router.push("/scanning_sessions");
      });
    }
  };

  const fetchLocations = async (searchTerm = "") => {
    try {
      setIsLoadingLocations(true);
      let url = locationSearch
        ? API_ENDPOINTS.LOCATION_SEARCH(locationSearch)
        : API_ENDPOINTS.LOCATION_ALL;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const formattedLocations = data.locations.map((loc) => ({
          value: loc.id_location,
          label: loc.location_name,
          fullData: loc,
        }));

        setLocations(formattedLocations);
        setFilteredLocations(formattedLocations);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  // Inisialisasi kamera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to access camera:", err);
        setCameraError(
          "Unable to access the camera. Please make sure camera permissions are granted.",
        );
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Update progress scanning
  const updateScanningProgress = (detectedItems) => {
    if (!currentPreparation) return;
    
    setScanningProgress(prev => {
      const newProgress = { ...prev };
      
      // Update progress untuk item pertama (sementara)
      const firstItemId = currentPreparation.items[0]?.id_item;
      if (firstItemId && newProgress[firstItemId]) {
        newProgress[firstItemId] = {
          ...newProgress[firstItemId],
          scanned: Math.min(
            newProgress[firstItemId].scanned + detectedItems.length,
            newProgress[firstItemId].total
          )
        };
      }
      
      return newProgress;
    });
  };

  const updateCheckHistory = (scanData) => {
    if (
      scanData.status === "error" ||
      scanData.id.includes("NO-DETECTION") ||
      scanData.id.includes("ERROR")
    ) {
      return null;
    }

    // Tambahkan informasi preparation ke scan data
    if (currentPreparation) {
      scanData.preparation_id = currentPreparation.id_preparation;
      scanData.preparation_name = currentPreparation.checking_name;
      scanData.lokasi = currentPreparation.location_name || "";
      scanData.lokasiLabel = currentPreparation.location_name || "";
    }

    setCheckHistory((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === scanData.id);

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...scanData,
          updatedAt: new Date().toISOString(),
        };
        return updated;
      } else {
        const newCheckItem = {
          id: scanData.id || `CHK-${Date.now()}`,
          timestamp: scanData.timestamp || new Date().toISOString(),
          tanggal: scanData.tanggal || new Date().toLocaleDateString("id-ID"),
          waktu: scanData.waktu || new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          ...scanData,
          status: scanData.status || "Checked",
          submitted: scanData.submitted || false,
          lokasi: scanData.lokasi || (currentPreparation?.location_name || ""),
          lokasiLabel: scanData.lokasiLabel || (currentPreparation?.location_name || ""),
        };
        return [newCheckItem, ...prev];
      }
    });
  };

const handleCameraCapture = async () => {
  if (!currentPreparation) {
    Swal.fire({
      title: "No Active Session",
      text: "Please select a scanning session first",
      icon: "warning",
      confirmButtonText: "OK",
    }).then(() => {
      router.push("/scanning_sessions");
    });
    return;
  }

  const totalScanned = Object.values(scanningProgress).reduce(
    (sum, p) => sum + p.scanned, 0
  );
  const totalTarget = currentPreparation.items.reduce(
    (sum, item) => sum + item.quantity, 0
  );

  if (totalScanned >= totalTarget) {
    Swal.fire({
      title: "Scanning Complete!",
      html: `
        <div class="text-center">
          <p>All items have been scanned for this session.</p>
          <p class="font-semibold mt-2">${currentPreparation.checking_name}</p>
          <p class="text-sm text-gray-600 mt-1">Total: ${totalTarget} items</p>
        </div>
      `,
      icon: "success",
      confirmButtonText: "View Sessions",
      showCancelButton: true,
      cancelButtonText: "Close",
    }).then((result) => {
      if (result.isConfirmed) {
        router.push("/scanning_sessions");
      }
    });
    return;
  }

  setIsDetecting(true);
  setScanResult("loading");

  try {
    const canvas = document.createElement("canvas");
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.8);

    const response = await fetch(API_ENDPOINTS.DETECT_CAMERA, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_data: imageData }),
    });

    const result = await response.json();

    if (result.success && result.detected_items?.length > 0) {
      const availableItems = currentPreparation.items.filter(item => 
        (scanningProgress[item.id_item]?.scanned || 0) < (scanningProgress[item.id_item]?.total || item.quantity)
      );
      
      if (availableItems.length === 0) {
        Swal.fire({
          title: "No Available Items",
          text: "All items have reached their target quantity",
          icon: "info",
          confirmButtonText: "OK",
        });
        setIsDetecting(false);
        return;
      }
      
      const detectedItem = result.detected_items[0];
      const detectedAssetType = detectedItem.asset_type?.toLowerCase() || "";
      const detectedCategory = detectedItem.category || "";
      
      const matchingItems = currentPreparation.items.filter(item => {
        const itemName = item.item_name?.toLowerCase() || "";
        return itemName.includes(detectedAssetType) || 
               detectedAssetType.includes(itemName) ||
               (detectedCategory === "Perangkat" && item.item_name?.toLowerCase().includes("laptop")) ||
               (detectedCategory === "Perangkat" && item.item_name?.toLowerCase().includes("pc")) ||
               (detectedCategory === "Perangkat" && item.item_name?.toLowerCase().includes("komputer")) ||
               (detectedCategory === "Perangkat" && item.item_name?.toLowerCase().includes("monitor")) ||
               (detectedCategory === "Material" && item.item_name?.toLowerCase().includes("kabel"));
      });
      
      if (matchingItems.length === 0) {
        Swal.fire({
          title: "Item Tidak Sesuai!",
          html: `
            <div class="text-center">
              <AlertTriangle class="w-12 h-12 text-orange-500 mx-auto mb-3" />
              <p class="text-lg font-semibold text-gray-800 mb-2">Detected: ${detectedItem.asset_type}</p>
              <p class="text-sm text-gray-600">Item yang discan tidak sesuai dengan yang ada di preparation session ini.</p>
              <div class="mt-4 p-3 bg-gray-100 rounded-lg text-left">
                <p class="text-xs font-semibold text-gray-700 mb-2">Items in this session:</p>
                <ul class="text-xs text-gray-600 space-y-1">
                  ${currentPreparation.items.map(item => `<li>• ${item.item_name} (${item.brand || 'No brand'})</li>`).join('')}
                </ul>
              </div>
              <p class="text-xs text-gray-500 mt-3">Silakan scan item yang sesuai dengan preparation session.</p>
            </div>
          `,
          icon: "warning",
          confirmButtonText: "OK",
          customClass: {
            popup: "rounded-xl",
            confirmButton: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
          },
        });
        
        setScanResult({
          status: "error",
          message: `Detected ${detectedItem.asset_type} - Tidak sesuai dengan preparation`,
        });
        setIsDetecting(false);
        return;
      }
      
      const targetItem = matchingItems[0];
      
      const detectedItems = result.detected_items.map((item, index) => ({
        id: item.id || `${targetItem.item_name.toUpperCase().replace(/\s/g, '')}-${Date.now()}-${index}`,
        item_id: targetItem.id_item,
        jenisAset: targetItem.item_name || item.asset_type || "Unknown",
        kategori: targetItem.kategori || item.category || (currentPreparation.category_name === "Devices" ? "Perangkat" : "Material"),
        brand: targetItem.brand || item.brand || "N/A",
        confidencePercent: item.confidence_percent || (item.confidence ? Math.round(item.confidence * 100).toString() : Math.floor(Math.random() * 20 + 75).toString()),
        status: "device_detected",
        timestamp: new Date().toISOString(),
        message: `Detected: ${targetItem.item_name}`,
        needsSerialScan: true,
      }));

      setPendingSerialScans(prev => [...prev, ...detectedItems]);
      updateScanningProgress(detectedItems, targetItem.id_item);
    
      detectedItems.forEach((item) => updateCheckHistory(item));

      if (detectedItems.length > 0) {
        setScanResult(detectedItems[0]);
        
        showSuccessDetectionModal(result, detectedItems, (items) => {
          showDeviceSelectionForSerial(items);
        });
      }
    } else {
      setScanResult({
        status: "error",
        message: result.message || "No devices detected",
      });

      Swal.fire({
        title: "Detection Result",
        text: result.message || "No devices found",
        icon: "info",
        confirmButtonText: "OK",
      });
    }
  } catch (error) {
    console.error("Capture error:", error);
    Swal.fire({
      title: "Connection Error",
      text: "Failed to connect to backend. Make sure server is running.",
      icon: "error",
      confirmButtonText: "OK",
    });
  } finally {
    setIsDetecting(false);
  }
};

  const handleSerialCapture = async () => {
    if (!serialVideoRef.current) {
      Swal.fire({
        title: "Camera Error",
        text: "Camera not available",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    setIsDetectingSerial(true);
    setSerialScanResult("loading");

    try {
      const canvas = document.createElement("canvas");
      const video = serialVideoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL("image/jpeg", 0.9);

      const response = await fetch(API_ENDPOINTS.SERIAL_DETECT_CAMERA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data: imageData }),
      });

      const result = await response.json();

      if (result.success && result.serial_detections?.length > 0) {
        const validSerials = result.serial_detections.filter((s) => s.is_valid);

        if (validSerials.length > 0) {
          const bestSerial = validSerials[0];

          const updatedDevice = {
            ...selectedDeviceForSerial,
            nomorSeri: bestSerial.detected_text,
            brand: bestSerial.brand_info || selectedDeviceForSerial.brand,
            serial_confidence: bestSerial.confidence,
            extraction_method: bestSerial.method,
            status: "serial_scanned",
            message: `Serial number detected: ${bestSerial.detected_text}`,
            serial_detection_time: new Date().toISOString(),
          };

          updateCheckHistory(updatedDevice);

          setSerialScanResult({
            status: "success",
            serialNumber: bestSerial.detected_text,
            confidence: bestSerial.confidence,
            brand: bestSerial.brand_info || selectedDeviceForSerial.brand,
            method: bestSerial.method,
            processing_time: result.processing_time_ms,
            message: "Serial number detected successfully!",
          });

          showSerialDetectedModal(
            bestSerial,
            selectedDeviceForSerial,
            result,
            () => cancelSerialScanning(),
            () => {
              setSerialScanResult(null);
              setIsDetectingSerial(false);
            },
          );
        } else {
          setSerialScanResult({
            status: "error",
            message: "No valid serial numbers detected",
          });

          Swal.fire({
            title: "Invalid Serial",
            text: "Detected serial number doesn't meet validation criteria",
            icon: "warning",
            confirmButtonText: "Try Again",
          });
        }
      } else {
        setSerialScanResult({
          status: "error",
          message: result.message || "No serial numbers detected",
        });

        Swal.fire({
          title: "No Serial Found",
          text: result.message || "Please ensure the serial number is clearly visible",
          icon: "info",
          confirmButtonText: "Try Again",
        });
      }
    } catch (error) {
      console.error("Serial capture error:", error);
      setSerialScanResult({
        status: "error",
        message: "Failed to process image",
      });

      Swal.fire({
        title: "Network Error",
        text: "Failed to connect to server.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setIsDetectingSerial(false);
    }
  };

  const showDeviceSelectionForSerial = (devices) => {
    showDeviceSelectionModal(devices, (selectedDevice) => {
      startSerialScanning(selectedDevice);
    });
  };

  const startSerialScanning = (device) => {
    setSelectedDeviceForSerial(device);
    setIsScanningSerial(true);

    setTimeout(() => {
      initializeSerialCamera();
    }, 100);
  };

  const initializeSerialCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (serialVideoRef.current) {
        serialVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Failed to access serial camera:", err);
      Swal.fire({
        title: "Camera Error",
        text: "Unable to access the camera for serial scanning.",
        icon: "error",
        confirmButtonText: "OK",
      });
      setIsScanningSerial(false);
    }
  };

  const cancelSerialScanning = () => {
    if (serialVideoRef.current && serialVideoRef.current.srcObject) {
      const tracks = serialVideoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }

    setIsScanningSerial(false);
    setSelectedDeviceForSerial(null);
    setSerialScanResult(null);
  };

  const handleScanSerialFromHistory = (item) => {
    startSerialScanning(item);
  };

  const handleManualCheck = (e) => {
    e.preventDefault();
    if (!manualInput) return;

    setScanResult("loading");
    setIsSubmitting(false);

    setTimeout(() => {
      if (manualInput.toUpperCase().includes("ERROR")) {
        const errorData = {
          status: "error",
          id: "INVALID-INPUT",
          jenisAset: "Invalid Input",
          kategori: "Error",
          lokasi: currentPreparation?.location_name || "",
          brand: "N/A",
          confidencePercent: "0",
          message: "Format input tidak valid.",
        };
        setScanResult(errorData);
      } else {
        const isPerangkat = manualInput.toUpperCase().includes("NS-") || Math.random() < 0.5;
        const successData = isPerangkat
          ? {
              id: `PC-MAN-${Date.now().toString().slice(-6)}`,
              jenisAset: "Komputer",
              kategori: "Perangkat",
              lokasi: currentPreparation?.location_name || "",
              lokasiLabel: currentPreparation?.location_name || "",
              nomorSeri: manualInput,
              brand: Math.random() > 0.5 ? "Dell" : "HP",
              confidencePercent: "95.0",
              status: "Checked",
            }
          : {
              id: `MAT-MAN-${Date.now().toString().slice(-6)}`,
              jenisAset: "Material",
              kategori: "Material",
              lokasi: currentPreparation?.location_name || "",
              lokasiLabel: currentPreparation?.location_name || "",
              barcode: manualInput,
              brand: "N/A",
              confidencePercent: "98.0",
              status: "Checked",
            };
        const finalData = {
          status: "success",
          ...successData,
          message: `Valid! Manual input detected.`,
        };

        setScanResult(finalData);
        updateCheckHistory(finalData);
        setManualInput("");
      }
    }, 1500);
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
            notes: `Scanned via scanning page - ${item.jenisAset} ${item.nomorSeri ? `SN: ${item.nomorSeri}` : ""}`,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setCheckHistory((prev) =>
            prev.map((prevItem) =>
              prevItem.id === item.id
                ? { ...prevItem, submitted: true, status: "Submitted" }
                : prevItem,
            ),
          );

          Swal.fire({
            title: "Success!",
            text: `Data for ${item.jenisAset} submitted successfully.`,
            icon: "success",
            confirmButtonText: "OK",
          });
        } else {
          Swal.fire({
            title: "Submission Failed",
            text: result.message || "Failed to submit data.",
            icon: "error",
            confirmButtonText: "OK",
          });
        }
      } catch (error) {
        console.error("Submission error:", error);
        Swal.fire({
          title: "Error",
          text: "Failed to connect to server.",
          icon: "error",
          confirmButtonText: "OK",
        });
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const handleSubmitAll = async () => {
    const itemsToSubmit = checkHistory.filter(
      (item) => item.status === "Checked" && item.lokasi && !item.submitted,
    );

    if (itemsToSubmit.length === 0) {
      Swal.fire({
        title: "No Items to Submit",
        text: "All items have been submitted or no items with location.",
        icon: "info",
        confirmButtonText: "OK",
      });
      return;
    }

    showSubmitAllModal(itemsToSubmit, async () => {
      setIsSubmittingAll(true);

      try {
        const response = await fetch(API_ENDPOINTS.LOCATION_ASSIGN_MULTIPLE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset_ids: itemsToSubmit.map((item) => item.id),
            location_code: itemsToSubmit[0].lokasi,
            scanned_by: "Scanner User",
            notes: `Batch submission from scanning page - ${itemsToSubmit.length} items`,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setCheckHistory((prev) =>
            prev.map((prevItem) => {
              if (itemsToSubmit.some((item) => item.id === prevItem.id)) {
                return { ...prevItem, submitted: true, status: "Submitted" };
              }
              return prevItem;
            }),
          );

          Swal.fire({
            title: "Success!",
            html: `
              <div class="text-center">
                <p class="text-lg font-semibold">${result.success_count} items submitted successfully</p>
                ${result.failed_count > 0 ? `<p class="text-sm text-red-600 mt-2">${result.failed_count} items failed</p>` : ""}
              </div>
            `,
            icon: "success",
            confirmButtonText: "OK",
          });
        } else {
          Swal.fire({
            title: "Submission Failed",
            text: result.message || "Failed to submit data.",
            icon: "error",
            confirmButtonText: "OK",
          });
        }
      } catch (error) {
        console.error("Batch submission error:", error);
        Swal.fire({
          title: "Error",
          text: "Failed to connect to server.",
          icon: "error",
          confirmButtonText: "OK",
        });
      } finally {
        setIsSubmittingAll(false);
      }
    });
  };

  const handleDeleteData = (item) => {
    showDeleteItemModal(item, () => {
      setCheckHistory((prev) =>
        prev.filter((prevItem) => prevItem.id !== item.id),
      );

      Swal.fire({
        title: "Deleted!",
        text: "Item has been deleted.",
        icon: "success",
        confirmButtonText: "OK",
      });
    });
  };

  const handleDeleteAll = () => {
    if (validCheckHistory.length === 0) return;

    showDeleteAllModal(validCheckHistory.length, () => {
      setCheckHistory([]);
      localStorage.removeItem("scanCheckHistory");
      Swal.fire({
        title: "Deleted!",
        text: "All items have been deleted.",
        icon: "success",
        confirmButtonText: "OK",
      });
    });
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case "success":
      case "serial_scanned":
        return "bg-green-100 text-green-700 border-green-200";
      case "error":
        return "bg-red-100 text-red-700 border-red-200";
      case "device_detected":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Checked":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Submitted":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "success": return "Success";
      case "error": return "Error";
      case "device_detected": return "Device Detected";
      case "serial_scanned": return "Serial Scanned";
      case "Checked": return "Checked";
      case "Submitted": return "Submitted";
      default: return status;
    }
  };

  const getCategoryIcon = (kategori) => {
    switch (kategori) {
      case "Perangkat": return <Cpu className="w-4 h-4 text-blue-600" />;
      case "Material": return <Cable className="w-4 h-4 text-green-600" />;
      default: return <Server className="w-4 h-4 text-gray-600" />;
    }
  };

  const readyToSubmitCount = checkHistory.filter(
    (item) => item.status === "Checked" && item.lokasi && !item.submitted,
  ).length;

  const validCheckHistory = checkHistory.filter(
    (item) =>
      !item.id.includes("NO-DETECTION") &&
      !item.id.includes("ERROR") &&
      !item.id.includes("INVALID"),
  );

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu={2}>
        <style>{styles}</style>

        <SerialScanningModal
          isOpen={isScanningSerial}
          onClose={cancelSerialScanning}
          selectedDeviceForSerial={selectedDeviceForSerial}
          serialVideoRef={serialVideoRef}
          isDetectingSerial={isDetectingSerial}
          serialScanResult={serialScanResult}
          onCapture={handleSerialCapture}
        />

        <div className="bm-root max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-2 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  IT ASSET SCANNING
                </h1>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Scan IT devices or materials based on your preparation session
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/scanning_sessions")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
              >
                <Package className="w-4 h-4" />
                View Sessions
              </button>
              <button
                onClick={() => router.push("/scanning_preparation")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                <Plus className="w-4 h-4" />
                New Session
              </button>
            </div>
          </div>

          {/* Active Session Card - SELALU TAMPIL karena sudah ada prep_id */}
          {currentPreparation ? (
            <div className="card p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-800">
                      Active Session: {currentPreparation.checking_name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      #{currentPreparation.checking_number} • Location: {currentPreparation.location_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCurrentPreparation(null);
                    setScanningProgress({});
                    router.push("/scanning_sessions");
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="End Session"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bars */}
              <div className="space-y-3">
                {currentPreparation.items.map((item) => {
                  const progress = scanningProgress[item.id_item] || {
                    scanned: 0,
                    total: item.quantity,
                  };
                  const percentage = (progress.scanned / progress.total) * 100;

                  return (
                    <div key={item.id_item} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">
                            {item.item_name}
                          </span>
                          {item.brand && (
                            <span className="text-gray-400">({item.brand})</span>
                          )}
                          {item.model && (
                            <span className="text-gray-400">- {item.model}</span>
                          )}
                        </div>
                        <span className="text-gray-600 font-mono">
                          {progress.scanned}/{progress.total}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percentage === 100
                                ? "bg-green-500"
                                : percentage > 50
                                  ? "bg-blue-500"
                                  : "bg-yellow-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        {percentage === 100 && (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Total Progress:{" "}
                  {Object.values(scanningProgress).reduce((sum, p) => sum + p.scanned, 0)} /{" "}
                  {currentPreparation.items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
                {Object.values(scanningProgress).every((p) => p.scanned === p.total) && (
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Complete
                  </span>
                )}
              </div>
            </div>
          ) : (
            // Loading state saat mengambil data preparation
            <div className="card p-6 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading session...</span>
            </div>
          )}

          {/* Camera Section */}
          <div className="card p-3 sm:p-4 md:p-6">
            <p className="section-title flex items-center gap-2">
              <ScanLine className="w-4 h-4" /> Camera Scanner – Detect Devices/Materials
            </p>

            <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center mb-4 sm:mb-6">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              ></video>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4/5 h-4/5 border-4 border-dashed border-white/50 rounded-lg"></div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-black/70 text-white text-center flex items-center justify-center p-3 sm:p-4">
                  <div>
                    <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm">{cameraError}</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleCameraCapture}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg disabled:opacity-50 text-sm"
              disabled={isDetecting || scanResult === "loading"}
            >
              {isDetecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Detecting Devices...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Capture & Detect Devices
                </>
              )}
            </button>
          </div>

          {/* Manual Input & Scan Results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="card p-4 sm:p-6">
              <p className="section-title flex items-center gap-2">
                <Clipboard className="w-4 h-4" /> Manual Input
              </p>
              <form onSubmit={handleManualCheck} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Enter Serial Number or Barcode
                  </label>
                  <input
                    type="text"
                    placeholder="Example: NS-PC-887632 or BC-RJ45-554321"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-xs sm:text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition disabled:opacity-50 text-sm"
                  disabled={scanResult === "loading" || isSubmitting}
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Check Validity
                </button>
              </form>
            </div>

            <div className="card p-4 sm:p-6">
              <p className="section-title flex items-center gap-2">
                <Eye className="w-4 h-4" /> Latest Detection Result
              </p>

              {scanResult === "loading" && (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 animate-spin text-blue-600" />
                  <p className="font-medium text-sm sm:text-base">Processing detection...</p>
                </div>
              )}

              {scanResult && scanResult !== "loading" && (
                <div
                  className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                    scanResult.status === "success" || scanResult.status === "serial_scanned"
                      ? "bg-green-50 border-green-500"
                      : scanResult.status === "device_detected"
                        ? "bg-blue-50 border-blue-500"
                        : "bg-red-50 border-red-500"
                  }`}
                >
                  <div
                    className={`flex items-center mb-2 sm:mb-3 ${
                      scanResult.status === "success" || scanResult.status === "serial_scanned"
                        ? "text-green-700"
                        : scanResult.status === "device_detected"
                          ? "text-blue-700"
                          : "text-red-700"
                    }`}
                  >
                    {scanResult.status === "success" || scanResult.status === "serial_scanned" ? (
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                    ) : scanResult.status === "device_detected" ? (
                      <Camera className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                    )}
                    <span className="font-bold text-base sm:text-lg capitalize">
                      {getStatusText(scanResult.status)}
                    </span>
                  </div>

                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Asset ID:</span>
                      <span className="font-bold text-gray-800">{scanResult.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Type:</span>
                      <span className="text-gray-800">{scanResult.jenisAset}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Category:</span>
                      <span className="flex items-center">
                        {getCategoryIcon(scanResult.kategori)}
                        <span className="ml-1 text-gray-800">{scanResult.kategori}</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Brand:</span>
                      <span className="text-gray-800 font-medium">{scanResult.brand || "N/A"}</span>
                    </div>
                    {scanResult.nomorSeri && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Serial Number:</span>
                        <span className="font-mono text-gray-800 font-medium">{scanResult.nomorSeri}</span>
                      </div>
                    )}
                    {scanResult.confidencePercent && scanResult.confidencePercent !== "N/A" && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Confidence:</span>
                        <span className="font-bold text-gray-800">{scanResult.confidencePercent}%</span>
                      </div>
                    )}
                    {currentPreparation && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Session:</span>
                        <span className="text-gray-800">{currentPreparation.checking_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* History Table */}
          <div className="card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
              <div className="flex items-center">
                <p className="section-title flex items-center gap-2 mb-0">
                  <Calendar className="w-4 h-4" /> Recent Detection History
                </p>
              </div>
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-500">
                    {validCheckHistory.length} items
                  </span>
                  {readyToSubmitCount > 0 && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      {readyToSubmitCount} ready
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {validCheckHistory.length > 0 && (
                    <button
                      onClick={handleDeleteAll}
                      className="flex items-center px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition"
                      title="Delete All History"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete All
                    </button>
                  )}
                </div>
              </div>
            </div>

            {validCheckHistory.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <Box className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-gray-400" />
                <p className="font-medium text-sm sm:text-base">No detection history yet</p>
                <p className="text-xs sm:text-sm mt-1">Start scanning with your active session</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50">
                        {["Asset ID", "Type", "Category", "Brand", "Confidence", "Serial Number", "Location", "Status", "Date", "Time", "Action"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validCheckHistory.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 text-gray-800">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                {getCategoryIcon(item.kategori)}
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{item.id}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{item.jenisAset}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                              item.kategori === "Perangkat" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                            }`}>
                              {item.kategori === "Perangkat" ? "Device" : "Material"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            <span className="font-medium text-gray-500">{item.brand || "N/A"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                              item.confidencePercent >= 80
                                ? "bg-green-100 text-green-700"
                                : item.confidencePercent >= 60
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}>
                              {item.confidencePercent || "N/A"}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {item.nomorSeri ? (
                              <span className="font-mono text-gray-500 text-xs">{item.nomorSeri}</span>
                            ) : (
                              <button
                                onClick={() => handleScanSerialFromHistory(item)}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center hover:underline"
                              >
                                <ScanLine className="w-3 h-3 mr-1" />
                                <span>Scan Serial</span>
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            <div className="max-w-[120px] truncate" title={item.lokasiLabel || item.lokasi}>
                              {item.lokasiLabel || item.lokasi || "From Preparation"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full font-semibold border ${getStatusColor(item.status)}`}>
                              {getStatusText(item.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-600">{item.tanggal}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-400">{item.waktu}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-1 sm:space-x-2">
                              {item.status === "Checked" && item.lokasi && (
                                <button
                                  onClick={() => handleSubmitSingle(item)}
                                  disabled={isSubmitting}
                                  className="flex items-center px-2 sm:px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                                  title="Submit Data"
                                >
                                  <Send className="w-3 h-3 mr-1" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteData(item)}
                                className="flex items-center px-2 sm:px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition"
                                title="Delete Data"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {validCheckHistory.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                            {getCategoryIcon(item.kategori)}
                          </div>
                          <div className="font-bold text-sm text-gray-900">{item.id}</div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold border ${getStatusColor(item.status)}`}>
                          {getStatusText(item.status)}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium">Type:</span>
                          <span>{item.jenisAset}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Category:</span>
                          <span className={`px-1 rounded text-xs ${
                            item.kategori === "Perangkat" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                          }`}>
                            {item.kategori === "Perangkat" ? "Device" : "Material"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Brand:</span>
                          <span>{item.brand || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Confidence:</span>
                          <span className="font-bold">{item.confidencePercent}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Serial:</span>
                          {item.nomorSeri ? (
                            <span className="font-mono">{item.nomorSeri}</span>
                          ) : (
                            <button
                              onClick={() => handleScanSerialFromHistory(item)}
                              className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
                            >
                              <ScanLine className="w-3 h-3 mr-1" />
                              <span>Scan</span>
                            </button>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Location:</span>
                          <span className="text-right max-w-[120px] truncate">
                            {item.lokasiLabel || item.lokasi || "From Preparation"}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>{item.tanggal}</span>
                          <span>{item.waktu}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2 mt-3 pt-2 border-t border-gray-100">
                        {item.status === "Checked" && item.lokasi && (
                          <button
                            onClick={() => handleSubmitSingle(item)}
                            disabled={isSubmitting}
                            className="flex-1 flex items-center justify-center px-2 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Submit
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteData(item)}
                          className="flex-1 flex items-center justify-center px-2 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {readyToSubmitCount > 0 && (
                  <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSubmitAll}
                      disabled={isSubmittingAll}
                      className="w-full flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm sm:text-base"
                    >
                      {isSubmittingAll ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending {readyToSubmitCount} items...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          Submit All ({readyToSubmitCount} items)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedPage>
  );
}