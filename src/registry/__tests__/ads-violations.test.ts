/**
 * ads-violations.generated.ts contract test (2026-05-17, Step 9).
 *
 * Produced by `npm run scan:ads-violations` (scripts/scan-ads-violations.ts).
 * Surfaces the live ADS-compliance defects in the codebase so /admin/components
 * can show them as a sortable, file:line-linked table.
 *
 * v1 scans 4 high-signal categories:
 *   - hand-rolled-dropdown: useState menuOpen/showMenu + mousedown listener
 *   - banned-import: imports of banned components (MDT, ServiceNow, Assessment, etc.)
 *   - deprecated-shim: imports from deprecated shim files
 *   - lozenge-duplicate: imports from non-canonical Lozenge paths
 *
 * Raw-hex scan deferred to v2 (justified Jira-parity overrides require allowlist).
 *
 * RED until Step 9 ships the scanner + generated file.
 */
import { describe, it, expect } from 'vitest';

import { adsViolations, adsViolationsStats } from '@/registry/ads-violations.generated';

const VALID_CATEGORIES = new Set([
  'hand-rolled-dropdown',
  'banned-import',
  'deprecated-shim',
  'lozenge-duplicate',
]);
const VALID_SEVERITIES = new Set(['P0', 'P1', 'P2']);

describe('ads-violations.generated — contract', () => {
  it('exports an adsViolations array', () => {
    expect(Array.isArray(adsViolations)).toBe(true);
  });

  it('exports adsViolationsStats with category counts', () => {
    expect(adsViolationsStats).toBeDefined();
    expect(typeof adsViolationsStats.total).toBe('number');
    expect(typeof adsViolationsStats.byCategory).toBe('object');
  });

  it('every violation has required shape', () => {
    for (const v of adsViolations) {
      expect(v.id, 'id').toBeTruthy();
      expect(VALID_CATEGORIES, `category: ${v.category}`).toContain(v.category);
      expect(VALID_SEVERITIES, `severity: ${v.severity}`).toContain(v.severity);
      expect(v.file, 'file').toMatch(/^src\//);
      expect(typeof v.line, 'line').toBe('number');
      expect(v.line).toBeGreaterThan(0);
      expect(v.rule, 'rule').toBeTruthy();
      expect(v.suggestion, 'suggestion').toBeTruthy();
    }
  });

  it('IDs are unique', () => {
    const ids = adsViolations.map(v => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('detects at least one hand-rolled dropdown (CLAUDE.md 2026-05-10 baseline mentions 4)', () => {
    const dropdowns = adsViolations.filter(v => v.category === 'hand-rolled-dropdown');
    expect(dropdowns.length).toBeGreaterThanOrEqual(1);
  });

  it('detects zero banned-import violations today (banned components have no live consumers per registry seed)', () => {
    const banned = adsViolations.filter(v => v.category === 'banned-import');
    expect(banned, `banned import leak: ${banned.map(b => `${b.file}:${b.line}`).join(', ')}`).toEqual([]);
  });
});
