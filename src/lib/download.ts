/**
 * download.ts — pure client-side HLS downloader.
 *
 * No backend required. Works entirely in the browser using the Fetch API.
 * The browser fetches each .ts segment (same way hls.js does for playback),
 * stitches them into one Blob, and saves the file.
 *
 * ⚠️  CORS requirement:
 *     This only works if the CDN returns Access-Control-Allow-Origin headers
 *     on segment responses. If hls.js can play the stream, this can download it —
 *     they both make the same cross-origin requests.
 *
 * Usage:
 *   import { fetchQualities, downloadHls } from "@/lib/download";
 *
 *   const qualities = await fetchQualities("https://cdn.../master.m3u8");
 *   // → [{ label: "1080p", url: "...", bandwidth: 4500000 }, ...]
 *
 *   await downloadHls(qualities[0].url, "Attack on Titan EP 1", (p) => {
 *     console.log(`${p.percent}% — ${p.done}/${p.total} segments`);
 *   });
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QualityOption {
  label: string;      // "1080p" | "720p" | "480p" | "360p" | "Auto"
  url: string;        // media playlist URL for this quality
  bandwidth: number;  // bits/sec (0 for single-stream playlists)
}

export interface DownloadProgress {
  percent: number;       // 0–100
  done: number;          // segments downloaded so far
  total: number;         // total segments
  bytesPerSecond: number;// smoothed download speed
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "*/*",
};

/** Resolve a relative segment URL against the playlist base URL */
function resolveUrl(seg: string, base: string): string {
  if (seg.startsWith("http://") || seg.startsWith("https://")) return seg;
  if (seg.startsWith("//")) return "https:" + seg;
  if (seg.startsWith("/")) {
    const u = new URL(base);
    return `${u.protocol}//${u.host}${seg}`;
  }
  const dir = base.substring(0, base.lastIndexOf("/") + 1);
  return dir + seg;
}

async function getText(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { headers: HEADERS, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

async function getBytes(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  const res = await fetch(url, { headers: HEADERS, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching segment`);
  return res.arrayBuffer();
}

// ─── M3U8 parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a master playlist into quality options sorted best → worst.
 * If the URL is already a media playlist, returns a single "Auto" option.
 */
export async function fetchQualities(
  m3u8Url: string,
  signal?: AbortSignal
): Promise<QualityOption[]> {
  const text = await getText(m3u8Url, signal);

  // Master playlist — has multiple streams
  if (text.includes("#EXT-X-STREAM-INF")) {
    const lines = text.split(/\r?\n/);
    const streams: QualityOption[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith("#EXT-X-STREAM-INF")) continue;

      const bwMatch = line.match(/BANDWIDTH=(\d+)/);
      const resMatch = line.match(/RESOLUTION=\d+x(\d+)/);
      const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;
      const height = resMatch ? parseInt(resMatch[1], 10) : 0;

      const label =
        height >= 1080
          ? "1080p"
          : height >= 720
            ? "720p"
            : height >= 480
              ? "480p"
              : height > 0
                ? `${height}p`
                : bandwidth >= 4_500_000
                  ? "1080p"
                  : bandwidth >= 2_200_000
                    ? "720p"
                    : bandwidth >= 1_000_000
                      ? "480p"
                      : bandwidth > 0
                        ? "360p"
                        : "Auto";

      const next = lines[i + 1]?.trim();
      if (next && !next.startsWith("#")) {
        streams.push({ label, url: resolveUrl(next, m3u8Url), bandwidth });
        i++;
      }
    }

    return streams.sort((a, b) => b.bandwidth - a.bandwidth);
  }

  // Already a media playlist
  if (text.includes("#EXTINF") || text.includes("#EXT-X-TARGETDURATION")) {
    return [{ label: "Auto", url: m3u8Url, bandwidth: 0 }];
  }

  throw new Error("URL does not appear to be a valid M3U8 playlist");
}

interface ParsedSegments {
  initUrl: string | null;  // #EXT-X-MAP (codec container header, must come first)
  segments: string[];
}

function parseMediaPlaylist(text: string, baseUrl: string): ParsedSegments {
  const lines = text.split(/\r?\n/);
  let initUrl: string | null = null;
  const segments: string[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("#EXT-X-MAP")) {
      const m = t.match(/URI="([^"]+)"/);
      if (m) initUrl = resolveUrl(m[1], baseUrl);
    } else if (!t.startsWith("#") && t.length > 0) {
      segments.push(resolveUrl(t, baseUrl));
    }
  }

  return { initUrl, segments };
}

// ─── Downloader ───────────────────────────────────────────────────────────────

/**
 * Download an HLS stream and save it as a .ts file.
 *
 * @param mediaUrl    URL of a media playlist (not a master) — use fetchQualities
 *                    first if you need to let the user pick a quality.
 * @param filename    Output filename (no extension needed — .ts is added).
 * @param onProgress  Called after each segment with live progress info.
 * @param signal      Optional AbortSignal to cancel the download mid-way.
 *
 * @example
 *   const controller = new AbortController();
 *
 *   await downloadHls(
 *     "https://cdn.../720p/index.m3u8",
 *     "My Anime EP 5",
 *     ({ percent, done, total, bytesPerSecond }) => {
 *       console.log(`${percent}% — ${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`);
 *     },
 *     controller.signal
 *   );
 *
 *   // To cancel:
 *   controller.abort();
 */
export async function downloadHls(
  mediaUrl: string,
  filename: string,
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  // 1. Fetch the media playlist
  const playlistText = await getText(mediaUrl, signal);
  const { initUrl, segments } = parseMediaPlaylist(playlistText, mediaUrl);

  if (segments.length === 0) {
    throw new Error("No segments found in playlist");
  }

  const total = segments.length;
  const buffers: ArrayBuffer[] = [];
  let totalBytes = 0;
  let smoothedBps = 0;

  // 2. Fetch init segment if present (must be first in the output)
  if (initUrl) {
    try {
      const initBuf = await getBytes(initUrl, signal);
      buffers.push(initBuf);
      totalBytes += initBuf.byteLength;
    } catch {
      // Non-fatal — some streams declare an init segment but don't need it
    }
  }

  // 3. Fetch all segments in order, tracking speed
  let windowStart = performance.now();
  let windowBytes = 0;

  for (let i = 0; i < segments.length; i++) {
    if (signal?.aborted) throw new DOMException("Download cancelled", "AbortError");

    const segBuf = await getBytes(segments[i], signal);
    buffers.push(segBuf);
    totalBytes += segBuf.byteLength;
    windowBytes += segBuf.byteLength;

    // Smooth the speed with an exponential moving average
    const now = performance.now();
    const elapsed = (now - windowStart) / 1000;
    if (elapsed >= 0.5) {
      const rawBps = windowBytes / elapsed;
      smoothedBps = smoothedBps > 0 ? rawBps * 0.35 + smoothedBps * 0.65 : rawBps;
      windowStart = now;
      windowBytes = 0;
    }

    onProgress({
      percent: Math.round(((i + 1) / total) * 100),
      done: i + 1,
      total,
      bytesPerSecond: Math.round(smoothedBps),
    });
  }

  // 4. Concatenate all buffers into one Uint8Array
  const output = new Uint8Array(totalBytes);
  let offset = 0;
  for (const buf of buffers) {
    output.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  // 5. Trigger browser save-as dialog
  const blob = new Blob([output], { type: "video/mp2t" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeFilename = filename.replace(/[<>:"/\\|?*]/g, "_");
  a.href = url;
  a.download = safeFilename + ".ts";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up the object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ─── Formatting helpers (useful in your UI) ──────────────────────────────────

/** Format bytes/sec as a human-readable speed string */
export function formatSpeed(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} MB/s`;
  if (bps >= 1_000) return `${Math.round(bps / 1_000)} KB/s`;
  return `${bps} B/s`;
}

/** Format total bytes as a human-readable size string */
export function formatSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${Math.round(bytes / 1_024)} KB`;
  return `${bytes} B`;
}
