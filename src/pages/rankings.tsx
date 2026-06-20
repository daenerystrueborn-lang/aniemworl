import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { apiUrl } from "../lib/api";

const CATEGORIES = ["Anime", "Manhwa", "Movies", "Novels"] as const;
type Category = typeof CATEGORIES[number];

const SORT_OPTIONS = [
  { label: "Score", value: "SCORE_DESC" },
  { label: "Popularity", value: "POPULARITY_DESC" },
  { label: "Trending", value: "TRENDING_DESC" },
] as const;
type SortValue = typeof SORT_OPTIONS[number]["value"];

// Current date: June 2026 → Spring season
const CURRENT_YEAR = 2026;
const CURRENT_SEASON = "SPRING";

const TIMEFRAMES = [
  { label: "All Time", year: null, season: null },
  { label: "This Year", year: CURRENT_YEAR, season: null },
  { label: "This Season", year: CURRENT_YEAR, season: CURRENT_SEASON },
] as const;
type TimeframeLabel = typeof TIMEFRAMES[number]["label"];

const TYPE_MAP: Record<Category, string> = {
  Anime: "ANIME",
  Manhwa: "MANGA",
  Movies: "ANIME",
  Novels: "MANGA",
};

const FORMAT_MAP: Record<Category, string | null> = {
  Anime: null,
  Manhwa: null,
  Movies: "MOVIE",
  Novels: null,
};

interface AnimeItem {
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
  popularity: number;
}

interface FetchParams {
  type: string;
  sort: SortValue;
  year: number | null;
  season: string | null;
  format: string | null;
}

async function fetchRankings(p: FetchParams): Promise<AnimeItem[]> {
  const params = new URLSearchParams({ type: p.type, perPage: "50", sort: p.sort });
  if (p.year) params.set("year", String(p.year));
  if (p.season) params.set("season", p.season);
  if (p.format) params.set("format", p.format);
  const res = await fetch(apiUrl(`/api/anime/rankings?${params}`));
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).data ?? [];
}

export default function RankingsPage() {
  const [category, setCategory] = useState<Category>("Anime");
  const [sort, setSort] = useState<SortValue>("SCORE_DESC");
  const [timeframeLabel, setTimeframeLabel] = useState<TimeframeLabel>("All Time");

  const tf = TIMEFRAMES.find((t) => t.label === timeframeLabel)!;
  const apiType = TYPE_MAP[category];
  const format = FORMAT_MAP[category];

  const fetchParams: FetchParams = {
    type: apiType,
    sort,
    year: tf.year ?? null,
    season: tf.season ?? null,
    format,
  };

  const { data, isLoading } = useQuery<AnimeItem[]>({
    queryKey: ["rankings", fetchParams],
    queryFn: () => fetchRankings(fetchParams),
    staleTime: 3 * 60 * 1000,
  });

  const items = data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-16 pb-20">
        <div className="mb-5 pt-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-0.5">Rankings</h1>
          <p className="text-sm text-muted-foreground">Top-rated titles across all categories.</p>
        </div>

        {/* Filter bar — scrollable on mobile */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
          {/* Category */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg shrink-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  category === cat ? "bg-card text-foreground border border-border shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg shrink-0">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSort(s.value)}
                className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  sort === s.value ? "bg-card text-foreground border border-border shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Timeframe */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg shrink-0">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.label}
                onClick={() => setTimeframeLabel(t.label)}
                className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  timeframeLabel === t.label ? "bg-card text-foreground border border-border shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-muted-foreground py-20 text-sm">No results for this filter combination.</div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[36px_1fr_72px] sm:grid-cols-[48px_1fr_100px] gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground">
              <span>#</span>
              <span>Title</span>
              <span className="text-center">Score</span>
            </div>

            {items.map((item, i) => (
              <Link
                key={item.id}
                href={`/wiki/${item.id}`}
                className="grid grid-cols-[36px_1fr_72px] sm:grid-cols-[48px_1fr_100px] gap-2 sm:gap-3 px-3 sm:px-4 py-3 items-center border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <span className={`text-sm font-black ${i < 3 ? "text-accent" : "text-muted-foreground"}`}>
                  {i + 1}
                </span>

                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-11 rounded overflow-hidden shrink-0 border border-border bg-muted">
                    {item.cover && (
                      <img src={item.cover} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-foreground leading-snug line-clamp-2">{item.title}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.genres.slice(0, 2).map((g) => (
                        <span key={g} className="text-[9px] sm:text-[10px] text-muted-foreground bg-muted px-1 sm:px-1.5 py-0.5 rounded">
                          {g}
                        </span>
                      ))}
                      {item.year && (
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground">{item.year}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  {item.score ? (
                    <span className="inline-flex items-center gap-1 bg-accent/15 border border-accent/25 text-accent text-xs font-bold px-1.5 py-0.5 rounded">
                      <Star className="w-2.5 h-2.5 fill-accent" />{(item.score / 10).toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
