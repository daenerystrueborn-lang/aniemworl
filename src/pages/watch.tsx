import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
  Search, List, Grid3X3, Image as ImageIcon, Play,
  SkipBack, SkipForward, CheckSquare, Square,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

interface WikiDetail {
  id: number;
  malId: number | null;
  title: { english: string | null; romaji: string | null; native: string | null; display: string };
  cover: string;
  banner: string;
  description: string;
  genres: string[];
  format: string;
  status: string;
  episodes: number | null;
  year: number | null;
  studios: string[];
  relations: { id: number; title: string; format: string; year: number | null; relationType: string }[];
}

interface Episode {
  number: number;
  title: string;
  thumbnail: string | null;
  filler: boolean;
  recap: boolean;
}

async function fetchDetails(id: string): Promise<WikiDetail> {
  const res = await fetch(apiUrl(`/api/anime/details/${id}`));
  if (!res.ok) throw new Error("Not found");
  return res.json();
}

async function fetchEpisodes(anilistId: number): Promise<Episode[]> {
  const res = await fetch(apiUrl(`/api/anime/episodes/${anilistId}`));
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data.episodes ?? [];
}

function getEpisodeId(ep: Episode) {
  return `ep-${ep.number}`;
}

type DisplayMode = "list" | "grid" | "image";

function EpisodeList({
  episodes,
  currentEp,
  animeId,
  onSelect,
}: {
  episodes: Episode[];
  currentEp: number;
  animeId: string;
  onSelect: (ep: number) => void;
}) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [interval, setInterval] = useState<[number, number]>([0, 99]);
  const [watched, setWatched] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(`watched-${animeId}`);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const intervalOptions = useMemo(() => {
    const opts: { start: number; end: number }[] = [];
    for (let i = 0; i < episodes.length; i += 100) {
      opts.push({ start: i, end: Math.min(i + 99, episodes.length - 1) });
    }
    return opts;
  }, [episodes]);

  // Jump interval when currentEp changes
  useEffect(() => {
    const idx = episodes.findIndex((e) => e.number === currentEp);
    if (idx === -1) return;
    for (const { start, end } of intervalOptions) {
      if (idx >= start && idx <= end) {
        setInterval([start, end]);
        break;
      }
    }
  }, [currentEp, episodes, intervalOptions]);

  // Mark current as watched
  useEffect(() => {
    setWatched((prev) => {
      if (prev.has(currentEp)) return prev;
      const next = new Set(prev);
      next.add(currentEp);
      localStorage.setItem(`watched-${animeId}`, JSON.stringify([...next]));
      return next;
    });
  }, [currentEp, animeId]);

  // Scroll selected into view
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedRef.current && containerRef.current) {
        const el = selectedRef.current;
        const container = containerRef.current;
        const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
        container.scrollTo({ top: container.scrollTop + top - container.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentEp, displayMode]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return episodes.filter(
      (ep) => ep.title.toLowerCase().includes(q) || ep.number.toString().includes(q)
    );
  }, [episodes, searchTerm]);

  const displayed = searchTerm
    ? filtered
    : episodes.slice(interval[0], interval[1] + 1);

  return (
    <div className="flex flex-col h-full bg-card rounded-lg overflow-hidden border border-border">
      {/* Controls */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/60 border-b border-border shrink-0">
        <select
          className="text-xs bg-muted text-foreground border border-border rounded px-1.5 py-1 flex-1 min-w-0"
          value={`${interval[0]}-${interval[1]}`}
          onChange={(e) => {
            const [s, en] = e.target.value.split("-").map(Number);
            setInterval([s, en]);
          }}
        >
          {intervalOptions.map(({ start, end }) => (
            <option key={start} value={`${start}-${end}`}>
              EP {episodes[start]?.number ?? start + 1}–{episodes[end]?.number ?? end + 1}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 bg-muted border border-border rounded px-2 py-1 flex-shrink-0">
          <Search className="w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs bg-transparent text-foreground outline-none w-16"
          />
        </div>

        <button
          onClick={() => setDisplayMode((m) => m === "list" ? "grid" : m === "grid" ? "image" : "list")}
          className="shrink-0 p-1.5 rounded border border-border bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {displayMode === "list" ? <List className="w-3.5 h-3.5" /> : displayMode === "grid" ? <Grid3X3 className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Episodes */}
      <div
        ref={containerRef}
        className={`overflow-y-auto flex-1 p-1.5 ${displayMode === "grid" ? "grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1" : "flex flex-col gap-0.5"}`}
      >
        {displayed.map((ep) => {
          const isSelected = ep.number === currentEp;
          const isWatched = watched.has(ep.number);

          const baseClass = "rounded text-left transition-colors cursor-pointer flex items-center";
          const colorClass = isSelected
            ? "bg-accent text-accent-foreground"
            : isWatched
            ? "bg-primary/80 text-primary-foreground hover:brightness-110"
            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground";

          if (displayMode === "grid") {
            return (
              <button
                key={ep.number}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => onSelect(ep.number)}
                className={`${baseClass} ${colorClass} justify-center p-1 text-xs font-medium`}
              >
                {isSelected ? <Play className="w-3 h-3" /> : ep.number}
              </button>
            );
          }

          return (
            <button
              key={ep.number}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onSelect(ep.number)}
              className={`${baseClass} ${colorClass} gap-2 px-2 py-1.5`}
            >
              <span className="text-xs font-bold w-7 shrink-0 text-right">
                {isSelected ? <Play className="w-3 h-3" /> : ep.number}
              </span>
              <span className="text-xs truncate flex-1">{ep.title}</span>
              {ep.filler && <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shrink-0">F</span>}
            </button>
          );
        })}
        {displayed.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">No episodes found</p>
        )}
      </div>
    </div>
  );
}

function IFramePlayer({
  anilistId,
  episodeNumber,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  autoNext,
  onToggleAutoNext,
  onEnded,
}: {
  anilistId: string;
  episodeNumber: number;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  autoNext: boolean;
  onToggleAutoNext: () => void;
  onEnded: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const sources = [
    `https://megaplay.buzz/stream/ani/${anilistId}/${episodeNumber}/sub`,
    `https://megaplay.buzz/stream/ani/${anilistId}/${episodeNumber}/dub`,
    `https://vidwish.live/stream/ani/${anilistId}/${episodeNumber}/sub`,
  ];
  const [sourceIdx, setSourceIdx] = useState(0);
  const iframeSrc = sources[sourceIdx];

  useEffect(() => { setLoading(true); setSourceIdx(0); }, [anilistId, episodeNumber]);

  return (
    <div className="space-y-2">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-border">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          key={`${anilistId}-${episodeNumber}-${sourceIdx}`}
          src={iframeSrc}
          className="w-full h-full"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          onLoad={() => setLoading(false)}
        />
      </div>
      {/* Server switcher */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground px-1">
        <span className="font-medium text-foreground">Server:</span>
        {["Sub", "Dub", "Vidwish"].map((name, i) => (
          <button
            key={i}
            onClick={() => { setSourceIdx(i); setLoading(true); }}
            className={`px-2 py-0.5 rounded border transition-colors ${sourceIdx === i ? "border-accent text-accent bg-accent/10" : "border-border hover:border-accent/50"}`}
          >
            {name}
          </button>
        ))}
        <a
          href={iframeSrc}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto px-2 py-0.5 rounded border border-border hover:border-accent/50 transition-colors"
        >
          Open ↗
        </a>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-3 py-1.5">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="flex items-center gap-1 text-xs text-foreground bg-muted border border-border rounded px-2 py-1 hover:bg-muted/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <SkipBack className="w-3.5 h-3.5" /> Prev
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="flex items-center gap-1 text-xs text-foreground bg-muted border border-border rounded px-2 py-1 hover:bg-muted/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next <SkipForward className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleAutoNext}
          className="flex items-center gap-1 text-xs text-foreground bg-muted border border-border rounded px-2 py-1 hover:bg-muted/70 transition-colors ml-auto"
        >
          {autoNext ? <CheckSquare className="w-3.5 h-3.5 text-accent" /> : <Square className="w-3.5 h-3.5" />}
          Auto Next
        </button>
      </div>
    </div>
  );
}

export default function WatchPage() {
  const params = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const id = params.id;

  const searchParams = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
  const epParam = searchParams.get("ep");
  const [currentEp, setCurrentEp] = useState(epParam ? parseInt(epParam, 10) : 1);
  const [autoNext, setAutoNext] = useState(true);

  const { data: anime, isLoading: animeLoading, isError: animeError } = useQuery<WikiDetail>({
    queryKey: ["wiki-detail", id],
    queryFn: () => fetchDetails(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });

  const seasons = useMemo(() => {
    if (!anime?.relations) return [];
    return anime.relations
      .filter((r) => (r.relationType === "SEQUEL" || r.relationType === "PREQUEL") && r.format === "TV")
      .sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  }, [anime?.relations]);

  const { data: fetchedEpisodes = [], isLoading: episodesLoading } = useQuery<Episode[]>({
    queryKey: ["episodes", anime?.id],
    queryFn: () => fetchEpisodes(anime!.id),
    staleTime: 30 * 60 * 1000,
    enabled: !!anime?.id,
  });

  const episodes = useMemo(() => {
    if (fetchedEpisodes.length > 0) return fetchedEpisodes;
    // Fallback only fires if the backend call itself failed outright
    // (network error, AniList down) but we still know the total count.
    if (anime?.episodes) {
      return Array.from({ length: anime.episodes }, (_, i) => ({
        number: i + 1,
        title: `Episode ${i + 1}`,
        thumbnail: null,
        filler: false,
        recap: false,
      }));
    }
    return fetchedEpisodes;
  }, [fetchedEpisodes, anime?.episodes]);

  const currentIndex = useMemo(
    () => episodes.findIndex((e) => e.number === currentEp),
    [episodes, currentEp]
  );

  const currentEpisode = episodes[currentIndex] ?? null;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < episodes.length - 1 && currentIndex !== -1;

  const navigateToEp = useCallback(
    (ep: number) => {
      setCurrentEp(ep);
      const base = location.includes("?") ? location.split("?")[0] : location;
      setLocation(`${base}?ep=${ep}`, { replace: true });
    },
    [location, setLocation]
  );

  const handlePrev = useCallback(() => {
    if (hasPrev) navigateToEp(episodes[currentIndex - 1].number);
  }, [hasPrev, currentIndex, episodes, navigateToEp]);

  const handleNext = useCallback(() => {
    if (hasNext) navigateToEp(episodes[currentIndex + 1].number);
  }, [hasNext, currentIndex, episodes, navigateToEp]);

  // Save watch history
  useEffect(() => {
    if (!anime || !currentEp) return;
    try {
      const history = JSON.parse(localStorage.getItem("watch-history") || "{}");
      history[id] = {
        episodeNumber: currentEp,
        animeTitle: anime.title.display,
        animeImage: anime.cover,
        cover: anime.banner || anime.cover,
        timestamp: Date.now(),
      };
      localStorage.setItem("watch-history", JSON.stringify(history));
    } catch { /* ignore */ }
  }, [id, currentEp, anime]);

  if (animeLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (animeError || !anime) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground">Could not load anime.</p>
        <Link href="/" className="text-accent text-sm hover:underline">← Home</Link>
      </div>
    );
  }

  const animeTitle = anime.title.english || anime.title.romaji || "Unknown Anime";

  return (
    <div className="min-h-screen bg-background pt-16 pb-10">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/wiki/${id}`} className="hover:text-foreground transition-colors truncate max-w-xs">
            {animeTitle}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground">
            {episodesLoading ? "Loading…" : currentEpisode ? `Episode ${currentEp}` : `Episode ${currentEp}`}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Left: Player + info */}
          <div className="space-y-4">
            <IFramePlayer
              anilistId={id}
              episodeNumber={currentEp}
              onPrev={handlePrev}
              onNext={handleNext}
              hasPrev={hasPrev}
              hasNext={hasNext}
              autoNext={autoNext}
              onToggleAutoNext={() => setAutoNext((v) => !v)}
              onEnded={handleNext}
            />

            {/* Anime info strip */}
            <div className="flex items-start gap-4 bg-card border border-border rounded-xl p-4">
              {anime.cover && (
                <img
                  src={anime.cover}
                  alt={animeTitle}
                  className="w-14 aspect-[2/3] rounded-lg object-cover border border-border shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-foreground leading-tight">{animeTitle}</h1>
                {anime.title.romaji && anime.title.romaji !== anime.title.display && (
                  <p className="text-xs text-muted-foreground mt-0.5">{anime.title.romaji}</p>
                )}
                {currentEpisode && (
                  <p className="text-sm text-accent mt-1 font-medium">
                    Episode {currentEp}: {currentEpisode.title}
                    {currentEpisode.filler && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Filler
                      </span>
                    )}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2">
                  {anime.format && <span className="text-xs text-muted-foreground">{anime.format}</span>}
                  {anime.year && <span className="text-xs text-muted-foreground">{anime.year}</span>}
                  {anime.studios.length > 0 && (
                    <span className="text-xs text-muted-foreground">{anime.studios[0]}</span>
                  )}
                </div>
                {seasons.length > 0 && (
                  <select
                    value={id}
                    onChange={(e) => setLocation(`/watch/${e.target.value}`)}
                    className="mt-2 text-xs bg-muted border border-border rounded px-2 py-1 text-foreground"
                  >
                    <option value={id}>
                      {anime.format}{anime.year ? ` (${anime.year})` : ""} — current
                    </option>
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}{s.year ? ` (${s.year})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <Link
                href={`/wiki/${id}`}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Details
              </Link>
            </div>

            {/* Description */}
            {anime.description && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-bold text-foreground mb-2">Synopsis</h2>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                  {anime.description}
                </p>
              </div>
            )}
          </div>

          {/* Right: Episode list */}
          <div className="h-[500px] lg:h-auto lg:max-h-[calc(100vh-8rem)] lg:sticky lg:top-20">
            {episodesLoading ? (
              <div className="h-full bg-card border border-border rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Loading episodes…</p>
                </div>
              </div>
            ) : episodes.length === 0 ? (
              <div className="h-full bg-card border border-border rounded-lg flex items-center justify-center">
                <div className="text-center px-4">
                  <AlertCircle className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No episode list available.</p>
                  <p className="text-xs text-muted-foreground mt-1">Use the player controls to navigate.</p>
                </div>
              </div>
            ) : (
              <EpisodeList
                episodes={episodes}
                currentEp={currentEp}
                animeId={id}
                onSelect={navigateToEp}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
