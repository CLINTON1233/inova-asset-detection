"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LayoutDashboard from "../components/LayoutDashboard";
import {
  Save,
  Plus,
  Trash2,
  ArrowLeft,
  Package,
  Calendar,
  Server,
  Info,
  RotateCcw,
  X,
  MapPin,
  Tag,
  Hash,
  FileText,
  Box,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";

export default function ScanningPreparationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [checkingNumber, setCheckingNumber] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    checking_name: "",
    category_id: "",
    location_id: "",
    checking_date: new Date().toISOString().split('T')[0],
    remarks: "",
  });

  // Multiple items state
  const [items, setItems] = useState([
    {
      id: `item-${Date.now()}-1`,
      item_name: "",
      brand: "",
      model: "",
      specifications: "",
      quantity: 1,
    },
  ]);

  useEffect(() => {
    setMounted(true);
    fetchCategories();
    fetchLocations();
    generateCheckingNumber();
  }, []);

  const generateCheckingNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCheckingNumber(`SCAN-${year}${month}${day}-${random}`);
  };

  const fetchCategories = async () => {
    try {
      // Sementara gunakan dummy data, nanti ganti dengan API call
      setCategories([
        { id_category: 1, category_name: "Devices" },
        { id_category: 2, category_name: "Materials" },
      ]);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

const fetchLocations = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.LOCATION_ALL);
    const data = await response.json();
    console.log("Location data:", data);
    
    if (data.success) {
      const locationData = data.locations || data.data || [];
      setLocations(locationData);
    } else {
      console.error("Failed to fetch locations:", data.error);
      setLocations([
        { id_location: 1, location_name: "Warehouse A" },
        { id_location: 2, location_name: "Office B" },
        { id_location: 3, location_name: "Data Center" },
      ]);
    }
  } catch (error) {
    console.error("Error fetching locations:", error);
    setLocations([
      { id_location: 1, location_name: "Warehouse A" },
      { id_location: 2, location_name: "Office B" },
      { id_location: 3, location_name: "Data Center" },
    ]);
  }
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addNewItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        item_name: "",
        brand: "",
        model: "",
        specifications: "",
        quantity: 1,
      },
    ]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    } else {
      Swal.fire({
        title: "Cannot Remove",
        text: "At least one item is required",
        icon: "warning",
        confirmButtonColor: "#1e40af",
      });
    }
  };

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.checking_name) errors.push("Checking name is required");
    if (!formData.category_id) errors.push("Category is required");
    if (!formData.location_id) errors.push("Location is required");
    if (!formData.checking_date) errors.push("Checking date is required");

    // Validate items
    items.forEach((item, index) => {
      if (!item.item_name) {
        errors.push(`Item #${index + 1}: Item name is required`);
      }
      if (!item.quantity || item.quantity < 1) {
        errors.push(`Item #${index + 1}: Quantity must be at least 1`);
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      Swal.fire({
        title: "Validation Error",
        html: errors.map((err) => `• ${err}`).join("<br>"),
        icon: "warning",
        confirmButtonColor: "#1e40af",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Create Scanning Preparation?",
      html: `
        <div class="text-left text-sm">
          <p><strong>Checking Number:</strong> ${checkingNumber}</p>
          <p><strong>Total Items:</strong> ${items.length}</p>
          <p><strong>Total Quantity:</strong> ${items.reduce((sum, item) => sum + (item.quantity || 1), 0)}</p>
          <p class="mt-2 text-xs text-gray-500">This will create a new scanning session</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Create",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const payload = {
        checking_name: formData.checking_name,
        category_id: parseInt(formData.category_id),
        location_id: parseInt(formData.location_id),
        checking_date: formData.checking_date,
        remarks: formData.remarks,
        items: items.map(({ id, ...item }) => ({
          ...item,
          quantity: parseInt(item.quantity) || 1,
        })),
        user_id: 1, 
      };

      const response = await fetch(API_ENDPOINTS.SCANNING_PREP_CREATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        await Swal.fire({
          title: "Success!",
          html: `
            <div class="text-center">
              <p>Scanning preparation created successfully!</p>
              <p class="font-mono text-sm bg-gray-100 p-2 rounded mt-2">${data.checking_number}</p>
            </div>
          `,
          icon: "success",
          timer: 2000,
          confirmButtonColor: "#1e40af",
        });

        router.push("/scanning");
      } else {
        throw new Error(data.error || "Failed to create preparation");
      }
    } catch (error) {
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to create scanning preparation",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    Swal.fire({
      title: "Reset Form?",
      text: "All entered data will be lost",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Reset",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
    }).then((result) => {
      if (result.isConfirmed) {
        setFormData({
          checking_name: "",
          category_id: "",
          location_id: "",
          checking_date: new Date().toISOString().split('T')[0],
          remarks: "",
        });
        setItems([
          {
            id: `item-${Date.now()}-1`,
            item_name: "",
            brand: "",
            model: "",
            specifications: "",
            quantity: 1,
          },
        ]);
        generateCheckingNumber();
      }
    });
  };

  const inputCls =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
  const selectCls =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition";

  const Label = ({ children, required }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const Hint = ({ children }) => (
    <p className="text-xs text-gray-400 mt-1">{children}</p>
  );

  const SectionDivider = ({ icon: Icon, label }) => (
    <div className="flex items-center gap-2 pt-6 pb-4 border-t border-gray-100 mt-2">
      <Icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
        {label}
      </h3>
    </div>
  );

  if (!mounted) {
    return (
      <LayoutDashboard activeMenu={2}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </LayoutDashboard>
    );
  }

  return (
    <LayoutDashboard activeMenu={2}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .bm-root { font-family: 'DM Sans', sans-serif; }
        .card { 
          background: #ffffff; 
          border-radius: 16px; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .section-title { font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="bm-root min-h-screen bg-gray-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-1.5 text-sm">
            <button
              onClick={() => router.push("/scanning")}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Scanning
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800 font-semibold">Scanning Preparation</span>
          </div>
        </div>

        <div className="px-6 py-5 pb-10">
          {/* Main Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-gray-800 leading-tight">
                      Scanning Preparation
                    </h1>
                    <p className="text-xs text-gray-400 leading-tight">
                      Prepare your scanning session before starting
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {checkingNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6">
              {/* BASIC INFORMATION */}
              <SectionDivider icon={FileText} label="Basic Information" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label required>Checking Name</Label>
                  <input
                    type="text"
                    name="checking_name"
                    value={formData.checking_name}
                    onChange={handleInputChange}
                    className={inputCls}
                    placeholder="e.g. LIST DATA ASET 16 MARET 2026"
                    required
                  />
                  <Hint>Name for this scanning session</Hint>
                </div>

                <div>
                  <Label required>Category</Label>
                  <div className="relative">
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleInputChange}
                      className={selectCls}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id_category} value={cat.id_category}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* LOCATION & DATE */}
              <SectionDivider icon={MapPin} label="Location & Date" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label required>Location</Label>
                  <div className="relative">
                    <select
                      name="location_id"
                      value={formData.location_id}
                      onChange={handleInputChange}
                      className={selectCls}
                      required
                    >
                      <option value="">Select Location</option>
                      {locations.map((loc) => (
                        <option key={loc.id_location} value={loc.id_location}>
                          {loc.location_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label required>Checking Date</Label>
                  <input
                    type="date"
                    name="checking_date"
                    value={formData.checking_date}
                    onChange={handleInputChange}
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              {/* ITEMS SECTION */}
              <SectionDivider icon={Box} label="Items to Scan" />

              {/* Items List */}
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          Item #{index + 1}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            Qty: {item.quantity}
                          </span>
                        )}
                      </div>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="col-span-1 md:col-span-2">
                        <Label required>Item Name</Label>
                        <input
                          type="text"
                          value={item.item_name}
                          onChange={(e) => updateItem(item.id, "item_name", e.target.value)}
                          className={inputCls}
                          placeholder="e.g. Laptop Dell, Ethernet Cable"
                          required
                        />
                      </div>

                      <div>
                        <Label>Brand</Label>
                        <input
                          type="text"
                          value={item.brand}
                          onChange={(e) => updateItem(item.id, "brand", e.target.value)}
                          className={inputCls}
                          placeholder="e.g. Dell, Cisco"
                        />
                      </div>

                      <div>
                        <Label>Model</Label>
                        <input
                          type="text"
                          value={item.model}
                          onChange={(e) => updateItem(item.id, "model", e.target.value)}
                          className={inputCls}
                          placeholder="e.g. Latitude 3420"
                        />
                      </div>

                      <div className="col-span-1 md:col-span-2">
                        <Label>Specifications</Label>
                        <input
                          type="text"
                          value={item.specifications}
                          onChange={(e) => updateItem(item.id, "specifications", e.target.value)}
                          className={inputCls}
                          placeholder="e.g. Intel i5, 8GB RAM, 256GB SSD"
                        />
                      </div>

                      <div>
                        <Label required>Quantity</Label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                          className={inputCls}
                          min="1"
                          required
                        />
                        <Hint>Number of items to scan</Hint>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Item Button */}
              <button
                onClick={addNewItem}
                className="mt-4 flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                Add Another Item
              </button>

              {/* REMARKS */}
              <SectionDivider icon={Info} label="Additional Information" />

              <div className="mb-6">
                <Label>Remarks</Label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows="3"
                  className={inputCls}
                  placeholder="Additional notes or instructions for this scanning session..."
                />
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    <p className="font-semibold mb-2">Scanning Session Summary:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-blue-600">Total Items:</span>
                        <span className="ml-2 font-bold">{items.length}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Total Quantity:</span>
                        <span className="ml-2 font-bold">
                          {items.reduce((sum, item) => sum + (item.quantity || 1), 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-600">Checking Number:</span>
                        <span className="ml-2 font-mono font-bold">{checkingNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="border-t border-gray-100 px-6 py-5 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  <span className="text-red-500">*</span> Required fields
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Create Preparation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutDashboard>
  );
}