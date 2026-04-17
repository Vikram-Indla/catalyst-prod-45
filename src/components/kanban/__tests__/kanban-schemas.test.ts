/**
 * Unit tests for the Kanban V2 boundary schemas + URL parser.
 *
 * Pure functions — no React, no router, no Supabase required.
 * Pins the exact shape the board accepts so a malformed shared link
 * or aborted-drag status-change can't corrupt board state.
 */
import { describe, it, expect } from 'vitest';
import {
  filterStateSchema,
  statusChangeSchema,
  groupBySchema,
  parseSearchParams,
} from '../kanban-schemas';

describe('groupBySchema', () => {
  it('accepts all five canonical modes', () => {
    (['none', 'assignee', 'epic', 'priority', 'fixVersion'] as const).forEach((m) => {
      expect(groupBySchema.safeParse(m).success).toBe(true);
    });
  });

  it('rejects unknown modes', () => {
    expect(groupBySchema.safeParse('sprint').success).toBe(false);
    expect(groupBySchema.safeParse('').success).toBe(false);
  });
});

describe('filterStateSchema', () => {
  it('accepts a fully-populated state', () => {
    const r = filterStateSchema.safeParse({
      search: 'login',
      group: 'assignee',
      assignees: ['Alice', 'Bob'],
      epics: ['PROJ-1'],
      types: ['Story', 'Bug'],
      priorities: ['High', 'Medium'],
    });
    expect(r.success).toBe(true);
  });

  it('defaults missing fields', () => {
    const r = filterStateSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.search).toBe('');
      expect(r.data.group).toBe('none');
      expect(r.data.assignees).toEqual([]);
      expect(r.data.epics).toEqual([]);
      expect(r.data.types).toEqual([]);
      expect(r.data.priorities).toEqual([]);
    }
  });

  it('rejects invalid priority enum values', () => {
    const r = filterStateSchema.safeParse({ priorities: ['Blocker'] });
    expect(r.success).toBe(false);
  });

  it('accepts arbitrary epic / type strings (open enum)', () => {
    const r = filterStateSchema.safeParse({
      epics: ['EPIC-FOO-123', 'anything'],
      types: ['Custom Issue Type'],
    });
    expect(r.success).toBe(true);
  });
});

describe('statusChangeSchema', () => {
  it('accepts a well-formed payload', () => {
    const r = statusChangeSchema.safeParse({ issueId: 'abc-123', newStatus: 'In Progress' });
    expect(r.success).toBe(true);
  });

  it('rejects empty issueId', () => {
    expect(statusChangeSchema.safeParse({ issueId: '', newStatus: 'Done' }).success).toBe(false);
  });

  it('rejects empty newStatus', () => {
    expect(statusChangeSchema.safeParse({ issueId: 'abc', newStatus: '' }).success).toBe(false);
  });
});

describe('parseSearchParams', () => {
  it('hydrates a full URL-encoded state', () => {
    const p = new URLSearchParams(
      'search=sso&group=epic&assignees=Alice,Bob&epics=PROJ-1&types=Story,Bug&priorities=High,Medium',
    );
    const s = parseSearchParams(p);
    expect(s.search).toBe('sso');
    expect(s.group).toBe('epic');
    expect(s.assignees).toEqual(['Alice', 'Bob']);
    expect(s.epics).toEqual(['PROJ-1']);
    expect(s.types).toEqual(['Story', 'Bug']);
    expect(s.priorities).toEqual(['High', 'Medium']);
  });

  it('returns defaults for empty params', () => {
    const s = parseSearchParams(new URLSearchParams());
    expect(s).toEqual({
      search: '',
      group: 'none',
      assignees: [],
      epics: [],
      types: [],
      priorities: [],
    });
  });

  it('drops empty list entries', () => {
    const p = new URLSearchParams('assignees=,,Alice,,');
    const s = parseSearchParams(p);
    expect(s.assignees).toEqual(['Alice']);
  });

  it('falls back to defaults on invalid group', () => {
    // Unknown group fails Zod → parseSearchParams returns defaults.
    const p = new URLSearchParams('group=sprint');
    const s = parseSearchParams(p);
    expect(s.group).toBe('none');
  });

  it('falls back to defaults on invalid priority', () => {
    const p = new URLSearchParams('priorities=Blocker,High');
    const s = parseSearchParams(p);
    // Zod rejects — parseSearchParams returns all-default state.
    expect(s.priorities).toEqual([]);
  });
});
