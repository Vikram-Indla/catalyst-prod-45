/**
 * usage-map.generated.ts contract test (2026-05-17).
 *
 * The usage map is produced by `npm run scan:components` (the scanner at
 * scripts/scan-components.ts). It must be git-tracked so the /admin/components
 * UI can read it at runtime without re-scanning, and so PR diffs make
 * consumer-count changes visible.
 *
 * This test asserts the generated map has the expected shape and that
 * baseline canonical components have a non-trivial consumer count.
 *
 * RED until Step 5 ships the scanner + generated file.
 */
import { describe, it, expect } from 'vitest';

import { usageMap, usageMapStats, getUsageByName } from '@/registry/usage-map.generated';

describe('usage-map.generated — contract', () => {
  it('exports a non-empty usageMap object', () => {
    expect(usageMap).toBeDefined();
    expect(typeof usageMap).toBe('object');
    expect(Object.keys(usageMap).length).toBeGreaterThan(50);
  });

  it('exports stats: total / atlaskit / internal counts', () => {
    expect(usageMapStats).toBeDefined();
    expect(usageMapStats.total).toBeGreaterThan(50);
    expect(usageMapStats.atlaskit).toBeGreaterThan(20);
    expect(usageMapStats.internal).toBeGreaterThan(20);
  });

  it('every entry has { name, source, origin, consumers, package? }', () => {
    for (const [key, info] of Object.entries(usageMap)) {
      expect(info.name, `${key}: name`).toBeTruthy();
      expect(info.source, `${key}: source`).toBeTruthy();
      expect(['atlaskit', 'internal'], `${key}: origin`).toContain(info.origin);
      expect(Array.isArray(info.consumers), `${key}: consumers array`).toBe(true);
    }
  });

  it('JiraTable has consumers (≥7 per CANONICAL_COMPONENTS.md baseline)', () => {
    const variants = getUsageByName('JiraTable');
    expect(variants.length).toBeGreaterThan(0);
    const internal = variants.find(v => v.origin === 'internal');
    expect(internal, 'internal JiraTable variant missing').toBeDefined();
    expect(internal!.consumers.length).toBeGreaterThanOrEqual(7);
  });

  it('@atlaskit/button is auto-discovered with many consumers', () => {
    // Atlaskit Button is imported from two entry points: @atlaskit/button (legacy)
    // and @atlaskit/button/new (modern). Both share the @atlaskit/button base package.
    const variants = getUsageByName('Button').filter(v => v.origin === 'atlaskit');
    expect(variants.length).toBeGreaterThan(0);
    for (const v of variants) {
      expect(v.package).toBe('@atlaskit/button');
    }
    const totalConsumers = new Set(variants.flatMap(v => v.consumers));
    expect(totalConsumers.size).toBeGreaterThan(50);
  });

  it('every consumer path is repo-relative (no absolute paths leak)', () => {
    for (const info of Object.values(usageMap)) {
      for (const path of info.consumers) {
        expect(path, `absolute path leaked: ${path}`).not.toMatch(/^\/Users\//);
        expect(path).toMatch(/^src\//);
      }
    }
  });
});
