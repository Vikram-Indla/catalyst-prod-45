/**
 * pickRuntimeForPathname contract test (PR-4 / v3 per-route scoping).
 *
 * The helper is the route-picking layer that sits between
 * `useComponentConfig` (which fetches every (component_id, route) row for
 * a component) and `resolveComponentConfig` (which is pure and only ever
 * sees a single runtime row).
 *
 * Match semantics (locked):
 *   - Each row's `route` is a substring pattern that must appear in
 *     pathname for that row to be a candidate.
 *   - Empty-string route (`''`) is the global fallback — `pathname.includes('')`
 *     is always true, so it's always a candidate but loses on length.
 *   - Among candidates, the LONGEST route wins (most specific). Ties break
 *     by lexical order so picks are deterministic.
 *   - If no rows are candidates, the helper returns `undefined`.
 */
import { describe, it, expect } from 'vitest';

import { pickRuntimeForPathname } from '@/registry/pickRuntimeForPathname';
import type { RuntimeComponentConfig } from '@/registry/resolveComponentConfig';

function cfg(version: string, flags: Record<string, unknown> = {}): RuntimeComponentConfig {
  return { active_version: version, feature_flags: flags };
}

describe('pickRuntimeForPathname', () => {
  it('returns undefined when no rows exist for the component', () => {
    const picked = pickRuntimeForPathname({}, '/project-hub/BAU/backlog');
    expect(picked).toBeUndefined();
  });

  it('picks the global row when no specific route matches', () => {
    const map = { '': cfg('1.0.0', { enableX: true }) };
    const picked = pickRuntimeForPathname(map, '/project-hub/BAU/backlog');
    expect(picked?.active_version).toBe('1.0.0');
    expect(picked?.feature_flags.enableX).toBe(true);
  });

  it('prefers a route-specific row over the global row', () => {
    const map = {
      '': cfg('1.0.0', { enableX: false }),
      '/backlog': cfg('1.4.0', { enableX: true }),
    };
    const picked = pickRuntimeForPathname(map, '/project-hub/BAU/backlog');
    expect(picked?.active_version).toBe('1.4.0');
    expect(picked?.feature_flags.enableX).toBe(true);
  });

  it('picks the longest matching route when several candidates match', () => {
    const map = {
      '': cfg('1.0.0'),
      '/project-hub': cfg('1.1.0'),
      '/project-hub/BAU/backlog': cfg('1.2.0'),
    };
    const picked = pickRuntimeForPathname(map, '/project-hub/BAU/backlog/BAU-5717');
    expect(picked?.active_version).toBe('1.2.0');
  });

  it('falls back to global when the pathname does not match any specific route', () => {
    const map = {
      '': cfg('1.0.0', { enableX: false }),
      '/backlog': cfg('1.4.0', { enableX: true }),
    };
    const picked = pickRuntimeForPathname(map, '/project-hub/BAU/allwork');
    expect(picked?.active_version).toBe('1.0.0');
    expect(picked?.feature_flags.enableX).toBe(false);
  });

  it('returns undefined when only specific routes exist and none match', () => {
    const map = {
      '/backlog': cfg('1.4.0'),
      '/admin/': cfg('1.5.0'),
    };
    const picked = pickRuntimeForPathname(map, '/project-hub/BAU/dashboard');
    expect(picked).toBeUndefined();
  });

  it('ties break deterministically (lexical order) so two same-length routes pick the same row every call', () => {
    const map = {
      '/board': cfg('1.0.0'),
      '/admin': cfg('2.0.0'),
    };
    const picked = pickRuntimeForPathname(map, '/admin/board');
    // Both '/board' and '/admin' match and have length 6. Lexical sort gives
    // '/admin' < '/board', and after sorting by length DESC then lex ASC
    // among ties, '/admin' comes first.
    expect(picked?.active_version).toBe('2.0.0');
  });
});
