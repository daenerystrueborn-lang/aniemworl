import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Hls from "hls.js";
import {
  ChevronLeft, Play, List, Star, ChevronDown, ChevronUp,
  Loader2, AlertCircle, Search, ChevronRight,
} from "lucide-react";
import { apiUrl } from "../lib/api";

/* ── Types ─────────────────────────────────────────── */
interface AnimeDetail {
  id: number;
  title: string;
  cover: string; banner: string;
  description: string; genres: string[]; score: number | null;
  format: string; episodes: number | null; year: number | null; status: string;
}
interface PaheResult { session: string; title: string; poster?: string; episodes?: number; }
interface PaheEpisode {
  id: number; episode: number; session: string;
  snapshot?: string; duration?: string; filler?: boolean;
}
interface PaheEpisodesResponse {
  data: PaheEpisode[]; current_page: number; last_page: number; total: number;
}
interface StreamSource { url: string; isM3U8: boolean; resolution: string; isDub: boolean; }
interface StreamSourcesResponse {
  success: boolean;
  data: { animeSession: string; episodeSession: string; sources: StreamSource[] } | null;
  error?: string;
}

/* ── Helpers ────────────────────────────────────────── */

const HISTORY_KEY = "aw_history";
function getHistory(): Record<string, { epNum: number; session: string }> {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}"); } catch { return {}; }
}
function saveHistory(id: string, epNum: number, session: string) {
  const h = getHistory(); h[id] = { epNum, session };
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

/* ── Main Page ──────────────────────────────────────── */
export default function WatchPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";

  const [paheSession, setPaheSession] = useState<string | null>(null);
  const [paheResults, setPaheResults] = useState<PaheResult[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedEp, setSelectedEp] = useState<PaheEpisode | null>(null);
  const [epPage, setEpPage] = useState(1);
  const [showEpList, setShowEpList] = useState(true);
  const [searchingPahe, setSearchingPahe] = useState(false);

  /* Anime details */
  const { data: detail, isLoading: detailLoading } = useQuery<AnimeDetail>({
    queryKey: ["watch-detail", id],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/anime/details/${id}`));
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });

  /* Search AnimePahe when we have the title */
  useEffect(() => {
    if (!detail?.title || paheSession) return;
    setSearchingPahe(true);
    fetch(apiUrl(`/api/animepahe/search?q=${encodeURIComponent(detail.title)}`))
      .then((r) => r.json())
      .then((json) => {
        const results: PaheResult[] = json.data ?? [];
        setPaheResults(results);
        if (results.length === 1) {
          setPaheSession(results[0].session);
        } else if (results.length > 1) {
          /* Auto-pick best match */
          const best = results.find(
            (r) => r.title.toLowerCase() === detail.title.toLowerCase(),
          ) ?? results[0];
          setPaheSession(best.session);
        }
      })
      .catch(() => {})
      .finally(() => setSearchingPahe(false));
  }, [detail?.title, paheSession]);

  /* Episode list */
  const { data: epData, isLoading: epLoading } = useQuery<PaheEpisodesResponse>({
    queryKey: ["pahe-episodes", paheSession, epPage],
    queryFn: async () => {
      const res = await fetch(
        apiUrl(`/api/animepahe/episodes/${paheSession}?page=${epPage}`),
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!paheSession,
    staleTime: 5 * 60 * 1000,
  });

  const episodes = epData?.data ?? [];
  const lastPage = epData?.last_page ?? 1;

  /* Restore last watched */
  useEffect(() => {
    if (!episodes.length || selectedEp) return;
    const hist = getHistory()[id];
    if (hist) {
      const found = episodes.find((e) => e.episode === hist.epNum);
      if (found) { setSelectedEp(found); return; }
    }
    setSelectedEp(episodes[0]);
  }, [episodes, id, selectedEp]);

  function pickEpisode(ep: PaheEpisode) {
    setSelectedEp(ep);
    if (paheSession) saveHistory(id, ep.episode, paheSession);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* Stream sources for the selected episode */
  const { data: sourcesData, isLoading: sourcesLoading } = useQuery<StreamSourcesResponse>({
    queryKey: ["pahe-sources", paheSession, selectedEp?.session],
    queryFn: async () => {
      const res = await fetch(
        apiUrl(`/api/animepahe/sources/${paheSession}/${selectedEp!.session}`),
      );
      return res.json();
    },
    enabled: !!paheSession && !!selectedEp,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  /* Pick best quality source (prefer sub, highest resolution) */
  const activeSource = (() => {
    const sources = sourcesData?.data?.sources ?? [];
    if (!sources.length) return null;
    const subSources = sources.filter((s) => !s.isDub);
    const pool = subSources.length ? subSources : sources;
    return pool.slice().sort((a, b) => Number(b.resolution) - Number(a.resolution))[0] ?? null;
  })();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource?.url) return;
    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(activeSource.url);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeSource.url;
    }
    return () => { hls?.destroy(); };
  }, [activeSource?.url]);

  if (detailLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-16 pb-20">
        {/* Back */}
        <Link href={`/wiki/${id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 mt-2 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Wiki
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          {/* ── Left: player + info ── */}
          <div className="space-y-4">
            {/* Player */}
            <div className="rounded-xl overflow-hidden bg-black border border-border" style={{ aspectRatio: "16/9" }}>
              {activeSource ? (
                <video
                  key={activeSource.url}
                  ref={videoRef}
                  className="w-full h-full"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  {searchingPahe || epLoading || sourcesLoading ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Finding stream…</p>
                    </>
                  ) : !paheSession ? (
                    <>
                      <AlertCircle className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center px-4">
                        {detail?.title
                          ? `No stream found for "${detail.title}"`
                          : "Stream not found"}
                      </p>
                      {paheResults.length === 0 && detail?.title && (
                        <a
                          href={`https://animepahe.si/?s=${encodeURIComponent(detail.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline flex items-center gap-1"
                        >
                          <Search className="w-3 h-3" /> Search on AnimePahe
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <Play className="w-10 h-10 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Select an episode to watch</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* AnimePahe picker (multiple results) */}
            {paheResults.length > 1 && (
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-foreground">Select correct series on AnimePahe:</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {paheResults.map((r) => (
                    <button
                      key={r.session}
                      onClick={() => { setPaheSession(r.session); setSelectedEp(null); setEpPage(1); }}
                      className={`text-xs px-3 py-1.5 rounded border transition-all ${
                        paheSession === r.session
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-muted text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {r.title}{r.episodes ? ` (${r.episodes} eps)` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            {detail && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex gap-4">
                  {detail.cover && (
                    <img src={detail.cover} alt={detail.title} className="w-16 rounded-lg shrink-0 object-cover" style={{ aspectRatio: "2/3" }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight mb-1">{detail.title}</h1>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {detail.score && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-accent">
                          <Star className="w-3 h-3 fill-accent" />
                          {(detail.score / 10).toFixed(1)}
                        </span>
                      )}
                      {detail.format && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{detail.format}</span>}
                      {detail.status && <span className="text-xs text-muted-foreground">{detail.status}</span>}
                      {detail.year && <span className="text-xs text-muted-foreground">{detail.year}</span>}
                    </div>
                    {detail.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{detail.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {detail.genres.slice(0, 4).map((g) => (
                        <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{g}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: episode list ── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            {/* Header */}
            <button
              onClick={() => setShowEpList((v) => !v)}
              className="flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">
                  Episodes
                  {epData?.total ? ` (${epData.total})` : ""}
                </span>
              </div>
              {showEpList
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {showEpList && (
              <>
                {/* Episode scroll list */}
                <div className="flex-1 overflow-y-auto" style={{ maxHeight: "420px" }}>
                  {epLoading ? (
                    <div className="flex items-center justify-center h-24">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : !paheSession ? (
                    <div className="flex items-center justify-center h-24 text-xs text-muted-foreground px-4 text-center">
                      {searchingPahe ? "Searching AnimePahe…" : "Stream source not found"}
                    </div>
                  ) : episodes.length === 0 ? (
                    <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                      No episodes found
                    </div>
                  ) : (
                    <div className="p-1.5 space-y-0.5">
                      {episodes.map((ep) => {
                        const active = selectedEp?.episode === ep.episode;
                        return (
                          <button
                            key={ep.id}
                            onClick={() => pickEpisode(ep)}
                            className={`w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-3 transition-all ${
                              active
                                ? "bg-accent/15 border border-accent/30"
                                : "hover:bg-muted/60 border border-transparent"
                            }`}
                          >
                            {ep.snapshot ? (
                              <img src={ep.snapshot} alt="" className="w-14 h-9 object-cover rounded shrink-0" loading="lazy" />
                            ) : (
                              <div className="w-14 h-9 bg-muted rounded shrink-0 flex items-center justify-center">
                                <Play className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium truncate ${active ? "text-accent" : "text-foreground"}`}>
                                Episode {ep.episode}
                                {ep.filler && <span className="ml-1 text-[10px] text-muted-foreground">(Filler)</span>}
                              </p>
                              {ep.duration && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">{ep.duration}</p>
                              )}
                            </div>
                            {active && <Play className="w-3 h-3 text-accent fill-accent shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {lastPage > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20">
                    <button
                      onClick={() => { setEpPage((p) => Math.max(1, p - 1)); setSelectedEp(null); }}
                      disabled={epPage === 1}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <span className="text-xs text-muted-foreground">
                      Page {epPage} / {lastPage}
                    </span>
                    <button
                      onClick={() => { setEpPage((p) => Math.min(lastPage, p + 1)); setSelectedEp(null); }}
                      disabled={epPage === lastPage}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
