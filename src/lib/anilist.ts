// Direct-to-AniList client. Runs entirely in the browser — no backend needed.
// AniList's GraphQL API (https://graphql.anilist.co) sends CORS headers that
// allow browser fetches, so trending/rankings/search/details/characters can
// all live here and keep working even if the VPS/backend is offline.
//
// Streaming-related stuff (episode sources, mangapill, novelfire, auth,
// uploads) still needs the real backend — those still go through apiUrl()
// in lib/api.ts, unchanged.

const ANILIST_URL = "https://graphql.anilist.co";

async function anilistQuery<T = any>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList error: ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "AniList query error");
  }
  return json;
}

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge }
  bannerImage
  genres
  averageScore
  format
  episodes
  chapters
  seasonYear
  description(asHtml: false)
  popularity
`;

export interface AnimeMedia {
  id: number;
  title: string;
  cover: string;
  banner: string;
  genres: string[];
  score: number | null;
  format: string;
  episodes: number | null;
  chapters: number | null;
  year: number | null;
  description: string;
  popularity: number;
}

function mapMedia(m: Record<string, any>): AnimeMedia {
  return {
    id: m.id,
    title: m.title?.english || m.title?.romaji || m.title?.native || "Unknown",
    cover: m.coverImage?.extraLarge || m.coverImage?.large || "",
    banner: m.bannerImage || "",
    genres: m.genres || [],
    score: m.averageScore ?? null,
    format: m.format || "",
    episodes: m.episodes ?? null,
    chapters: m.chapters ?? null,
    year: m.seasonYear ?? null,
    description: m.description || "",
    popularity: m.popularity ?? 0,
  };
}

export type MediaType = "ANIME" | "MANGA";

// ── /anime/trending ─────────────────────────────────────────────
export async function fetchTrending(opts: {
  type?: MediaType;
  perPage?: number;
  format?: string | null;
  status?: string | null;
  genre?: string | null;
} = {}): Promise<{ data: AnimeMedia[] }> {
  const type = opts.type === "MANGA" ? "MANGA" : "ANIME";
  const perPage = Math.min(opts.perPage || 10, 50);
  const { format = null, status = null, genre = null } = opts;

  const varDefs: string[] = ["$type: MediaType", "$perPage: Int"];
  const filters: string[] = ["type: $type", "sort: TRENDING_DESC", "isAdult: false"];
  const variables: Record<string, unknown> = { type, perPage };

  if (format) { varDefs.push("$format: MediaFormat"); filters.push("format: $format"); variables.format = format; }
  if (status) { varDefs.push("$status: MediaStatus"); filters.push("status: $status"); variables.status = status; }
  if (genre) { varDefs.push("$genre: String"); filters.push("genre: $genre"); variables.genre = genre; }

  const query = `
    query (${varDefs.join(", ")}) {
      Page(perPage: $perPage) {
        media(${filters.join(", ")}) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const json = await anilistQuery(query, variables);
  return { data: (json.data?.Page?.media ?? []).map(mapMedia) };
}

// ── /anime/rankings ──────────────────────────────────────────────
export async function fetchRankings(opts: {
  type?: MediaType;
  perPage?: number;
  sort?: "SCORE_DESC" | "POPULARITY_DESC" | "TRENDING_DESC";
  year?: number | null;
  season?: string | null;
  format?: string | null;
} = {}): Promise<{ data: AnimeMedia[] }> {
  const type = opts.type === "MANGA" ? "MANGA" : "ANIME";
  const perPage = Math.min(opts.perPage || 50, 50);
  const sort = ["SCORE_DESC", "POPULARITY_DESC", "TRENDING_DESC"].includes(opts.sort || "")
    ? (opts.sort as string) : "SCORE_DESC";
  const { year = null, season = null, format = null } = opts;
  const hasFilters = year !== null || season !== null || format !== null;

  const query = hasFilters
    ? `
      query ($type: MediaType, $perPage: Int, $sort: [MediaSort], $year: Int, $season: MediaSeason, $format: MediaFormat) {
        Page(perPage: $perPage) {
          media(type: $type, sort: $sort, isAdult: false, seasonYear: $year, season: $season, format: $format) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `
    : `
      query ($type: MediaType, $perPage: Int, $sort: [MediaSort]) {
        Page(perPage: $perPage) {
          media(type: $type, sort: $sort, isAdult: false, minimumTagRank: 60) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;

  const variables: Record<string, unknown> = { type, perPage, sort: [sort] };
  if (year) variables.year = year;
  if (season) variables.season = season;
  if (format) variables.format = format;

  const json = await anilistQuery(query, variables);
  return { data: (json.data?.Page?.media ?? []).map(mapMedia) };
}

// ── /anime/search ────────────────────────────────────────────────
export async function searchAnime(opts: {
  q?: string;
  type?: MediaType;
  perPage?: number;
  genre?: string | null;
} = {}): Promise<{ data: AnimeMedia[] }> {
  const search = (opts.q || "").trim();
  const type = opts.type === "MANGA" ? "MANGA" : "ANIME";
  const perPage = Math.min(opts.perPage || 20, 50);
  const genre = opts.genre || null;

  if (!search && !genre) return { data: [] };

  const query = search
    ? `
      query ($search: String, $type: MediaType, $perPage: Int, $genre: String) {
        Page(perPage: $perPage) {
          media(search: $search, type: $type, sort: SEARCH_MATCH, isAdult: false, genre: $genre) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `
    : `
      query ($type: MediaType, $perPage: Int, $genre: String) {
        Page(perPage: $perPage) {
          media(type: $type, sort: POPULARITY_DESC, isAdult: false, genre: $genre) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;

  const variables: Record<string, unknown> = { type, perPage };
  if (search) variables.search = search;
  if (genre) variables.genre = genre;

  const json = await anilistQuery(query, variables);
  return { data: (json.data?.Page?.media ?? []).map(mapMedia) };
}

// ── /anime/details/:id ───────────────────────────────────────────
export async function fetchAnimeDetails(id: number) {
  const query = `
    query ($id: Int) {
      Media(id: $id) {
        id
        idMal
        title { romaji english native }
        coverImage { large extraLarge }
        bannerImage
        description(asHtml: false)
        genres
        tags { name rank }
        averageScore
        meanScore
        popularity
        favourites
        format
        status
        episodes
        duration
        chapters
        volumes
        seasonYear
        season
        source
        studios(isMain: true) { nodes { name } }
        characters(sort: ROLE, perPage: 12) {
          edges {
            role
            node { id name { full } image { large } }
            voiceActors(language: JAPANESE) { id name { full } image { large } }
          }
        }
        relations {
          edges {
            relationType
            node { id title { english romaji } coverImage { large } format seasonYear }
          }
        }
        trailer { id site }
        externalLinks { url site }
        nextAiringEpisode { episode timeUntilAiring }
      }
    }
  `;

  const json = await anilistQuery(query, { id });
  const m = json.data?.Media;
  if (!m) throw new Error("Not found");

  return {
    id: m.id,
    malId: m.idMal ?? null,
    title: {
      english: m.title?.english || null,
      romaji: m.title?.romaji || null,
      native: m.title?.native || null,
      display: m.title?.english || m.title?.romaji || m.title?.native || "Unknown",
    },
    cover: m.coverImage?.extraLarge || m.coverImage?.large || "",
    banner: m.bannerImage || "",
    description: (m.description || "").replace(/<[^>]*>/g, ""),
    genres: m.genres || [],
    tags: (m.tags || []).slice(0, 8).map((t: any) => ({ name: t.name, rank: t.rank })),
    score: m.averageScore ?? null,
    meanScore: m.meanScore ?? null,
    popularity: m.popularity ?? 0,
    favourites: m.favourites ?? 0,
    format: m.format || "",
    status: m.status || "",
    episodes: m.episodes ?? null,
    duration: m.duration ?? null,
    chapters: m.chapters ?? null,
    volumes: m.volumes ?? null,
    year: m.seasonYear ?? null,
    season: m.season ?? null,
    source: m.source ?? null,
    studios: (m.studios?.nodes || []).map((s: any) => s.name),
    characters: (m.characters?.edges || []).map((e: any) => ({
      id: e.node?.id,
      name: e.node?.name?.full || "",
      image: e.node?.image?.large || "",
      role: e.role || "",
      voiceActor: e.voiceActors?.[0]
        ? { name: e.voiceActors[0].name?.full || "", image: e.voiceActors[0].image?.large || "" }
        : null,
    })),
    relations: (m.relations?.edges || [])
      .filter((e: any) => ["SEQUEL", "PREQUEL", "SIDE_STORY", "ADAPTATION"].includes(e.relationType))
      .map((e: any) => ({
        id: e.node?.id,
        title: e.node?.title?.english || e.node?.title?.romaji || "",
        cover: e.node?.coverImage?.large || "",
        format: e.node?.format || "",
        year: e.node?.seasonYear ?? null,
        relationType: e.relationType,
      })),
    trailer: m.trailer?.id ? { id: m.trailer.id, site: m.trailer.site } : null,
    nextAiring: m.nextAiringEpisode ?? null,
  };
}

// ── /character/trending ──────────────────────────────────────────
export async function fetchTrendingCharacters(perPage = 20) {
  perPage = Math.min(perPage, 50);
  const query = `
    query ($perPage: Int) {
      Page(perPage: $perPage) {
        characters(sort: FAVOURITES_DESC) {
          id
          name { full }
          image { large }
          favourites
          media(sort: POPULARITY_DESC, perPage: 1) {
            edges { node { title { english romaji } } }
          }
        }
      }
    }
  `;
  const json = await anilistQuery(query, { perPage });
  const characters = json.data?.Page?.characters ?? [];
  return {
    data: characters.map((c: any) => ({
      id: c.id,
      name: c.name?.full || "",
      image: c.image?.large || "",
      popularity: c.favourites ?? 0,
      topAnime: c.media?.edges?.[0]?.node?.title?.english
        || c.media?.edges?.[0]?.node?.title?.romaji
        || null,
    })),
  };
}

// ── /character/:id ───────────────────────────────────────────────
export async function fetchCharacter(id: number) {
  const query = `
    query ($id: Int) {
      Character(id: $id) {
        id
        name { full native alternative }
        image { large }
        description(asHtml: false)
        gender
        age
        bloodType
        favourites
        dateOfBirth { year month day }
        media(sort: POPULARITY_DESC, perPage: 12) {
          edges {
            characterRole
            node { id title { english romaji } coverImage { large } format seasonYear }
          }
        }
      }
    }
  `;
  const json = await anilistQuery(query, { id });
  const c = json.data?.Character;
  if (!c) throw new Error("Not found");

  return {
    id: c.id,
    name: { full: c.name?.full || "", native: c.name?.native || "", alternatives: c.name?.alternative || [] },
    image: c.image?.large || "",
    description: (c.description || "").replace(/<[^>]*>/g, "").replace(/~!/g, "").replace(/!~/g, ""),
    gender: c.gender || null,
    age: c.age || null,
    bloodType: c.bloodType || null,
    popularity: c.favourites ?? 0,
    dateOfBirth: c.dateOfBirth || null,
    appearances: (c.media?.edges || []).map((e: any) => ({
      id: e.node?.id,
      title: e.node?.title?.english || e.node?.title?.romaji || "",
      cover: e.node?.coverImage?.large || "",
      format: e.node?.format || "",
      year: e.node?.seasonYear ?? null,
      role: e.characterRole || "",
    })),
  };
}
