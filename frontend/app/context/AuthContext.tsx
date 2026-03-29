"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  provider?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/', '/tutorial'];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    // Check local storage for token on mount
    const storedToken = localStorage.getItem('auth_token');
    
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      setLoading(false);
      checkProtectedRoutes();
    }
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.data);
      } else {
        // Token invalid or expired
        handleLogout();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('auth_token', newToken);
    // Also save in cookie for middleware if needed
    document.cookie = `auth_token=${newToken}; path=/; max-age=86400; SameSite=Lax`;
    setToken(newToken);
    setUser(userData);
    
    // Redirect to dashboard after login
    router.push('/dashboard');
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${apiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }
    handleLogout();
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax'; // Delete cookie
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  const checkProtectedRoutes = () => {
    // If not loading, no user, and trying to access a protected route
    if (!publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
       router.push('/login');
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      checkProtectedRoutes();
    }
  }, [pathname, loading, user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
