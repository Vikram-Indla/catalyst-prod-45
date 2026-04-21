/**
 * Catalyst service worker — Atlaskit chunk precache (Layer 5).
 *
 * Scope: /  (registered from main.tsx at production build only)
 *
 * Only caches Vite-hashed Atlaskit / ProseMirror / Tiptap vendor chunks.
 * Everything else passes through to the network unchanged, so:
 *   - HTML deploys propagate instantly (SW never serves index.html)
 *   - API calls and Supabase traffic are untouched
 *   - User data never hits the SW cache
 *
 * Why this is safe:
 *   - Chunk URLs are hash-suffixed by Vite (`*.{hash}.js`). Cache-first is
 *     correct because the URL itself changes when the content changes.
 *   - `SW_VERSION` below is a manual escape hatch: bumping it invalidates
 *     every cache on next activate, so a bad deploy can be recovered with
 *     one commit.
 *   - The kill-switch `?nosw=1` (handled in `registerServiceWorker.ts`)
 *     unregisters this worker and clears caches, so a buggy SW never
 *     strands users on stale chunks.
 *
 * What it does NOT do:
 *   - No background sync, no push notifications, no offline fallback HTML.
 *   - No preload manifest — we cache on first request, not on install.
 *     That keeps the install cheap and avoids referencing specific hashes
 *     that change every deploy.
 */

// Bump to invalidate every client cache on next activation.
// Treat this like a migration number: only change when you MUST evict
// all cached chunks across all users.
const SW_VERSION = 'v1';
const CACHE_NAME = `catalyst-atlaskit-${SW_VERSION}`;

// URL patterns we precache. Each is a Vite hashed vendor chunk produced
// by the Layer 4 manualChunks split in vite.config.ts. Keep this list
// aligned with the chunk names there.
const CACHEABLE_CHUNK_PREFIXES = [
  '/assets/vendor-atlaskit-editor',
  '/assets/vendor-atlaskit-renderer',
  '/assets/vendor-atlaskit-adf',
  '/assets/vendor-atlaskit-media',
  '/assets/vendor-atlaskit-ui',
  '/assets/vendor-atlaskit-dnd',
  '/assets/vendor-atlaskit-rich',
  '/assets/vendor-atlaskit-forms',
  '/assets/vendor-prosemirror',
];

function isCacheableChunk(url) {
  // Only same-origin; never cache cross-origin assets.
  try {
    const u = new URL(url);
    if (u.origin !== self.location.origin) return false;
    // Only JS + CSS chunks — skip sourcemaps etc.
    if (!u.pathname.endsWith('.js') && !u.pathname.endsWith('.css')) return false;
    return CACHEABLE_CHUNK_PREFIXES.some((prefix) => u.pathname.startsWith(prefix));
  } catch {
    return false;
  }
}

// ── Install ──────────────────────────────────────────────────────────
// Nothing to precache here; we cache on first-request instead. Skip
// waiting so a new SW version takes effect on next navigation, not
// when every tab finally closes.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// ── Activate ─────────────────────────────────────────────────────────
// Delete any cache whose name doesn't match our current version. Then
// take over open clients so Layer 4 chunks go through the new SW on the
// very next request (without a reload).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('catalyst-atlaskit-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// ── Fetch ────────────────────────────────────────────────────────────
// Cache-first for hash-named vendor chunks; everything else falls
// through to the network untouched. We never call respondWith for
// non-cacheable requests so the browser's default handling (including
// HMR websockets, range requests, credential rules) is preserved.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (!isCacheableChunk(request.url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;

      // Fetch with the browser's default; if it succeeds AND is a normal
      // cacheable response, put a clone in the cache so subsequent opens
      // (this session, other tabs, next page load) hit memory/disk.
      try {
        const response = await fetch(request);
        if (response && response.ok && response.type === 'basic') {
          cache.put(request, response.clone()).catch(() => {
            /* quota / storage errors swallowed; serving live response */
          });
        }
        return response;
      } catch (err) {
        // Network failed and we have nothing cached. Let the browser
        // surface the same error it would have without the SW.
        throw err;
      }
    })(),
  );
});

// ── Message channel ──────────────────────────────────────────────────
// Optional escape hatch used by registerServiceWorker.ts: when the app
// asks the SW to self-destruct (kill-switch), we clear caches and
// unregister ourselves.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CATALYST_SW_DESTROY') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith('catalyst-atlaskit-'))
            .map((key) => caches.delete(key)),
        );
        const registrations = await self.registration.unregister();
        // eslint-disable-next-line no-console
        console.info('[catalyst-sw] self-destructed', { unregistered: registrations });
      })(),
    );
  }
});
