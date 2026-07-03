/**
 * usePointsBurndown — real-data hook for the sprint Points Burndown report.
 * Feature: CAT-REPORTS-HUB-20260703-001 gap closure S2.3 (D-004 unlock).
 *
 * Scope: ph_issues whose sprint_release JSONB names the sprint (same client-side
 * resolution as useSprintTestingStatus). Completion dates come from
 * ph_issue_status_history (first transition into status_category 'Done').
 * Zero-assumption rules:
 *  - story_points populated on 0 staging rows (PHASE0) → count-based by default;
 *    points mode engages only when at least one scoped issue carries points.
 *  - Issues already Done with no captured transition (completed before the
 *    capture trigger existed) are surfaced as `unplottedDone`, never invented
 *    onto the timeline.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BurndownPoint {
  /** yyyy-mm-dd */
  date: string;
  remaining: number;
  ideal: number;
}

export interface PointsBurndown {
  sprintName: string;
  startDate: string | null;
  endDate: string | null;
  /** 'points' when any scoped issue has story_points, else 'count'. */
  mode: 'points' | 'count';
  totalScope: number;
  doneScope: number;
  /** Issues with story_points set (points-mode coverage note). */
  pointedIssues: number;
  totalIssues: number;
  /** Done issues with no captured Done-transition (pre-capture completions). */
  unplottedDone: number;
  series: BurndownPoint[];
}

const dayMs = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function usePointsBurndown(sprintName?: string) {
  return useQuery({
    queryKey: ['points-burndown', sprintName],
    enabled: !!sprintName,
    queryFn: async (): Promise<PointsBurndown> => {
      // 1) Sprint window
      const { data: sprint, error: sprintErr } = await supabase
        .from('ph_jira_sprints')
        .select('name, start_date, end_date, target_date')
        .eq('name', sprintName!)
        .maybeSingle();
      if (sprintErr) throw sprintErr;
      const startDate = sprint?.start_date ?? null;
      const endDate = sprint?.end_date ?? sprint?.target_date ?? null;

      // 2) Scope: sprint_release JSONB resolved client-side (names with spaces
      //    break PostgREST containment encoding — same as useSprintTestingStatus).
      const inSprint = (sr: unknown) =>
        Array.isArray(sr) && sr.some((e) => (e as { name?: string })?.name === sprintName);
      const { data: issueData, error: issueErr } = await supabase
        .from('ph_issues')
        .select('issue_key, status_category, story_points, sprint_release')
        .not('sprint_release', 'is', null);
      if (issueErr) throw issueErr;
      const issues = ((issueData ?? []) as {
        issue_key: string; status_category: string | null; story_points: number | null; sprint_release: unknown;
      }[]).filter((i) => inSprint(i.sprint_release));

      const pointedIssues = issues.filter((i) => i.story_points !== null).length;
      const mode: PointsBurndown['mode'] = pointedIssues > 0 ? 'points' : 'count';
      const weight = (i: { story_points: number | null }) => (mode === 'points' ? i.story_points ?? 0 : 1);
      const totalScope = issues.reduce((sum, i) => sum + weight(i), 0);
      const doneIssues = issues.filter((i) => (i.status_category ?? '').toLowerCase() === 'done');
      const doneScope = doneIssues.reduce((sum, i) => sum + weight(i), 0);

      // 3) First Done-transition per issue from captured history
      const keys = issues.map((i) => i.issue_key);
      const firstDone = new Map<string, string>();
      if (keys.length) {
        const { data: hist, error: histErr } = await supabase
          .from('ph_issue_status_history')
          .select('issue_key, to_status_category, changed_at')
          .in('issue_key', keys)
          .order('changed_at', { ascending: true });
        if (histErr) throw histErr;
        for (const h of (hist ?? []) as { issue_key: string; to_status_category: string | null; changed_at: string }[]) {
          if ((h.to_status_category ?? '').toLowerCase() === 'done' && !firstDone.has(h.issue_key)) {
            firstDone.set(h.issue_key, h.changed_at.slice(0, 10));
          }
        }
      }
      const unplottedDone = doneIssues.filter((i) => !firstDone.has(i.issue_key)).length;

      // 4) Daily series across the sprint window (up to today)
      const series: BurndownPoint[] = [];
      if (startDate && endDate && totalScope > 0) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        const today = Date.now();
        const spanDays = Math.max(1, Math.round((end - start) / dayMs));
        const weightByKey = new Map(issues.map((i) => [i.issue_key, weight(i)]));
        for (let t = start; t <= Math.min(end, today); t += dayMs) {
          const day = iso(t);
          let burned = 0;
          for (const [key, doneDay] of firstDone) {
            if (doneDay <= day) burned += weightByKey.get(key) ?? 0;
          }
          const elapsed = Math.round((t - start) / dayMs);
          series.push({
            date: day,
            remaining: totalScope - burned,
            ideal: Math.max(0, Math.round((totalScope * (1 - elapsed / spanDays)) * 10) / 10),
          });
        }
      }

      return {
        sprintName: sprintName!,
        startDate,
        endDate,
        mode,
        totalScope,
        doneScope,
        pointedIssues,
        totalIssues: issues.length,
        unplottedDone,
        series,
      };
    },
  });
}
