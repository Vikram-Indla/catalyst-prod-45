import { describe, it, expect } from 'vitest';
import { TASKS_LIST_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from '../tasksListColumns';

describe('tasksListColumns', () => {
  it('exports the canonical column set with the correct order', () => {
    const ids = TASKS_LIST_COLUMNS.map((c) => c.id);
    expect(ids).toEqual([
      '__drag', 'key', 'summary', 'status', 'priority',
      'assignee', 'workstream', 'due_date',
      'created_at', 'updated_at', 'start_date', 'progress', 'blocked', 'description',
      '__menu',
    ]);
  });

  it('marks the 9 default-visible columns', () => {
    const visible = TASKS_LIST_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);
    expect(visible).toEqual([
      '__drag', 'key', 'summary', 'status', 'priority',
      'assignee', 'workstream', 'due_date', '__menu',
    ]);
  });

  it('keeps DEFAULT_VISIBLE_COLUMNS in sync with defaultVisible flags', () => {
    const flagged = TASKS_LIST_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);
    expect(DEFAULT_VISIBLE_COLUMNS).toEqual(flagged);
  });
});
