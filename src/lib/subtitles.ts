/** Prefer English, then the provider's default, then any available track. */
export function subtitleTrackIndex(tracks: { lang?: string; name?: string; default?: boolean }[]): number {
  const english = tracks.findIndex((track) => /^(en|eng)(-|$)/i.test(track.lang || "") || /english/i.test(track.name || ""));
  if (english >= 0) return english;
  const fallback = tracks.findIndex((track) => track.default);
  return fallback >= 0 ? fallback : tracks.length ? 0 : -1;
}
