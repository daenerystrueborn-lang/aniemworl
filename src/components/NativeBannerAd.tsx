import { useEffect, useRef } from "react";
import { usePremium } from "@/lib/premium-context";

/**
 * NativeBannerAd — 728×90 native banner ad unit.
 * Hidden automatically for Premium users.
 * The ad script loads asynchronously and never blocks the page.
 */
export default function NativeBannerAd({ className = "" }: { className?: string }) {
  const { isPremium } = usePremium();
  const containerRef = useRef<HTMLDivElement>(null);
  const injected = useRef(false);

  useEffect(() => {
    if (isPremium) return;
    if (injected.current) return;
    injected.current = true;

    /* PASTE NATIVE BANNER CODE HERE */
    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = "https://pl30617618.effectivecpmnetwork.com/b05485edaf377170330ccdbf02e52b54/invoke.js";

    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }
  }, [isPremium]);

  if (isPremium) return null;

  return (
    <div className={`w-full flex flex-col items-center gap-1 ${className}`}>
      <span className="text-[9px] text-muted-foreground/30 uppercase tracking-widest select-none">
        Advertisement
      </span>
      {/* Ad container injected by the network script */}
      <div
        ref={containerRef}
        id="container-b05485edaf377170330ccdbf02e52b54"
        className="w-full max-w-[728px] min-h-[90px] flex items-center justify-center"
      />
    </div>
  );
}
