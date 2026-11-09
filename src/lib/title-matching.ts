import { normalizeTitle } from "./mirudl.ts";

export function exactTitleCandidates<T extends { titles: string[] }>(title: string, candidates: T[]): T[] {
  const normalized = normalizeTitle(title);
  return normalized ? candidates.filter((candidate) => candidate.titles.some((name) => normalizeTitle(name) === normalized)) : [];
}
