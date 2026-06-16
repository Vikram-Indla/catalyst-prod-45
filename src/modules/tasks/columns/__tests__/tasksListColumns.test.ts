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
    rowActions: [],
  };
}

describe('tasksListColumns', () => {
  const columns = buildTasksListColumns(makeNoopArgs());

  it('exports the canonical column set with the correct order (Project Hub backlog parity)', () => {
    const ids = columns.map((c) => c.id);
    // Mirrors Project Hub backlog column order: single combined "Work" cell
    // (key+summary), then workstream (Tasks analog of parent), status,
    // assignee, priority, due_date, __actions. NO __drag, NO standalone
    // summary, NO created/updated placeholders.
    expect(ids).toEqual([
      'key',
      'workstream',
      'status',
      'assignee',
      'priority',
      'due_date',
      '__actions',
    ]);
  });

  it('marks 4 default-visible columns matching Project Hub backlog default', () => {
    const visible = columns.filter((c) => c.defaultVisible).map((c) => c.id);
    expect(visible).toEqual([
      'key',
      'workstream',
      'status',
      'assignee',
    ]);
  });

  it('keeps DEFAULT_VISIBLE_COLUMNS in sync with defaultVisible flags', () => {
    const flagged = columns.filter((c) => c.defaultVisible).map((c) => c.id);
    expect(DEFAULT_VISIBLE_COLUMNS).toEqual(flagged);
  });

  it('marks key as flex + alwaysVisible (combined Work cell)', () => {
    const key = columns.find((c) => c.id === 'key');
    expect(key).toBeDefined();
    expect(key?.flex).toBe(true);
    expect(key?.alwaysVisible).toBe(true);
    expect(key?.label).toBe('Work');
  });

  it('marks __actions as alwaysVisible (always shows ⋯ menu)', () => {
    const actions = columns.find((c) => c.id === '__actions');
    expect(actions).toBeDefined();
    expect(actions?.alwaysVisible).toBe(true);
    expect(actions?.label).toBe('');
  });
});
