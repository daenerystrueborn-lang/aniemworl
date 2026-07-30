/**
 * stream-resolver.ts — extract a raw HLS .m3u8 URL from a megaplay embed page.
 *
 * This is the browser port of the Android app's MiruClient.resolveHlsFromEmbed().
 * Since fetch() can't hit megaplay.buzz directly (CORS), we route through a
 * public CORS proxy. The HLS downloader (download.ts) then fetches segments
 * directly — those succeed if the CDN sends Access-Control-Allow-Origin: *.
 *
 * Usage:
 *   import { resolveStreamUrl } from "@/lib/stream-resolver";
 *   const hlsUrl = await resolveStreamUrl("21459", 1);        // sub (default)
 *   const hlsUrl = await resolveStreamUrl("21459", 1, "dub"); // dub
 */

// ─── CORS proxies (tried in order) ───────────────────────────────────────────

const PROXY_TIMEOUT_MS = 8000;

/** Wrap a fetch promise with a hard timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label}: timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

type ProxyFn = (url: string) => Promise<string>;

// ─── Your Cloudflare Worker URL ───────────────────────────────────────────────
// After deploying the worker, replace this with your real workers.dev URL.
// e.g. "https://megaplay-proxy.YOUR-SUBDOMAIN.workers.dev"
const CF_WORKER_URL = import.meta.env.VITE_CF_WORKER_URL as string | undefined;

const PROXIES: Array<{ name: string; fn: ProxyFn }> = [
  // ── Your own Cloudflare Worker (fastest, most reliable) ──────────────────
  ...(CF_WORKER_URL
    ? [
        {
          name: "cloudflare-worker",
          fn: async (url: string) => {
            const res = await fetch(`${CF_WORKER_URL}?url=${encodeURIComponent(url)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.text();
          },
        },
      ]
    : []),

  // ── Public fallbacks (used until you deploy the worker) ──────────────────
  {
    name: "corsproxy.io",
    fn: async (url) => {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    },
  },
  {
    name: "corsproxy.io (url=)",
    fn: async (url) => {
      const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    },
  },
  {
    name: "allorigins",
    fn: async (url) => {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.contents) throw new Error("empty contents");
      return json.contents as string;
    },
  },
  {
    name: "codetabs",
    fn: async (url) => {
      const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    },
  },
  {
    name: "thingproxy",
    fn: async (url) => {
      const res = await fetch(`https://thingproxy.freeboard.io/fetch/${url}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    },
  },
];

async function fetchViaProxy(url: string): Promise<string> {
  const errors: string[] = [];
  for (const { name, fn } of PROXIES) {
    try {
      return await withTimeout(fn(url), PROXY_TIMEOUT_MS, name);
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`All proxies failed.\n${errors.join("\n")}`);
}

// ─── HLS URL extraction (same logic as Android app's resolveHlsFromEmbed) ────

/**
 * Scans the embed page HTML for the HLS stream URL.
 * The Android app looks for:  file: '...'  or  file: "..."  or  file: `...`
 * This handles all three.
 */
function extractHlsFromHtml(html: string): string | null {
  const fileIdx = html.indexOf("file:");
  if (fileIdx < 0) return null;

  // Search window: 300 chars after "file:" is plenty
  const window = html.slice(fileIdx, fileIdx + 300);

  // Find the opening quote character (' " `)
  const singleQ = window.indexOf("'");
  const doubleQ = window.indexOf('"');
  const backTick = window.indexOf("`");

  const candidates = [singleQ, doubleQ, backTick].filter((i) => i >= 0);
  if (candidates.length === 0) return null;

  const openPos = Math.min(...candidates);
  const quote = window[openPos];
  const contentStart = openPos + 1;
  const closePos = window.indexOf(quote, contentStart);
  if (closePos < 0) return null;

  const extracted = window.slice(contentStart, closePos).trim();

  // Sanity-check: must look like an HTTP URL
  if (!extracted.startsWith("http://") && !extracted.startsWith("https://")) {
    return null;
  }

  return extracted;
}

// ─── Fallback: try to find any m3u8 URL in the page source ──────────────────

function extractM3u8Fallback(html: string): string | null {
  const match = html.match(/https?:\/\/[^\s"'`<>]+\.m3u8[^\s"'`<>]*/);
  return match ? match[0] : null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type StreamMode = "sub" | "dub";

/**
 * Resolve the raw HLS .m3u8 URL for a given episode.
 *
 * @param anilistId     AniList anime ID (the same one used in your watch route)
 * @param episodeNumber Episode number (1-based)
 * @param mode          "sub" (default) or "dub"
 */
export async function resolveStreamUrl(
  anilistId: string | number,
  episodeNumber: number,
  mode: StreamMode = "sub"
): Promise<string> {
  const embedUrl = `https://megaplay.buzz/stream/ani/${anilistId}/${episodeNumber}/${mode}`;

  const html = await fetchViaProxy(embedUrl);

  // Primary method: find file: '...'
  const primary = extractHlsFromHtml(html);
  if (primary) return primary;

  // Fallback: scan for any .m3u8 URL
  const fallback = extractM3u8Fallback(html);
  if (fallback) return fallback;

  throw new Error(
    "Stream URL not found in embed page. " +
    "The player embed may have changed its format — open an issue."
  );
}
