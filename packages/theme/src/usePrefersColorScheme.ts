import { useSyncExternalStore } from "react";

const QUERY = "(prefers-color-scheme: dark)";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Subscribe to the `prefers-color-scheme: dark` media query. SSR-safe:
 * returns `false` on the server.
 */
export function usePrefersColorScheme(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
