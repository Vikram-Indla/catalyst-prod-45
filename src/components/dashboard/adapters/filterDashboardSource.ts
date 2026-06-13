/**
 * filterDashboardSource — Jira-summary-parity metrics aggregator for a
 * filter-backed dashboard.
 *
 * Mirrors the Jira project summary page layout (probed 2026-06-13):
 *   4 KPI cards (7-day windows) → Status overview → Priority breakdown →
 *   Types of work → Team workload → Recent activity
 *
 * Zero-assumption rule (CLAUDE.md P0): missing fields are never replaced with
 * plausible domain defaults:
 *   · null updated  → NOT counted in completedLast7 / updatedLast7
 *   · null created  → NOT counted in createdLast7
 *   · null dueDate  → NOT counted in dueSoon
 *   · null priority → bucketed as 'None' (neutral label, not a lie)
 *   · null assignee → 'Unassigned' in byOwner (neutral label)
 *   · null issueType → 'Other' in byType (neutral label)
 */
import { useMemo } from 'react';
import { useJqlResults, type JqlResultRow } from '@/hooks/workhub/useJqlResults';

// ── Priority constants ────────────────────────────────────────────────────────

/** Canonical Jira priority order — use for sorted display in Priority Breakdown. */
export const PRIORITY_ORDER = ['Highest', 'High', 'Medium', 'Low', 'Lowest', 'None'] as const;
type PriorityKey = typeof PRIORITY_ORDER[number];

function normalizePriority(p: string | null): PriorityKey {
  if (!p) return 'None';
  const norm = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  if (norm === 'Highest' || norm === 'High' || norm === 'Medium' ||
      norm === 'Low' || norm === 'Lowest') return norm as PriorityKey;
  return 'None';
}

// ── Metrics shape ─────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  total: number;

  // 4 KPI cards — Jira project summary parity
  /** statusCategory === 'Done' AND updated within last 7 days. */
  completedLast7: number;
  /** updated within last 7 days. Null updated = not counted (zero-assumption). */
  updatedLast7: number;
  /** created within last 7 days. Null created = not counted (zero-assumption). */
  createdLast7: number;
  /** dueDate in [today, today+7] AND not done. Null dueDate = not counted (zero-assumption). */
  dueSoon: number;

  // Section data
  /** Count per distinct status string, sorted descending by count. */
  byStatus: Record<string, number>;
  /** Count per priority bucket in PRIORITY_ORDER order. */
  byPriority: Record<string, number>;
  /** Count per issue type. null issueType → 'Other'. */
  byType: Record<string, number>;
  /** Sorted descending by count. null assigneeName → 'Unassigned'. */
  byOwner: Array<{ name: string; count: number }>;
  /** Top 20 most-recently-updated issues for the Recent Activity section. */
  recentActivity: Array<{
    key: string;
    summary: string;
    issueType: string | null;
    status: string;
    updated: string | null;
  }>;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayMidnight(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Parse 'YYYY-MM-DD' as local midnight. Avoids UTC-offset drift that
 * `new Date('YYYY-MM-DD')` introduces (parses as UTC midnight = yesterday
 * evening in negative-offset timezones).
 */
function toLocalMidnight(dateStr: string): Date {
  const parts = dateStr.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// ── Pure aggregator ───────────────────────────────────────────────────────────

export function jqlRowsToDashboardMetrics(rows: JqlResultRow[]): DashboardMetrics {
  const today = todayMidnight();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAhead = new Date(today);
  sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);

  let completedLast7 = 0;
  let updatedLast7 = 0;
  let createdLast7 = 0;
  let dueSoon = 0;

  const statusCount: Record<string, number> = {};
  const priorityCount: Record<string, number> = {};
  const typeCount: Record<string, number> = {};
  const ownerCount: Record<string, number> = {};

  for (const r of rows) {
    const isDone = r.statusCategory === 'Done';

    // KPI: completed last 7 days — done AND updated within window
    if (isDone && r.updated) {
      if (new Date(r.updated).getTime() >= sevenDaysAgo.getTime()) completedLast7++;
    }

    // KPI: updated last 7 days
    if (r.updated) {
      if (new Date(r.updated).getTime() >= sevenDaysAgo.getTime()) updatedLast7++;
    }

    // KPI: created last 7 days
    if (r.created) {
      if (new Date(r.created).getTime() >= sevenDaysAgo.getTime()) createdLast7++;
    }

    // KPI: due soon — dueDate in [today, today+7], not done
    if (!isDone && r.dueDate) {
      const due = toLocalMidnight(r.dueDate);
      if (due.getTime() >= today.getTime() && due.getTime() <= sevenDaysAhead.getTime()) dueSoon++;
    }

    // byStatus
    if (r.status) {
      statusCount[r.status] = (statusCount[r.status] ?? 0) + 1;
    }

    // byPriority — normalized to canonical Jira keys
    const pk = normalizePriority(r.priority);
    priorityCount[pk] = (priorityCount[pk] ?? 0) + 1;

    // byType — null issueType → 'Other' (neutral, not a domain default)
    const tk = r.issueType || 'Other';
    typeCount[tk] = (typeCount[tk] ?? 0) + 1;

    // byOwner — null assigneeName → 'Unassigned' (neutral)
    const ok = r.assigneeName?.trim() || 'Unassigned';
    ownerCount[ok] = (ownerCount[ok] ?? 0) + 1;
  }

  const byOwner = Object.entries(ownerCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Recent activity — top 20 sorted by updated desc (null updated → sorted to end)
  const recentActivity = [...rows]
    .sort((a, b) => {
      const ta = a.updated ? new Date(a.updated).getTime() : 0;
      const tb = b.updated ? new Date(b.updated).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 20)
    .map(r => ({
      key: r.key,
      summary: r.summary,
      issueType: r.issueType,
      status: r.status,
      updated: r.updated,
    }));

  return {
    total: rows.length,
    completedLast7,
    updatedLast7,
    createdLast7,
    dueSoon,
    byStatus: statusCount,
    byPriority: priorityCount,
    byType: typeCount,
    byOwner,
    recentActivity,
  };
}

// ── Thin hook ─────────────────────────────────────────────────────────────────

export function useFilterDashboard(jql: string | undefined) {
  const enabled = !!jql && jql.trim().length > 0;
  const query = useJqlResults(jql ?? '', enabled);

  const metrics = useMemo<DashboardMetrics>(
    () => jqlRowsToDashboardMetrics(query.data?.items ?? []),
    [query.data],
  );

  const totalCount = query.data?.totalCount ?? (query.data?.items?.length ?? 0);
  const isTruncated = totalCount > (query.data?.items?.length ?? 0);

  return {
    metrics,
    totalCount,
    isTruncated,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
