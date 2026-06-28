import { describe, it, expect } from 'vitest';
import { mapTasksToRows } from '../useTasksTableData';
import type { PlannerTask } from '@/modules/tasks/types';

describe('mapTasksToRows', () => {
  it('returns an empty array for empty input', () => {
    expect(mapTasksToRows([])).toEqual([]);
  });

  it('preserves PlannerTask shape as JiraTable rows (passthrough)', () => {
    // JiraTable accepts PlannerTask directly because the column registry
    // (Task 1.2) reads PlannerTask fields by camelCase name. The mapper is
    // intentionally a passthrough for v1; this test pins that contract so
    // any future schema drift is caught.
    const tasks: PlannerTask[] = [
      {
        id: 't1',
        key: 'PLN-1',
        title: 'Test',
        status: 'backlog',
        type: 'task',
        priority: 'high',
        assigneeId: undefined,
        teamId: 'w1',
        teamName: 'Workstream A',
        teamColor: 'var(--ds-text-danger, #ff0000)',
        dueDate: undefined,
        startDate: undefined,
        blocked: false,
        progress: 0,
        comments: 0,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
    const rows = mapTasksToRows(tasks);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('t1');
    expect(rows[0].key).toBe('PLN-1');
    expect(rows[0].title).toBe('Test');
    expect(rows[0].status).toBe('backlog');
    expect(rows[0].teamId).toBe('w1');
  });
});
