/**
 * Route Smoke Check (DEV ONLY)
 * ─────────────────────────────────────────────────────────────────────────────
 * Attempts a dynamic `import()` of every page/route module in the app and
 * reports any modules that fail to load (stale chunks, missing exports,
 * runtime side-effect errors at module-eval time).
 *
 * Why this exists: Catalyst routes are statically composed in JSX (App.tsx,
 * route shells), so there's no central route table to crawl. Vite's
 * `import.meta.glob` lets us enumerate every page module at build-time
 * without maintaining a registry.
 *
 * Usage:
 *   - Auto-runs once on first idle in dev mode.
 *   - Manual: open devtools and call `window.__catalystRouteCheck()`.
 *   - Returns: { ok: string[], failed: { path, error }[] }
 *
 * NOT shipped to production — guarded by `import.meta.env.DEV`.
 */

export interface RouteCheckResult {
  ok: string[];
  failed: Array<{ path: string; error: string }>;
  durationMs: number;
}

declare global {
  interface Window {
    __catalystRouteCheck?: () => Promise<RouteCheckResult>;
    __catalystRouteCheckResult?: RouteCheckResult;
  }
}

// Enumerate all page modules. `eager: false` keeps them as lazy import fns.
// Patterns target route-level modules; component-level files are skipped to
// keep the smoke check fast and focused on what the router actually mounts.
const pageModules = import.meta.glob([
  '/src/pages/**/*.{ts,tsx}',
  '/src/modules/**/pages/**/*.{ts,tsx}',
  '/src/routes/**/*.{ts,tsx}',
], { eager: false }) as Record<string, () => Promise<unknown>>;

export async function runRouteSmokeCheck(): Promise<RouteCheckResult> {
  const start = performance.now();
  const ok: string[] = [];
  const failed: Array<{ path: string; error: string }> = [];

  // Run with bounded concurrency (8) to avoid overwhelming the dev server.
  const entries = Object.entries(pageModules);
  const CONCURRENCY = 8;
  let cursor = 0;

  async function worker() {
    while (cursor < entries.length) {
      const idx = cursor++;
      const [path, loader] = entries[idx];
      try {
        await loader();
        ok.push(path);
      } catch (err) {
        const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        failed.push({ path, error: msg });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const result: RouteCheckResult = {
    ok,
    failed,
    durationMs: Math.round(performance.now() - start),
  };

  if (typeof window !== 'undefined') window.__catalystRouteCheckResult = result;

  // Console report
  const total = ok.length + failed.length;
  if (failed.length === 0) {
    console.info(
      `%c[RouteCheck] ✅ ${total} route modules loaded cleanly in ${result.durationMs}ms`,
      'color:#16a34a;font-weight:600',
    );
  } else {
    console.group(
      `%c[RouteCheck] ❌ ${failed.length}/${total} route modules failed (${result.durationMs}ms)`,
      'color:#dc2626;font-weight:600',
    );
    for (const f of failed) console.error(`✗ ${f.path}\n   → ${f.error}`);
    console.info('Full report: window.__catalystRouteCheckResult');
    console.groupEnd();
  }

  return result;
}

/**
 * Wires the smoke check into the dev preview:
 *   - Exposes window.__catalystRouteCheck() for manual runs.
 *   - Auto-runs once after the app is idle (5s after load) so it doesn't
 *     compete with the user's first interaction. Skipped in production.
 */
export function installRouteSmokeCheck(): void {
  if (!import.meta.env.DEV) return;
  if (typeof window === 'undefined') return;

  window.__catalystRouteCheck = runRouteSmokeCheck;

  const schedule =
    (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback ??
    ((cb: () => void) => window.setTimeout(cb, 5_000));

  schedule(
    () => {
      // Defer once more so we run AFTER first navigation settles.
      window.setTimeout(() => void runRouteSmokeCheck(), 5_000);
    },
    { timeout: 10_000 },
  );
}
