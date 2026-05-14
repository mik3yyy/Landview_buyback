import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../api/client';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'admin' | 'accountant';
}

export interface OtpChallenge {
  sessionId: string;
  maskedEmail: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<OtpChallenge>;
  verifyOtp: (sessionId: string, code: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdminOrAbove: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('token');
      if (stored) {
        try {
          const res = await authAPI.me();
          setUser(res.data);
          setToken(stored);
        } catch {
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password: string): Promise<OtpChallenge> => {
    const res = await authAPI.login(email, password);
    // Always returns requiresOtp: true now
    return { sessionId: res.data.sessionId, maskedEmail: res.data.maskedEmail };
  };

  const verifyOtp = async (sessionId: string, code: string): Promise<void> => {
    const res = await authAPI.verifyOtp(sessionId, code);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      verifyOtp,
      logout,
      loading,
      isSuperAdmin: user?.role === 'super_admin',
      isAdminOrAbove: user?.role === 'super_admin' || user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
