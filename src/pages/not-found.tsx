import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center pt-14">
      {/* Mascot */}
      <img
        src="/splash-shy.png"
        alt="Lost mascot"
        className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-2 border-accent/40 shadow-lg mb-6 opacity-90"
      />

      {/* 404 number */}
      <div
        className="text-[120px] sm:text-[160px] font-black leading-none select-none mb-2"
        style={{
          color: "transparent",
          WebkitTextStroke: "2px hsl(var(--accent))",
          textShadow: "0 0 40px hsl(var(--accent) / 0.2)",
        }}
      >
        404
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-muted-foreground max-w-xs mb-8 leading-relaxed">
        Looks like this page got isekai'd to another world…
        we couldn't bring it back.
      </p>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
        >
          ← Back to Home
        </Link>
        <Link
          href="/anime"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-muted border border-border text-foreground font-semibold text-sm hover:bg-muted/70 transition-colors"
        >
          Browse Anime
        </Link>
      </div>

      {/* Decorative glow */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 100%, hsl(var(--accent) / 0.12), transparent 70%)",
        }}
      />
    </div>
  );
}
