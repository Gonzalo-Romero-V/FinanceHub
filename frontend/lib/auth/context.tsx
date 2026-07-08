"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearAuthToken, getAuthToken, getCachedAuthUser, persistAuthToken } from "./storage";
import { fetchCurrentUser, logoutRequest } from "./api";
import { ApiError } from "@/lib/api/client";
import type { AuthUser } from "./types";

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
      // Restaura la última sesión conocida al instante (sin esperar red) —
      // clave en mobile, donde re-loguearse cada vez que se reabre la app
      // no es el comportamiento esperado. La validación real contra el
      // servidor sigue disparándose abajo, en segundo plano.
      const cachedUser = getCachedAuthUser();
      if (cachedUser) {
        setUser(cachedUser);
        setLoading(false);
      }
      void refreshSessionFromToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const syncSession = (authToken: string, currentUser: AuthUser) => {
    persistAuthToken(authToken, currentUser);
    setToken(authToken);
    setUser(currentUser);
  };

  const refreshSessionFromToken = async (authToken: string) => {
    try {
      const currentUser = await fetchCurrentUser(authToken);
      syncSession(authToken, currentUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      // Solo un rechazo real del servidor (401/403 — el token ya no es
      // válido) debe cerrar la sesión. Cualquier otro fallo (red, CORS,
      // timeout, 5xx) es transitorio: no hay que desloguear al usuario por
      // un hiccup de conexión al abrir la app, sobre todo en mobile donde
      // el arranque en frío puede tardar en tener red lista.
      const isAuthRejection = error instanceof ApiError && (error.status === 401 || error.status === 403);
      if (isAuthRejection) {
        clearSession();
      }
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
