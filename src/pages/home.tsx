import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Play, BookOpen, ChevronRight, TrendingUp, Star, Lock,
  Loader2, ChevronLeft, Tv, Film, ArrowRight,
} from "lucide-react";
import { fetchTrending as fetchTrendingAniList } from "../lib/anilist";

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
  const { data } = await fetchTrendingAniList({
    type: type === "MANGA" ? "MANGA" : "ANIME",
    perPage,
    format: format ?? null,
    status: status ?? null,
  });
  return data;
}

/* ─── SVG Genre Icons ─── */
const GenreIcons: Record<string, React.ReactNode> = {
  Action: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2.5L9 8l-4.5 1 1 4.5L10 18l1.5-1.5" stroke="#f87171" />
      <path d="M2.5 21.5l5-5" stroke="#f87171" />
      <path d="M21.5 2.5l-6 6" stroke="#fb923c" />
      <path d="M15.5 8.5l-7 7" stroke="#fbbf24" />
    </svg>
  ),
  Fantasy: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" fill="#a78bfa" stroke="#a78bfa" />
      <path d="M5 18c0-2 1-3 2-4" stroke="#c4b5fd" />
      <path d="M19 18c0-2-1-3-2-4" stroke="#c4b5fd" />
      <path d="M8 21h8" stroke="#a78bfa" />
    </svg>
  ),
  Romance: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path d="M12 21s-6.7-4.35-9.5-8.1C.8 10.4 1 7.2 3.4 5.4c2.1-1.6 4.9-1.1 6.4.9L12 8.4l2.2-2.1c1.5-2 4.3-2.5 6.4-.9 2.4 1.8 2.6 5 .9 7.5C18.7 16.65 12 21 12 21z" fill="#fb7185" />
    </svg>
  ),
  Horror: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="9" r="6" stroke="#94a3b8" />
      <path d="M9 9h.01M15 9h.01" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 21v-3l1.5-1.5L12 18l1.5-1.5L15 18v3" stroke="#94a3b8" />
      <path d="M8 12c0 1 .5 2 1.5 2.5" stroke="#94a3b8" />
    </svg>
  ),
  "Sci-Fi": (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 2L8 8H4l4 4-1 6 5-3 5 3-1-6 4-4h-4z" fill="#38bdf8" stroke="#38bdf8" />
      <path d="M12 2v20M4 12h16" stroke="#7dd3fc" strokeWidth="0.5" />
    </svg>
  ),
  Mystery: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="10" cy="10" r="7" stroke="#fbbf24" />
      <path d="M15.5 15.5l5 5" stroke="#fbbf24" strokeWidth="2" />
      <path d="M10 7v3M10 13v.5" stroke="#fcd34d" strokeWidth="2" />
    </svg>
  ),
  "Slice of Life": (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 3v10a6 6 0 0 0 12 0V3" stroke="#86efac" />
      <path d="M4 3h16" stroke="#86efac" strokeWidth="2" />
      <path d="M12 13v5" stroke="#4ade80" />
      <path d="M9 21h6" stroke="#4ade80" />
    </svg>
  ),
  Sports: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <circle cx="12" cy="12" r="9" fill="none" stroke="#34d399" strokeWidth="1.5" />
      <path d="M12 3a9 9 0 0 1 6.36 2.64M12 3a9 9 0 0 0-6.36 2.64" stroke="#34d399" strokeWidth="1" />
      <path d="M3 12h18M12 3v18" stroke="#34d399" strokeWidth="1" />
      <path d="M5.64 5.64l12.72 12.72M18.36 5.64L5.64 18.36" stroke="#34d399" strokeWidth="0.7" />
    </svg>
  ),
  Historical: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="12" width="4" height="9" fill="#d97706" stroke="#d97706" />
      <rect x="10" y="8" width="4" height="13" fill="#f59e0b" stroke="#f59e0b" />
      <rect x="17" y="4" width="4" height="17" fill="#d97706" stroke="#d97706" />
      <path d="M1 21h22" stroke="#fbbf24" strokeWidth="1.5" />
    </svg>
  ),
  Psychological: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M12 3C7.5 3 4 6.5 4 11c0 2.8 1.4 5.2 3.5 6.7V20h9v-2.3C18.6 16.2 20 13.8 20 11c0-4.5-3.5-8-8-8z" stroke="#e879f9" fill="#e879f9" fillOpacity="0.15" />
      <path d="M9 11c0-1.7 1.3-3 3-3" stroke="#f0abfc" />
      <path d="M12 8v1M8 11h1M15 11h1M12 15v-1" stroke="#f0abfc" />
    </svg>
  ),
  Mecha: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="7" y="2" width="10" height="8" rx="1" fill="#60a5fa" stroke="#60a5fa" fillOpacity="0.3" />
      <rect x="5" y="10" width="14" height="8" rx="1" fill="#3b82f6" stroke="#3b82f6" fillOpacity="0.3" />
      <path d="M9 18v4M15 18v4M5 12H2M19 12h3" stroke="#93c5fd" />
      <circle cx="9" cy="6" r="1" fill="#93c5fd" />
      <circle cx="15" cy="6" r="1" fill="#93c5fd" />
    </svg>
  ),
  Isekai: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <circle cx="12" cy="12" r="9" fill="none" stroke="#818cf8" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="#a5b4fc" strokeWidth="1" />
      <ellipse cx="12" cy="12" rx="9" ry="4" fill="none" stroke="#a5b4fc" strokeWidth="1" />
      <circle cx="12" cy="12" r="2" fill="#818cf8" />
    </svg>
  ),
};

/* ─── Fade-in hook ─── */
function useFadeIn(delay = 0) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return { ref, visible };
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useFadeIn(delay);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(22px)",
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── ScoreBadge ─── */
function ScoreBadge({ score }: { score: number | null }) {
  if (!score) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-bold shadow-sm shadow-accent/10">
      <Star className="w-3 h-3 fill-accent" />
      {(score / 10).toFixed(1)}
    </span>
  );
}

/* ─── Top10Card ─── */
function Top10Card({ item, rank }: { item: AnimeItem; rank: number }) {
  return (
    <Link href={`/wiki/${item.id}`} className="shrink-0 w-24 sm:w-32 group cursor-pointer">
      <div className="relative rounded-xl overflow-hidden border border-border bg-card aspect-[2/3] shadow-md group-hover:shadow-xl group-hover:shadow-accent/10 group-hover:border-accent/30 transition-all duration-300">
        {item.cover ? (
          <img src={item.cover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
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
        <div className="absolute top-1.5 right-1.5 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {item.score ? (item.score / 10).toFixed(1) : "—"}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
          <span className="text-white text-[10px] font-bold bg-black/60 px-2 py-1 rounded-full">View</span>
        </div>
      </div>
      <p className="text-xs text-foreground font-medium mt-1.5 truncate">{item.title}</p>
      <p className="text-[10px] text-muted-foreground truncate">{item.genres.slice(0, 2).join(" · ")}</p>
    </Link>
  );
}

/* ─── MediaCard ─── */
function MediaCard({ item, isRead }: { item: AnimeItem; isRead: boolean }) {
  const href = isRead ? `/wiki/${item.id}` : `/watch/${item.id}`;
  return (
    <Link href={href} className="shrink-0 w-32 sm:w-40 group cursor-pointer">
      <div className="relative rounded-xl overflow-hidden border border-border bg-card aspect-[2/3] mb-2 shadow-md group-hover:shadow-xl group-hover:shadow-accent/10 group-hover:border-accent/30 transition-all duration-300">
        {item.cover ? (
          <img src={item.cover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            {isRead ? <BookOpen className="w-5 h-5 text-muted-foreground/40" /> : <Tv className="w-5 h-5 text-muted-foreground/40" />}
          </div>
        )}
        {item.score && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/75 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            <Star className="w-2.5 h-2.5 fill-yellow-400" />{(item.score / 10).toFixed(1)}
          </div>
        )}
        {item.format && (
          <div className="absolute top-1.5 right-1.5 bg-accent/90 text-accent-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            {item.format}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
          <div className="bg-accent rounded-full p-2 shadow-lg shadow-accent/30 scale-90 group-hover:scale-100 transition-transform">
            {isRead ? <BookOpen className="w-4 h-4 text-accent-foreground" /> : <Play className="w-4 h-4 text-accent-foreground fill-accent-foreground" />}
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
  title, href, items, loading, isRead, icon,
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
        <Link href={href} className="text-xs text-muted-foreground hover:text-accent flex items-center gap-0.5 transition-colors group">
          See all <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
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
    <div className="w-full h-[60px] sm:h-[70px] rounded-2xl border border-dashed border-border bg-muted/20 flex items-center justify-center text-[10px] text-muted-foreground/40 font-medium tracking-widest uppercase select-none">
      Advertisement
    </div>
  );
}

/* ─── Explore Banner ─── */
function ExploreBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/20 via-card to-card p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 shadow-xl shadow-accent/5">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 80% 50%, hsl(var(--accent)/0.12), transparent 70%)" }}
      />
      <div className="flex-1 relative">
        <div className="flex items-center gap-2 mb-2">
          <Tv className="w-5 h-5 text-accent" />
          <span className="text-accent text-xs font-semibold uppercase tracking-widest">Anime Library</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1.5">Browse all anime</h3>
        <p className="text-sm text-muted-foreground">Search, filter by genre, find airing shows and classic movies — all in one place.</p>
      </div>
      <Link
        href="/anime"
        className="relative shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-xl font-semibold text-sm hover:bg-accent/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-accent/25"
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
  const [heroVisible, setHeroVisible] = useState(false);

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

  // Hero text animate-in on load
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

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
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

          {heroItems.length > 1 && (
            <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 flex items-center gap-2 sm:gap-3 z-20">
              <button onClick={prevHero} className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-white transition-all hover:scale-110 active:scale-95 backdrop-blur-sm border border-white/10">
                <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <div className="flex gap-1">
                {heroItems.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === heroIndex ? "bg-accent w-5" : "bg-white/40 w-2"}`}
                  />
                ))}
              </div>
              <button onClick={nextHero} className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-white transition-all hover:scale-110 active:scale-95 backdrop-blur-sm border border-white/10">
                <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          )}

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-6 sm:pb-10 pt-20 sm:pt-28 w-full">
            <div
              className="max-w-sm sm:max-w-xl"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? "translateX(0)" : "translateX(-28px)",
                transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
              }}
            >
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
                  className="inline-flex items-center gap-1.5 sm:gap-2 bg-foreground text-background px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold hover:bg-foreground/90 hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  {isRead
                    ? <><BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Read Now</>
                    : <><Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-background" /> Watch Now</>}
                </Link>
                <Link
                  href={`/wiki/${hero.id}`}
                  className="inline-flex items-center gap-1.5 sm:gap-2 bg-muted/80 backdrop-blur-sm border border-border text-foreground px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold hover:bg-muted hover:scale-105 active:scale-95 transition-all"
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
        <FadeIn className="mt-6 sm:mt-8">
          <MediaRow
            title="Airing This Season"
            href="/anime"
            items={airingData ?? []}
            loading={airingLoading}
            isRead={false}
            icon={<span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500/50" />}
          />
        </FadeIn>

        <FadeIn delay={50}>
          <AdSlot />
        </FadeIn>

        {/* ── Category Tabs ── */}
        <FadeIn delay={80}>
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl w-fit border border-border shadow-sm">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-card text-foreground shadow-md border border-border scale-100"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* ── Top 10 ── */}
        <FadeIn delay={100}>
          <section>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold text-foreground">Top 10 {activeCategory}</h2>
              <Link href="/rankings" className="text-xs text-muted-foreground hover:text-accent flex items-center gap-0.5 transition-colors group">
                See all <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
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
        </FadeIn>

        <FadeIn delay={60}>
          <AdSlot />
        </FadeIn>

        {/* ── Popular Movies Row ── */}
        <FadeIn delay={80}>
          <MediaRow
            title="Popular Movies"
            href="/movies"
            items={moviesData ?? []}
            loading={moviesLoading}
            isRead={false}
            icon={<Film className="w-4 h-4 text-muted-foreground" />}
          />
        </FadeIn>

        {/* ── Continue Watching ── */}
        <FadeIn delay={60}>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {isRead ? "Continue Reading" : "Continue Watching"}
              </h2>
            </div>
            <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-md">
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-sm bg-background/70 rounded-2xl">
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground mb-2" />
                <p className="text-xs sm:text-sm text-muted-foreground">Sign in to see your history</p>
                <Link href="/profile" className="mt-3 px-5 py-2 rounded-xl bg-foreground text-background text-xs sm:text-sm font-bold hover:bg-foreground/90 hover:scale-105 active:scale-95 transition-all shadow-md">
                  Sign In
                </Link>
              </div>
              <div className="flex gap-3 p-3 sm:p-4 blur-sm pointer-events-none select-none">
                {items.slice(1, 4).map((item) => (
                  <div key={item.id} className="shrink-0 w-36 sm:w-44">
                    <div className="rounded-xl overflow-hidden border border-border aspect-video bg-muted">
                      {item.cover && <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />}
                    </div>
                    <p className="text-xs text-foreground font-medium mt-2 truncate">{item.title}</p>
                    <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: "40%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ── Browse by Genre ── */}
        <FadeIn delay={70}>
          <section>
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4">Browse by Genre</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
              {(["Action", "Fantasy", "Romance", "Horror", "Sci-Fi", "Mystery", "Slice of Life", "Sports", "Historical", "Psychological", "Mecha", "Isekai"] as const).map((g, idx) => (
                <button
                  key={g}
                  onClick={() => navigate(`/wiki?genre=${encodeURIComponent(g)}`)}
                  className="flex flex-col items-center justify-center gap-2 px-2 py-4 rounded-2xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-muted hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-1 active:scale-95 transition-all duration-200"
                  style={{
                    animationDelay: `${idx * 40}ms`,
                  }}
                >
                  {GenreIcons[g] ?? <Film className="w-6 h-6" />}
                  <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">{g}</span>
                </button>
              ))}
            </div>
          </section>
        </FadeIn>

        {/* ── Explore Anime Banner ── */}
        <FadeIn delay={50}>
          <ExploreBanner />
        </FadeIn>
      </div>
    </div>
  );
}
