"use client";

import { X, Camera, Barcode, Loader2, CheckCircle, Search, MapPin, AlertTriangle, Trash2, Send } from "lucide-react";
import Swal from "sweetalert2";

// ============================================
// MODAL 1: Serial Scanning Modal
// ============================================
export const SerialScanningModal = ({
  isOpen,
  onClose,
  selectedDeviceForSerial,
  serialVideoRef,
  isDetectingSerial,
  serialScanResult,
  onCapture,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Barcode className="w-5 h-5 text-blue-600" />
              Serial Number Scanning
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {selectedDeviceForSerial && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-600">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Scanning Serial for:</span>{" "}
                {selectedDeviceForSerial.jenisAset} ({selectedDeviceForSerial.brand})
              </p>
            </div>
          )}

          <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center mb-4">
            <video
              ref={serialVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            ></video>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3/4 h-3/4 border-2 border-dashed border-yellow-400 rounded-lg"></div>
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-yellow-500/70 animate-pulse"></div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4 text-center">
            <Barcode className="w-4 h-4 inline mr-1" />
            Position camera close to the serial number sticker/barcode
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCapture}
              disabled={isDetectingSerial}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDetectingSerial ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Detecting Serial...
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 mr-2" />
                  Capture Serial Number
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-4 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>

          {serialScanResult && serialScanResult !== "loading" && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                serialScanResult.status === "success"
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {serialScanResult.status === "success" ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
                <p
                  className={`font-semibold ${
                    serialScanResult.status === "success"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {serialScanResult.status === "success"
                    ? "Serial Detected Successfully"
                    : "Detection Failed"}
                </p>
              </div>
              
              {serialScanResult.serialNumber && (
                <p className="text-lg font-mono text-blue-600 mt-1 font-bold">
                  {serialScanResult.serialNumber}
                </p>
              )}
              {serialScanResult.message && (
                <p className="text-sm text-gray-600 mt-1">
                  {serialScanResult.message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MODAL 2: Device Selection Modal (untuk serial scan)
// ============================================
export const showDeviceSelectionModal = (devices, onConfirm) => {
  const deviceOptions = devices
    .map(
      (device) =>
        `<option value="${device.id}">${device.jenisAset} (${device.brand}) - ${device.id}</option>`,
    )
    .join("");

  Swal.fire({
    title: "Select Device for Serial Scan",
    html: `
      <div class="text-left space-y-4 font-sans">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Select which device to scan serial number:
          </label>
          <select 
            id="deviceSelect" 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            ${deviceOptions}
          </select>
        </div>
        <p class="text-sm text-gray-600">
          <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Position the camera close to the serial number sticker/barcode
        </p>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Start Serial Scan",
    cancelButtonText: "Cancel",
    customClass: {
      popup: "bm-root rounded-xl",
      confirmButton:
        "px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg",
      cancelButton:
        "px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg",
    },
    preConfirm: () => {
      const select = document.getElementById("deviceSelect");
      const deviceId = select.value;
      const selectedDevice = devices.find((d) => d.id === deviceId);

      if (!deviceId) {
        Swal.showValidationMessage("Please select a device");
        return false;
      }
      return selectedDevice;
    },
  }).then((result) => {
    if (result.isConfirmed) {
      onConfirm(result.value);
    }
  });
};

// ============================================
// MODAL 3: Set Location for All Items
// ============================================
export const showSetLocationForAllModal = async ({
  locations,
  filteredLocations,
  locationSearch,
  validCheckHistory,
  selectedLocation,
  setLocationSearch,
  setFilteredLocations,
  onConfirm
}) => {
  const result = await Swal.fire({
    title: "Set Location Scanning for All Items",
    html: `
      <div class="text-left font-sans">
        <div class="mb-3">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Select Location (Type to search):
          </label>
          <div class="relative">
            <input 
              id="locationSearchInput"
              type="text" 
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mb-2"
              placeholder="Type to search locations..."
              value="${locationSearch}"
            />
            <div class="absolute right-2 top-2">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
          <select 
            id="locationSelectAll"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm h-48 overflow-y-auto"
            size="8"
          >
            ${filteredLocations
              .map(
                (loc) =>
                  `<option value="${loc.value}" ${selectedLocation === loc.value ? "selected" : ""}>
                ${loc.label}
              </option>`,
              )
              .join("")}
            ${
              filteredLocations.length === 0
                ? '<option value="" disabled>No locations found</option>'
                : ""
            }
          </select>
        </div>
        <p class="text-xs text-gray-500">
          This will set the same location for all ${validCheckHistory.length} items.
        </p>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Set Location",
    cancelButtonText: "Cancel",
    customClass: {
      title: "text-lg font-semibold",
      popup: "bm-root rounded-xl",
      confirmButton:
        "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg",
      cancelButton:
        "px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg",
    },
    didOpen: () => {
      const searchInput = document.getElementById("locationSearchInput");
      const select = document.getElementById("locationSelectAll");

      searchInput.focus();

      searchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        setLocationSearch(searchTerm);

        const filtered = locations.filter(
          (loc) =>
            loc.label.toLowerCase().includes(searchTerm) ||
            loc.fullData.area.toLowerCase().includes(searchTerm) ||
            loc.value.toLowerCase().includes(searchTerm),
        );

        setFilteredLocations(filtered);

        select.innerHTML = `
          <option value="">-- Select Location --</option>
          ${filtered
            .map((loc) => `<option value="${loc.value}">${loc.label}</option>`)
            .join("")}
          ${
            filtered.length === 0
              ? '<option value="" disabled>No locations found</option>'
              : ""
          }
        `;
      });
    },
    preConfirm: () => {
      const select = document.getElementById("locationSelectAll");
      const locationValue = select.value;

      if (!locationValue) {
        Swal.showValidationMessage("Please select a location");
        return false;
      }

      const selected = locations.find((loc) => loc.value === locationValue);
      return { value: locationValue, label: selected?.label || "" };
    },
  });

  if (result.isConfirmed) {
    onConfirm(result.value);
  }
};

// ============================================
// MODAL 4: Set Location for Single Item
// ============================================
export const showSetLocationForItemModal = async ({
  item,
  locations,
  filteredLocations,
  locationSearch,
  setLocationSearch,
  setFilteredLocations,
  onConfirm
}) => {
  const result = await Swal.fire({
    title: "<div class='text-lg'>Set Location for Item</div>",
    html: `
      <div class="text-left font-sans">
        <div class="mb-2">
          <p class="text-sm text-gray-600">Device: <strong>${item.jenisAset}</strong></p>
          <p class="text-sm text-gray-600">Asset ID: <strong>${item.id}</strong></p>
        </div>
        <div class="mb-3">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Select Location (Type to search):
          </label>
          <div class="relative">
            <input 
              id="locationSearchInputItem"
              type="text" 
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mb-2"
              placeholder="Type to search locations..."
              value="${locationSearch}"
            />
            <div class="absolute right-2 top-2">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
          <select 
            id="locationSelectItem"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm h-48 overflow-y-auto"
            size="8"
          >
            <option value="">-- Select Location --</option>
            ${filteredLocations
              .map(
                (loc) =>
                  `<option value="${loc.value}" ${item.lokasi === loc.value ? "selected" : ""}>
                ${loc.label}
              </option>`,
              )
              .join("")}
            ${
              filteredLocations.length === 0
                ? '<option value="" disabled>No locations found</option>'
                : ""
            }
          </select>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Set Location",
    cancelButtonText: "Cancel",
    customClass: {
      popup: "bm-root rounded-xl",
      title: "text-lg font-semibold mb-2",
      confirmButton:
        "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg",
      cancelButton:
        "px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg",
    },
    didOpen: () => {
      const searchInput = document.getElementById("locationSearchInputItem");
      const select = document.getElementById("locationSelectItem");

      searchInput.focus();

      searchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        setLocationSearch(searchTerm);

        const filtered = locations.filter(
          (loc) =>
            loc.label.toLowerCase().includes(searchTerm) ||
            loc.fullData.area.toLowerCase().includes(searchTerm) ||
            loc.value.toLowerCase().includes(searchTerm),
        );

        setFilteredLocations(filtered);

        select.innerHTML = `
          <option value="">-- Select Location --</option>
          ${filtered
            .map((loc) => `<option value="${loc.value}">${loc.label}</option>`)
            .join("")}
          ${
            filtered.length === 0
              ? '<option value="" disabled>No locations found</option>'
              : ""
          }
        `;
      });
    },
    preConfirm: () => {
      const select = document.getElementById("locationSelectItem");
      const locationValue = select.value;

      if (!locationValue) {
        Swal.showValidationMessage("Please select a location");
        return false;
      }

      const selected = locations.find((loc) => loc.value === locationValue);
      return { value: locationValue, label: selected?.label || "" };
    },
  });

  if (result.isConfirmed) {
    onConfirm(result.value);
  }
};

// ============================================
// MODAL 5: Delete Single Item Confirmation
// ============================================
export const showDeleteItemModal = (item, onConfirm) => {
  Swal.fire({
    title: "Delete Item?",
    text: `Are you sure you want to delete "${item.jenisAset} (${item.id})"?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#ef4444",
    customClass: {
      popup: "bm-root rounded-xl",
      confirmButton: "px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg",
      cancelButton: "px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      onConfirm();
    }
  });
};

// ============================================
// MODAL 6: Delete All Items Confirmation
// ============================================
export const showDeleteAllModal = (count, onConfirm) => {
  Swal.fire({
    title: "Delete All Items?",
    html: `
      <div class="text-center font-sans">
        <p class="text-lg font-semibold text-gray-600">This will delete all ${count} items!</p>
        <p class="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
      </div>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Delete All",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#ef4444",
    customClass: {
      popup: "bm-root rounded-xl",
      confirmButton: "px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg",
      cancelButton: "px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      onConfirm();
    }
  });
};

// ============================================
// MODAL 7: Submit Single Item
// ============================================
export const showSubmitSingleModal = (item, onConfirm) => {
  Swal.fire({
    title: "Submit Item?",
    html: `
      <div class="text-center font-sans">
        <p class="mb-3">Are you sure you want to submit:</p>
        <div class="bg-gray-50 p-3 rounded-lg text-left">
          <p class="text-sm"><span class="font-medium">Asset ID:</span> ${item.id}</p>
          <p class="text-sm"><span class="font-medium">Type:</span> ${item.jenisAset}</p>
          <p class="text-sm"><span class="font-medium">Location:</span> ${item.lokasiLabel || item.lokasi}</p>
        </div>
      </div>
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Yes, Submit",
    cancelButtonText: "Cancel",
    customClass: {
      popup: "bm-root rounded-xl",
      confirmButton: "px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg",
      cancelButton: "px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      onConfirm();
    }
  });
};

// ============================================
// MODAL 8: Submit All Items
// ============================================
export const showSubmitAllModal = (itemsToSubmit, onConfirm) => {
  Swal.fire({
    title: "Submit All Items?",
    html: `
      <div class="text-center font-sans">
        <p class="mb-3">You are about to submit <strong>${itemsToSubmit.length}</strong> items.</p>
        <div class="text-left max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-lg">
          ${itemsToSubmit
            .slice(0, 5)
            .map(
              (item) =>
                `<p class="text-xs text-gray-600">• ${item.jenisAset} - ${item.id}</p>`,
            )
            .join("")}
          ${itemsToSubmit.length > 5 ? `<p class="text-xs text-gray-500">... and ${itemsToSubmit.length - 5} more</p>` : ""}
        </div>
      </div>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Submit All",
    cancelButtonText: "Cancel",
    customClass: {
      popup: "bm-root rounded-xl",
      confirmButton: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg",
      cancelButton: "px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      onConfirm();
    }
  });
};

// ============================================
// MODAL 9: Success Detection Modal (setelah camera capture)
// ============================================
export const showSuccessDetectionModal = (result, detectedItems, onScanSerial) => {
  Swal.fire({
    title: "Success!",
    html: `
      <div class="text-center font-sans">
        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <p class="text-lg font-semibold text-gray-900">Detected ${result.total_detected} device(s)</p>
        <div class="mt-3 space-y-1">
          ${detectedItems
            .map(
              (item) =>
                `<p class="text-sm text-gray-600">• ${item.jenisAset} (${item.brand}) - ${item.confidencePercent}%</p>`,
            )
            .join("")}
        </div>
        <p class="text-sm text-blue-600 mt-4">Do you want to scan serial numbers?</p>
      </div>
    `,
    icon: "success",
    showCancelButton: true,
    confirmButtonText: "Scan Serial Numbers",
    cancelButtonText: "Skip for Now",
    customClass: {
      popup: "bm-root rounded-2xl",
      confirmButton:
        "px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg",
      cancelButton:
        "px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg",
    },
  }).then((dialogResult) => {
    if (dialogResult.isConfirmed) {
      onScanSerial(detectedItems);
    }
  });
};

// ============================================
// MODAL 10: Serial Number Detected Success Modal
// ============================================
export const showSerialDetectedModal = (bestSerial, selectedDeviceForSerial, result, onContinue, onScanAnother) => {
  Swal.fire({
    title: "Serial Number Detected!",
    html: `
      <div class="text-center space-y-3 font-sans">
        <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <p class="text-sm text-gray-500 mb-1">Detected Serial Number:</p>
          <p class="text-xl font-bold text-gray-900 font-mono tracking-wider">
            ${bestSerial.detected_text}
          </p>
          
          <div class="mt-4 space-y-2 text-sm text-gray-600">
            <div class="flex justify-between">
              <span>Device:</span>
              <span class="font-semibold">${selectedDeviceForSerial.jenisAset}</span>
            </div>
            <div class="flex justify-between">
              <span>Brand:</span>
              <span class="font-semibold">${bestSerial.brand_info || selectedDeviceForSerial.brand}</span>
            </div>
            <div class="flex justify-between">
              <span>Confidence:</span>
              <span class="font-semibold">${(bestSerial.confidence * 100).toFixed(1)}%</span>
            </div>
            <div class="flex justify-between">
              <span>Processing Time:</span>
              <span class="font-semibold">${result.processing_time_ms || "N/A"}ms</span>
            </div>
          </div>
        </div>
        
        <p class="text-sm text-gray-500">
          Serial number has been saved to device record.
        </p>
      </div>
    `,
    icon: "success",
    confirmButtonText: "Continue",
    showCancelButton: true,
    cancelButtonText: "Scan Another",
    customClass: {
      popup: "bm-root rounded-2xl",
      title: "text-lg font-semibold mb-1",
      icon: "mt-2 mb-2", 
      confirmButton:
        "px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg",
      cancelButton:
        "px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      onContinue();
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      onScanAnother();
    }
  });
};

// ============================================
// MODAL 11: Manual Processing Success Modal
// ============================================
export const showManualProcessingSuccessModal = (result, onClose) => {
  Swal.fire({
    title: "Manual Processing Successful!",
    html: `
      <div class="text-center font-sans">
        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
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
    onClose();
  });
};