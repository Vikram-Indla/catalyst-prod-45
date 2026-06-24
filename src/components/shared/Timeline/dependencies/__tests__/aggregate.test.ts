import { describe, it, expect } from 'vitest';
import { buildDependencyIndex, type RawDependencyRow } from '../normalize';
import { collectSubtreeKeys, aggregateRelations, aggregateGroup, relatedKeys, keysWithAnyDependency, type TreeNode } from '../aggregate';

const node = (issueKey: string, children: TreeNode[] = []): TreeNode => ({ issueKey, children });
const dep = (id: number, src: string, tgt: string): RawDependencyRow => ({
  id, project_key: 'BAU', source_issue_key: src, target_issue_key: tgt,
  dependency_type: 'blocks', created_at: '2026-06-24T09:00:00Z', created_by: 'u', deleted_at: null,
});

describe('collectSubtreeKeys', () => {
  it('returns self + all descendants', () => {
    const tree = node('E', [node('S1', [node('T1')]), node('S2')]);
    expect(collectSubtreeKeys(tree).sort()).toEqual(['E', 'S1', 'S2', 'T1']);
  });
});

describe('aggregateRelations', () => {
  it('leaf row shows own dependencies', () => {
    const idx = buildDependencyIndex([dep(1, 'A', 'B')]); // A blocks B
    expect(aggregateRelations(node('B'), idx).blockedBy.map(r => r.otherKey)).toEqual(['A']);
    expect(aggregateRelations(node('A'), idx).blocks.map(r => r.otherKey)).toEqual(['B']);
  });

  it('parent row rolls up an EXTERNAL child dependency', () => {
    // S1 (child of E) is blocked by X (outside E)
    const idx = buildDependencyIndex([dep(1, 'X', 'S1')]);
    const E = node('E', [node('S1'), node('S2')]);
    const agg = aggregateRelations(E, idx);
    expect(agg.blockedBy).toHaveLength(1);
    expect(agg.blockedBy[0]).toMatchObject({ memberKey: 'S1', otherKey: 'X' });
  });

  it('parent row EXCLUDES internal child-to-child dependencies', () => {
    // S1 blocks S2, both inside E → internal, not counted at E
    const idx = buildDependencyIndex([dep(1, 'S1', 'S2')]);
    const E = node('E', [node('S1'), node('S2')]);
    const agg = aggregateRelations(E, idx);
    expect(agg.blocks).toHaveLength(0);
    expect(agg.blockedBy).toHaveLength(0);
  });

  it('dedups an edge that touches the subtree twice', () => {
    // Edge X→S1; both ends counted only once at E level (only S1 in subtree)
    const idx = buildDependencyIndex([dep(1, 'S1', 'X')]); // S1 blocks X
    const E = node('E', [node('S1')]);
    expect(aggregateRelations(E, idx).blocks).toHaveLength(1);
  });
});

describe('aggregateGroup', () => {
  it('sums every member edge, INCLUDING internal ones (Jira group-band semantics)', () => {
    // S1 blocks S2 (both members) + X blocks S1. Group counts both.
    const idx = buildDependencyIndex([dep(1, 'S1', 'S2'), dep(2, 'X', 'S1')]);
    const agg = aggregateGroup(['S1', 'S2'], idx);
    expect(agg.blocks).toHaveLength(1);                       // S1 blocks S2 (internal, still counted)
    expect(agg.blockedBy.map(r => r.otherKey).sort()).toEqual(['S1', 'X']); // S2 by S1 + S1 by X
  });

  it('dedupes an edge shared by two members', () => {
    // Single edge S1 blocks S2 — appears in S1.blocks and S2.blockedBy; counted once per direction.
    const idx = buildDependencyIndex([dep(1, 'S1', 'S2')]);
    const agg = aggregateGroup(['S1', 'S2'], idx);
    expect(agg.blocks).toHaveLength(1);
    expect(agg.blockedBy).toHaveLength(1);
  });
});

describe('relatedKeys', () => {
  it('includes self + both-direction neighbours', () => {
    const idx = buildDependencyIndex([dep(1, 'A', 'B'), dep(2, 'C', 'A')]); // A blocks B; C blocks A
    expect([...relatedKeys(idx, 'A')].sort()).toEqual(['A', 'B', 'C']);
  });
});

describe('keysWithAnyDependency', () => {
  const r = (issueKey: string, parentKey: string | null = null) => ({ issueKey, parentKey });

  it('keeps only items that have a dependency edge', () => {
    const idx = buildDependencyIndex([dep(1, 'A', 'B')]); // A blocks B
    const keep = keysWithAnyDependency([r('A'), r('B'), r('C')], idx);
    expect([...keep].sort()).toEqual(['A', 'B']);
  });

  it('keeps ancestors of a dependency-having child for tree context', () => {
    const idx = buildDependencyIndex([dep(1, 'X', 'S1')]); // S1 blocked by X
    const keep = keysWithAnyDependency([r('E'), r('S1', 'E'), r('S2', 'E')], idx);
    expect(keep.has('S1')).toBe(true);
    expect(keep.has('E')).toBe(true);   // ancestor kept
    expect(keep.has('S2')).toBe(false); // no dep, not an ancestor of a dep item
  });

  it('walks multiple ancestor levels', () => {
    const idx = buildDependencyIndex([dep(1, 'X', 'T1')]); // T1 blocked by X
    const keep = keysWithAnyDependency([r('E'), r('S1', 'E'), r('T1', 'S1')], idx);
    expect([...keep].sort()).toEqual(['E', 'S1', 'T1']);
  });

  it('returns empty when nothing has dependencies', () => {
    const idx = buildDependencyIndex([]);
    expect(keysWithAnyDependency([r('A'), r('B')], idx).size).toBe(0);
  });
});
