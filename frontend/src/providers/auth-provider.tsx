"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getMe } from "@/lib/auth";

interface AuthUser {
  id: number;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("cloudbox_token");
    const storedUser = localStorage.getItem("cloudbox_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // corrupted data, clear it
        localStorage.removeItem("cloudbox_token");
        localStorage.removeItem("cloudbox_user");
      }

      // Validate the token is still good
      getMe()
        .then((res) => {
          if (res.success && res.data) {
            setUser({ id: res.data.user_id, email: res.data.email });
          } else {
            localStorage.removeItem("cloudbox_token");
            localStorage.removeItem("cloudbox_user");
            setUser(null);
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem("cloudbox_token");
          localStorage.removeItem("cloudbox_user");
          setUser(null);
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem("cloudbox_token", newToken);
    localStorage.setItem("cloudbox_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("cloudbox_token");
    localStorage.removeItem("cloudbox_user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
