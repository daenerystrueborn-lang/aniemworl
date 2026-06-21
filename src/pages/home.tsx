import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Play, BookOpen, ChevronRight, TrendingUp, Star, Lock,
  Loader2, ChevronLeft, Tv, Film, ArrowRight,
} from "lucide-react";
import { apiUrl } from "../lib/api";

const CATEGORIES = ["Anime", "Manhwa", "Movies", "Novels"] as const;
type Category = typeof CATEGORIES[number];

const TYPE_MAP: Record<Category, string> = {
  Anime: "ANIME", Manhwa: "MANGA", Movies: "ANIME", Novels: "MANGA",
};
const FORMAT_MAP: Record<Category, string | null> = {
  Anime: null, Manhwa: null, Movies: "MOVIE", Novels: null,
};
const IS_READ: Record<Category, boolean> = {
  Anime: false, Manhwa: true, Movies: false, Novels: true,
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
  description: string;
}

async function fetchTrending(
  type: string,
  format?: string | null,
  status?: string | null,
  perPage = 12,
): Promise<AnimeItem[]> {
  const params = new URLSearchParams({ type, perPage: String(perPage) });
  if (format) params.set("format", format);
  if (status) params.set("status", status);
  const res = await fetch(apiUrl(`/api/anime/trending?${params}`));
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).data ?? [];
}

const GENRES = [
  "Action", "Fantasy", "Romance", "Horror", "Sci-Fi", "Mystery",
  "Slice of Life", "Sports", "Historical", "Psychological", "Mecha", "Isekai",
];

const GENRE_ICONS: Record<string, string> = {
  Action: "⚔️", Fantasy: "🧙", Romance: "💕", Horror: "👻",
  "Sci-Fi": "🚀", Mystery: "🔍", "Slice of Life": "☕", Sports: "⚽",
  Historical: "🏰", Psychological: "🧠", Mecha: "🤖", Isekai: "🌀",
};

/* ─── ScoreBadge ─── */
function ScoreBadge({ score }: { score: number | null }) {
  if (!score) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent/15 border border-accent/30 text-accent text-xs font-bold">
      <Star className="w-3 h-3 fill-accent" />
      {(score / 10).toFixed(1)}
    </span>
  );
}

/* ─── Top10Card ─── */
function Top10Card({ item, rank }: { item: AnimeItem; rank: number }) {
  return (
    <Link href={`/wiki/${item.id}`} className="shrink-0 w-24 sm:w-32 group cursor-pointer">
      <div className="relative rounded-lg overflow-hidden border border-border bg-card aspect-[2/3]">
        {item.cover ? (
          <img src={item.cover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-xs">No image</span>
          </div>
        )}
        <div
          className="absolute bottom-0 left-0 text-[56px] sm:text-[64px] font-black leading-none select-none pointer-events-none"
          style={{ color: "transparent", WebkitTextStroke: "2px hsl(0 0% 28%)", lineHeight: 1, transform: "translateX(-4px) translateY(12px)" }}
        >
          {rank}
        </div>
        <div className="absolute top-1.5 right-1.5 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
          {item.score ? (item.score / 10).toFixed(1) : "—"}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-white text-[10px] font-bold bg-black/60 px-2 py-1 rounded">View</span>
        </div>
      </div>
      <p className="text-xs text-foreground font-medium mt-1.5 truncate">{item.title}</p>
      <p className="text-[10px] text-muted-foreground truncate">{item.genres.slice(0, 2).join(" · ")}</p>
    </Link>
  );
}

/* ─── MediaCard (for horizontal rows) ─── */
function MediaCard({ item, isRead }: { item: AnimeItem; isRead: boolean }) {
  const href = isRead ? `/wiki/${item.id}` : `/watch/${item.id}`;
  return (
    <Link href={href} className="shrink-0 w-32 sm:w-40 group cursor-pointer">
      <div className="relative rounded-lg overflow-hidden border border-border bg-card aspect-[2/3] mb-2">
        {item.cover ? (
          <img src={item.cover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            {isRead ? <BookOpen className="w-5 h-5 text-muted-foreground/40" /> : <Tv className="w-5 h-5 text-muted-foreground/40" />}
          </div>
        )}
        {item.score && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/70 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
            <Star className="w-2.5 h-2.5 fill-yellow-400" />{(item.score / 10).toFixed(1)}
          </div>
        )}
        {item.format && (
          <div className="absolute top-1.5 right-1.5 bg-accent/90 text-accent-foreground text-[9px] font-bold px-1 py-0.5 rounded">
            {item.format}
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-2">
            {isRead ? <BookOpen className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white fill-white" />}
          </div>
        </div>
      </div>
      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{item.title}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {item.year ?? ""}
        {item.year && (item.episodes || item.chapters) ? " · " : ""}
        {item.episodes ? `${item.episodes} eps` : item.chapters ? `${item.chapters} ch` : ""}
      </p>
    </Link>
  );
}

/* ─── MediaRow ─── */
function MediaRow({
  title, href, items, loading, isRead,
  icon,
}: {
  title: string;
  href: string;
  items: AnimeItem[];
  loading: boolean;
  isRead: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <Link href={href} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
          See all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          {items.map((item) => <MediaCard key={item.id} item={item} isRead={isRead} />)}
        </div>
      )}
    </section>
  );
}

/* ─── Ad Slot ─── */
function AdSlot() {
  return (
    <div className="w-full h-[60px] sm:h-[70px] rounded-xl border border-dashed border-border bg-muted/20 flex items-center justify-center text-[10px] text-muted-foreground/40 font-medium tracking-widest uppercase select-none">
      Advertisement
    </div>
  );
}

/* ─── Explore Banner ─── */
function ExploreBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent/15 via-card to-card p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Tv className="w-5 h-5 text-accent" />
          <span className="text-accent text-xs font-semibold uppercase tracking-widest">Anime Library</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1.5">Browse all anime</h3>
        <p className="text-sm text-muted-foreground">Search, filter by genre, find airing shows and classic movies — all in one place.</p>
      </div>
      <Link
        href="/anime"
        className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-semibold text-sm hover:bg-accent/90 transition-colors"
      >
        Explore Anime <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

/* ─── HomePage ─── */
export default function HomePage() {
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState<Category>("Anime");
  const [heroIndex, setHeroIndex] = useState(0);

  const apiType = TYPE_MAP[activeCategory];
  const apiFormat = FORMAT_MAP[activeCategory];
  const isRead = IS_READ[activeCategory];

  const { data, isLoading } = useQuery<AnimeItem[]>({
    queryKey: ["trending", apiType, apiFormat],
    queryFn: () => fetchTrending(apiType, apiFormat, null, 10),
    staleTime: 5 * 60 * 1000,
  });

  const { data: airingData, isLoading: airingLoading } = useQuery<AnimeItem[]>({
    queryKey: ["home-airing"],
    queryFn: () => fetchTrending("ANIME", null, "RELEASING", 16),
    staleTime: 10 * 60 * 1000,
  });

  const { data: moviesData, isLoading: moviesLoading } = useQuery<AnimeItem[]>({
    queryKey: ["home-movies"],
    queryFn: () => fetchTrending("ANIME", "MOVIE", null, 14),
    staleTime: 10 * 60 * 1000,
  });

  const { data: manhwaData, isLoading: manhwaLoading } = useQuery<AnimeItem[]>({
    queryKey: ["home-manhwa"],
    queryFn: () => fetchTrending("MANGA", null, null, 14),
    staleTime: 10 * 60 * 1000,
  });

  const items = data ?? [];
  const heroItems = items.slice(0, 5);
  const top10 = items.slice(0, 10);
  const hero = heroItems[heroIndex] ?? items[0];

  const nextHero = useCallback(() => {
    if (heroItems.length > 1) setHeroIndex((i) => (i + 1) % heroItems.length);
  }, [heroItems.length]);

  const prevHero = useCallback(() => {
    if (heroItems.length > 1) setHeroIndex((i) => (i - 1 + heroItems.length) % heroItems.length);
  }, [heroItems.length]);

  useEffect(() => { setHeroIndex(0); }, [activeCategory]);

  useEffect(() => {
    if (!hero || heroItems.length <= 1) return;
    const timer = setInterval(nextHero, 7000);
    return () => clearInterval(timer);
  }, [hero, heroItems.length, nextHero]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      {isLoading ? (
        <div className="min-h-[400px] sm:min-h-[520px] md:min-h-[580px] bg-muted animate-pulse" />
      ) : hero ? (
        <section className="relative min-h-[400px] sm:min-h-[520px] md:min-h-[580px] flex items-end overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
            style={{ backgroundImage: hero.banner ? `url(${hero.banner})` : `url(${hero.cover})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

          {heroItems.length > 1 && (
            <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 flex items-center gap-2 sm:gap-3 z-20">
              <button onClick={prevHero} className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors">
                <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <div className="flex gap-1">
                {heroItems.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIndex(i)}
                    className={`h-1 rounded-full transition-all ${i === heroIndex ? "bg-accent w-4" : "bg-white/40 w-1.5"}`}
                  />
                ))}
              </div>
              <button onClick={nextHero} className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors">
                <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          )}

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-6 sm:pb-10 pt-20 sm:pt-28 w-full">
            <div className="max-w-sm sm:max-w-xl">
              <div className="flex items-center gap-1.5 mb-2 sm:mb-3">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
                <span className="text-accent text-[10px] sm:text-xs font-semibold uppercase tracking-widest">Trending this week</span>
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight mb-2 sm:mb-3">{hero.title}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                {hero.format}{hero.year ? ` · ${hero.year}` : ""}{hero.genres.length ? ` · ${hero.genres.slice(0, 2).join(" / ")}` : ""}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed mb-3 sm:mb-5 line-clamp-2 sm:line-clamp-3">
                {hero.description.replace(/<[^>]*>/g, "")}
              </p>
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <ScoreBadge score={hero.score} />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href={isRead ? `/wiki/${hero.id}` : `/watch/${hero.id}`}
                  className="inline-flex items-center gap-1.5 sm:gap-2 bg-foreground text-background px-4 sm:px-5 py-2 sm:py-2.5 rounded text-xs sm:text-sm font-semibold hover:bg-foreground/90 transition-colors"
                >
                  {isRead
                    ? <><BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Read Now</>
                    : <><Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-background" /> Watch Now</>}
                </Link>
                <Link
                  href={`/wiki/${hero.id}`}
                  className="inline-flex items-center gap-1.5 sm:gap-2 bg-muted border border-border text-foreground px-4 sm:px-5 py-2 sm:py-2.5 rounded text-xs sm:text-sm font-semibold hover:bg-muted/70 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Wiki Page
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-20 space-y-8 sm:space-y-12">
        {/* ── Airing Now Row ── */}
        <div className="mt-6 sm:mt-8">
          <MediaRow
            title="Airing This Season"
            href="/anime"
            items={airingData ?? []}
            loading={airingLoading}
            isRead={false}
            icon={<span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          />
        </div>

        <AdSlot />

        {/* ── Category Tabs ── */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-fit">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Top 10 ── */}
        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold text-foreground">Top 10 {activeCategory}</h2>
            <Link href="/rankings" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
              See all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {top10.map((item, i) => <Top10Card key={item.id} item={item} rank={i + 1} />)}
            </div>
          )}
        </section>

        <AdSlot />

        {/* ── Popular Movies Row ── */}
        <MediaRow
          title="Popular Movies"
          href="/anime"
          items={moviesData ?? []}
          loading={moviesLoading}
          isRead={false}
          icon={<Film className="w-4 h-4 text-muted-foreground" />}
        />

        {/* ── Continue Watching ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {isRead ? "Continue Reading" : "Continue Watching"}
            </h2>
          </div>
          <div className="relative rounded-xl border border-border bg-card overflow-hidden">
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-sm bg-background/70">
              <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground mb-2" />
              <p className="text-xs sm:text-sm text-muted-foreground">Sign in to see your history</p>
              <Link href="/profile" className="mt-3 px-4 py-1.5 rounded bg-foreground text-background text-xs sm:text-sm font-medium hover:bg-foreground/90 transition-colors">
                Sign In
              </Link>
            </div>
            <div className="flex gap-3 p-3 sm:p-4 blur-sm pointer-events-none select-none">
              {items.slice(1, 4).map((item) => (
                <div key={item.id} className="shrink-0 w-36 sm:w-44">
                  <div className="rounded-lg overflow-hidden border border-border aspect-video bg-muted">
                    {item.cover && <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />}
                  </div>
                  <p className="text-xs text-foreground font-medium mt-2 truncate">{item.title}</p>
                  <div className="mt-1.5 h-0.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: "40%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Top Manhwa Row ── */}
        <MediaRow
          title="Top Manhwa & Manga"
          href="/wiki?type=MANGA"
          items={manhwaData ?? []}
          loading={manhwaLoading}
          isRead={true}
          icon={<BookOpen className="w-4 h-4 text-muted-foreground" />}
        />

        {/* ── Browse by Genre ── */}
        <section>
          <h2 className="text-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4">Browse by Genre</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => navigate(`/wiki?genre=${encodeURIComponent(g)}`)}
                className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-muted active:scale-95 transition-all"
              >
                <span className="text-xl">{GENRE_ICONS[g] ?? "🎬"}</span>
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">{g}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Explore Anime Banner ── */}
        <ExploreBanner />
      </div>
    </div>
  );
}
