"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  ChevronDown,
  Home,
  FileText,
  Shield,
  Calendar,
  HelpCircle,
  Settings,
  Bell,
  Menu,
  X,
  User,
  LogOut,
  Package,
  User as UserIcon,
  Key,
  CheckCircle,
  ScanLine,
  Plus,
  List,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";

export default function LayoutDashboard({ children, activeMenu }) {
  const [activeMenuIndex, setActiveMenuIndex] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [scanDropdownOpen, setScanDropdownOpen] = useState(false);
  const [mobileScanDropdownOpen, setMobileScanDropdownOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const userDropdownRef = useRef(null);
  const scanDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const router = useRouter();
  const { user, logout } = useAuth();

  // Format current date
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      setCurrentDate(now.toLocaleDateString("en-US", options));
    };

    updateDate();
    const interval = setInterval(updateDate, 60000);

    return () => clearInterval(interval);
  }, []);

  // Show welcome notification when user first loads
  useEffect(() => {
    if (user && !hasShownWelcome) {
      const timer = setTimeout(() => {
        setShowWelcome(true);
        setHasShownWelcome(true);

        const hideTimer = setTimeout(() => {
          setShowWelcome(false);
        }, 5000);

        return () => clearTimeout(hideTimer);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, hasShownWelcome]);

  // ==================== MENU ITEMS BASED ON ROLE ====================

  // Menu untuk ADMIN (bisa scan, create preparation, dll)
  const adminMenuItems = [
    {
      icon: Home,
      label: "Home",
      hasDropdown: false,
      href: "/dashboard",
      menuId: "home",
    },
    {
      icon: ScanLine,
      label: "Assets Scanning",
      hasDropdown: true,
      href: "#",
      menuId: "assets_scanning",
      submenu: [
        {
          icon: Plus,
          label: "Create Preparation",
          href: "/create_scanning_preparation",
          menuId: "create_preparation",
        },
        {
          icon: List,
          label: "Preparation List",
          href: "/scanning_preparation_list",
          menuId: "preparation_list",
        },
        {
          icon: ScanLine,
          label: "Start Scanning",
          href: "/scanning",
          menuId: "start_scanning",
        },
        {
          icon: CheckCircle,
          label: "Validation & Verification",
          href: "/validation_verification",
          menuId: "validation",
        },
      ],
    },
    {
      icon: FileText,
      label: "Assets Inventory",
      hasDropdown: false,
      href: "/assets",
      menuId: "assets_inventory",
    },
    {
      icon: Calendar,
      label: "History & Activity Log",
      hasDropdown: false,
      href: "/history",
      menuId: "history",
    },
    {
      icon: Settings,
      label: "Reports & Analytics",
      hasDropdown: false,
      href: "/reports",
      menuId: "reports",
    },
  ];

  // Menu untuk SUPERADMIN (hanya monitoring, tidak bisa scanning)
  const superadminMenuItems = [
    {
      icon: Home,
      label: "Home",
      hasDropdown: false,
      href: "/dashboard",
      menuId: "home",
    },
    {
      icon: FileText,
      label: "Assets Inventory",
      hasDropdown: false,
      href: "/assets",
      menuId: "assets_inventory",
    },
    {
      icon: Calendar,
      label: "History & Activity Log",
      hasDropdown: false,
      href: "/history",
      menuId: "history",
    },
    {
      icon: Settings,
      label: "Reports & Analytics",
      hasDropdown: false,
      href: "/reports",
      menuId: "reports",
    },
  ];

  // Pilih menu berdasarkan role user
  const getMenuItems = () => {
    if (!user) return adminMenuItems;

    // Superadmin hanya mendapat menu monitoring
    if (user.role === "superadmin") {
      return superadminMenuItems;
    }

    // Admin dan role lainnya mendapat full akses
    return adminMenuItems;
  };

  const menuItems = getMenuItems();

  // ==================== FUNGSI UNTUK MENDAPATKAN INDEX MENU BERDASARKAN MENU ID ====================
  const getActiveMenuIndex = () => {
    if (activeMenu === undefined || activeMenu === null) return null;

    // Cari index menu berdasarkan menuId yang sesuai dengan activeMenu
    const index = menuItems.findIndex((item) => item.menuId === activeMenu);

    // Jika ditemukan, return index tersebut
    if (index !== -1) return index;

    // Fallback: jika activeMenu adalah angka, gunakan langsung
    if (typeof activeMenu === "number") return activeMenu;

    return null;
  };

  // Hitung active menu index berdasarkan activeMenu prop
  const computedActiveMenuIndex = getActiveMenuIndex();

  // Handle click outside untuk menutup dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setUserDropdownOpen(false);
      }
      if (
        scanDropdownRef.current &&
        !scanDropdownRef.current.contains(event.target)
      ) {
        setScanDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        mobileMenuOpen
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
  };

  const handleLogout = () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);

    Swal.fire({
      title: "Logout Confirmation",
      text: "Are you sure you want to log out of the system?",
      icon: "warning",
      iconColor: "#FACC15",
      showCancelButton: true,
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Log Out!",
      reverseButtons: true,
      cancelButtonText: "Cancel",
      background: "#ffffff",
      color: "#333333",
      customClass: {
        popup: "rounded-xl font-poppins",
        confirmButton: "px-6 py-2 rounded-lg font-medium",
        cancelButton: "px-6 py-2 rounded-lg font-medium",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Logging out...",
          text: "Processing your logout...",
          icon: "info",
          iconColor: "#2794ecff",
          showConfirmButton: false,
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        setTimeout(() => {
          logout();
          Swal.fire({
            title: "Success!",
            text: "You have been successfully logged out",
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
          }).then(() => {
            router.push("/login");
          });
        }, 1500);
      }
    });
  };

  const handleSubmenuClick = (href) => {
    setScanDropdownOpen(false);
    setMobileScanDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push(href);
  };

  // Jika user belum loaded, tampilkan loading
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 🔹 Role Badge di Welcome Notification */}
      {showWelcome && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="w-80 bg-white rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-gray-900">
                  Welcome
                </span>
              </div>
              <button
                onClick={handleCloseWelcome}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                Welcome back,&nbsp;
                <span className="font-semibold text-blue-600">
                  {user.username}
                </span>
              </p>
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                <div>
                  <span className="font-medium text-gray-600">Role:</span>{" "}
                  <span
                    className={`font-semibold ${user.role === "superadmin" ? "text-purple-600" : "text-blue-600"}`}
                  >
                    {user.role === "superadmin" ? "Super Admin" : "Admin"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Department:</span>{" "}
                  {user.department}
                </div>
                <div>
                  <span className="font-medium text-gray-600">Badge:</span>{" "}
                  {user.no_badge}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 Top Navbar - Mobile & Desktop */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image
              src="/logo_inovaa.png"
              alt="Inova Logo"
              width={220}
              height={200}
              className="object-contain"
              priority
            />
          </div>

          <div className="flex items-center space-x-2">
            <button className="hidden md:block p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-2 right-2 block h-2 w-2 rounded-full ring-2 ring-white bg-red-500"></span>
            </button>

            {/* User Dropdown - Desktop */}
            <div className="hidden md:block relative" ref={userDropdownRef}>
              <button
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                <User className="w-4 h-4" />
                <span>{user.username}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    userDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user.username}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-500">{user.department}</p>
                    <p className="text-xs font-semibold mt-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${user.role === "superadmin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                      >
                        {user.role === "superadmin" ? "Super Admin" : "Admin"}
                      </span>
                    </p>
                  </div>
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setMobileMenuOpen(false);
                      router.push("/profile");
                    }}
                  >
                    <UserIcon className="w-4 h-4 mr-3 text-gray-500" />
                    View Profile
                  </button>
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setMobileMenuOpen(false);
                      router.push("/profile?tab=password");
                    }}
                  >
                    <Key className="w-4 h-4 mr-3 text-gray-500" />
                    Change Password
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-2 right-2 block h-2 w-2 rounded-full ring-2 ring-white bg-red-500"></span>
            </button>

            <button
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-5 h-5 text-gray-800" />
            </button>
          </div>
        </div>

        {/* Desktop Menu - Hanya untuk role yang sesuai */}
        <div className="hidden md:block bg-blue-600 px-4">
          <div className="flex flex-wrap items-center gap-1 py-2">
            {menuItems.map((item, index) => {
              // Gunakan computedActiveMenuIndex untuk menentukan apakah menu aktif
              const isActive = computedActiveMenuIndex === index;

              // Untuk Superadmin, Assets Scanning tidak ditampilkan
              if (
                user.role === "superadmin" &&
                item.label === "Assets Scanning"
              ) {
                return null;
              }

              if (item.label === "Assets Scanning") {
                return (
                  <div key={index} className="relative" ref={scanDropdownRef}>
                    <button
                      className={`flex items-center space-x-1 px-3 py-2 text-white hover:bg-blue-700 whitespace-nowrap text-sm transition ${
                        isActive ? "bg-blue-700" : ""
                      }`}
                      onClick={() => setScanDropdownOpen(!scanDropdownOpen)}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          scanDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {scanDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        {item.submenu.map((subItem, subIndex) => (
                          <button
                            key={subIndex}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                            onClick={() => handleSubmenuClick(subItem.href)}
                          >
                            <subItem.icon className="w-4 h-4 mr-3 text-blue-500" />
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={index}
                  className={`flex items-center space-x-1 px-3 py-2 text-white hover:bg-blue-700 whitespace-nowrap text-sm transition ${
                    isActive ? "bg-blue-700" : ""
                  }`}
                  onClick={() => {
                    if (item.href) {
                      router.push(item.href);
                    } else {
                      setActiveMenuIndex(
                        index === activeMenuIndex ? null : index,
                      );
                    }
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.hasDropdown && <ChevronDown className="w-3 h-3" />}
                </button>
              );
            })}

            <div className="ml-auto text-white text-sm py-2 px-3 opacity-80">
              {currentDate}
            </div>
          </div>
        </div>
      </nav>

      {/* 🔹 Mobile Sidebar Menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          ></div>

          <div
            ref={mobileMenuRef}
            className="fixed top-0 left-0 h-full w-64 bg-blue-600 z-50 md:hidden overflow-y-auto shadow-xl"
          >
            <div className="bg-blue-700 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <div className="w-4 h-1 border-t-2 border-blue-600 rounded-full"></div>
                </div>
                <span className="text-white font-bold">Inova</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 hover:bg-blue-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* User Section */}
            <div className="bg-blue-500 px-4 py-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center text-white">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">
                    {user.username}
                  </div>
                  <div className="text-blue-100 text-xs">{user.department}</div>
                  <div className="mt-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${user.role === "superadmin" ? "bg-purple-700 text-white" : "bg-blue-700 text-white"}`}
                    >
                      {user.role === "superadmin" ? "Super Admin" : "Admin"}
                    </span>
                  </div>
                  <button
                    className="text-blue-100 text-xs flex items-center mt-1 hover:text-white transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserDropdownOpen(!userDropdownOpen);
                    }}
                  >
                    <span>Account Settings</span>
                    <ChevronDown
                      className={`w-3 h-3 ml-1 transition-transform ${
                        userDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {userDropdownOpen && (
                <div className="mt-2 bg-blue-400 rounded-lg p-2 space-y-1">
                  <button
                    className="flex items-center w-full text-white text-sm hover:bg-blue-500 px-3 py-2 rounded transition"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setMobileMenuOpen(false);
                      router.push("/profile");
                    }}
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    View Profile
                  </button>
                  <button
                    className="flex items-center w-full text-white text-sm hover:bg-blue-500 px-3 py-2 rounded transition"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setMobileMenuOpen(false);
                      router.push("/profile?tab=password");
                    }}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </button>
                  <div className="border-t border-blue-300 my-1"></div>
                  <button
                    className="flex items-center w-full text-red-200 text-sm hover:bg-blue-500 hover:text-red-100 px-3 py-2 rounded transition"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Menu Items - Mobile */}
            <div className="py-2">
              {menuItems.map((item, index) => {
                const isActive = computedActiveMenuIndex === index;

                // Superadmin tidak dapat mengakses menu Assets Scanning
                if (
                  user.role === "superadmin" &&
                  item.label === "Assets Scanning"
                ) {
                  return null;
                }

                return (
                  <div key={index}>
                    <button
                      className={`flex items-center space-x-3 px-4 py-3 text-white hover:bg-blue-700 text-sm transition w-full text-left ${
                        isActive ? "bg-blue-700" : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.label === "Assets Scanning") {
                          setMobileScanDropdownOpen(!mobileScanDropdownOpen);
                        } else if (item.href && item.href !== "#") {
                          router.push(item.href);
                          setMobileMenuOpen(false);
                        } else {
                          setActiveMenuIndex(
                            index === activeMenuIndex ? null : index,
                          );
                        }
                      }}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.hasDropdown && (
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            mobileScanDropdownOpen &&
                            item.label === "Assets Scanning"
                              ? "rotate-180"
                              : ""
                          }`}
                        />
                      )}
                    </button>

                    {/* Submenu untuk mobile - Assets Scanning */}
                    {item.label === "Assets Scanning" &&
                      mobileScanDropdownOpen && (
                        <div className="bg-blue-500 py-1">
                          {item.submenu.map((subItem, subIndex) => (
                            <button
                              key={subIndex}
                              className="flex items-center w-full px-6 py-3 text-white hover:bg-blue-600 text-sm transition text-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(subItem.href);
                                setMobileMenuOpen(false);
                                setMobileScanDropdownOpen(false);
                              }}
                            >
                              <subItem.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                              {subItem.label}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-blue-700 px-4 py-3 text-white text-xs text-center">
              {currentDate}
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
        {children}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }

        @media (max-width: 768px) {
          .fixed {
            pointer-events: auto;
          }
        }
      `}</style>
    </div>
  );
}
