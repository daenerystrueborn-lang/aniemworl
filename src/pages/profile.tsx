import { BookOpen, Download, Film, LogIn } from "lucide-react";
import { Link } from "wouter";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header band */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar placeholder */}
            <div className="w-20 h-20 rounded-full bg-muted border-2 border-border flex items-center justify-center shrink-0">
              <span className="text-3xl text-muted-foreground font-bold select-none">?</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground mb-1">Guest</h1>
              <p className="text-sm text-muted-foreground">Sign in to track your watch history, saves, and downloads.</p>
            </div>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors shrink-0">
              <LogIn className="w-4 h-4" /> Sign In / Register
            </button>
          </div>
        </div>
      </div>

      {/* Content — not signed in state */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid sm:grid-cols-3 gap-6">
          {/* Watch List */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Film className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">Watch List</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Keep track of what you're watching, completed, and planning to watch.
            </p>
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">Sign in to use</span>
          </div>

          {/* Reading List */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">Reading List</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Track manga and novels you're reading or want to read.
            </p>
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">Sign in to use</span>
          </div>

          {/* Downloads */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Download className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">Downloads</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Download manga chapters as PDF or novel chapters as TXT/PDF right now.
            </p>
            <Link
              href="/downloads"
              className="text-xs font-semibold text-accent hover:underline"
            >
              Go to Downloads →
            </Link>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-12 border-t border-border pt-8">
          <h2 className="text-base font-bold text-foreground mb-4">Explore AniVault</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="px-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:border-accent/40 hover:bg-muted transition-all">Home</Link>
            <Link href="/wiki" className="px-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:border-accent/40 hover:bg-muted transition-all">Wiki</Link>
            <Link href="/rankings" className="px-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:border-accent/40 hover:bg-muted transition-all">Rankings</Link>
            <Link href="/downloads" className="px-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:border-accent/40 hover:bg-muted transition-all">Downloads</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
