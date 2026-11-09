import { useEffect, useRef, useState } from "react";
import { downloadHls, fetchQualities, type DownloadProgress } from "@/lib/download";
import { getMiruSession, type MiruTitle } from "@/lib/mirudl";
import { resolveDownloadEpisode } from "@/lib/episode-download";

type DownloadState = { busy: boolean; progress?: DownloadProgress; message?: string };

export function useEpisodeDownloads(animeId: string, title: string, titles: string[], chosen: MiruTitle | null, track: "sub" | "dub", quality: string) {
  const controllers = useRef(new Map<number, AbortController>());
  const [states, setStates] = useState<Record<number, DownloadState>>({});
  useEffect(() => {
    const active = controllers.current;
    return () => { active.forEach((controller) => controller.abort()); active.clear(); };
  }, [animeId]);
  useEffect(() => { setStates({}); }, [animeId]);

  function cancel(ep: number) {
    controllers.current.get(ep)?.abort();
    controllers.current.delete(ep);
    setStates((prev) => ({ ...prev, [ep]: { busy: false, message: "Download cancelled." } }));
  }
  async function start(ep: number) {
    if (controllers.current.has(ep)) return;
    const controller = new AbortController();
    controllers.current.set(ep, controller);
    const update = (state: DownloadState) => { if (!controller.signal.aborted) setStates((prev) => ({ ...prev, [ep]: state })); };
    update({ busy: true });
    try {
      const episodeId = await resolveDownloadEpisode(titles, chosen, ep, controller.signal);
      const session = await getMiruSession(episodeId, track, quality, controller.signal);
      const url = quality === "auto" ? session.proxyHlsUrl : session.proxySelectedHlsUrl;
      const qualities = await fetchQualities(url, controller.signal);
      await downloadHls(qualities[0].url, `${title} - Episode ${ep} - ${track}`, (progress) => update({ busy: true, progress }), controller.signal);
      update({ busy: false, message: "Download ready. Your browser will save the file." });
    } catch (error) {
      update({ busy: false, message: error instanceof Error ? error.message.replace(/mirudl/gi, "Server 1") : "Download failed." });
    } finally {
      if (controllers.current.get(ep) === controller) controllers.current.delete(ep);
    }
  }
  return { states, start, cancel };
}
