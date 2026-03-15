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

  // Initialize form data from user context
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

    // Validation
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

      // Kirim data ke backend
      const response = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id, // Kirim user_id dari context
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

      // Update localStorage dengan data baru
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

      // Refresh page untuk update context
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
    // Validation
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

      // Kirim request ganti password 
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

      // Clear password fields
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
    // Reset form data to original user data
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

  // If no user data, show loading
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
    <ProtectedPage> {
    <LayoutDashboard activeMenu={7}>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                <p className="mt-2 text-gray-600">
                  Manage your personal information and account settings
                </p>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className={`flex items-center px-4 py-2 rounded-lg transition ${
                  isEditing
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
          </div>

          {/* Row 1: Personal Information dan Profile Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Personal Information Card - 2/3 kolom */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center">
                    <User className="w-5 h-5 text-blue-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      Personal Information
                    </h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Update your personal details
                  </p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          Username
                        </div>
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                          isEditing
                            ? "bg-white border-gray-300"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          Email Address
                        </div>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                          isEditing
                            ? "bg-white border-gray-300"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      />
                    </div>

                    {/* Badge Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center">
                          <BadgeCheck className="w-4 h-4 text-gray-400 mr-2" />
                          Badge Number
                        </div>
                      </label>
                      <input
                        type="text"
                        name="no_badge"
                        value={formData.no_badge}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                          isEditing
                            ? "bg-white border-gray-300"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      />
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 text-gray-400 mr-2" />
                          Department
                        </div>
                      </label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                          isEditing
                            ? "bg-white border-gray-300"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      />
                    </div>

                    {/* Join Date (Read Only) */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          Account Created Date
                        </div>
                      </label>
                      <input
                        type="date"
                        name="join_date"
                        value={formData.join_date}
                        disabled={true}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Account creation date cannot be changed
                      </p>
                    </div>
                  </div>

                  {/* Action buttons when editing */}
                  {isEditing && (
                    <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-100">
                      <button
                        onClick={handleCancelEdit}
                        disabled={isLoading}
                        className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isLoading}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {isLoading ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
            </div>

            {/* Profile Summary Card - 1/3 kolom */}
         <div>
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
    <div className="px-6 py-4 border-b border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900">
        Profile Summary
      </h2>
    </div>

    <div className="p-6">
      <div className="flex flex-col items-center">
        {/* Avatar */}
        <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6 border border-gray-200 shadow-sm">
          <User className="w-16 h-16 text-gray-500" />
        </div>

        <h3 className="text-xl font-bold text-gray-900">
          {formData.username}
        </h3>
        <p className="text-gray-600 mt-1">Staff</p>

        <div className="mt-4 text-sm text-gray-500 text-center">
          <p className="flex items-center justify-center">
            <Mail className="w-4 h-4 mr-2" />
            {formData.email}
          </p>
          <p className="flex items-center justify-center mt-2">
            <BadgeCheck className="w-4 h-4 mr-2" />
            {formData.no_badge}
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Department:</span>
          <span className="font-medium">{formData.department}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Account Created:</span>
          <span className="font-medium">{formData.join_date}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Status:</span>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            Active
          </span>
        </div>
      </div>
    </div>
  </div>
</div>

          </div>

          {/* Row 2: Security Settings - Full width di bawah kedua card */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center">
                  <Lock className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Security Settings
                  </h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Update your password and security preferences
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Password Input Section */}
                  <div className="lg:col-span-2">
                    <div className="space-y-4">
                      {/* Current Password */}
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
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
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

                      {/* New Password */}
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
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
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

                      {/* Confirm Password */}
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
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
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

                  {/* Password Requirements Section */}
                  <div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 h-full">
                      <h4 className="text-sm font-medium text-blue-800 mb-3">
                        Password Requirements:
                      </h4>
                      <ul className="space-y-2 text-sm text-blue-700">
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          At least 8 characters
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Contains uppercase letter
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Contains lowercase letter
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Contains number or special character
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Change Password Button */}
                <div className="mt-6">
                  <button
                    onClick={handleChangePassword}
                    disabled={isLoading}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </div>
                    ) : (
                      "Change Password"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutDashboard>
    }</ProtectedPage>
  );
}
