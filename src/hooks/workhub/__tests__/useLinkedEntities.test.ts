import { describe, it, expect } from 'vitest';
import { mapLinkedEntities } from '../useLinkedEntities';

describe('mapLinkedEntities (Phase E / G3)', () => {
  it('maps boards to Kanban board entities', () => {
    const out = mapLinkedEntities(
      [{ id: 'b1', name: 'Sprint blockers' }],
      [],
    );
    expect(out).toEqual([{ type: 'Kanban board', name: 'Sprint blockers' }]);
  });

  it('maps derived roadmap + dashboard views to labelled entities', () => {
    const out = mapLinkedEntities(
      [],
      [
        { id: 'v1', title: 'Q3 roadmap', type: 'roadmap' },
        { id: 'v2', title: 'Burn-down', type: 'dashboard' },
      ],
    );
    expect(out).toEqual([
      { type: 'Roadmap', name: 'Q3 roadmap' },
      { type: 'Dashboard', name: 'Burn-down' },
    ]);
  });

  it('combines boards and views, boards first', () => {
    const out = mapLinkedEntities(
      [{ id: 'b1', name: 'Board A' }],
      [{ id: 'v1', title: 'Road A', type: 'roadmap' }],
    );
    expect(out.map(e => e.type)).toEqual(['Kanban board', 'Roadmap']);
  });

  it('returns empty array when nothing is linked', () => {
    expect(mapLinkedEntities([], [])).toEqual([]);
  });

  it('falls back to the raw type when an unknown derived-view type appears (no lie)', () => {
    const out = mapLinkedEntities([], [{ id: 'v1', title: 'X', type: 'timeline' }]);
    expect(out).toEqual([{ type: 'timeline', name: 'X' }]);
  });
});
