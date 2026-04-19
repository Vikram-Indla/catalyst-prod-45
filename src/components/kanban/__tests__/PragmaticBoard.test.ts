/**
 * Unit tests for PragmaticBoard's pure drop reconciliation.
 *
 * resolveDropTarget() is the one place on the Kanban board where the
 * "user intent → (destColId, insertIndex)" math lives. Getting the edge,
 * same-column index adjustment, and no-op detection right is what stops
 * cards from visually teleporting when dropped. These tests pin the
 * behavior so a future refactor can't silently regress it.
 *
 * No React, no Pragmatic DnD runtime — resolveDropTarget is a pure
 * function that only reads from the colMap snapshot.
 */
import { describe, it, expect } from 'vitest';
import { resolveDropTarget } from '../PragmaticBoard';

const colMap = {
  todo: ['t1', 't2', 't3'],
  doing: ['d1', 'd2'],
  done: [] as string[],
};

describe('resolveDropTarget — cross-column drops', () => {
  it('drop onto empty column appends at index 0', () => {
    const r = resolveDropTarget({
      sourceCardId: 't1',
      sourceColId: 'todo',
      targetType: 'kanban-column',
      targetColId: 'done',
      colMap,
    });
    expect(r).toEqual({ destColId: 'done', insertIndex: 0 });
  });

  it('drop onto non-empty column body appends at end', () => {
    const r = resolveDropTarget({
      sourceCardId: 't1',
      sourceColId: 'todo',
      targetType: 'kanban-column',
      targetColId: 'doing',
      colMap,
    });
    expect(r).toEqual({ destColId: 'doing', insertIndex: 2 });
  });

  it('drop onto card with edge=top inserts before the target', () => {
    const r = resolveDropTarget({
      sourceCardId: 't1',
      sourceColId: 'todo',
      targetType: 'kanban-card',
      targetColId: 'doing',
      targetCardId: 'd2',
      edge: 'top',
      colMap,
    });
    expect(r).toEqual({ destColId: 'doing', insertIndex: 1 });
  });

  it('drop onto card with edge=bottom inserts after the target', () => {
    const r = resolveDropTarget({
      sourceCardId: 't1',
      sourceColId: 'todo',
      targetType: 'kanban-card',
      targetColId: 'doing',
      targetCardId: 'd2',
      edge: 'bottom',
      colMap,
    });
    expect(r).toEqual({ destColId: 'doing', insertIndex: 2 });
  });

  it('drop onto first card with edge=top inserts at head', () => {
    const r = resolveDropTarget({
      sourceCardId: 't1',
      sourceColId: 'todo',
      targetType: 'kanban-card',
      targetColId: 'doing',
      targetCardId: 'd1',
      edge: 'top',
      colMap,
    });
    expect(r).toEqual({ destColId: 'doing', insertIndex: 0 });
  });
});

describe('resolveDropTarget — same-column reorder index adjustment', () => {
  it('moving downward adjusts for the removed source card', () => {
    // t1 at idx 0, dropping onto t3's bottom edge.
    // Naive insertIndex = 3; after t1 is removed, the visual target is idx 2.
    const r = resolveDropTarget({
      sourceCardId: 't1',
      sourceColId: 'todo',
      targetType: 'kanban-card',
      targetColId: 'todo',
      targetCardId: 't3',
      edge: 'bottom',
      colMap,
    });
    expect(r).toEqual({ destColId: 'todo', insertIndex: 2 });
  });

  it('moving downward to middle with edge=top adjusts correctly', () => {
    // t1 at idx 0, dropping onto t3's top edge.
    // Naive insertIndex = 2; after t1 removed, target is idx 1.
    const r = resolveDropTarget({
      sourceCardId: 't1',
      sourceColId: 'todo',
      targetType: 'kanban-card',
      targetColId: 'todo',
      targetCardId: 't3',
      edge: 'top',
      colMap,
    });
    expect(r).toEqual({ destColId: 'todo', insertIndex: 1 });
  });

  it('moving upward does NOT adjust (source is below insertion point)', () => {
    // t3 at idx 2, dropping onto t1's top edge.
    // Naive insertIndex = 0; source is below, no adjustment.
    const r = resolveDropTarget({
      sourceCardId: 't3',
      sourceColId: 'todo',
      targetType: 'kanban-card',
      targetColId: 'todo',
      targetCardId: 't1',
      edge: 'top',
      colMap,
    });
    expect(r).toEqual({ destColId: 'todo', insertIndex: 0 });
  });

  it('moving upward with edge=bottom adjusts if target is above source', () => {
    // t3 at idx 2, dropping onto t1's bottom edge.
    // Naive insertIndex = 1; source is below (idx 2), no adjustment.
    const r = resolveDropTarget({
      sourceCardId: 't3',
      sourceColId: 'todo',
      targetType: 'kanban-card',
      targetColId: 'todo',
      targetCardId: 't1',
      edge: 'bottom',
      colMap,
    });
    expect(r).toEqual({ destColId: 'todo', insertIndex: 1 });
  });
});

describe('resolveDropTarget — no-op detection', () => {
  it('dropping card at its own current position returns null (column body)', () => {
    // Dropping t3 onto 'todo' body = insertIndex 3; after removal idx 2 = currentIdx 2 → no-op.
    const r = resolveDropTarget({
      sourceCardId: 't3',
      sourceColId: 'todo',
      targetType: 'kanban-column',
      targetColId: 'todo',
      colMap,
    });
    expect(r).toBeNull();
  });

  it('dropping onto own top edge returns null', () => {
    // t2 at idx 1, onto t2's top = insertIndex 1 = currentIdx → no-op.
    // (canDrop on PragmaticCard filters this at the runtime layer, but
    // resolveDropTarget must also be safe if someone bypasses it.)
    const r = resolveDropTarget({
      sourceCardId: 't2',
      sourceColId: 'todo',
      targetType: 'kanban-card',
      targetColId: 'todo',
      targetCardId: 't2',
      edge: 'top',
      colMap,
    });
    expect(r).toBeNull();
  });

  it('dropping onto card above with edge=bottom where adjusted index === current returns null', () => {
    // t2 at idx 1, onto t1 bottom = naive 1 = currentIdx 1 → no-op.
    const r = resolveDropTarget({
      sourceCardId: 't2',
      sourceColId: 'todo',
      targetType: 'kanban-card',
      targetColId: 'todo',
      targetCardId: 't1',
      edge: 'bottom',
      colMap,
    });
    expect(r).toBeNull();
  });
});

describe('resolveDropTarget — defensive guards', () => {
  it('returns null when targetType=kanban-card but targetCardId missing', () => {
    const r = resolveDropTarget({
      sourceCardId: 't1',
      sourceColId: 'todo',
      targetType: 'kanban-card',
      targetColId: 'doing',
      edge: 'top',
      colMap,
    });
    expect(r).toBeNull();
  });

  it('returns null when target card id is not in the target column', () => {
    const r = resolveDropTarget({
      sourceCardId: 't1',
      sourceColId: 'todo',
      targetType: 'kanban-card',
      targetColId: 'doing',
      targetCardId: 'ghost-id',
      edge: 'top',
      colMap,
    });
    expect(r).toBeNull();
  });

  it('handles a target column that has no entry in colMap (treats as empty)', () => {
    const r = resolveDropTarget({
      sourceCardId: 't1',
      sourceColId: 'todo',
      targetType: 'kanban-column',
      targetColId: 'review', // never declared
      colMap,
    });
    expect(r).toEqual({ destColId: 'review', insertIndex: 0 });
  });
});
