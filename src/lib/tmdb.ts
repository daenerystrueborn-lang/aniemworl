// TMDB client — used only for the "Popular" browse list on the Movies page,
// since OMDb has no discovery/trending endpoint (it's title-lookup only).
// Search and single-movie detail lookups still go through OMDb (lib/omdb.ts);
// this file's job is just to produce a real "what's popular right now" list
// and map it into the same OmdbMovie shape the rest of movies.tsx expects,
// so the existing player/card components don't need to change.

import type { OmdbMovie } from "./omdb";

// TMDB v3 API key — safe to use client-side (unlike the v4 read token or
// account secrets), this is how TMDB's own docs expect it to be used.
const TMDB_KEY = "b61a2144fe43b143498fc39948320d99";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500";

interface TmdbMovie {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  vote_average: number;
  overview: string;
  genre_ids: number[];
}

const GENRE_NAMES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Science Fiction", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

async function fetchExternalIds(tmdbId: number): Promise<string | null> {
  try {
    const res = await fetch(`${TMDB_BASE}/movie/${tmdbId}/external_ids?api_key=${TMDB_KEY}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.imdb_id || null;
  } catch {
    return null;
  }
}

async function toOmdbShape(m: TmdbMovie): Promise<OmdbMovie | null> {
  const imdbId = await fetchExternalIds(m.id);
  if (!imdbId) return null; // skip anything without a real IMDB id — the player needs it

  return {
    imdbID: imdbId,
    Title: m.title,
    Year: m.release_date ? m.release_date.slice(0, 4) : "",
    Type: "movie",
    Poster: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : "N/A",
    imdbRating: m.vote_average ? m.vote_average.toFixed(1) : undefined,
    Plot: m.overview || undefined,
    Genre: m.genre_ids.map((id) => GENRE_NAMES[id]).filter(Boolean).join(", ") || undefined,
  };
}

/**
 * Fetch TMDB's actual "Popular" movie list (real popularity ranking,
 * not a random keyword search) and map it to OmdbMovie shape.
 * `page` is TMDB's own paging (20 results per page).
 */
export async function fetchPopularMovies(page = 1): Promise<{ results: OmdbMovie[]; total: number }> {
  try {
    const res = await fetch(`${TMDB_BASE}/movie/popular?api_key=${TMDB_KEY}&page=${page}`);
    if (!res.ok) return { results: [], total: 0 };
    const data = await res.json();
    const raw: TmdbMovie[] = data.results ?? [];

    // Resolve IMDB ids in parallel; drop any that don't resolve
    const mapped = await Promise.all(raw.map(toOmdbShape));
    const results = mapped.filter((m): m is OmdbMovie => m !== null);

    return { results, total: data.total_results ?? results.length };
  } catch {
    return { results: [], total: 0 };
  }
}
