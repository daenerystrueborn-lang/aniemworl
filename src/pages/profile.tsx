import { useState, useRef } from "react";
import { BookOpen, Download, Film, LogIn, LogOut, Trash2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth, type LibraryEntry } from "@/lib/auth-context";
import { apiUrl } from "@/lib/api";

type AuthMode = "signin" | "register";

function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") await login(username, password);
      else await register(username, password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-1 bg-muted p-1 rounded-lg mb-2">
          {(["signin", "register"] as AuthMode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-1.5 rounded text-sm font-medium transition-all ${mode === m ? "bg-card text-foreground border border-border shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {m === "signin" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20 characters" autoComplete="username"
              className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "At least 6 characters" : ""}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-foreground text-background py-2 rounded text-sm font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50">
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_LABELS: Record<LibraryEntry["status"], string> = {
  watching: "Watching", reading: "Reading", completed: "Completed",
  "plan-to-watch": "Plan to Watch", "plan-to-read": "Plan to Read", dropped: "Dropped",
};

function LibrarySection({ entries, onRemove }: { entries: LibraryEntry[]; onRemove: (id: string, type: string) => void }) {
  if (entries.length === 0) return (
    <p className="text-xs text-muted-foreground text-center py-6">Nothing here yet — browse the Wiki to add titles.</p>
  );

  const byStatus = entries.reduce<Record<string, LibraryEntry[]>>((acc, e) => {
    const key = `${e.type}||${e.status}`;
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {Object.entries(byStatus).map(([key, items]) => {
        const [type, status] = key.split("||") as [LibraryEntry["type"], LibraryEntry["status"]];
        return (
          <div key={key}>
            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
              {type} · {STATUS_LABELS[status]}
            </p>
            <div className="space-y-1.5">
              {items.map((e) => (
                <div key={e.id} className="flex items-center justify-between bg-muted/40 border border-border/50 rounded-lg px-3 py-2">
                  <Link href={`/wiki/${e.id}`} className="text-sm text-foreground hover:text-accent transition-colors inline-flex items-center gap-1.5">
                    View #{e.id} <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </Link>
                  <button onClick={() => onRemove(e.id, e.type)}
                    className="p-1 text-muted-foreground hover:text-red-400 transition-colors" title="Remove">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ProfilePage() {
  const { token, username, pfp, library, logout, updatePfp, removeFromLibrary } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [pfpLoading, setPfpLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isSignedIn = !!token && !!username;

  async function handlePfpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setPfpLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch(apiUrl("/api/uploads/pfp"), {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json() as { url: string };
      await fetch(apiUrl("/api/auth/pfp"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pfp: url }),
      });
      updatePfp(apiUrl(url));
    } catch { /* ignore */ } finally {
      setPfpLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove(id: string, type: string) {
    if (!token) return;
    removeFromLibrary(id, type);
    await fetch(apiUrl(`/api/auth/library/${type}/${id}`), {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative w-20 h-20 shrink-0">
              <div className="w-20 h-20 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
                {pfp ? (
                  <img src={pfp} alt={username ?? "avatar"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-muted-foreground font-bold select-none">
                    {isSignedIn ? username![0].toUpperCase() : "?"}
                  </span>
                )}
              </div>
              {isSignedIn && (
                <>
                  <button onClick={() => fileRef.current?.click()} disabled={pfpLoading}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center hover:bg-accent/90 transition-colors border-2 border-background"
                    title="Change photo">
                    {pfpLoading ? "…" : "+"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePfpChange} />
                </>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground mb-1">{isSignedIn ? username : "Guest"}</h1>
              <p className="text-sm text-muted-foreground">
                {isSignedIn
                  ? `${library.length} item${library.length !== 1 ? "s" : ""} in library`
                  : "Sign in to track your watch history, saves, and downloads."}
              </p>
            </div>

            {isSignedIn ? (
              <button onClick={logout}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-border bg-card text-foreground text-sm font-semibold hover:bg-muted transition-colors shrink-0">
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            ) : (
              <button onClick={() => setAuthOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors shrink-0">
                <LogIn className="w-4 h-4" /> Sign In / Register
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {isSignedIn ? (
          <div className="space-y-8">
            <div>
              <h2 className="text-base font-bold text-foreground mb-4">Your Library</h2>
              <LibrarySection entries={library} onRemove={handleRemove} />
            </div>
            <div className="border-t border-border pt-8">
              <h2 className="text-base font-bold text-foreground mb-4">Explore AniVault</h2>
              <div className="flex flex-wrap gap-3">
                {[["Home","/"],["Wiki","/wiki"],["Rankings","/rankings"],["Downloads","/downloads"]].map(([l,h])=>(
                  <Link key={h} href={h} className="px-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:border-accent/40 hover:bg-muted transition-all">{l}</Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: <Film className="w-5 h-5 text-muted-foreground" />, title: "Watch List", desc: "Keep track of what you're watching, completed, and planning to watch.", action: <button onClick={() => setAuthOpen(true)} className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full hover:bg-accent/20 hover:text-accent transition-colors">Sign in to use</button> },
              { icon: <BookOpen className="w-5 h-5 text-muted-foreground" />, title: "Reading List", desc: "Track manga and novels you're reading or want to read.", action: <button onClick={() => setAuthOpen(true)} className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full hover:bg-accent/20 hover:text-accent transition-colors">Sign in to use</button> },
              { icon: <Download className="w-5 h-5 text-muted-foreground" />, title: "Downloads", desc: "Download manga chapters as PDF or novel chapters as TXT/PDF right now.", action: <Link href="/downloads" className="text-xs font-semibold text-accent hover:underline">Go to Downloads →</Link> },
            ].map(({ icon, title, desc, action }) => (
              <div key={title} className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">{icon}</div>
                <h3 className="font-semibold text-foreground text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                {action}
              </div>
            ))}
            <div className="sm:col-span-3 border-t border-border pt-8 mt-2">
              <h2 className="text-base font-bold text-foreground mb-4">Explore AniVault</h2>
              <div className="flex flex-wrap gap-3">
                {[["Home","/"],["Wiki","/wiki"],["Rankings","/rankings"],["Downloads","/downloads"]].map(([l,h])=>(
                  <Link key={h} href={h} className="px-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:border-accent/40 hover:bg-muted transition-all">{l}</Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
