"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    Users,
    ChevronDown,
    ChevronUp,
    ArrowLeft,
} from "lucide-react";
import Swal from "sweetalert2";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";

export default function EditScanningPreparationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const prepId = searchParams.get('id');

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [mounted, setMounted] = useState(false);
    const [expandedItems, setExpandedItems] = useState({});

    const [formData, setFormData] = useState({
        checking_name: "",
        category_id: "",
        location_id: "",
        checking_date: new Date().toISOString().split("T")[0],
        remarks: "",
    });

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

        if (prepId) {
            fetchPreparationData();
        } else {
            Swal.fire("Error", "No preparation ID provided", "error").then(() => {
                router.push("/scanning_preparation_list");
            });
        }
    }, [prepId]);

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
                setDepartments(uniqueDepts);
            } else {
                setDepartments([
                    { id_department: 1, department_name: "IT" },
                    { id_department: 2, department_name: "HR" },
                    { id_department: 3, department_name: "Finance" },
                ]);
            }
        } catch (error) {
            console.error("Error fetching departments:", error);
            setDepartments([]);
        }
    };

    const fetchPreparationData = async () => {
        setFetching(true);
        try {
            const response = await fetch(API_ENDPOINTS.SCANNING_PREP_DETAIL(prepId));
            const result = await response.json();

            if (result.success) {
                const data = result.data;
                setFormData({
                    checking_name: data.checking_name || "",
                    category_id: data.category_id || "",
                    location_id: data.location_id || "",
                    checking_date: data.checking_date || new Date().toISOString().split("T")[0],
                    remarks: data.remarks || "",
                });

                // Convert items from API to component format
                const formattedItems = data.items.map((item, idx) => ({
                    id: `item-${Date.now()}-${idx}`,
                    item_name: item.item_name || "",
                    brand: item.brand || "",
                    model: item.model || "",
                    specifications: item.specifications || "",
                    quantity: item.quantity || 1,
                    departments: item.departments || [],
                }));

                setItems(formattedItems);
            } else {
                throw new Error(result.error || "Failed to load preparation data");
            }
        } catch (error) {
            console.error("Error fetching preparation:", error);
            Swal.fire({
                title: "Error!",
                text: error.message || "Failed to load preparation data",
                icon: "error",
                confirmButtonColor: "#1e40af",
            }).then(() => {
                router.push("/scanning_preparation_list");
            });
        } finally {
            setFetching(false);
        }
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

    const removeItem = (itemId) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== itemId));
        } else {
            Swal.fire({
                title: "Cannot Remove",
                text: "At least one item is required",
                icon: "warning",
                confirmButtonColor: "#1e40af",
            });
        }
    };

    const updateItem = (itemId, field, value) => {
        setItems(items.map(item =>
            item.id === itemId ? { ...item, [field]: value } : item
        ));
    };

    const toggleDepartmentSection = (itemId) => {
        setExpandedItems((prev) => ({
            ...prev,
            [itemId]: !prev[itemId],
        }));
    };

    const updateDepartmentQuantity = (itemId, departmentId, quantity) => {
        const department = departments.find((d) => d.id_department === departmentId);
        const item = items.find(i => i.id === itemId);

        if (!item) return;

        const newQuantity = parseInt(quantity) || 0;
        const currentTotal = item.departments.reduce(
            (sum, d) => (d.department_id === departmentId ? sum : sum + d.quantity),
            0
        );

        if (currentTotal + newQuantity > item.quantity) {
            const maxAllowed = item.quantity - currentTotal;
            if (newQuantity > maxAllowed) {
                const existingDept = item.departments.find((d) => d.department_id === departmentId);
                if (existingDept) {
                    updateItem(itemId, "departments", item.departments.map((d) =>
                        d.department_id === departmentId ? { ...d, quantity: maxAllowed } : d
                    ));
                } else if (maxAllowed > 0) {
                    updateItem(itemId, "departments", [
                        ...item.departments,
                        { department_id: departmentId, department_name: department.department_name, quantity: maxAllowed },
                    ]);
                }
                return;
            }
        }

        if (newQuantity > 0) {
            const existingDept = item.departments.find((d) => d.department_id === departmentId);
            if (existingDept) {
                updateItem(itemId, "departments", item.departments.map((d) =>
                    d.department_id === departmentId ? { ...d, quantity: newQuantity } : d
                ));
            } else {
                updateItem(itemId, "departments", [
                    ...item.departments,
                    { department_id: departmentId, department_name: department.department_name, quantity: newQuantity },
                ]);
            }
        } else {
            updateItem(itemId, "departments", item.departments.filter((d) => d.department_id !== departmentId));
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
                    errors.push(`Item #${index + 1}: Total department quantity exceeds item quantity`);
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

        const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

        const result = await Swal.fire({
            title: "Update Scanning Preparation?",
            html: `
        <div class="text-left text-sm">
          <p><strong>Total Items:</strong> ${items.length}</p>
          <p><strong>Total Quantity:</strong> ${totalQuantity}</p>
        </div>
      `,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes, Update",
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

            const response = await fetch(API_ENDPOINTS.SCANNING_PREP_UPDATE(prepId), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.success) {
                await Swal.fire({
                    title: "Success!",
                    text: "Scanning preparation updated successfully!",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false,
                });
                router.push("/scanning_preparation_list");
            } else {
                throw new Error(data.error || "Failed to update");
            }
        } catch (error) {
            Swal.fire({
                title: "Error!",
                text: error.message || "Failed to update scanning preparation",
                icon: "error",
                confirmButtonColor: "#1e40af",
            });
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
    const selectCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition";

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

    if (!mounted || fetching) {
        return (
            <LayoutDashboard activeMenu={2}>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                </div>
            </LayoutDashboard>
        );
    }

    return (
        <LayoutDashboard activeMenu={1}>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/scanning_preparation_list")}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Package className="w-5 h-5 text-blue-600" />
                                <h1 className="text-xl font-bold text-gray-900">Edit Scanning Preparation</h1>
                            </div>
                            <p className="text-sm text-gray-500">Update preparation ID: {prepId}</p>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6">
                        {/* Basic Information */}
                        <SectionDivider icon={FileText} label="Basic Information" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <Label required>Checking Name</Label>
                                <input
                                    type="text"
                                    value={formData.checking_name}
                                    onChange={(e) => setFormData({ ...formData, checking_name: e.target.value })}
                                    className={inputCls}
                                    placeholder="e.g. IT Asset Inventory"
                                />
                            </div>
                            <div>
                                <Label required>Category</Label>
                                <select
                                    value={formData.category_id}
                                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                    className={selectCls}
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

                        {/* Location & Date */}
                        <SectionDivider icon={MapPin} label="Location & Date" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <Label required>Location</Label>
                                <select
                                    value={formData.location_id}
                                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                                    className={selectCls}
                                >
                                    <option value="">Select Location</option>
                                    {locations.map((loc) => (
                                        <option key={loc.id_location} value={loc.id_location}>
                                            {loc.location_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label required>Checking Date</Label>
                                <input
                                    type="date"
                                    value={formData.checking_date}
                                    onChange={(e) => setFormData({ ...formData, checking_date: e.target.value })}
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Items */}
                        <SectionDivider icon={Box} label="Items to Scan" />
                        <div className="space-y-4">
                            {items.map((item, itemIndex) => {
                                const totalDeptQty = item.departments.reduce((sum, d) => sum + d.quantity, 0);
                                const isExpanded = expandedItems[item.id];

                                return (
                                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                                Item #{itemIndex + 1}
                                            </span>
                                            {items.length > 1 && (
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg"
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
                                                />
                                            </div>

                                            {/* Department Distribution */}
                                            <div className="col-span-1 md:col-span-2 lg:col-span-4">
                                                <div className="flex items-center justify-between mt-2">
                                                    <Label>Department Distribution</Label>
                                                    <button
                                                        onClick={() => toggleDepartmentSection(item.id)}
                                                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition ${isExpanded
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
                                                                        </div>
                                                                        <div className="w-24 ml-2">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                max={item.quantity}
                                                                                value={assignedQty}
                                                                                onChange={(e) => updateDepartmentQuantity(item.id, dept.id_department, e.target.value)}
                                                                                disabled={isDisabled}
                                                                                className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDisabled
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
                                                                <span className={`text-sm font-semibold ${totalDeptQty === item.quantity ? "text-green-600" : "text-blue-600"
                                                                    }`}>
                                                                    {totalDeptQty} of {item.quantity} assigned
                                                                </span>
                                                            </div>
                                                        </div>
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

                        {/* Remarks */}
                        <SectionDivider icon={Info} label="Additional Information" />
                        <div className="mb-6">
                            <Label>Remarks</Label>
                            <textarea
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                rows="3"
                                className={inputCls}
                                placeholder="Additional notes or instructions for this scanning session..."
                            />
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
                                    onClick={() => router.push("/scanning_preparation_list")}
                                    className="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Update Session
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