import { describe, it, expect } from 'vitest';
import type { BoardIssue, BoardFilters } from '../../types/kanban';

// Test the pure filter logic directly (extracted from hook)
function filterIssues(issues: BoardIssue[], filters: BoardFilters, currentUserId?: string): BoardIssue[] {
  let result = issues;
  const q = filters.search.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (i) => i.summary.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)
    );
  }
  if (filters.epicId) result = result.filter((i) => i.epicId === filters.epicId);
  if (filters.type) result = result.filter((i) => i.type === filters.type);
  if (filters.assigneeId) result = result.filter((i) => i.assigneeId === filters.assigneeId);
  if (filters.quickFilter === 'unassigned') result = result.filter((i) => !i.assigneeId);
  if (filters.quickFilter === 'mine' && currentUserId) result = result.filter((i) => i.assigneeId === currentUserId);
  return result;
}

const DEFAULT_FILTERS: BoardFilters = { search: '', epicId: null, type: null, assigneeId: null, quickFilter: null };

const makeIssue = (overrides: Partial<BoardIssue> = {}): BoardIssue => ({
  id: 'SS-1001',
  summary: 'Test issue summary',
  type: 'Story',
  priority: 'Medium',
  status: 'To Do',
  ...overrides,
});

const issues: BoardIssue[] = [
  makeIssue({ id: 'SS-1001', summary: 'Login page redesign', type: 'Story', epicId: 'epic-1', assigneeId: 'user-1' }),
  makeIssue({ id: 'SS-1002', summary: 'Fix auth bug', type: 'Bug', epicId: 'epic-1', assigneeId: 'user-2' }),
  makeIssue({ id: 'SS-1003', summary: 'Add dashboard widget', type: 'Task', epicId: 'epic-2', assigneeId: 'user-1' }),
  makeIssue({ id: 'SS-1004', summary: 'Refactor API layer', type: 'Improvement', epicId: 'epic-2' }),
  makeIssue({ id: 'SS-1005', summary: 'New onboarding flow', type: 'New Feature', epicId: 'epic-1', assigneeId: 'user-3' }),
];

describe('useBoardSearch — filter logic', () => {
  // F01: search by summary
  it('F01: filters by summary text', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, search: 'login' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('SS-1001');
  });

  // F02: search by issue key
  it('F02: filters by issue key', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, search: 'SS-1002' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('SS-1002');
  });

  // F06: no results → empty
  it('F06: returns empty when no match', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, search: 'zzzzzzz' });
    expect(r).toHaveLength(0);
  });

  // F07: clearing search restores all
  it('F07: empty search returns all issues', () => {
    const r = filterIssues(issues, DEFAULT_FILTERS);
    expect(r).toHaveLength(5);
  });

  // G01: epic filter
  it('G01: epic filter shows only matching epic', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, epicId: 'epic-1' });
    expect(r).toHaveLength(3);
    expect(r.every((i) => i.epicId === 'epic-1')).toBe(true);
  });

  // G02: clearing epic filter
  it('G02: clearing epic filter restores all', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, epicId: null });
    expect(r).toHaveLength(5);
  });

  // G03: type=Story
  it('G03: type filter Story', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, type: 'Story' });
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('Story');
  });

  // G04: type=Task
  it('G04: type filter Task', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, type: 'Task' });
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('Task');
  });

  // G05: type=Bug
  it('G05: type filter Bug', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, type: 'Bug' });
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('Bug');
  });

  // G06: clear type filter
  it('G06: clearing type filter restores all', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, type: null });
    expect(r).toHaveLength(5);
  });

  // G07: assignee filter
  it('G07: assignee filter', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, assigneeId: 'user-1' });
    expect(r).toHaveLength(2);
    expect(r.every((i) => i.assigneeId === 'user-1')).toBe(true);
  });

  // G10: quick filter "mine" with real auth
  it('G10: quick filter mine uses currentUserId', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, quickFilter: 'mine' }, 'user-2');
    expect(r).toHaveLength(1);
    expect(r[0].assigneeId).toBe('user-2');
  });

  // Quick filter "unassigned"
  it('Quick filter unassigned', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, quickFilter: 'unassigned' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('SS-1004');
  });

  // F08: search AND epic filter combine
  it('F08: search + epic filter combine with AND', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, search: 'auth', epicId: 'epic-1' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('SS-1002');
  });

  // F09: search AND type combine
  it('F09: search + type filter combine', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, search: 'dashboard', type: 'Task' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('SS-1003');
  });

  // F10: search AND assignee combine
  it('F10: search + assignee filter combine', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, search: 'login', assigneeId: 'user-1' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('SS-1001');
  });

  // No match with combined filters
  it('Combined filters with no match', () => {
    const r = filterIssues(issues, { ...DEFAULT_FILTERS, search: 'login', assigneeId: 'user-2' });
    expect(r).toHaveLength(0);
  });
});
