/**
 * Pure framework-authoring helpers (CAT-STRATA-GOVFRAMEWORK-20260719-001).
 * Extracted from StrataFrameworkPage so the live-total / remaining / diff / submit-eligibility
 * logic is unit-testable and mirrors the server validator's 100%-total rule exactly.
 * The DB remains the enforcement authority; these drive UI preview + submit-disable only.
 */
import type { StrataFrameworkMember, StrataFrameworkMemberDraft } from '../types';

export const WEIGHT_TOLERANCE = 0.01;

export function frameworkTotal(rows: StrataFrameworkMemberDraft[]): number {
  const sum = rows.reduce((s, r) => s + (Number.isFinite(r.weight) ? r.weight : 0), 0);
  return Math.round(sum * 1000) / 1000;
}

export function frameworkRemaining(total: number): number {
  return Math.round((100 - total) * 1000) / 1000;
}

export function totalIsValid(total: number): boolean {
  return Math.abs(total - 100) <= WEIGHT_TOLERANCE;
}

export function hasDuplicateOrder(rows: StrataFrameworkMemberDraft[]): boolean {
  return new Set(rows.map((r) => r.order_index)).size !== rows.length;
}

export function hasDuplicatePerspective(rows: StrataFrameworkMemberDraft[]): boolean {
  return new Set(rows.map((r) => r.perspective_id)).size !== rows.length;
}

/** Save is allowed only when there is ≥1 member, weights total 100, and no duplicate order/perspective. */
export function canSaveMembers(rows: StrataFrameworkMemberDraft[]): boolean {
  return rows.length > 0 && totalIsValid(frameworkTotal(rows)) && !hasDuplicateOrder(rows) && !hasDuplicatePerspective(rows);
}

/** Re-pack order_index to 0..n-1 in array order (after add/remove/reorder). */
export function reindexMembers(rows: StrataFrameworkMemberDraft[]): StrataFrameworkMemberDraft[] {
  return rows.map((r, i) => ({ ...r, order_index: i }));
}

/** Move a member up (-1) or down (+1); returns a re-indexed copy (or the same array if a no-op). */
export function moveMember(rows: StrataFrameworkMemberDraft[], perspectiveId: string, dir: -1 | 1): StrataFrameworkMemberDraft[] {
  const idx = rows.findIndex((r) => r.perspective_id === perspectiveId);
  const swap = idx + dir;
  if (idx < 0 || swap < 0 || swap >= rows.length) return rows;
  const next = [...rows];
  [next[idx], next[swap]] = [next[swap], next[idx]];
  return reindexMembers(next);
}

export interface FrameworkMemberDiff {
  added: string[];
  removed: string[];
  reweighted: Array<{ id: string; from: number; to: number }>;
  reordered: Array<{ id: string; from: number; to: number }>;
}

/** Diff a candidate version's members against the current effective members (by perspective_id). */
export function diffFrameworkMembers(
  current: StrataFrameworkMember[],
  candidate: StrataFrameworkMember[],
): FrameworkMemberDiff {
  const curBy = new Map(current.map((m) => [m.perspective_id, m]));
  const candBy = new Map(candidate.map((m) => [m.perspective_id, m]));
  const added = candidate.filter((m) => !curBy.has(m.perspective_id)).map((m) => m.perspective_id);
  const removed = current.filter((m) => !candBy.has(m.perspective_id)).map((m) => m.perspective_id);
  const reweighted: FrameworkMemberDiff['reweighted'] = [];
  const reordered: FrameworkMemberDiff['reordered'] = [];
  candidate.forEach((m) => {
    const c = curBy.get(m.perspective_id);
    if (c && Number(c.weight) !== Number(m.weight)) reweighted.push({ id: m.perspective_id, from: Number(c.weight), to: Number(m.weight) });
    if (c && c.order_index !== m.order_index) reordered.push({ id: m.perspective_id, from: c.order_index, to: m.order_index });
  });
  return { added, removed, reweighted, reordered };
}

export function diffIsEmpty(d: FrameworkMemberDiff): boolean {
  return d.added.length + d.removed.length + d.reweighted.length + d.reordered.length === 0;
}
