import { useEffect, useState } from "react";

interface SplashVariant {
  image: string;
  greeting: string;
}

const VARIANTS: SplashVariant[] = [
  { image: "/splash-yoho.png", greeting: "H-hi...!" },
  { image: "/splash-shy.png", greeting: "welcome... hehe" },
  { image: "/splash-flustered.png", greeting: "eek, y-you're here!" },
];

const SESSION_KEY = "splash-shown";
const VISIBLE_MS = 1400;
const FADE_MS = 500;

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 21s-6.7-4.35-9.5-8.1C.8 10.4 1 7.2 3.4 5.4c2.1-1.6 4.9-1.1 6.4.9L12 8.4l2.2-2.1c1.5-2 4.3-2.5 6.4-.9 2.4 1.8 2.6 5 .9 7.5C18.7 16.65 12 21 12 21z" />
    </svg>
  );
}

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [variant, setVariant] = useState<SplashVariant | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    setVariant(VARIANTS[Math.floor(Math.random() * VARIANTS.length)]);
    setVisible(true);

    const fadeTimer = setTimeout(() => setFading(true), VISIBLE_MS);
    const hideTimer = setTimeout(() => setVisible(false), VISIBLE_MS + FADE_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible || !variant) return null;

  return (
    <div
      className={`fixed inset-0 z-[999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="flex flex-col items-center gap-4">
        <img
          src={variant.image}
          alt=""
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-full object-cover border-2 border-accent shadow-lg"
        />
        <div className="flex items-center gap-2">
          <p className="text-foreground text-lg sm:text-xl font-semibold tracking-tight">
            {variant.greeting}
          </p>
          <HeartIcon className="w-4 h-4 text-accent animate-pulse" />
        </div>
      </div>
    </div>
  );
}
