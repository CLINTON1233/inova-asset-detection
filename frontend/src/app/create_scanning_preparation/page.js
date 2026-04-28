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
  Users,
  ChevronDown,
  ChevronUp,
  Copy,
  Layers,
  User,
  Calendar,
  Building,
  ClipboardList,
} from "lucide-react";
import Swal from "sweetalert2";
import API_BASE_URL, { API_ENDPOINTS } from "../../config/api";

export default function ScanningPreparationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [receiversByDepartment, setReceiversByDepartment] = useState({});
  const [masterDevices, setMasterDevices] = useState([]);
  const [masterMaterials, setMasterMaterials] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  // Hapus state untuk dropdown show/hide dan search term karena tidak diperlukan lagi
  // const [showDeviceDropdown, setShowDeviceDropdown] = useState({});
  // const [showMaterialDropdown, setShowMaterialDropdown] = useState({});
  // const [searchDeviceTerm, setSearchDeviceTerm] = useState({});
  // const [searchMaterialTerm, setSearchMaterialTerm] = useState({});

  const [sessions, setSessions] = useState([
    {
      id: `session-${Date.now()}-1`,
      checking_number: generateCheckingNumber(),
      formData: {
        checking_name: "",
        category_id: "",
        location_id: "",
        checking_date: new Date().toISOString().split("T")[0],
        remarks: "",
      },
      items: [
        {
          id: `item-${Date.now()}-1-1`,
          device_name: "",
          device_detail: "",
          brand: "",
          vendor: "",
          model: "",
          specifications: "",
          quantity: 1,
          departments: [],
          receivers: [],
          uom: "PCS",
          material_name: "",
          material_detail: "",
          project_id: "",
          saveToStock: false,
        },
      ],
    },
  ]);

  useEffect(() => {
    setMounted(true);
    fetchCategories();
    fetchLocations();
    fetchDepartments();
    fetchProjects();
    fetchReceivers();
    fetchMasterDevices();
    fetchMasterMaterials();
  }, []);

  function generateCheckingNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SCAN-${year}${month}${day}-${random}`;
  }

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
          const exists = acc.find(
            (item) => item.id_department === current.id_department,
          );
          if (!exists) {
            acc.push(current);
          }
          return acc;
        }, []);
        setDepartments(uniqueDepts);
      } else {
        setDepartments([
          { id_department: 1, department_name: "IT" },
          { id_department: 2, department_name: "HR" },
        ]);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.PROJECTS_LIST);
      const data = await response.json();
      if (data.success) {
        setProjects(data.data || []);
      } else {
        setProjects([
          { id_project: 1, project_name: "Gamma" },
          { id_project: 2, project_name: "Nederwiek 2" },
          { id_project: 3, project_name: "Overhead" },
          { id_project: 4, project_name: "FPSO PETROBRAS P-84" },
          { id_project: 5, project_name: "FPSO PETROBRAS P-85" },
        ]);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([
        { id_project: 1, project_name: "Gamma" },
        { id_project: 2, project_name: "Nederwiek 2" },
        { id_project: 3, project_name: "Overhead" },
        { id_project: 4, project_name: "FPSO PETROBRAS P-84" },
        { id_project: 5, project_name: "FPSO PETROBRAS P-85" },
      ]);
    }
  };

  const toggleSaveToStock = (sessionId, itemId) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === sessionId) {
          return {
            ...session,
            items: session.items.map((item) => {
              if (item.id === itemId) {
                const newSaveToStock = !item.saveToStock;
                return {
                  ...item,
                  saveToStock: newSaveToStock,
                  departments: newSaveToStock ? [] : item.departments,
                  receivers: newSaveToStock ? [] : item.receivers,
                };
              }
              return item;
            }),
          };
        }
        return session;
      }),
    );
  };

  const fetchReceivers = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.MASTER_RECEIVERS_LIST);
      const data = await response.json();
      if (data.success) {
        setReceivers(data.data || []);

        const grouped = {};
        data.data.forEach((receiver) => {
          const deptId = receiver.department_id;
          if (deptId) {
            if (!grouped[deptId]) {
              grouped[deptId] = [];
            }
            grouped[deptId].push(receiver);
          }
        });
        setReceiversByDepartment(grouped);
      } else {
        setReceivers([]);
      }
    } catch (error) {
      console.error("Error fetching receivers:", error);
      setReceivers([]);
    }
  };

  const fetchMasterDevices = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.MASTER_DEVICES_LIST);
      const data = await response.json();
      if (data.success) {
        setMasterDevices(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching master devices:", error);
    }
  };

  const fetchMasterMaterials = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.MASTER_MATERIALS_LIST);
      const data = await response.json();
      if (data.success) {
        setMasterMaterials(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching master materials:", error);
    }
  };

  const uomOptions = [
    { code: "PCS", name: "Pieces" },
    { code: "UNIT", name: "Unit" },
    { code: "ROLL", name: "Roll" },
    { code: "PACK", name: "Pack" },
    { code: "BOX", name: "Box" },
    { code: "METER", name: "Meter" },
    { code: "KG", name: "Kilogram" },
  ];

  const getReceiversForDepartment = (departmentId) => {
    return receiversByDepartment[departmentId] || [];
  };

  const updateReceiverAssignment = (
    sessionId,
    itemId,
    departmentId,
    receiverId,
    itemIndex,
  ) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === sessionId) {
          return {
            ...session,
            items: session.items.map((item) => {
              if (item.id === itemId) {
                const existingIndex = item.receivers.findIndex(
                  (r) =>
                    r.department_id === departmentId &&
                    r.item_index === itemIndex,
                );

                let newReceivers;
                if (existingIndex >= 0) {
                  newReceivers = [...item.receivers];
                  newReceivers[existingIndex] = {
                    ...newReceivers[existingIndex],
                    receiver_id: parseInt(receiverId),
                  };
                } else {
                  const deptInfo = departments.find(
                    (d) => d.id_department === departmentId,
                  );
                  newReceivers = [
                    ...item.receivers,
                    {
                      department_id: departmentId,
                      department_name: deptInfo?.department_name,
                      receiver_id: parseInt(receiverId),
                      item_index: itemIndex,
                    },
                  ];
                }
                return { ...item, receivers: newReceivers };
              }
              return item;
            }),
          };
        }
        return session;
      }),
    );
  };

  const addNewSession = () => {
    const newSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      checking_number: generateCheckingNumber(),
      formData: {
        checking_name: "",
        category_id: "",
        location_id: "",
        checking_date: new Date().toISOString().split("T")[0],
        remarks: "",
      },
      items: [
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-1`,
          device_name: "",
          device_detail: "",
          brand: "",
          vendor: "",
          model: "",
          specifications: "",
          quantity: 1,
          departments: [],
          receivers: [],
          uom: "PCS",
          material_name: "",
          material_detail: "",
          project_id: "",
          saveToStock: false,
        },
      ],
    };
    setSessions([...sessions, newSession]);
  };

  const duplicateSession = (sessionId) => {
    const sessionToDuplicate = sessions.find((s) => s.id === sessionId);
    if (sessionToDuplicate) {
      const newSession = {
        ...JSON.parse(JSON.stringify(sessionToDuplicate)),
        id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        checking_number: generateCheckingNumber(),
      };
      newSession.items = newSession.items.map((item) => ({
        ...item,
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      }));
      setSessions([...sessions, newSession]);
    }
  };

  const removeSession = (sessionId) => {
    if (sessions.length > 1) {
      Swal.fire({
        title: "Remove Session?",
        text: "This action cannot be undone",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, Remove",
      }).then((result) => {
        if (result.isConfirmed) {
          setSessions(sessions.filter((s) => s.id !== sessionId));
        }
      });
    } else {
      Swal.fire({
        title: "Cannot Remove",
        text: "At least one session is required",
        icon: "warning",
        confirmButtonColor: "#1e40af",
      });
    }
  };

  const handleSessionInputChange = (sessionId, field, value) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              formData: { ...session.formData, [field]: value },
            }
          : session,
      ),
    );
  };

  const addNewItem = (sessionId) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              items: [
                ...session.items,
                {
                  id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  device_name: "",
                  device_detail: "",
                  brand: "",
                  vendor: "",
                  model: "",
                  specifications: "",
                  quantity: 1,
                  departments: [],
                  receivers: [],
                  uom: "PCS",
                  material_name: "",
                  material_detail: "",
                  project_id: "",
                  saveToStock: false,
                },
              ],
            }
          : session,
      ),
    );
  };

  const removeItem = (sessionId, itemId) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === sessionId) {
          if (session.items.length > 1) {
            return {
              ...session,
              items: session.items.filter((item) => item.id !== itemId),
            };
          } else {
            Swal.fire({
              title: "Cannot Remove",
              text: "At least one item is required per session",
              icon: "warning",
              confirmButtonColor: "#1e40af",
            });
            return session;
          }
        }
        return session;
      }),
    );
  };

  const updateItem = (sessionId, itemId, field, value) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              items: session.items.map((item) =>
                item.id === itemId ? { ...item, [field]: value } : item,
              ),
            }
          : session,
      ),
    );
  };

  const toggleDepartmentSection = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const updateDepartmentQuantity = (
    sessionId,
    itemId,
    departmentId,
    quantity,
  ) => {
    const department = departments.find(
      (d) => d.id_department === departmentId,
    );

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === sessionId) {
          return {
            ...session,
            items: session.items.map((item) => {
              if (item.id === itemId) {
                if (item.saveToStock) {
                  Swal.fire({
                    title: "Info",
                    text: "Item is saved to stock. Disable 'Save to Stock' to distribute.",
                    icon: "info",
                    timer: 2000,
                    showConfirmButton: false,
                  });
                  return item;
                }

                const newQuantity = parseFloat(quantity) || 0;

                // Hitung total quantity yang sudah dialokasikan ke department lain (selain department ini)
                const totalOtherDepts = item.departments.reduce(
                  (sum, d) =>
                    d.department_id === departmentId ? sum : sum + d.quantity,
                  0,
                );

                // Hitung sisa quantity yang tersedia untuk department ini
                const availableQty = item.quantity - totalOtherDepts;

                // Batasi quantity yang bisa dimasukkan
                let finalQuantity = newQuantity;
                if (newQuantity > availableQty) {
                  finalQuantity = availableQty;
                  if (newQuantity > 0) {
                    Swal.fire({
                      title: "Warning!",
                      text: `Maximum available quantity for this department is ${availableQty}`,
                      icon: "warning",
                      timer: 2000,
                      showConfirmButton: false,
                    });
                  }
                }

                // Cek apakah department sudah ada
                const existingDeptIndex = item.departments.findIndex(
                  (d) => d.department_id === departmentId,
                );

                let newDepartments;
                let newReceivers;

                if (finalQuantity > 0) {
                  // Update atau tambah department
                  if (existingDeptIndex >= 0) {
                    newDepartments = [...item.departments];
                    newDepartments[existingDeptIndex] = {
                      ...newDepartments[existingDeptIndex],
                      quantity: finalQuantity,
                    };
                  } else {
                    newDepartments = [
                      ...item.departments,
                      {
                        department_id: departmentId,
                        department_name:
                          department?.department_name ||
                          `Department ${departmentId}`,
                        quantity: finalQuantity,
                      },
                    ];
                  }

                  // Update receiver entries
                  newReceivers = [...item.receivers];
                  // Hapus receiver lama untuk department ini
                  newReceivers = newReceivers.filter(
                    (r) => r.department_id !== departmentId,
                  );
                  // Tambah receiver baru sesuai quantity
                  for (let i = 0; i < finalQuantity; i++) {
                    newReceivers.push({
                      department_id: departmentId,
                      department_name:
                        department?.department_name ||
                        `Department ${departmentId}`,
                      receiver_id: "",
                      item_index: i,
                    });
                  }
                } else {
                  // Hapus department
                  newDepartments = item.departments.filter(
                    (d) => d.department_id !== departmentId,
                  );
                  // Hapus semua receiver untuk department ini
                  newReceivers = item.receivers.filter(
                    (r) => r.department_id !== departmentId,
                  );
                }

                return {
                  ...item,
                  departments: newDepartments,
                  receivers: newReceivers,
                };
              }
              return item;
            }),
          };
        }
        return session;
      }),
    );
  };

  const isDepartmentInputDisabled = (item, departmentId) => {
    if (item.saveToStock) return true;
    const totalAssigned = item.departments.reduce(
      (sum, d) => sum + (d.department_id === departmentId ? 0 : d.quantity),
      0,
    );
    return totalAssigned >= item.quantity;
  };
  const validateSession = (session) => {
    const errors = [];
    if (!session.formData.checking_name)
      errors.push("Checking name is required");
    if (!session.formData.category_id) errors.push("Category is required");
    if (!session.formData.location_id) errors.push("Location is required");
    if (!session.formData.checking_date)
      errors.push("Checking date is required");

    session.items.forEach((item, index) => {
      const isMaterial = session.formData.category_id === "2";
      if (isMaterial) {
        if (!item.material_name)
          errors.push(
            `Session ${session.checking_number} - Item #${index + 1}: Material name is required`,
          );
      } else {
        if (!item.device_name)
          errors.push(
            `Session ${session.checking_number} - Item #${index + 1}: Device name is required`,
          );
      }
      if (!item.quantity || item.quantity < 1)
        errors.push(
          `Session ${session.checking_number} - Item #${index + 1}: Quantity must be at least 1`,
        );

      if (!item.saveToStock) {
        item.departments.forEach((dept) => {
          for (let i = 0; i < dept.quantity; i++) {
            const receiver = item.receivers.find(
              (r) =>
                r.department_id === dept.department_id && r.item_index === i,
            );
            if (!receiver || !receiver.receiver_id) {
              const deptName = departments.find(
                (d) => d.id_department === dept.department_id,
              )?.department_name;
              errors.push(
                `Session ${session.checking_number} - Item #${index + 1}: Please select a receiver for department "${deptName}" item #${i + 1}`,
              );
            }
          }
        });
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    let allErrors = [];
    sessions.forEach((session) => {
      const sessionErrors = validateSession(session);
      allErrors = [...allErrors, ...sessionErrors];
    });

    if (allErrors.length > 0) {
      Swal.fire({
        title: "Validation Error",
        html: allErrors.map((err) => `• ${err}`).join("<br>"),
        icon: "warning",
        confirmButtonColor: "#1e40af",
      });
      return;
    }

    const totalItems = sessions.reduce(
      (sum, session) => sum + session.items.length,
      0,
    );
    const totalQuantity = sessions.reduce(
      (sum, session) =>
        sum +
        session.items.reduce(
          (itemSum, item) => itemSum + (item.quantity || 1),
          0,
        ),
      0,
    );

    const result = await Swal.fire({
      title: "Create Scanning Preparations?",
      html: `
      <div class="text-left text-sm">
        <p><strong>Total Sessions:</strong> ${sessions.length}</p>
        <p><strong>Total Items:</strong> ${totalItems}</p>
        <p><strong>Total Quantity:</strong> ${totalQuantity}</p>
        <p class="mt-2 text-xs text-gray-500">This will create ${sessions.length} new scanning session(s)</p>
      </div>
    `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Create All",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const results = [];
      const userDataStr = localStorage.getItem("user_data");
      if (!userDataStr) {
        throw new Error("User not logged in. Please login again.");
      }

      const userData = JSON.parse(userDataStr);
      const userId = userData.id; // ← Ambil dari object user_data
      const userName = userData.username || userData.name;

      if (!userId) {
        throw new Error("User ID not found. Please login again.");
      }

      console.log("Creating with user_id:", userId, "user_name:", userName);

      for (const session of sessions) {
        const isMaterial = session.formData.category_id === "2";

        let payload;

        if (isMaterial) {
          payload = {
            checking_name: session.formData.checking_name,
            category_id: parseInt(session.formData.category_id),
            location_id: parseInt(session.formData.location_id),
            checking_date: session.formData.checking_date,
            remarks: session.formData.remarks,
            items: session.items.map(({ id, ...item }) => ({
              item_name: item.material_name,
              specifications: item.material_detail,
              quantity: parseFloat(item.quantity),
              departments: item.saveToStock
                ? []
                : item.departments.map((d) => ({
                    department_id: d.department_id,
                    quantity: parseFloat(d.quantity),
                  })),
              receivers: item.saveToStock
                ? []
                : item.receivers.map((r) => ({
                    department_id: r.department_id,
                    receiver_id: r.receiver_id,
                    item_index: r.item_index !== undefined ? r.item_index : 0,
                  })),
              uom: item.uom || "PCS",
              vendor: item.vendor || "",
              project_id: item.project_id ? parseInt(item.project_id) : null,
              is_stock: item.saveToStock || false,
            })),
            user_id: parseInt(userId), // ← Gunakan userId dari localStorage
          };
        } else {
          payload = {
            checking_name: session.formData.checking_name,
            category_id: parseInt(session.formData.category_id),
            location_id: parseInt(session.formData.location_id),
            checking_date: session.formData.checking_date,
            remarks: session.formData.remarks,
            items: session.items.map(({ id, ...item }) => ({
              device_name: item.device_name,
              device_detail: item.device_detail,
              brand: item.brand,
              vendor: item.vendor,
              model: item.model,
              specifications: item.specifications,
              quantity: parseInt(item.quantity),
              departments: item.saveToStock
                ? []
                : item.departments.map((d) => ({
                    department_id: d.department_id,
                    quantity: parseInt(d.quantity),
                  })),
              receivers: item.saveToStock
                ? []
                : item.receivers.map((r) => ({
                    department_id: r.department_id,
                    receiver_id: r.receiver_id,
                    item_index: r.item_index !== undefined ? r.item_index : 0,
                  })),
              project_id: item.project_id ? parseInt(item.project_id) : null,
              is_stock: item.saveToStock || false,
            })),
            user_id: parseInt(userId), // ← Gunakan userId dari localStorage
          };
        }

        const endpoint = isMaterial
          ? API_ENDPOINTS.MATERIALS_SCANNING_PREP_CREATE
          : API_ENDPOINTS.DEVICES_SCANNING_PREP_CREATE;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (data.success) {
          results.push(data);
        } else {
          console.error("Failed to create session:", data);
        }
      }

      if (results.length > 0) {
        await Swal.fire({
          title: "Success!",
          html: `
          <div class="text-center">
            <p>Successfully created ${results.length} scanning preparations!</p>
            <div class="font-mono text-xs bg-gray-100 p-2 rounded mt-2 max-h-32 overflow-y-auto">
              ${results.map((r) => `<div>${r.checking_number}</div>`).join("")}
            </div>
          </div>
        `,
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        });
        router.push("/scanning");
      } else {
        throw new Error("No sessions were created successfully");
      }
    } catch (error) {
      console.error("Submit error:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to create scanning preparations",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    Swal.fire({
      title: "Reset All Forms?",
      text: "All entered data for all sessions will be lost",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Reset All",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
    }).then((result) => {
      if (result.isConfirmed) {
        setSessions([
          {
            id: `session-${Date.now()}-1`,
            checking_number: generateCheckingNumber(),
            formData: {
              checking_name: "",
              category_id: "",
              location_id: "",
              checking_date: new Date().toISOString().split("T")[0],
              remarks: "",
            },
            items: [
              {
                id: `item-${Date.now()}-1-1`,
                device_name: "",
                device_detail: "",
                brand: "",
                vendor: "",
                model: "",
                specifications: "",
                quantity: 1,
                departments: [],
                receivers: [],
                uom: "PCS",
                material_name: "",
                material_detail: "",
                project_id: "",
                saveToStock: false,
              },
            ],
          },
        ]);
      }
    });
  };

  const inputCls =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white";
  const selectCls =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white appearance-none";

  const Label = ({ children, required }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const Hint = ({ children }) => (
    <p className="text-xs text-gray-400 mt-1">{children}</p>
  );

  if (!mounted) {
    return (
      <LayoutDashboard activeMenu={1}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </LayoutDashboard>
    );
  }

  return (
    <LayoutDashboard activeMenu={1}>
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap");
        .sp-root {
          font-family: "DM Sans", sans-serif;
        }

        .card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transition: box-shadow 0.2s ease;
        }
        .card:hover {
          box-shadow:
            0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .session-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
          margin-bottom: 1rem;
        }
        .session-card:last-child {
          margin-bottom: 0;
        }
        .session-card:hover {
          border-color: #93c5fd;
          box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.1);
        }

        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          max-height: 200px;
          overflow-y: auto;
          z-index: 50;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .session-card {
            border-radius: 12px;
          }
          .dropdown-menu {
            position: fixed;
            left: 1rem;
            right: 1rem;
            max-height: 250px;
            z-index: 60;
          }
        }
      `}</style>

      <div className="sp-root space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <h1 className="text-xl font-bold text-gray-900">
                Scanning Preparation
              </h1>
            </div>
            <p className="text-sm text-gray-500">
              Create preparation scanning sessions at once
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <Layers className="w-3 h-3 inline mr-1" />
              {sessions.length} Session{sessions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800 leading-tight">
                  Scanning Preparation Form
                </h2>
                <p className="text-xs text-gray-400 leading-tight mt-0.5">
                  Fill in the information below to create scanning sessions
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="space-y-5">
              {sessions.map((session, sessionIndex) => (
                <div key={session.id} className="session-card">
                  {/* Session Header */}
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">
                            {sessionIndex + 1}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-gray-900">
                            Session #{sessionIndex + 1}
                          </h3>
                          <p className="text-xs font-mono text-blue-600 mt-0.5">
                            {session.checking_number}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => duplicateSession(session.id)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Duplicate Session"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSession(session.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Remove Session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Session Body */}
                  <div className="p-5">
                    {/* Basic Information */}
                    <div className="mb-5">
                      <p className="section-title flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Basic Information
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label required>Checking Name</Label>
                          <input
                            type="text"
                            value={session.formData.checking_name}
                            onChange={(e) =>
                              handleSessionInputChange(
                                session.id,
                                "checking_name",
                                e.target.value,
                              )
                            }
                            className={inputCls}
                            placeholder="e.g. IT Asset Inventory"
                          />
                        </div>
                        <div>
                          <Label required>Category</Label>
                          <select
                            value={session.formData.category_id}
                            onChange={(e) =>
                              handleSessionInputChange(
                                session.id,
                                "category_id",
                                e.target.value,
                              )
                            }
                            className={selectCls}
                          >
                            <option value="">Select Category</option>
                            {categories.map((cat) => (
                              <option
                                key={cat.id_category}
                                value={cat.id_category}
                              >
                                {cat.category_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Location & Date */}
                    <div className="mb-5">
                      <p className="section-title flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Location & Date
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label required>Location</Label>
                          <select
                            value={session.formData.location_id}
                            onChange={(e) =>
                              handleSessionInputChange(
                                session.id,
                                "location_id",
                                e.target.value,
                              )
                            }
                            className={selectCls}
                          >
                            <option value="">Select Location</option>
                            {locations.map((loc) => (
                              <option
                                key={loc.id_location}
                                value={loc.id_location}
                              >
                                {loc.location_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label required>Checking Date</Label>
                          <input
                            type="date"
                            value={session.formData.checking_date}
                            onChange={(e) =>
                              handleSessionInputChange(
                                session.id,
                                "checking_date",
                                e.target.value,
                              )
                            }
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="mb-5">
                      <p className="section-title flex items-center gap-2">
                        <Box className="w-4 h-4" /> Items to Scan
                      </p>
                      <div className="space-y-4">
                        {session.items.map((item, itemIndex) => {
                          const totalDeptQty = item.departments.reduce(
                            (sum, d) => sum + d.quantity,
                            0,
                          );
                          const remainingQty = item.quantity - totalDeptQty;
                          const isExpanded = expandedItems[item.id];
                          const isMaterial =
                            session.formData.category_id === "2";

                          return (
                            <div
                              key={item.id}
                              className="border border-gray-200 rounded-lg p-4 bg-white"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                    Item #{itemIndex + 1}
                                  </span>
                                  {item.quantity > 1 && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                      Qty: {item.quantity}
                                    </span>
                                  )}
                                  <button
                                    onClick={() =>
                                      toggleSaveToStock(session.id, item.id)
                                    }
                                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition ${
                                      item.saveToStock
                                        ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                        : "bg-gray-100 text-gray-600 border border-gray-200"
                                    }`}
                                  >
                                    <Package className="w-3 h-3" />
                                    {item.saveToStock
                                      ? "Save to Stock"
                                      : "Will Distribute"}
                                  </button>
                                </div>
                                {session.items.length > 1 && (
                                  <button
                                    onClick={() =>
                                      removeItem(session.id, item.id)
                                    }
                                    className="text-red-500 hover:text-red-700 p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {item.saveToStock && (
                                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-yellow-700">
                                      Save to Stock Mode Active - This item will
                                      be saved to stock and not distributed.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {isMaterial ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="md:col-span-2">
                                    <Label required>Material Name</Label>
                                    {/* SELECT untuk Material Name seperti Category/Location */}
                                    <select
                                      value={item.material_name}
                                      onChange={(e) => {
                                        const selectedMaterial =
                                          masterMaterials.find(
                                            (m) =>
                                              m.material_name ===
                                              e.target.value,
                                          );
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "material_name",
                                          e.target.value,
                                        );
                                        // Optional: Auto-fill material details jika ada
                                        if (
                                          selectedMaterial &&
                                          selectedMaterial.material_detail
                                        ) {
                                          updateItem(
                                            session.id,
                                            item.id,
                                            "material_detail",
                                            selectedMaterial.material_detail,
                                          );
                                        }
                                      }}
                                      className={selectCls}
                                    >
                                      <option value="">Select Material</option>
                                      {masterMaterials.map((material) => (
                                        <option
                                          key={material.id_material}
                                          value={material.material_name}
                                        >
                                          {material.material_name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="md:col-span-2">
                                    <Label>Material Details</Label>
                                    <textarea
                                      value={item.material_detail}
                                      onChange={(e) =>
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "material_detail",
                                          e.target.value,
                                        )
                                      }
                                      className={inputCls}
                                      rows="2"
                                      placeholder="Specifications, color, length, gauge, etc."
                                    />
                                  </div>

                                  <div>
                                    <Label required>Quantity</Label>
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "quantity",
                                          parseFloat(e.target.value) || 1,
                                        )
                                      }
                                      className={inputCls}
                                      min="0.01"
                                      step="0.01"
                                    />
                                  </div>

                                  <div>
                                    <Label required>UOM</Label>
                                    <select
                                      value={item.uom || "PCS"}
                                      onChange={(e) =>
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "uom",
                                          e.target.value,
                                        )
                                      }
                                      className={selectCls}
                                    >
                                      {uomOptions.map((uom) => (
                                        <option key={uom.code} value={uom.code}>
                                          {uom.name} ({uom.code})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <Label>Vendor</Label>
                                    <input
                                      type="text"
                                      value={item.vendor}
                                      onChange={(e) =>
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "vendor",
                                          e.target.value,
                                        )
                                      }
                                      className={inputCls}
                                      placeholder="e.g. Belden, 3M"
                                    />
                                  </div>

                                  <div>
                                    <Label>Project</Label>
                                    <select
                                      value={item.project_id}
                                      onChange={(e) =>
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "project_id",
                                          e.target.value,
                                        )
                                      }
                                      className={selectCls}
                                    >
                                      <option value="">Select Project</option>
                                      {projects.map((project) => (
                                        <option
                                          key={project.id_project}
                                          value={project.id_project}
                                        >
                                          {project.project_name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {!item.saveToStock && (
                                    <>
                                      <div className="md:col-span-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <Label>Department Distribution</Label>
                                          <button
                                            onClick={() =>
                                              toggleDepartmentSection(item.id)
                                            }
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition"
                                          >
                                            {isExpanded
                                              ? "Close Distribution"
                                              : "Distribute Items"}
                                            {isExpanded ? (
                                              <ChevronUp className="w-3 h-3" />
                                            ) : (
                                              <ChevronDown className="w-3 h-3" />
                                            )}
                                          </button>
                                        </div>

                                        {isExpanded && (
                                          <div className="mt-3 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                              {departments.map((dept) => {
                                                const assignedDept =
                                                  item.departments.find(
                                                    (d) =>
                                                      d.department_id ===
                                                      dept.id_department,
                                                  );
                                                const assignedQty =
                                                  assignedDept?.quantity || 0;
                                                const isDisabled =
                                                  isDepartmentInputDisabled(
                                                    item,
                                                    dept.id_department,
                                                  );
                                                return (
                                                  <div
                                                    key={dept.id_department}
                                                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                                                  >
                                                    <span className="text-sm font-medium text-gray-700 truncate">
                                                      {dept.department_name}
                                                    </span>
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      max={item.quantity}
                                                      value={assignedQty}
                                                      onChange={(e) =>
                                                        updateDepartmentQuantity(
                                                          session.id,
                                                          item.id,
                                                          dept.id_department,
                                                          e.target.value,
                                                        )
                                                      }
                                                      disabled={isDisabled}
                                                      className={`w-20 px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 ${
                                                        isDisabled
                                                          ? "bg-gray-50 text-gray-400"
                                                          : "bg-white"
                                                      }`}
                                                      placeholder="Qty"
                                                    />
                                                  </div>
                                                );
                                              })}
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                              <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-700">
                                                  Distribution Summary:
                                                </span>
                                                <span
                                                  className={`text-sm font-semibold ${
                                                    totalDeptQty ===
                                                    item.quantity
                                                      ? "text-green-600"
                                                      : "text-blue-600"
                                                  }`}
                                                >
                                                  {totalDeptQty} of{" "}
                                                  {item.quantity} assigned
                                                </span>
                                              </div>
                                              {remainingQty > 0 && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                  {remainingQty} unassigned
                                                  items will stay at main
                                                  location
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {!isExpanded &&
                                          item.departments.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              {item.departments.map((dept) => (
                                                <div
                                                  key={dept.department_id}
                                                  className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full"
                                                >
                                                  <Users className="w-3 h-3 text-gray-500" />
                                                  <span className="text-xs text-gray-700">
                                                    {dept.department_name}:{" "}
                                                    {dept.quantity}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                      </div>

                                      {item.departments.length > 0 && (
                                        <div className="md:col-span-2 pt-2 border-t border-gray-100">
                                          <div className="flex items-center gap-2 mb-3">
                                            <User className="w-4 h-4 text-green-600" />
                                            <h4 className="text-sm font-semibold text-gray-800">
                                              Receiver Assignment
                                            </h4>
                                          </div>
                                          <div className="space-y-3">
                                            {item.departments.map((dept) => {
                                              const deptInfo = departments.find(
                                                (d) =>
                                                  d.id_department ===
                                                  dept.department_id,
                                              );
                                              const availableReceivers =
                                                getReceiversForDepartment(
                                                  dept.department_id,
                                                );
                                              return (
                                                <div
                                                  key={dept.department_id}
                                                  className="border border-gray-200 rounded-lg overflow-hidden"
                                                >
                                                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                    <span className="text-sm font-semibold text-gray-800">
                                                      {deptInfo?.department_name ||
                                                        `Department ${dept.department_id}`}
                                                    </span>
                                                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                      {dept.quantity} item(s)
                                                    </span>
                                                  </div>
                                                  <div className="p-3 space-y-3">
                                                    {[
                                                      ...Array(dept.quantity),
                                                    ].map((_, i) => {
                                                      const receiver =
                                                        item.receivers.find(
                                                          (r) =>
                                                            r.department_id ===
                                                              dept.department_id &&
                                                            r.item_index === i,
                                                        );
                                                      return (
                                                        <div key={i}>
                                                          <Label>
                                                            Item #{i + 1}{" "}
                                                            Receiver
                                                          </Label>
                                                          <select
                                                            value={
                                                              receiver?.receiver_id ||
                                                              ""
                                                            }
                                                            onChange={(e) =>
                                                              updateReceiverAssignment(
                                                                session.id,
                                                                item.id,
                                                                dept.department_id,
                                                                e.target.value,
                                                                i,
                                                              )
                                                            }
                                                            className={
                                                              selectCls
                                                            }
                                                          >
                                                            <option value="">
                                                              Select Receiver
                                                            </option>
                                                            {availableReceivers.map(
                                                              (rec) => (
                                                                <option
                                                                  key={
                                                                    rec.id_receiver
                                                                  }
                                                                  value={
                                                                    rec.id_receiver
                                                                  }
                                                                >
                                                                  {
                                                                    rec.receiver_name
                                                                  }{" "}
                                                                  -{" "}
                                                                  {
                                                                    rec.receiver_title
                                                                  }
                                                                </option>
                                                              ),
                                                            )}
                                                          </select>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="md:col-span-2">
                                    <Label required>Device Name</Label>
                                    {/* SELECT untuk Device Name seperti Category/Location */}
                                    <select
                                      value={item.device_name}
                                      onChange={(e) => {
                                        const selectedDevice =
                                          masterDevices.find(
                                            (d) =>
                                              d.device_name === e.target.value,
                                          );
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "device_name",
                                          e.target.value,
                                        );
                                        // Optional: Auto-fill device details jika ada
                                        if (selectedDevice) {
                                          if (selectedDevice.brand)
                                            updateItem(
                                              session.id,
                                              item.id,
                                              "brand",
                                              selectedDevice.brand,
                                            );
                                          if (selectedDevice.model)
                                            updateItem(
                                              session.id,
                                              item.id,
                                              "model",
                                              selectedDevice.model,
                                            );
                                          if (selectedDevice.specifications)
                                            updateItem(
                                              session.id,
                                              item.id,
                                              "specifications",
                                              selectedDevice.specifications,
                                            );
                                          if (selectedDevice.device_detail)
                                            updateItem(
                                              session.id,
                                              item.id,
                                              "device_detail",
                                              selectedDevice.device_detail,
                                            );
                                        }
                                      }}
                                      className={selectCls}
                                    >
                                      <option value="">Select Device</option>
                                      {masterDevices.map((device) => (
                                        <option
                                          key={device.id_device}
                                          value={device.device_name}
                                        >
                                          {device.device_name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="md:col-span-2">
                                    <Label>Device Details</Label>
                                    <textarea
                                      value={item.device_detail}
                                      onChange={(e) =>
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "device_detail",
                                          e.target.value,
                                        )
                                      }
                                      className={inputCls}
                                      rows="2"
                                      placeholder="Specifications, color, size, features, etc."
                                    />
                                  </div>

                                  <div>
                                    <Label>Brand</Label>
                                    <input
                                      type="text"
                                      value={item.brand}
                                      onChange={(e) =>
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "brand",
                                          e.target.value,
                                        )
                                      }
                                      className={inputCls}
                                      placeholder="e.g. Dell, Samsung"
                                    />
                                  </div>

                                  <div>
                                    <Label>Vendor</Label>
                                    <input
                                      type="text"
                                      value={item.vendor}
                                      onChange={(e) =>
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "vendor",
                                          e.target.value,
                                        )
                                      }
                                      className={inputCls}
                                      placeholder="e.g. PT DUTA"
                                    />
                                  </div>

                                  <div>
                                    <Label>Model</Label>
                                    <input
                                      type="text"
                                      value={item.model}
                                      onChange={(e) =>
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "model",
                                          e.target.value,
                                        )
                                      }
                                      className={inputCls}
                                      placeholder="e.g. Latitude 3420"
                                    />
                                  </div>

                                  <div>
                                    <Label>Specifications</Label>
                                    <input
                                      type="text"
                                      value={item.specifications}
                                      onChange={(e) =>
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "specifications",
                                          e.target.value,
                                        )
                                      }
                                      className={inputCls}
                                      placeholder="e.g. Intel i5, 8GB RAM"
                                    />
                                  </div>

                                  <div>
                                    <Label required>Quantity</Label>
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "quantity",
                                          parseInt(e.target.value) || 1,
                                        )
                                      }
                                      className={inputCls}
                                      min="1"
                                    />
                                  </div>

                                  <div>
                                    <Label>Project</Label>
                                    <select
                                      value={item.project_id}
                                      onChange={(e) =>
                                        updateItem(
                                          session.id,
                                          item.id,
                                          "project_id",
                                          e.target.value,
                                        )
                                      }
                                      className={selectCls}
                                    >
                                      <option value="">Select Project</option>
                                      {projects.map((project) => (
                                        <option
                                          key={project.id_project}
                                          value={project.id_project}
                                        >
                                          {project.project_name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {!item.saveToStock && (
                                    <>
                                      <div className="md:col-span-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <Label>Department Distribution</Label>
                                          <button
                                            onClick={() =>
                                              toggleDepartmentSection(item.id)
                                            }
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition"
                                          >
                                            {isExpanded
                                              ? "Close Distribution"
                                              : "Distribute Items"}
                                            {isExpanded ? (
                                              <ChevronUp className="w-3 h-3" />
                                            ) : (
                                              <ChevronDown className="w-3 h-3" />
                                            )}
                                          </button>
                                        </div>

                                        {isExpanded && (
                                          <div className="mt-3 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                              {departments.map((dept) => {
                                                const assignedDept =
                                                  item.departments.find(
                                                    (d) =>
                                                      d.department_id ===
                                                      dept.id_department,
                                                  );
                                                const assignedQty =
                                                  assignedDept?.quantity || 0;
                                                const isDisabled =
                                                  isDepartmentInputDisabled(
                                                    item,
                                                    dept.id_department,
                                                  );
                                                return (
                                                  <div
                                                    key={dept.id_department}
                                                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                                                  >
                                                    <span className="text-sm font-medium text-gray-700 truncate">
                                                      {dept.department_name}
                                                    </span>
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      max={item.quantity}
                                                      value={assignedQty}
                                                      onChange={(e) =>
                                                        updateDepartmentQuantity(
                                                          session.id,
                                                          item.id,
                                                          dept.id_department,
                                                          e.target.value,
                                                        )
                                                      }
                                                      disabled={isDisabled}
                                                      className={`w-20 px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 ${
                                                        isDisabled
                                                          ? "bg-gray-50 text-gray-400"
                                                          : "bg-white"
                                                      }`}
                                                      placeholder="Qty"
                                                    />
                                                  </div>
                                                );
                                              })}
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                              <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-700">
                                                  Distribution Summary:
                                                </span>
                                                <span
                                                  className={`text-sm font-semibold ${
                                                    totalDeptQty ===
                                                    item.quantity
                                                      ? "text-green-600"
                                                      : "text-blue-600"
                                                  }`}
                                                >
                                                  {totalDeptQty} of{" "}
                                                  {item.quantity} assigned
                                                </span>
                                              </div>
                                              {remainingQty > 0 && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                  {remainingQty} unassigned
                                                  items will stay at main
                                                  location
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {!isExpanded &&
                                          item.departments.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              {item.departments.map((dept) => (
                                                <div
                                                  key={dept.department_id}
                                                  className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full"
                                                >
                                                  <Users className="w-3 h-3 text-gray-500" />
                                                  <span className="text-xs text-gray-700">
                                                    {dept.department_name}:{" "}
                                                    {dept.quantity}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                      </div>

                                      {item.departments.length > 0 && (
                                        <div className="md:col-span-2 pt-2 border-t border-gray-100">
                                          <div className="flex items-center gap-2 mb-3">
                                            <User className="w-4 h-4 text-green-600" />
                                            <h4 className="text-sm font-semibold text-gray-800">
                                              Receiver Assignment
                                            </h4>
                                          </div>
                                          <div className="space-y-3">
                                            {item.departments.map((dept) => {
                                              const deptInfo = departments.find(
                                                (d) =>
                                                  d.id_department ===
                                                  dept.department_id,
                                              );
                                              const availableReceivers =
                                                getReceiversForDepartment(
                                                  dept.department_id,
                                                );
                                              return (
                                                <div
                                                  key={dept.department_id}
                                                  className="border border-gray-200 rounded-lg overflow-hidden"
                                                >
                                                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                    <span className="text-sm font-semibold text-gray-800">
                                                      {deptInfo?.department_name ||
                                                        `Department ${dept.department_id}`}
                                                    </span>
                                                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                      {dept.quantity} item(s)
                                                    </span>
                                                  </div>
                                                  <div className="p-3 space-y-3">
                                                    {[
                                                      ...Array(dept.quantity),
                                                    ].map((_, i) => {
                                                      const receiver =
                                                        item.receivers.find(
                                                          (r) =>
                                                            r.department_id ===
                                                              dept.department_id &&
                                                            r.item_index === i,
                                                        );
                                                      return (
                                                        <div key={i}>
                                                          <Label>
                                                            Item #{i + 1}{" "}
                                                            Receiver
                                                          </Label>
                                                          <select
                                                            value={
                                                              receiver?.receiver_id ||
                                                              ""
                                                            }
                                                            onChange={(e) =>
                                                              updateReceiverAssignment(
                                                                session.id,
                                                                item.id,
                                                                dept.department_id,
                                                                e.target.value,
                                                                i,
                                                              )
                                                            }
                                                            className={
                                                              selectCls
                                                            }
                                                          >
                                                            <option value="">
                                                              Select Receiver
                                                            </option>
                                                            {availableReceivers.map(
                                                              (rec) => (
                                                                <option
                                                                  key={
                                                                    rec.id_receiver
                                                                  }
                                                                  value={
                                                                    rec.id_receiver
                                                                  }
                                                                >
                                                                  {
                                                                    rec.receiver_name
                                                                  }{" "}
                                                                  -{" "}
                                                                  {
                                                                    rec.receiver_title
                                                                  }
                                                                </option>
                                                              ),
                                                            )}
                                                          </select>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => addNewItem(session.id)}
                        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      >
                        <Plus className="w-4 h-4" />
                        Add Item #{sessionIndex + 1}
                      </button>
                    </div>

                    {/* Remarks */}
                    <div>
                      <p className="section-title flex items-center gap-2">
                        <Info className="w-4 h-4" /> Additional Information
                      </p>
                      <div>
                        <Label>Remarks</Label>
                        <textarea
                          value={session.formData.remarks}
                          onChange={(e) =>
                            handleSessionInputChange(
                              session.id,
                              "remarks",
                              e.target.value,
                            )
                          }
                          rows="3"
                          className={inputCls}
                          placeholder="Additional notes or instructions for this scanning session..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addNewSession}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition"
              >
                <Plus className="w-4 h-4" />
                Add Another Scanning Session
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 rounded-b-2xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-400">
                <span className="text-red-500">*</span> Required fields
              </p>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset All
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Create ({sessions.length})
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
