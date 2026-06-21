import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Play, Star, Filter, X, Loader2, Tv } from "lucide-react";
import { apiUrl } from "../lib/api";

interface AnimeItem {
  id: number;
  title: string;
  cover: string;
  genres: string[];
  score: number | null;
  format: string;
  episodes: number | null;
  year: number | null;
  description: string;
}

const CATEGORIES = [
  { id: "trending", label: "Trending" },
  { id: "airing", label: "Airing Now" },
  { id: "movies", label: "Movies" },
  { id: "ova", label: "OVA & Specials" },
] as const;
type CategoryId = typeof CATEGORIES[number]["id"];

const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life",
  "Sports", "Supernatural", "Thriller", "Historical", "Psychological",
  "Mecha", "Music", "Isekai", "Military", "School",
];

async function fetchAnime(
  category: CategoryId,
  genre?: string | null,
  search?: string,
): Promise<AnimeItem[]> {
  if (search?.trim()) {
    const params = new URLSearchParams({ q: search.trim(), type: "ANIME", perPage: "24" });
    const res = await fetch(apiUrl(`/api/anime/search?${params}`));
    return res.ok ? (await res.json()).data ?? [] : [];
  }
  const params = new URLSearchParams({ type: "ANIME", perPage: "24" });
  if (genre) params.set("genre", genre);
  if (category === "airing") params.set("status", "RELEASING");
  if (category === "movies") params.set("format", "MOVIE");
  if (category === "ova") params.set("format", "OVA");
  const res = await fetch(apiUrl(`/api/anime/trending?${params}`));
  return res.ok ? (await res.json()).data ?? [] : [];
}

function AnimeCard({ item }: { item: AnimeItem }) {
  return (
    <div className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-accent/40 hover:shadow-lg transition-all duration-200">
      <div className="aspect-[2/3] overflow-hidden bg-muted relative">
        {item.cover ? (
          <img
            src={item.cover}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tv className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
        {item.score && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/75 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
            <Star className="w-2.5 h-2.5 fill-yellow-400" />
            {(item.score / 10).toFixed(1)}
          </div>
        )}
        {item.format && (
          <div className="absolute top-1.5 right-1.5 bg-accent text-accent-foreground text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
            {item.format}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
          <Link
            href={`/watch/${item.id}`}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition-colors"
          >
            <Play className="w-3 h-3 fill-accent-foreground" /> Watch Now
          </Link>
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug mb-1">
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {item.year && <span>{item.year}</span>}
          {item.year && item.episodes && <span>·</span>}
          {item.episodes && <span>{item.episodes} eps</span>}
          {!item.year && !item.episodes && item.genres[0] && <span>{item.genres[0]}</span>}
        </div>
      </div>
    </div>
  );
}

export default function AnimePage() {
  const [category, setCategory] = useState<CategoryId>("trending");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genreOpen, setGenreOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(val), 400);
  }

  const { data, isLoading } = useQuery<AnimeItem[]>({
    queryKey: ["anime-browse", category, selectedGenre, debouncedSearch],
    queryFn: () => fetchAnime(category, selectedGenre, debouncedSearch),
    staleTime: 5 * 60 * 1000,
  });

  const items = data ?? [];

  return (
    <div className="min-h-screen bg-background pt-14">
      {/* Header banner */}
      <div className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 opacity-10"
          style={{ background: "radial-gradient(ellipse at 60% 50%, hsl(var(--accent)), transparent 70%)" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex items-center gap-2 mb-1.5">
            <Tv className="w-4 h-4 text-accent" />
            <span className="text-accent text-[10px] sm:text-xs font-semibold uppercase tracking-widest">Browse</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Anime</h1>
          <p className="text-sm text-muted-foreground mb-5">
            Thousands of titles — from trending hits to all-time classics.
          </p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search anime..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setDebouncedSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5">
        {/* Category tabs + genre toggle */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-0.5 bg-muted/50 p-1 rounded-lg overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  setDebouncedSearch("");
                  setSearch("");
                }}
                className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  category === cat.id
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setGenreOpen(!genreOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
              selectedGenre || genreOpen
                ? "border-accent text-accent bg-accent/10"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {selectedGenre ?? "Genre"}
            {selectedGenre && (
              <X
                className="w-3 h-3"
                onClick={(e) => { e.stopPropagation(); setSelectedGenre(null); }}
              />
            )}
          </button>
        </div>

        {/* Genre pills */}
        {genreOpen && (
          <div className="flex flex-wrap gap-1.5 mb-4 p-3 bg-card border border-border rounded-xl">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => { setSelectedGenre(selectedGenre === g ? null : g); setGenreOpen(false); }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  selectedGenre === g
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {/* Count line */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isLoading
              ? "Loading…"
              : debouncedSearch
              ? `Results for "${debouncedSearch}"`
              : selectedGenre
              ? `${selectedGenre} anime`
              : CATEGORIES.find((c) => c.id === category)?.label}
            {!isLoading && ` — ${items.length} titles`}
          </p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !items.length ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Tv className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No anime found. Try a different filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
            {items.map((item) => (
              <AnimeCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
