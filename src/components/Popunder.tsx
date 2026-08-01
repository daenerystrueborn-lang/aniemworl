import { useEffect } from "react";
import { usePremium } from "@/lib/premium-context";

const STORAGE_KEY = "popupLastShown";
const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export default function Popunder() {
  const { isPremium } = usePremium();

  useEffect(() => {
    if (isPremium) return;

    const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    const now = Date.now();
    if (now - last < INTERVAL_MS) return; // fired less than 1 hour ago

    const script = document.createElement("script");
    script.src =
      "https://pl30617560.effectivecpmnetwork.com/76/c4/67/76c467a4ae2c559321d08ff30a2ce7b1.js";
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    document.head.appendChild(script);

    localStorage.setItem(STORAGE_KEY, String(now));
  }, [isPremium]);

  return null;
}
