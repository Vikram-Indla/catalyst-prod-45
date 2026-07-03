/**
 * useDefectClosureTrend — real-data hook for the Defect Closure Trend report.
 * Feature: CAT-REPORTS-HUB-20260703-001 gap closure S2.3 (D-004 unlock).
 *
 * Source: tm_defects.created_at (raised) vs tm_defects.resolved_at (closed).
 * resolved_at is stamped by the tm_defects_resolved_at_trg DB trigger
 * (20260703290000) on transitions into resolved/closed — closures that happened
 * before the trigger existed have no date and are reported separately as
 * `undatedClosed`, never plotted (zero-assumption law).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClosureWeekRow {
  /** ISO Monday of the bucket week (yyyy-mm-dd). */
  week: string;
  raised: number;
  closed: number;
}

export interface DefectClosureTrend {
  totalDefects: number;
  open: number;
  closedDated: number;
  /** Closed/resolved defects with no resolved_at (pre-trigger closures). */
  undatedClosed: number;
  weeks: ClosureWeekRow[];
}

const CLOSED_STATUSES = new Set(['resolved', 'closed']);

/** ISO Monday (yyyy-mm-dd) of the week containing the given timestamp. */
function weekOf(ts: string): string {
  const d = new Date(ts);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function useDefectClosureTrend(projectId?: string) {
  return useQuery({
    queryKey: ['defect-closure-trend', projectId ?? 'all'],
    queryFn: async (): Promise<DefectClosureTrend> => {
      let q = supabase.from('tm_defects').select('status, created_at, resolved_at');
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as { status: string; created_at: string | null; resolved_at: string | null }[];

      const byWeek = new Map<string, ClosureWeekRow>();
      const bump = (week: string, key: 'raised' | 'closed') => {
        const row = byWeek.get(week) ?? { week, raised: 0, closed: 0 };
        row[key] += 1;
        byWeek.set(week, row);
      };

      let open = 0;
      let closedDated = 0;
      let undatedClosed = 0;
      for (const r of rows) {
        const isClosed = CLOSED_STATUSES.has(r.status);
        if (!isClosed) open += 1;
        if (r.created_at) bump(weekOf(r.created_at), 'raised');
        if (r.resolved_at) {
          closedDated += 1;
          bump(weekOf(r.resolved_at), 'closed');
        } else if (isClosed) {
          undatedClosed += 1;
        }
      }

      return {
        totalDefects: rows.length,
        open,
        closedDated,
        undatedClosed,
        weeks: [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week)),
      };
    },
  });
}
