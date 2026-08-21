import { useState, useEffect } from "react";
import { Link } from "wouter";
import { History, Play, ChevronRight, X } from "lucide-react";

interface HistoryEntry {
  episodeNumber: number;
  animeTitle: string;
  animeImage: string;
  cover: string;
  timestamp: number;
  totalEpisodes?: number | null;
}

type WatchHistory = Record<string, HistoryEntry>;

/* ─── BlurFade ───────────────────────────────────────────────── */
function BlurFade({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        filter: visible ? "blur(0px)" : "blur(8px)",
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: `opacity 0.5s ease ${delay}ms, filter 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Progress bar ───────────────────────────────────────────── */
function ProgressBar({ current, total }: { current: number; total: number | null | undefined }) {
  const pct = total ? Math.min((current / total) * 100, 100) : null;
  return (
    <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
      {pct !== null ? (
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      ) : (
        <div className="h-full bg-accent/40 rounded-full w-1/3" />
      )}
    </div>
  );
}

/* ─── Card ───────────────────────────────────────────────────── */
function HistoryCard({
  id,
  entry,
  onRemove,
}: {
  id: string;
  entry: HistoryEntry;
  onRemove: (id: string) => void;
}) {
  const poster = entry.animeImage || entry.cover;

  return (
    <BlurFade delay={0} className="shrink-0 w-32 sm:w-36 group relative">
      {/* Remove button */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(id); }}
        className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/60 text-white/80 hover:bg-black/90 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        title="Remove"
      >
        <X className="w-2.5 h-2.5" />
      </button>

      <Link href={`/watch/${id}?ep=${entry.episodeNumber}`} className="block">
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-border bg-muted shadow-md group-hover:shadow-xl group-hover:shadow-accent/10 group-hover:border-accent/30 transition-all duration-300">
          {poster ? (
            <img
              src={poster}
              alt={entry.animeTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Play className="w-6 h-6 text-muted-foreground/30" />
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Play button on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-accent rounded-full p-2.5 shadow-xl shadow-accent/30 scale-90 group-hover:scale-100 transition-transform">
              <Play className="w-4 h-4 text-accent-foreground fill-accent-foreground" />
            </div>
          </div>

          {/* Episode badge */}
          <div className="absolute bottom-2 left-2 right-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
              <Play className="w-2.5 h-2.5 fill-white" />
              EP {entry.episodeNumber}
            </span>
          </div>
        </div>

        <div className="mt-1.5 px-0.5">
          <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
            {entry.animeTitle}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Episode {entry.episodeNumber}
            {entry.totalEpisodes ? ` / ${entry.totalEpisodes}` : ""}
          </p>
          <ProgressBar current={entry.episodeNumber} total={entry.totalEpisodes} />
        </div>
      </Link>
    </BlurFade>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export default function ContinueWatching() {
  const [history, setHistory] = useState<WatchHistory>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("watch-history");
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const entries = Object.entries(history)
    .sort(([, a], [, b]) => b.timestamp - a.timestamp)
    .slice(0, 10);

  function handleRemove(id: string) {
    const next = { ...history };
    delete next[id];
    setHistory(next);
    try { localStorage.setItem("watch-history", JSON.stringify(next)); } catch {}
  }

  if (entries.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          Continue Watching
        </h2>
        <button
          onClick={() => {
            if (confirm("Clear all watch history?")) {
              setHistory({});
              try { localStorage.removeItem("watch-history"); } catch {}
            }
          }}
          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-0.5 transition-colors group"
        >
          Clear all <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {entries.map(([id, entry], i) => (
          <BlurFade key={id} delay={i * 50}>
            <HistoryCard id={id} entry={entry} onRemove={handleRemove} />
          </BlurFade>
        ))}
      </div>
    </section>
  );
}
