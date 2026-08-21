import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "animeastral_premium";

interface PremiumContextValue {
  isPremium: boolean;
  activate: () => void;
  deactivate: () => void;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const activate = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch { /* ignore */ }
    setIsPremium(true);
  }, []);

  const deactivate = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setIsPremium(false);
  }, []);

  return (
    <PremiumContext.Provider value={{ isPremium, activate, deactivate }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error("usePremium must be used within PremiumProvider");
  return ctx;
}
