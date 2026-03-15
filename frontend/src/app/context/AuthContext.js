"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Redirect ke login jika tidak authenticated dan mencoba akses protected route
    if (!loading) {
      checkRouteAccess();
    }
  }, [pathname, loading]);

  const checkAuth = () => {
    try {
      const userData = localStorage.getItem("user_data");
      const token = localStorage.getItem("auth_token");

      if (userData && token) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      localStorage.removeItem("user_data");
      localStorage.removeItem("auth_token");
    } finally {
      setLoading(false);
    }
  };

  const checkRouteAccess = () => {
    // Routes yang boleh diakses tanpa login
    const publicRoutes = ["/login", "/register", "/forgot-password"];

    if (loading) return;

    // Jika user belum login dan mencoba akses protected route
    if (!user && !publicRoutes.includes(pathname)) {
      router.push("/login");
      return;
    }

    // Jika user sudah login tapi mencoba akses login/register
    if (user && (pathname === "/login" || pathname === "/register")) {
      router.push("/dashboard");
      return;
    }
  };

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem("user_data", JSON.stringify(userData));
    localStorage.setItem("auth_token", token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user_data");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("remember_me");

    // Clear cookies juga
    document.cookie =
      "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";

    router.push("/login");
  };

  const value = {
    user,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
