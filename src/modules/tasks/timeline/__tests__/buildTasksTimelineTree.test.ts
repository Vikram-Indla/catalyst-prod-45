/**
 * Tests for buildTasksTimelineTree — pure tree builder for the Tasks
 * Hub timeline. Pins the contract the view depends on.
 */
import { describe, it, expect } from 'vitest';
import { buildTasksTimelineTree } from '../buildTasksTimelineTree';
import type { PlannerTask } from '@/modules/tasks/types';
import type { Workstream } from '@/modules/tasks/hooks/useTaskWorkstreams';

function makeTask(overrides: Partial<PlannerTask>): PlannerTask {
  return {
    id: 't1',
    key: 'TSK-1',
    title: 'Task 1',
    status: 'planned',
    type: 'task',
    priority: 'medium',
    blocked: false,
    progress: 0,
    comments: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    parentTaskId: null,
    ...overrides,
  };
}

function makeWs(overrides: Partial<Workstream>): Workstream {
  return {
    id: 'ws1',
    name: 'Catalyst',
    slug: 'catalyst',
    description: null,
    color: 'var(--ds-link, #1868DB)',
    icon: null,
    sort_order: 0,
    is_active: true,
    is_archived: false,
    lead_id: null,
    start_date: null,
    due_date: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    key_prefix: 'CAT',
    ...overrides,
  };
}

describe('buildTasksTimelineTree', () => {
  it('returns empty tree for empty inputs', () => {
    expect(buildTasksTimelineTree([], [])).toEqual([]);
  });

  it('renders a workstream group with its root tasks as children', () => {
    const tasks = [
      makeTask({ id: 't1', key: 'TSK-1', teamId: 'ws1' }),
      makeTask({ id: 't2', key: 'TSK-2', teamId: 'ws1' }),
    ];
    const tree = buildTasksTimelineTree(tasks, [makeWs({})]);
    expect(tree).toHaveLength(1);
    const group = tree[0];
    expect(group.isGroup).toBe(true);
    expect(group.summary).toBe('Catalyst');
    expect(group.issueType).toBe('Epic');
    expect(group.children).toHaveLength(2);
    expect(group.children.map(c => c.issueKey).sort()).toEqual(['TSK-1', 'TSK-2']);
  });

  it('nests subtasks under their parent', () => {
    const tasks = [
      makeTask({ id: 'parent', key: 'TSK-P', teamId: 'ws1' }),
      makeTask({ id: 'child', key: 'TSK-C', teamId: 'ws1', parentTaskId: 'parent' }),
    ];
    const tree = buildTasksTimelineTree(tasks, [makeWs({})]);
    expect(tree[0].children).toHaveLength(1); // only parent is root
    const parent = tree[0].children[0];
    expect(parent.issueKey).toBe('TSK-P');
    expect(parent.children).toHaveLength(1);
    expect(parent.children[0].issueKey).toBe('TSK-C');
    expect(parent.children[0].parentKey).toBe('TSK-P');
  });

  it('promotes orphan subtasks (parent not in input) to root', () => {
    const tasks = [
      // parent_task_id points to a task NOT in this input
      makeTask({ id: 'child', key: 'TSK-C', teamId: 'ws1', parentTaskId: 'missing-parent' }),
    ];
    const tree = buildTasksTimelineTree(tasks, [makeWs({})]);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].issueKey).toBe('TSK-C');
    // parentKey stays null because the parent couldn't be linked.
    expect(tree[0].children[0].parentKey).toBeNull();
  });

  it('groups tasks with no workstream under "Unassigned"', () => {
    const tasks = [makeTask({ id: 't1', key: 'TSK-1', teamId: undefined })];
    const tree = buildTasksTimelineTree(tasks, [makeWs({})]);
    expect(tree).toHaveLength(1);
    expect(tree[0].summary).toBe('Unassigned');
    expect(tree[0].children).toHaveLength(1);
  });

  it('skips workstreams with zero tasks', () => {
    const tasks = [makeTask({ id: 't1', key: 'TSK-1', teamId: 'ws1' })];
    const workstreams = [
      makeWs({ id: 'ws1', name: 'A' }),
      makeWs({ id: 'ws2', name: 'B' }),
    ];
    const tree = buildTasksTimelineTree(tasks, workstreams);
    expect(tree).toHaveLength(1);
    expect(tree[0].summary).toBe('A');
  });

  it('maps status slug to canonical statusCategory', () => {
    const tasks = [
      makeTask({ id: 't1', key: 'TSK-1', teamId: 'ws1', status: 'done' }),
      makeTask({ id: 't2', key: 'TSK-2', teamId: 'ws1', status: 'in-progress' }),
      makeTask({ id: 't3', key: 'TSK-3', teamId: 'ws1', status: 'backlog' }),
    ];
    const tree = buildTasksTimelineTree(tasks, [makeWs({})]);
    const byKey = new Map(tree[0].children.map(c => [c.issueKey, c]));
    expect(byKey.get('TSK-1')!.statusCategory).toBe('done');
    expect(byKey.get('TSK-2')!.statusCategory).toBe('progress');
    expect(byKey.get('TSK-3')!.statusCategory).toBe('default');
  });

  it('respects workstream sort_order for group ordering', () => {
    const tasks = [
      makeTask({ id: 't1', key: 'TSK-1', teamId: 'ws-b' }),
      makeTask({ id: 't2', key: 'TSK-2', teamId: 'ws-a' }),
    ];
    const workstreams = [
      makeWs({ id: 'ws-a', name: 'A', sort_order: 10 }),
      makeWs({ id: 'ws-b', name: 'B', sort_order: 5 }),
    ];
    const tree = buildTasksTimelineTree(tasks, workstreams);
    expect(tree.map(g => g.summary)).toEqual(['B', 'A']);
  });
});
