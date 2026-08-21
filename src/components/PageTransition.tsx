import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const VARIANTS = [
  { image: "/splash-yoho.png", greeting: "Loading…" },
  { image: "/splash-shy.png", greeting: "Just a sec…" },
  { image: "/splash-flustered.png", greeting: "One moment!" },
];

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 21s-6.7-4.35-9.5-8.1C.8 10.4 1 7.2 3.4 5.4c2.1-1.6 4.9-1.1 6.4.9L12 8.4l2.2-2.1c1.5-2 4.3-2.5 6.4-.9 2.4 1.8 2.6 5 .9 7.5C18.7 16.65 12 21 12 21z" />
    </svg>
  );
}

export default function PageTransition() {
  const [location] = useLocation();
  const prevLocation = useRef(location);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [variant] = useState(() => VARIANTS[Math.floor(Math.random() * VARIANTS.length)]);
  const currentVariantRef = useRef(variant);

  useEffect(() => {
    // Pick a new variant on each transition
    currentVariantRef.current = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
  });

  useEffect(() => {
    if (prevLocation.current === location) return;
    prevLocation.current = location;

    setVisible(true);
    setFading(false);

    const fadeTimer = setTimeout(() => setFading(true), 380);
    const hideTimer = setTimeout(() => setVisible(false), 750);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [location]);

  if (!visible) return null;

  const v = currentVariantRef.current;

  return (
    <div
      className="fixed inset-0 z-[998] flex flex-col items-center justify-center bg-background pointer-events-none"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 370ms cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <img
          src={v.image}
          alt=""
          className="w-24 h-24 rounded-full object-cover border-2 border-accent shadow-xl shadow-accent/20"
          style={{
            transform: fading ? "scale(0.92)" : "scale(1)",
            transition: "transform 370ms cubic-bezier(0.4,0,0.2,1)",
          }}
        />
        <div className="flex items-center gap-1.5">
          <span className="text-foreground text-sm font-medium">{v.greeting}</span>
          <HeartIcon className="w-3.5 h-3.5 text-accent animate-pulse" />
        </div>
        {/* Loading dots */}
        <div className="flex gap-1 mt-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-accent/60"
              style={{
                animation: `dotBounce 1s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes dotBounce {
            0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
