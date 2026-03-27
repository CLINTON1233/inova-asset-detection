"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { API_ENDPOINTS } from "../../config/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    validateToken();
  }, []);

  useEffect(() => {
    if (!loading) {
      checkRouteAccess();
    }
  }, [pathname, loading, user]);

  const validateToken = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const userData = localStorage.getItem("user_data");

      if (!token || !userData) {
        setLoading(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.HEALTH_CHECK?.replace('/health', '/protected') || 'http://localhost:5001/api/protected', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setUser(JSON.parse(userData));
      } else {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
        localStorage.removeItem("remember_me");
        setUser(null);
      }
    } catch (error) {
      console.error("Error validating token:", error);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      localStorage.removeItem("remember_me");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const checkRouteAccess = () => {
    const publicRoutes = ["/login", "/register", "/forgot-password"];

    if (loading) return;
    if (!user && !publicRoutes.includes(pathname)) {
      router.push("/login");
      return;
    }

    if (user && (pathname === "/login" || pathname === "/register")) {
      router.push("/dashboard");
      return;
    }
  };

  const login = async (userData, token) => {
    setUser(userData);
    localStorage.setItem("user_data", JSON.stringify(userData));
    localStorage.setItem("auth_token", token);
    document.cookie = `auth_token=${token}; path=/; max-age=86400`;
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        await fetch('http://localhost:5001/api/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("user_data");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("remember_me");
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      router.push("/login");
    }
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