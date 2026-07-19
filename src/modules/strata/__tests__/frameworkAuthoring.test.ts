/**
 * CAT-STRATA-GOVFRAMEWORK-20260719-001 — framework authoring logic (client/unit).
 * Mirrors the server validator's 100%-total rule and the editor's diff/reorder behaviour.
 */
import { describe, expect, it } from 'vitest';
import {
  canSaveMembers, diffFrameworkMembers, diffIsEmpty, frameworkRemaining, frameworkTotal,
  hasDuplicateOrder, hasDuplicatePerspective, moveMember, reindexMembers, totalIsValid,
} from '../lib/frameworkAuthoring';
import type { StrataFrameworkMember, StrataFrameworkMemberDraft } from '../types';

const draft = (perspective_id: string, weight: number, order_index: number): StrataFrameworkMemberDraft =>
  ({ perspective_id, weight, order_index });
const member = (perspective_id: string, weight: number, order_index: number): StrataFrameworkMember =>
  ({ id: `m-${perspective_id}`, framework_version_id: 'v1', perspective_id, weight, order_index,
    created_by: null, created_at: '', updated_at: '' });

const CANONICAL = [
  draft('fin', 30, 0), draft('cust', 25, 1), draft('net', 10, 2), draft('dig', 20, 3), draft('ppl', 15, 4),
];

describe('live total + remaining', () => {
  it('totals 100 for the canonical set', () => {
    expect(frameworkTotal(CANONICAL)).toBe(100);
    expect(frameworkRemaining(100)).toBe(0);
    expect(totalIsValid(100)).toBe(true);
  });
  it('reports remaining under 100', () => {
    const rows = [draft('fin', 30, 0), draft('cust', 25, 1)];
    expect(frameworkTotal(rows)).toBe(55);
    expect(frameworkRemaining(55)).toBe(45);
    expect(totalIsValid(55)).toBe(false);
  });
  it('99 and 101 are both invalid; 100 within tolerance is valid', () => {
    expect(totalIsValid(99)).toBe(false);
    expect(totalIsValid(101)).toBe(false);
    expect(totalIsValid(100.009)).toBe(true);
  });
  it('ignores NaN weights (empty inputs) in the total', () => {
    const rows = [draft('fin', NaN, 0), draft('cust', 25, 1)];
    expect(frameworkTotal(rows)).toBe(25);
  });
});

describe('submit eligibility', () => {
  it('canSave only when total 100, ≥1 member, no dup order/perspective', () => {
    expect(canSaveMembers(CANONICAL)).toBe(true);
    expect(canSaveMembers([])).toBe(false);                                  // empty
    expect(canSaveMembers([draft('fin', 99, 0)])).toBe(false);               // total ≠ 100
  });
  it('detects duplicate order and duplicate perspective', () => {
    expect(hasDuplicateOrder([draft('a', 50, 0), draft('b', 50, 0)])).toBe(true);
    expect(hasDuplicatePerspective([draft('a', 50, 0), draft('a', 50, 1)])).toBe(true);
    expect(canSaveMembers([draft('a', 50, 0), draft('b', 50, 0)])).toBe(false); // dup order blocks
  });
});

describe('reorder', () => {
  it('reindex packs order to 0..n-1', () => {
    const out = reindexMembers([draft('a', 1, 5), draft('b', 2, 9)]);
    expect(out.map((r) => r.order_index)).toEqual([0, 1]);
  });
  it('move up/down swaps and re-indexes; no-op at the edges', () => {
    const up = moveMember(CANONICAL, 'cust', -1);
    expect(up.map((r) => r.perspective_id)).toEqual(['cust', 'fin', 'net', 'dig', 'ppl']);
    expect(up.map((r) => r.order_index)).toEqual([0, 1, 2, 3, 4]);
    expect(moveMember(CANONICAL, 'fin', -1)).toBe(CANONICAL);   // already first → same ref
    expect(moveMember(CANONICAL, 'ppl', 1)).toBe(CANONICAL);    // already last → same ref
  });
});

describe('diff vs current effective', () => {
  const current = [member('fin', 20, 0), member('net', 20, 1), member('cust', 25, 2)];
  it('detects added / removed / reweighted', () => {
    const candidate = [member('fin', 10, 0), member('net', 30, 1), member('dig', 60, 2)]; // cust removed, dig added
    const d = diffFrameworkMembers(current, candidate);
    expect(d.added).toEqual(['dig']);
    expect(d.removed).toEqual(['cust']);
    expect(d.reweighted).toEqual([
      { id: 'fin', from: 20, to: 10 },
      { id: 'net', from: 20, to: 30 },
    ]);
    expect(diffIsEmpty(d)).toBe(false);
  });
  it('detects reorder only', () => {
    const candidate = [member('net', 20, 0), member('fin', 20, 1), member('cust', 25, 2)];
    const d = diffFrameworkMembers(current, candidate);
    expect(d.reordered.map((r) => r.id).sort()).toEqual(['fin', 'net']);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
  });
  it('empty diff when identical', () => {
    expect(diffIsEmpty(diffFrameworkMembers(current, current))).toBe(true);
  });
});
