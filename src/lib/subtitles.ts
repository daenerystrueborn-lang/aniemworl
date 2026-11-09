/** Prefer English, then the provider's default, then any available track. */
export function subtitleTrackIndex(tracks: { lang?: string; name?: string; default?: boolean }[]): number {
  const english = tracks.findIndex((track) => /^(en|eng)(-|$)/i.test(track.lang || "") || /english/i.test(track.name || ""));
  if (english >= 0) return english;
  const fallback = tracks.findIndex((track) => track.default);
  return fallback >= 0 ? fallback : tracks.length ? 0 : -1;
}

export interface SubtitleFile { url: string; lang: string; label: string; default: boolean }

/** Only use signed subtitle proxy links returned by the streaming server. */
export function subtitleFiles(value: unknown, base: string): SubtitleFile[] {
  if (!Array.isArray(value)) return [];
  const origin = new URL(base).origin;
  return value.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    if (typeof item.proxyUrl !== "string") return [];
    try {
      const url = new URL(item.proxyUrl, origin);
      if (url.origin !== origin || url.pathname !== "/api/proxy/subtitle") return [];
      return [{ url: url.href, lang: typeof item.lang === "string" && item.lang ? item.lang : "en", label: typeof item.label === "string" && item.label ? item.label : "Subtitles", default: item.default === true }];
    } catch { return []; }
  });
}

/** Browsers require WebVTT. Convert SRT timing lines while preserving the text. */
export function toWebVtt(input: string): string {
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (/^WEBVTT(?:[ \t\n]|$)/.test(text)) return `${text}\n`;
  if (!/\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/.test(text)) throw new Error("Unsupported subtitle format.");
  return `WEBVTT\n\n${text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}\n`;
}

/** A missing track declaration does not rule out burned-in subtitles. */
export function manifestHasSubtitleTracks(text: string): boolean {
  return text.split(/\r?\n/).some((line) => /^#EXT-X-MEDIA:/i.test(line) && /(?:^|[:,])TYPE=(?:SUBTITLES|CLOSED-CAPTIONS)(?:,|$)/i.test(line));
}
