'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { initSession, restoreSession, clearSession } from '../utils/session';
import type { LoginResponse } from '../api/auth';

interface AuthState {
  token: string;
  userId: number;
  username: string;
}

interface AuthContextValue {
  auth: AuthState | null;
  handleLogin: (data: LoginResponse) => void;
  handleLogout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    if (token && userId && username) {
      restoreSession();
      setAuth({ token, userId: Number(userId), username });
    }
    setInitialized(true);
  }, []);

  const handleLogin = (data: LoginResponse) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', String(data.userId));
    localStorage.setItem('username', data.username);
    document.cookie = `token=${data.token}; path=/; SameSite=Lax`;
    initSession(String(data.userId));
    setAuth({ token: data.token, userId: data.userId, username: data.username });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    document.cookie = 'token=; path=/; max-age=0';
    clearSession();
    setAuth(null);
  };

  if (!initialized) return null;

  return (
    <AuthContext.Provider value={{ auth, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}