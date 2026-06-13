/**
 * filterDashboardSource — metrics aggregator for a filter-backed dashboard.
 *
 * Mirrors filterBoardSource.ts (Kanban vertical):
 *   useJqlResults(filter.jql_query)  →  JqlResultRow[]
 *   jqlRowsToDashboardMetrics(rows)  →  DashboardMetrics  (pure, unit-tested)
 *   → fed to FilterDashboardPage via useFilterDashboard
 *
 * Zero-assumption rule (CLAUDE.md P0): every metric is computed from REAL data.
 * Missing fields are never papered over with a plausible domain default:
 *   · null dueDate  → item not counted in overdue / dueThisWeek
 *   · null priority → item not counted in highRisk
 *   · Done items    → excluded from overdue, dueThisWeek, highRisk
 *   · null assignee → "Unassigned" display label (neutral, not a fabrication)
 */
import { useMemo } from 'react';
import { useJqlResults, type JqlResultRow } from '@/hooks/workhub/useJqlResults';

// ── Metrics shape ─────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  total: number;
  /** statusCategory !== 'Done'. */
  open: number;
  /** statusCategory === 'Done'. */
  closed: number;
  /** dueDate is past AND item is not done. Requires dueDate — zero-assumption. */
  overdue: number;
  /** Due today through today+6 (inclusive) and not done. Requires dueDate — zero-assumption. */
  dueThisWeek: number;
  /** priority ∈ {Highest, High} and not done. Null priority not counted — zero-assumption. */
  highRisk: number;
  /** assigneeName is null or empty-string. */
  noOwner: number;
  /** Count per distinct status string. */
  byStatus: Record<string, number>;
  /** Sorted descending by count. Null assignee → "Unassigned". */
  byOwner: Array<{ name: string; count: number }>;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayMidnight(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Parse 'YYYY-MM-DD' as local midnight. Avoids the UTC-offset drift that
 * `new Date('YYYY-MM-DD')` introduces (it parses as midnight UTC, which is
 * yesterday evening in negative-offset timezones).
 */
function toLocalMidnight(dateStr: string): Date {
  const parts = dateStr.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// ── Pure aggregator ───────────────────────────────────────────────────────────

export function jqlRowsToDashboardMetrics(rows: JqlResultRow[]): DashboardMetrics {
  const today = todayMidnight();
  const weekOut = new Date(today);
  weekOut.setDate(weekOut.getDate() + 6); // today..today+6 inclusive

  let open = 0;
  let closed = 0;
  let overdue = 0;
  let dueThisWeek = 0;
  let highRisk = 0;
  let noOwner = 0;
  const statusCount: Record<string, number> = {};
  const ownerCount: Record<string, number> = {};

  for (const r of rows) {
    const isDone = r.statusCategory === 'Done';

    if (isDone) { closed++; } else { open++; }

    // byStatus — use raw status string as the key
    if (r.status) {
      statusCount[r.status] = (statusCount[r.status] ?? 0) + 1;
    }

    // byOwner — null/empty assigneeName → neutral "Unassigned" label
    const ownerKey = r.assigneeName?.trim() || 'Unassigned';
    ownerCount[ownerKey] = (ownerCount[ownerKey] ?? 0) + 1;
    if (!r.assigneeName?.trim()) noOwner++;

    // Date metrics — only when dueDate present AND item not done
    if (!isDone && r.dueDate) {
      const due = toLocalMidnight(r.dueDate);
      if (due < today) {
        overdue++;
      } else if (due <= weekOut) {
        dueThisWeek++;
      }
    }

    // highRisk — Highest or High priority, not done
    if (!isDone && (r.priority === 'Highest' || r.priority === 'High')) {
      highRisk++;
    }
  }

  const byOwner = Object.entries(ownerCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total: rows.length,
    open,
    closed,
    overdue,
    dueThisWeek,
    highRisk,
    noOwner,
    byStatus: statusCount,
    byOwner,
  };
}

// ── Thin hook ─────────────────────────────────────────────────────────────────

/**
 * Resolve a filter's JQL result set → compute Executive Summary metrics.
 * Thin wrapper over useJqlResults — mirrors useFilterBoardIssues.
 */
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
