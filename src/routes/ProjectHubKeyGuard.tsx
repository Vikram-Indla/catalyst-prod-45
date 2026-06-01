/**
 * ProjectHubKeyRedirect — top-level redirector for product/module keys that
 * were typed/bookmarked under /project-hub/*.
 *
 * MOUNTED OUTSIDE THE PROTECTED SHELL (App.tsx) — same reason as the legacy
 * /product-hub and /project-hub root redirects: CatalystShell's re-render
 * loop fires Navigate without committing the URL change when redirects live
 * inside the shell. Verified 2026-06-01 by console.log evidence: Guard fired
 * 5+ times in the same frame, URL never changed.
 *
 * Single source of truth: KEY_REDIRECT_MAP. Add a new product/module key
 * here AND add a matching <Route path="/project-hub/{KEY}/*" ...> in App.tsx
 * outside the protected shell.
 *
 * Keep in sync with `excludedProjectKeys` in src/hooks/useProjectHub.ts.
 */
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Each entry says: when this key is hit under /project-hub, send the user to
 *   - `hubRoot` (e.g. /product-hub/products) when there is no per-key page, OR
 *   - `/${hub}/${KEY}${subPath}` when the key has a per-entity hub area.
 *
 * INV exists as a row in `products` → has a per-product hub area.
 * MDT is a legacy placeholder project key for the Product Hub itself and has
 *   NO row in `products`, so it lands users on the products list instead of a
 *   ghost /product-hub/MDT/* page.
 */
const KEY_REDIRECT_MAP: Record<string, { hub: string; hasEntity: boolean; hubRoot: string }> = {
  INV: { hub: 'product-hub', hasEntity: true,  hubRoot: '/product-hub/products' },
  MDT: { hub: 'product-hub', hasEntity: false, hubRoot: '/product-hub/products' },
};

export function ProjectHubKeyRedirect() {
  const location = useLocation();
  const match = location.pathname.match(/^\/project-hub\/([^/]+)(\/.*)?$/);
  const upper = (match?.[1] ?? '').toUpperCase();
  const subPath = match?.[2] ?? '';
  const target = KEY_REDIRECT_MAP[upper];
  if (!target) return null;
  const dest = target.hasEntity
    ? `/${target.hub}/${upper}${subPath}${location.search}`
    : `${target.hubRoot}${location.search}`;
  return <Navigate to={dest} replace />;
}

export default ProjectHubKeyRedirect;
