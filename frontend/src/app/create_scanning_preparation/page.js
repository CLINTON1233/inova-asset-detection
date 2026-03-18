"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LayoutDashboard from "../components/LayoutDashboard";
import {
  Save,
  Plus,
  Trash2,
  Package,
  Info,
  RotateCcw,
  MapPin,
  FileText,
  Box,
  Loader2,
  Building2,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Swal from "sweetalert2";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";

export default function ScanningPreparationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [checkingNumber, setCheckingNumber] = useState("");
  const [expandedItems, setExpandedItems] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    checking_name: "",
    category_id: "",
    location_id: "",
    checking_date: new Date().toISOString().split("T")[0],
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
      departments: [],
    },
  ]);

  useEffect(() => {
    setMounted(true);
    fetchCategories();
    fetchLocations();
    fetchDepartments();
    generateCheckingNumber();
  }, []);

  const generateCheckingNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCheckingNumber(`SCAN-${year}${month}${day}-${random}`);
  };

  const fetchCategories = async () => {
    try {
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
      if (data.success) {
        const locationData = data.locations || data.data || [];
        setLocations(locationData);
      } else {
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

  const fetchDepartments = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.DEPARTMENTS_ALL);
      const data = await response.json();
      if (data.success) {
        const uniqueDepts = data.departments.reduce((acc, current) => {
          const exists = acc.find(item => item.id_department === current.id_department);
          if (!exists) { acc.push(current); }
          return acc;
        }, []);
        console.log("Unique departments:", uniqueDepts);
        setDepartments(uniqueDepts);
      } else {
        setDepartments([
          { id_department: 1, department_name: "IT" },
          { id_department: 2, department_name: "HR" },
          { id_department: 3, department_name: "Finance" },
          { id_department: 4, department_name: "Contract" },
          { id_department: 5, department_name: "Procurement" },
          { id_department: 6, department_name: "Marketing" },
          { id_department: 7, department_name: "Engineering" },
          { id_department: 8, department_name: "HSE" },
          { id_department: 9, department_name: "Security & IYM" },
          { id_department: 10, department_name: "Planning" },
          { id_department: 11, department_name: "Warehouse" },
          { id_department: 12, department_name: "Work & Shipwright" },
          { id_department: 13, department_name: "Structure" },
          { id_department: 14, department_name: "Piping" },
          { id_department: 15, department_name: "E & I" },
          { id_department: 16, department_name: "Machinery" },
          { id_department: 17, department_name: "QA/QC" },
          { id_department: 18, department_name: "PMT GAMMA" },
          { id_department: 19, department_name: "PMT NEDERWIEK2" },
          { id_department: 20, department_name: "PMT FPSO PETROBRAS" },
        ]);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      setDepartments([
        { id_department: 1, department_name: "IT" },
        { id_department: 2, department_name: "HR" },
        { id_department: 3, department_name: "Finance" },
        { id_department: 4, department_name: "Contract" },
        { id_department: 5, department_name: "Procurement" },
        { id_department: 6, department_name: "Marketing" },
        { id_department: 7, department_name: "Engineering" },
        { id_department: 8, department_name: "HSE" },
        { id_department: 9, department_name: "Security & IYM" },
        { id_department: 10, department_name: "Planning" },
        { id_department: 11, department_name: "Warehouse" },
        { id_department: 12, department_name: "Work & Shipwright" },
        { id_department: 13, department_name: "Structure" },
        { id_department: 14, department_name: "Piping" },
        { id_department: 15, department_name: "E & I" },
        { id_department: 16, department_name: "Machinery" },
        { id_department: 17, department_name: "QA/QC" },
        { id_department: 18, department_name: "PMT GAMMA" },
        { id_department: 19, department_name: "PMT NEDERWIEK2" },
        { id_department: 20, department_name: "PMT FPSO PETROBRAS" },
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
        departments: [],
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
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const toggleDepartmentSection = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const updateDepartmentQuantity = (itemId, departmentId, quantity) => {
    const department = departments.find((d) => d.id_department === departmentId);
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newQuantity = parseInt(quantity) || 0;
    const currentTotal = item.departments.reduce(
      (sum, d) => (d.department_id === departmentId ? sum : sum + d.quantity),
      0
    );

    if (currentTotal + newQuantity > item.quantity) {
      const maxAllowed = item.quantity - currentTotal;
      if (newQuantity > maxAllowed) {
        setItems((prev) =>
          prev.map((i) => {
            if (i.id === itemId) {
              const existingDept = i.departments.find((d) => d.department_id === departmentId);
              if (existingDept) {
                return {
                  ...i,
                  departments: i.departments.map((d) =>
                    d.department_id === departmentId ? { ...d, quantity: maxAllowed } : d
                  ),
                };
              } else if (maxAllowed > 0) {
                return {
                  ...i,
                  departments: [
                    ...i.departments,
                    { department_id: departmentId, department_name: department.department_name, quantity: maxAllowed },
                  ],
                };
              }
            }
            return i;
          })
        );
        return;
      }
    }

    if (newQuantity > 0) {
      setItems((prev) =>
        prev.map((i) => {
          if (i.id === itemId) {
            const existingDept = i.departments.find((d) => d.department_id === departmentId);
            if (existingDept) {
              return {
                ...i,
                departments: i.departments.map((d) =>
                  d.department_id === departmentId ? { ...d, quantity: newQuantity } : d
                ),
              };
            } else {
              return {
                ...i,
                departments: [
                  ...i.departments,
                  { department_id: departmentId, department_name: department.department_name, quantity: newQuantity },
                ],
              };
            }
          }
          return i;
        })
      );
    } else {
      setItems((prev) =>
        prev.map((i) => {
          if (i.id === itemId) {
            return { ...i, departments: i.departments.filter((d) => d.department_id !== departmentId) };
          }
          return i;
        })
      );
    }
  };

  const isDepartmentInputDisabled = (item, departmentId) => {
    const totalAssigned = item.departments.reduce((sum, d) => sum + d.quantity, 0);
    const currentDept = item.departments.find((d) => d.department_id === departmentId);
    return totalAssigned >= item.quantity && !currentDept;
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.checking_name) errors.push("Checking name is required");
    if (!formData.category_id) errors.push("Category is required");
    if (!formData.location_id) errors.push("Location is required");
    if (!formData.checking_date) errors.push("Checking date is required");
    items.forEach((item, index) => {
      if (!item.item_name) errors.push(`Item #${index + 1}: Item name is required`);
      if (!item.quantity || item.quantity < 1) errors.push(`Item #${index + 1}: Quantity must be at least 1`);
      if (item.departments.length > 0) {
        const totalDeptQty = item.departments.reduce((sum, d) => sum + d.quantity, 0);
        if (totalDeptQty > item.quantity) {
          errors.push(`Item #${index + 1}: Total department quantity (${totalDeptQty}) exceeds item quantity (${item.quantity})`);
        }
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
          departments: item.departments.map((d) => ({
            department_id: d.department_id,
            quantity: d.quantity,
          })),
        })),
        user_id: 1,
      };

      const response = await fetch(API_ENDPOINTS.SCANNING_PREP_CREATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          showConfirmButton: false,
        });
        router.push(`/scanning?prep_id=${data.preparation_id}`);
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
          checking_date: new Date().toISOString().split("T")[0],
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
            departments: [],
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
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </LayoutDashboard>
    );
  }

  return (
    <LayoutDashboard activeMenu={1}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .bm-root { font-family: 'DM Sans', sans-serif; }

        /* Raised card — same as dashboard .card */
        .form-card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          transition: box-shadow 0.2s ease;
          overflow: hidden;
        }

        .section-title { font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Root — no bg, no min-h-screen; inherits gray-100 from LayoutDashboard */}
      <div className="bm-root space-y-5">

        {/* ── Header (outside card, same as other pages) ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Scanning Preparation</h1>
            </div>
            <p className="text-sm text-gray-500">Prepare your scanning session before starting check</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
            {checkingNumber}
          </span>
        </div>

        {/* ── Main Form Card ── */}
        <div className="form-card">

          {/* Card Header */}
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800 leading-tight">Session Details</h2>
                <p className="text-xs text-gray-400 leading-tight mt-0.5">Fill in the information below to create a new scanning session</p>
              </div>
            </div>
          </div>

          {/* Form Content — structure UNCHANGED */}
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
                  placeholder="e.g. IT Asset Inventory"
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
                <Label required>Location Check</Label>
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

            {/* Items List — UNCHANGED */}
            <div className="space-y-4">
              {items.map((item, index) => {
                const totalDeptQty = item.departments.reduce((sum, d) => sum + d.quantity, 0);
                const remainingQty = item.quantity - totalDeptQty;
                const isExpanded = expandedItems[item.id];

                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-white">
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

                      {/* Department Distribution — UNCHANGED */}
                      <div className="col-span-1 md:col-span-2 lg:col-span-4">
                        <div className="flex items-center justify-between mt-2">
                          <Label>Department Distribution</Label>
                          <button
                            onClick={() => toggleDepartmentSection(item.id)}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                              isExpanded
                                ? "bg-gray-100 text-gray-700 border border-gray-300"
                                : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                            }`}
                          >
                            {isExpanded ? "Close Distribution" : "Distribute Items"}
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {departments.map((dept) => {
                                const assignedDept = item.departments.find((d) => d.department_id === dept.id_department);
                                const assignedQty = assignedDept?.quantity || 0;
                                const isDisabled = isDepartmentInputDisabled(item, dept.id_department);
                                return (
                                  <div key={dept.id_department} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-700 truncate">{dept.department_name}</p>
                                      {assignedQty > 0 && (
                                        <p className="text-xs text-blue-600 mt-0.5">Assigned: {assignedQty}</p>
                                      )}
                                    </div>
                                    <div className="w-24 ml-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max={item.quantity}
                                        value={assignedQty}
                                        onChange={(e) => updateDepartmentQuantity(item.id, dept.id_department, e.target.value)}
                                        disabled={isDisabled}
                                        className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                                          isDisabled
                                            ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                                            : "bg-white border-gray-200 text-gray-800"
                                        }`}
                                        placeholder="Qty"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="p-3 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Distribution Summary:</span>
                                <span className={`text-sm font-semibold ${
                                  totalDeptQty === item.quantity ? "text-green-600"
                                  : totalDeptQty > 0 ? "text-blue-600"
                                  : "text-gray-500"
                                }`}>
                                  {totalDeptQty} of {item.quantity} assigned
                                </span>
                              </div>
                              {remainingQty > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {remainingQty} unassigned items will stay at main location
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {!isExpanded && item.departments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.departments.map((dept) => (
                              <div key={dept.department_id} className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full border border-gray-200">
                                <Users className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-700">{dept.department_name}</span>
                                <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full">{dept.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                      <span className="ml-2 font-bold">{items.reduce((sum, item) => sum + (item.quantity || 1), 0)}</span>
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
          <div className="border-t border-gray-100 px-6 py-5 bg-gray-50 rounded-b-2xl">
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
    </LayoutDashboard>
  );
}