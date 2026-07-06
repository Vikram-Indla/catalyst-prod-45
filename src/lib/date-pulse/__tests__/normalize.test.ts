import { describe, it, expect } from 'vitest';
import { normalizeIssueTypeBucket, normalizeWorkStatus } from '../normalize';
import { computeDatePulseViolations } from '../DatePulseEngine';
import type { BusinessRequest, WorkItem } from '@/types/date-pulse';

/**
 * These tests use REALISTIC Title-Case source values exactly as ph_issues
 * stores them (issue_type = 'Epic'/'QA Bug', status = 'Done'/'Blocked',
 * status_category = 'done'/'in_progress'/'todo'). They lock the normalization
 * boundary that the mappers rely on — the engines themselves are tested with
 * already-normalized lowercase input in the sibling engine test files.
 */

describe('normalizeIssueTypeBucket — Title-Case ph_issues values', () => {
  it('maps real DB issue_type display values to lowercase buckets', () => {
    expect(normalizeIssueTypeBucket('Epic')).toBe('epic');
    expect(normalizeIssueTypeBucket('Story')).toBe('story');
    expect(normalizeIssueTypeBucket('QA Bug')).toBe('defect');
    expect(normalizeIssueTypeBucket('Production Incident')).toBe('incident');
    expect(normalizeIssueTypeBucket('Task')).toBe('task');
  });

  it('returns null for missing / unrecognized types (zero-assumption)', () => {
    expect(normalizeIssueTypeBucket(null)).toBeNull();
    expect(normalizeIssueTypeBucket(undefined)).toBeNull();
    expect(normalizeIssueTypeBucket('')).toBeNull();
    expect(normalizeIssueTypeBucket('Wibble')).toBeNull();
  });
});

describe('normalizeWorkStatus — display status + status_category', () => {
  it('buckets from status_category (the authoritative lowercase column)', () => {
    expect(normalizeWorkStatus('Done', 'done')).toBe('done');
    expect(normalizeWorkStatus('Ready for QA', 'done')).toBe('done');
    expect(normalizeWorkStatus('In Progress', 'in_progress')).toBe('in_progress');
    expect(normalizeWorkStatus('Backlog', 'todo')).toBe('todo');
    expect(normalizeWorkStatus('To Do', 'todo')).toBe('todo');
  });

  it("derives blocked from display status 'Blocked' (no status_category exists for it)", () => {
    expect(normalizeWorkStatus('Blocked', 'todo')).toBe('blocked');
    expect(normalizeWorkStatus('Blocked', 'in_progress')).toBe('blocked');
  });

  it("does NOT treat 'On Hold' as blocked (product decision 2026-07-03)", () => {
    expect(normalizeWorkStatus('On Hold', 'todo')).toBe('todo');
  });

  it('returns null when neither a valid category nor a display status is present', () => {
    expect(normalizeWorkStatus(null, null)).toBeNull();
    expect(normalizeWorkStatus('Something Odd', null)).toBeNull();
    expect(normalizeWorkStatus('Something Odd', 'nonsense')).toBeNull();
  });
});

// ── Regression: the actual bugs, expressed end-to-end through the engine ──────

const BR: BusinessRequest = {
  id: 'br-1',
  request_key: 'MDT-1',
  status: 'active',
  end_date: '2026-01-01', // in the past → due-after-target is easy to trigger
  release_id: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

function workFromDbRow(row: { issue_type: string; status: string; status_category: string; due_date: string }): WorkItem {
  return {
    id: 'w-' + row.issue_type,
    issue_key: 'MDT-' + row.issue_type,
    issue_type: normalizeIssueTypeBucket(row.issue_type),
    project_key: 'MDT',
    status: normalizeWorkStatus(row.status, row.status_category),
    due_date: row.due_date,
    severity: null,
    parent_key: null,
    sprint_id: null,
    business_request_id: 'br-1',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
  };
}

describe('BUG 1 — epic exclusion (B3 Story After BR Target)', () => {
  it('does NOT flag a Title-Case Epic as "Story After BR Target"', () => {
    const epic = workFromDbRow({ issue_type: 'Epic', status: 'In Progress', status_category: 'in_progress', due_date: '2026-06-01' });
    const violations = computeDatePulseViolations(BR, [epic], null);
    // B3 must be suppressed for epics; B5 (Epic After BR Target) is the correct rule
    expect(violations.some(v => v.rule_id === 'B3')).toBe(false);
    expect(violations.some(v => v.rule_id === 'B5')).toBe(true);
  });

  it('DOES flag a Title-Case Story as "Story After BR Target"', () => {
    const story = workFromDbRow({ issue_type: 'Story', status: 'In Progress', status_category: 'in_progress', due_date: '2026-06-01' });
    const violations = computeDatePulseViolations(BR, [story], null);
    expect(violations.some(v => v.rule_id === 'B3')).toBe(true);
    expect(violations.some(v => v.rule_id === 'B5')).toBe(false);
  });
});

describe('BUG 2 — done_count / blocked from realistic status source', () => {
  it("counts a 'Done' display status (category done) as done, not in-progress", () => {
    const done = workFromDbRow({ issue_type: 'Story', status: 'Done', status_category: 'done', due_date: '2025-12-01' });
    expect(done.status).toBe('done');
    // Overdue rule D2 must NOT fire for done items even though due_date is past
    const violations = computeDatePulseViolations(BR, [done], null);
    expect(violations.some(v => v.rule_id === 'D2')).toBe(false);
  });

  it("detects a 'Blocked' display status and fires D4 when overdue", () => {
    const blocked = workFromDbRow({ issue_type: 'Story', status: 'Blocked', status_category: 'todo', due_date: '2025-12-01' });
    expect(blocked.status).toBe('blocked');
    const violations = computeDatePulseViolations(BR, [blocked], null);
    expect(violations.some(v => v.rule_id === 'D4')).toBe(true);
  });
});
