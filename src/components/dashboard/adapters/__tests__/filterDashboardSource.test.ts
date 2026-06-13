/**
 * filterDashboardSource — Executive Summary metrics aggregator
 *
 * Contract (this test is the spec — implementation follows):
 *   - jqlRowsToDashboardMetrics is pure and side-effect free.
 *   - ZERO-ASSUMPTION rule (CLAUDE.md P0): a missing field is never replaced
 *     by a plausible-sounding domain default:
 *       · null dueDate  → item NOT counted in overdue or dueThisWeek
 *       · null priority → item NOT counted in highRisk
 *       · Done items    → NOT counted in overdue, dueThisWeek, or highRisk
 *       · null assignee → "Unassigned" in byOwner (neutral display label, not a lie)
 */
import { describe, it, expect } from 'vitest';
import { jqlRowsToDashboardMetrics } from '@/components/dashboard/adapters/filterDashboardSource';
import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';

// ── Date helper ───────────────────────────────────────────────────────────────

/** Returns an ISO date string (YYYY-MM-DD) in local time, offset by days from today. */
function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  created: '2026-01-01T00:00:00Z',
  updated: '2026-06-01T00:00:00Z',
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
    expect(m.open).toBe(0);
    expect(m.closed).toBe(0);
    expect(m.overdue).toBe(0);
    expect(m.dueThisWeek).toBe(0);
    expect(m.highRisk).toBe(0);
    expect(m.noOwner).toBe(0);
    expect(m.byStatus).toEqual({});
    expect(m.byOwner).toEqual([]);
  });

  // ── total ─────────────────────────────────────────────────────────────────

  it('total equals the number of rows', () => {
    const m = jqlRowsToDashboardMetrics([row(), row({ id: 'u2', key: 'BAU-2' })]);
    expect(m.total).toBe(2);
  });

  // ── open / closed ─────────────────────────────────────────────────────────

  it('splits open (not Done) and closed (Done) correctly', () => {
    const rows = [
      row({ id: 'u1' }),
      row({ id: 'u2', statusCategory: 'Done', status: 'Done' }),
    ];
    const m = jqlRowsToDashboardMetrics(rows);
    expect(m.open).toBe(1);
    expect(m.closed).toBe(1);
  });

  // ── overdue ───────────────────────────────────────────────────────────────

  it('counts overdue when dueDate is in the past and item is not done', () => {
    const m = jqlRowsToDashboardMetrics([row({ dueDate: isoDate(-1) })]);
    expect(m.overdue).toBe(1);
  });

  it('does NOT count overdue when item is done (past dueDate, zero-assumption)', () => {
    const m = jqlRowsToDashboardMetrics([
      row({ dueDate: isoDate(-1), statusCategory: 'Done', status: 'Done' }),
    ]);
    expect(m.overdue).toBe(0);
  });

  it('does NOT count overdue when dueDate is absent (zero-assumption)', () => {
    const m = jqlRowsToDashboardMetrics([row({ dueDate: null })]);
    expect(m.overdue).toBe(0);
  });

  it('does NOT count overdue when dueDate is today', () => {
    const m = jqlRowsToDashboardMetrics([row({ dueDate: isoDate(0) })]);
    expect(m.overdue).toBe(0);
  });

  // ── dueThisWeek ───────────────────────────────────────────────────────────

  it('counts dueThisWeek for today through today+6 (not done)', () => {
    const rows = [
      row({ id: 'u1', dueDate: isoDate(0) }),
      row({ id: 'u2', dueDate: isoDate(3) }),
      row({ id: 'u3', dueDate: isoDate(6) }),
    ];
    expect(jqlRowsToDashboardMetrics(rows).dueThisWeek).toBe(3);
  });

  it('does NOT count dueThisWeek when due date is 7+ days away', () => {
    const m = jqlRowsToDashboardMetrics([row({ dueDate: isoDate(7) })]);
    expect(m.dueThisWeek).toBe(0);
  });

  it('does NOT count dueThisWeek when item is done', () => {
    const m = jqlRowsToDashboardMetrics([
      row({ dueDate: isoDate(1), statusCategory: 'Done', status: 'Done' }),
    ]);
    expect(m.dueThisWeek).toBe(0);
  });

  it('does NOT count dueThisWeek when dueDate is absent (zero-assumption)', () => {
    expect(jqlRowsToDashboardMetrics([row({ dueDate: null })]).dueThisWeek).toBe(0);
  });

  // ── highRisk ──────────────────────────────────────────────────────────────

  it('counts Highest priority (not done) as high-risk', () => {
    expect(jqlRowsToDashboardMetrics([row({ priority: 'Highest' })]).highRisk).toBe(1);
  });

  it('counts High priority (not done) as high-risk', () => {
    expect(jqlRowsToDashboardMetrics([row({ priority: 'High' })]).highRisk).toBe(1);
  });

  it('does NOT count null priority as high-risk (zero-assumption)', () => {
    expect(jqlRowsToDashboardMetrics([row({ priority: null })]).highRisk).toBe(0);
  });

  it('does NOT count Medium priority as high-risk', () => {
    expect(jqlRowsToDashboardMetrics([row({ priority: 'Medium' })]).highRisk).toBe(0);
  });

  it('does NOT count done High-priority items as high-risk', () => {
    const m = jqlRowsToDashboardMetrics([
      row({ priority: 'High', statusCategory: 'Done', status: 'Done' }),
    ]);
    expect(m.highRisk).toBe(0);
  });

  // ── noOwner ───────────────────────────────────────────────────────────────

  it('counts null assigneeName as no-owner', () => {
    expect(jqlRowsToDashboardMetrics([row({ assigneeName: null })]).noOwner).toBe(1);
  });

  it('does NOT count a named assignee as no-owner', () => {
    expect(jqlRowsToDashboardMetrics([row({ assigneeName: 'Alice' })]).noOwner).toBe(0);
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
});
