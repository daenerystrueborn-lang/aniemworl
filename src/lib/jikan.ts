/**
 * jikan.ts — frontend-only MyAnimeList episode fetcher via Jikan v4.
 * No API key, no backend, no install needed — calls api.jikan.moe directly.
 *
 * Usage:
 *   import { fetchJikanEpisodes } from "@/lib/jikan";
 *   const episodes = await fetchJikanEpisodes(malId);
 */

const JIKAN_BASE = "https://api.jikan.moe/v4";

export interface JikanEpisode {
  number: number;
  title: string;
  thumbnail: string | null;
  filler: boolean;
  recap: boolean;
  aired: string | null; // ISO date string, null if not yet aired
}

type RawJikanEp = {
  mal_id: number;
  title?: string;
  aired?: string | null;
  images?: { jpg?: { image_url?: string } };
  filler?: boolean;
  recap?: boolean;
};

async function fetchPage(
  malId: number,
  page: number
): Promise<{ episodes: JikanEpisode[]; lastPage: number }> {
  const res = await fetch(`${JIKAN_BASE}/anime/${malId}/episodes?page=${page}`);
  if (!res.ok) throw new Error(`Jikan HTTP ${res.status}`);
  const data = await res.json();

  const episodes: JikanEpisode[] = (data.data ?? []).map((ep: RawJikanEp) => ({
    number: ep.mal_id,
    title: ep.title ?? `Episode ${ep.mal_id}`,
    thumbnail: ep.images?.jpg?.image_url ?? null,
    filler: ep.filler ?? false,
    recap: ep.recap ?? false,
    aired: ep.aired ?? null,
  }));

  return {
    episodes,
    lastPage: data.pagination?.last_visible_page ?? 1,
  };
}

/**
 * Fetch all AIRED episodes for a given MAL ID.
 * Filters out episodes with a future aired date so only released eps show.
 * Jikan paginates at 100 eps/page — fetched sequentially to respect rate limit.
 */
export async function fetchJikanEpisodes(malId: number): Promise<JikanEpisode[]> {
  const { episodes: firstPage, lastPage } = await fetchPage(malId, 1);

  const all: JikanEpisode[] = [...firstPage];
  for (let page = 2; page <= lastPage; page++) {
    const { episodes } = await fetchPage(malId, page);
    all.push(...episodes);
  }

  const now = Date.now();
  return all.filter((ep) => {
    if (!ep.aired) return false; // not aired yet
    return new Date(ep.aired).getTime() <= now;
  });
}
