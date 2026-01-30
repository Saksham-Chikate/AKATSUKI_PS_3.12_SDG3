/**
 * Auth Context
 * ============
 * Global authentication state management using React Context.
 * Handles login, logout, and persistent sessions.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '@/lib/api';

// Types
interface Clinic {
  id: string;
  name: string;
  email: string;
  locationType?: string;
}

interface AuthContextType {
  clinic: Clinic | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateClinic: (data: Partial<Clinic>) => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  locationType?: string;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Component
 * Wraps the application and provides authentication state
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load saved auth state from localStorage on mount
   */
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedClinic = localStorage.getItem('clinic');

    if (savedToken && savedClinic) {
      setToken(savedToken);
      try {
        setClinic(JSON.parse(savedClinic));
      } catch (e) {
        // Invalid stored clinic data
        localStorage.removeItem('clinic');
      }
    }
    
    setLoading(false);
  }, []);

  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    
    if (response.success) {
      const { clinic: clinicData, token: authToken } = response.data;
      
      // Save to state
      setClinic(clinicData);
      setToken(authToken);
      
      // Persist to localStorage
      localStorage.setItem('token', authToken);
      localStorage.setItem('clinic', JSON.stringify(clinicData));
    } else {
      throw new Error(response.message || 'Login failed');
    }
  }, []);

  /**
   * Register new clinic
   */
  const register = useCallback(async (data: RegisterData) => {
    const response = await authAPI.register(data);
    
    if (response.success) {
      const { clinic: clinicData, token: authToken } = response.data;
      
      // Save to state
      setClinic(clinicData);
      setToken(authToken);
      
      // Persist to localStorage
      localStorage.setItem('token', authToken);
      localStorage.setItem('clinic', JSON.stringify(clinicData));
    } else {
      throw new Error(response.message || 'Registration failed');
    }
  }, []);

  /**
   * Logout and clear auth state
   */
  const logout = useCallback(() => {
    // Clear state
    setClinic(null);
    setToken(null);
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('clinic');
  }, []);

  /**
   * Update clinic data in state and storage
   */
  const updateClinic = useCallback((data: Partial<Clinic>) => {
    setClinic((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem('clinic', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Context value
  const value: AuthContextType = {
    clinic,
    token,
    isAuthenticated: !!token && !!clinic,
    loading,
    login,
    register,
    logout,
    updateClinic,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default AuthContext;
