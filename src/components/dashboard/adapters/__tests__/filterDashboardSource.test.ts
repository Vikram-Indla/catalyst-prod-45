/**
 * filterDashboardSource — Jira-summary-parity metrics aggregator
 *
 * Contract (this test is the spec — implementation follows):
 *   - jqlRowsToDashboardMetrics is pure and side-effect free.
 *   - ZERO-ASSUMPTION rule (CLAUDE.md P0): a missing field is never replaced
 *     by a plausible-sounding domain default:
 *       · null updated    → NOT counted in completedLast7 / updatedLast7
 *       · null created    → NOT counted in createdLast7
 *       · null dueDate    → NOT counted in dueSoon
 *       · null priority   → bucketed as 'None' (neutral label, not a lie)
 *       · null issueType  → bucketed as 'Other' (neutral label)
 *       · null assignee   → 'Unassigned' in byOwner (neutral display label, not a lie)
 */
import { describe, it, expect } from 'vitest';
import { jqlRowsToDashboardMetrics } from '@/components/dashboard/adapters/filterDashboardSource';
import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Returns an ISO date string (YYYY-MM-DD) in local time, offset by days from today. */
function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns an ISO timestamp string in UTC, offset by days from now. */
function isoTimestamp(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

// ── Row factory ───────────────────────────────────────────────────────────────

const base: JqlResultRow = {
  id: 'u1',
  key: 'BAU-1',
  summary: 'Test issue',
  issueType: 'Story',
  status: 'In Progress',
  statusCategory: 'In Progress',
  projectKey: 'BAU',
  assigneeName: 'Alice',
  priority: null,
  created: isoTimestamp(-30),
  updated: isoTimestamp(-30),
  dueDate: null,
  parentKey: null,
  parentSummary: null,
};

function row(overrides: Partial<JqlResultRow> = {}): JqlResultRow {
  return { ...base, ...overrides };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('jqlRowsToDashboardMetrics', () => {
  // ── empty ─────────────────────────────────────────────────────────────────

  it('returns all-zero metrics for an empty array', () => {
    const m = jqlRowsToDashboardMetrics([]);
    expect(m.total).toBe(0);
    expect(m.completedLast7).toBe(0);
    expect(m.updatedLast7).toBe(0);
    expect(m.createdLast7).toBe(0);
    expect(m.dueSoon).toBe(0);
    expect(m.byStatus).toEqual({});
    expect(m.byPriority).toEqual({});
    expect(m.byType).toEqual({});
    expect(m.byOwner).toEqual([]);
    expect(m.recentActivity).toEqual([]);
  });

  // ── total ─────────────────────────────────────────────────────────────────

  it('total equals the number of rows', () => {
    const m = jqlRowsToDashboardMetrics([row(), row({ id: 'u2', key: 'BAU-2' })]);
    expect(m.total).toBe(2);
  });

  // ── completedLast7 ────────────────────────────────────────────────────────

  it('counts done items updated within last 7 days as completedLast7', () => {
    const r = row({ statusCategory: 'Done', status: 'Done', updated: isoTimestamp(-1) });
    expect(jqlRowsToDashboardMetrics([r]).completedLast7).toBe(1);
  });

  it('does NOT count done items updated > 7 days ago in completedLast7', () => {
    const r = row({ statusCategory: 'Done', status: 'Done', updated: isoTimestamp(-8) });
    expect(jqlRowsToDashboardMetrics([r]).completedLast7).toBe(0);
  });

  it('does NOT count non-done items updated within 7 days in completedLast7', () => {
    const r = row({ statusCategory: 'In Progress', updated: isoTimestamp(-1) });
    expect(jqlRowsToDashboardMetrics([r]).completedLast7).toBe(0);
  });

  it('does NOT count null updated in completedLast7 (zero-assumption)', () => {
    const r = row({ statusCategory: 'Done', status: 'Done', updated: null });
    expect(jqlRowsToDashboardMetrics([r]).completedLast7).toBe(0);
  });

  // ── updatedLast7 ──────────────────────────────────────────────────────────

  it('counts items updated within last 7 days', () => {
    const rows = [
      row({ id: 'u1', updated: isoTimestamp(-6) }),
      row({ id: 'u2', updated: isoTimestamp(-8) }), // outside window
    ];
    expect(jqlRowsToDashboardMetrics(rows).updatedLast7).toBe(1);
  });

  it('does NOT count null updated in updatedLast7 (zero-assumption)', () => {
    expect(jqlRowsToDashboardMetrics([row({ updated: null })]).updatedLast7).toBe(0);
  });

  // ── createdLast7 ──────────────────────────────────────────────────────────

  it('counts items created within last 7 days', () => {
    const rows = [
      row({ id: 'u1', created: isoTimestamp(-3) }),
      row({ id: 'u2', created: isoTimestamp(-8) }), // outside window
    ];
    expect(jqlRowsToDashboardMetrics(rows).createdLast7).toBe(1);
  });

  it('does NOT count null created in createdLast7 (zero-assumption)', () => {
    expect(jqlRowsToDashboardMetrics([row({ created: null })]).createdLast7).toBe(0);
  });

  // ── dueSoon ───────────────────────────────────────────────────────────────

  it('counts not-done items due in [today, today+7] as dueSoon', () => {
    const rows = [
      row({ id: 'u1', dueDate: isoDate(0) }),
      row({ id: 'u2', dueDate: isoDate(3) }),
      row({ id: 'u3', dueDate: isoDate(7) }),
    ];
    expect(jqlRowsToDashboardMetrics(rows).dueSoon).toBe(3);
  });

  it('does NOT count dueSoon when due date is 8+ days away', () => {
    expect(jqlRowsToDashboardMetrics([row({ dueDate: isoDate(8) })]).dueSoon).toBe(0);
  });

  it('does NOT count dueSoon when item is done', () => {
    const r = row({ dueDate: isoDate(1), statusCategory: 'Done', status: 'Done' });
    expect(jqlRowsToDashboardMetrics([r]).dueSoon).toBe(0);
  });

  it('does NOT count dueSoon when dueDate is absent (zero-assumption)', () => {
    expect(jqlRowsToDashboardMetrics([row({ dueDate: null })]).dueSoon).toBe(0);
  });

  it('does NOT count dueSoon when dueDate is in the past', () => {
    expect(jqlRowsToDashboardMetrics([row({ dueDate: isoDate(-1) })]).dueSoon).toBe(0);
  });

  // ── byStatus ──────────────────────────────────────────────────────────────

  it('groups rows by status string', () => {
    const rows = [
      row({ id: 'u1', status: 'In Progress' }),
      row({ id: 'u2', status: 'In Progress' }),
      row({ id: 'u3', status: 'Done', statusCategory: 'Done' }),
    ];
    const m = jqlRowsToDashboardMetrics(rows);
    expect(m.byStatus['In Progress']).toBe(2);
    expect(m.byStatus['Done']).toBe(1);
  });

  // ── byPriority ────────────────────────────────────────────────────────────

  it('groups rows by normalized priority key', () => {
    const rows = [
      row({ id: 'u1', priority: 'Highest' }),
      row({ id: 'u2', priority: 'High' }),
      row({ id: 'u3', priority: 'High' }),
      row({ id: 'u4', priority: null }),
    ];
    const m = jqlRowsToDashboardMetrics(rows);
    expect(m.byPriority['Highest']).toBe(1);
    expect(m.byPriority['High']).toBe(2);
    expect(m.byPriority['None']).toBe(1);
  });

  it('normalizes case variations: "high" → "High"', () => {
    const m = jqlRowsToDashboardMetrics([row({ priority: 'high' })]);
    expect(m.byPriority['High']).toBe(1);
    expect(m.byPriority['high']).toBeUndefined();
  });

  it('maps null priority to "None" (zero-assumption — neutral label)', () => {
    const m = jqlRowsToDashboardMetrics([row({ priority: null })]);
    expect(m.byPriority['None']).toBe(1);
  });

  // ── byType ────────────────────────────────────────────────────────────────

  it('groups rows by issueType', () => {
    const rows = [
      row({ id: 'u1', issueType: 'Story' }),
      row({ id: 'u2', issueType: 'Story' }),
      row({ id: 'u3', issueType: 'Epic' }),
    ];
    const m = jqlRowsToDashboardMetrics(rows);
    expect(m.byType['Story']).toBe(2);
    expect(m.byType['Epic']).toBe(1);
  });

  it('maps null issueType to "Other" (zero-assumption — neutral label)', () => {
    const m = jqlRowsToDashboardMetrics([row({ issueType: null })]);
    expect(m.byType['Other']).toBe(1);
  });

  // ── byOwner ───────────────────────────────────────────────────────────────

  it('groups by owner, maps null assigneeName to "Unassigned"', () => {
    const rows = [
      row({ id: 'u1', assigneeName: 'Alice' }),
      row({ id: 'u2', assigneeName: 'Alice' }),
      row({ id: 'u3', assigneeName: null }),
    ];
    const m = jqlRowsToDashboardMetrics(rows);
    const alice = m.byOwner.find(o => o.name === 'Alice');
    const unassigned = m.byOwner.find(o => o.name === 'Unassigned');
    expect(alice?.count).toBe(2);
    expect(unassigned?.count).toBe(1);
  });

  it('sorts byOwner descending by count', () => {
    const rows = [
      row({ id: 'u1', assigneeName: 'Bob' }),
      row({ id: 'u2', assigneeName: 'Alice' }),
      row({ id: 'u3', assigneeName: 'Alice' }),
    ];
    const m = jqlRowsToDashboardMetrics(rows);
    expect(m.byOwner[0].name).toBe('Alice');
    expect(m.byOwner[0].count).toBe(2);
    expect(m.byOwner[1].name).toBe('Bob');
    expect(m.byOwner[1].count).toBe(1);
  });

  // ── recentActivity ────────────────────────────────────────────────────────

  it('returns top 20 issues sorted by updated desc', () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      row({ id: `u${i}`, key: `BAU-${i}`, updated: isoTimestamp(-i) })
    );
    const m = jqlRowsToDashboardMetrics(rows);
    expect(m.recentActivity).toHaveLength(20);
    expect(m.recentActivity[0].key).toBe('BAU-0');   // most recently updated
    expect(m.recentActivity[19].key).toBe('BAU-19');
  });

  it('sorts null-updated items to the end in recentActivity', () => {
    const rows = [
      row({ id: 'u1', key: 'BAU-1', updated: isoTimestamp(-1) }),
      row({ id: 'u2', key: 'BAU-2', updated: null }),
    ];
    const m = jqlRowsToDashboardMetrics(rows);
    expect(m.recentActivity[0].key).toBe('BAU-1');
    expect(m.recentActivity[1].key).toBe('BAU-2');
  });

  it('exposes issueType and status on each recentActivity item', () => {
    const r = row({ issueType: 'Story', status: 'In Progress' });
    const m = jqlRowsToDashboardMetrics([r]);
    expect(m.recentActivity[0].issueType).toBe('Story');
    expect(m.recentActivity[0].status).toBe('In Progress');
  });
});
