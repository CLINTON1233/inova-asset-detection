"use client";

import { X, Camera, Barcode, Loader2, CheckCircle, Search, MapPin, AlertTriangle, Trash2, Send } from "lucide-react";
import Swal from "sweetalert2";

// ============================================
// MODAL 1: Delete Single Item Confirmation
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
// MODAL 2: Delete All Items Confirmation
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
// MODAL 3: Submit Single Item
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
// MODAL 4: Submit All Items
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

