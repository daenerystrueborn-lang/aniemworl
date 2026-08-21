import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, AlertCircle } from "lucide-react";
import { parseOAuthCallback } from "@/lib/anilist-auth";
import { acceptOAuthToken } from "@/lib/auth-context";

// AniList redirects here with #access_token=... after the user approves login.
// This page just needs to exist at /oauth (matching the Redirect URL set in
// the AniList developer app settings), grab the token, store it, then bounce
// the user back to where they were (or /profile).
export default function OAuthCallbackPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = parseOAuthCallback();
    if (token) {
      acceptOAuthToken(token);
      const returnTo = sessionStorage.getItem("post-login-redirect") || "/profile";
      sessionStorage.removeItem("post-login-redirect");
      setLocation(returnTo, { replace: true });
    } else {
      setError(true);
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      {error ? (
        <>
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-muted-foreground">Login failed — no token received.</p>
          <a href="/profile" className="text-accent text-sm hover:underline">← Back to profile</a>
        </>
      ) : (
        <>
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </>
      )}
    </div>
  );
}
