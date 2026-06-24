import { describe, it, expect } from 'vitest';
import {
  normalizeDependencyEdge,
  buildDependencyIndex,
  getEntry,
  resolveCanonical,
  wouldCreateCycle,
  validateNewDependency,
  type RawDependencyRow,
} from '../normalize';

function row(over: Partial<RawDependencyRow>): RawDependencyRow {
  return {
    id: 1,
    project_key: 'BAU',
    source_issue_key: 'BAU-1',
    target_issue_key: 'BAU-2',
    dependency_type: 'blocks',
    created_at: '2026-06-24T09:00:00Z',
    created_by: 'u1',
    deleted_at: null,
    ...over,
  };
}

describe('normalizeDependencyEdge', () => {
  it("'blocks' keeps source as blocker, target as dependent", () => {
    const e = normalizeDependencyEdge(row({ source_issue_key: 'A', target_issue_key: 'B', dependency_type: 'blocks' }));
    expect(e.blockerKey).toBe('A');
    expect(e.dependentKey).toBe('B');
    expect(e.linkType).toBe('blocks');
  });

  it("'is_blocked_by' flips: target is blocker, source is dependent", () => {
    const e = normalizeDependencyEdge(row({ source_issue_key: 'A', target_issue_key: 'B', dependency_type: 'is_blocked_by' }));
    expect(e.blockerKey).toBe('B');
    expect(e.dependentKey).toBe('A');
  });

  it('carries createdAt + createdBy', () => {
    const e = normalizeDependencyEdge(row({ created_at: '2026-01-02T00:00:00Z', created_by: 'me' }));
    expect(e.createdAt).toBe('2026-01-02T00:00:00Z');
    expect(e.createdBy).toBe('me');
  });
});

describe('buildDependencyIndex', () => {
  it('A blocks B → B.blockedBy=[A], A.blocks=[B]', () => {
    const idx = buildDependencyIndex([row({ source_issue_key: 'A', target_issue_key: 'B', dependency_type: 'blocks' })]);
    expect(getEntry(idx, 'B').blockedBy.map(r => r.key)).toEqual(['A']);
    expect(getEntry(idx, 'A').blocks.map(r => r.key)).toEqual(['B']);
    expect(getEntry(idx, 'A').blockedBy).toEqual([]);
    expect(getEntry(idx, 'B').blocks).toEqual([]);
  });

  it('skips soft-deleted rows', () => {
    const idx = buildDependencyIndex([row({ source_issue_key: 'A', target_issue_key: 'B', deleted_at: '2026-06-24T10:00:00Z' })]);
    expect(idx.edges).toHaveLength(0);
    expect(getEntry(idx, 'A').blocks).toEqual([]);
  });

  it('is_blocked_by produces the same canonical index as the reversed blocks', () => {
    const a = buildDependencyIndex([row({ source_issue_key: 'X', target_issue_key: 'Y', dependency_type: 'is_blocked_by' })]);
    // X is blocked by Y  ⇒  Y blocks X
    expect(getEntry(a, 'X').blockedBy.map(r => r.key)).toEqual(['Y']);
    expect(getEntry(a, 'Y').blocks.map(r => r.key)).toEqual(['X']);
  });
});

describe('resolveCanonical', () => {
  it("direction 'blocks' → row is blocker", () => {
    expect(resolveCanonical('R', 'blocks', 'O')).toEqual({ blockerKey: 'R', dependentKey: 'O' });
  });
  it("direction 'is_blocked_by' → row is dependent", () => {
    expect(resolveCanonical('R', 'is_blocked_by', 'O')).toEqual({ blockerKey: 'O', dependentKey: 'R' });
  });
});

describe('wouldCreateCycle', () => {
  it('detects direct 2-node cycle (A blocks B, then B blocks A)', () => {
    const idx = buildDependencyIndex([row({ source_issue_key: 'A', target_issue_key: 'B', dependency_type: 'blocks' })]);
    expect(wouldCreateCycle(idx, 'B', 'A')).toBe(true);
  });
  it('detects transitive cycle (A→B→C, then C blocks A)', () => {
    const idx = buildDependencyIndex([
      row({ id: 1, source_issue_key: 'A', target_issue_key: 'B' }),
      row({ id: 2, source_issue_key: 'B', target_issue_key: 'C' }),
    ]);
    expect(wouldCreateCycle(idx, 'C', 'A')).toBe(true);
  });
  it('allows a non-cyclic addition', () => {
    const idx = buildDependencyIndex([row({ id: 1, source_issue_key: 'A', target_issue_key: 'B' })]);
    expect(wouldCreateCycle(idx, 'B', 'C')).toBe(false);
  });
});

describe('validateNewDependency', () => {
  const base = () => buildDependencyIndex([row({ id: 1, source_issue_key: 'A', target_issue_key: 'B', dependency_type: 'blocks' })]);

  it('rejects self-dependency', () => {
    expect(validateNewDependency(base(), 'A', 'blocks', 'A')).toEqual({ ok: false, error: 'A work item cannot depend on itself' });
  });
  it('rejects empty target', () => {
    expect(validateNewDependency(base(), 'A', 'blocks', '').ok).toBe(false);
  });
  it('rejects duplicate same-direction (A blocks B exists, add A blocks B)', () => {
    expect(validateNewDependency(base(), 'A', 'blocks', 'B')).toEqual({ ok: false, error: 'This dependency already exists' });
  });
  it('rejects reverse duplicate (A blocks B exists, add A is_blocked_by B → B blocks A)', () => {
    expect(validateNewDependency(base(), 'A', 'is_blocked_by', 'B')).toEqual({ ok: false, error: 'The reverse dependency already exists' });
  });
  it('rejects 2-node inverse as reverse-duplicate (A blocks B exists, add B blocks A)', () => {
    expect(validateNewDependency(base(), 'B', 'blocks', 'A')).toEqual({ ok: false, error: 'The reverse dependency already exists' });
  });
  it('rejects transitive cycle (A→B→C exist, add C blocks A)', () => {
    const idx = buildDependencyIndex([
      row({ id: 1, source_issue_key: 'A', target_issue_key: 'B', dependency_type: 'blocks' }),
      row({ id: 2, source_issue_key: 'B', target_issue_key: 'C', dependency_type: 'blocks' }),
    ]);
    expect(validateNewDependency(idx, 'C', 'blocks', 'A')).toEqual({ ok: false, error: 'This would create a circular dependency' });
  });
  it('accepts a valid new dependency', () => {
    expect(validateNewDependency(base(), 'A', 'blocks', 'C')).toEqual({ ok: true });
  });
});
