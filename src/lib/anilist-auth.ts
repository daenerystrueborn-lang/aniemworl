/**
 * AniList OAuth + authenticated API helpers.
 * Runs entirely in the browser — no backend needed.
 *
 * SETUP REQUIRED:
 *  1. Go to https://anilist.co/settings/developer → "Create New Client"
 *  2. Set Name: "Animeastral" (or anything)
 *  3. Set Redirect URL: https://astralanime.qzz.io/oauth   ← canonical domain, must match exactly
 *  4. Copy the Client ID and paste it below.
 */

export const ANILIST_CLIENT_ID = "47241";
const ANILIST_GQL = "https://graphql.anilist.co";
const TOKEN_KEY = "animeastral_anilist_token";
const CUSTOM_PFP_KEY = "animeastral_custom_pfp";

/* ── Token helpers ───────────────────────────────────────────── */

export function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setStoredToken(token: string): void {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

export function clearStoredToken(): void {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export function getCustomPfp(): string | null {
  try { return localStorage.getItem(CUSTOM_PFP_KEY); } catch { return null; }
}

export function setCustomPfp(url: string | null): void {
  try {
    if (url) localStorage.setItem(CUSTOM_PFP_KEY, url);
    else localStorage.removeItem(CUSTOM_PFP_KEY);
  } catch {}
}

/* ── OAuth flow ──────────────────────────────────────────────── */

export function redirectToAniListLogin(): void {
  try {
    sessionStorage.setItem(
      "post-login-redirect",
      window.location.pathname + window.location.search,
    );
  } catch { /* ignore */ }
  const params = new URLSearchParams({
    client_id: ANILIST_CLIENT_ID,
    response_type: "token",
  });
  window.location.href = `https://anilist.co/api/v2/oauth/authorize?${params}`;
}

/**
 * Call this on the /oauth route. Parses the access_token from the URL hash.
 * Returns the token string or null if not found.
 */
export function parseOAuthCallback(): string | null {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  const token = params.get("access_token");
  return token;
}

/* ── Authenticated GQL helper ────────────────────────────────── */

async function gql<T = any>(
  query: string,
  variables: Record<string, unknown>,
  token: string,
): Promise<T> {
  const res = await fetch(ANILIST_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList error: ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? "AniList error");
  return json;
}

/* ── Viewer / Profile ────────────────────────────────────────── */

export interface AniListUser {
  id: number;
  name: string;
  avatar: string | null;
  bannerImage: string | null;
  siteUrl: string;
  statistics: {
    anime: { count: number; episodesWatched: number };
    manga: { count: number; chaptersRead: number };
  };
}

export async function fetchViewer(token: string): Promise<AniListUser> {
  const query = `
    query {
      Viewer {
        id name siteUrl
        avatar { large medium }
        bannerImage
        statistics {
          anime { count episodesWatched }
          manga { count chaptersRead }
        }
      }
    }
  `;
  const json = await gql(query, {}, token);
  const v = json.data?.Viewer;
  if (!v) throw new Error("Not authenticated");
  return {
    id: v.id,
    name: v.name,
    avatar: v.avatar?.large || v.avatar?.medium || null,
    bannerImage: v.bannerImage || null,
    siteUrl: v.siteUrl || `https://anilist.co/user/${v.name}`,
    statistics: {
      anime: { count: v.statistics?.anime?.count ?? 0, episodesWatched: v.statistics?.anime?.episodesWatched ?? 0 },
      manga: { count: v.statistics?.manga?.count ?? 0, chaptersRead: v.statistics?.manga?.chaptersRead ?? 0 },
    },
  };
}

/* ── Watchlist ───────────────────────────────────────────────── */

export interface WatchlistEntry {
  entryId: number;
  mediaId: number;
  status: string;       // CURRENT | PLANNING | COMPLETED | DROPPED | PAUSED | REPEATING
  progress: number;
  title: string;
  cover: string;
  type: "ANIME" | "MANGA";
  episodes: number | null;
  chapters: number | null;
}

export const ANILIST_STATUS_LABELS: Record<string, string> = {
  CURRENT: "Watching / Reading",
  PLANNING: "Plan to Watch",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
  PAUSED: "On Hold",
  REPEATING: "Rewatching",
};

export const ANIME_STATUSES = ["CURRENT", "PLANNING", "COMPLETED", "DROPPED", "PAUSED"] as const;
export const MANGA_STATUSES = ["CURRENT", "PLANNING", "COMPLETED", "DROPPED", "PAUSED"] as const;

export async function fetchWatchlist(token: string, userId: number): Promise<WatchlistEntry[]> {
  const query = `
    query ($userId: Int) {
      anime: MediaListCollection(userId: $userId, type: ANIME) {
        lists {
          entries {
            id status progress
            media {
              id episodes
              title { english romaji }
              coverImage { large medium }
            }
          }
        }
      }
      manga: MediaListCollection(userId: $userId, type: MANGA) {
        lists {
          entries {
            id status progress
            media {
              id chapters
              title { english romaji }
              coverImage { large medium }
            }
          }
        }
      }
    }
  `;

  const json = await gql(query, { userId }, token);
  const entries: WatchlistEntry[] = [];

  for (const type of ["anime", "manga"] as const) {
    const lists = json.data?.[type]?.lists ?? [];
    for (const list of lists) {
      for (const e of list.entries ?? []) {
        entries.push({
          entryId: e.id,
          mediaId: e.media?.id,
          status: e.status,
          progress: e.progress ?? 0,
          title: e.media?.title?.english || e.media?.title?.romaji || "Unknown",
          cover: e.media?.coverImage?.large || e.media?.coverImage?.medium || "",
          type: type.toUpperCase() as "ANIME" | "MANGA",
          episodes: type === "anime" ? (e.media?.episodes ?? null) : null,
          chapters: type === "manga" ? (e.media?.chapters ?? null) : null,
        });
      }
    }
  }

  return entries;
}

export async function saveToWatchlist(
  token: string,
  mediaId: number,
  status: string,
): Promise<{ entryId: number; status: string; progress: number }> {
  const mutation = `
    mutation ($mediaId: Int, $status: MediaListStatus) {
      SaveMediaListEntry(mediaId: $mediaId, status: $status) {
        id status progress
      }
    }
  `;
  const json = await gql(mutation, { mediaId, status }, token);
  const entry = json.data?.SaveMediaListEntry;
  return { entryId: entry.id, status: entry.status, progress: entry.progress ?? 0 };
}

export async function removeFromWatchlist(token: string, entryId: number): Promise<void> {
  const mutation = `
    mutation ($id: Int) {
      DeleteMediaListEntry(id: $id) { deleted }
    }
  `;
  await gql(mutation, { id: entryId }, token);
}

/* ── Airing Schedule ─────────────────────────────────────────── */

export interface AiringEntry {
  id: number;
  airingAt: number;
  episode: number;
  media: {
    id: number;
    title: string;
    cover: string;
    format: string;
  };
}

export async function fetchAiringSchedule(date: Date): Promise<AiringEntry[]> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const weekStart = Math.floor(start.getTime() / 1000);
  const weekEnd = Math.floor(end.getTime() / 1000);

  const query = `
    query ($start: Int, $end: Int) {
      Page(perPage: 50) {
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
          id airingAt episode
          media {
            id format
            title { english romaji }
            coverImage { medium large }
          }
        }
      }
    }
  `;

  const res = await fetch(ANILIST_GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables: { start: weekStart, end: weekEnd } }),
  });
  const json = await res.json();
  const schedules = json.data?.Page?.airingSchedules ?? [];

  return schedules.map((s: any) => ({
    id: s.id,
    airingAt: s.airingAt,
    episode: s.episode,
    media: {
      id: s.media?.id,
      title: s.media?.title?.english || s.media?.title?.romaji || "Unknown",
      cover: s.media?.coverImage?.medium || s.media?.coverImage?.large || "",
      format: s.media?.format || "TV",
    },
  }));
}
