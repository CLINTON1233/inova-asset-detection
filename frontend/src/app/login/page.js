"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";
import { API_ENDPOINTS } from "../../config/api";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  // Carousel images
  const images = ["/bg_seatrium 3.png", "/smoe_images2.png", "/offshore.jpg"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  // Cek remember me pada mount
  useEffect(() => {
    const savedRemember = localStorage.getItem("remember_me");
    if (savedRemember === "true") {
      setRememberMe(true);

      // Coba ambil credential dari localStorage jika ada
      const savedEmail = localStorage.getItem("saved_email");
      if (savedEmail) {
        setFormData((prev) => ({
          ...prev,
          email: savedEmail,
        }));
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validasi form
      if (!formData.email || !formData.password) {
        Swal.fire({
          title: "Validation Error",
          text: "Please fill in all required fields.",
          icon: "error",
          confirmButtonColor: "#1e40af",
          background: "#ffffff",
          color: "#333333",
          customClass: {
            popup: "rounded-xl font-poppins",
            confirmButton: "px-4 py-2 text-sm font-medium rounded-lg",
          },
        });
        setIsLoading(false);
        return;
      }

      // Show loading
      Swal.fire({
        title: "Authenticating...",
        text: "Please wait while we verify your credentials.",
        icon: "info",
        showConfirmButton: false,
        allowOutsideClick: false,
        background: "#ffffff",
        color: "#333333",
        customClass: {
          popup: "rounded-xl font-poppins",
        },
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Kirim request login ke backend
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Simpan email jika remember me di-check
        if (rememberMe) {
          localStorage.setItem("saved_email", formData.email);
          localStorage.setItem("remember_me", "true");
        } else {
          localStorage.removeItem("saved_email");
          localStorage.removeItem("remember_me");
        }

        // Simpan token dan user data
        if (result.token) {
          localStorage.setItem("auth_token", result.token);
          localStorage.setItem("user_data", JSON.stringify(result.user));
          document.cookie = `auth_token=${result.token}; path=/; max-age=86400`; // 1 hari

          // Tambahkan role ke user data jika belum ada (untuk backward compatibility)
          if (!result.user.role) {
            result.user.role = "karyawan"; // Default role
          }

          login(result.user, result.token);
        }

        // Tutup loading SweetAlert
        Swal.close();

        // Success Notification dengan role info
        const userRole =
          result.user.role === "manager" ? "Manager" : "Karyawan";
        const greeting =
          result.user.role === "manager"
            ? `Welcome, Manager ${result.user.name || result.user.username}!`
            : `Welcome back, ${result.user.name || result.user.username}!`;

        await Swal.fire({
          title: "Login Successful!",
          html: `
            <div class="text-center">
              <p class="mb-2">${greeting}</p>
              
            </div>
          `,
          icon: "success",
          confirmButtonColor: "#1e40af",
          background: "#ffffff",
          color: "#333333",
          customClass: {
            popup: "rounded-xl font-poppins",
            confirmButton: "px-4 py-2 text-sm font-medium rounded-lg",
          },
          timer: 1500,
          showConfirmButton: false,
        });

        // Redirect berdasarkan role
        if (result.user.role === "manager") {
          // Bisa redirect ke dashboard khusus manager
          router.push("/dashboard");
        } else {
          // Redirect ke dashboard karyawan
          router.push("/dashboard");
        }
      } else {
        // Error dari backend
        throw new Error(result.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      Swal.close();

      let errorMessage = "Login failed. Please try again.";

      if (
        error.message.includes("Invalid email") ||
        error.message.includes("Invalid username")
      ) {
        errorMessage = "Invalid email/username or password.";
      } else if (error.message.includes("account is not active")) {
        errorMessage =
          "Your account is not active. Please contact administrator.";
      } else if (
        error.message.includes("Network") ||
        error.message.includes("fetch")
      ) {
        errorMessage =
          "Cannot connect to server. Please check your connection.";
      } else if (error.message.includes("role")) {
        errorMessage = "Account configuration error. Please contact admin.";
      } else {
        errorMessage = error.message;
      }

      // Error Notification
      Swal.fire({
        title: "Error",
        text: errorMessage,
        icon: "error",
        confirmButtonColor: "#1e40af",
        background: "#ffffff",
        color: "#333333",
        customClass: {
          popup: "rounded-xl font-poppins",
          confirmButton: "px-4 py-2 text-sm font-medium rounded-lg",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative bg-white">
      {/* Logo top-left */}
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-2">
        <Image
          src="/seatrium.png"
          alt="Seatrium Logo"
          width={150}
          height={150}
          className="object-contain"
        />
      </div>

      {/* Image Carousel */}
      <div className="relative w-full h-56 sm:h-64 lg:h-auto lg:flex-1 overflow-hidden order-1 lg:order-2">
        {images.map((img, index) => (
          <Image
            key={index}
            src={img}
            alt={`Carousel ${index}`}
            fill
            className={`object-cover transition-opacity duration-1000 ease-in-out ${
              index === currentImage ? "opacity-100" : "opacity-0"
            }`}
            priority={index === 0}
          />
        ))}

        {/* Overlay gradient for mobile */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent lg:hidden" />

        {/* Indicator dots */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
          {images.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                index === currentImage ? "bg-white w-5 sm:w-8" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex flex-col justify-between bg-white order-2 lg:order-1">
        <div className="flex items-start lg:items-center justify-center px-10 sm:px-12 lg:px-8 pt-6 pb-8 lg:py-0 flex-grow">
          <div className="max-w-md w-full space-y-4 lg:space-y-8">
            {/* Title */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                Welcome Back!
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm">
                Enter your credentials to access your account
              </p>
            </div>

            {/* Form */}
            <form
              className="space-y-4 sm:space-y-5 lg:space-y-6"
              onSubmit={handleSubmit}
            >
              <div className="space-y-3 sm:space-y-4">
                {/* Email/Username */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
                  >
                    Email or Username
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-2 py-2 sm:px-3 sm:py-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email or username"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="password"
                      className="block text-xs sm:text-sm font-medium text-gray-700"
                    >
                      Password
                    </label>
                    {/* <Link
                      href="/forgot-password"
                      className="text-xs sm:text-sm text-blue-600 hover:text-blue-500"
                    >
                      Forgot password?
                    </Link> */}
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-2 py-2 sm:px-3 sm:py-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-start sm:items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5 sm:mt-0"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-xs sm:text-sm text-gray-700"
                >
                  Remember me
                </label>
              </div>

              {/* Login Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium rounded-md text-white transition ${
                    isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  }`}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </button>
              </div>

              {/* Register Link */}
              <div className="text-center pt-2">
                <p className="text-gray-600 text-xs sm:text-sm mb-2">
                  Don't have an account?{" "}
                  <Link
                    href="/register"
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
    <footer className="text-center py-3 sm:py-4 text-xs sm:text-sm text-gray-500 border-t">
  <div className="font-medium">
    © 2026 IT Asset Management System
  </div>
  <div>
    <a
      href="https://seatrium.com"
      target="_blank"
      rel="noopener noreferrer"
      className="text-gray-500 hover:text-gray-700 font-medium"
    >
      Seatrium
    </a>{" "}
    <span className="text-gray-400">• All rights reserved.</span>
  </div>
</footer>

      </div>
    </div>
  );
}
