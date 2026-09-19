import { Link } from "wouter";
import { Play, Shield, Zap, Globe, ArrowRight, Tv, Film, Star } from "lucide-react";

const EXPLORE_LINKS = [
  { label: "Browse Anime", href: "/anime" },
  { label: "Movies", href: "/movies" },
  { label: "Rankings", href: "/rankings" },
  { label: "Wiki", href: "/wiki" },
];

const FEATURES = [
  {
    icon: <Zap className="w-5 h-5 text-accent" />,
    title: "Stream Instantly",
    desc: "No sign-up required. Jump straight into any episode from our library of thousands of titles.",
  },
  {
    icon: <Globe className="w-5 h-5 text-accent" />,
    title: "Sub & Dub",
    desc: "Watch in your preferred language — subtitled or dubbed — with automatic source switching.",
  },
  {
    icon: <Shield className="w-5 h-5 text-accent" />,
    title: "Free Forever",
    desc: "Animeastral is 100% free. No paywalls, no subscriptions, no credit cards.",
  },
  {
    icon: <Film className="w-5 h-5 text-accent" />,
    title: "Movies Too",
    desc: "Not just series — browse and watch anime movies and live-action films in one place.",
  },
];

export default function FrontPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Minimal top bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(0_0%_4%/0.95)] backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Animeastral" className="w-7 h-7 rounded object-cover" />
            <span className="font-bold text-foreground tracking-tight text-base">Animeastral</span>
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-accent/20"
          >
            Go to Homepage <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-14 overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, hsl(var(--accent) / 0.18) 0%, transparent 65%)",
          }}
        />
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-accent/10 animate-pulse"
              style={{
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                left: `${(i * 8.3) % 100}%`,
                top: `${(i * 13.7) % 100}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${2 + (i % 3)}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6 max-w-4xl mx-auto">
          {/* Logo mark */}
          <div className="relative mb-6">
            <div className="absolute inset-0 blur-2xl bg-accent/30 rounded-full scale-150" />
            <img
              src="/logo.png"
              alt="Animeastral"
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-accent/40 shadow-2xl"
            />
          </div>

          {/* Splash mascot trio */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {["/splash-yoho.png", "/splash-shy.png", "/splash-flustered.png"].map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-border shadow-lg"
                style={{
                  transform: i === 1 ? "scale(1.2)" : "scale(1)",
                  zIndex: i === 1 ? 10 : 1,
                }}
              />
            ))}
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-4 uppercase tracking-widest">
            <Tv className="w-3 h-3" /> Watch Anime Online for FREE
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-foreground leading-tight mb-4 tracking-tight">
            Animeastral
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mb-3 leading-relaxed">
            Your free gateway to thousands of anime, movies, and more — streamed instantly, no subscription required.
          </p>
          <p className="text-sm text-accent/80 font-medium italic mb-8">
            Your fictional stories hub.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mb-10">
            <Link
              href="/home"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-base hover:bg-accent/90 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-accent/25"
            >
              <Play className="w-4 h-4 fill-accent-foreground" />
              Start Watching
            </Link>
            <Link
              href="/anime"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-muted border border-border text-foreground font-semibold text-base hover:bg-muted/70 transition-all hover:scale-105 active:scale-95"
            >
              Browse Library
            </Link>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {EXPLORE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-4 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-muted transition-all hover:scale-105"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground/40">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-muted-foreground/40 to-transparent animate-pulse" />
        </div>
      </section>

      {/* ── What is Animeastral ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">What is Animeastral?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Animeastral is a top-tier free anime streaming site that lets you watch anime in HD quality without any credit card or sign-up. Search for any title, pick an episode, and watch — it's that simple. Sub, Dub, Movies, OVAs — we've got it all.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 p-5 rounded-2xl bg-card border border-border hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-bold text-foreground text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Start Exploring ── */}
      <section className="bg-card border-t border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Start exploring now!</h2>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {[
              { label: "Browse Anime", href: "/anime" },
              { label: "Trending This Season", href: "/home" },
              { label: "Latest Movies", href: "/movies" },
              { label: "Top Rankings", href: "/rankings" },
              { label: "Anime Wiki", href: "/wiki" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-4 py-2 rounded-xl border border-border bg-muted text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-muted/70 transition-all hover:scale-105 active:scale-95"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Disclaimer / About ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-4">
            <Shield className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <h2 className="text-lg font-bold text-foreground">Legal Disclaimer</h2>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Animeastral</strong> does not host, store, or own any of the anime, movies, or media content displayed or streamed on this website. All video content is sourced from third-party streaming providers and external services that are not affiliated with this site.
            </p>
            <p>
              We do not claim ownership of any anime, manga, or related intellectual property. All trademarks, characters, and content belong to their respective owners and studios (including but not limited to Toei Animation, Pierrot, Mappa, Studio Ghibli, etc.).
            </p>
            <p>
              Animeastral operates purely as an index and discovery platform, pointing users to publicly available third-party streams. If you are a rights holder and believe your content is being used improperly, please contact us for prompt removal.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {[
                "✓ Free of charge",
                "✓ No personal data stored",
                "✓ Third-party streams only",
                "✓ No content hosted on-site",
              ].map((item) => (
                <span
                  key={item}
                  className="px-3 py-1 rounded-full bg-muted border border-border text-xs font-medium text-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Star rating section ── */}
      <section className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-center">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <p className="text-muted-foreground text-sm mb-4">Loved by anime fans worldwide</p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm hover:bg-accent/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-accent/20"
          >
            <Play className="w-4 h-4 fill-accent-foreground" />
            Go to Homepage
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Animeastral" className="w-6 h-6 rounded object-cover" />
            <span className="text-sm font-bold text-foreground">Animeastral</span>
          </div>
          <p className="text-[11px] text-muted-foreground/60 max-w-md leading-relaxed">
            We do not own the anime rights. All content comes from third-party sources. For entertainment use only.
          </p>
          <p className="text-[10px] text-muted-foreground/40">
            © {new Date().getFullYear()} Animeastral
          </p>
        </div>
      </footer>
    </div>
  );
}
