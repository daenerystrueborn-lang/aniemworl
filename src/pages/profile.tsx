import { useState } from "react";
import { Link } from "wouter";
import {
  LogIn, LogOut, Tv, BookOpen, Trash2, ExternalLink,
  Edit2, Check, X, Star, BarChart3, Clock, Layers,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ANILIST_STATUS_LABELS, type WatchlistEntry } from "@/lib/anilist-auth";

/* ─── Status badge ─────────────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  CURRENT: "bg-green-500/15 text-green-400 border-green-500/30",
  PLANNING: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  COMPLETED: "bg-accent/15 text-accent border-accent/30",
  DROPPED: "bg-red-500/15 text-red-400 border-red-500/30",
  PAUSED: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  REPEATING: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {ANILIST_STATUS_LABELS[status] ?? status}
    </span>
  );
}

/* ─── Watchlist entry card ─────────────────────────────────────── */
function WatchlistCard({ entry, onRemove }: { entry: WatchlistEntry; onRemove: (entryId: number, mediaId: number) => void }) {
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    onRemove(entry.entryId, entry.mediaId);
  }

  const href = entry.type === "ANIME" ? `/watch/${entry.mediaId}` : `/wiki/${entry.mediaId}`;

  return (
    <div className={`flex items-center gap-3 bg-muted/30 border border-border/60 rounded-xl px-3 py-2.5 hover:border-accent/30 hover:bg-muted/50 transition-all ${removing ? "opacity-40 pointer-events-none" : ""}`}>
      {/* Cover */}
      <Link href={`/wiki/${entry.mediaId}`} className="shrink-0">
        <div className="w-10 aspect-[2/3] rounded-lg overflow-hidden border border-border bg-muted">
          {entry.cover ? (
            <img src={entry.cover} alt={entry.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {entry.type === "ANIME" ? <Tv className="w-3 h-3 text-muted-foreground/40" /> : <BookOpen className="w-3 h-3 text-muted-foreground/40" />}
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/wiki/${entry.mediaId}`} className="text-sm font-semibold text-foreground hover:text-accent transition-colors line-clamp-1">
          {entry.title}
        </Link>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <StatusBadge status={entry.status} />
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {entry.type}
          </span>
          {entry.progress > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {entry.type === "ANIME" ? `EP ${entry.progress}` : `CH ${entry.progress}`}
              {entry.episodes ? ` / ${entry.episodes}` : ""}
              {entry.chapters ? ` / ${entry.chapters}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href={href}
          className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          title={entry.type === "ANIME" ? "Watch" : "Read"}
        >
          {entry.type === "ANIME" ? <Tv className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
        </Link>
        <button
          onClick={handleRemove}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Remove from list"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── Watchlist section ────────────────────────────────────────── */
const STATUS_ORDER = ["CURRENT", "PLANNING", "COMPLETED", "PAUSED", "DROPPED", "REPEATING"];

function WatchlistSection({ entries, onRemove }: { entries: WatchlistEntry[]; onRemove: (eId: number, mId: number) => void }) {
  const animeEntries = entries.filter((e) => e.type === "ANIME");
  const [activeStatus, setActiveStatus] = useState<string>("all");

  const filtered = animeEntries.filter((e) => {
    if (activeStatus !== "all" && e.status !== activeStatus) return false;
    return true;
  });

  const statuses = [...new Set(animeEntries.map((e) => e.status))].sort(
    (a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b)
  );

  if (animeEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Layers className="w-10 h-10 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">Your watchlist is empty.</p>
        <p className="text-xs text-muted-foreground/60">Browse anime or wiki pages and add titles using the list button.</p>
        <Link href="/anime" className="mt-2 px-5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:bg-accent/90 transition-all hover:scale-105">
          Browse Anime
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Status filter */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setActiveStatus("all")}
            className={`px-2.5 py-1 rounded text-xs font-medium border transition-all ${activeStatus === "all" ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:text-foreground hover:border-accent/30"}`}
          >
            All
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-all ${activeStatus === s ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:text-foreground hover:border-accent/30"}`}
            >
              {ANILIST_STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">{filtered.length} title{filtered.length !== 1 ? "s" : ""}</p>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((e) => (
          <WatchlistCard key={`${e.type}-${e.mediaId}`} entry={e} onRemove={onRemove} />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No titles match this filter.</p>
        )}
      </div>
    </div>
  );
}

/* ─── Custom PFP editor ────────────────────────────────────────── */
function PfpEditor({ current, onSave, onCancel }: { current: string | null; onSave: (url: string | null) => void; onCancel: () => void }) {
  const [url, setUrl] = useState(current ?? "");
  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste an image URL…"
        className="flex-1 bg-muted border border-border rounded px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
        autoFocus
      />
      <button onClick={() => onSave(url || null)} className="p-1.5 rounded bg-accent text-accent-foreground hover:bg-accent/90 transition-colors">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={onCancel} className="p-1.5 rounded bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Profile Page ─────────────────────────────────────────────── */
export default function ProfilePage() {
  const { user, isLoggedIn, isLoading, watchlist, customPfp, login, logout, removeEntry, setCustomPfp } = useAuth();
  const [editingPfp, setEditingPfp] = useState(false);

  const avatar = customPfp || user?.avatar || null;

  async function handleRemoveEntry(entryId: number, mediaId: number) {
    await removeEntry(entryId, mediaId);
  }

  /* ── Not logged in ── */
  if (!isLoggedIn && !isLoading) {
    return (
      <div className="min-h-screen bg-background pt-14">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-muted border-2 border-border flex items-center justify-center">
            <span className="text-3xl text-muted-foreground">?</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Sign in with AniList</h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
              Log in with your AniList account to sync your watchlist, track your anime progress, and access your profile across all your devices — completely free.
            </p>
          </div>
          <button
            onClick={login}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm hover:bg-accent/90 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-accent/20"
          >
            <LogIn className="w-4 h-4" /> Sign in with AniList
          </button>
          <p className="text-xs text-muted-foreground/60">
            Don't have an AniList account?{" "}
            <a href="https://anilist.co/signup" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Create one free →
            </a>
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-4">
            {[
              { icon: <Tv className="w-5 h-5 text-accent" />, title: "Watchlist", desc: "Track what you're watching, completed, and planning." },
              { icon: <BarChart3 className="w-5 h-5 text-accent" />, title: "Statistics", desc: "See your total episodes watched, chapters read, and more." },
              { icon: <Star className="w-5 h-5 text-accent" />, title: "Sync with AniList", desc: "Your progress syncs directly to your AniList profile." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">{icon}</div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-14 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your profile…</p>
        </div>
      </div>
    );
  }

  /* ── Signed in ── */
  const stats = user?.statistics;

  return (
    <div className="min-h-screen bg-background pt-14">
      {/* Profile header */}
      {user?.bannerImage && (
        <div className="relative h-32 sm:h-48 overflow-hidden">
          <img src={user.bannerImage} alt="Banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
      )}

      <div className={`border-b border-border bg-card ${user?.bannerImage ? "-mt-8" : ""}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-6 sm:pt-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-background bg-muted shadow-xl">
                {avatar ? (
                  <img src={avatar} alt={user?.name ?? "avatar"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl font-bold text-muted-foreground">
                      {user?.name?.[0]?.toUpperCase() ?? "A"}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setEditingPfp(true)}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center hover:bg-accent/90 transition-colors border-2 border-background shadow-md"
                title="Change photo URL"
              >
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Name + stats */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{user?.name}</h1>
                <a
                  href={user?.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors"
                >
                  AniList profile <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Tv className="w-3.5 h-3.5 text-accent" />
                  <span className="font-semibold text-foreground">{stats?.anime.count ?? 0}</span> anime
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  <span className="font-semibold text-foreground">{stats?.anime.episodesWatched ?? 0}</span> eps
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BookOpen className="w-3.5 h-3.5 text-accent" />
                  <span className="font-semibold text-foreground">{stats?.manga.count ?? 0}</span> manga
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BarChart3 className="w-3.5 h-3.5 text-accent" />
                  <span className="font-semibold text-foreground">{watchlist.length}</span> in list
                </div>
              </div>

              {editingPfp && (
                <PfpEditor
                  current={customPfp}
                  onSave={(url) => { setCustomPfp(url); setEditingPfp(false); }}
                  onCancel={() => setEditingPfp(false)}
                />
              )}
            </div>

            <button
              onClick={logout}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-foreground text-sm font-semibold hover:bg-muted hover:border-red-400/30 hover:text-red-400 transition-all"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Watchlist */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-base font-bold text-foreground mb-5 flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" /> My List
        </h2>
        <WatchlistSection entries={watchlist} onRemove={handleRemoveEntry} />
      </div>
    </div>
  );
}
