import { useEffect, useRef } from "react";
import { usePremium } from "@/lib/premium-context";

type AdSize = "large" | "medium" | "small";

const AD_CONFIGS: Record<AdSize, { key: string; width: number; height: number }> = {
  large:  { key: "0535c8f08097dccb7b40f0ff15bb30cf", width: 728, height: 90 },
  medium: { key: "923322c042f4b4cfcd2bdf80be58fa87", width: 468, height: 60 },
  small:  { key: "b9a89db6aa138598389683c3625f8199", width: 320, height: 50 },
};

export default function NativeBannerAd({
  size = "large",
  className = "",
}: {
  size?: AdSize;
  className?: string;
}) {
  const { isPremium } = usePremium();
  const slotRef = useRef<HTMLDivElement>(null);
  const injected = useRef(false);

  useEffect(() => {
    if (isPremium || injected.current || !slotRef.current) return;
    injected.current = true;

    const { key, width, height } = AD_CONFIGS[size];

    // Inline config script — runs synchronously so invoke.js reads the right options
    const config = document.createElement("script");
    config.text = `atOptions = { 'key': '${key}', 'format': 'iframe', 'height': ${height}, 'width': ${width}, 'params': {} };`;
    slotRef.current.appendChild(config);

    // Invoke script — loads the ad into this slot
    const invoke = document.createElement("script");
    invoke.src = `https://www.highperformanceformat.com/${key}/invoke.js`;
    invoke.setAttribute("data-cfasync", "false");
    slotRef.current.appendChild(invoke);
  }, [isPremium, size]);

  if (isPremium) return null;

  const { width, height } = AD_CONFIGS[size];

  return (
    <div className={`w-full flex flex-col items-center gap-1 ${className}`}>
      <span className="text-[9px] text-muted-foreground/30 uppercase tracking-widest select-none">
        Advertisement
      </span>
      <div
        ref={slotRef}
        style={{ width, minHeight: height }}
        className="flex items-center justify-center overflow-hidden"
      />
    </div>
  );
}
