// src/lib/auth.js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'; 

export const authUtils = {
  // Get token from localStorage
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  },

  // Get user data from localStorage
  getUser: () => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      return !!(token && userData);
    }
    return false;
  },

  // Validate token dengan backend
  validateToken: async () => {
    try {
      const token = authUtils.getToken();
      if (!token) return false;

      const response = await fetch(`${API_URL}/api/protected`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  },

  // Logout user dengan backend
  logout: async () => {
    try {
      const token = authUtils.getToken();
      
      // Panggil API logout di backend
      if (token) {
        await fetch(`${API_URL}/api/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Tetap clear localStorage meskipun API gagal
      authUtils.clearAuthData();
    }
  },

  // Clear semua data auth
  clearAuthData: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('remember_me');
    }
  },

  // Get authorization header for API calls
  getAuthHeader: () => {
    const token = authUtils.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  // Redirect to login jika tidak authenticated
  requireAuth: (router) => {
    if (!authUtils.isAuthenticated()) {
      router.push('/login');
      return false;
    }
    return true;
  }
};