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

const PROXIES: Array<(url: string) => Promise<string>> = [
  // corsproxy.io — returns raw response body
  async (url) => {
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    if (!res.ok) throw new Error(`corsproxy: HTTP ${res.status}`);
    return res.text();
  },

  // allorigins — returns JSON { contents: "..." }
  async (url) => {
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    );
    if (!res.ok) throw new Error(`allorigins: HTTP ${res.status}`);
    const json = await res.json();
    if (!json.contents) throw new Error("allorigins: empty contents");
    return json.contents as string;
  },
];

async function fetchViaProxy(url: string): Promise<string> {
  let lastErr: unknown;
  for (const proxy of PROXIES) {
    try {
      return await proxy(url);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `All proxies failed. Last error: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
  );
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

  // Sanity-check: must look like an HTTP URL (m3u8 or not — HLS URLs vary)
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
