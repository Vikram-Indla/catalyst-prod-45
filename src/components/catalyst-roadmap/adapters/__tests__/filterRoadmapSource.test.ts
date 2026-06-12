/**
 * filterRoadmapSource — pure mapper (Step 5 of filter→Roadmap vertical).
 *
 * Contract:
 *   jqlRowsToRoadmapGroups(rows, { dateField, laneBy }) → RoadmapGroup[]
 *
 *   dateField choices: 'due_date' | 'created' | 'updated'
 *     → maps to JqlResultRow fields dueDate | created | updated
 *
 *   laneBy choices: 'status' | 'assignee' | 'issueType' | 'projectKey'
 *     → each distinct value becomes a RoadmapGroup; rows are assigned to their group
 *
 *   V1 — milestone-first (no start_date/end_date on ph_issues):
 *     • row has a date  → RoadmapObjective with start = end = that date (zero-width bar)
 *     • row has no date → placed in a dedicated "Unscheduled" group with sentinel dates
 *
 *   prog (0–100): derived from statusCategory
 *     done         → 100
 *     inprogress   → 50
 *     anything else → 0
 *
 *   status (ObjectiveStatus): derived from statusCategory
 *     done         → 'on-track'
 *     inprogress   → 'on-track'
 *     anything else → 'pending'
 *
 *   Zero-assumption rule (CLAUDE.md P0):
 *     • owner is assigneeName ?? '' (never a fabricated name)
 *     • group name for 'assignee' lane uses assigneeName ?? 'Unassigned'
 *     • no domain-default for unknown statusCategory
 */
import { describe, it, expect } from 'vitest';
import { jqlRowsToRoadmapGroups } from '../filterRoadmapSource';
import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<JqlResultRow> = {}): JqlResultRow {
  return {
    id: 'row-1',
    key: 'BAU-100',
    summary: 'Test issue',
    issueType: 'Story',
    status: 'In Progress',
    statusCategory: 'inprogress',
    projectKey: 'BAU',
    assigneeName: 'Alice',
    priority: 'Medium',
    created: '2026-01-10',
    updated: '2026-03-15',
    dueDate: '2026-04-30',
    parentKey: null,
    parentSummary: null,
    ...overrides,
  };
}

// ── Date field mapping ─────────────────────────────────────────────────────────

describe('jqlRowsToRoadmapGroups — date field selection', () => {
  it('uses dueDate when dateField is due_date', () => {
    const row = makeRow({ dueDate: '2026-05-01', created: '2026-01-01' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    const scheduled = groups.find(g => g.name !== 'Unscheduled');
    expect(scheduled).toBeDefined();
    expect(scheduled!.objs[0].start).toBe('2026-05-01');
    expect(scheduled!.objs[0].end).toBe('2026-05-01');
  });

  it('uses created when dateField is created', () => {
    const row = makeRow({ dueDate: null, created: '2026-02-14' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'created', laneBy: 'status' });
    const scheduled = groups.find(g => g.name !== 'Unscheduled');
    expect(scheduled).toBeDefined();
    expect(scheduled!.objs[0].start).toBe('2026-02-14');
    expect(scheduled!.objs[0].end).toBe('2026-02-14');
  });

  it('uses updated when dateField is updated', () => {
    const row = makeRow({ dueDate: null, updated: '2026-03-20' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'updated', laneBy: 'status' });
    const scheduled = groups.find(g => g.name !== 'Unscheduled');
    expect(scheduled).toBeDefined();
    expect(scheduled!.objs[0].start).toBe('2026-03-20');
    expect(scheduled!.objs[0].end).toBe('2026-03-20');
  });
});

// ── Unscheduled group ─────────────────────────────────────────────────────────

describe('jqlRowsToRoadmapGroups — Unscheduled group', () => {
  it('puts a row with no date into the Unscheduled group', () => {
    const row = makeRow({ dueDate: null });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    const unscheduled = groups.find(g => g.name === 'Unscheduled');
    expect(unscheduled).toBeDefined();
    expect(unscheduled!.objs).toHaveLength(1);
    expect(unscheduled!.objs[0].id).toBe('row-1');
  });

  it('assigns sentinel start and end to unscheduled objectives', () => {
    const row = makeRow({ dueDate: null });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    const obj = groups.find(g => g.name === 'Unscheduled')!.objs[0];
    // Both are the same sentinel value (non-empty strings, far future)
    expect(obj.start).toBeTruthy();
    expect(obj.end).toBeTruthy();
    expect(obj.start).toBe(obj.end);
    // sentinel must sort after any real 2026 date
    expect(obj.start > '2026-12-31').toBe(true);
  });

  it('does not create an Unscheduled group when all rows have dates', () => {
    const row = makeRow({ dueDate: '2026-06-01' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    expect(groups.find(g => g.name === 'Unscheduled')).toBeUndefined();
  });
});

// ── Lane grouping ─────────────────────────────────────────────────────────────

describe('jqlRowsToRoadmapGroups — laneBy grouping', () => {
  it('creates one group per distinct status when laneBy=status', () => {
    const rows = [
      makeRow({ id: 'r1', status: 'In Progress', statusCategory: 'inprogress' }),
      makeRow({ id: 'r2', status: 'Done',        statusCategory: 'done'       }),
      makeRow({ id: 'r3', status: 'In Progress', statusCategory: 'inprogress' }),
    ];
    const groups = jqlRowsToRoadmapGroups(rows, { dateField: 'due_date', laneBy: 'status' });
    const inProgress = groups.find(g => g.name === 'In Progress');
    const done       = groups.find(g => g.name === 'Done');
    expect(inProgress?.objs).toHaveLength(2);
    expect(done?.objs).toHaveLength(1);
  });

  it('creates one group per distinct assigneeName when laneBy=assignee', () => {
    const rows = [
      makeRow({ id: 'r1', assigneeName: 'Alice' }),
      makeRow({ id: 'r2', assigneeName: 'Bob'   }),
      makeRow({ id: 'r3', assigneeName: 'Alice' }),
    ];
    const groups = jqlRowsToRoadmapGroups(rows, { dateField: 'due_date', laneBy: 'assignee' });
    expect(groups.find(g => g.name === 'Alice')?.objs).toHaveLength(2);
    expect(groups.find(g => g.name === 'Bob')?.objs).toHaveLength(1);
  });

  it('groups null assignee into "Unassigned" lane when laneBy=assignee', () => {
    const row = makeRow({ id: 'r1', assigneeName: null });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'assignee' });
    expect(groups.find(g => g.name === 'Unassigned')).toBeDefined();
  });

  it('creates one group per issueType when laneBy=issueType', () => {
    const rows = [
      makeRow({ id: 'r1', issueType: 'Story' }),
      makeRow({ id: 'r2', issueType: 'Task'  }),
    ];
    const groups = jqlRowsToRoadmapGroups(rows, { dateField: 'due_date', laneBy: 'issueType' });
    expect(groups.find(g => g.name === 'Story')).toBeDefined();
    expect(groups.find(g => g.name === 'Task')).toBeDefined();
  });

  it('creates one group per projectKey when laneBy=projectKey', () => {
    const rows = [
      makeRow({ id: 'r1', projectKey: 'BAU' }),
      makeRow({ id: 'r2', projectKey: 'INV' }),
    ];
    const groups = jqlRowsToRoadmapGroups(rows, { dateField: 'due_date', laneBy: 'projectKey' });
    expect(groups.find(g => g.name === 'BAU')).toBeDefined();
    expect(groups.find(g => g.name === 'INV')).toBeDefined();
  });
});

// ── prog derivation ───────────────────────────────────────────────────────────

describe('jqlRowsToRoadmapGroups — prog (progress)', () => {
  it('sets prog=100 for statusCategory=done', () => {
    const row = makeRow({ statusCategory: 'done', dueDate: '2026-06-01' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    const obj = groups.flatMap(g => g.objs)[0];
    expect(obj.prog).toBe(100);
  });

  it('sets prog=50 for statusCategory=inprogress', () => {
    const row = makeRow({ statusCategory: 'inprogress', dueDate: '2026-06-01' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    expect(groups.flatMap(g => g.objs)[0].prog).toBe(50);
  });

  it('sets prog=0 for statusCategory=todo', () => {
    const row = makeRow({ statusCategory: 'todo', dueDate: '2026-06-01' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    expect(groups.flatMap(g => g.objs)[0].prog).toBe(0);
  });

  it('sets prog=0 for unknown statusCategory (zero-assumption)', () => {
    const row = makeRow({ statusCategory: 'whatever', dueDate: '2026-06-01' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    expect(groups.flatMap(g => g.objs)[0].prog).toBe(0);
  });
});

// ── ObjectiveStatus mapping ───────────────────────────────────────────────────

describe('jqlRowsToRoadmapGroups — status (ObjectiveStatus)', () => {
  it('maps done → on-track', () => {
    const row = makeRow({ statusCategory: 'done', dueDate: '2026-06-01' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    expect(groups.flatMap(g => g.objs)[0].status).toBe('on-track');
  });

  it('maps inprogress → on-track', () => {
    const row = makeRow({ statusCategory: 'inprogress', dueDate: '2026-06-01' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    expect(groups.flatMap(g => g.objs)[0].status).toBe('on-track');
  });

  it('maps todo → pending', () => {
    const row = makeRow({ statusCategory: 'todo', dueDate: '2026-06-01' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    expect(groups.flatMap(g => g.objs)[0].status).toBe('pending');
  });

  it('maps unknown statusCategory → pending (zero-assumption)', () => {
    const row = makeRow({ statusCategory: '', dueDate: '2026-06-01' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    expect(groups.flatMap(g => g.objs)[0].status).toBe('pending');
  });
});

// ── RoadmapObjective field mapping ────────────────────────────────────────────

describe('jqlRowsToRoadmapGroups — objective shape', () => {
  it('maps id, name (summary), owner (assigneeName) correctly', () => {
    const row = makeRow({ id: 'abc', summary: 'Ship it', assigneeName: 'Bob', dueDate: '2026-07-01' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    const obj = groups.flatMap(g => g.objs)[0];
    expect(obj.id).toBe('abc');
    expect(obj.name).toBe('Ship it');
    expect(obj.owner).toBe('Bob');
  });

  it('uses empty string for owner when assigneeName is null (zero-assumption)', () => {
    const row = makeRow({ assigneeName: null, dueDate: '2026-07-01' });
    const groups = jqlRowsToRoadmapGroups([row], { dateField: 'due_date', laneBy: 'status' });
    expect(groups.flatMap(g => g.objs)[0].owner).toBe('');
  });

  it('returns empty groups array for empty input', () => {
    expect(jqlRowsToRoadmapGroups([], { dateField: 'due_date', laneBy: 'status' })).toEqual([]);
  });
});
