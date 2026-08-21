import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-[hsl(0_0%_3%)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Animeastral" className="w-7 h-7 rounded object-cover" />
            <span className="font-bold text-foreground tracking-tight">Animeastral</span>
          </div>

          {/* Quick nav */}
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {[
              { label: "Home", href: "/home" },
              { label: "Browse", href: "/anime" },
              { label: "Movies", href: "/movies" },
              { label: "Rankings", href: "/rankings" },
              { label: "Wiki", href: "/wiki" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-border pt-5 space-y-2">
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-3xl">
            <strong className="text-muted-foreground/80">Disclaimer:</strong> Animeastral does not store, host, or own any of the anime, movies, or content shown on this site. All media is streamed from third-party providers. We do not claim ownership of any anime, characters, or intellectual property — all rights belong to their respective owners and studios. Content is provided for entertainment purposes only.
          </p>
          <p className="text-[10px] text-muted-foreground/40">
            © {new Date().getFullYear()} Animeastral · All content rights belong to respective owners · Third-party streams only
          </p>
        </div>
      </div>
    </footer>
  );
}
