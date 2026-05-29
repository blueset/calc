/**
 * Internal route store backed by the URL hash.
 *
 * Why not read `window.location.hash` directly from `useSyncExternalStore`'s
 * `getSnapshot`? In preview mode we continuously rewrite the hash with
 * `history.replaceState` as the user edits (to keep the share URL in sync).
 * If `getSnapshot` returned the live hash, a later unrelated React render would
 * observe the freshly written `#preview=` payload and trigger a reload/remount
 * that clobbers newer edits.
 *
 * Instead we cache the "route hash" in a module variable:
 * - `getSnapshot()` returns the cached value (stable across renders).
 * - `navigate(hash)` performs a real transition (pushState + cache + notify).
 * - `replacePreviewHash(hash)` only rewrites the URL (replaceState) without
 *   touching the cache or notifying, so live preview edits never remount.
 * - real `hashchange`/`popstate` events update the cache and notify.
 */

let currentRouteHash =
  typeof window !== "undefined" ? window.location.hash : "";

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function handleHashEvent() {
  if (currentRouteHash !== window.location.hash) {
    currentRouteHash = window.location.hash;
    notify();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", handleHashEvent);
  window.addEventListener("popstate", handleHashEvent);
}

function buildUrl(hash: string): string {
  return location.pathname + location.search + (hash || "");
}

export const routeStore = {
  subscribe(callback: () => void): () => void {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  getSnapshot(): string {
    return currentRouteHash;
  },

  /** Real navigation: adds a history entry, updates the cached snapshot, notifies. */
  navigate(hash: string): void {
    history.pushState(null, "", buildUrl(hash));
    currentRouteHash = hash;
    notify();
  },

  /**
   * Live-edit URL sync for preview mode: rewrites the current URL in place
   * without adding history entries, updating the cached snapshot, or notifying.
   */
  replacePreviewHash(hash: string): void {
    history.replaceState(null, "", buildUrl(hash));
  },
};
