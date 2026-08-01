import { useEffect } from "react";
import { usePremium } from "@/lib/premium-context";

const STORAGE_KEY = "popupShownToday";

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function hasShownToday(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === getTodayKey();
  } catch {
    return false;
  }
}

function markShownToday(): void {
  try {
    localStorage.setItem(STORAGE_KEY, getTodayKey());
  } catch { /* ignore */ }
}

/**
 * Popunder — fires once per day on the user's first click anywhere.
 * Silently injects the popunder script in the background.
 * Premium users are never shown ads.
 */
export default function Popunder() {
  const { isPremium } = usePremium();

  useEffect(() => {
    if (isPremium) return;
    if (hasShownToday()) return;

    function handleFirstClick() {
      if (hasShownToday()) return;
      markShownToday();

      /* PASTE POPUNDER CODE HERE */
      const script = document.createElement("script");
      script.defer = true;
      script.src = "https://pl30617560.effectivecpmnetwork.com/76/c4/67/76c467a4ae2c559321d08ff30a2ce7b1.js";
      document.head.appendChild(script);

      document.removeEventListener("click", handleFirstClick);
    }

    document.addEventListener("click", handleFirstClick);
    return () => document.removeEventListener("click", handleFirstClick);
  }, [isPremium]);

  return null;
}
