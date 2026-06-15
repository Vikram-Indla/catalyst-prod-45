/**
 * BR subtask categories (2026-06-15): BRD Task + UAT Finding must be
 * first-class canonical work-item types so their icons resolve via the
 * override-aware WorkItemTypeIcon path and their labels normalize from
 * free-text Jira strings.
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

describe('BR subtask category types — registry membership', () => {
  it.each(['brd-task', 'uat-finding'] as WorkItemType[])(
    '%s is a registered WorkItemType',
    (t) => {
      expect(WORK_ITEM_TYPES).toContain(t);
    },
  );

  it.each(['brd-task', 'uat-finding'] as WorkItemType[])(
    '%s has a full registry entry with light + dark assets',
    (t) => {
      const meta = WORK_TYPE_REGISTRY[t];
      expect(meta).toBeDefined();
      expect(meta.light).toBeTruthy();
      expect(meta.dark).toBeTruthy();
      expect(meta.label).toBeTruthy();
    },
  );
});

describe('BR subtask category types — normalization from Jira strings', () => {
  it('normalizes "BRD Task" → brd-task', () => {
    expect(normalizeWorkItemType('BRD Task')).toBe('brd-task');
  });
  it('normalizes "UAT Finding" → uat-finding', () => {
    expect(normalizeWorkItemType('UAT Finding')).toBe('uat-finding');
  });
  it('normalizes case/spacing variants', () => {
    expect(normalizeWorkItemType('brd task')).toBe('brd-task');
    expect(normalizeWorkItemType('uat finding')).toBe('uat-finding');
  });
});
