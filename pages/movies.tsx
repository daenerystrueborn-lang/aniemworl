import { useState, useRef, useEffect } from "react";
import { Search, X, Film, Star, Loader2, Play, ChevronLeft } from "lucide-react";
import { searchOmdb, type OmdbMovie } from "@/lib/omdb";

const PLACEHOLDER_POSTER = "https://via.placeholder.com/300x450/1a1a1a/666?text=No+Poster";

/* ─── Lightbox Player ─── */
function PlayerLightbox({ movie, onClose }: { movie: OmdbMovie; onClose: () => void }) {
  const src = `https://proxy.garageband.rocks/embed/movie/${movie.imdbID}`;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-3 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-5xl flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">{movie.Title}</h2>
            <p className="text-xs text-white/50">{movie.Year}{movie.Genre ? ` · ${movie.Genre}` : ""}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 ml-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl">
          <iframe
            src={src}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          />
        </div>

        <p className="text-[10px] text-white/30 text-center">
          Press Esc or click outside to close
        </p>
      </div>
    </div>
  );
}

/* ─── Movie Card ─── */
function MovieCard({ movie, onPlay }: { movie: OmdbMovie; onPlay: (m: OmdbMovie) => void }) {
  const poster = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : PLACEHOLDER_POSTER;

  return (
    <div className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-accent/40 hover:shadow-lg transition-all duration-200">
      <div className="aspect-[2/3] overflow-hidden bg-muted relative">
        <img
          src={poster}
          alt={movie.Title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_POSTER; }}
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
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
          <button
            onClick={() => onPlay(movie)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition-colors"
          >
            <Play className="w-3 h-3 fill-accent-foreground" /> Watch Now
          </button>
        </div>
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

/* ─── Movies Page ─── */
export default function MoviesPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("avengers"); // default popular search
  const [results, setResults] = useState<OmdbMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingMovie, setPlayingMovie] = useState<OmdbMovie | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setDebouncedQuery("avengers");
  }

  return (
    <div className="min-h-screen bg-background pt-14">
      {playingMovie && (
        <PlayerLightbox movie={playingMovie} onClose={() => setPlayingMovie(null)} />
      )}

      {/* Header */}
      <div className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 opacity-10"
          style={{ background: "radial-gradient(ellipse at 60% 50%, hsl(var(--accent)), transparent 70%)" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex items-center gap-2 mb-1.5">
            <Film className="w-4 h-4 text-accent" />
            <span className="text-accent text-[10px] sm:text-xs font-semibold uppercase tracking-widest">Browse</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Movies</h1>
          <p className="text-sm text-muted-foreground mb-5">
            Search any movie and watch it instantly.
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

      {/* Results */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5">
        {/* Count line */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {loading
              ? "Searching…"
              : debouncedQuery
              ? `Results for "${debouncedQuery}"`
              : "Popular movies"}
            {!loading && results.length > 0 && ` — ${results.length} titles`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Film className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No movies found. Try a different search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
            {results.map((movie) => (
              <MovieCard key={movie.imdbID} movie={movie} onPlay={setPlayingMovie} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
