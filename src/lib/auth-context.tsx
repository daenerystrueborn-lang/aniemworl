import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode,
} from "react";
import {
  getStoredToken, setStoredToken, clearStoredToken,
  getCustomPfp, setCustomPfp as persistCustomPfp,
  redirectToAniListLogin,
  fetchViewer, fetchWatchlist, saveToWatchlist, removeFromWatchlist,
  type AniListUser, type WatchlistEntry,
} from "./anilist-auth";

/* ─── Types ─────────────────────────────────────────────────── */

interface AuthContextValue {
  user: AniListUser | null;
  watchlist: WatchlistEntry[];
  isLoggedIn: boolean;
  isLoading: boolean;
  customPfp: string | null;

  login: () => void;
  logout: () => void;
  saveEntry: (mediaId: number, status: string, title: string, cover: string, type: "ANIME" | "MANGA") => Promise<void>;
  removeEntry: (entryId: number, mediaId: number) => Promise<void>;
  getEntry: (mediaId: number) => WatchlistEntry | undefined;
  setCustomPfp: (url: string | null) => void;
  refetchWatchlist: () => Promise<void>;

  // Legacy: some pages check token to decide if user is signed in
  token: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ─── Provider ──────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AniListUser | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customPfp, setCustomPfpState] = useState<string | null>(() => getCustomPfp());

  // On mount / token change, load profile + watchlist
  useEffect(() => {
    if (!token) {
      setUser(null);
      setWatchlist([]);
      return;
    }

    setIsLoading(true);
    fetchViewer(token)
      .then(async (viewer) => {
        setUser(viewer);
        const list = await fetchWatchlist(token, viewer.id).catch(() => []);
        setWatchlist(list);
      })
      .catch(() => {
        // Token invalid / expired
        clearStoredToken();
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const login = useCallback(() => {
    redirectToAniListLogin();
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setWatchlist([]);
  }, []);

  const refetchWatchlist = useCallback(async () => {
    if (!token || !user) return;
    const list = await fetchWatchlist(token, user.id).catch(() => []);
    setWatchlist(list);
  }, [token, user]);

  const saveEntry = useCallback(
    async (mediaId: number, status: string, title: string, cover: string, type: "ANIME" | "MANGA") => {
      if (!token) return;
      try {
        const result = await saveToWatchlist(token, mediaId, status);
        setWatchlist((prev) => {
          const existingIdx = prev.findIndex((e) => e.mediaId === mediaId);
          const updated: WatchlistEntry = {
            entryId: result.entryId,
            mediaId,
            status: result.status,
            progress: result.progress,
            title,
            cover,
            type,
            episodes: type === "ANIME" ? null : null,
            chapters: type === "MANGA" ? null : null,
          };
          if (existingIdx >= 0) {
            const next = [...prev];
            next[existingIdx] = updated;
            return next;
          }
          return [...prev, updated];
        });
      } catch (err) {
        console.error("Failed to save watchlist entry", err);
        throw err;
      }
    },
    [token],
  );

  const removeEntry = useCallback(
    async (entryId: number, mediaId: number) => {
      if (!token) return;
      try {
        await removeFromWatchlist(token, entryId);
        setWatchlist((prev) => prev.filter((e) => e.mediaId !== mediaId));
      } catch (err) {
        console.error("Failed to remove watchlist entry", err);
        throw err;
      }
    },
    [token],
  );

  const getEntry = useCallback(
    (mediaId: number) => watchlist.find((e) => e.mediaId === mediaId),
    [watchlist],
  );

  const handleSetCustomPfp = useCallback((url: string | null) => {
    setCustomPfpState(url);
    persistCustomPfp(url);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        watchlist,
        isLoggedIn: !!user,
        isLoading,
        customPfp,
        login,
        logout,
        saveEntry,
        removeEntry,
        getEntry,
        setCustomPfp: handleSetCustomPfp,
        refetchWatchlist,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Accept the AniList OAuth callback — call this on the /oauth page. */
export function acceptOAuthToken(rawToken: string): void {
  setStoredToken(rawToken);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Legacy export kept so old imports don't break immediately
export type { WatchlistEntry as LibraryEntry };
