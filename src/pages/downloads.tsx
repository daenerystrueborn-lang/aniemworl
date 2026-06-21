import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import {
<<<<<<< HEAD
  Search, Download, Loader2, BookOpen,
  FileText, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { apiUrl } from "../lib/api";

const TABS = ["Manga", "Novels"] as const;
type TabType = typeof TABS[number];

=======
  Search, Download, Loader2, Film, BookOpen,
  FileText, ChevronDown, ChevronUp, X, Play,
} from "lucide-react";
import { apiUrl } from "../lib/api";

const TABS = ["Anime", "Manga", "Novels"] as const;
type TabType = typeof TABS[number];

interface AniListItem { id: number; title: string; cover: string; genres: string[]; score: number | null; format: string; episodes: number | null; chapters: number | null; year: number | null; }
interface AnimePaheResult { session: string; title: string; poster?: string; type?: string; episodes?: number; }
>>>>>>> 61fdd465bdb0b8212177fe70a60b20a447c295ab
interface MangaPillResult { id: string; slug: string; title: string; url: string; cover: string; }
interface MangaPillChapter { number: number; numCode: string; slug: string; title: string; url: string; }
interface NovelResult { slug: string; title: string; cover: string; url: string; }
interface NovelChapter { number: number; title: string; url: string; }

<<<<<<< HEAD
=======
async function fetchTrending(type: string): Promise<AniListItem[]> {
  const res = await fetch(apiUrl(`/api/anime/trending?type=${type}&perPage=20`));
  return res.ok ? (await res.json()).data ?? [] : [];
}
async function searchAniList(q: string, type: string): Promise<AniListItem[]> {
  const res = await fetch(apiUrl(`/api/anime/search?q=${encodeURIComponent(q)}&type=${type}&perPage=20`));
  return res.ok ? (await res.json()).data ?? [] : [];
}
async function searchAnimePahe(q: string): Promise<AnimePaheResult[]> {
  if (!q.trim()) return [];
  const res = await fetch(apiUrl(`/api/animepahe/search?q=${encodeURIComponent(q)}`));
  return res.ok ? (await res.json()).data ?? [] : [];
}
>>>>>>> 61fdd465bdb0b8212177fe70a60b20a447c295ab
async function searchMangaPill(q: string): Promise<MangaPillResult[]> {
  const res = await fetch(apiUrl(`/api/mangapill/search?q=${encodeURIComponent(q)}`));
  return res.ok ? (await res.json()).data ?? [] : [];
}
async function fetchMangaPillSeries(url: string): Promise<{ title: string; chapters: MangaPillChapter[] }> {
  const res = await fetch(apiUrl(`/api/mangapill/series?url=${encodeURIComponent(url)}`));
  if (!res.ok) throw new Error("Failed");
  return res.json();
}
async function fetchPopularNovels(): Promise<NovelResult[]> {
  const res = await fetch(apiUrl("/api/novelfire/popular"));
  return res.ok ? (await res.json()).data ?? [] : [];
}
async function searchNovels(q: string): Promise<NovelResult[]> {
  const res = await fetch(apiUrl(`/api/novelfire/search?q=${encodeURIComponent(q)}`));
  return res.ok ? (await res.json()).data ?? [] : [];
}
async function fetchNovelBook(slug: string): Promise<{ title: string; author: string; summary: string; chapters: NovelChapter[] }> {
  const res = await fetch(apiUrl(`/api/novelfire/book?slug=${encodeURIComponent(slug)}`));
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

/* ─── Ad Slot ─── */
function AdSlot({ size = "banner" }: { size?: "banner" | "square" }) {
  const h = size === "square" ? "h-[250px]" : "h-[90px] sm:h-[60px]";
  return (
    <div className={`w-full ${h} rounded-xl border border-dashed border-border bg-muted/20 flex items-center justify-center text-[10px] text-muted-foreground/40 font-medium tracking-widest uppercase select-none`}>
      Advertisement
    </div>
  );
}

/* ─── Manga Chapter Panel ─── */
function MangaChapterPanel({ seriesUrl, title }: { seriesUrl: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["mangapill-series", seriesUrl],
    queryFn: () => fetchMangaPillSeries(seriesUrl),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  async function downloadChapter(chapterUrl: string, chapterTitle: string) {
    setDownloading(chapterUrl);
    try {
      const res = await fetch(apiUrl(`/api/mangapill/download?url=${encodeURIComponent(chapterUrl)}`));
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${title}-${chapterTitle}.pdf`.replace(/[^a-z0-9-_.]/gi, "_");
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("Could not download this chapter. Please try again.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 py-1.5 px-3 rounded text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" /> Chapters
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="mt-2 border border-border rounded-lg overflow-hidden bg-card max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.chapters.length ? (
            <p className="text-xs text-muted-foreground text-center py-4">No chapters found</p>
          ) : (
            <div className="divide-y divide-border">
              {data.chapters.slice().reverse().map((ch) => (
                <div key={ch.numCode} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/40 transition-colors">
                  <span className="text-xs text-foreground flex-1 truncate">{ch.title}</span>
                  <button
                    onClick={() => downloadChapter(ch.url, ch.title)}
                    disabled={downloading === ch.url}
                    className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-accent hover:text-accent/80 disabled:opacity-50 transition-colors"
                  >
                    {downloading === ch.url ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Novel Chapter Panel ─── */
function NovelChapterPanel({ slug, title }: { slug: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [fmt, setFmt] = useState<"txt" | "pdf">("txt");
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["novelfire-book", slug],
    queryFn: () => fetchNovelBook(slug),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  async function downloadChapter(chapterUrl: string, chapterTitle: string) {
    setDownloading(chapterUrl);
    try {
      const res = await fetch(apiUrl(`/api/novelfire/download?url=${encodeURIComponent(chapterUrl)}&format=${fmt}`));
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${title}-${chapterTitle}.${fmt}`.replace(/[^a-z0-9-_.]/gi, "_");
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("Could not download this chapter. The source may have changed.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 py-1.5 px-3 rounded text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Chapters
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="mt-2 border border-border rounded-lg overflow-hidden bg-card">
          <div className="flex items-center gap-1 p-2 border-b border-border">
            <span className="text-[10px] text-muted-foreground mr-1">Format:</span>
            {(["txt", "pdf"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFmt(f)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase transition-colors ${fmt === f ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : !data?.chapters.length ? (
              <p className="text-xs text-muted-foreground text-center py-4">No chapters found</p>
            ) : (
              data.chapters.map((ch) => (
                <div key={ch.number} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/40 transition-colors">
                  <span className="text-xs text-foreground flex-1 truncate">{ch.title}</span>
                  <button
                    onClick={() => downloadChapter(ch.url, ch.title)}
                    disabled={downloading === ch.url}
                    className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-accent hover:text-accent/80 disabled:opacity-50 transition-colors"
                  >
                    {downloading === ch.url ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    {fmt.toUpperCase()}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function DownloadsPage() {
  const rawSearch = useSearch();
  const urlParams = new URLSearchParams(rawSearch);
  const qParam = urlParams.get("q") ?? "";
<<<<<<< HEAD
  const defaultTab = TABS.includes(urlParams.get("tab") as TabType) ? (urlParams.get("tab") as TabType) : "Manga";
=======
  const defaultTab = TABS.includes(urlParams.get("tab") as TabType) ? (urlParams.get("tab") as TabType) : "Anime";
>>>>>>> 61fdd465bdb0b8212177fe70a60b20a447c295ab

  const [tab, setTab] = useState<TabType>(defaultTab);
  const [search, setSearch] = useState(qParam);
  const [debouncedSearch, setDebouncedSearch] = useState(qParam);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (qParam) { setSearch(qParam); setDebouncedSearch(qParam); }
  }, [qParam]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setDebouncedSearch(val), 400);
    setTimer(t);
  }

  const isSearching = debouncedSearch.trim().length > 0;

<<<<<<< HEAD
=======
  const { data: paheResults } = useQuery<AnimePaheResult[]>({
    queryKey: ["pahe-search", debouncedSearch],
    queryFn: () => searchAnimePahe(debouncedSearch),
    staleTime: 5 * 60 * 1000,
    enabled: tab === "Anime" && isSearching,
  });

  const { data: animeItems, isLoading: animeLoading } = useQuery<AniListItem[]>({
    queryKey: ["dl-anime", debouncedSearch],
    queryFn: () => isSearching ? searchAniList(debouncedSearch, "ANIME") : fetchTrending("ANIME"),
    staleTime: 5 * 60 * 1000,
    enabled: tab === "Anime",
  });

>>>>>>> 61fdd465bdb0b8212177fe70a60b20a447c295ab
  const { data: mangaPillResults, isLoading: mangaPillLoading } = useQuery<MangaPillResult[]>({
    queryKey: ["mangapill-search", debouncedSearch],
    queryFn: () => searchMangaPill(debouncedSearch || "naruto"),
    staleTime: 5 * 60 * 1000,
    enabled: tab === "Manga",
  });

  const { data: novelResults, isLoading: novelLoading } = useQuery<NovelResult[]>({
    queryKey: ["novelfire", debouncedSearch],
    queryFn: () => isSearching ? searchNovels(debouncedSearch) : fetchPopularNovels(),
    staleTime: 5 * 60 * 1000,
    enabled: tab === "Novels",
  });

<<<<<<< HEAD
=======
  const paheMap = new Map<string, AnimePaheResult>();
  (paheResults ?? []).forEach((r) => paheMap.set(r.title.toLowerCase(), r));
  function findPahe(title: string) {
    const key = title.toLowerCase();
    if (paheMap.has(key)) return paheMap.get(key);
    for (const [k, v] of paheMap) {
      if (k.includes(key.slice(0, 8)) || key.includes(k.slice(0, 8))) return v;
    }
    return null;
  }

>>>>>>> 61fdd465bdb0b8212177fe70a60b20a447c295ab
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-16 pb-20">
        {/* Top ad */}
        <div className="mb-4 mt-2">
          <AdSlot size="banner" />
        </div>

        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-0.5">Downloads</h1>
          <p className="text-sm text-muted-foreground">
<<<<<<< HEAD
            Download manga chapters as PDF or novel chapters as TXT / PDF.
=======
            Download manga chapters as PDF, novel chapters as TXT or PDF, or watch anime online.
>>>>>>> 61fdd465bdb0b8212177fe70a60b20a447c295ab
          </p>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium transition-all ${
                  tab === t ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="search"
<<<<<<< HEAD
              placeholder={tab === "Manga" ? "Search manga…" : "Search novels…"}
=======
              placeholder={tab === "Anime" ? "Search anime…" : tab === "Manga" ? "Search manga…" : "Search novels…"}
>>>>>>> 61fdd465bdb0b8212177fe70a60b20a447c295ab
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-muted border border-border rounded pl-9 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
            />
            {search && (
              <button onClick={() => { setSearch(""); setDebouncedSearch(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

<<<<<<< HEAD
=======
        {/* ── ANIME TAB ── */}
        {tab === "Anime" && (
          <section>
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Film className="w-4 h-4 text-muted-foreground" />
              {isSearching ? "Anime Results" : "Trending Anime"}
            </h2>
            {animeLoading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {(animeItems ?? []).map((item) => {
                    const pahe = findPahe(item.title);
                    const watchUrl = pahe
                      ? `https://animepahe.ru/anime/${pahe.session}`
                      : `https://animepahe.ru/?s=${encodeURIComponent(item.title)}`;
                    return (
                      <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all group">
                        <div className="aspect-[3/4] overflow-hidden bg-muted relative">
                          {item.cover
                            ? <img src={item.cover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                            : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-muted-foreground/40" /></div>
                          }
                          {item.score && (
                            <div className="absolute top-2 right-2 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                              {(item.score / 10).toFixed(1)}
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 sm:p-3">
                          <p className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 mb-1 leading-snug">{item.title}</p>
                          <div className="flex flex-wrap gap-1 mb-2.5">
                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{item.format || "TV"}</span>
                            {item.year && <span className="text-[10px] text-muted-foreground">{item.year}</span>}
                          </div>
                          <a href={watchUrl} target="_blank" rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors">
                            <Play className="w-3 h-3 fill-accent-foreground" /> Watch Now
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Mid ad */}
                <div className="mt-8"><AdSlot size="banner" /></div>
              </>
            )}
          </section>
        )}

>>>>>>> 61fdd465bdb0b8212177fe70a60b20a447c295ab
        {/* ── MANGA TAB ── */}
        {tab === "Manga" && (
          <section>
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              {isSearching ? `Results for "${debouncedSearch}"` : "Popular Manga"}
            </h2>
            {mangaPillLoading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : !(mangaPillResults ?? []).length ? (
              <div className="text-center text-muted-foreground py-16 text-sm">
                {isSearching ? `No manga found for "${debouncedSearch}"` : "Search for a manga title above."}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {(mangaPillResults ?? []).map((item) => (
                    <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all group">
                      <div className="aspect-[3/4] overflow-hidden bg-muted relative">
                        {item.cover
                          ? <img src={item.cover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6 text-muted-foreground/40" /></div>
                        }
                      </div>
                      <div className="p-2.5 sm:p-3">
                        <p className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 mb-2 leading-snug">{item.title}</p>
                        <MangaChapterPanel seriesUrl={item.url} title={item.title} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8"><AdSlot size="banner" /></div>
              </>
            )}
          </section>
        )}

        {/* ── NOVELS TAB ── */}
        {tab === "Novels" && (
          <section>
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              {isSearching ? `Results for "${debouncedSearch}"` : "Novel Library"}
            </h2>
            {novelLoading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : !(novelResults ?? []).length ? (
              <div className="text-center text-muted-foreground py-16 text-sm">
                {isSearching ? `No novel found for "${debouncedSearch}"` : "Loading library…"}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {(novelResults ?? []).map((item) => (
                    <div key={item.slug} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all group">
                      <div className="aspect-[3/4] overflow-hidden bg-muted relative">
                        <img src={item.cover} alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            const el = e.currentTarget as HTMLImageElement;
                            el.style.display = "none";
                          }} />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0">
                          <FileText className="w-6 h-6 text-muted-foreground/40" />
                        </div>
                      </div>
                      <div className="p-2.5 sm:p-3">
                        <p className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 mb-2 leading-snug">{item.title}</p>
                        <NovelChapterPanel slug={item.slug} title={item.title} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8"><AdSlot size="banner" /></div>
              </>
            )}
          </section>
        )}

        {/* Bottom ad */}
        <div className="mt-12">
          <AdSlot size="square" />
        </div>
      </div>
    </div>
  );
}
