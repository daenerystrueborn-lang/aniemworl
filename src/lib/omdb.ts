const OMDB_KEY = "7c3e0084";
const OMDB_BASE = "https://www.omdbapi.com";

export interface OmdbMovie {
  imdbID: string;
  Title: string;
  Year: string;
  Type: string; // "movie" | "series" | "episode"
  Poster: string;
  imdbRating?: string;
  Plot?: string;
  Genre?: string;
  Director?: string;
  Actors?: string;
  Runtime?: string;
  Rated?: string;
}

export async function searchOmdb(
  query: string,
  type?: "movie" | "series",
  page = 1,
): Promise<{ results: OmdbMovie[]; total: number }> {
  const params = new URLSearchParams({ apikey: OMDB_KEY, s: query, page: String(page) });
  if (type) params.set("type", type);
  try {
    const res = await fetch(`${OMDB_BASE}/?${params}`);
    if (!res.ok) return { results: [], total: 0 };
    const data = await res.json();
    if (data.Response !== "True") return { results: [], total: 0 };
    return { results: data.Search ?? [], total: parseInt(data.totalResults ?? "0", 10) };
  } catch {
    return { results: [], total: 0 };
  }
}

export async function getOmdbById(imdbId: string): Promise<OmdbMovie | null> {
  const params = new URLSearchParams({ apikey: OMDB_KEY, i: imdbId, plot: "short" });
  try {
    const res = await fetch(`${OMDB_BASE}/?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.Response === "True" ? data : null;
  } catch {
    return null;
  }
}

/**
 * Look up the IMDB ID for an anime title using OMDB.
 * Tries "series" first (most anime are TV shows), then falls back to a general search.
 * Returns null if nothing is found.
 */
export async function getImdbIdByTitle(title: string): Promise<string | null> {
  // 1. Try series first
  const series = await searchOmdb(title, "series");
  if (series.results.length > 0) return series.results[0].imdbID;
  // 2. Fall back to any type (catches OVAs, films listed as "movie")
  const any = await searchOmdb(title);
  if (any.results.length > 0) return any.results[0].imdbID;
  return null;
}
