/**
 * Tests for the pure transformations in tasksKanbanSource.
 *
 * Hooks (useTasksKanbanSource / useTasksKanbanMutations) are integration-
 * tested via the TasksBoardView smoke tests; this file pins the
 * data-shaping contracts the view depends on.
 */
import { describe, it, expect } from 'vitest';
import {
  categoryForStatusSlug,
  mapStatusesToColumns,
  mapPlannerTaskToBoardIssue,
  buildColMap,
  buildAvatarsByName,
  buildAllAssignees,
  buildAssigneeOptions,
} from '../tasksKanbanSource';
import type { PlannerTask, PlannerUser } from '@/modules/tasks/types';
import type { PlannerStatus } from '@/modules/tasks/hooks/useTaskStatuses';
import type { BoardIssue } from '@/components/kanban/kanban-types';

describe('categoryForStatusSlug', () => {
  it('maps done-family slugs to "done"', () => {
    expect(categoryForStatusSlug('done')).toBe('done');
    expect(categoryForStatusSlug('Done')).toBe('done');
    expect(categoryForStatusSlug('closed')).toBe('done');
    expect(categoryForStatusSlug('complete')).toBe('done');
  });

  it('maps progress/review slugs to "in_progress"', () => {
    expect(categoryForStatusSlug('in-progress')).toBe('in_progress');
    expect(categoryForStatusSlug('in_progress')).toBe('in_progress');
    expect(categoryForStatusSlug('review')).toBe('in_progress');
    expect(categoryForStatusSlug('qa')).toBe('in_progress');
    expect(categoryForStatusSlug('testing')).toBe('in_progress');
  });

  it('defaults unknown/backlog/planned slugs to "todo"', () => {
    expect(categoryForStatusSlug('backlog')).toBe('todo');
    expect(categoryForStatusSlug('planned')).toBe('todo');
    expect(categoryForStatusSlug('something-new')).toBe('todo');
    expect(categoryForStatusSlug('')).toBe('todo');
  });
});

describe('mapStatusesToColumns', () => {
  // Fixture color values intentionally use ADS tokens — the column mapper
  // doesn't transform color, but linting bans bare hex even in tests.
  const statuses: PlannerStatus[] = [
    { id: 's-2', slug: 'in-progress', name: 'In Progress', color: 'var(--ds-text-subtle)', order: 2 },
    { id: 's-0', slug: 'backlog', name: 'Backlog', color: 'var(--ds-text-subtle)', order: 0 },
    { id: 's-3', slug: 'done', name: 'Done', color: 'var(--ds-text-subtle)', order: 3 },
    { id: 's-1', slug: 'planned', name: 'Planned', color: 'var(--ds-text-subtle)', order: 1 },
  ];

  it('returns one column per status', () => {
    const cols = mapStatusesToColumns(statuses);
    expect(cols).toHaveLength(4);
  });

  it('sorts columns by `order`', () => {
    const cols = mapStatusesToColumns(statuses);
    expect(cols.map((c) => c.id)).toEqual(['s-0', 's-1', 's-2', 's-3']);
  });

  it('sets column.id = status.id and statuses = [slug]', () => {
    const cols = mapStatusesToColumns(statuses);
    const backlog = cols[0];
    expect(backlog.id).toBe('s-0');
    expect(backlog.name).toBe('Backlog');
    expect(backlog.statuses).toEqual(['backlog']);
  });

  it('classifies category from slug', () => {
    const cols = mapStatusesToColumns(statuses);
    expect(cols.find((c) => c.id === 's-0')!.category).toBe('todo');
    expect(cols.find((c) => c.id === 's-1')!.category).toBe('todo');
    expect(cols.find((c) => c.id === 's-2')!.category).toBe('in_progress');
    expect(cols.find((c) => c.id === 's-3')!.category).toBe('done');
  });

  it('returns an empty array when input is empty', () => {
    expect(mapStatusesToColumns([])).toEqual([]);
  });
});

describe('mapPlannerTaskToBoardIssue', () => {
  const baseTask: PlannerTask = {
    id: 't1',
    key: 'PLN-1',
    title: 'Wire the toolbar',
    description: '',
    status: 'in-progress',
    type: 'task',
    priority: 'high',
    assigneeId: 'u1',
    assigneeName: 'Alex Doe',
    teamId: 'ws-1',
    teamName: 'Catalyst',
    teamColor: 'var(--ds-text-brand)',
    dueDate: '2026-07-01',
    blocked: false,
    progress: 0,
    comments: 0,
    createdAt: '2026-06-10T00:00:00Z',
    updatedAt: '2026-06-16T00:00:00Z',
  };

  it('passes through id / summary / priority / status', () => {
    const issue = mapPlannerTaskToBoardIssue(baseTask);
    expect(issue.id).toBe('t1');
    expect(issue.issueKey).toBe('PLN-1');
    expect(issue.summary).toBe('Wire the toolbar');
    expect(issue.priority).toBe('high');
    expect(issue.status).toBe('in-progress');
  });

  it('sets issueType to "" (zero-assumption: never lies a Jira type for a Task)', () => {
    const issue = mapPlannerTaskToBoardIssue(baseTask);
    expect(issue.issueType).toBe('');
  });

  it('threads assignee name through (no avatar — that lives in avatarsByName)', () => {
    const issue = mapPlannerTaskToBoardIssue(baseTask);
    expect(issue.assigneeName).toBe('Alex Doe');
  });

  it('renders Jira-only fields as neutral nulls/empty arrays', () => {
    const issue = mapPlannerTaskToBoardIssue(baseTask);
    expect(issue.sprintName).toBeNull();
    expect(issue.storyPoints).toBeNull();
    expect(issue.parentKey).toBeNull();
    expect(issue.parentSummary).toBeNull();
    expect(issue.fixVersion).toBeNull();
    expect(issue.labels).toEqual([]);
  });

  it('handles missing assignee gracefully (null, not "Unassigned" lie)', () => {
    const unassigned: PlannerTask = { ...baseTask, assigneeName: undefined };
    const issue = mapPlannerTaskToBoardIssue(unassigned);
    expect(issue.assigneeName).toBeNull();
  });

  it('passes labels through from task.tags when present', () => {
    const tagged: PlannerTask = { ...baseTask, tags: ['urgent', 'platform'] };
    const issue = mapPlannerTaskToBoardIssue(tagged);
    expect(issue.labels).toEqual(['urgent', 'platform']);
  });
});

describe('buildColMap', () => {
  const issues: BoardIssue[] = [
    { ...emptyBoardIssue(), id: 'a', status: 'backlog' },
    { ...emptyBoardIssue(), id: 'b', status: 'in-progress' },
    { ...emptyBoardIssue(), id: 'c', status: 'in-progress' },
    { ...emptyBoardIssue(), id: 'd', status: 'done' },
  ];

  const statusBySlug = new Map([
    ['backlog', 'col-todo'],
    ['in-progress', 'col-doing'],
    ['done', 'col-done'],
  ]);

  it('groups issues by column id and preserves order within each column', () => {
    const map = buildColMap(issues, statusBySlug);
    expect(map['col-todo']).toEqual(['a']);
    expect(map['col-doing']).toEqual(['b', 'c']);
    expect(map['col-done']).toEqual(['d']);
  });

  it('omits columns with no issues (no empty array entries)', () => {
    const subset: BoardIssue[] = [{ ...emptyBoardIssue(), id: 'x', status: 'done' }];
    const map = buildColMap(subset, statusBySlug);
    expect(map['col-done']).toEqual(['x']);
    expect(map['col-todo']).toBeUndefined();
    expect(map['col-doing']).toBeUndefined();
  });

  it('silently drops issues with an unknown status (no default column)', () => {
    const orphaned: BoardIssue[] = [
      { ...emptyBoardIssue(), id: 'a', status: 'backlog' },
      { ...emptyBoardIssue(), id: 'lost', status: 'wat-is-this' },
    ];
    const map = buildColMap(orphaned, statusBySlug);
    expect(map['col-todo']).toEqual(['a']);
    // Critical: NO fallback column receives the orphan
    expect(Object.values(map).flat()).not.toContain('lost');
  });

  it('returns {} when input is empty', () => {
    expect(buildColMap([], statusBySlug)).toEqual({});
  });
});

describe('buildAvatarsByName', () => {
  const users: PlannerUser[] = [
    { id: 'u1', name: 'Alex Doe', initials: 'AD', role: 'PM', team: 'A', online: false, avatarUrl: 'https://x/a.png' },
    { id: 'u2', name: 'Beth Roe', initials: 'BR', role: 'Eng', team: 'A', online: false, avatarUrl: undefined },
    { id: 'u3', name: 'Cara Voe', initials: 'CV', role: 'Eng', team: 'A', online: false, avatarUrl: 'https://x/c.png' },
  ];

  it('lowercases the name keys', () => {
    const map = buildAvatarsByName(users);
    expect(map.get('alex doe')).toBe('https://x/a.png');
    expect(map.get('cara voe')).toBe('https://x/c.png');
  });

  it('drops users with no avatarUrl', () => {
    const map = buildAvatarsByName(users);
    expect(map.has('beth roe')).toBe(false);
  });
});

describe('buildAllAssignees', () => {
  it('counts tasks per assignee and sorts descending', () => {
    const issues: BoardIssue[] = [
      { ...emptyBoardIssue(), id: 'a', assigneeName: 'Alex' },
      { ...emptyBoardIssue(), id: 'b', assigneeName: 'Alex' },
      { ...emptyBoardIssue(), id: 'c', assigneeName: 'Beth' },
      { ...emptyBoardIssue(), id: 'd', assigneeName: 'Alex' },
    ];
    expect(buildAllAssignees(issues)).toEqual([
      { name: 'Alex', count: 3 },
      { name: 'Beth', count: 1 },
    ]);
  });

  it('drops issues with no assignee from the counts', () => {
    const issues: BoardIssue[] = [
      { ...emptyBoardIssue(), id: 'a', assigneeName: 'Alex' },
      { ...emptyBoardIssue(), id: 'b', assigneeName: null },
    ];
    expect(buildAllAssignees(issues)).toEqual([{ name: 'Alex', count: 1 }]);
  });
});

describe('buildAssigneeOptions', () => {
  it('maps PlannerUser[] to AssigneeOption[] preserving name + avatarUrl + email', () => {
    const users: PlannerUser[] = [
      { id: 'u1', name: 'Alex Doe', initials: 'AD', role: 'PM', team: 'A', online: false, avatarUrl: 'https://x/a.png', email: 'a@x.io' },
      { id: 'u2', name: 'Beth Roe', initials: 'BR', role: 'Eng', team: 'A', online: false },
    ];
    const opts = buildAssigneeOptions(users);
    expect(opts).toEqual([
      { name: 'Alex Doe', avatarUrl: 'https://x/a.png', email: 'a@x.io' },
      { name: 'Beth Roe', avatarUrl: null, email: null },
    ]);
  });
});

/* Helper: a minimal BoardIssue for the colMap / assignee tests that don't
   care about every field. mapPlannerTaskToBoardIssue tests cover the full
   shape. */
function emptyBoardIssue(): BoardIssue {
  return {
    id: '',
    issueKey: '',
    summary: '',
    issueType: '',
    priority: '',
    status: '',
    statusCategory: '',
    assigneeName: null,
    labels: [],
    sprintName: null,
    storyPoints: null,
    parentKey: null,
    parentSummary: null,
    fixVersion: null,
    isFlagged: false,
    updatedAt: null,
    createdAt: null,
  };
}
