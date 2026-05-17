/**
 * pickRuntimeForPathname — selects the most specific runtime config row for
 * the current pathname (v3 per-route scoping).
 *
 * Authored: 2026-05-17 (PR-4 Step 2).
 *
 * Match semantics:
 *   - Each row's `route` is a substring pattern. The row matches when
 *     `pathname.includes(route)`. Empty-string route (`''`) is the global
 *     fallback — it always matches but loses to longer routes.
 *   - Among matching rows, the LONGEST route wins (most specific). Ties
 *     break by lexical order so the pick is deterministic across calls.
 *   - If no row matches, returns `undefined` and the caller falls back to
 *     registry defaults via `resolveComponentConfig`.
 *
 * Why a separate helper:
 *   - Keeps `resolveComponentConfig` pure and route-agnostic (single
 *     runtime input).
 *   - Keeps the route matcher independently testable without mounting the
 *     react-query hook or stubbing a browser URL.
 */
import type { RuntimeComponentConfig } from './resolveComponentConfig';

export function pickRuntimeForPathname(
  runtimesByRoute: Record<string, RuntimeComponentConfig>,
  pathname: string,
): RuntimeComponentConfig | undefined {
  const candidates: Array<{ route: string; cfg: RuntimeComponentConfig }> = [];
  for (const [route, cfg] of Object.entries(runtimesByRoute)) {
    if (pathname.includes(route)) candidates.push({ route, cfg });
  }
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => {
    if (b.route.length !== a.route.length) return b.route.length - a.route.length;
    return a.route.localeCompare(b.route);
  });
  return candidates[0].cfg;
}
