/**
 * useIncidentMttr — MTTR for Production Incidents from captured status history.
 * Feature: CAT-REPORTS-HUB-20260703-001 gap closure S2.3 (D-004 unlock).
 *
 * Resolution event = an incident's FIRST ph_issue_status_history transition into
 * status_category 'Done' (capture trigger installed 20260703290000). Creation
 * comes from ph_issues.jira_created_at. History accrues from install time —
 * incidents resolved before capture began simply have no MTTR sample; the hook
 * reports how many closures are dated vs. total (zero-assumption law: no
 * synthetic backfill).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPages } from '@/components/testhub/reports/hooks/fetchAllPages';

export interface MttrWeekRow {
  /** ISO Monday of the bucket week (yyyy-mm-dd). */
  week: string;
  resolved: number;
  avgHours: number;
}

export interface IncidentMttr {
  /** Incidents with a captured Done transition AND a creation date. */
  sampleSize: number;
  mttrHours: number | null;
  weeks: MttrWeekRow[];
  /** Earliest captured transition (any incident) — i.e. when capture began. Null = none yet. */
  captureStart: string | null;
}

const INCIDENT_TYPE = 'Production Incident';

function weekOf(ts: string): string {
  const d = new Date(ts);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function useIncidentMttr(projectKey?: string) {
  return useQuery({
    queryKey: ['incident-mttr', projectKey ?? 'all'],
    queryFn: async (): Promise<IncidentMttr> => {
      // History grows without bound — page past the server max_rows cap.
      const rows = await fetchAllPages<{ issue_key: string; to_status_category: string | null; changed_at: string }>(
        (from, to) => {
          let hq = supabase
            .from('ph_issue_status_history')
            .select('issue_key, to_status_category, changed_at')
            .eq('issue_type', INCIDENT_TYPE)
            .order('changed_at', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to);
          if (projectKey) hq = hq.eq('project_key', projectKey);
          return hq;
        },
      );

      const captureStart = rows.length ? rows[0].changed_at : null;
      const firstDone = new Map<string, string>();
      for (const h of rows) {
        if ((h.to_status_category ?? '').toLowerCase() === 'done' && !firstDone.has(h.issue_key)) {
          firstDone.set(h.issue_key, h.changed_at);
        }
      }
      if (firstDone.size === 0) {
        return { sampleSize: 0, mttrHours: null, weeks: [], captureStart };
      }

      const { data: created, error: createdErr } = await supabase
        .from('ph_issues')
        .select('issue_key, jira_created_at, created_at')
        .in('issue_key', [...firstDone.keys()]);
      if (createdErr) throw createdErr;
      const createdByKey = new Map(
        ((created ?? []) as { issue_key: string; jira_created_at: string | null; created_at: string | null }[])
          .map((r) => [r.issue_key, r.jira_created_at ?? r.created_at]),
      );

      const samples: { resolvedAt: string; hours: number }[] = [];
      for (const [key, resolvedAt] of firstDone) {
        const createdAt = createdByKey.get(key);
        if (!createdAt) continue; // no creation date → no sample, never guess
        const hours = (new Date(resolvedAt).getTime() - new Date(createdAt).getTime()) / 3_600_000;
        if (hours >= 0) samples.push({ resolvedAt, hours });
      }
      if (samples.length === 0) {
        return { sampleSize: 0, mttrHours: null, weeks: [], captureStart };
      }

      const byWeek = new Map<string, { total: number; n: number }>();
      for (const s of samples) {
        const w = weekOf(s.resolvedAt);
        const agg = byWeek.get(w) ?? { total: 0, n: 0 };
        agg.total += s.hours;
        agg.n += 1;
        byWeek.set(w, agg);
      }

      return {
        sampleSize: samples.length,
        mttrHours: Math.round((samples.reduce((a, s) => a + s.hours, 0) / samples.length) * 10) / 10,
        weeks: [...byWeek.entries()]
          .map(([week, { total, n }]) => ({ week, resolved: n, avgHours: Math.round((total / n) * 10) / 10 }))
          .sort((a, b) => a.week.localeCompare(b.week)),
        captureStart,
      };
    },
  });
}
