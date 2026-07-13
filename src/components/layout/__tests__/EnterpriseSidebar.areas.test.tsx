/**
 * STRATA navigation smoke — CAT-STRATA-IMPL-20260712-001 (Phase 0 IA rename),
 * supersedes CAT-STRATA-FOUNDATION-20260709-001 REQ-021(e). The sidebar must
 * present exactly the five task-sequence areas from the design pack (anchor 11:
 * Direction · Measurement · Delivery · Value · Governance) and every item must
 * point at a registered /strata route (AC20: no dead links). Config-level test —
 * SidebarBase rendering is covered by its own suite.
 */
import { describe, expect, it } from 'vitest';
import { strataSidebarConfig } from '../EnterpriseSidebar';
import { getRouteConfig } from '@/config/routeRegistry';

const CANONICAL_AREAS = [
  'Direction',
  'Measurement',
  'Delivery',
  'Value',
  'Governance',
];

describe('STRATA sidebar canonical areas (CAT-STRATA-IMPL-20260712-001)', () => {
  it('presents exactly the five task-sequence area groups (plus the ungrouped Command Center)', () => {
    const titled = strataSidebarConfig.sections.map((s) => s.title).filter(Boolean);
    expect(titled).toEqual(CANONICAL_AREAS);
  });

  it('never reintroduces the pre-rename (v1) area labels', () => {
    const titles = strataSidebarConfig.sections.map((s) => s.title);
    for (const banned of ['Strategy Execution', 'Balanced Scorecard', 'Value Management Office']) {
      expect(titles).not.toContain(banned);
    }
  });

  it('every sidebar destination resolves to a registered route (no dead links)', () => {
    const items = [
      ...strataSidebarConfig.sections.flatMap((s) => s.items),
      ...(strataSidebarConfig.footerItem ? [strataSidebarConfig.footerItem] : []),
    ];
    expect(items.length).toBeGreaterThanOrEqual(8);
    for (const item of items) {
      const cfg = getRouteConfig(item.path);
      expect(cfg.pageTitle, `sidebar link ${item.path} has no registered page title`).toBeTruthy();
    }
  });
});
