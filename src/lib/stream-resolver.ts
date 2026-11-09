/** Resolve an embed's public HLS URL for browser downloads when the source permits it. */
export type StreamMode = "sub" | "dub";

export async function resolveStreamUrl(
  anilistId: string | number,
  episodeNumber: number,
  mode: StreamMode = "sub",
  signal?: AbortSignal,
): Promise<string> {
  const embedUrl = `https://megaplay.buzz/stream/ani/${encodeURIComponent(anilistId)}/${episodeNumber}/${mode}`;
  const worker = import.meta.env.VITE_CF_WORKER_URL as string | undefined;
  const proxies = [
    ...(worker ? [{ url: `${worker}?url=${encodeURIComponent(embedUrl)}`, json: false }] : []),
    { url: `https://corsproxy.io/?url=${encodeURIComponent(embedUrl)}`, json: false },
    { url: `https://api.allorigins.win/get?url=${encodeURIComponent(embedUrl)}`, json: true },
    { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(embedUrl)}`, json: false },
  ];
  for (const proxy of proxies) {
    if (signal?.aborted) throw new DOMException("Download cancelled", "AbortError");
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 8000);
    try {
      const response = await fetch(proxy.url, { signal: controller.signal });
      if (!response.ok) continue;
      const html = proxy.json ? (await response.json()).contents : await response.text();
      if (typeof html !== "string") continue;
      const file = /\bfile\s*:\s*["'`]([^"'`]+)["'`]/i.exec(html)?.[1];
      const fallback = /https?:\/\/[^\s"'`<>]+\.m3u8[^\s"'`<>]*/i.exec(html)?.[0];
      const found = file || fallback;
      if (found && /^https?:\/\//i.test(found)) return found;
    } catch {
      if (signal?.aborted) throw new DOMException("Download cancelled", "AbortError");
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
  throw new Error("Could not find a downloadable stream. The source or its browser-access proxy may be unavailable.");
}
