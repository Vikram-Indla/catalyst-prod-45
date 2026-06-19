/**
 * Release type (2026-06-19): 'release' must be a first-class canonical
 * work-item type so the stopwatch icon renders via the override-aware
 * WorkItemTypeIcon path and the label normalizes from the free-text string
 * set by releasesDataSource.ts.
 *
 * Source-of-truth: src/components/icons/icons.registry.ts
 */
import { describe, it, expect } from 'vitest';
import {
  WORK_ITEM_TYPES,
  WORK_TYPE_REGISTRY,
  normalizeWorkItemType,
  type WorkItemType,
} from '@/components/icons/icons.registry';

describe('Release type — registry membership', () => {
  it('release is a registered WorkItemType', () => {
    expect(WORK_ITEM_TYPES).toContain('release');
  });

  it('release has a full registry entry with light asset and label', () => {
    const meta = WORK_TYPE_REGISTRY['release' as WorkItemType];
    expect(meta).toBeDefined();
    expect(meta.light).toBeTruthy();
    expect(meta.dark).toBeTruthy();
    expect(meta.label).toBe('Release');
  });
});

describe('Release type — normalization from free-text strings', () => {
  it('normalizes "Release" → release', () => {
    expect(normalizeWorkItemType('Release')).toBe('release');
  });
  it('normalizes "release" → release', () => {
    expect(normalizeWorkItemType('release')).toBe('release');
  });
});
