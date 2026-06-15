/**
 * BR subtask categories (2026-06-15): the inline-create type picker reads
 * CANONICAL_WORK_ITEM_OPTIONS. BRD Task + UAT Finding must be selectable
 * options with correct labels.
 */
import { describe, it, expect } from 'vitest';
import { CANONICAL_WORK_ITEM_OPTIONS } from '@/components/shared/canonicalWorkItemOptions';

describe('CANONICAL_WORK_ITEM_OPTIONS — BR subtask categories', () => {
  it('includes BRD Task with correct label', () => {
    const opt = CANONICAL_WORK_ITEM_OPTIONS.find((o) => o.key === 'BRD Task');
    expect(opt).toBeDefined();
    expect(opt!.label).toBe('BRD Task');
  });
  it('includes UAT Finding with correct label', () => {
    const opt = CANONICAL_WORK_ITEM_OPTIONS.find((o) => o.key === 'UAT Finding');
    expect(opt).toBeDefined();
    expect(opt!.label).toBe('UAT Finding');
  });
});
