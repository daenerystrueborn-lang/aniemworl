import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, Star, LogIn, LogOut, User, Crown } from "lucide-react";
import { searchAnime } from "../lib/anilist";
import { useAuth } from "../lib/auth-context";

const navLinks = [
  { label: "Home", href: "/home" },
  { label: "Browse", href: "/anime" },
  { label: "Movies", href: "/movies" },
  { label: "Rankings", href: "/rankings" },
  { label: "Wiki", href: "/wiki" },
];

interface Suggestion {
  id: number;
  title: string;
  cover: string;
  score: number | null;
  format: string;
  year: number | null;
}

async function fetchSuggestions(q: string): Promise<Suggestion[]> {
  if (!q.trim()) return [];
  const [anime, manga] = await Promise.all([
    searchAnime({ q, type: "ANIME", perPage: 4 }).catch(() => ({ data: [] })),
    searchAnime({ q, type: "MANGA", perPage: 3 }).catch(() => ({ data: [] })),
  ]);
  return [...(anime.data ?? []), ...(manga.data ?? [])].slice(0, 6);
}

function SearchBox({ onNavigate }: { onNavigate?: () => void }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const results = await fetchSuggestions(q);
      setSuggestions(results);
      setOpen(results.length > 0);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(val: string) {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val.trim()) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(id: number) {
    setQuery(""); setSuggestions([]); setOpen(false);
    setLocation(`/wiki/${id}`);
    onNavigate?.();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    setLocation(`/wiki?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
    onNavigate?.();
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          placeholder="Search titles…"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (suggestions.length) setOpen(true); }}
          className="w-full bg-muted border border-border rounded pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
        />
      </form>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-2xl z-[100] overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">Searching…</div>
          ) : (
            suggestions.map((s) => (
              <button
                key={s.id}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s.id); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
              >
                <div className="w-8 h-11 rounded overflow-hidden border border-border bg-muted shrink-0">
                  {s.cover && <img src={s.cover} alt={s.title} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{s.format}</span>
                    {s.year && <span className="text-[10px] text-muted-foreground">{s.year}</span>}
                  </div>
                </div>
                {s.score && (
                  <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-accent">
                    <Star className="w-2.5 h-2.5 fill-accent" />{(s.score / 10).toFixed(1)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Avatar button ─────────────────────────────────────────────── */
function UserButton({ onNavigate }: { onNavigate?: () => void }) {
  const { isLoggedIn, user, customPfp, login, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const avatar = customPfp || user?.avatar || null;

  if (!isLoggedIn) {
    return (
      <button
        onClick={login}
        className="shrink-0 hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-bold hover:bg-accent/90 transition-all hover:scale-105 active:scale-95"
      >
        <LogIn className="w-3.5 h-3.5" /> Sign In
      </button>
    );
  }

  return (
    <div ref={ref} className="relative shrink-0 hidden md:block">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="w-8 h-8 rounded-full overflow-hidden border-2 border-accent/40 hover:border-accent transition-all hover:scale-105 active:scale-95"
        title={user?.name ?? "Profile"}
      >
        {avatar ? (
          <img src={avatar} alt={user?.name ?? "avatar"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-bold">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </span>
          </div>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-2xl z-[100] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-border shrink-0">
              {avatar ? (
                <img src={avatar} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-bold text-muted-foreground">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground">AniList account</p>
            </div>
          </div>

          {/* Links */}
          <div className="py-1">
            <button
              onClick={() => { setMenuOpen(false); setLocation("/profile"); onNavigate?.(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors text-left"
            >
              <User className="w-4 h-4 text-muted-foreground" /> My Profile
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-border py-1">
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-muted/60 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NavBar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isLoggedIn, user, customPfp, login, logout } = useAuth();
  const avatar = customPfp || user?.avatar || null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(0_0%_4%/0.95)] backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 mr-2">
          <img src="/logo.png" alt="Animeastral" className="w-7 h-7 rounded object-cover" />
          <span className="font-bold text-foreground tracking-tight text-base hidden sm:block">Animeastral</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                location === link.href
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {/* Premium link */}
          <Link
            href="/premium"
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
              location === "/premium"
                ? "text-yellow-400 bg-yellow-400/10"
                : "text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-400/10"
            }`}
          >
            <Crown className="w-3.5 h-3.5" /> Premium
          </Link>
        </nav>

        {/* Desktop search */}
        <div className="hidden md:flex flex-1 max-w-xs ml-auto">
          <SearchBox />
        </div>

        {/* User button (desktop) */}
        <UserButton />

        {/* Mobile right controls */}
        <div className="flex items-center gap-2 ml-auto md:hidden">
          {/* Mobile avatar */}
          {isLoggedIn ? (
            <Link href="/profile" className="w-7 h-7 rounded-full overflow-hidden border border-accent/40">
              {avatar ? (
                <img src={avatar} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-[10px] font-bold text-muted-foreground">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
              )}
            </Link>
          ) : (
            <button onClick={login} className="p-1.5 text-accent hover:text-accent/80">
              <LogIn className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => { setSearchOpen(!searchOpen); setMobileOpen(false); }}
            className="p-1.5 text-muted-foreground hover:text-foreground"
          >
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setMobileOpen(!mobileOpen); setSearchOpen(false); }}
            className="p-1.5 text-muted-foreground hover:text-foreground"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile search */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3 relative z-[60]">
          <SearchBox onNavigate={() => setSearchOpen(false)} />
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-[hsl(0_0%_4%/0.98)]">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                  location === link.href
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {/* Premium — mobile */}
            <Link
              href="/premium"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 rounded text-sm font-medium flex items-center gap-2 text-yellow-400/80 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
            >
              <Crown className="w-3.5 h-3.5" /> Premium
            </Link>
            <Link
              href="/profile"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 rounded text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              Profile
            </Link>
            {isLoggedIn ? (
              <button
                onClick={() => { setMobileOpen(false); logout(); }}
                className="px-3 py-2.5 rounded text-sm font-medium text-red-400 hover:bg-muted/60 text-left flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            ) : (
              <button
                onClick={() => { setMobileOpen(false); login(); }}
                className="px-3 py-2.5 rounded text-sm font-medium text-accent hover:bg-muted/60 text-left flex items-center gap-2"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign in with AniList
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
