"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { API_ENDPOINTS } from "../../config/api";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    no_badge: "",
    department: "",
    username: "",
    role: "karyawan",
  });
  const [agree, setAgree] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const images = ["/bg_seatrium 3.png", "/smoe_images2.png", "/offshore.jpg"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!agree) {
      Swal.fire({
        title: "Perhatian",
        text: "Please agree to the terms & policy",
        icon: "warning",
        confirmButtonColor: "#1e40af",
      });
      return;
    }

    // Validasi form
    if (
      !formData.no_badge ||
      !formData.department ||
      !formData.username ||
      !formData.email ||
      !formData.password
    ) {
      Swal.fire({
        title: "Perhatian",
        text: "Please fill all required fields",
        icon: "warning",
        confirmButtonColor: "#1e40af",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Sending registration data:", formData);

      const response = await fetch(API_ENDPOINTS.REGISTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          no_badge: formData.no_badge,
          department: formData.department,
          username: formData.username,
          role: formData.role,
        }),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      const data = await response.json();
      console.log("Response data:", data);

      // Tampilkan SweetAlert sukses
      await Swal.fire({
        title: "Registration Successful!",
        text: "Your account has been created successfully. Redirecting to login...",
        icon: "success",
        confirmButtonColor: "#1e40af",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      // Redirect ke login setelah sukses
      router.push("/login");
    } catch (error) {
      console.error("Registration error:", error);

      // Periksa jika error karena backend tidak terhubung
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        Swal.fire({
          title: "Connection Error",
          text: "Failed to connect to server. Please ensure the backend server is running.",
          icon: "error",
          confirmButtonColor: "#1e40af",
        });
      } else {
        Swal.fire({
          title: "Registration Failed",
          text: error.message || "Registration failed. Please try again.",
          icon: "error",
          confirmButtonColor: "#1e40af",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden">
      {/* Logo pojok kiri atas */}
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-2">
        <Image
          src="/seatrium.png"
          alt="Seatrium Logo"
          width={130}
          height={130}
          className="object-contain"
          priority
        />
      </div>

      {/* Carousel - mobile (atas) & desktop (kanan) */}
      <div className="relative w-full h-48 lg:h-auto lg:flex-1 overflow-hidden order-1 lg:order-2">
        {images.map((img, index) => (
          <Image
            key={index}
            src={img}
            alt={`Carousel ${index}`}
            fill
            className={`object-cover transition-opacity duration-1000 ease-in-out ${index === currentImage ? "opacity-100" : "opacity-0"
              }`}
            priority={index === 0}
          />
        ))}

        {/* Overlay gradient mobile */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent lg:hidden" />

        {/* Indicator dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
          {images.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${index === currentImage ? "bg-white w-6" : "bg-white/50"
                }`}
            />
          ))}
        </div>
      </div>

      {/* Register Form */}
      <div className="flex-1 flex flex-col justify-between bg-white order-2 lg:order-1">
        <div className="flex items-start lg:items-center justify-center px-6 sm:px-8 lg:px-8 pt-4 pb-4 lg:py-0 flex-grow">
          <div className="w-full max-w-md space-y-3">
            {/* Title */}
            <div>
              <h1 className="text-xl sm:text-1xl font-bold text-gray-900">
                Get Started Now!
              </h1>
              <p className="text-gray-600 text-xs sm:text-xs">
                Create your account to access the system
              </p>
            </div>

            {/* Form */}
            <form
              className="mt-2 space-y-3 sm:mt-3 sm:space-y-4"
              onSubmit={handleSubmit}
            >
              <div className="space-y-2 sm:space-y-3">
                {/* Username */}
                <div>
                  <label
                    htmlFor="username"
                    className="block text-xs font-medium text-gray-700 mb-0.5"
                  >
                    Username *
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Choose a username"
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium text-gray-700 mb-0.5"
                  >
                    Email address *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-gray-700 mb-0.5"
                  >
                    Password *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your password"
                  />
                </div>

                {/* Badge Number */}
                <div>
                  <label
                    htmlFor="no_badge"
                    className="block text-xs font-medium text-gray-700 mb-0.5"
                  >
                    Badge Number *
                  </label>
                  <input
                    id="no_badge"
                    name="no_badge"
                    type="text"
                    required
                    value={formData.no_badge}
                    onChange={handleChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your badge number"
                  />
                </div>

                {/* Department */}
                <div>
                  <label
                    htmlFor="department"
                    className="block text-xs font-medium text-gray-700 mb-0.5"
                  >
                    Department *
                  </label>
                  <input
                    id="department"
                    name="department"
                    type="text"
                    required
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your department"
                  />
                </div>

                {/* Role Selection */}
                <div>
                  <label
                    htmlFor="role"
                    className="block text-xs font-medium text-gray-700 mb-0.5"
                  >
                    Role *
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="karyawan">Karyawan</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>

              {/* Terms & Policy */}
              <div className="flex items-center">
                <input
                  id="agree"
                  name="agree"
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="agree"
                  className="ml-2 block text-xs text-gray-700"
                >
                  I agree to the{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    terms & policy
                  </a>
                </label>
              </div>

              {/* Signup Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-2.5 px-3 text-sm font-medium rounded-md text-white transition ${isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    }`}
                >
                  {isLoading ? "Registering..." : "Signup"}
                </button>
              </div>

              {/* Already have account */}
              <div className="text-center">
                <span className="text-gray-600 text-xs sm:text-sm mb-2">
                  Have an account?{" "}
                  <Link
                    href="/login"
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Sign in
                  </Link>
                </span>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-2 text-xs text-gray-500 border-t">
          <div className="font-medium">© 2026 IT Asset Management System</div>
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