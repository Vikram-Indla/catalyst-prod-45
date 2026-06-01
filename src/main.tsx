import React from "react";
import { setBooleanFeatureFlagResolver } from '@atlaskit/platform-feature-flags';
import { createRoot } from "react-dom/client";
// Variable fonts — `Inter Variable` registers the continuous 100-900
// weight axis used by the heading/metric/bold-body slots at weight 653.
// (Catylast component library CSS moved to the separate catylast-storybook
// repo 2026-05-18; this app no longer pulls those token / styles sheets.)
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./index.css";
import "./styles/catalyst-typography.css";
import "./styles/catalyst-theme.css";
import "./tokens/jira-parity-overrides.css";

// ─────────────────────────────────────────────────────────────────────────────
// Stale-chunk safeguard
// Triggers on:
//   1. window 'vite:preloadError' — Vite's dedicated event, fires before the
//      promise rejection bubbles. Most reliable signal.
//   2. unhandledrejection — fallback for non-Vite chunk loaders & older builds.
// On detection: purge SW caches + sessionStorage reload-guard, then hard-reload
// (bypass cache via cache-bust query param). Throttled to 1 reload per 10s.
// ─────────────────────────────────────────────────────────────────────────────
const RELOAD_KEY = 'catalyst-chunk-reload';

function isStaleChunkMessage(msg: string): boolean {
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('error loading dynamically imported module')
  );
}

async function purgeAndReload() {
  const last = sessionStorage.getItem(RELOAD_KEY);
  const now = Date.now();
  if (last && now - Number(last) < 10_000) return; // throttle
  sessionStorage.setItem(RELOAD_KEY, String(now));

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* best-effort cache purge */
  }

  // Cache-bust reload — query param forces network fetch of index.html
  const url = new URL(window.location.href);
  url.searchParams.set('_r', String(now));
  window.location.replace(url.toString());
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  void purgeAndReload();
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = String((event.reason as { message?: string })?.message || event.reason || '');
  if (isStaleChunkMessage(msg)) {
    void purgeAndReload();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Atlaskit React 18 portal fix
// By default @atlaskit/portal uses useEffect to mount the portal container,
// which defers DOM commit until after paint (async). In React 18 concurrent
// mode this means the modal appears only after a tab-switch / visibility flush.
// Enabling this flag switches @atlaskit/portal to InternalPortalNew which uses
// useIsomorphicLayoutEffect (synchronous, before paint) — modal commits on the
// same frame as the state update that opens it.
// ─────────────────────────────────────────────────────────────────────────────
setBooleanFeatureFlagResolver((flagKey: string) => {
  if (flagKey === 'platform_design_system_team_portal_logic_r18_fix') return true;
  return false;
});

const el = document.getElementById("root");
if (!el) throw new Error("Missing #root element");

const root = createRoot(el);

import("./App")
  .then((mod) => {
    const App = mod.default;
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    // Layer 3 — idle-prefetch the Atlaskit view chunks after first paint.
    // Does NOT run on boot (would slow the critical path); waits for
    // requestIdleCallback so the user's first Epic-open is instant.
    import("./lib/atlaskitPrefetch")
      .then(({ warmAtlaskitViewOnIdle }) => warmAtlaskitViewOnIdle())
      .catch(() => { /* best-effort; skip on import failure */ });

    // Layer 5 — service worker precache for Atlaskit vendor chunks.
    // Production-only; dev builds are skipped inside the registrar.
    // Scheduled after the App render so registration never blocks first
    // paint. Kill-switch: append ?nosw=1 to any URL to unregister.
    import("./lib/registerServiceWorker")
      .then(({ registerServiceWorker }) => registerServiceWorker())
      .catch(() => { /* best-effort; SW is an optimisation, never required */ });

    // Dev-only: enumerate every page module and report dynamic-import / runtime
    // failures. No-op in production. Manual: window.__catalystRouteCheck().
    if (import.meta.env.DEV) {
      import("./lib/routeSmokeCheck")
        .then(({ installRouteSmokeCheck }) => installRouteSmokeCheck())
        .catch(() => { /* best-effort; smoke check is dev-only */ });
    }
  })
  .catch((err) => {
    console.error("Fatal boot error:", err);
    el.innerHTML = `
      <div style="padding:40px;font-family:monospace;color:#dc2626">
        <h1>Boot Error</h1>
        <pre style="white-space:pre-wrap;word-break:break-all">${String(err?.message || err)}</pre>
        <pre style="white-space:pre-wrap;word-break:break-all;font-size:12px;color:#666">${String(err?.stack || '')}</pre>
      </div>
    `;
  });
