/**
 * Unit tests for buildTeamProgramBoardAdapter (Phase 8).
 *
 * Focuses on the dynamic-column behaviour that sets this adapter apart
 * from the fixed-lifecycle adapters (ideas / incidents / initiatives):
 *
 *   - Column defs are derived from DB rows and sorted by `sort_order`.
 *   - `status === column_id` is an identity contract.
 *   - `statusToColumnId` / `columnIdToStatus` reject stale ids.
 *   - Filters (type / flow-state / assignee / health) apply correctly.
 *   - `persistence.onDrop` only fires on a real column change and
 *     delegates to the injected mover.
 *
 * Pure functions — no React, no router, no Supabase required.
 */
import { describe, it, expect, vi } from 'vitest';
import type { KanbanBoard, KanbanCard, KanbanColumn } from '@/types/kanban.types';
import {
  buildTeamProgramBoardAdapter,
  deriveColumnDefsFromRows,
} from '../adapters/teamProgramBoardAdapter';
import { buildColMapFromAdapter } from '../adapters/BoardAdapter';

/* ═══════════════════════════════════════════════════════════════════════
   Fixtures — minimal set that exercises every branch of the adapter.
   ═══════════════════════════════════════════════════════════════════════ */

const board: KanbanBoard = {
  id: 'board-1',
  title: 'Team Alpha Board',
  description: 'Sprint flow',
  team_id: 'team-1',
  card_types: ['Story', 'Task', 'Defect', 'Epic'],
  settings: {
    mapColumnStates: false,
    showTags: true,
    showTeam: true,
    smallCards: false,
    macroView: false,
    showExitCriteria: false,
  },
  allow_overloading: true,
  allow_state_mapping: false,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-15T00:00:00Z',
};

const columns: KanbanColumn[] = [
  // Intentionally out-of-order to prove the adapter sorts by sort_order.
  { id: 'col-done', board_id: 'board-1', name: 'Done',        column_type: 'Completed',   sort_order: 3, state_mappings: [], created_at: '' },
  { id: 'col-todo', board_id: 'board-1', name: 'To Do',       column_type: 'Not Started', sort_order: 1, state_mappings: [], created_at: '' },
  { id: 'col-wip',  board_id: 'board-1', name: 'In Progress', column_type: 'In Progress', sort_order: 2, state_mappings: [], created_at: '' },
];

const cards: KanbanCard[] = [
  {
    id: 'c1', board_id: 'board-1', column_id: 'col-todo',
    work_item_type: 'Story', work_item_id: 'S-1', sort_order: 2,
    card_type: 'Default', is_blocked: false, added_at: '2026-04-10T00:00:00Z',
    work_item: {
      id: 'wi-1', external_id: 'S-1', title: 'Login form',
      state: 'todo', blocked: false,
      owner_name: 'Fatima', owner_id: 'u1',
      tags: ['auth', 'frontend'], health: 'on-track', points: 5,
    },
  },
  {
    id: 'c2', board_id: 'board-1', column_id: 'col-todo',
    work_item_type: 'Defect', work_item_id: 'D-2', sort_order: 1,
    card_type: 'Block', is_blocked: true, added_at: '2026-04-11T00:00:00Z',
    work_item: {
      id: 'wi-2', external_id: 'D-2', title: 'Crash on submit',
      state: 'todo', blocked: true,
      owner_name: 'Ahmed', owner_id: 'u2',
      tags: [], health: 'off-track', points: 3,
    },
  },
  {
    id: 'c3', board_id: 'board-1', column_id: 'col-wip',
    work_item_type: 'Task', work_item_id: 'T-3', sort_order: 1,
    card_type: 'Default', is_blocked: false, added_at: '2026-04-12T00:00:00Z',
    work_item: {
      id: 'wi-3', external_id: 'T-3', title: 'Wire analytics',
      state: 'in-progress', blocked: false,
      owner_name: 'Fatima', owner_id: 'u1',
      tags: ['infra'], health: 'at-risk', points: 2,
    },
  },
  {
    id: 'c4', board_id: 'board-1', column_id: 'col-done',
    work_item_type: 'Epic', work_item_id: 'E-4', sort_order: 1,
    card_type: 'Default', is_blocked: false, added_at: '2026-04-05T00:00:00Z',
    work_item: undefined, // exercises fallback summary path
  },
];

const avatars = new Map<string, string>([
  ['fatima', 'https://example/fatima.png'],
  ['ahmed',  'https://example/ahmed.png'],
]);

function baseArgs(overrides: Partial<Parameters<typeof buildTeamProgramBoardAdapter>[0]> = {}) {
  return {
    board,
    columns,
    cards,
    avatarsByName: avatars,
    search: '',
    onSearchChange: () => {},
    selAssignees: new Set<string>(),
    onSelAssigneesChange: () => {},
    filterSelected: {} as Record<string, string[]>,
    onFilterChange: () => {},
    onClearFilters: () => {},
    groupBy: 'none',
    onGroupByChange: () => {},
    onMoveCard: vi.fn(async () => {}),
    ...overrides,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Tests
   ═══════════════════════════════════════════════════════════════════════ */

describe('deriveColumnDefsFromRows', () => {
  it('sorts by sort_order and uppercases names', () => {
    const defs = deriveColumnDefsFromRows(columns);
    expect(defs.map(d => d.id)).toEqual(['col-todo', 'col-wip', 'col-done']);
    expect(defs.map(d => d.name)).toEqual(['TO DO', 'IN PROGRESS', 'DONE']);
  });

  it('maps ColumnType → canonical category', () => {
    const defs = deriveColumnDefsFromRows(columns);
    expect(defs[0].category).toBe('todo');
    expect(defs[1].category).toBe('in_progress');
    expect(defs[2].category).toBe('done');
  });

  it('uses column id as its own status (identity contract)', () => {
    const defs = deriveColumnDefsFromRows(columns);
    for (const d of defs) expect(d.statuses).toEqual([d.id]);
  });
});

describe('buildTeamProgramBoardAdapter — identity mappings', () => {
  it('statusToColumnId / columnIdToStatus are identity for valid ids', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs());
    expect(a.statusToColumnId('col-todo')).toBe('col-todo');
    expect(a.columnIdToStatus('col-wip')).toBe('col-wip');
  });

  it('statusToColumnId returns null for unknown ids (stale DB reference)', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs());
    expect(a.statusToColumnId('col-ghost')).toBeNull();
    expect(a.columnIdToStatus('col-ghost')).toBeNull();
  });
});

describe('buildTeamProgramBoardAdapter — card mapping', () => {
  it('uses work_item.title when present and falls back to work_item_id otherwise', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs());
    const byId = new Map(a.cards.map(c => [c.id, c]));
    expect(byId.get('c1')!.summary).toBe('Login form');
    expect(byId.get('c4')!.summary).toBe('E-4'); // no work_item → fallback
  });

  it("sets card.status = card.column_id (canonical identity)", () => {
    const a = buildTeamProgramBoardAdapter(baseArgs());
    const byId = new Map(a.cards.map(c => [c.id, c]));
    expect(byId.get('c1')!.status).toBe('col-todo');
    expect(byId.get('c3')!.status).toBe('col-wip');
    expect(byId.get('c4')!.status).toBe('col-done');
  });

  it('surfaces is_blocked as isFlagged + a BLOCKED secondary lozenge', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs());
    const c2 = a.cards.find(c => c.id === 'c2')!;
    expect(c2.isFlagged).toBe(true);
    expect(c2.secondaryLozenge?.label).toBe('BLOCKED');
    expect(c2.secondaryLozenge?.appearance).toBe('removed');
  });

  it('sets metaText from off-track / at-risk health and leaves on-track null', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs());
    const byId = new Map(a.cards.map(c => [c.id, c]));
    expect(byId.get('c1')!.metaText).toBeNull();          // on-track → null
    expect(byId.get('c2')!.metaText).toBe('OFF TRACK');
    expect(byId.get('c3')!.metaText).toBe('AT RISK');
  });

  it('passes issueKey = external_id when present, else work_item_id', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs());
    const byId = new Map(a.cards.map(c => [c.id, c]));
    expect(byId.get('c1')!.issueKey).toBe('S-1');
    expect(byId.get('c4')!.issueKey).toBe('E-4');
  });
});

describe('buildTeamProgramBoardAdapter — col map + sort_order', () => {
  it('cards bucket by column_id via buildColMapFromAdapter', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs());
    const cm = buildColMapFromAdapter(a);
    expect(cm['col-todo'].sort()).toEqual(['c1', 'c2'].sort());
    expect(cm['col-wip']).toEqual(['c3']);
    expect(cm['col-done']).toEqual(['c4']);
  });

  it('respects DB sort_order within a column', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs());
    // c2 (sort_order 1) before c1 (sort_order 2)
    const todoIds = a.cards
      .filter(c => c.status === 'col-todo')
      .map(c => c.id);
    expect(todoIds).toEqual(['c2', 'c1']);
  });
});

describe('buildTeamProgramBoardAdapter — filters', () => {
  it('filters by work_item_type', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs({
      filterSelected: { work_item_type: ['Defect'] },
    }));
    expect(a.cards.map(c => c.id)).toEqual(['c2']);
  });

  it('filters by flow-state (blocked / open)', () => {
    const blockedOnly = buildTeamProgramBoardAdapter(baseArgs({
      filterSelected: { blocked: ['blocked'] },
    }));
    expect(blockedOnly.cards.map(c => c.id)).toEqual(['c2']);

    const openOnly = buildTeamProgramBoardAdapter(baseArgs({
      filterSelected: { blocked: ['open'] },
    }));
    expect(openOnly.cards.map(c => c.id).sort()).toEqual(['c1', 'c3', 'c4']);
  });

  it('filters by assignee name', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs({
      selAssignees: new Set(['Fatima']),
    }));
    expect(a.cards.map(c => c.id).sort()).toEqual(['c1', 'c3']);
  });

  it('filters by health only when rows carry a health field', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs({
      filterSelected: { health: ['off-track'] },
    }));
    expect(a.cards.map(c => c.id)).toEqual(['c2']);
  });

  it('applies search across title + work_item_id + external_id', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs({ search: 'login' }));
    expect(a.cards.map(c => c.id)).toEqual(['c1']);

    const b = buildTeamProgramBoardAdapter(baseArgs({ search: 'd-2' }));
    expect(b.cards.map(c => c.id)).toEqual(['c2']);
  });
});

describe('buildTeamProgramBoardAdapter — filter categories', () => {
  it('surfaces Type / Flow state / Assignee — and Health only when present', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs());
    const ids = a.filterCategories.map(c => c.id);
    expect(ids).toEqual(['work_item_type', 'blocked', 'assignee', 'health']);
  });

  it('hides Health when no card carries a health field', () => {
    const sparse = cards.map(c => ({
      ...c,
      work_item: c.work_item ? { ...c.work_item, health: undefined } : undefined,
    }));
    const a = buildTeamProgramBoardAdapter(baseArgs({ cards: sparse }));
    const ids = a.filterCategories.map(c => c.id);
    expect(ids).toEqual(['work_item_type', 'blocked', 'assignee']);
  });
});

describe('buildTeamProgramBoardAdapter — persistence', () => {
  it('onDrop calls onMoveCard when destColId differs from sourceColId', async () => {
    const onMoveCard = vi.fn();
    const a = buildTeamProgramBoardAdapter(baseArgs({ onMoveCard }));
    await a.persistence.onDrop({
      cardId: 'c1', sourceColId: 'col-todo', destColId: 'col-wip', insertIndex: 0,
    });
    expect(onMoveCard).toHaveBeenCalledWith('c1', 'col-wip');
  });

  it('onDrop is a no-op for same-column reorders (adapter defers order-only moves)', async () => {
    const onMoveCard = vi.fn();
    const a = buildTeamProgramBoardAdapter(baseArgs({ onMoveCard }));
    await a.persistence.onDrop({
      cardId: 'c1', sourceColId: 'col-todo', destColId: 'col-todo', insertIndex: 1,
    });
    expect(onMoveCard).not.toHaveBeenCalled();
  });

  it('onDrop rejects drops onto unknown destination columns', async () => {
    const onMoveCard = vi.fn();
    const a = buildTeamProgramBoardAdapter(baseArgs({ onMoveCard }));
    await a.persistence.onDrop({
      cardId: 'c1', sourceColId: 'col-todo', destColId: 'col-ghost', insertIndex: 0,
    });
    expect(onMoveCard).not.toHaveBeenCalled();
  });

  it('onStatusChange delegates through for valid column ids', async () => {
    const onMoveCard = vi.fn();
    const a = buildTeamProgramBoardAdapter(baseArgs({ onMoveCard }));
    await a.persistence.onStatusChange!('c1', 'col-done');
    expect(onMoveCard).toHaveBeenCalledWith('c1', 'col-done');
  });
});

describe('buildTeamProgramBoardAdapter — misc', () => {
  it('contextKey = board.id so view settings are board-scoped', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs());
    expect(a.contextKey).toBe('board-1');
  });

  it('allAssignees reflects unfiltered owner counts', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs());
    const byName = new Map(a.allAssignees.map(e => [e.name, e.count]));
    expect(byName.get('Fatima')).toBe(2);
    expect(byName.get('Ahmed')).toBe(1);
  });

  it('group-by options include the canonical noneKey', () => {
    const a = buildTeamProgramBoardAdapter(baseArgs());
    expect(a.groupByNoneKey).toBe('none');
    expect(a.groupByOptions[0].key).toBe('none');
  });
});
