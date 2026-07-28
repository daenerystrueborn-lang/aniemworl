import { useState, useRef, useEffect } from "react";
import {
  Search, X, Film, Star, Loader2, Play, ChevronDown,
  ExternalLink, Info,
} from "lucide-react";
import { searchOmdb, type OmdbMovie } from "@/lib/omdb";

const PLACEHOLDER_POSTER = "https://via.placeholder.com/300x450/1a1a1a/666?text=No+Poster";

/* ─── Inline Player ─── */
function InlinePlayer({ movie, onClose }: { movie: OmdbMovie; onClose: () => void }) {
  const src = `https://proxy.garageband.rocks/embed/movie/${movie.imdbID}`;
  const poster =
    movie.Poster && movie.Poster !== "N/A" ? movie.Poster : PLACEHOLDER_POSTER;
  const playerRef = useRef<HTMLDivElement | null>(null);

  // Scroll player into view smoothly when it mounts
  useEffect(() => {
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [movie.imdbID]);

  return (
    <div
      ref={playerRef}
      className="w-full bg-[hsl(0_0%_4%)] border-b border-border"
      style={{
        animation: "slideDown 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-xl font-bold text-foreground leading-tight truncate">
              {movie.Title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
              {movie.Year && <span>{movie.Year}</span>}
              {movie.Runtime && movie.Runtime !== "N/A" && <span>{movie.Runtime}</span>}
              {movie.Genre && movie.Genre !== "N/A" && <span>{movie.Genre}</span>}
              {movie.imdbRating && movie.imdbRating !== "N/A" && (
                <span className="inline-flex items-center gap-0.5 text-yellow-400 font-semibold">
                  <Star className="w-3 h-3 fill-yellow-400" />
                  {movie.imdbRating}
                </span>
              )}
              {movie.Rated && movie.Rated !== "N/A" && (
                <span className="px-1.5 py-0.5 rounded border border-border text-[10px] font-medium">
                  {movie.Rated}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
          >
            <ChevronDown className="w-3.5 h-3.5" /> Close
          </button>
        </div>

        {/* Player + sidebar */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Video */}
          <div className="flex-1 min-w-0">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-border shadow-2xl">
              <iframe
                key={movie.imdbID}
                src={src}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              />
            </div>
            {/* Source note */}
            <p className="text-[10px] text-muted-foreground/40 mt-2 text-center">
              Stream provided by third-party source · Animeastral does not host this content
            </p>
          </div>

          {/* Sidebar info */}
          <div className="lg:w-56 xl:w-64 shrink-0 flex flex-row lg:flex-col gap-3">
            <img
              src={poster}
              alt={movie.Title}
              className="w-20 lg:w-full aspect-[2/3] rounded-xl object-cover border border-border shadow-lg shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = PLACEHOLDER_POSTER;
              }}
            />
            <div className="flex-1 flex flex-col gap-2 lg:gap-3">
              {movie.Plot && movie.Plot !== "N/A" && (
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Info className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                      Plot
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 lg:line-clamp-6">
                    {movie.Plot}
                  </p>
                </div>
              )}
              {movie.Director && movie.Director !== "N/A" && (
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-0.5">
                    Director
                  </p>
                  <p className="text-xs text-foreground">{movie.Director}</p>
                </div>
              )}
              {movie.Actors && movie.Actors !== "N/A" && (
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-0.5">
                    Cast
                  </p>
                  <p className="text-xs text-foreground line-clamp-2">{movie.Actors}</p>
                </div>
              )}
              <a
                href={`https://www.imdb.com/title/${movie.imdbID}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-auto"
              >
                <ExternalLink className="w-3 h-3" /> IMDb page
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Movie Card ─── */
function MovieCard({
  movie,
  active,
  onPlay,
}: {
  movie: OmdbMovie;
  active: boolean;
  onPlay: (m: OmdbMovie) => void;
}) {
  const poster =
    movie.Poster && movie.Poster !== "N/A" ? movie.Poster : PLACEHOLDER_POSTER;

  return (
    <div
      className={`group relative bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer ${
        active
          ? "border-accent shadow-lg shadow-accent/15 ring-1 ring-accent/30"
          : "border-border hover:border-accent/40"
      }`}
      onClick={() => onPlay(movie)}
    >
      <div className="aspect-[2/3] overflow-hidden bg-muted relative">
        <img
          src={poster}
          alt={movie.Title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = PLACEHOLDER_POSTER;
          }}
        />
        {movie.imdbRating && movie.imdbRating !== "N/A" && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/75 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
            <Star className="w-2.5 h-2.5 fill-yellow-400" />
            {movie.imdbRating}
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 bg-accent text-accent-foreground text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
          {movie.Type === "series" ? "TV" : "Movie"}
        </div>

        {/* Active indicator */}
        {active && (
          <div className="absolute inset-0 bg-accent/10 flex items-center justify-center">
            <div className="bg-accent rounded-full p-2.5 shadow-xl shadow-accent/40">
              <Play className="w-4 h-4 fill-accent-foreground text-accent-foreground" />
            </div>
          </div>
        )}

        {/* Hover overlay — only when not active */}
        {!active && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
            <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-semibold">
              <Play className="w-3 h-3 fill-accent-foreground" /> Watch
            </div>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug mb-1">
          {movie.Title}
        </p>
        <p className="text-[10px] text-muted-foreground">{movie.Year}</p>
      </div>
    </div>
  );
}

// Popular search terms for varied initial load
const POPULAR_TERMS = [
  "action", "comedy", "thriller", "horror", "sci-fi", "drama", "adventure", "fantasy",
];

/* ─── Movies Page ─── */
export default function MoviesPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<OmdbMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingMovie, setPlayingMovie] = useState<OmdbMovie | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Load popular mixed movies on first mount
  useEffect(() => {
    setLoading(true);
    const terms = [...POPULAR_TERMS].sort(() => Math.random() - 0.5).slice(0, 4);
    Promise.all(terms.map((t) => searchOmdb(t, "movie").catch(() => ({ results: [] }))))
      .then((all) => {
        const seen = new Set<string>();
        const merged: OmdbMovie[] = [];
        for (const { results: res } of all) {
          for (const m of res) {
            if (!seen.has(m.imdbID)) {
              seen.add(m.imdbID);
              merged.push(m);
            }
          }
        }
        // Shuffle for variety
        for (let i = merged.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [merged[i], merged[j]] = [merged[j], merged[i]];
        }
        setResults(merged);
        setLoading(false);
      });
  }, []);

  // Run search when debouncedQuery changes
  useEffect(() => {
    if (!debouncedQuery.trim()) return;
    setLoading(true);
    searchOmdb(debouncedQuery, "movie").then(({ results: res }) => {
      setResults(res);
      setLoading(false);
    });
  }, [debouncedQuery]);

  function handleSearchChange(val: string) {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val.trim()) return;
    timerRef.current = setTimeout(() => setDebouncedQuery(val), 400);
  }

  function clearSearch() {
    setQuery("");
    setDebouncedQuery("");
  }

  function handlePlay(movie: OmdbMovie) {
    // Toggle off if same movie clicked again
    if (playingMovie?.imdbID === movie.imdbID) {
      setPlayingMovie(null);
    } else {
      setPlayingMovie(movie);
    }
  }

  function closePlayer() {
    setPlayingMovie(null);
    // Scroll back to grid top
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-background pt-14">
      {/* Page Header */}
      <div className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background:
              "radial-gradient(ellipse at 60% 50%, hsl(var(--accent)), transparent 70%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex items-center gap-2 mb-1.5">
            <Film className="w-4 h-4 text-accent" />
            <span className="text-accent text-[10px] sm:text-xs font-semibold uppercase tracking-widest">
              Browse
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Movies</h1>
          <p className="text-sm text-muted-foreground mb-5">
            Search any movie and watch it instantly — no popups, right here on the page.
          </p>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search movies…"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              autoFocus
              className="w-full bg-card border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Inline Player (renders between header and grid) ── */}
      {playingMovie && (
        <InlinePlayer movie={playingMovie} onClose={closePlayer} />
      )}

      {/* ── Movie Grid ── */}
      <div ref={gridRef} className="max-w-7xl mx-auto px-3 sm:px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {loading
              ? "Searching…"
              : debouncedQuery
              ? `Results for "${debouncedQuery}"`
              : "Popular movies"}
            {!loading && results.length > 0 && ` — ${results.length} titles`}
          </p>
          {playingMovie && (
            <p className="text-xs text-accent font-medium flex items-center gap-1">
              <Play className="w-3 h-3 fill-accent" />
              Now playing: {playingMovie.Title}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Film className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">
              No movies found. Try a different search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
            {results.map((movie) => (
              <MovieCard
                key={movie.imdbID}
                movie={movie}
                active={playingMovie?.imdbID === movie.imdbID}
                onPlay={handlePlay}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
