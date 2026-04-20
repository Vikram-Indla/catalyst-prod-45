import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/catalyst-typography.css";
import "./styles/catalyst-theme.css";

// Auto-reload on stale chunk errors (happens after new Vercel deployments)
window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event.reason?.message || event.reason || '');
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError')
  ) {
    const key = 'catalyst-chunk-reload';
    const last = sessionStorage.getItem(key);
    const now = Date.now();
    if (!last || now - Number(last) > 10_000) {
      sessionStorage.setItem(key, String(now));
      window.location.reload();
      return;
    }
  }
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
