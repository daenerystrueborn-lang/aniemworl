import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  Star, Users, Heart, Play, BookOpen, Calendar, Tv, ExternalLink,
  ChevronLeft, Loader2, X, Droplets, Library, Check, ChevronDown, Download,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiUrl } from "../lib/api";

interface WikiDetail {
  id: number;
  title: { english: string | null; romaji: string | null; native: string | null; display: string };
  cover: string;
  banner: string;
  description: string;
  genres: string[];
  tags: { name: string; rank: number }[];
  score: number | null;
  meanScore: number | null;
  popularity: number;
  favourites: number;
  format: string;
  status: string;
  episodes: number | null;
  duration: number | null;
  chapters: number | null;
  volumes: number | null;
  year: number | null;
  season: string | null;
  source: string | null;
  studios: string[];
  characters: {
    id: number;
    name: string;
    image: string;
    role: string;
    voiceActor: { name: string; image: string } | null;
  }[];
  relations: {
    id: number;
    title: string;
    cover: string;
    format: string;
    year: number | null;
    relationType: string;
  }[];
  trailer: { id: string; site: string } | null;
  nextAiring: { episode: number; timeUntilAiring: number } | null;
}

interface CharacterDetail {
  id: number;
  name: { full: string; native: string; alternatives: string[] };
  image: string;
  description: string;
  gender: string | null;
  age: string | null;
  bloodType: string | null;
  dateOfBirth: { year?: number; month?: number; day?: number } | null;
  appearances: {
    id: number;
    title: string;
    cover: string;
    format: string;
    year: number | null;
    role: string;
  }[];
}

async function fetchDetails(id: string): Promise<WikiDetail> {
  const res = await fetch(apiUrl(`/api/anime/details/${id}`));
  if (!res.ok) throw new Error("Not found");
  return res.json();
}

async function fetchCharacter(id: number): Promise<CharacterDetail> {
  const res = await fetch(apiUrl(`/api/character/${id}`));
  if (!res.ok) throw new Error("Not found");
  return res.json();
}

function StatBlock({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-center">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatStatus(s: string) {
  const m: Record<string, string> = {
    FINISHED: "Finished", RELEASING: "Airing",
    NOT_YET_RELEASED: "Upcoming", CANCELLED: "Cancelled", HIATUS: "Hiatus",
  };
  return m[s] ?? s;
}

function formatSeason(s: string | null) {
  if (!s) return null;
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function formatRelationType(r: string) {
  const m: Record<string, string> = {
    SEQUEL: "Sequel", PREQUEL: "Prequel", SIDE_STORY: "Side Story", ADAPTATION: "Adaptation",
  };
  return m[r] ?? r;
}

function CharacterModal({ charId, onClose }: { charId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery<CharacterDetail>({
    queryKey: ["character", charId],
    queryFn: () => fetchCharacter(charId),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            Failed to load character.
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-5 p-6 pb-4 border-b border-border">
              <div className="w-24 aspect-[3/4] rounded-xl overflow-hidden border border-border bg-muted shrink-0">
                {data.image && (
                  <img src={data.image} alt={data.name.full} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h2 className="text-xl font-bold text-foreground leading-tight">{data.name.full}</h2>
                {data.name.native && (
                  <p className="text-sm text-muted-foreground mb-2">{data.name.native}</p>
                )}
                {data.name.alternatives.length > 0 && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Also known as: {data.name.alternatives.join(", ")}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  {data.gender && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      <Users className="w-3 h-3" /> {data.gender}
                    </span>
                  )}
                  {data.age && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      <Calendar className="w-3 h-3" /> Age {data.age}
                    </span>
                  )}
                  {data.bloodType && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      <Droplets className="w-3 h-3" /> {data.bloodType}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {data.description && (
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-2">About</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
                    {data.description}
                  </p>
                </div>
              )}

              {data.appearances.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3">Appearances</h3>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {data.appearances.map((ap) => (
                      <Link
                        key={ap.id}
                        href={`/wiki/${ap.id}`}
                        onClick={onClose}
                        className="shrink-0 w-20 group cursor-pointer"
                      >
                        <div className="aspect-[2/3] rounded-lg overflow-hidden border border-border bg-muted mb-1">
                          {ap.cover ? (
                            <img src={ap.cover} alt={ap.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Tv className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-foreground font-medium truncate">{ap.title}</p>
                        <p className="text-[9px] text-muted-foreground capitalize">{ap.role.toLowerCase()}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <a
                href={`https://anilist.co/character/${data.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> View on AniList
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const ANIME_STATUSES = ["watching", "plan-to-watch", "completed", "dropped"] as const;
const READ_STATUSES = ["reading", "plan-to-read", "completed", "dropped"] as const;
const STATUS_LABELS: Record<string, string> = {
  watching: "Watching", "plan-to-watch": "Plan to Watch",
  reading: "Reading", "plan-to-read": "Plan to Read",
  completed: "Completed", dropped: "Dropped",
};

function LibraryButton({ mediaId, isRead }: { mediaId: string; isRead: boolean }) {
  const { token, library, updateLibrary } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const mediaType = isRead ? "manga" : "anime";
  const existing = library.find((e) => e.id === mediaId && e.type === mediaType);
  const statuses = isRead ? READ_STATUSES : ANIME_STATUSES;

  if (!token) {
    return (
      <a href="/profile" className="w-full inline-flex items-center justify-center gap-2 bg-muted border border-border text-muted-foreground px-3 py-2 rounded text-xs font-semibold hover:bg-muted/70 transition-colors">
        <Library className="w-3.5 h-3.5" /> Sign in to save
      </a>
    );
  }

  async function selectStatus(status: string) {
    if (!token) return;
    setSaving(true);
    setOpen(false);
    const entry = {
      id: mediaId, type: mediaType as "anime" | "manga",
      status: status as "watching" | "reading" | "completed" | "plan-to-watch" | "plan-to-read" | "dropped",
      addedAt: existing?.addedAt ?? Date.now(), updatedAt: Date.now(),
    };
    updateLibrary(entry);
    await fetch(apiUrl("/api/auth/library"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: mediaId, type: mediaType, status }),
    });
    setSaving(false);
  }

  return (
    <div className="relative w-full">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="w-full inline-flex items-center justify-center gap-2 bg-muted border border-border text-foreground px-3 py-2 rounded text-xs font-semibold hover:bg-muted/70 transition-colors disabled:opacity-50"
      >
        {existing ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Library className="w-3.5 h-3.5" />}
        {existing ? STATUS_LABELS[existing.status] : "Add to Library"}
        <ChevronDown className="w-3 h-3 ml-auto" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-20 overflow-hidden">
          {statuses.map((s) => (
            <button key={s} onClick={() => selectStatus(s)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-muted/60 transition-colors ${existing?.status === s ? "text-accent font-semibold" : "text-foreground"}`}>
              {STATUS_LABELS[s]}
              {existing?.status === s && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WikiDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [selectedCharId, setSelectedCharId] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery<WikiDetail>({
    queryKey: ["wiki-detail", id],
    queryFn: () => fetchDetails(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Could not load this title.</p>
        <Link href="/wiki" className="text-accent text-sm hover:underline">← Back to Wiki</Link>
      </div>
    );
  }

  const isRead = ["MANGA", "NOVEL", "ONE_SHOT", "MANHWA", "MANHUA"].includes(data.format);
  const mainChars = data.characters.filter((c) => c.role === "MAIN");
  const supportChars = data.characters.filter((c) => c.role === "SUPPORTING").slice(0, 6);
  const allChars = [...mainChars, ...supportChars];

  return (
    <div className="min-h-screen bg-background">
      {selectedCharId !== null && (
        <CharacterModal charId={selectedCharId} onClose={() => setSelectedCharId(null)} />
      )}

      {/* Banner */}
      <div className="relative h-56 sm:h-72 overflow-hidden">
        {data.banner || data.cover ? (
          <img src={data.banner || data.cover} alt={data.title.display} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
        <Link
          href="/wiki"
          className="absolute top-16 left-4 sm:left-6 flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Wiki
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 -mt-20 relative z-10">
        <div className="flex gap-5 sm:gap-8">
          {/* Cover */}
          <div className="shrink-0">
            <div className="w-28 sm:w-40 aspect-[2/3] rounded-xl overflow-hidden border-2 border-border shadow-xl bg-muted">
              {data.cover && <img src={data.cover} alt={data.title.display} className="w-full h-full object-cover" />}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href={isRead ? `/wiki/${data.id}` : `/watch/${data.id}`}
                className="w-full inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-3 py-2 rounded text-xs font-semibold hover:bg-accent/90 transition-colors"
              >
                {isRead ? <><BookOpen className="w-3.5 h-3.5" /> Read Now</> : <><Play className="w-3.5 h-3.5 fill-accent-foreground" /> Watch Now</>}
              </Link>
              {isRead && (
                <Link
                  href={`/downloads?q=${encodeURIComponent(data.title.display)}`}
                  className="w-full inline-flex items-center justify-center gap-2 bg-muted border border-border text-foreground px-3 py-2 rounded text-xs font-semibold hover:bg-muted/70 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </Link>
              )}
              <LibraryButton mediaId={String(data.id)} isRead={isRead} />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-20 sm:pt-24">
            {data.title.native && <p className="text-xs text-muted-foreground mb-1">{data.title.native}</p>}
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-1">
              {data.title.display}
            </h1>
            {data.title.romaji && data.title.romaji !== data.title.display && (
              <p className="text-sm text-muted-foreground mb-3">{data.title.romaji}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-4">
              {data.score && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-sm font-bold">
                  <Star className="w-3.5 h-3.5 fill-accent" />
                  {(data.score / 10).toFixed(1)}
                </span>
              )}
              {data.popularity > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" /> {data.popularity.toLocaleString()} members
                </span>
              )}
              {data.favourites > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Heart className="w-3.5 h-3.5" /> {data.favourites.toLocaleString()} favourites
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                data.status === "RELEASING" ? "bg-green-500/15 text-green-400 border border-green-500/30" :
                data.status === "FINISHED" ? "bg-muted text-muted-foreground border border-border" :
                "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
              }`}>
                {formatStatus(data.status)}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {data.genres.map((g) => (
                <span key={g} className="text-xs px-2 py-0.5 rounded border border-border bg-muted text-muted-foreground">{g}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-6 mb-8">
          <StatBlock label="Format" value={data.format} />
          <StatBlock label={data.episodes ? "Episodes" : "Chapters"} value={data.episodes ?? data.chapters} />
          {data.duration && <StatBlock label="Duration" value={`${data.duration} min`} />}
          {data.volumes && <StatBlock label="Volumes" value={data.volumes} />}
          <StatBlock label="Year" value={data.year} />
          {data.season && <StatBlock label="Season" value={formatSeason(data.season)} />}
          {data.source && <StatBlock label="Source" value={data.source.replace(/_/g, " ")} />}
          {data.studios.length > 0 && <StatBlock label="Studio" value={data.studios[0]} />}
        </div>

        {/* Next airing */}
        {data.nextAiring && (
          <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground bg-muted/40 border border-border rounded-lg px-4 py-2.5 w-fit">
            <Calendar className="w-4 h-4 text-accent" />
            <span>
              Episode {data.nextAiring.episode} airing in{" "}
              <strong className="text-foreground">
                {Math.floor(data.nextAiring.timeUntilAiring / 86400)}d{" "}
                {Math.floor((data.nextAiring.timeUntilAiring % 86400) / 3600)}h
              </strong>
            </span>
          </div>
        )}

        {/* Synopsis */}
        {data.description && (
          <section className="mb-10">
            <h2 className="text-base font-bold text-foreground mb-3">Synopsis</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.description}</p>
          </section>
        )}

        {/* Characters */}
        {allChars.length > 0 && (
          <section className="mb-10">
            <h2 className="text-base font-bold text-foreground mb-4">Characters</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {allChars.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharId(char.id)}
                  className="group text-left"
                >
                  <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border bg-muted mb-1.5 relative cursor-pointer">
                    {char.image ? (
                      <img src={char.image} alt={char.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="text-white text-[10px] font-bold bg-black/60 px-2 py-0.5 rounded">View</span>
                    </div>
                  </div>
                  <p className="text-xs text-foreground font-medium truncate">{char.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{char.role.toLowerCase()}</p>
                  {char.voiceActor && (
                    <p className="text-[10px] text-muted-foreground/70 truncate">{char.voiceActor.name}</p>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Tags */}
        {data.tags.length > 0 && (
          <section className="mb-10">
            <h2 className="text-base font-bold text-foreground mb-3">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <span key={tag.name} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-border bg-muted/50 text-muted-foreground">
                  {tag.name}
                  <span className="text-accent text-[10px] font-bold">{tag.rank}%</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Trailer */}
        {data.trailer?.site === "youtube" && (
          <section className="mb-10">
            <h2 className="text-base font-bold text-foreground mb-3">Trailer</h2>
            <div className="aspect-video max-w-xl rounded-xl overflow-hidden border border-border">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${data.trailer.id}`}
                title="Trailer"
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {/* Relations */}
        {data.relations.length > 0 && (
          <section className="mb-10">
            <h2 className="text-base font-bold text-foreground mb-4">Related</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {data.relations.map((rel) => (
                <Link key={rel.id} href={`/wiki/${rel.id}`} className="shrink-0 w-28 group cursor-pointer">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden border border-border bg-muted mb-1.5">
                    {rel.cover ? (
                      <img src={rel.cover} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Tv className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-foreground font-medium truncate">{rel.title}</p>
                  <p className="text-[10px] text-muted-foreground">{formatRelationType(rel.relationType)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <a
          href={`https://anilist.co/anime/${data.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> View on AniList
        </a>
      </div>
    </div>
  );
}
