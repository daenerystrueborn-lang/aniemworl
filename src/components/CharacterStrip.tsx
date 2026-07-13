import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X, Heart, Loader2, Users } from "lucide-react";
import { apiUrl } from "../lib/api";

interface CharacterListItem {
  id: number;
  name: string;
  image: string;
  popularity: number;
  topAnime: string | null;
}

interface CharacterAppearance {
  id: number;
  title: string;
  cover: string;
  format: string;
  year: number | null;
  role: string;
}

interface CharacterDetail {
  id: number;
  name: { full: string; native: string; alternatives: string[] };
  image: string;
  description: string;
  gender: string | null;
  age: string | null;
  bloodType: string | null;
  popularity: number;
  appearances: CharacterAppearance[];
}

async function fetchTrendingCharacters(): Promise<CharacterListItem[]> {
  const res = await fetch(apiUrl("/api/character/trending?perPage=20"));
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

async function fetchCharacterDetail(id: number): Promise<CharacterDetail> {
  const res = await fetch(apiUrl(`/api/character/${id}`));
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

function CharacterModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: c, isLoading } = useQuery<CharacterDetail>({
    queryKey: ["character-detail", id],
    queryFn: () => fetchCharacterDetail(id),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading || !c ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div>
            <div className="relative">
              {c.image && (
                <div className="h-40 sm:h-48 overflow-hidden">
                  <img
                    src={c.image}
                    alt=""
                    className="w-full h-full object-cover object-top blur-sm scale-110 opacity-40"
                  />
                </div>
              )}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute -bottom-10 left-4 sm:left-6">
                <img
                  src={c.image}
                  alt={c.name.full}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-card shadow-lg"
                />
              </div>
            </div>

            <div className="pt-12 px-4 sm:px-6 pb-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">{c.name.full}</h2>
              {c.name.native && (
                <p className="text-xs text-muted-foreground mt-0.5">{c.name.native}</p>
              )}

              <div className="flex items-center gap-3 mt-3">
                <span className="inline-flex items-center gap-1.5 bg-accent/15 border border-accent/30 text-accent text-xs font-semibold px-2.5 py-1 rounded-full">
                  <Heart className="w-3 h-3 fill-accent" />
                  {c.popularity.toLocaleString()} favorites
                </span>
                {c.gender && (
                  <span className="text-xs text-muted-foreground">{c.gender}</span>
                )}
                {c.age && (
                  <span className="text-xs text-muted-foreground">Age {c.age}</span>
                )}
              </div>

              {c.description && (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-4 line-clamp-6">
                  {c.description}
                </p>
              )}

              {c.appearances.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-foreground mb-2.5">Anime History</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {c.appearances.map((a) => (
                      <div key={a.id} className="group">
                        <div className="aspect-[2/3] rounded-lg overflow-hidden border border-border bg-muted mb-1">
                          {a.cover ? (
                            <img src={a.cover} alt={a.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : null}
                        </div>
                        <p className="text-[10px] text-foreground font-medium truncate leading-tight">{a.title}</p>
                        <p className="text-[9px] text-muted-foreground truncate">
                          {a.role}{a.year ? ` · ${a.year}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CharacterStrip() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: characters = [], isLoading } = useQuery<CharacterListItem[]>({
    queryKey: ["characters-trending"],
    queryFn: fetchTrendingCharacters,
    staleTime: 15 * 60 * 1000,
  });

  function scrollBy(amount: number) {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 mb-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!characters.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-accent" />
        <h2 className="text-sm font-semibold text-foreground">Popular Characters</h2>
      </div>

      <div className="relative group/strip">
        <button
          onClick={() => scrollBy(-320)}
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full bg-card border border-border shadow-md opacity-0 group-hover/strip:opacity-100 transition-opacity -translate-x-3"
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {characters.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className="shrink-0 w-24 sm:w-28 snap-start text-left group"
            >
              <div className="aspect-square rounded-xl overflow-hidden border border-border bg-muted mb-1.5 relative">
                {c.image ? (
                  <img
                    src={c.image}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : null}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
              <p className="text-xs text-foreground font-medium truncate leading-tight">{c.name}</p>
              {c.topAnime && (
                <p className="text-[10px] text-muted-foreground truncate">{c.topAnime}</p>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => scrollBy(320)}
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full bg-card border border-border shadow-md opacity-0 group-hover/strip:opacity-100 transition-opacity translate-x-3"
        >
          <ChevronRight className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {selectedId !== null && (
        <CharacterModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
