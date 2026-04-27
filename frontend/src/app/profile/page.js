"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  BadgeCheck,
  Building,
  Calendar,
  Save,
  Edit,
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  Shield,
  Key,
  AlertCircle,
  Clock,
  Activity,
  ShieldCheck,
} from "lucide-react";
import LayoutDashboard from "../components/LayoutDashboard";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";
import { API_ENDPOINTS } from '../../config/api';
import ProtectedPage from "../components/ProtectedPage";

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    no_badge: "",
    department: "",
    join_date: "",
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        no_badge: user.no_badge || "",
        department: user.department || "",
        join_date: user.created_at
          ? new Date(user.created_at).toISOString().split("T")[0]
          : "2024-01-01",
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    if (
      !formData.username ||
      !formData.email ||
      !formData.no_badge ||
      !formData.department
    ) {
      Swal.fire({
        title: "Validation Error",
        text: "Please fill in all required fields",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          username: formData.username,
          email: formData.email,
          no_badge: formData.no_badge,
          department: formData.department,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      const currentUserData = JSON.parse(
        localStorage.getItem("user_data") || "{}",
      );
      const updatedUserData = {
        ...currentUserData,
        username: formData.username,
        email: formData.email,
        no_badge: formData.no_badge,
        department: formData.department,
        created_at: data.user.created_at,
      };

      localStorage.setItem("user_data", JSON.stringify(updatedUserData));

      await Swal.fire({
        title: "Success!",
        text: data.message || "Profile updated successfully",
        icon: "success",
        confirmButtonColor: "#1e40af",
      });

      window.location.reload();
      setIsEditing(false);
    } catch (error) {
      console.error("Update profile error:", error);
      Swal.fire({
        title: "Error",
        text: error.message || "Failed to update profile. Please try again.",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (
      !passwordData.current_password ||
      !passwordData.new_password ||
      !passwordData.confirm_password
    ) {
      Swal.fire({
        title: "Validation Error",
        text: "Please fill in all password fields",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      Swal.fire({
        title: "Password Mismatch",
        text: "New password and confirm password do not match",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
      return;
    }

    if (passwordData.new_password.length < 6) {
      Swal.fire({
        title: "Weak Password",
        text: "Password must be at least 6 characters long",
        icon: "warning",
        confirmButtonColor: "#1e40af",
      });
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to change password");
      }

      await Swal.fire({
        title: "Success!",
        text: data.message || "Password changed successfully",
        icon: "success",
        confirmButtonColor: "#1e40af",
      });

      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (error) {
      console.error("Change password error:", error);
      Swal.fire({
        title: "Error",
        text: error.message || "Failed to change password. Please try again.",
        icon: "error",
        confirmButtonColor: "#1e40af",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        no_badge: user.no_badge || "",
        department: user.department || "",
        join_date: user.created_at
          ? new Date(user.created_at).toISOString().split("T")[0]
          : "2024-01-01",
      });
    }
    setIsEditing(false);
  };

  if (!user) {
    return (
      <LayoutDashboard activeMenu={7}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </LayoutDashboard>
    );
  }

  return (
    <ProtectedPage>
      <LayoutDashboard activeMenu={7}>
        <style jsx>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
          .profile-root { font-family: 'DM Sans', sans-serif; }
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
          .input-field {
            transition: all 0.2s ease;
          }
          .input-field:focus {
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }
          .btn-primary {
            background: #2563eb;
            transition: all 0.2s ease;
          }
          .btn-primary:hover {
            background: #1d4ed8;
          }
          .btn-secondary {
            transition: all 0.2s ease;
          }
          .btn-secondary:hover {
            background: #f3f4f6;
          }
          .stat-box-grey {
            background-color: #f9fafb;
            border: 1px solid #f3f4f6;
            border-radius: 12px;
            padding: 12px;
          }
        `}</style>

        <div className="profile-root space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-lg font-bold text-gray-900">Profile Settings</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your personal information and account security
              </p>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${isEditing
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Saving...
                </>
              ) : isEditing ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </>
              )}
            </button>
          </div>

          {/* Main Grid */}
          <div className="flex flex-col xl:flex-row gap-5">
            {/* Left Column - Profile Summary (Extended) */}
            <div className="w-full xl:w-80 flex-shrink-0">
              <div className="card overflow-hidden h-full flex flex-col">
                <div className="bg-[#1e3a5f] text-white text-center py-4 px-4 font-bold text-sm uppercase tracking-wide">
                  Profile Summary
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-28 h-28 bg-gray-100 rounded-full flex items-center justify-center mb-4 border-2 border-gray-200">
                      <User className="w-14 h-14 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{formData.username}</h3>
                    <p className="text-gray-500 text-sm mt-1 capitalize">
                      {user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'Staff'}
                    </p>
                    <span className="mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Active Account
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-4"></div>

                  {/* Contact Information Section */}
                  <div className="space-y-4 flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Contact Information
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3 py-2">
                        <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Email Address</p>
                          <p className="text-sm font-medium text-gray-800 break-all">{formData.email}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 py-2">
                        <BadgeCheck className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Badge Number</p>
                          <p className="text-sm font-medium text-gray-800">{formData.no_badge}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 py-2">
                        <Building className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Department</p>
                          <p className="text-sm font-medium text-gray-800">{formData.department}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 py-2">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Account Created</p>
                          <p className="text-sm font-medium text-gray-800">{formData.join_date}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info Section */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Account Information
                    </p>
                    <div className="space-y-2">

                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-gray-500">Account Type</span>
                        <span className="text-xs font-semibold text-gray-700">Staff</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-gray-500">Last Login</span>
                        <span className="text-xs text-gray-600">{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Personal Information & Security */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* Personal Information Card */}
              <div className="card">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                  <p className="text-sm text-gray-500 mt-1">Update your personal details and contact information</p>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${isEditing
                          ? "bg-white border-gray-300"
                          : "bg-gray-50 border-gray-200 text-gray-500"
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${isEditing
                          ? "bg-white border-gray-300"
                          : "bg-gray-50 border-gray-200 text-gray-500"
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Badge Number
                      </label>
                      <input
                        type="text"
                        name="no_badge"
                        value={formData.no_badge}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${isEditing
                          ? "bg-white border-gray-300"
                          : "bg-gray-50 border-gray-200 text-gray-500"
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department
                      </label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${isEditing
                          ? "bg-white border-gray-300"
                          : "bg-gray-50 border-gray-200 text-gray-500"
                          }`}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Created Date
                      </label>
                      <input
                        type="date"
                        name="join_date"
                        value={formData.join_date}
                        disabled={true}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                      />
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Account creation date cannot be changed
                      </p>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                      <button
                        onClick={handleCancelEdit}
                        disabled={isLoading}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Saving...
                          </div>
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Settings Card */}
              <div className="card">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
                  <p className="text-sm text-gray-500 mt-1">Update your password and security preferences</p>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              name="current_password"
                              value={passwordData.current_password}
                              onChange={handlePasswordChange}
                              placeholder="Enter your current password"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              name="new_password"
                              value={passwordData.new_password}
                              onChange={handlePasswordChange}
                              placeholder="Enter new password"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showNewPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              name="confirm_password"
                              value={passwordData.confirm_password}
                              onChange={handlePasswordChange}
                              placeholder="Confirm new password"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Key className="w-4 h-4 text-gray-600" />
                          <h4 className="text-sm font-medium text-gray-700">
                            Password Requirements:
                          </h4>
                        </div>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            At least 6 characters
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Can contain letters and numbers
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Case sensitive
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Cannot be same as current password
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <button
                      onClick={handleChangePassword}
                      disabled={isLoading}
                      className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Updating Password...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Lock className="w-4 h-4" />
                          Change Password
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedPage>
  );
}