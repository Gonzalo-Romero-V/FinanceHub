"use client"

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthToken, getAuthToken, persistAuthToken } from "@/lib/auth/storage";
import { fetchCurrentUser, logoutRequest } from "@/lib/auth/api";
import type { AuthUser } from "@/lib/auth/types";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, userData: AuthUser, redirectTo?: string) => void;
  loginWithToken: (token: string, redirectTo?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  loginWithToken: async () => {},
  logout: () => {},
  loading: true,
  refreshSession: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = getAuthToken();

    if (storedToken) {
      setToken(storedToken);
      void refreshSessionFromToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const syncSession = (authToken: string, currentUser: AuthUser) => {
    persistAuthToken(authToken);
    setToken(authToken);
    setUser(currentUser);
  };

  const refreshSessionFromToken = async (authToken: string) => {
    try {
      const currentUser = await fetchCurrentUser(authToken);
      syncSession(authToken, currentUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken: string, userData: AuthUser, redirectTo = "/dashboard") => {
    syncSession(newToken, userData);
    router.push(redirectTo);
  };

  const loginWithToken = async (newToken: string, redirectTo = "/dashboard") => {
    try {
      const currentUser = await fetchCurrentUser(newToken);
      syncSession(newToken, currentUser);
      router.push(redirectTo);
    } catch (error) {
      console.error("Error completing login:", error);
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await logoutRequest(token);
      } catch (error) {
        console.error("Error during logout:", error);
      }
    }
    clearSession();
  };

  const clearSession = (redirectTo = "/login") => {
    clearAuthToken();
    setToken(null);
    setUser(null);
    if (redirectTo) {
      router.push(redirectTo);
    }
  };

  const refreshSession = async () => {
    const currentToken = token || getAuthToken();

    if (!currentToken) {
      clearSession("");
      setLoading(false);
      return;
    }

    setLoading(true);
    await refreshSessionFromToken(currentToken);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithToken, logout, loading, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}
