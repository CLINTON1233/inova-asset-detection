"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera } from "lucide-react";
import Swal from "sweetalert2";
import { API_ENDPOINTS } from "@/config/api";

export default function FullscreenCamera({
  isOpen,
  onClose,
  onDetect,
  mode = "device",
  sessionData = null,
}) {
  const videoRef = useRef(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const streamRef = useRef(null);
  const hasDetectedRef = useRef(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const getAvailableCameras = async () => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      let videoDevices = devices.filter(device => device.kind === "videoinput");

      videoDevices = videoDevices.sort((a, b) => {
        const aLabel = a.label.toLowerCase();
        const bLabel = b.label.toLowerCase();

        const isAVirtual =
          aLabel.includes("droidcam") ||
          aLabel.includes("iriun") ||
          aLabel.includes("obs") ||
          aLabel.includes("virtual");

        const isBVirtual =
          bLabel.includes("droidcam") ||
          bLabel.includes("iriun") ||
          bLabel.includes("obs") ||
          bLabel.includes("virtual");

        if (isAVirtual && !isBVirtual) return 1;
        if (!isAVirtual && isBVirtual) return -1;

        const aIsBuiltIn = aLabel.includes("integrated") || aLabel.includes("webcam") || aLabel.includes("hd") || aLabel.includes("camera");
        const bIsBuiltIn = bLabel.includes("integrated") || bLabel.includes("webcam") || bLabel.includes("hd") || bLabel.includes("camera");

        if (aIsBuiltIn && !bIsBuiltIn) return -1;
        if (!aIsBuiltIn && bIsBuiltIn) return 1;

        return 0;
      });

      setAvailableCameras(videoDevices);

      if (videoDevices.length > 0) {
        console.log("Selected default camera:", videoDevices[0].label);
        setSelectedCamera(videoDevices[0].deviceId);
      }

    } catch (err) {
      console.error("Failed to get camera devices:", err);
    }
  };

  const startCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      let constraints;

      if (selectedCamera) {
        constraints = {
          video: {
            deviceId: { exact: selectedCamera },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false,
        };
      } else {
        constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(resolve).catch(resolve);
          };
        });

        setIsCameraReady(true);
      }

      setCameraError(null);
      hasDetectedRef.current = false;
    } catch (err) {
      console.error("Failed to access camera:", err);
      setCameraError(
        "Unable to access the camera. Please make sure camera permissions are granted.",
      );
      setIsCameraReady(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const init = async () => {
      await getAvailableCameras();
      await startCamera();
    };

    init();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsCameraReady(false);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedCamera) {
      startCamera();
    }
  }, [selectedCamera]);

  const captureAndDetect = async () => {
    if (isDetecting || hasDetectedRef.current || !videoRef.current || !isCameraReady) return;

    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    setIsDetecting(true);
    hasDetectedRef.current = true;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      const endpoint =
        mode === "device"
          ? API_ENDPOINTS.DETECT_CAMERA
          : API_ENDPOINTS.SERIAL_DETECT_CAMERA;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data: imageData }),
      });

      const result = await response.json();

      if (result.success) {
        if (mode === "device" && result.detected_items?.length > 0) {
          const detectedItem = result.detected_items[0];

          if (sessionData) {
            const detectedAssetType = detectedItem.asset_type?.toLowerCase() || "";
            const detectedCategory = detectedItem.category || "";

            const matchingItems = sessionData.items.filter((item) => {
              const itemName = item.item_name?.toLowerCase() || "";
              return (
                itemName.includes(detectedAssetType) ||
                detectedAssetType.includes(itemName) ||
                (detectedCategory === "Perangkat" && itemName.includes("laptop")) ||
                (detectedCategory === "Perangkat" && itemName.includes("pc")) ||
                (detectedCategory === "Perangkat" && itemName.includes("komputer")) ||
                (detectedCategory === "Perangkat" && itemName.includes("monitor")) ||
                (detectedCategory === "Material" && itemName.includes("kabel"))
              );
            });

            if (matchingItems.length === 0) {
              Swal.fire({
                title: "Item Tidak Sesuai!",
                html: `
                  <div class="text-center">
                    <div class="mx-auto mb-3 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>
                    </div>
                    <p class="text-lg font-semibold text-gray-800 mb-2">Detected: ${detectedItem.asset_type}</p>
                    <p class="text-sm text-gray-600">Item yang discan tidak sesuai dengan session ini.</p>
                    <div class="mt-4 p-3 bg-gray-100 rounded-lg text-left">
                      <p class="text-xs font-semibold text-gray-700 mb-2">Items in this session:</p>
                      <ul class="text-xs text-gray-600 space-y-1">
                        ${sessionData.items.map((item) => `<li>• ${item.item_name} (${item.brand || "No brand"})</li>`).join("")}
                      </ul>
                    </div>
                  </div>
                `,
                icon: "warning",
                confirmButtonText: "OK",
                customClass: {
                  popup: "rounded-xl",
                  confirmButton: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
                },
                didClose: () => {
                  setIsDetecting(false);
                  hasDetectedRef.current = false;
                },
              });
              return;
            }
          }

          onDetect({
            type: "device",
            data: detectedItem,
            result: result,
          });

          setTimeout(() => {
            onClose();
          }, 500);
        } else if (mode === "serial" && result.serial_detections?.length > 0) {
          const validSerials = result.serial_detections.filter(
            (s) => s.is_valid,
          );

          if (validSerials.length > 0) {
            const bestSerial = validSerials[0];

            onDetect({
              type: "serial",
              data: bestSerial,
              result: result,
            });

            setTimeout(() => {
              onClose();
            }, 500);
          } else {
            Swal.fire({
              title: "No Valid Serial",
              text: "No valid serial number detected. Please try again.",
              icon: "warning",
              confirmButtonText: "Try Again",
              customClass: {
                popup: "rounded-xl",
                confirmButton: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
              },
              didClose: () => {
                setIsDetecting(false);
                hasDetectedRef.current = false;
              },
            });
          }
        } else {
          Swal.fire({
            title: "No Detection",
            text: mode === "device"
              ? "No device detected. Please try again."
              : "No serial number detected. Please try again.",
            icon: "info",
            confirmButtonText: "Try Again",
            customClass: {
              popup: "rounded-xl",
              confirmButton: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
            },
            didClose: () => {
              setIsDetecting(false);
              hasDetectedRef.current = false;
            },
          });
        }
      } else {
        Swal.fire({
          title: "Detection Failed",
          text: result.message || "Failed to detect",
          icon: "error",
          confirmButtonText: "OK",
          customClass: {
            popup: "rounded-xl",
            confirmButton: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
          },
          didClose: () => {
            setIsDetecting(false);
            hasDetectedRef.current = false;
          },
        });
      }
    } catch (error) {
      console.error("Detection error:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to connect to server",
        icon: "error",
        confirmButtonText: "OK",
        customClass: {
          popup: "rounded-xl",
          confirmButton: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
        },
        didClose: () => {
          setIsDetecting(false);
          hasDetectedRef.current = false;
        },
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const toggleCamera = async () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    setSelectedCamera(null);
    await startCamera();
  };

  const handleCameraSelect = async (deviceId) => {
    setSelectedCamera(deviceId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={onClose}
          className="w-9 h-9 bg-black/40 hover:bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white transition-all duration-200"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-white/90 text-sm font-medium tracking-wide">
          {mode === "device" ? "Scan Device" : "Scan Serial Number"}
        </div>

        {availableCameras.length > 1 && (
          <select
            onChange={(e) => handleCameraSelect(e.target.value)}
            value={selectedCamera || ''}
            className="bg-black/40 hover:bg-black/60 backdrop-blur text-white/90 text-xs rounded-lg px-2 py-1.5 border border-white/30 focus:outline-none focus:border-blue-500 transition-all duration-200 cursor-pointer max-w-[140px] truncate"
          >
            {availableCameras.map((cam) => {
              let label = cam.label || `Camera ${cam.deviceId.slice(0, 5)}`;
              if (label.length > 20) {
                label = label.slice(0, 18) + '...';
              }
              return (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {label}
                </option>
              );
            })}
          </select>
        )}

        {availableCameras.length <= 1 && (
          <div className="w-20"></div>
        )}
      </div>

      {/* Video Preview */}
      <div className="flex-1 relative bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Scanning Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-[75%] h-[55%]">
            <div className="absolute inset-0 border-2 border-white/40 rounded-2xl"></div>
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white"></div>
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan"></div>
          </div>
        </div>

        {isDetecting && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <div className="w-14 h-14 border-3 border-white/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-white text-base font-medium tracking-wide">Mendeteksi...</p>
            </div>
          </div>
        )}

        {!isCameraReady && !cameraError && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-white/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-white text-sm tracking-wide">Menyalakan kamera...</p>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <div className="mx-auto mb-4 w-14 h-14 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  ></path>
                </svg>
              </div>
              <p className="text-lg font-medium text-white mb-2">Kamera Error</p>
              <p className="text-sm text-gray-300">{cameraError}</p>
              <button
                onClick={onClose}
                className="mt-5 px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white text-sm font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>

      {!isDetecting && !cameraError && isCameraReady && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <button
            onClick={captureAndDetect}
            className="group relative w-20 h-20 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all duration-300 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95"
          >
            <div className="w-16 h-16 rounded-full bg-blue-600 group-hover:bg-blue-500 transition-all duration-300 flex items-center justify-center">
              <Camera className="w-7 h-7 text-white" />
            </div>
          </button>
        </div>
      )}

      <div className="absolute bottom-24 left-0 right-0 text-center">
        <p className="text-white/60 text-xs tracking-wide font-normal">
          {mode === "device"
            ? "Arahkan kamera ke perangkat yang akan discan"
            : "Arahkan kamera ke barcode atau serial number"}
        </p>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
        .animate-scan {
          position: absolute;
          animation: scan 2.5s ease-in-out infinite;
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
      `}</style>
    </div>
  );
}