import { describe, it, expect } from 'vitest';
import { flattenTree } from '../backlog.utils';

type N = { id: string };
const n = (id: string): N => ({ id });

// Epic 4489 → Story 4490 → Frontend 4528  (the real 3-level BAU case)
const epic = n('BAU-4489'), story = n('BAU-4490'), fe = n('BAU-4528');
const childrenOf = new Map<string, N[]>([
  ['BAU-4489', [story]],
  ['BAU-4490', [fe]],
]);
const all = () => true;

describe('flattenTree', () => {
  it('nests grandchildren when every ancestor is expanded', () => {
    const ids = flattenTree([epic], childrenOf, () => true, all).map((x) => x.id);
    expect(ids).toEqual(['BAU-4489', 'BAU-4490', 'BAU-4528']);
  });

  it('hides the grandchild when the middle Story is collapsed (no top-level leak)', () => {
    const expanded = (id: string) => id === 'BAU-4489'; // only epic expanded
    const ids = flattenTree([epic], childrenOf, expanded, all).map((x) => x.id);
    expect(ids).toEqual(['BAU-4489', 'BAU-4490']);
    expect(ids).not.toContain('BAU-4528'); // the bug: used to surface at top
  });

  it('hides all descendants when the root is collapsed', () => {
    const ids = flattenTree([epic], childrenOf, () => false, all).map((x) => x.id);
    expect(ids).toEqual(['BAU-4489']);
  });

  it('dedups by id and is cycle-safe', () => {
    const a = n('A'), b = n('B');
    const cyc = new Map<string, N[]>([['A', [b]], ['B', [a]]]); // A↔B cycle
    const ids = flattenTree([a], cyc, () => true, all).map((x) => x.id);
    expect(ids).toEqual(['A', 'B']);
  });

  it('applies the matches predicate but still recurses through non-matching ancestors', () => {
    const matchOnlyGrandchild = (x: N) => x.id === 'BAU-4528';
    const ids = flattenTree([epic], childrenOf, () => true, matchOnlyGrandchild).map((x) => x.id);
    expect(ids).toEqual(['BAU-4528']);
  });
});
