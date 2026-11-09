import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { getMiruSession, type MiruSession } from "@/lib/mirudl";
import { subtitleTrackIndex, toWebVtt, manifestHasSubtitleTracks, type SubtitleFile } from "@/lib/subtitles";
import { resolveRenderPlayback } from "@/lib/render-download";

export default function MiruPlayer({ episodeId, episodeNumber, title, onPrev, onNext, hasPrev, hasNext, track, onTrackChange, onFailure, quality, onQualityChange, onDownload, downloading, onCancelDownload, animeId, malId, titles }: {
  animeId: string; malId: number | null; titles: string[];
  episodeId?: string; episodeNumber: number; title: string; onPrev: () => void; onNext: () => void; hasPrev: boolean; hasNext: boolean;
  quality: string; onQualityChange: (quality: string) => void; onDownload: () => void; downloading: boolean; onCancelDownload: () => void;
  track: "sub" | "dub"; onTrackChange: (track: "sub" | "dub") => void; onFailure: (message: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const resumeAt = useRef(0);
  const subtitleLookup = useRef<AbortController | null>(null);
  const skipAutoSubtitleLookup = useRef(false);
  const failureRef = useRef(onFailure);
  failureRef.current = onFailure;
  const [session, setSession] = useState<MiruSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoNext, setAutoNext] = useState(true);
  const [alternate, setAlternate] = useState<{ animeId: string; episodeNumber: number; url: string; subtitles: SubtitleFile[] } | null>(null);
  const [searchingSubtitles, setSearchingSubtitles] = useState(false);
  const [subtitleMessage, setSubtitleMessage] = useState("");
  const [fileMessage, setFileMessage] = useState("");
  const activeAlternate = track === "sub" && alternate?.animeId === animeId && alternate.episodeNumber === episodeNumber ? alternate : null;
  useEffect(() => {
    skipAutoSubtitleLookup.current = false;
    setAlternate(null); setSubtitleMessage(""); setSearchingSubtitles(false);
    return () => { subtitleLookup.current?.abort(); subtitleLookup.current = null; };
  }, [animeId, episodeNumber, track]);

  async function findSubtitleSource() {
    subtitleLookup.current?.abort();
    const request = new AbortController(); subtitleLookup.current = request;
    setSearchingSubtitles(true); setSubtitleMessage("");
    try {
      const result = await resolveRenderPlayback({ animeId, malId, titles, episodeNumber, track: "sub", signal: request.signal });
      if (!result.subtitles.length) throw new Error("No separate subtitle files were provided by the alternate source.");
      if (!request.signal.aborted) {
        resumeAt.current = 0;
        setAlternate({ animeId, episodeNumber, ...result });
        setSubtitleMessage("Using an alternate stream for its subtitles. Playback starts from the beginning.");
      }
    } catch {
      if (!request.signal.aborted) setSubtitleMessage("Could not find a matching stream with subtitle files. Try Server 2 or another episode.");
    } finally {
      if (subtitleLookup.current === request) { subtitleLookup.current = null; setSearchingSubtitles(false); }
    }
  }
  useEffect(() => { resumeAt.current = 0; }, [episodeId]);

  useEffect(() => {
    const controller = new AbortController();
    let hls: import("hls.js").default | null = null;
    let removeMetadataListener = () => {};
    const el = video.current;
    setSession(null); setError(""); setFileMessage("");
    const attached: HTMLTrackElement[] = [];
    const objectUrls: string[] = [];
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
      if (activeAlternate) {
        skipAutoSubtitleLookup.current = true;
        setAlternate(null);
        setSubtitleMessage("The alternate stream could not play. Returned to Server 1.");
      } else {
        setError(message);
        failureRef.current(message);
      }
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
    const getSession = async (): Promise<MiruSession | null> => {
      if (activeAlternate) return { proxyHlsUrl: activeAlternate.url, proxySelectedHlsUrl: activeAlternate.url, downloadUrl: "", variants: [], selectedQuality: "Auto", subtitles: activeAlternate.subtitles };
      const original = await getMiruSession(episodeId, track, quality, controller.signal);
      if (track !== "sub" || original.subtitles.length || skipAutoSubtitleLookup.current) return original;
      skipAutoSubtitleLookup.current = true;
      // Check the master before looking elsewhere. A source may also have burned-in subtitles.
      try {
        const manifest = await fetch(original.proxyHlsUrl, { signal: controller.signal });
        if (!manifest.ok || manifestHasSubtitleTracks(await manifest.text())) return original;
      } catch { return original; }
      if (controller.signal.aborted) return null;
      const lookup = new AbortController();
      const abortLookup = () => lookup.abort();
      controller.signal.addEventListener("abort", abortLookup, { once: true });
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const candidate = await Promise.race([
          resolveRenderPlayback({ animeId, malId, titles, episodeNumber, track: "sub", signal: lookup.signal }),
          new Promise<null>((resolve) => { timer = setTimeout(() => { resolve(null); lookup.abort(); }, 7000); }),
        ]);
        if (controller.signal.aborted) return null;
        if (candidate?.subtitles.length) {
          setAlternate({ animeId, episodeNumber, ...candidate });
          setSubtitleMessage("Using a matching alternate stream with subtitles.");
          return null;
        }
      } catch { /* Keep the original stream when no verified alternate is available. */ }
      finally { if (timer) clearTimeout(timer); controller.signal.removeEventListener("abort", abortLookup); lookup.abort(); }
      if (!controller.signal.aborted) setSubtitleMessage("No selectable subtitle track was found. The video may have subtitles burned in. Try the subtitle source or Server 2 if needed.");
      return original;
    };
    getSession().then(async (result) => {
      if (!result || controller.signal.aborted || failed) return;
      setSession(result);
      const src = result.proxyHlsUrl;
      if (track === "sub" && result.subtitles.length) {
        const selected = subtitleTrackIndex(result.subtitles.map((item) => ({ lang: item.lang, name: item.label, default: item.default })));
        // Fetch through the server's signed proxy and normalize SRT to WebVTT.
        void Promise.allSettled(result.subtitles.map(async (item, index) => {
          const response = await fetch(item.url, { signal: controller.signal });
          if (!response.ok) throw new Error("Subtitle fetch failed");
          const vtt = toWebVtt(await response.text());
          if (controller.signal.aborted) return;
          const objectUrl = URL.createObjectURL(new Blob([vtt], { type: "text/vtt" }));
          objectUrls.push(objectUrl);
          const element = document.createElement("track");
          element.kind = "subtitles"; element.label = item.label; element.srclang = item.lang;
          element.src = objectUrl; element.default = index === selected;
          el.appendChild(element); attached.push(element);
          if (index === selected) element.track.mode = "showing";
        })).then((results) => {
          if (controller.signal.aborted) return;
          if (results[selected]?.status === "rejected") setFileMessage("The subtitle file could not be loaded. Try another source.");
        });
      }
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
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (quality !== "auto") {
            const levels = hls?.levels || [];
            const target = quality === "highest" ? Math.max(...levels.map((level) => level.height)) : Number.parseInt(activeAlternate ? quality : result.selectedQuality, 10);
            const index = levels.findIndex((level) => level.height === target);
            if (hls && index >= 0) hls.currentLevel = index;
          }
          play();
        });
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_event, data) => {
          if (!hls || track !== "sub" || result.subtitles.length || !data.subtitleTracks.length) return;
          hls.subtitleTrack = subtitleTrackIndex(data.subtitleTracks);
          hls.subtitleDisplay = true;
        });
        hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) fail("Server 1 could not play this episode."); });
        hls.loadSource(src); hls.attachMedia(el);
      } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
        const showSubtitles = () => {
          if (track !== "sub") return;
          const tracks = Array.from(el.textTracks).filter((item) => item.kind === "subtitles" || item.kind === "captions");
          const selected = tracks.find((item) => /^(en|eng)(-|$)/i.test(item.language)) || tracks[0];
          if (selected) selected.mode = "showing";
        };
        el.textTracks.addEventListener("addtrack", showSubtitles);
        el.src = src; el.addEventListener("loadedmetadata", play, { once: true });
        el.addEventListener("loadedmetadata", showSubtitles, { once: true });
        removeMetadataListener = () => { el.removeEventListener("loadedmetadata", play); el.removeEventListener("loadedmetadata", showSubtitles); el.textTracks.removeEventListener("addtrack", showSubtitles); };
        el.load();
      } else fail("This browser does not support Server 1 playback.");
    }).catch((err) => { if (!controller.signal.aborted) fail(err instanceof Error ? err.message : "Server 1 could not load the episode."); });
    return () => {
      controller.abort(); clearTimeout(timer); removeMetadataListener();
      el.removeEventListener("canplay", onReady); el.removeEventListener("error", onMediaError);
      hls?.destroy(); attached.forEach((element) => element.remove()); objectUrls.forEach((url) => URL.revokeObjectURL(url));
      el.pause(); el.removeAttribute("src"); el.load();
    };
  }, [episodeId, episodeNumber, animeId, malId, titles, track, quality, activeAlternate]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <label htmlFor="miru-track" className="text-xs text-muted-foreground">Language</label>
        <select id="miru-track" value={track} onChange={(e) => { resumeAt.current = 0; onTrackChange(e.target.value as "sub" | "dub"); }} className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground"><option value="sub">Sub</option><option value="dub">Dub</option></select>
        <label htmlFor="miru-quality" className="text-xs text-muted-foreground">Quality</label>
        <select id="miru-quality" value={quality} onChange={(e) => { resumeAt.current = video.current?.currentTime || 0; onQualityChange(e.target.value); }} className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground">
          <option value="auto">Auto</option><option value="highest">Highest available</option>
          {[...new Set(["1080p", "720p", "480p", "360p", ...(quality !== "auto" && quality !== "highest" ? [quality] : []), ...(session?.variants.map((v) => v.label) || [])])].map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
        {session && !activeAlternate && <span className="text-xs text-muted-foreground">{session.selectedQuality}</span>}
      </div>
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-border">
        <video ref={video} crossOrigin="anonymous" controls playsInline preload="auto" className="w-full h-full" onEnded={() => { if (autoNext && hasNext) onNext(); }} />
        {loading && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2 text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin" /><span className="text-xs">Loading Server 1...</span></div>}
        {!episodeId && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground px-4 text-center">Select a matching title and episode to play.</div>}
      </div>
      {track === "sub" && <div className="flex flex-wrap items-center gap-2 text-xs">
        {activeAlternate ? <button type="button" className="rounded-lg border border-border px-3 py-2" onClick={() => { skipAutoSubtitleLookup.current = true; setAlternate(null); setSubtitleMessage("Returned to the original stream."); resumeAt.current = 0; }}>Original stream</button> : <button type="button" disabled={searchingSubtitles || loading || !episodeId} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40" onClick={() => void findSubtitleSource()}>{searchingSubtitles ? "Finding subtitles..." : "Try subtitle source"}</button>}
        <span className="text-muted-foreground">Subtitle availability depends on the source.</span>
      </div>}
      {track === "sub" && (subtitleMessage || fileMessage) && <p role="status" className="text-xs text-muted-foreground">{fileMessage || subtitleMessage}</p>}
      {error && <p role="alert" className="text-sm text-red-400 flex gap-2 items-start"><AlertCircle className="w-4 h-4 shrink-0" />{error}</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={onPrev} disabled={!hasPrev} className="rounded-lg border border-border bg-card px-3 py-2 disabled:opacity-40">Previous</button>
        <button type="button" onClick={onNext} disabled={!hasNext} className="rounded-lg border border-border bg-card px-3 py-2 disabled:opacity-40">Next</button>
        <label className="flex items-center gap-1 text-muted-foreground"><input type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} /> Auto next</label>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {downloading ? <button type="button" onClick={onCancelDownload} className="rounded-lg border border-border px-3 py-2">View download</button> : <button type="button" onClick={onDownload} disabled={!episodeId} className="rounded-lg bg-accent text-accent-foreground px-3 py-2 font-semibold disabled:opacity-40">Download</button>}
      </div>
    </div>
  );
}
