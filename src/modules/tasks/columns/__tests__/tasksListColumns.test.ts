import { describe, it, expect } from 'vitest';
import {
  buildTasksListColumns,
  DEFAULT_VISIBLE_COLUMNS,
  type TasksListColumnArgs,
} from '../tasksListColumns';

function makeNoopArgs(): TasksListColumnArgs {
  return {
    onOpen: () => {},
    getHref: () => '#',
    statusOptions: [],
    assigneeOptions: [],
    workstreamOptions: [],
    onCellEdit: async () => {},
    onRowDelete: async () => {},
  };
}

describe('tasksListColumns', () => {
  const columns = buildTasksListColumns(makeNoopArgs());

  it('exports the canonical column set with the correct order', () => {
    const ids = columns.map((c) => c.id);
    expect(ids).toEqual([
      '__drag', 'key', 'summary', 'status', 'priority',
      'assignee', 'workstream', 'due_date',
      'created_at', 'updated_at', 'start_date', 'progress', 'blocked', 'description',
      '__menu',
    ]);
  });

  it('marks the 9 default-visible columns', () => {
    const visible = columns.filter((c) => c.defaultVisible).map((c) => c.id);
    expect(visible).toEqual([
      '__drag', 'key', 'summary', 'status', 'priority',
      'assignee', 'workstream', 'due_date', '__menu',
    ]);
  });

  it('keeps DEFAULT_VISIBLE_COLUMNS in sync with defaultVisible flags', () => {
    const flagged = columns.filter((c) => c.defaultVisible).map((c) => c.id);
    expect(DEFAULT_VISIBLE_COLUMNS).toEqual(flagged);
  });
});
