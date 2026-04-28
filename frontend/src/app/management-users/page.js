"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Key,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  X,
  User,
} from "lucide-react";
import LayoutDashboard from "../components/LayoutDashboard";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";
import { API_ENDPOINTS } from "../../config/api";
import API_BASE_URL from "../../config/api";
import ProtectedPage from "../components/ProtectedPage";

// ─── Shared inline styles untuk SweetAlert ───────────────────────────────────
const swalInputStyle = `
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  outline: none;
  transition: border-color .15s, box-shadow .15s;
  box-sizing: border-box;
  font-family: 'DM Sans', sans-serif;
  margin: 0;
`;

const swalSelectStyle = `
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  outline: none;
  box-sizing: border-box;
  font-family: 'DM Sans', sans-serif;
  margin: 0;
  cursor: pointer;
`;

const swalLabelStyle = `
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
  text-align: left;
`;

const swalFieldStyle = `
  margin-bottom: 14px;
  text-align: left;
`;

// Focus effect via JS (dipasang setelah Swal render)
function attachInputFocus() {
  setTimeout(() => {
    document
      .querySelectorAll(".swal-custom-input, .swal-custom-select")
      .forEach((el) => {
        el.addEventListener("focus", () => {
          el.style.borderColor = "#3b82f6";
          el.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)";
        });
        el.addEventListener("blur", () => {
          el.style.borderColor = "#d1d5db";
          el.style.boxShadow = "none";
        });
      });
  }, 100);
}

export default function ManagementUsersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sorting, setSorting] = useState({ id: "id_user", desc: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role !== "superadmin") {
      Swal.fire({
        title: "Access Denied",
        text: "You don't have permission to access this page",
        icon: "error",
        confirmButtonColor: "#2563eb",
      }).then(() => {
        router.push("/dashboard");
      });
      return;
    }
    fetchUsers();
  }, [user, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch users");
      }
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to load users",
        icon: "error",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── ADD USER ──────────────────────────────────────────────────────────────
  const handleAddUser = async () => {
    const { value: formValues } = await Swal.fire({
      title:
        '<span style="font-size:20px;font-weight:700;color:#111827;">Add New User</span>',
      width: 520,
      padding: "28px 32px",
      background: "#ffffff",
      html: `
        <div style="text-align:left;">
          <div style="${swalFieldStyle}">
            <label style="${swalLabelStyle}">Username <span style="color:#ef4444;">*</span></label>
            <input id="swal-username" class="swal-custom-input" type="text"
              placeholder="Enter username"
              style="${swalInputStyle}" />
          </div>
          <div style="${swalFieldStyle}">
            <label style="${swalLabelStyle}">Email <span style="color:#ef4444;">*</span></label>
            <input id="swal-email" class="swal-custom-input" type="email"
              placeholder="Enter email address"
              style="${swalInputStyle}" />
          </div>
          <div style="${swalFieldStyle}">
            <label style="${swalLabelStyle}">Password <span style="color:#ef4444;">*</span></label>
            <input id="swal-password" class="swal-custom-input" type="password"
              placeholder="Minimum 6 characters"
              style="${swalInputStyle}" />
          </div>
          <div style="${swalFieldStyle}">
            <label style="${swalLabelStyle}">Badge Number <span style="color:#ef4444;">*</span></label>
            <input id="swal-badge" class="swal-custom-input" type="text"
              placeholder="Enter badge number"
              style="${swalInputStyle}" />
          </div>
          <div style="${swalFieldStyle}">
            <label style="${swalLabelStyle}">Department <span style="color:#ef4444;">*</span></label>
            <input id="swal-dept" class="swal-custom-input" type="text"
              placeholder="Enter department"
              style="${swalInputStyle}" />
          </div>
          <div style="${swalFieldStyle} margin-bottom:0;">
            <label style="${swalLabelStyle}">Role <span style="color:#ef4444;">*</span></label>
            <select id="swal-role" class="swal-custom-select" style="${swalSelectStyle}">
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
        </div>
      `,
      didOpen: attachInputFocus,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Create User",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
      customClass: {
        popup: "swal-clean-popup",
        confirmButton: "swal-btn-confirm",
        cancelButton: "swal-btn-cancel",
        actions: "swal-actions",
      },
      preConfirm: () => {
        const username = document.getElementById("swal-username").value.trim();
        const email = document.getElementById("swal-email").value.trim();
        const password = document.getElementById("swal-password").value;
        const no_badge = document.getElementById("swal-badge").value.trim();
        const department = document.getElementById("swal-dept").value.trim();
        const role = document.getElementById("swal-role").value;

        if (!username || !email || !password || !no_badge || !department) {
          Swal.showValidationMessage("⚠️ Please fill in all required fields");
          return false;
        }
        if (password.length < 6) {
          Swal.showValidationMessage(
            "⚠️ Password must be at least 6 characters",
          );
          return false;
        }
        return { username, email, password, no_badge, department, role };
      },
    });

    if (formValues) {
      setIsSubmitting(true);
      try {
        const response = await fetch(API_ENDPOINTS.REGISTER, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues),
        });
        const result = await response.json();
        if (result.success) {
          Swal.fire({
            title: "Success!",
            text: `User ${formValues.username} has been created successfully`,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          fetchUsers();
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to create user",
          icon: "error",
          confirmButtonColor: "#2563eb",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ─── EDIT USER ─────────────────────────────────────────────────────────────
  const handleEditUser = async (userToEdit) => {
    const { value: formValues } = await Swal.fire({
      title:
        '<span style="font-size:20px;font-weight:700;color:#111827;">Edit User</span>',
      width: 520,
      padding: "28px 32px",
      background: "#ffffff",
      html: `
        <div style="text-align:left;">
          <div style="${swalFieldStyle}">
            <label style="${swalLabelStyle}">Username <span style="color:#ef4444;">*</span></label>
            <input id="swal-username" class="swal-custom-input" type="text"
              value="${userToEdit.username || ""}"
              placeholder="Enter username"
              style="${swalInputStyle}" />
          </div>
          <div style="${swalFieldStyle}">
            <label style="${swalLabelStyle}">Email</label>
            <input type="email" value="${userToEdit.email || ""}" disabled
              style="${swalInputStyle} background:#f9fafb; color:#9ca3af; cursor:not-allowed;" />
            <p style="font-size:12px;color:#9ca3af;margin:4px 0 0 2px;">Email cannot be changed</p>
          </div>
          <div style="${swalFieldStyle}">
            <label style="${swalLabelStyle}">Badge Number</label>
            <input type="text" value="${userToEdit.no_badge || ""}" disabled
              style="${swalInputStyle} background:#f9fafb; color:#9ca3af; cursor:not-allowed;" />
            <p style="font-size:12px;color:#9ca3af;margin:4px 0 0 2px;">Badge number cannot be changed</p>
          </div>
          <div style="${swalFieldStyle}">
            <label style="${swalLabelStyle}">Department <span style="color:#ef4444;">*</span></label>
            <input id="swal-dept" class="swal-custom-input" type="text"
              value="${userToEdit.department || ""}"
              placeholder="Enter department"
              style="${swalInputStyle}" />
          </div>
          <div style="${swalFieldStyle} margin-bottom:0;">
            <label style="${swalLabelStyle}">Role <span style="color:#ef4444;">*</span></label>
            <select id="swal-role" class="swal-custom-select" style="${swalSelectStyle}">
              <option value="admin" ${userToEdit.role === "admin" ? "selected" : ""}>Admin</option>
              <option value="superadmin" ${userToEdit.role === "superadmin" ? "selected" : ""}>Superadmin</option>
            </select>
          </div>
        </div>
      `,
      didOpen: attachInputFocus,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Save Changes",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
      customClass: {
        popup: "swal-clean-popup",
        confirmButton: "swal-btn-confirm",
        cancelButton: "swal-btn-cancel",
        actions: "swal-actions",
      },
      preConfirm: () => {
        const username = document.getElementById("swal-username").value.trim();
        const department = document.getElementById("swal-dept").value.trim();
        const role = document.getElementById("swal-role").value;

        if (!username || !department) {
          Swal.showValidationMessage("⚠️ Please fill in all required fields");
          return false;
        }
        return { username, department, role };
      },
    });

    if (formValues) {
      setIsSubmitting(true);
      try {
        const token = localStorage.getItem("auth_token");
        const profileResponse = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: userToEdit.id,
            username: formValues.username,
            email: userToEdit.email,
            no_badge: userToEdit.no_badge,
            department: formValues.department,
          }),
        });
        const profileResult = await profileResponse.json();
        if (!profileResult.success) throw new Error(profileResult.message);

        if (formValues.role !== userToEdit.role) {
          const roleResponse = await fetch(
            `${API_BASE_URL}/api/users/role/${userToEdit.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ role: formValues.role }),
            },
          );
          const roleResult = await roleResponse.json();
          if (!roleResult.success) throw new Error(roleResult.error);
        }

        Swal.fire({
          title: "Success!",
          text: `User ${formValues.username} has been updated successfully`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchUsers();
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to update user",
          icon: "error",
          confirmButtonColor: "#2563eb",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ─── RESET PASSWORD ────────────────────────────────────────────────────────
  const handleResetPassword = async (userToReset) => {
    const { value: password } = await Swal.fire({
      title: `<span style="font-size:19px;font-weight:700;color:#111827;">Reset Password</span>
              <p style="font-size:13px;color:#6b7280;font-weight:400;margin-top:4px;">${userToReset.username}</p>`,
      width: 480,
      padding: "28px 32px",
      background: "#ffffff",
      html: `
        <div style="text-align:left;">
          <div style="${swalFieldStyle}">
            <label style="${swalLabelStyle}">New Password <span style="color:#ef4444;">*</span></label>
            <input id="swal-newpw" class="swal-custom-input" type="password"
              placeholder="Min. 6 characters"
              style="${swalInputStyle}" />
          </div>
          <div style="${swalFieldStyle}">
            <label style="${swalLabelStyle}">Confirm Password <span style="color:#ef4444;">*</span></label>
            <input id="swal-confirmpw" class="swal-custom-input" type="password"
              placeholder="Re-enter new password"
              style="${swalInputStyle}" />
          </div>
          <div style="
            margin-top:4px;
            padding:12px 14px;
            background:#eff6ff;
            border:1px solid #bfdbfe;
            border-radius:10px;
          ">
            <p style="font-size:12px;font-weight:600;color:#1d4ed8;margin:0 0 6px 0;">⚠️ Password requirements:</p>
            <p style="font-size:12px;color:#2563eb;margin:0;">• Minimum 6 characters &nbsp;•&nbsp; Case sensitive</p>
          </div>
        </div>
      `,
      didOpen: attachInputFocus,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Reset Password",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#6b7280",
      customClass: {
        popup: "swal-clean-popup",
        confirmButton: "swal-btn-confirm",
        cancelButton: "swal-btn-cancel",
        actions: "swal-actions",
      },
      preConfirm: () => {
        const new_password = document.getElementById("swal-newpw").value;
        const confirm_password =
          document.getElementById("swal-confirmpw").value;

        if (!new_password || !confirm_password) {
          Swal.showValidationMessage("⚠️ Please fill in both password fields");
          return false;
        }
        if (new_password.length < 6) {
          Swal.showValidationMessage(
            "⚠️ Password must be at least 6 characters",
          );
          return false;
        }
        if (new_password !== confirm_password) {
          Swal.showValidationMessage("⚠️ Passwords do not match");
          return false;
        }
        return new_password;
      },
    });

    if (password) {
      setIsSubmitting(true);
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(
          `${API_BASE_URL}/api/users/reset-password/${userToReset.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ new_password: password }),
          },
        );
        const result = await response.json();
        if (result.success) {
          Swal.fire({
            title: "Success!",
            text: `Password for ${userToReset.username} has been reset`,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to reset password",
          icon: "error",
          confirmButtonColor: "#2563eb",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ─── DELETE USER ───────────────────────────────────────────────────────────
  const handleDeleteUser = async (userToDelete) => {
    if (userToDelete.id === user?.id) {
      Swal.fire({
        title: "Cannot Delete",
        text: "You cannot delete your own account",
        icon: "warning",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Delete User?",
      html: `
        <div style="text-align:left;">
          <p style="font-size:14px;color:#374151;margin-bottom:6px;">User: <strong>${userToDelete.username}</strong></p>
          <p style="font-size:14px;color:#374151;margin-bottom:6px;">Email: <span style="font-family:monospace;font-size:13px;">${userToDelete.email}</span></p>
          <p style="font-size:14px;color:#374151;margin-bottom:14px;">Role: <strong>${userToDelete.role === "superadmin" ? "Super Admin" : "Admin"}</strong></p>
          <div style="padding:12px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;">
            <p style="font-size:12px;font-weight:700;color:#dc2626;margin:0 0 4px 0;">⚠️ This action cannot be undone!</p>
            <p style="font-size:12px;color:#ef4444;margin:0;">All data associated with this user will be permanently deleted.</p>
          </div>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete User",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      setIsSubmitting(true);
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(
          `${API_BASE_URL}/api/users/${userToDelete.id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = await response.json();
        if (data.success) {
          Swal.fire({
            title: "Deleted!",
            text: `User "${userToDelete.username}" has been deleted`,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          fetchUsers();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to delete user",
          icon: "error",
          confirmButtonColor: "#2563eb",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ─── SORT ──────────────────────────────────────────────────────────────────
  const handleSort = (columnId) => {
    setSorting((prev) => ({
      id: columnId,
      desc: prev.id === columnId ? !prev.desc : false,
    }));
  };

  const getSortIcon = (columnId) => {
    if (sorting.id !== columnId)
      return (
        <span style={{ color: "#d1d5db", marginLeft: 4, fontSize: 11 }}>⇅</span>
      );
    return sorting.desc ? (
      <ArrowDown
        style={{ width: 12, height: 12, marginLeft: 4, color: "#2563eb" }}
      />
    ) : (
      <ArrowUp
        style={{ width: 12, height: 12, marginLeft: 4, color: "#2563eb" }}
      />
    );
  };

  // ─── FILTER ────────────────────────────────────────────────────────────────
  let filteredUsers = [...users];
  if (searchTerm) {
    filteredUsers = filteredUsers.filter(
      (u) =>
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.no_badge?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.department?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
  if (roleFilter !== "all")
    filteredUsers = filteredUsers.filter((u) => u.role === roleFilter);
  if (statusFilter !== "all")
    filteredUsers = filteredUsers.filter((u) => u.status === statusFilter);
  if (sorting.id) {
    filteredUsers.sort((a, b) => {
      let aVal = a[sorting.id];
      let bVal = b[sorting.id];
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sorting.desc ? 1 : -1;
      if (aVal > bVal) return sorting.desc ? -1 : 1;
      return 0;
    });
  }

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    superadmin: users.filter((u) => u.role === "superadmin").length,
    active: users.filter((u) => u.status === "active").length,
  };

  if (user && user.role !== "superadmin") return null;

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu="management_users">
        <style jsx global>{`
          @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap");
          .mu-root {
            font-family: "DM Sans", sans-serif;
          }
          .mu-root * {
            box-sizing: border-box;
          }
          .mu-section {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
            overflow: hidden;
          }
          .mu-th {
            padding: 10px 14px;
            font-size: 11px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            background: #f9fafb;
            cursor: pointer;
            user-select: none;
            white-space: nowrap;
            border-bottom: 1px solid #e5e7eb;
          }
          .mu-th:hover {
            color: #374151;
          }
          .mu-td {
            padding: 13px 14px;
            font-size: 13px;
            color: #374151;
            border-top: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          .mu-row {
            cursor: default;
            transition: background 0.1s;
          }
          .mu-row:hover {
            background: #f8faff;
          }
          .mu-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 18px;
            background: #f9fafb;
            border-top: 1px solid #f3f4f6;
          }

          /* ── SweetAlert2 overrides ── */
          .swal-clean-popup {
            border-radius: 18px !important;
            padding: 0 !important;
            font-family: "DM Sans", sans-serif !important;
          }
          .swal-clean-popup .swal2-html-container {
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            font-size: 14px !important;
          }
          .swal-clean-popup .swal2-title {
            padding: 28px 32px 16px !important;
            margin: 0 !important;
            border-bottom: 1px solid #f3f4f6 !important;
          }
          .swal-clean-popup .swal2-html-container {
            padding: 20px 32px 0 !important;
          }
          .swal-clean-popup .swal2-actions {
            padding: 20px 32px 28px !important;
            margin: 0 !important;
            gap: 10px !important;
          }
          .swal-clean-popup .swal2-confirm,
          .swal-clean-popup .swal2-cancel {
            padding: 10px 22px !important;
            border-radius: 10px !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            font-family: "DM Sans", sans-serif !important;
            box-shadow: none !important;
          }
          .swal-clean-popup .swal2-validation-message {
            margin: 8px 0 0 !important;
            border-radius: 8px !important;
            font-size: 13px !important;
            background: #fef2f2 !important;
            color: #dc2626 !important;
            border: none !important;
          }
          /* hide default swal icon padding weirdness */
          .swal-clean-popup .swal2-icon {
            display: none !important;
          }
        `}</style>

        <div className="mu-root space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Management Users
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage all system users, roles, and permissions
              </p>
            </div>
            <button
              onClick={handleAddUser}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
              style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}
            >
              <UserPlus className="w-4 h-4" />
              Add New User
            </button>
          </div>

          {/* Stats */}
          <div className="mu-section">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
              {[
                {
                  title: "Total Users",
                  value: stats.total,
                  sub: "All system users",
                  accent: "#2563eb",
                },
                {
                  title: "Admin",
                  value: stats.admin,
                  sub: "Admin users",
                  accent: "#3b82f6",
                },
                {
                  title: "Superadmin",
                  value: stats.superadmin,
                  sub: "Superadmin users",
                  accent: "#8b5cf6",
                },
                {
                  title: "Active",
                  value: stats.active,
                  sub: "Active accounts",
                  accent: "#10b981",
                },
              ].map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px 16px",
                    textAlign: "center",
                  }}
                >
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    {d.title}
                  </p>
                  <span
                    className="text-4xl font-bold"
                    style={{ color: d.accent }}
                  >
                    {d.value}
                  </span>
                  <p className="text-xs text-gray-400 mt-2">{d.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Main Table Section */}
          <div className="mu-section">
            {/* Section Header */}
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    All Users
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    View and manage all registered users
                  </p>
                </div>
                <button
                  onClick={fetchUsers}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            {/* Search & Filter */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #e5e7eb",
                background: "#f9fafb",
              }}
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by username, email, badge, department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm text-gray-800 bg-white transition"
                    style={{ border: "1px solid #d1d5db", outline: "none" }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{ border: "1px solid #d1d5db" }}
                    className="rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none min-w-[140px]"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ border: "1px solid #d1d5db" }}
                    className="rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none min-w-[140px]"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table Content */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
                <p className="text-gray-500 text-sm font-medium">
                  Loading users...
                </p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users
                  className="w-12 h-12 text-gray-300 mb-3"
                  strokeWidth={1.5}
                />
                <h3 className="text-gray-500 font-medium text-sm mb-1">
                  No users found
                </h3>
                <p className="text-gray-400 text-xs max-w-xs">
                  Click "Add New User" to create your first user.
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search
                  className="w-12 h-12 text-gray-300 mb-3"
                  strokeWidth={1.5}
                />
                <h3 className="text-gray-500 font-medium text-sm mb-1">
                  No matching users
                </h3>
                <p className="text-gray-400 text-xs mb-4">
                  Try adjusting your search or filter.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                    setStatusFilter("all");
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          className="mu-th"
                          onClick={() => handleSort("username")}
                        >
                          <span className="flex items-center gap-1">
                            User {getSortIcon("username")}
                          </span>
                        </th>
                        <th className="mu-th">Email</th>
                        <th className="mu-th">Badge</th>
                        <th className="mu-th">Department</th>
                        <th
                          className="mu-th"
                          onClick={() => handleSort("role")}
                        >
                          <span className="flex items-center gap-1">
                            Role {getSortIcon("role")}
                          </span>
                        </th>
                        <th
                          className="mu-th"
                          onClick={() => handleSort("status")}
                        >
                          <span className="flex items-center gap-1">
                            Status {getSortIcon("status")}
                          </span>
                        </th>
                        <th className="mu-th text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="mu-row">
                          <td className="mu-td">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100">
                                <User className="w-4 h-4 text-gray-500" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 text-sm truncate max-w-[200px]">
                                  {u.username}
                                </div>
                                <div className="text-xs text-gray-500 font-mono mt-0.5">
                                  ID: {u.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="mu-td">
                            <span className="text-sm text-gray-600">
                              {u.email}
                            </span>
                          </td>
                          <td className="mu-td">
                            <span className="text-sm text-gray-600 font-mono">
                              {u.no_badge}
                            </span>
                          </td>
                          <td className="mu-td">
                            <span className="text-sm text-gray-600">
                              {u.department}
                            </span>
                          </td>
                          <td className="mu-td">
                            <span className="text-sm text-gray-700">
                              {u.role === "superadmin"
                                ? "Super Admin"
                                : "Admin"}
                            </span>
                          </td>
                          <td className="mu-td">
                            <span
                              className={`inline-flex items-center gap-1 text-sm ${u.status === "active" ? "text-green-600" : "text-red-600"}`}
                            >
                              {u.status === "active" ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              {u.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="mu-td text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditUser(u)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit User"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleResetPassword(u)}
                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                                title="Reset Password"
                              >
                                <Key className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete User"
                                disabled={u.id === user?.id}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="mu-footer">
                  <p style={{ fontSize: 12, color: "#6b7280" }}>
                    Showing{" "}
                    <span style={{ fontWeight: 600, color: "#374151" }}>
                      {filteredUsers.length}
                    </span>{" "}
                    of{" "}
                    <span style={{ fontWeight: 600, color: "#374151" }}>
                      {users.length}
                    </span>{" "}
                    users
                    {roleFilter !== "all" && (
                      <span
                        style={{
                          marginLeft: 6,
                          padding: "2px 8px",
                          background: "#eff6ff",
                          color: "#2563eb",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        {roleFilter === "admin" ? "Admin" : "Superadmin"}
                      </span>
                    )}
                    {statusFilter !== "all" && (
                      <span
                        style={{
                          marginLeft: 6,
                          padding: "2px 8px",
                          background: "#f3e8ff",
                          color: "#6b21a5",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        {statusFilter === "active" ? "Active" : "Inactive"}
                      </span>
                    )}
                    {searchTerm && (
                      <span style={{ color: "#9ca3af", marginLeft: 4 }}>
                        · "{searchTerm}"
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: 11, color: "#9ca3af" }}>
                    Updated {new Date().toLocaleTimeString("id-ID")}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedPage>
  );
}
