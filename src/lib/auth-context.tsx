import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { apiUrl } from "./api";

export interface LibraryEntry {
  id: string;
  type: "anime" | "manga" | "novel";
  status: "watching" | "reading" | "completed" | "plan-to-watch" | "plan-to-read" | "dropped";
  addedAt: number;
  updatedAt: number;
}

interface AuthState {
  token: string | null;
  username: string | null;
  pfp: string | null;
  library: LibraryEntry[];
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updatePfp: (url: string) => void;
  updateLibrary: (entry: LibraryEntry) => void;
  removeFromLibrary: (id: string, type: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = "animeastral_token";

async function fetchMe(token: string): Promise<{ username: string; pfp: string | null; library: LibraryEntry[] } | null> {
  try {
    const res = await fetch(apiUrl("/api/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    username: null,
    pfp: null,
    library: [],
  });

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return;
    fetchMe(stored).then((me) => {
      if (!me) {
        sessionStorage.removeItem(SESSION_KEY);
        return;
      }
      setState({ token: stored, username: me.username, pfp: me.pfp, library: me.library });
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Login failed" }));
      throw new Error((err as { error?: string }).error ?? "Login failed");
    }
    const { token } = await res.json() as { token: string };
    sessionStorage.setItem(SESSION_KEY, token);
    const me = await fetchMe(token);
    if (me) {
      setState({ token, username: me.username, pfp: me.pfp, library: me.library });
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const res = await fetch(apiUrl("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Registration failed" }));
      throw new Error((err as { error?: string }).error ?? "Registration failed");
    }
    const { token } = await res.json() as { token: string };
    sessionStorage.setItem(SESSION_KEY, token);
    const me = await fetchMe(token);
    if (me) {
      setState({ token, username: me.username, pfp: me.pfp, library: me.library });
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setState({ token: null, username: null, pfp: null, library: [] });
  }, []);

  const updatePfp = useCallback((url: string) => {
    setState((s) => ({ ...s, pfp: url }));
  }, []);

  const updateLibrary = useCallback((entry: LibraryEntry) => {
    setState((s) => {
      const existing = s.library.findIndex((e) => e.id === entry.id && e.type === entry.type);
      if (existing >= 0) {
        const next = [...s.library];
        next[existing] = entry;
        return { ...s, library: next };
      }
      return { ...s, library: [...s.library, entry] };
    });
  }, []);

  const removeFromLibrary = useCallback((id: string, type: string) => {
    setState((s) => ({
      ...s,
      library: s.library.filter((e) => !(e.id === id && e.type === type)),
    }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updatePfp, updateLibrary, removeFromLibrary }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
