// Base URL for the backend API server (deployed separately from this site).
// Set VITE_API_URL in your Vercel project's environment variables to your
// backend's public URL, e.g. https://your-app.up.railway.app
// Falls back to relative paths (same-origin) if not set, for local dev
// where frontend + backend run together.
const API_BASE_URL: string = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
