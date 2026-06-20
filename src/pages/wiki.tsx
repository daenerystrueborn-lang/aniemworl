import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Search, Star, Loader2, TrendingUp, X } from "lucide-react";
import { apiUrl } from "../lib/api";

interface AnimeItem {
  id: number;
  title: string;
  cover: string;
  genres: string[];
  score: number | null;
  format: string;
  episodes: number | null;
  chapters: number | null;
  year: number | null;
}

async function fetchMedia(q: string, type: string, genre: string): Promise<AnimeItem[]> {
  if (q.trim()) {
    const params = new URLSearchParams({ q, type, perPage: "24" });
    if (genre) params.set("genre", genre);
    const res = await fetch(apiUrl(`/api/anime/search?${params}`));
    return res.ok ? (await res.json()).data ?? [] : [];
  }
  if (genre) {
    const res = await fetch(apiUrl(`/api/anime/search?type=${type}&genre=${encodeURIComponent(genre)}&perPage=24`));
    return res.ok ? (await res.json()).data ?? [] : [];
  }
  const res = await fetch(apiUrl(`/api/anime/trending?type=${type}&perPage=24`));
  return res.ok ? (await res.json()).data ?? [] : [];
}

const TYPES = ["Anime", "Manga"] as const;
type MediaType = typeof TYPES[number];
const TYPE_MAP: Record<MediaType, string> = { Anime: "ANIME", Manga: "MANGA" };

export default function WikiPage() {
  const rawSearch = useSearch();
  const params = new URLSearchParams(rawSearch);
  const qParam = params.get("q") ?? "";
  const genreParam = params.get("genre") ?? "";

  const [search, setSearch] = useState(qParam);
  const [debouncedSearch, setDebouncedSearch] = useState(qParam);
  const [genre, setGenre] = useState(genreParam);
  const [mediaType, setMediaType] = useState<MediaType>("Anime");
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (qParam) { setSearch(qParam); setDebouncedSearch(qParam); }
    if (genreParam) setGenre(genreParam);
  }, [qParam, genreParam]);

  const { data, isLoading } = useQuery<AnimeItem[]>({
    queryKey: ["wiki-search", debouncedSearch, mediaType, genre],
    queryFn: () => fetchMedia(debouncedSearch, TYPE_MAP[mediaType], genre),
    staleTime: 2 * 60 * 1000,
  });

  function handleInput(val: string) {
    setSearch(val);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setDebouncedSearch(val), 350);
    setTimer(t);
  }

  function clearGenre() {
    setGenre("");
  }

  const showing = debouncedSearch ? `Results for "${debouncedSearch}"` : genre ? `${genre} ${mediaType}` : `Trending ${mediaType}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-16 pb-20">
        <div className="mb-5 pt-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-0.5">Wiki</h1>
          <p className="text-sm text-muted-foreground">Search any title to explore full details, characters, and more.</p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 mb-5">
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search titles…"
              value={search}
              onChange={(e) => handleInput(e.target.value)}
              autoFocus
              className="w-full bg-muted border border-border rounded pl-9 pr-3 py-2 sm:py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
            />
          </div>
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setMediaType(t)}
                className={`px-3 sm:px-4 py-1.5 rounded text-sm font-medium transition-all ${
                  mediaType === t ? "bg-card text-foreground border border-border shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Active genre filter chip */}
        {genre && (
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-accent/15 border border-accent/30 text-accent text-xs font-semibold px-3 py-1 rounded-full">
              {genre}
              <button onClick={clearGenre} className="hover:text-accent/70 transition-colors ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          {!debouncedSearch && !genre && <TrendingUp className="w-4 h-4 text-accent" />}
          <h2 className="text-sm font-semibold text-foreground">{showing}</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.length ? (
          <div className="text-center text-muted-foreground py-16 text-sm">No results found.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
            {data.map((item) => (
              <Link key={item.id} href={`/wiki/${item.id}`} className="group cursor-pointer">
                <div className="aspect-[2/3] rounded-lg overflow-hidden border border-border bg-muted mb-1.5 relative">
                  {item.cover ? (
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">No img</span>
                    </div>
                  )}
                  {item.score && (
                    <div className="absolute top-1.5 right-1.5 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-accent-foreground" />
                      {(item.score / 10).toFixed(1)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
                </div>
                <p className="text-xs text-foreground font-medium truncate leading-tight">{item.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.genres.slice(0, 2).join(" · ")}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
