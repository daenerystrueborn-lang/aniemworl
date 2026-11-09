/** Browser-side HLS downloads. Sources must permit cross-origin requests. */
export interface QualityOption {
  label: string;
  url: string;
  bandwidth: number;
}

export interface DownloadProgress {
  percent: number;
  done: number;
  total: number;
  bytesPerSecond: number;
}

function playlistLines(text: string): string[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim());
  if (lines[0] !== "#EXTM3U") throw new Error("The source did not return a valid video playlist.");
  return lines;
}

async function getResponse(url: string, signal?: AbortSignal): Promise<Response> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`The video source returned HTTP ${response.status}.`);
    return response;
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Download cancelled", "AbortError");
    if (error instanceof TypeError) throw new Error("The video source blocked browser access. This episode cannot be downloaded without a compatible server.");
    throw error;
  }
}

export async function fetchQualities(url: string, signal?: AbortSignal): Promise<QualityOption[]> {
  const lines = playlistLines(await (await getResponse(url, signal)).text());
  if (lines.some((line) => line.startsWith("#EXT-X-SESSION-KEY:") && !/(?:^|,)METHOD=NONE(?:,|$)/.test(line.slice(19)))) {
    throw new Error("Encrypted video downloads are not supported in the browser.");
  }
  const variants: QualityOption[] = [];
  let pending: string | null = null;
  const externalAudio = new Set<string>();
  for (const line of lines) {
    if (line.startsWith("#EXT-X-MEDIA:") && /(?:^|,)TYPE=AUDIO(?:,|$)/.test(line.slice(13)) && /(?:^|,)URI=/.test(line.slice(13))) {
      const group = /(?:^|,)GROUP-ID="([^"]+)"/.exec(line.slice(13));
      if (group) externalAudio.add(group[1]);
    }
  }
  for (const line of lines) {
    if (line.startsWith("#EXT-X-STREAM-INF:")) pending = line;
    else if (pending && line && !line.startsWith("#")) {
      const audioGroup = /(?:^|,)AUDIO="([^"]+)"/.exec(pending.slice(18))?.[1];
      if (!audioGroup || !externalAudio.has(audioGroup)) {
        const bandwidth = Number(/(?:^|,)BANDWIDTH=(\d+)/.exec(pending.slice(18))?.[1] || 0);
        const height = Number(/RESOLUTION=\d+x(\d+)/i.exec(pending)?.[1] || 0);
        variants.push({ label: height ? `${height}p` : bandwidth ? `${(bandwidth / 1_000_000).toFixed(1)} Mbps` : "Available quality", url: new URL(line, url).href, bandwidth });
      }
      pending = null;
    }
  }
  if (lines.some((line) => line.startsWith("#EXT-X-STREAM-INF:"))) {
    if (!variants.length) throw new Error("No downloadable quality is available. Separate audio tracks are not supported in the browser.");
    return variants.sort((a, b) => b.bandwidth - a.bandwidth);
  }
  if (lines.some((line) => line.startsWith("#EXTINF:"))) return [{ label: "Available quality", url, bandwidth: 0 }];
  throw new Error("No downloadable video was found in this playlist.");
}

export function parseMediaPlaylist(text: string, baseUrl: string): { initUrl: string | null; segments: string[] } {
  const lines = playlistLines(text);
  if (!lines.includes("#EXT-X-ENDLIST")) throw new Error("Live or incomplete playlists cannot be downloaded.");
  let initUrl: string | null = null;
  const segments: string[] = [];
  for (const line of lines) {
    if (line.startsWith("#EXT-X-KEY:") && !/(?:^|,)METHOD=NONE(?:,|$)/.test(line.slice(11))) throw new Error("Encrypted video downloads are not supported in the browser.");
    if (line.startsWith("#EXT-X-BYTERANGE:") || line.startsWith("#EXT-X-DISCONTINUITY") || line.startsWith("#EXT-X-GAP")) throw new Error("This video uses a playlist format that cannot be safely downloaded in the browser.");
    if (line.startsWith("#EXT-X-MAP:")) {
      if (initUrl || segments.length || line.includes("BYTERANGE=")) throw new Error("This video uses an unsupported initialization format.");
      const uri = /(?:^|,)URI="([^"]+)"/.exec(line.slice(11))?.[1];
      if (!uri) throw new Error("The video initialization segment is missing.");
      initUrl = new URL(uri, baseUrl).href;
    } else if (line && !line.startsWith("#")) {
      segments.push(new URL(line, baseUrl).href);
    }
  }
  if (!segments.length) throw new Error("No video segments were found.");
  return { initUrl, segments };
}

// AniFam-derived image-prefixed MPEG-TS segments must be unwrapped before saving.
export function unwrapSegment(data: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  const isImage = (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) ||
    (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) ||
    (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) ||
    (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46) ||
    (data[0] === 0x42 && data[1] === 0x4d);
  if (!isImage) return data;
  for (let i = 0; i + 376 < Math.min(data.length, 65536); i++) {
    if (data[i] === 0x47 && data[i + 188] === 0x47 && data[i + 376] === 0x47) return data.subarray(i);
  }
  throw new Error("The video source returned an unsupported image segment.");
}

export async function downloadHls(
  mediaUrl: string,
  filename: string,
  onProgress: (progress: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const { initUrl, segments } = parseMediaPlaylist(await (await getResponse(mediaUrl, signal)).text(), mediaUrl);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) controller.abort();
  try {
    const getBytes = async (url: string): Promise<Uint8Array<ArrayBuffer>> => {
      // Retry transient failures without retrying browser/CORS or authentication errors.
      for (let attempt = 0; ; attempt++) {
        try {
          const response = await getResponse(url, controller.signal);
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (!bytes.length) throw new Error("The video source returned an empty segment.");
          return bytes;
        } catch (error) {
          if (controller.signal.aborted || attempt >= 2 || !(error instanceof Error) || !/HTTP (429|5\d\d)/.test(error.message)) throw error;
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => { controller.signal.removeEventListener("abort", abort); resolve(); }, (attempt + 1) * 400);
            const abort = () => { clearTimeout(timer); reject(new DOMException("Download cancelled", "AbortError")); };
            controller.signal.addEventListener("abort", abort, { once: true });
          });
        }
      }
    };
    const parts: Uint8Array<ArrayBuffer>[] = new Array(segments.length);
    const init = initUrl ? await getBytes(initUrl) : null;
    if (init && (init.length < 8 || !["ftyp", "moov", "free"].includes(String.fromCharCode(...init.subarray(4, 8))))) {
      throw new Error("The video initialization segment is not a supported MP4 file.");
    }
    let next = 0, done = 0, bytes = init?.byteLength ?? 0;
    const start = performance.now();
    const workers = Array.from({ length: Math.min(4, segments.length) }, async () => {
      while (next < segments.length) {
        const index = next++;
        const data = await getBytes(segments[index]);
        const segment = initUrl ? data : unwrapSegment(data);
        if (initUrl) {
          const box = segment.length >= 8 ? String.fromCharCode(...segment.subarray(4, 8)) : "";
          if (!["styp", "moof", "sidx", "emsg", "prft", "free"].includes(box)) throw new Error("The source returned an invalid MP4 segment.");
        } else if (segment.length < 377 || segment[0] !== 0x47 || segment[188] !== 0x47 || segment[376] !== 0x47) {
          throw new Error("The source returned an invalid or unsupported video segment.");
        }
        parts[index] = segment;
        bytes += segment.byteLength;
        if (bytes > 1024 * 1024 * 1024) throw new Error("This download is too large for browser memory. A download server is needed.");
        done++;
        onProgress({ percent: Math.floor(done * 100 / segments.length), done, total: segments.length, bytesPerSecond: Math.round(bytes / Math.max((performance.now() - start) / 1000, 0.1)) });
      }
    });
    await Promise.all(workers);
    if (controller.signal.aborted) throw new DOMException("Download cancelled", "AbortError");
    const blob = new Blob(init ? [init, ...parts] : parts, { type: init ? "video/mp4" : "video/mp2t" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")}.${init ? "mp4" : "ts"}`;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
}

export function formatSpeed(bps: number): string {
  return bps >= 1_000_000 ? `${(bps / 1_000_000).toFixed(1)} MB/s` : `${Math.round(bps / 1_000)} KB/s`;
}
