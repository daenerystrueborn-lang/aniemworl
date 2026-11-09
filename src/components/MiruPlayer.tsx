import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { downloadHls, fetchQualities, formatSpeed, type DownloadProgress } from "@/lib/download";
import { getMiruSession, type MiruSession } from "@/lib/mirudl";

export default function MiruPlayer({ episodeId, episodeNumber, title, onPrev, onNext, hasPrev, hasNext, track, onTrackChange, onFailure }: {
  episodeId?: string; episodeNumber: number; title: string; onPrev: () => void; onNext: () => void; hasPrev: boolean; hasNext: boolean;
  track: "sub" | "dub"; onTrackChange: (track: "sub" | "dub") => void; onFailure: (message: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const download = useRef<AbortController | null>(null);
  const resumeAt = useRef(0);
  const failureRef = useRef(onFailure);
  failureRef.current = onFailure;
  const [quality, setQuality] = useState("auto");
  const [session, setSession] = useState<MiruSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dlError, setDlError] = useState("");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [autoNext, setAutoNext] = useState(true);

  useEffect(() => () => { download.current?.abort(); }, []);
  useEffect(() => { download.current?.abort(); setProgress(null); setDownloading(false); setDlError(""); resumeAt.current = 0; }, [episodeId]);

  useEffect(() => {
    const controller = new AbortController();
    let hls: import("hls.js").default | null = null;
    let removeMetadataListener = () => {};
    const el = video.current;
    setSession(null); setError("");
    if (!episodeId || !el) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    let failed = false;
    let ready = false;
    let timer: ReturnType<typeof setTimeout>;
    const fail = (message: string) => {
      if (controller.signal.aborted || failed) return;
      failed = true;
      clearTimeout(timer);
      setLoading(false);
      setError(message);
      failureRef.current(message);
    };
    const onReady = () => {
      if (controller.signal.aborted || failed) return;
      ready = true;
      clearTimeout(timer);
      setLoading(false);
    };
    const onMediaError = () => { if (el.error) fail("Server 1 could not play this episode."); };
    el.addEventListener("canplay", onReady);
    el.addEventListener("error", onMediaError);
    timer = setTimeout(() => { if (!ready) fail("Server 1 took too long to load."); }, 30_000);
    getMiruSession(episodeId, track, quality, controller.signal).then(async (result) => {
      if (controller.signal.aborted || failed) return;
      setSession(result);
      const src = quality === "auto" ? result.proxyHlsUrl : result.proxySelectedHlsUrl;
      const play = () => {
        if (controller.signal.aborted || failed) return;
        if (resumeAt.current > 0) { try { el.currentTime = resumeAt.current; } catch { /* Not seekable yet */ } resumeAt.current = 0; }
        // Autoplay can be blocked by the browser; that is not a server failure.
        void el.play().catch(() => {});
      };
      const { default: Hls } = await import("hls.js");
      if (controller.signal.aborted || failed) return;
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.on(Hls.Events.MANIFEST_PARSED, play);
        hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) fail("Server 1 could not play this episode."); });
        hls.loadSource(src); hls.attachMedia(el);
      } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = src; el.addEventListener("loadedmetadata", play, { once: true });
        removeMetadataListener = () => el.removeEventListener("loadedmetadata", play);
        el.load();
      } else fail("This browser does not support Server 1 playback.");
    }).catch((err) => { if (!controller.signal.aborted) fail(err instanceof Error ? err.message : "Server 1 could not load the episode."); });
    return () => {
      controller.abort(); clearTimeout(timer); removeMetadataListener();
      el.removeEventListener("canplay", onReady); el.removeEventListener("error", onMediaError);
      hls?.destroy(); el.pause(); el.removeAttribute("src"); el.load();
    };
  }, [episodeId, track, quality]);

  function cancelDownload() {
    download.current?.abort();
    download.current = null;
    setDownloading(false);
    setProgress(null);
    setDlError("");
  }

  async function browserDownload() {
    if (!session) return;
    const current = new AbortController(); download.current?.abort(); download.current = current;
    setDownloading(true); setProgress(null); setDlError("");
    try {
      const selected = quality === "auto" ? session.proxyHlsUrl : session.proxySelectedHlsUrl;
      const qualities = await fetchQualities(selected, current.signal);
      await downloadHls(qualities[0].url, `${title} - Episode ${episodeNumber} - ${track}`, (p) => { if (!current.signal.aborted) setProgress(p); }, current.signal);
      if (!current.signal.aborted) setDlError("Download ready. Your browser will save the file.");
    } catch (err) {
      if (!current.signal.aborted) setDlError(err instanceof Error ? err.message : "Download failed.");
    } finally { if (download.current === current) { download.current = null; setDownloading(false); } }
  }
  const serverDownload = session ? new URL(session.downloadUrl) : null;
  if (serverDownload) { serverDownload.searchParams.set("quality", quality); serverDownload.searchParams.set("title", `${title} - Episode ${episodeNumber}`); }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <label htmlFor="miru-track" className="text-xs text-muted-foreground">Language</label>
        <select id="miru-track" value={track} onChange={(e) => { cancelDownload(); resumeAt.current = 0; onTrackChange(e.target.value as "sub" | "dub"); }} className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground"><option value="sub">Sub</option><option value="dub">Dub</option></select>
        <label htmlFor="miru-quality" className="text-xs text-muted-foreground">Quality</label>
        <select id="miru-quality" value={quality} onChange={(e) => { cancelDownload(); resumeAt.current = video.current?.currentTime || 0; setQuality(e.target.value); }} className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground">
          <option value="auto">Auto</option><option value="highest">Highest available</option>
          {[...new Set(["1080p", "720p", "480p", "360p", ...(quality !== "auto" && quality !== "highest" ? [quality] : []), ...(session?.variants.map((v) => v.label) || [])])].map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
        {session && <span className="text-xs text-muted-foreground">{session.selectedQuality}</span>}
      </div>
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-border">
        <video ref={video} controls playsInline preload="auto" className="w-full h-full" onEnded={() => { if (autoNext && hasNext) onNext(); }} />
        {loading && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2 text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin" /><span className="text-xs">Loading Server 1...</span></div>}
        {!episodeId && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground px-4 text-center">Select a matching title and episode to play.</div>}
      </div>
      {error && <p role="alert" className="text-sm text-red-400 flex gap-2 items-start"><AlertCircle className="w-4 h-4 shrink-0" />{error}</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={onPrev} disabled={!hasPrev} className="rounded-lg border border-border bg-card px-3 py-2 disabled:opacity-40">Previous</button>
        <button type="button" onClick={onNext} disabled={!hasNext} className="rounded-lg border border-border bg-card px-3 py-2 disabled:opacity-40">Next</button>
        <label className="flex items-center gap-1 text-muted-foreground"><input type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} /> Auto next</label>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {serverDownload && !error ? <a href={serverDownload.href} className="rounded-lg bg-accent text-accent-foreground px-3 py-2 font-semibold">Download via server</a> : <button disabled className="rounded-lg bg-muted px-3 py-2 opacity-40">Download via server</button>}
        {downloading ? <button onClick={cancelDownload} className="rounded-lg border border-border px-3 py-2">Cancel download</button> : <button onClick={browserDownload} disabled={!session || !!error} className="rounded-lg border border-border bg-card px-3 py-2 disabled:opacity-40">Download in browser</button>}
      </div>
      {downloading && <div role="status" className="space-y-1 text-xs text-muted-foreground"><p>{progress ? `${progress.percent}% (${progress.done}/${progress.total} segments) · ${formatSpeed(progress.bytesPerSecond)}` : "Preparing download..."}</p><progress className="w-full h-2 accent-accent" value={progress?.percent || 0} max={100} /></div>}
      {dlError && <p role="status" className="text-xs text-muted-foreground">{dlError}</p>}
    </div>
  );
}
