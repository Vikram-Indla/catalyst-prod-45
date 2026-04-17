/**
 * Service worker registration — Layer 5 of the Atlaskit loading pattern.
 *
 * The worker itself lives at `public/sw.js` and is responsible for
 * cache-first handling of Vite-hashed Atlaskit / ProseMirror / Tiptap
 * vendor chunks. This module owns the **lifecycle**: when to register,
 * when NOT to register, and how to self-destruct if something goes wrong.
 *
 * Safety rules (do not relax without review):
 *
 *   1. **Dev bypass.** We skip registration in dev builds so Vite's HMR
 *      websocket and dynamic module graph are never interfered with by a
 *      caching layer. Only production builds get the SW.
 *
 *   2. **Kill-switch via `?nosw=1`.** Any URL with that query param
 *      unregisters every catalyst SW and clears its caches. Gives a
 *      product-manager-level escape hatch: if a deploy ships a broken
 *      SW, point the user at `https://catalyst.app/?nosw=1` and they
 *      return to uncached state in one request.
 *
 *   3. **Same-origin only.** The worker scope is `/` on the app origin;
 *      nothing else is touched. We do not register a scope wider than
 *      the app itself.
 *
 *   4. **Update propagation.** When a new SW is deployed, it calls
 *      `skipWaiting()` on install and `clients.claim()` on activate, so
 *      users pick up the new caching rules without a hard reload.
 *
 *   5. **Best-effort.** Every `.catch` swallows to console — the SW is
 *      an optimisation, never a precondition. If registration fails,
 *      the app still works (it just pays the network cost for chunks).
 */

const KILL_SWITCH_PARAM = 'nosw';
const KILL_SWITCH_STORAGE_KEY = 'catalyst-sw-disabled';

function hasKillSwitch(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get(KILL_SWITCH_PARAM) === '1') return true;
    // Persist the kill-switch across navigations so the user doesn't
    // have to keep the query param on every link.
    return window.localStorage?.getItem(KILL_SWITCH_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function persistKillSwitch(): void {
  try {
    window.localStorage?.setItem(KILL_SWITCH_STORAGE_KEY, '1');
  } catch {
    /* ignore storage errors */
  }
}

async function destroyAllCatalystServiceWorkers(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(async (reg) => {
        try {
          reg.active?.postMessage({ type: 'CATALYST_SW_DESTROY' });
        } catch {
          /* ignore postMessage errors */
        }
        try {
          await reg.unregister();
        } catch {
          /* ignore unregister errors */
        }
      }),
    );
  } catch {
    /* ignore top-level errors */
  }
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith('catalyst-atlaskit-'))
        .map((name) => caches.delete(name)),
    );
  } catch {
    /* ignore cache errors */
  }
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  // Dev mode: never register. Vite dev server conflicts with SW caching
  // and HMR websockets must pass through untouched.
  if (import.meta.env?.DEV) return;

  // Kill-switch: unregister any active SW and clear caches.
  if (hasKillSwitch()) {
    persistKillSwitch();
    await destroyAllCatalystServiceWorkers();
    // eslint-disable-next-line no-console
    console.info('[catalyst-sw] killed by ?nosw=1 or storage flag');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    // eslint-disable-next-line no-console
    console.info('[catalyst-sw] registered', { scope: registration.scope });

    // When a new worker takes control, the freshly-loaded Atlaskit
    // chunk may be served from a stale cache for ~1 request. We let
    // that happen (it's still a valid hash-named chunk) rather than
    // reload, which would be jarring. The next navigation will use
    // the new cache automatically.
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[catalyst-sw] registration failed', err);
  }
}

/**
 * Public kill-switch for runtime use (debug console, support tooling).
 * Matches the behaviour of visiting `?nosw=1` but can be invoked without
 * navigation.
 */
export async function unregisterCatalystServiceWorker(): Promise<void> {
  persistKillSwitch();
  await destroyAllCatalystServiceWorkers();
}
