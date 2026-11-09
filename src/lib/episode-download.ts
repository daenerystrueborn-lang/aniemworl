import { exactMiruMatch, getMiruEpisodes, searchMiruTitles, type MiruTitle } from "./mirudl.ts";

/** Resolve the requested episode without changing the active player. */
export async function resolveDownloadEpisode(titles: string[], chosen: MiruTitle | null, ep: number, signal?: AbortSignal): Promise<string> {
  const match = chosen || exactMiruMatch(titles, await searchMiruTitles(titles, signal));
  if (!match) throw new Error("No unique Server 1 title match. Select the matching title on Server 1 first.");
  const matching = (await getMiruEpisodes(match.id, signal)).filter((item) => item.number === ep);
  if (matching.length !== 1) throw new Error("This episode is not uniquely available for download on Server 1.");
  return matching[0].id;
}
