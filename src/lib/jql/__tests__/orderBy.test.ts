import { describe, it, expect } from 'vitest';
import { parseOrderBy } from '../orderBy';

describe('parseOrderBy', () => {
  it('parses ORDER BY field DESC', () => {
    expect(parseOrderBy('assignee = currentUser() ORDER BY updated DESC')).toEqual({
      column: 'jira_updated_at',
      ascending: false,
    });
  });

  it('parses ORDER BY field ASC', () => {
    expect(parseOrderBy('project = BAU ORDER BY created ASC')).toEqual({
      column: 'jira_created_at',
      ascending: true,
    });
  });

  it('defaults to ascending when direction omitted', () => {
    expect(parseOrderBy('status != Done ORDER BY priority')).toEqual({
      column: 'priority',
      ascending: true,
    });
  });

  it('returns null when no ORDER BY clause', () => {
    expect(parseOrderBy('assignee = currentUser()')).toBeNull();
  });

  it('returns null for unknown fields', () => {
    expect(parseOrderBy('project = BAU ORDER BY rank DESC')).toBeNull();
  });

  it('is case-insensitive on the keyword and field', () => {
    expect(parseOrderBy('project = BAU order by Updated desc')).toEqual({
      column: 'jira_updated_at',
      ascending: false,
    });
  });
});
