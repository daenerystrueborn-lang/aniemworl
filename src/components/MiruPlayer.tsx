import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { downloadHls, fetchQualities, formatSpeed, type DownloadProgress } from "@/lib/download";
import { getMiruSession, type MiruSession } from "@/lib/mirudl";

export default function MiruPlayer({ episodeId, episodeNumber, title, onPrev, onNext, hasPrev, hasNext }: {
  episodeId?: string; episodeNumber: number; title: string; onPrev: () => void; onNext: () => void; hasPrev: boolean; hasNext: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const download = useRef<AbortController | null>(null);
  const resumeAt = useRef(0);
  const [track, setTrack] = useState<"sub" | "dub">("sub");
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
    const fail = (message: string) => { if (!controller.signal.aborted) { setLoading(false); setError(message); } };
    getMiruSession(episodeId, track, quality, controller.signal).then(async (result) => {
      if (controller.signal.aborted) return;
      setSession(result);
      const src = quality === "auto" ? result.proxyHlsUrl : result.proxySelectedHlsUrl;
      const play = () => {
        if (resumeAt.current > 0) { try { el.currentTime = resumeAt.current; } catch { /* Not seekable yet */ } resumeAt.current = 0; }
        setLoading(false);
        void el.play().catch(() => {});
      };
      const { default: Hls } = await import("hls.js");
      if (controller.signal.aborted) return;
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.on(Hls.Events.MANIFEST_PARSED, play);
        hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) fail(`Playback failed: ${data.details}. Try another quality or source.`); });
        hls.loadSource(src); hls.attachMedia(el);
      } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = src; el.addEventListener("loadedmetadata", play, { once: true });
        removeMetadataListener = () => el.removeEventListener("loadedmetadata", play);
        el.load();
      } else fail("This browser does not support HLS video.");
    }).catch((err) => { if (!controller.signal.aborted) fail(err instanceof Error ? err.message : "Could not load the episode."); });
    return () => { controller.abort(); removeMetadataListener(); hls?.destroy(); el.pause(); el.removeAttribute("src"); el.load(); };
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
        <select id="miru-track" value={track} onChange={(e) => { cancelDownload(); resumeAt.current = 0; setTrack(e.target.value as "sub" | "dub"); }} className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground"><option value="sub">Sub</option><option value="dub">Dub</option></select>
        <label htmlFor="miru-quality" className="text-xs text-muted-foreground">Quality</label>
        <select id="miru-quality" value={quality} onChange={(e) => { cancelDownload(); resumeAt.current = video.current?.currentTime || 0; setQuality(e.target.value); }} className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground">
          <option value="auto">Auto</option><option value="highest">Highest available</option>
          {[...new Set(["1080p", "720p", "480p", "360p", ...(quality !== "auto" && quality !== "highest" ? [quality] : []), ...(session?.variants.map((v) => v.label) || [])])].map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
        {session && <span className="text-xs text-muted-foreground">{session.selectedQuality}</span>}
      </div>
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-border">
        <video ref={video} controls playsInline className="w-full h-full" onEnded={() => { if (autoNext && hasNext) onNext(); }} />
        {loading && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2 text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin" /><span className="text-xs">Loading MiruDL episode...</span></div>}
        {!episodeId && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground px-4 text-center">Select a matching MiruDL title and episode to play.</div>}
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
