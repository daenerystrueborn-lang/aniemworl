import { subtitleFiles, type SubtitleFile } from "./subtitles.ts";
/** Resolve the selected AniList/MAL episode through the Render AniFam service. */
const STREAM_API_URL = (import.meta.env?.VITE_STREAM_API_URL || "https://app-decompiling.onrender.com").replace(/\/+$/, "");

type Track = "sub" | "dub";
type JsonObject = Record<string, unknown>;
interface SearchItem { id: number; title?: string; title_romaji?: string | null; title_jp?: string | null }
interface ProviderEpisode { id: number; number: number; has_sub?: boolean; has_dub?: boolean }

async function request(path: string, signal: AbortSignal, body?: JsonObject): Promise<JsonObject> {
  let response: Response;
  try {
    response = await fetch(`${STREAM_API_URL}${path}`, {
      signal,
      ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("The download server could not be reached. Please try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : `Download server returned HTTP ${response.status}.`);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("The download server returned an invalid response.");
  return data;
}

/** IDs are verified against AniList or MAL, never inferred from a similar title. */
export async function resolveRenderPlayback(options: {
  animeId: string;
  malId: number | null;
  titles: string[];
  episodeNumber: number;
  track: Track;
  signal: AbortSignal;
}): Promise<{ url: string; subtitles: SubtitleFile[] }> {
  const { animeId, malId, episodeNumber, track, signal } = options;
  const queries = [...new Set(options.titles.map((name) => name.trim()).filter(Boolean))];
  if (!queries.length) throw new Error("No title is available to find this anime.");
  const checked = new Set<number>();
  let providerAnimeId: number | undefined;
  let lookupFailed = false;
  for (const title of queries) {
    const result = await request(`/api/anifam/search?q=${encodeURIComponent(title)}`, signal);
    const items = (Array.isArray(result.data) ? result.data : []) as SearchItem[];
    const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
    const queryTitle = normalize(title);
    const ordered = [...items].sort((a, b) => {
      const exact = (item: SearchItem) => [item.title, item.title_romaji, item.title_jp].some((name) => name && normalize(name) === queryTitle) ? 1 : 0;
      return exact(b) - exact(a);
    });
    // Search results don't include external IDs. Verify details before choosing a season.
    for (const item of ordered.slice(0, 20)) {
      if (!Number.isSafeInteger(item.id) || checked.has(item.id)) continue;
      checked.add(item.id);
      try {
        const details = await request(`/api/anifam/anime/${item.id}`, signal);
        const anilistMatch = details.anilist_id != null && String(details.anilist_id) === animeId;
        const malMatch = details.anilist_id == null && malId != null && details.mal_id != null && Number(details.mal_id) === malId;
        if (anilistMatch || malMatch) { providerAnimeId = item.id; break; }
      } catch (error) {
        if (signal.aborted) throw error;
        lookupFailed = true;
      }
    }
    if (providerAnimeId !== undefined) break;
  }
  if (providerAnimeId === undefined) throw new Error(lookupFailed
    ? "Could not verify this anime on the download server. Please try again."
    : "This anime could not be matched to the download server. Try the original download source.");

  const list = await request(`/api/anifam/episodes/${providerAnimeId}`, signal);
  const episodes = (Array.isArray(list.data) ? list.data : Array.isArray(list.episodes) ? list.episodes : []) as ProviderEpisode[];
  const matches = episodes.filter((ep) => Number(ep.number) === episodeNumber && Number.isSafeInteger(ep.id));
  if (matches.length !== 1) throw new Error(`Episode ${episodeNumber} is not available on the download server.`);
  const episode = matches[0];
  if ((track === "sub" && episode.has_sub === false) || (track === "dub" && episode.has_dub === false)) {
    throw new Error(`Episode ${episodeNumber} is not available in ${track.toUpperCase()} on the download server.`);
  }
  const playback = await request("/api/anifam/play", signal, { episodeId: episode.id, track });
  if (playback.status !== "ready") throw new Error("This episode is not available for download from the server.");
  if (playback.mode === "iframe" || typeof playback.proxyHlsUrl !== "string") throw new Error("This source only provides an embedded player and cannot be downloaded.");
  const base = new URL(STREAM_API_URL);
  const url = new URL(playback.proxyHlsUrl, `${base.origin}/`);
  if (url.origin !== base.origin || url.pathname !== "/api/proxy/hls") throw new Error("The server returned an invalid playlist link.");
  return { url: url.href, subtitles: subtitleFiles(playback.subtitles, STREAM_API_URL) };
}

export async function resolveRenderStream(options: Parameters<typeof resolveRenderPlayback>[0]): Promise<string> {
  return (await resolveRenderPlayback(options)).url;
}
