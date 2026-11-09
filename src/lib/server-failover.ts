/** Only fail over on definite failures; an ambiguous title needs a user choice. */
export function server1Failure(state: {
  active: boolean;
  searchStatus: "pending" | "error" | "success";
  searching: boolean;
  manualSearch: boolean;
  matchCount: number;
  hasChosenTitle: boolean;
  episodesStatus: "pending" | "error" | "success";
  loadingEpisodes: boolean;
  matchingEpisodes: number;
}): string | null {
  if (!state.active) return null;
  if (!state.hasChosenTitle && !state.searching && state.searchStatus === "error") return "Server 1 could not be reached.";
  if (!state.searching && state.searchStatus === "success" && !state.manualSearch && !state.hasChosenTitle && state.matchCount === 0) return "This title is unavailable on Server 1.";
  if (state.hasChosenTitle && !state.loadingEpisodes) {
    if (state.episodesStatus === "error") return "Server 1 could not load the episode list.";
    if (state.episodesStatus === "success" && state.matchingEpisodes !== 1) return "This episode is unavailable on Server 1.";
  }
  return null;
}

/** Time out the whole lookup and abort in-flight requests on timeout or navigation. */
export async function withServerTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, signal: AbortSignal, milliseconds = 30_000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  let onAbort: () => void = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    onAbort = () => { controller.abort(); reject(new DOMException("Request cancelled", "AbortError")); };
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => { reject(new Error("Server 1 took too long to respond.")); controller.abort(); }, milliseconds);
  });
  try {
    return await Promise.race([operation(controller.signal), interrupted]);
  } finally {
    clearTimeout(timer!);
    signal.removeEventListener("abort", onAbort);
    controller.abort();
  }
}
