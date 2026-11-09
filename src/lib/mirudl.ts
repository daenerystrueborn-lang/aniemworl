const BASE = (import.meta.env?.VITE_STREAM_API_URL || "https://app-decompiling.onrender.com").replace(/\/+$/, "");
export interface MiruTitle { id: string; title: string }
export interface MiruEpisode { id: string; number: number; title: string; filler: boolean }
export interface MiruSession { proxyHlsUrl: string; proxySelectedHlsUrl: string; downloadUrl: string; variants: { label: string; height?: number }[]; selectedQuality: string }

export function normalizeTitle(title: string): string {
  return title.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

async function api(path: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  let res: Response;
  try { res = await fetch(`${BASE}${path}`, { signal }); }
  catch (err) { if (signal?.aborted) throw err; throw new Error("Could not reach Server 1. Please try again."); }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error.replace(/mirudl/gi, "Server 1") : `Server 1 returned HTTP ${res.status}.`);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid response from Server 1.");
  return data;
}

export async function searchMiruTitles(titles: string[], signal?: AbortSignal): Promise<MiruTitle[]> {
  const results = new Map<string, MiruTitle>();
  let lastError: unknown;
  let successes = 0;
  for (const title of [...new Set(titles.map((x) => x.trim()).filter(Boolean))]) {
    try {
      const data = await api(`/api/catalog/search?provider=mirudl&q=${encodeURIComponent(title)}`, signal);
      successes++;
      for (const item of Array.isArray(data.items) ? data.items : []) {
        if (item && (typeof item.id === "string" || typeof item.id === "number") && typeof item.title === "string") {
          results.set(String(item.id), { id: String(item.id), title: item.title });
        }
      }
      // A unique exact title match needs no further catalog searches.
      if (exactMiruMatch(titles, [...results.values()])) return [...results.values()];
    } catch (err) { if (signal?.aborted) throw err; lastError = err; }
  }
  if (!successes && lastError) throw lastError;
  return [...results.values()];
}

export function exactMiruMatch(titles: string[], results: MiruTitle[]): MiruTitle | null {
  const names = new Set(titles.map(normalizeTitle).filter(Boolean));
  const matches = results.filter((item) => names.has(normalizeTitle(item.title)));
  return matches.length === 1 ? matches[0] : null;
}

export async function getMiruEpisodes(animeId: string, signal?: AbortSignal): Promise<MiruEpisode[]> {
  const data = await api(`/api/catalog/episodes?provider=mirudl&animeId=${encodeURIComponent(animeId)}`, signal);
  if (!Array.isArray(data.episodes)) throw new Error("Server 1 returned an invalid episode list.");
  return data.episodes.filter((ep): ep is MiruEpisode => ep && (typeof ep.id === "string" || typeof ep.id === "number") && Number.isFinite(Number(ep.number)) && Number(ep.number) > 0)
    .map((ep) => ({ id: String(ep.id), number: Number(ep.number), title: ep.title || `Episode ${ep.number}`, filler: Boolean(ep.filler) }));
}

export function renderUrl(path: string, requiredPath: string): string {
  const base = new URL(BASE);
  const url = new URL(path, `${base.origin}/`);
  if (url.origin !== base.origin || url.pathname !== requiredPath) throw new Error("Server 1 returned an invalid server link.");
  return url.href;
}

export async function getMiruSession(episodeId: string, track: "sub" | "dub", quality: string, signal?: AbortSignal): Promise<MiruSession> {
  const params = new URLSearchParams({ episodeId, lang: track === "dub" ? "eng" : "jpn", quality });
  const data = await api(`/api/mirudl/play?${params}`, signal);
  if (typeof data.proxyHlsUrl !== "string" || typeof data.downloadUrl !== "string") throw new Error("Server 1 did not provide a playable stream.");
  return {
    proxyHlsUrl: renderUrl(data.proxyHlsUrl, "/api/proxy/hls"),
    proxySelectedHlsUrl: renderUrl(typeof data.proxySelectedHlsUrl === "string" ? data.proxySelectedHlsUrl : data.proxyHlsUrl, "/api/proxy/hls"),
    downloadUrl: renderUrl(data.downloadUrl, "/api/download"),
    variants: Array.isArray(data.variants) ? data.variants.filter((v) => v && typeof v.label === "string") as MiruSession["variants"] : [],
    selectedQuality: typeof data.selectedQuality === "string" ? data.selectedQuality : quality,
  };
}
