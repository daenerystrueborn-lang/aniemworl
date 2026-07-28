import { useState, useEffect } from "react";

const WHATSAPP_LINK = "https://whatsapp.com/channel/0029VaqhhiQA2pL54CiJ0x2p";

export default function WhatsAppPopup() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show popup after 2 seconds
    const timer = setTimeout(() => {
      if (!sessionStorage.getItem("wa-popup-dismissed")) {
        setVisible(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setDismissed(true);
    sessionStorage.setItem("wa-popup-dismissed", "1");
    setVisible(false);
  }

  if (!visible || dismissed) return null;

  return (
    <div
      className="fixed bottom-6 right-5 z-[500] flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animation: "waPopupIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}
    >
      <style>{`
        @keyframes waPopupIn {
          from { opacity: 0; transform: translateY(20px) scale(0.85); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>

      {/* Popup card */}
      <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-2xl p-4 max-w-[220px] flex flex-col items-center gap-3">
        {/* Dismiss button */}
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white text-xs transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Anime icon (splash mascot) */}
        <img
          src="/splash-yoho.png"
          alt="Animeastral mascot"
          className="w-14 h-14 rounded-full object-cover border-2 border-[#25d366]/40 shadow-md"
        />

        <div className="text-center">
          <p className="text-white text-xs font-bold leading-snug mb-0.5">Join our community!</p>
          <p className="text-white/50 text-[10px] leading-snug">Get updates, requests & more</p>
        </div>

        {/* WhatsApp button */}
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#1b2a22] border border-[#25d366]/30 hover:border-[#25d366]/70 hover:bg-[#1e3028] transition-all group"
        >
          {/* Dark-themed WhatsApp SVG logo */}
          <svg
            viewBox="0 0 32 32"
            className="w-5 h-5 shrink-0"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="16" cy="16" r="16" fill="#1b2a22" />
            <path
              d="M23.5 8.5A10.45 10.45 0 0 0 16 5.5a10.5 10.5 0 0 0-9.07 15.74L5.5 26.5l5.43-1.42A10.5 10.5 0 0 0 26.5 16a10.45 10.45 0 0 0-3-7.5Z"
              fill="#25d366"
            />
            <path
              d="M21.46 18.6c-.28-.14-1.64-.81-1.9-.9-.25-.09-.44-.14-.62.14-.19.28-.72.9-.88 1.08-.16.19-.33.2-.61.07a7.72 7.72 0 0 1-2.27-1.4 8.5 8.5 0 0 1-1.57-1.95c-.17-.28 0-.44.12-.58.13-.13.28-.33.42-.5.14-.17.18-.28.27-.47.09-.19.05-.35-.02-.49-.07-.14-.62-1.5-.85-2.05-.22-.54-.45-.47-.62-.47-.16 0-.35-.02-.53-.02s-.49.07-.74.35c-.25.28-.98.96-.98 2.33s1 2.7 1.14 2.89c.14.18 1.97 3.01 4.77 4.22.67.29 1.19.46 1.6.59.67.21 1.28.18 1.76.11.54-.08 1.64-.67 1.87-1.32.23-.64.23-1.2.16-1.32-.07-.12-.25-.19-.54-.33Z"
              fill="#fff"
            />
          </svg>
          <span className="text-[#25d366] text-xs font-semibold group-hover:text-[#2fef75] transition-colors">
            WhatsApp Us
          </span>
        </a>
      </div>
    </div>
  );
}
