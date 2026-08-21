/**
 * DownloadButton.tsx — client-side HLS downloader, no backend required.
 *
 * Drop this into your project at src/components/DownloadButton.tsx
 * (requires src/lib/download.ts alongside it).
 *
 * ─── Usage ──────────────────────────────────────────────────────────────────
 *
 *   import DownloadButton from "@/components/DownloadButton";
 *
 *   <DownloadButton
 *     hlsUrl={episode.streamUrl}      // the .m3u8 URL
 *     filename="Attack on Titan EP 5" // output filename (no extension needed)
 *   />
 *
 * ─── What happens ───────────────────────────────────────────────────────────
 *
 *   1. User taps "Download"
 *   2. Fetches the M3U8 → if master playlist, shows a quality picker
 *   3. User picks quality (or auto-selects if there's only one)
 *   4. Browser downloads every .ts segment via fetch(), stitches them,
 *      and saves a single .ts file the user can play in VLC / mpv
 *   5. Live progress bar + speed shown during download
 *   6. Cancel button available at any time
 *
 * ─── Requirements ───────────────────────────────────────────────────────────
 *
 *   - src/lib/download.ts   (the helper file)
 *   - lucide-react          (already in your package.json)
 *   - tailwindcss           (already in your package.json)
 *   - No backend, no extra deps
 *
 * ─── CORS note ──────────────────────────────────────────────────────────────
 *
 *   This works as long as the CDN sends Access-Control-Allow-Origin headers —
 *   which it must if hls.js can play the stream, because hls.js makes the
 *   exact same cross-origin fetch requests.
 */

import { useState, useRef, useEffect } from "react";
import {
  Download,
  ChevronDown,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  fetchQualities,
  downloadHls,
  formatSpeed,
  type QualityOption,
  type DownloadProgress,
} from "@/lib/download";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status =
  | { kind: "idle" }
  | { kind: "loadingQualities" }
  | { kind: "picking"; qualities: QualityOption[] }
  | { kind: "downloading"; progress: DownloadProgress; quality: string }
  | { kind: "done" }
  | { kind: "error"; message: string };

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** The .m3u8 URL — can be a master playlist (multiple qualities) or a media playlist */
  hlsUrl?: string;
  /** Alternative: async function that resolves the .m3u8 URL on demand (called on first click) */
  hlsUrlFetcher?: () => Promise<string>;
  /** Desired output filename — .ts extension is added automatically */
  filename: string;
  /** Extra Tailwind classes applied to the wrapper div */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DownloadButton({ hlsUrl = "", hlsUrlFetcher, filename, className = "" }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close quality picker on outside click
  useEffect(() => {
    if (status.kind !== "picking") return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatus({ kind: "idle" });
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [status.kind]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleMainClick() {
    // Close picker if it's open
    if (status.kind === "picking") {
      setStatus({ kind: "idle" });
      return;
    }
    // Reset error on retry
    if (status.kind === "error") {
      setStatus({ kind: "idle" });
      return;
    }
    setStatus({ kind: "loadingQualities" });

    try {
      let resolvedUrl = hlsUrl;
      if (!resolvedUrl && hlsUrlFetcher) {
        resolvedUrl = await hlsUrlFetcher();
      }
      if (!resolvedUrl) {
        setStatus({ kind: "error", message: "No stream URL available" });
        return;
      }
      const qualities = await fetchQualities(resolvedUrl);

      if (qualities.length <= 1) {
        // Only one quality — start immediately
        beginDownload(qualities[0] ?? { label: "Auto", url: resolvedUrl, bandwidth: 0 });
      } else {
        setStatus({ kind: "picking", qualities });
      }
    } catch (err: unknown) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not load qualities",
      });
    }
  }

  function beginDownload(quality: QualityOption) {
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus({
      kind: "downloading",
      quality: quality.label,
      progress: { percent: 0, done: 0, total: 0, bytesPerSecond: 0 },
    });

    downloadHls(
      quality.url,
      filename,
      (p) => {
        setStatus({ kind: "downloading", quality: quality.label, progress: p });
      },
      controller.signal
    )
      .then(() => {
        setStatus({ kind: "done" });
        // Auto-reset after 4 s
        setTimeout(() => setStatus({ kind: "idle" }), 4000);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus({ kind: "idle" });
        } else {
          setStatus({
            kind: "error",
            message: err instanceof Error ? err.message : "Download failed",
          });
        }
      });
  }

  function cancelDownload() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus({ kind: "idle" });
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const isIdle = status.kind === "idle";
  const isLoadingQ = status.kind === "loadingQualities";
  const isPicking = status.kind === "picking";
  const isDownloading = status.kind === "downloading";
  const isDone = status.kind === "done";
  const isError = status.kind === "error";

  const progress = isDownloading
    ? (status as { kind: "downloading"; progress: DownloadProgress; quality: string }).progress
    : null;
  const activeQuality = isDownloading
    ? (status as { kind: "downloading"; progress: DownloadProgress; quality: string }).quality
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={`relative inline-block ${className} ${isError || isPicking ? "z-50" : "z-0"}`}
      style={{ isolation: "isolate" }}
      ref={dropdownRef}
    >

      {/* ── MAIN BUTTON ────────────────────────────────────────────────── */}
      {!isDownloading && (
        <button
          onClick={handleMainClick}
          disabled={isLoadingQ || (!hlsUrl && !hlsUrlFetcher)}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
            border transition-all duration-200 select-none
            focus:outline-none focus:ring-2 focus:ring-accent/50
            ${isError
              ? "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20 cursor-pointer"
              : isDone
                ? "bg-green-500/10 border-green-500/40 text-green-400 cursor-default"
                : isLoadingQ
                  ? "bg-muted border-border text-muted-foreground cursor-wait opacity-70"
                  : "bg-muted border-border text-foreground hover:bg-accent/10 hover:border-accent/40 hover:text-accent cursor-pointer"
            }
            ${(!hlsUrl && !hlsUrlFetcher) ? "opacity-40 pointer-events-none" : ""}
          `}
        >
          {/* Icon */}
          {isLoadingQ ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isDone ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}

          {/* Label */}
          <span>
            {isLoadingQ
              ? "Loading…"
              : isDone
                ? "Saved!"
                : isError
                  ? "Retry"
                  : "Download"}
          </span>

          {/* Chevron hint */}
          {(isIdle || isPicking) && (
            <ChevronDown
              className={`w-3.5 h-3.5 opacity-50 transition-transform ${isPicking ? "-rotate-180" : ""}`}
            />
          )}
        </button>
      )}

      {/* ── DOWNLOADING STATE ───────────────────────────────────────────── */}
      {isDownloading && progress && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5 min-w-[260px]">

          {/* Spinner */}
          <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground truncate">
                {activeQuality} &mdash; {progress.percent}%
              </span>
              <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                {progress.bytesPerSecond > 0 ? formatSpeed(progress.bytesPerSecond) : "…"}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <p className="text-[10px] text-muted-foreground mt-1">
              Segment {progress.done} of {progress.total}
            </p>
          </div>

          {/* Cancel */}
          <button
            onClick={cancelDownload}
            title="Cancel download"
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-muted hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── ERROR TOOLTIP ───────────────────────────────────────────────── */}
      {isError && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-card border border-red-500/30 rounded-xl px-3 py-2 shadow-2xl max-w-xs">
          <p className="text-[11px] text-red-400 break-words">
            {(status as { kind: "error"; message: string }).message}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Click Retry to try again
          </p>
        </div>
      )}

      {/* ── QUALITY PICKER ──────────────────────────────────────────────── */}
      {isPicking && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[180px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden">

          <div className="px-3 py-2 border-b border-border bg-muted/40">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Choose quality
            </p>
          </div>

          {(status as { kind: "picking"; qualities: QualityOption[] }).qualities.map((q, i) => (
            <button
              key={q.url}
              onClick={() => beginDownload(q)}
              className={`
                w-full flex items-center justify-between gap-4
                px-3 py-2.5 text-sm text-left
                hover:bg-accent/10 hover:text-accent transition-colors group
                ${i === 0 ? "font-semibold" : ""}
              `}
            >
              <span className="flex items-center gap-2">
                {q.label}
                {i === 0 && (
                  <span className="text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
                    BEST
                  </span>
                )}
              </span>
              {q.bandwidth > 0 && (
                <span className="text-[10px] text-muted-foreground group-hover:text-accent/70 shrink-0">
                  {q.bandwidth >= 1_000_000
                    ? `${(q.bandwidth / 1_000_000).toFixed(1)} Mbps`
                    : `${Math.round(q.bandwidth / 1_000)} kbps`}
                </span>
              )}
            </button>
          ))}

          <div className="px-3 py-2 border-t border-border bg-muted/40">
            <p className="text-[10px] text-muted-foreground leading-snug">
              Saves as <span className="text-foreground font-medium">.ts</span> — open with VLC or mpv
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
