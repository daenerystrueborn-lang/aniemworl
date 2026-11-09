import { useEffect, useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { downloadHls, fetchQualities, formatSpeed, type DownloadProgress, type QualityOption } from "@/lib/download";
import { resolveStreamUrl, type StreamMode } from "@/lib/stream-resolver";
import { resolveRenderStream } from "@/lib/render-download";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "choose"; qualities: QualityOption[] }
  | { kind: "downloading"; progress: DownloadProgress }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function EpisodeDownload({ animeId, malId, episodeNumber, title, titles }: { animeId: string; malId: number | null; episodeNumber: number; title: string; titles: string[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [track, setTrack] = useState<StreamMode>("sub");
  const [source, setSource] = useState<"render" | "original">("render");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => { controller.current?.abort(); }, []);

  async function loadQualities() {
    const current = new AbortController();
    controller.current?.abort();
    controller.current = current;
    setStatus({ kind: "loading" });
    try {
      const url = source === "render"
        ? await resolveRenderStream({ animeId, malId, titles, episodeNumber, track, signal: current.signal })
        : await resolveStreamUrl(animeId, episodeNumber, track, current.signal);
      const qualities = await fetchQualities(url, current.signal);
      if (!current.signal.aborted) setStatus({ kind: "choose", qualities });
    } catch (error) {
      if (!current.signal.aborted) setStatus({ kind: "error", message: error instanceof Error ? error.message : "Could not prepare the download." });
    }
  }

  async function startDownload(quality: QualityOption) {
    const current = controller.current;
    if (!current || current.signal.aborted) return;
    setDialogOpen(true);
    setStatus({ kind: "downloading", progress: { percent: 0, done: 0, total: 0, bytesPerSecond: 0 } });
    try {
      await downloadHls(quality.url, `${title} - Episode ${episodeNumber} - ${track}`, (progress) => {
        if (!current.signal.aborted) setStatus({ kind: "downloading", progress });
      }, current.signal);
      if (!current.signal.aborted) setStatus({ kind: "done" });
    } catch (error) {
      if (!current.signal.aborted) setStatus({ kind: "error", message: error instanceof Error ? error.message : "Download failed." });
    }
  }

  function cancel() {
    controller.current?.abort();
    controller.current = null;
    setStatus({ kind: "idle" });
  }

  const busy = status.kind === "loading" || status.kind === "downloading";
  return (
    <section className="bg-card border border-border rounded-xl p-4 space-y-3" aria-label="Episode download">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download episode {episodeNumber}</DialogTitle>
            <DialogDescription>The episode downloads in your browser. Keep this page open until it is ready to save.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm" role="status" aria-live="polite">
            {status.kind === "downloading" ? <><p>Downloading: {status.progress.percent}% ({status.progress.done}/{status.progress.total} segments) · {formatSpeed(status.progress.bytesPerSecond)}</p><progress className="w-full h-2 accent-accent" value={status.progress.percent} max={100} /><button type="button" onClick={cancel} className="rounded-lg border border-border px-3 py-2">Cancel download</button></> : <p>{status.kind === "done" ? "Download ready. Your browser will save the file." : status.kind === "error" ? status.message : "Download cancelled."}</p>}
            <p className="text-xs text-muted-foreground">Your browser saves the file after the video finishes downloading. Separate subtitles may not be included.</p>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex flex-wrap items-center gap-3">
        <Download className="w-4 h-4 text-accent" />
        <h2 className="text-sm font-bold text-foreground">Download episode {episodeNumber}</h2>
        <label className="text-xs text-muted-foreground ml-auto" htmlFor="download-source">Source</label>
        <select id="download-source" value={source} disabled={busy} onChange={(event) => { cancel(); setSource(event.target.value as "render" | "original"); }} className="rounded border border-border bg-muted px-2 py-1.5 text-xs text-foreground">
          <option value="render">Download server</option><option value="original">Original source</option>
        </select>
        <label className="text-xs text-muted-foreground" htmlFor="download-track">Language</label>
        <select id="download-track" value={track} disabled={busy} onChange={(event) => { cancel(); setTrack(event.target.value as StreamMode); }} className="rounded border border-border bg-muted px-2 py-1.5 text-xs text-foreground">
          <option value="sub">Sub</option><option value="dub">Dub</option>
        </select>
        {busy ? (
          <button type="button" onClick={cancel} className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs text-foreground"><X className="w-3 h-3" /> Cancel</button>
        ) : (
          <button type="button" onClick={loadQualities} className="inline-flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"><Download className="w-3 h-3" /> {status.kind === "error" ? "Try again" : "Choose quality"}</button>
        )}
      </div>
      {status.kind === "loading" && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Finding this episode and available qualities...</p>}
      {status.kind === "choose" && <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Choose quality:</span>{status.qualities.map((quality) => <button key={quality.url} type="button" onClick={() => startDownload(quality)} className="rounded border border-border bg-muted px-3 py-1.5 text-xs text-foreground hover:border-accent">{quality.label}</button>)}</div>}
      {status.kind === "downloading" && <div role="status" className="space-y-1"><p className="text-xs text-muted-foreground">Downloading: {status.progress.percent}% ({status.progress.done}/{status.progress.total} segments) {status.progress.bytesPerSecond > 0 && ` · ${formatSpeed(status.progress.bytesPerSecond)}`}</p><progress className="w-full h-2 accent-accent" value={status.progress.percent} max={100} /></div>}
      {status.kind === "done" && <p role="status" className="text-xs text-green-400">Download ready. Your browser will save the file.</p>}
      {status.kind === "error" && <p role="alert" className="text-xs text-red-400">{status.message}</p>}
      <p className="text-xs text-muted-foreground">Availability depends on the source. {source === "original" ? "The original source uses a third-party proxy. " : "Video is fetched through the download server. "}Downloads run in your browser and may use substantial memory.</p>
    </section>
  );
}
