/**
 * BR subtask categories (2026-06-15): the Business Request detail view must
 * restrict the inline-create picker to its 5 subtask categories WITHOUT
 * mutating the shared ALLOWED_CHILD_TYPES map (Q1 — scoped to MDT BRs only).
 * resolveAllowedChildTypes honours an explicit override; otherwise falls
 * back to the canonical parent→child rules.
 */
import { describe, it, expect } from 'vitest';
import { resolveAllowedChildTypes } from '../hierarchy';
import { getAllowedChildTypes } from '@/components/catalyst-detail-views/shared/parent-rules';

const BR_SUBTASK_CATEGORIES = [
  'BRD Task', 'Business Gap', 'Change Request', 'UAT Finding', 'Figma',
];

describe('resolveAllowedChildTypes', () => {
  it('returns the override verbatim when one is supplied', () => {
    expect(resolveAllowedChildTypes('Business Request', BR_SUBTASK_CATEGORIES))
      .toEqual(BR_SUBTASK_CATEGORIES);
  });

  it('falls back to canonical rules when no override', () => {
    expect(resolveAllowedChildTypes('Story'))
      .toEqual(getAllowedChildTypes('Story'));
  });

  it('treats an empty override as no override (canonical fallback)', () => {
    expect(resolveAllowedChildTypes('Story', []))
      .toEqual(getAllowedChildTypes('Story'));
  });

  it('does NOT mutate the shared map — BR still maps to [Epic] canonically', () => {
    expect(getAllowedChildTypes('Business Request')).toEqual(['Epic']);
  });
});
