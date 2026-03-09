"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Barcode,
  Eye,
  Filter,
  ChevronDown,
} from "lucide-react";
import Swal from "sweetalert2";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";
import { debounce, throttle } from "lodash";
import {
  SerialScanningModal,
  showDeviceSelectionModal,
  showSetLocationForAllModal,
  showSetLocationForItemModal,
  showDeleteItemModal,
  showDeleteAllModal,
  showSubmitSingleModal,
  showSubmitAllModal,
  showSuccessDetectionModal,
  showSerialDetectedModal,
  showManualProcessingSuccessModal
} from "../components/ScanningModal";

export default function SerialScanningPage() {
  const [manualInput, setManualInput] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [inputType, setInputType] = useState("");
  const [checkHistory, setCheckHistory] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [currentScanData, setCurrentScanData] = useState(null);
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

  const videoRef = useRef(null);
  const serialVideoRef = useRef(null);

  const router = useRouter();

  // CSS Styles untuk dashboard
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
    .period-badge { 
      background: #1e3a5f; 
      color: #fff; 
      padding: 4px 16px; 
      border-radius: 20px; 
      font-size: 13px; 
      font-weight: 600; 
    }
    .bullet-dot { 
      width: 8px; 
      height: 8px; 
      border-radius: 50%; 
      display: inline-block; 
      margin-right: 6px; 
    }
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
  `;

  useEffect(() => {
    const savedHistory = localStorage.getItem("scanCheckHistory");
    if (savedHistory) {
      setCheckHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    if (checkHistory.length > 0) {
      localStorage.setItem("scanCheckHistory", JSON.stringify(checkHistory));
    }
  }, [checkHistory]);

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
          value: loc.location_code,
          label: `${loc.area} - ${loc.location_name}`,
          fullData: loc,
        }));

        setLocations(formattedLocations);
        setFilteredLocations(formattedLocations);
      } else {
        console.error("Failed to fetch locations:", data.error);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  // Load lokasi saat komponen mount
  useEffect(() => {
    fetchLocations();
  }, []);

  // Inisialisasi kamera utama
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

  // Fungsi untuk menambah/memperbarui data ke riwayat
  const updateCheckHistory = (scanData) => {
    if (
      scanData.status === "error" ||
      scanData.id.includes("NO-DETECTION") ||
      scanData.id.includes("ERROR")
    ) {
      return null;
    }

    setCheckHistory((prev) => {
      // Cek apakah device sudah ada di history
      const existingIndex = prev.findIndex((item) => item.id === scanData.id);

      if (existingIndex >= 0) {
        // Update device yang sudah ada
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...scanData,
          updatedAt: new Date().toISOString(),
        };
        return updated;
      } else {
        // Tambah device baru
        const newCheckItem = {
          id: scanData.id || `CHK-${Date.now()}`,
          timestamp: scanData.timestamp || new Date().toISOString(),
          tanggal: scanData.tanggal || new Date().toLocaleDateString("id-ID"),
          waktu:
            scanData.waktu ||
            new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          ...scanData,
          status: scanData.status || "Checked",
          submitted: scanData.submitted || false,
          lokasi: scanData.lokasi || "",
          lokasiLabel: scanData.lokasiLabel || "",
        };
        return [newCheckItem, ...prev];
      }
    });
  };

const handleCameraCapture = async () => {
  if (!videoRef.current) {
    console.error("Video ref is null");
    Swal.fire({
      title: "Camera Error",
      text: "Camera not available.",
      icon: "error",
      confirmButtonText: "OK",
      customClass: {
        popup: "bm-root rounded-xl",
        confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
      },
    });
    return;
  }

  setIsDetecting(true);
  setScanResult("loading");

  try {
    // Capture gambar
    const canvas = document.createElement("canvas");
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.8);

    console.log("Sending image to backend...");

    const response = await fetch(API_ENDPOINTS.DETECT_CAMERA, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_data: imageData }),
    });

    const result = await response.json();
    console.log("Detection result:", result);

    if (result.success && result.detected_items?.length > 0) {
      const detectedItems = result.detected_items.map((item, index) => ({
        id: item.id || `DEV-${Date.now()}-${index}`,
        jenisAset: item.asset_type || "Unknown",
        kategori: item.category || "Perangkat",
        brand: item.brand || "N/A",
        confidencePercent: item.confidence_percent || "0",
        status: "device_detected",
        timestamp: new Date().toISOString(),
        message: `Detected: ${item.asset_type} (${item.brand})`,
        needsSerialScan: true,
      }));

      detectedItems.forEach((item) => updateCheckHistory(item));

      if (detectedItems.length > 0) {
        setScanResult(detectedItems[0]);
        
        // Gunakan modal yang sudah dipisah
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
        customClass: {
          popup: "bm-root rounded-xl",
          confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
        },
      });
    }
  } catch (error) {
    console.error("Capture error:", error);

    Swal.fire({
      title: "Connection Error",
      html: `
        <div class="text-center font-sans">
          <p class="mb-2">Failed to connect to backend</p>
          <p class="text-sm text-gray-600">Error: ${error.message}</p>
          <p class="text-xs text-gray-500 mt-2">Make sure backend is running on port 5001</p>
        </div>
      `,
      icon: "error",
      confirmButtonText: "OK",
      customClass: {
        popup: "bm-root rounded-xl",
        confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
      },
    });
  } finally {
    setIsDetecting(false);
  }
};

const handleSerialCapture = async () => {
  if (!serialVideoRef.current) {
    console.error("Serial video ref is null");
    Swal.fire({
      title: "Camera Error",
      text: "Camera not available",
      icon: "error",
      confirmButtonText: "OK",
      customClass: {
        popup: "bm-root rounded-xl",
        confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
      },
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

    console.log("📸 Captured serial image, sending to backend...");

    const response = await fetch(API_ENDPOINTS.SERIAL_DETECT_CAMERA, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_data: imageData,
      }),
    });

    const result = await response.json();
    console.log("🔍 Serial detection result:", result);

    if (
      result.success &&
      result.serial_detections &&
      result.serial_detections.length > 0
    ) {
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

        // Gunakan modal serial detected
        showSerialDetectedModal(
          bestSerial,
          selectedDeviceForSerial,
          result,
          () => cancelSerialScanning(),
          () => {
            setSerialScanResult(null);
            setIsDetectingSerial(false);
          }
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
          customClass: {
            popup: "bm-root rounded-xl",
            confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
          },
        });
      }
    } else {
      setSerialScanResult({
        status: "error",
        message: result.message || "No serial numbers detected",
      });

      Swal.fire({
        title: "No Serial Found",
        text:
          result.message ||
          "Please ensure the serial number is clearly visible",
        icon: "info",
        confirmButtonText: "Try Again",
        customClass: {
          popup: "bm-root rounded-xl",
          confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
        },
      });
    }
  } catch (error) {
    console.error("❌ Serial capture error:", error);

    setSerialScanResult({
      status: "error",
      message: "Failed to process image",
    });

    Swal.fire({
      title: "Network Error",
      html: `
        <div class="text-center font-sans">
          <p class="mb-2">Failed to connect to server</p>
          <p class="text-sm text-gray-600">Error: ${error.message}</p>
          <p class="text-xs text-gray-500 mt-2">Make sure backend is running on port 5001</p>
        </div>
      `,
      icon: "error",
      confirmButtonText: "OK",
      customClass: {
        popup: "bm-root rounded-xl",
        confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
      },
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

    // Inisialisasi kamera untuk serial scan
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
        customClass: {
          popup: "bm-root rounded-xl",
          confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
        },
      });
      setIsScanningSerial(false);
    }
  };

  // Fungsi untuk manual image processing
  const handleManualImageProcessing = async (imageData) => {
    setIsDetectingSerial(true);

    try {
      // Kirim ke endpoint processing manual
      const response = await fetch(API_ENDPOINTS.OCR_PROCESS_MANUAL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_data: imageData,
          device_type: selectedDeviceForSerial?.jenisAset || "",
        }),
      });

      const result = await response.json();

      if (result.success && result.serial_number) {
        // Update dengan hasil manual processing
        const updatedDevice = {
          ...selectedDeviceForSerial,
          nomorSeri: result.serial_number,
          status: "serial_scanned",
          message: `Serial number detected via manual processing: ${result.serial_number}`,
          confidencePercent: result.confidence
            ? (result.confidence * 100).toFixed(1)
            : "N/A",
          extractionMethod: "manual_processing",
          extractedDetails: {
            method: "manual",
            notes: result.notes || "",
          },
        };

        updateCheckHistory(updatedDevice);

        Swal.fire({
          title: "Manual Processing Successful!",
          html: `
          <div class="text-center font-sans">
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle class="w-6 h-6 text-green-600" />
            </div>
            <p class="text-lg font-semibold text-gray-900">Serial Number Found via Manual Processing</p>
            <div class="my-3">
              <p class="text-2xl font-mono text-blue-600">${result.serial_number}</p>
            </div>
            ${result.notes ? `<p class="text-sm text-gray-600">${result.notes}</p>` : ""}
          </div>
        `,
          icon: "success",
          confirmButtonText: "OK",
          customClass: {
            popup: "bm-root rounded-xl",
            confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
          },
        }).then(() => {
          setIsScanningSerial(false);
        });
      } else {
        Swal.fire({
          title: "Processing Failed",
          text: "Could not extract serial number even with manual processing.",
          icon: "error",
          confirmButtonText: "OK",
          customClass: {
            popup: "bm-root rounded-xl",
            confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
          },
        });
      }
    } catch (error) {
      console.error("Manual processing error:", error);
      Swal.fire({
        title: "Error",
        text: "Manual processing failed. Please try capturing again.",
        icon: "error",
        confirmButtonText: "OK",
        customClass: {
          popup: "bm-root rounded-xl",
          confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
        },
      });
    } finally {
      setIsDetectingSerial(false);
    }
  };

  // Fungsi extractSerialAdvanced
  const extractSerialAdvanced = async (imageData) => {
    try {
      const response = await fetch(API_ENDPOINTS.OCR_EXTRACT_SERIAL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_data: imageData }),
      });

      const result = await response.json();

      if (result.success && result.extracted_serial) {
        // Validasi lebih lanjut
        const validationResponse = await fetch(
          API_ENDPOINTS.OCR_VALIDATE_SERIAL,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ serial_text: result.extracted_serial }),
          },
        );

        const validationResult = await validationResponse.json();

        if (validationResult.success) {
          return {
            serialNumber: validationResult.validated_serial,
            confidence: result.confidence || 0.8,
            method: result.method || "advanced_ocr",
            originalText:
              validationResult.original_text || result.extracted_serial,
          };
        }
      }

      return null;
    } catch (error) {
      console.error("Advanced serial extraction error:", error);
      return null;
    }
  };

  const cancelSerialScanning = () => {
    // Stop camera stream
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

    const isSerial = manualInput.toUpperCase().includes("NS-");
    const isBarcode = manualInput.toUpperCase().includes("BC-");
    setInputType(isSerial ? "serial" : isBarcode ? "barcode" : "");

    setTimeout(() => {
      if (manualInput.toUpperCase().includes("ERROR")) {
        const errorData = {
          status: "error",
          id: "INVALID-INPUT",
          jenisAset: "Invalid Input",
          kategori: "Error",
          lokasi: "",
          brand: "N/A",
          confidencePercent: "0",
          message: "Format input tidak valid.",
          inputType: isSerial ? "serial" : "barcode",
        };
        setScanResult(errorData);
      } else {
        const isPerangkat = isSerial || Math.random() < 0.5;
        const successData = isPerangkat
          ? {
              id: `PC-MAN-${Date.now().toString().slice(-6)}`,
              jenisAset: "Komputer",
              kategori: "Perangkat",
              lokasi: "",
              lokasiLabel: "",
              nomorSeri: manualInput,
              brand: Math.random() > 0.5 ? "Dell" : "HP",
              confidencePercent: "95.0",
              status: "Checked",
            }
          : {
              id: `MAT-MAN-${Date.now().toString().slice(-6)}`,
              jenisAset: "Material",
              kategori: "Material",
              lokasi: "",
              lokasiLabel: "",
              barcode: manualInput,
              brand: "N/A",
              confidencePercent: "98.0",
              status: "Checked",
            };
        const finalData = {
          status: "success",
          ...successData,
          message: `Valid! Manual input detected.`,
          inputType: isSerial ? "serial" : "barcode",
        };

        setScanResult(finalData);
        updateCheckHistory(finalData);
        setManualInput("");
      }
    }, 1500);
  };

const handleSetLocationForAll = async () => {
  if (validCheckHistory.length === 0) {
    Swal.fire({
      title: "No Data",
      text: "No items to set location for.",
      icon: "info",
      confirmButtonText: "OK",
      customClass: {
        popup: "bm-root rounded-xl",
        confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
      },
    });
    return;
  }

  await showSetLocationForAllModal({
    locations,
    filteredLocations,
    locationSearch,
    validCheckHistory,
    selectedLocation,
    setLocationSearch,
    setFilteredLocations,
    onConfirm: (locationValue) => {
      setCheckHistory((prev) =>
        prev.map((item) => {
          if (
            item.id.includes("NO-DETECTION") ||
            item.id.includes("ERROR") ||
            item.id.includes("INVALID")
          ) {
            return item;
          }
          return {
            ...item,
            lokasi: locationValue.value,
            lokasiLabel: locationValue.label,
            status: "Checked",
          };
        }),
      );

      Swal.fire({
        title: "Location Set!",
        text: `Location set for ${validCheckHistory.length} items.`,
        icon: "success",
        confirmButtonText: "OK",
        customClass: {
          popup: "bm-root rounded-xl",
          confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
        },
      });
    }
  });
};

const handleSetLocationForItem = async (item) => {
  await showSetLocationForItemModal({
    item,
    locations,
    filteredLocations,
    locationSearch,
    setLocationSearch,
    setFilteredLocations,
    onConfirm: (locationValue) => {
      setCheckHistory((prev) =>
        prev.map((prevItem) =>
          prevItem.id === item.id
            ? {
                ...prevItem,
                lokasi: locationValue.value,
                lokasiLabel: locationValue.label,
                status: "Checked",
              }
            : prevItem,
        ),
      );

      Swal.fire({
        title: "Location Set!",
        text: `Location set for ${item.jenisAset} (${item.id}).`,
        icon: "success",
        confirmButtonText: "OK",
        customClass: {
          popup: "bm-root rounded-xl",
          confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
        },
      });
    }
  });
};

const handleSubmitSingle = async (item) => {
  showSubmitSingleModal(item, async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(API_ENDPOINTS.LOCATION_ASSIGN_MULTIPLE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
          customClass: {
            popup: "bm-root rounded-xl",
            confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
          },
        });
      } else {
        Swal.fire({
          title: "Submission Failed",
          text: result.message || "Failed to submit data.",
          icon: "error",
          confirmButtonText: "OK",
          customClass: {
            popup: "bm-root rounded-xl",
            confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
          },
        });
      }
    } catch (error) {
      console.error("Submission error:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to connect to server.",
        icon: "error",
        confirmButtonText: "OK",
        customClass: {
          popup: "bm-root rounded-xl",
          confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
        },
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
      customClass: {
        popup: "bm-root rounded-xl",
        confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
      },
    });
    return;
  }

  showSubmitAllModal(itemsToSubmit, async () => {
    setIsSubmittingAll(true);

    try {
      const response = await fetch(API_ENDPOINTS.LOCATION_ASSIGN_MULTIPLE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
            <div class="text-center font-sans">
              <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p class="text-lg font-semibold text-gray-900">${result.success_count} items submitted successfully</p>
              ${
                result.failed_count > 0
                  ? `<p class="text-sm text-red-600 mt-2">${result.failed_count} items failed</p>`
                  : ""
              }
            </div>
          `,
          icon: "success",
          confirmButtonText: "OK",
          customClass: {
            popup: "bm-root rounded-xl",
            confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
          },
        });
      } else {
        Swal.fire({
          title: "Submission Failed",
          text: result.message || "Failed to submit data.",
          icon: "error",
          confirmButtonText: "OK",
          customClass: {
            popup: "bm-root rounded-xl",
            confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
          },
        });
      }
    } catch (error) {
      console.error("Batch submission error:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to connect to server.",
        icon: "error",
        confirmButtonText: "OK",
        customClass: {
          popup: "bm-root rounded-xl",
          confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
        },
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
      customClass: {
        popup: "bm-root rounded-xl",
        confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
      },
    });
  });
};

const handleDeleteAll = () => {
  if (validCheckHistory.length === 0) {
    return;
  }

  showDeleteAllModal(validCheckHistory.length, () => {
    setCheckHistory([]);
    localStorage.removeItem("scanCheckHistory");

    Swal.fire({
      title: "Deleted!",
      text: "All items have been deleted.",
      icon: "success",
      confirmButtonText: "OK",
      customClass: {
        popup: "bm-root rounded-xl",
        confirmButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
      },
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
      case "Pending Validation":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "Checked":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Submitted":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "serial_scanned":
        return <Hash className="w-3 h-3 text-green-600" />;
      case "device_detected":
        return <Camera className="w-3 h-3 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "success":
        return "Success";
      case "error":
        return "Error";
      case "device_detected":
        return "Device Detected";
      case "serial_scanned":
        return "Serial Scanned";
      case "Pending Validation":
        return "Pending Validation";
      case "Checked":
        return "Checked";
      case "Submitted":
        return "Submitted";
      default:
        return status;
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

  // Hitung data yang siap dikirim
  const readyToSubmitCount = checkHistory.filter(
    (item) => item.status === "Checked" && item.lokasi && !item.submitted,
  ).length;

  // Filter hanya item yang bukan error
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
        
        {/* Serial Scanning Modal */}
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
          {/* Header - Mengikuti style dashboard */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  IT ASSET SCANNING
                </h1>
                {/* <span className="period-badge">Real-time Detection</span> */}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Scan IT devices or materials, then scan serial numbers or barcodes,
                select locations, and submit for verification.
              </p>
            </div>
          </div>

          {/* 1. Camera / Scanner Area - Card style */}
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
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/50 animate-pulse"></div>
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-red-500/50 animate-pulse"></div>
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

            {checkHistory.some(
              (item) => item.status === "device_detected" || item.needsSerialScan,
            ) && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                <p className="text-sm text-blue-700 flex items-center">
                  <Info className="w-4 h-4 mr-2 flex-shrink-0" />
                  Some devices need serial number scanning. Click "Capture & Detect" to start serial scan.
                </p>
              </div>
            )}
          </div>

          {/* 2. Manual Input & Scan Results - Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Manual Input */}
            <div className="card p-4 sm:p-6">
              <p className="section-title flex items-center gap-2">
                <Clipboard className="w-4 h-4" /> Manual Input
              </p>
              <form
                onSubmit={handleManualCheck}
                className="space-y-3 sm:space-y-4"
              >
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

            {/* Latest Scan Result */}
            <div className="card p-4 sm:p-6">
              <p className="section-title flex items-center gap-2">
                <Eye className="w-4 h-4" /> Latest Detection Result
              </p>

              {scanResult === "loading" && (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 animate-spin text-blue-600" />
                  <p className="font-medium text-sm sm:text-base">
                    Processing detection...
                  </p>
                  <p className="text-xs sm:text-sm mt-1">
                    Analyzing image with YOLO model
                  </p>
                </div>
              )}

              {scanResult && scanResult !== "loading" && (
                <div
                  className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                    scanResult.status === "success" ||
                    scanResult.status === "serial_scanned"
                      ? "bg-green-50 border-green-500"
                      : scanResult.status === "device_detected"
                        ? "bg-blue-50 border-blue-500"
                        : "bg-red-50 border-red-500"
                  }`}
                >
                  <div
                    className={`flex items-center mb-2 sm:mb-3 ${
                      scanResult.status === "success" ||
                      scanResult.status === "serial_scanned"
                        ? "text-green-700"
                        : scanResult.status === "device_detected"
                          ? "text-blue-700"
                          : "text-red-700"
                    }`}
                  >
                    {scanResult.status === "success" ||
                    scanResult.status === "serial_scanned" ? (
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
                      <span className="font-bold text-gray-800 text-xs sm:text-sm">
                        {scanResult.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Type:</span>
                      <span className="text-gray-800">
                        {scanResult.jenisAset}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Category:</span>
                      <span className="flex items-center">
                        {getCategoryIcon(scanResult.kategori)}
                        <span className="ml-1 text-gray-800">
                          {scanResult.kategori}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Brand:</span>
                      <span className="text-gray-800 font-medium">
                        {scanResult.brand || "N/A"}
                      </span>
                    </div>
                    {scanResult.nomorSeri && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">
                          Serial Number:
                        </span>
                        <span className="font-mono text-gray-800 font-medium">
                          {scanResult.nomorSeri}
                        </span>
                      </div>
                    )}
                    {scanResult.confidencePercent &&
                      scanResult.confidencePercent !== "N/A" && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">
                            Confidence:
                          </span>
                          <span className="font-bold text-gray-800">
                            {scanResult.confidencePercent}%
                          </span>
                        </div>
                      )}
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600 mt-2 sm:mt-3 border-t pt-2 sm:pt-3">
                    {scanResult.message}
                  </p>
                </div>
              )}

              {!scanResult && scanResult !== "loading" && (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <Camera className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-gray-400" />
                  <p className="font-medium text-sm sm:text-base">
                    No detection results yet
                  </p>
                  <p className="text-xs sm:text-sm mt-1">
                    Use the Camera Capture to detect devices
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Recent Inspection History */}
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
                  {/* Tombol Set Location for All */}
                  <button
                    onClick={handleSetLocationForAll}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
                    title="Set Location for All Items"
                    disabled={
                      validCheckHistory.length === 0 || isLoadingLocations
                    }
                  >
                    {isLoadingLocations ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <MapPin className="w-3 h-3 mr-1" />
                    )}
                    Set Location
                  </button>

                  {/* Tombol Delete All */}
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
                <p className="font-medium text-sm sm:text-base">
                  No detection history yet
                </p>
                <p className="text-xs sm:text-sm mt-1">
                  Use the camera scanner or manual input to start
                </p>
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50">
                        {[
                          "Asset ID",
                          "Type",
                          "Category",
                          "Brand",
                          "Confidence",
                          "Serial Number",
                          "Location",
                          "Status",
                          "Date",
                          "Time",
                          "Action",
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
                      {validCheckHistory.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-100 hover:bg-gray-50 text-gray-800"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                {getCategoryIcon(item.kategori)}
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">
                                {item.id}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {item.jenisAset}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full font-semibold ${
                                item.kategori === "Perangkat"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {item.kategori === "Perangkat" ? "Device" : "Material"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            <span className="font-medium text-gray-500">
                              {item.brand || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full font-semibold ${
                                item.confidencePercent >= 80
                                  ? "bg-green-100 text-green-700"
                                  : item.confidencePercent >= 60
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {item.confidencePercent || "N/A"}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {item.nomorSeri ? (
                              <span className="font-mono text-gray-500 text-xs">
                                {item.nomorSeri}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleScanSerialFromHistory(item)}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center hover:underline cursor-pointer"
                                title="Click to scan serial number"
                              >
                                <ScanLine className="w-3 h-3 mr-1" />
                                <span>Scan Serial</span>
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {item.lokasiLabel || item.lokasi ? (
                              <div
                                className="max-w-[120px] truncate"
                                title={item.lokasiLabel || item.lokasi}
                              >
                                {item.lokasiLabel || item.lokasi}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSetLocationForItem(item)}
                                className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center hover:underline"
                              >
                                <MapPin className="w-3 h-3 mr-1" />
                                Set Location
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full font-semibold border ${getStatusColor(
                                item.status,
                              )}`}
                            >
                              {getStatusText(item.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-600">
                              {item.tanggal}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-400">
                              {item.waktu}
                            </div>
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

                {/* Mobile & Tablet View */}
                <div className="md:hidden space-y-3">
                  {validCheckHistory.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                            {getCategoryIcon(item.kategori)}
                          </div>
                          <div className="font-bold text-sm text-gray-900">
                            {item.id}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-semibold border ${getStatusColor(
                              item.status,
                            )}`}
                          >
                            {getStatusText(item.status)}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Type:</span>{" "}
                          <span className="text-gray-500">{item.jenisAset}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">
                            Category:
                          </span>
                          <span
                            className={`px-1 rounded text-xs ${
                              item.kategori === "Perangkat"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {item.kategori === "Perangkat" ? "Device" : "Material"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">
                            Brand:
                          </span>
                          <span className="text-gray-500 font-medium">
                            {item.brand || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">
                            Confidence:
                          </span>
                          <span className="font-bold text-gray-500">
                            {item.confidencePercent}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">
                            Serial:
                          </span>
                          {item.nomorSeri ? (
                            <span className="font-mono text-gray-500 text-xs">
                              {item.nomorSeri}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleScanSerialFromHistory(item)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center hover:underline cursor-pointer"
                              title="Click to scan serial number"
                            >
                              <ScanLine className="w-3 h-3 mr-1" />
                              <span>Scan</span>
                            </button>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">
                            Location:
                          </span>
                          {item.lokasiLabel || item.lokasi ? (
                            <span className="text-gray-500 text-right max-w-[120px] truncate">
                              {item.lokasiLabel || item.lokasi}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetLocationForItem(item)}
                              className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center hover:underline"
                            >
                              <MapPin className="w-3 h-3 mr-1" />
                              Set
                            </button>
                          )}
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
                            className="flex-1 flex items-center justify-center px-2 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition disabled:opacity-50"
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

                {/* Submit All Button */}
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