// components/FullscreenCamera.js
"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

export default function FullscreenCamera({ 
  isOpen, 
  onClose, 
  onDetect,
  mode = "device", // "device" atau "serial"
  sessionData = null 
}) {
  const videoRef = useRef(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const streamRef = useRef(null);
  const hasDetectedRef = useRef(false);

  // Inisialisasi kamera
  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false,
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        
        setCameraError(null);
        hasDetectedRef.current = false;
        
      } catch (err) {
        console.error("Failed to access camera:", err);
        setCameraError(
          "Unable to access the camera. Please make sure camera permissions are granted."
        );
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  // Fungsi untuk menangkap dan mendeteksi (hanya sekali)
  const captureAndDetect = async () => {
    // Prevent multiple detections
    if (isDetecting || hasDetectedRef.current || !videoRef.current) return;

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

      // Konversi ke base64
      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      // Panggil API sesuai mode
      const endpoint = mode === "device" 
        ? "http://localhost:5001/api/detect/camera"
        : "http://localhost:5001/api/serial/detect/camera";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data: imageData }),
      });

      const result = await response.json();

      if (result.success) {
        if (mode === "device" && result.detected_items?.length > 0) {
          // Device detected - ambil item pertama saja
          const detectedItem = result.detected_items[0];
          
          // Validasi dengan session jika ada
          if (sessionData) {
            const detectedAssetType = detectedItem.asset_type?.toLowerCase() || "";
            const detectedCategory = detectedItem.category || "";
            
            const matchingItems = sessionData.items.filter(item => {
              const itemName = item.item_name?.toLowerCase() || "";
              return itemName.includes(detectedAssetType) || 
                     detectedAssetType.includes(itemName) ||
                     (detectedCategory === "Perangkat" && itemName.includes("laptop")) ||
                     (detectedCategory === "Perangkat" && itemName.includes("pc")) ||
                     (detectedCategory === "Perangkat" && itemName.includes("komputer")) ||
                     (detectedCategory === "Perangkat" && itemName.includes("monitor")) ||
                     (detectedCategory === "Material" && itemName.includes("kabel"));
            });
            
            if (matchingItems.length === 0) {
              // Tidak sesuai dengan session - tampilkan SweetAlert di sini
              Swal.fire({
                title: "Item Tidak Sesuai!",
                html: `
                  <div class="text-center">
                    <div class="mx-auto mb-3 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>
                    </div>
                    <p class="text-lg font-semibold text-gray-800 mb-2">Detected: ${detectedItem.asset_type}</p>
                    <p class="text-sm text-gray-600">Item yang discan tidak sesuai dengan session ini.</p>
                    <div class="mt-4 p-3 bg-gray-100 rounded-lg text-left">
                      <p class="text-xs font-semibold text-gray-700 mb-2">Items in this session:</p>
                      <ul class="text-xs text-gray-600 space-y-1">
                        ${sessionData.items.map(item => `<li>• ${item.item_name} (${item.brand || 'No brand'})</li>`).join('')}
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
                }
              });
              return;
            }
          }
          
          // Callback ke parent dengan hasil deteksi
          onDetect({
            type: "device",
            data: detectedItem,
            result: result
          });
          
          // Tutup kamera setelah deteksi berhasil
          setTimeout(() => {
            onClose();
          }, 500);

        } else if (mode === "serial" && result.serial_detections?.length > 0) {
          // Valid serials only - ambil yang valid pertama
          const validSerials = result.serial_detections.filter(s => s.is_valid);
          
          if (validSerials.length > 0) {
            const bestSerial = validSerials[0];
            
            // Callback ke parent
            onDetect({
              type: "serial",
              data: bestSerial,
              result: result
            });
            
            // Tutup kamera setelah deteksi berhasil
            setTimeout(() => {
              onClose();
            }, 500);
            
          } else {
            // Tidak ada serial valid
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
              }
            });
          }
        } else {
          // Tidak ada yang terdeteksi
          Swal.fire({
            title: "No Detection",
            text: mode === "device" ? "No device detected. Please try again." : "No serial number detected. Please try again.",
            icon: "info",
            confirmButtonText: "Try Again",
            customClass: {
              popup: "rounded-xl",
              confirmButton: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
            },
            didClose: () => {
              setIsDetecting(false);
              hasDetectedRef.current = false;
            }
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
          }
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
        }
      });
    }
  };

  // Fungsi untuk ganti kamera
  const toggleCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
    
    // Stop stream lama
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    hasDetectedRef.current = false;
    setIsDetecting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/70 transition"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-white font-medium bg-black/30 backdrop-blur px-4 py-2 rounded-full">
          {mode === "device" ? "Scan Device" : "Scan Serial Number"}
        </div>
        
        <button
          onClick={toggleCamera}
          className="w-10 h-10 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/70 transition"
        >
          <Camera className="w-5 h-5" />
        </button>
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
        
        {/* Overlay Bounding Box */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[80%] h-[60%]">
            {/* Border detector */}
            <div className="absolute inset-0 border-4 border-dashed border-blue-400/70 rounded-2xl"></div>
            
            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
          </div>
        </div>

        {/* Loading Indicator */}
        {isDetecting && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-white text-lg font-medium">Detecting...</p>
            </div>
          </div>
        )}

        {/* Camera Error */}
        {cameraError && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6">
            <div className="text-center text-white">
              <div className="mx-auto mb-4 w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <p className="text-lg font-medium mb-2">Camera Error</p>
              <p className="text-sm text-gray-300">{cameraError}</p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-blue-600 rounded-full text-white font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Capture Button */}
      {!isDetecting && !cameraError && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <button
            onClick={captureAndDetect}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-24 left-0 right-0 text-center">
        <p className="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
          <Camera className="w-4 h-4 inline mr-1" />
          {mode === "device" 
            ? "Tekan tombol kamera untuk mendeteksi device" 
            : "Tekan tombol kamera untuk mendeteksi serial number"}
        </p>
      </div>
    </div>
  );
}