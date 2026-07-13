import { Router } from "express";

const router = Router();

const ANILIST_URL = "https://graphql.anilist.co";
const ANIMEPAHE_BASE = "https://animepahe.si";
const ANIMEPAHE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Referer": "https://kwik.cx/",
  "Accept": "application/json, text/html,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function anilistQuery(query: string, variables: Record<string, unknown>): Promise<any> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList error: ${res.status}`);
  return res.json() as Promise<any>;
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

function mapMedia(m: Record<string, any>) {
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

// GET /api/anime/trending?type=ANIME&perPage=10&format=MOVIE&status=RELEASING&genre=Action
router.get("/anime/trending", async (req, res) => {
  const type = req.query.type === "MANGA" ? "MANGA" : "ANIME";
  const perPage = Math.min(Number(req.query.perPage) || 10, 50);
  const format = req.query.format ? String(req.query.format) : null;
  const status = req.query.status ? String(req.query.status) : null;
  const genre = req.query.genre ? String(req.query.genre) : null;

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

  try {
    const json = await anilistQuery(query, variables);
    const data = (json.data?.Page?.media ?? []).map(mapMedia);
    res.json({ data });
  } catch (err) {
    req.log.error({ err }, "AniList trending error");
    res.status(502).json({ error: "Failed to fetch trending" });
  }
});

// GET /api/anime/rankings?type=ANIME&perPage=50&sort=SCORE_DESC&year=2026&season=SPRING&format=MOVIE
router.get("/anime/rankings", async (req, res) => {
  const type = req.query.type === "MANGA" ? "MANGA" : "ANIME";
  const perPage = Math.min(Number(req.query.perPage) || 50, 50);
  const sort = ["SCORE_DESC", "POPULARITY_DESC", "TRENDING_DESC"].includes(String(req.query.sort))
    ? String(req.query.sort) : "SCORE_DESC";
  const year = req.query.year ? Number(req.query.year) : null;
  const season = req.query.season ? String(req.query.season) : null;
  const format = req.query.format ? String(req.query.format) : null;

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

  try {
    const variables: Record<string, unknown> = { type, perPage, sort: [sort] };
    if (year) variables.year = year;
    if (season) variables.season = season;
    if (format) variables.format = format;
    const json = await anilistQuery(query, variables);
    const data = (json.data?.Page?.media ?? []).map(mapMedia);
    res.json({ data });
  } catch (err) {
    req.log.error({ err }, "AniList rankings error");
    res.status(502).json({ error: "Failed to fetch rankings" });
  }
});

// GET /api/anime/search?q=naruto&type=ANIME&perPage=20&genre=Action
router.get("/anime/search", async (req, res) => {
  const search = String(req.query.q || "").trim();
  const type = req.query.type === "MANGA" ? "MANGA" : "ANIME";
  const perPage = Math.min(Number(req.query.perPage) || 20, 50);
  const genre = req.query.genre ? String(req.query.genre) : null;

  if (!search && !genre) {
    res.json({ data: [] });
    return;
  }

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

  try {
    const variables: Record<string, unknown> = { type, perPage };
    if (search) variables.search = search;
    if (genre) variables.genre = genre;
    const json = await anilistQuery(query, variables);
    const data = (json.data?.Page?.media ?? []).map(mapMedia);
    res.json({ data });
  } catch (err) {
    req.log.error({ err }, "AniList search error");
    res.status(502).json({ error: "Failed to search" });
  }
});

// GET /api/anime/details/:id — full wiki details
router.get("/anime/details/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

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
            node {
              id
              name { full }
              image { large }
            }
            voiceActors(language: JAPANESE) {
              id
              name { full }
              image { large }
            }
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              title { english romaji }
              coverImage { large }
              format
              seasonYear
            }
          }
        }
        trailer { id site }
        externalLinks { url site }
        nextAiringEpisode { episode timeUntilAiring }
      }
    }
  `;

  try {
    const json = await anilistQuery(query, { id });
    const m = json.data?.Media;
    if (!m) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
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
    });
  } catch (err) {
    req.log.error({ err }, "AniList details error");
    res.status(502).json({ error: "Failed to fetch details" });
  }
});

// GET /api/character/trending?perPage=20 — popular characters for browse/swipe strip
router.get("/character/trending", async (req, res) => {
  const perPage = Math.min(Number(req.query.perPage) || 20, 50);

  const query = `
    query ($perPage: Int) {
      Page(perPage: $perPage) {
        characters(sort: FAVOURITES_DESC) {
          id
          name { full }
          image { large }
          favourites
          media(sort: POPULARITY_DESC, perPage: 1) {
            edges {
              node {
                title { english romaji }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const json = await anilistQuery(query, { perPage });
    const characters = json.data?.Page?.characters ?? [];

    res.json({
      data: characters.map((c: any) => ({
        id: c.id,
        name: c.name?.full || "",
        image: c.image?.large || "",
        popularity: c.favourites ?? 0,
        topAnime: c.media?.edges?.[0]?.node?.title?.english
          || c.media?.edges?.[0]?.node?.title?.romaji
          || null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "AniList trending characters error");
    res.status(502).json({ error: "Failed to fetch trending characters" });
  }
});

// GET /api/character/:id — AniList character details
router.get("/character/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

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
            node {
              id
              title { english romaji }
              coverImage { large }
              format
              seasonYear
            }
          }
        }
      }
    }
  `;

  try {
    const json = await anilistQuery(query, { id });
    const c = json.data?.Character;
    if (!c) { res.status(404).json({ error: "Not found" }); return; }

    res.json({
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
    });
  } catch (err) {
    req.log.error({ err }, "AniList character error");
    res.status(502).json({ error: "Failed to fetch character" });
  }
});

// GET /api/anime/episodes/:id — fetch all episodes from AniList, keyed by AniList id
// (previously keyed by MAL id via Jikan — that silently returned an empty list
// whenever a title had no MAL mapping, or a short list when Jikan's data was
// incomplete. AniList id is always available for anything already loaded on
// the site, and `episodes` (total count) is authoritative, so the list is
// now always complete regardless of season length.)
router.get("/anime/episodes/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const query = `
    query ($id: Int) {
      Media(id: $id) {
        episodes
        streamingEpisodes {
          title
          thumbnail
        }
      }
    }
  `;

  try {
    const json = await anilistQuery(query, { id });
    const m = json.data?.Media;
    if (!m) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const streaming: { title: string; thumbnail: string | null }[] = m.streamingEpisodes ?? [];
    const total: number = m.episodes ?? streaming.length;

    // streamingEpisodes titles usually look like "Episode 12 - Some Title"
    function parseStreamingTitle(raw: string, num: number): string {
      const match = raw.match(/^Episode\s+\d+\s*[-–:]\s*(.+)$/i);
      return match?.[1]?.trim() || raw.trim() || `Episode ${num}`;
    }

    const episodes = Array.from({ length: total }, (_, i) => {
      const num = i + 1;
      const streamEp = streaming[i];
      return {
        number: num,
        title: streamEp ? parseStreamingTitle(streamEp.title, num) : `Episode ${num}`,
        thumbnail: streamEp?.thumbnail ?? null,
        filler: false,
        recap: false,
      };
    });

    res.json({ episodes });
  } catch (err) {
    req.log.error({ err }, "AniList episodes error");
    res.status(502).json({ error: "Failed to fetch episodes" });
  }
});

// GET /api/animepahe/search?q=naruto — search animePahe
router.get("/animepahe/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) {
    res.json({ data: [] });
    return;
  }

  try {
    const url = `${ANIMEPAHE_BASE}/api?m=search&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: ANIMEPAHE_HEADERS, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`animePahe status ${r.status}`);
    const json = (await r.json()) as any;
    res.json({ data: json.data ?? [] });
  } catch (err) {
    req.log.error({ err }, "animePahe search error");
    res.status(502).json({ data: [], error: "animePahe unavailable" });
  }
});

// GET /api/animepahe/episodes/:session?page=1 — episode list
router.get("/animepahe/episodes/:session", async (req, res) => {
  const session = req.params.session;
  const page = Number(req.query.page) || 1;

  try {
    const url = `${ANIMEPAHE_BASE}/api?m=release&id=${session}&sort=episode_asc&page=${page}`;
    const r = await fetch(url, { headers: ANIMEPAHE_HEADERS, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`animePahe status ${r.status}`);
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "animePahe episodes error");
    res.status(502).json({ data: [], error: "animePahe unavailable" });
  }
});

export default router;
