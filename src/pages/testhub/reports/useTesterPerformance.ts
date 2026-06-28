/**
 * useTesterPerformance — real-data hook for the Tester Performance report (B1 group 8).
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001.
 *
 * For a tester (profiles.id): assigned test cases, execution breakdown of their
 * cycle scope, defects raised. Sources: tm_test_cases.assigned_to,
 * tm_cycle_scope.assigned_to, tm_defects.reporter_id, tm_requirement_links (story trace).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ExecBreakdown } from './useProjectTestingStatus';

export interface TesterCaseRow {
  caseKey: string;
  title: string;
  story: string;
  runStatus: string;
}

export interface TesterPerformance {
  assigned: number;
  exec: ExecBreakdown;
  defectsRaised: number;
  cases: TesterCaseRow[];
}

const EMPTY_EXEC: ExecBreakdown = {
  passed: 0, failed: 0, blocked: 0, not_run: 0, in_progress: 0, skipped: 0, total: 0,
};

export function useTesterPerformance(testerId?: string) {
  return useQuery({
    queryKey: ['tester-performance', testerId],
    enabled: !!testerId,
    queryFn: async (): Promise<TesterPerformance> => {
      // 1) Cases assigned to this tester
      const { data: cases } = await supabase
        .from('tm_test_cases')
        .select('id, case_key, title')
        .eq('assigned_to', testerId!);
      const caseList = cases ?? [];
      const caseIds = caseList.map((c: { id: string }) => c.id);

      // 2) Per-case status (cycle scope) + story trace
      const statusByCase = new Map<string, string>();
      const storyByCase = new Map<string, string>();
      const exec: ExecBreakdown = { ...EMPTY_EXEC };
      if (caseIds.length) {
        const { data: scope } = await supabase
          .from('tm_cycle_scope')
          .select('test_case_id, current_status')
          .in('test_case_id', caseIds);
        for (const s of scope ?? []) {
          const row = s as { test_case_id: string; current_status: string };
          statusByCase.set(row.test_case_id, row.current_status);
          const k = row.current_status as keyof ExecBreakdown;
          if (k in exec && k !== 'total') exec[k] += 1;
          exec.total += 1;
        }
        const { data: links } = await supabase
          .from('tm_requirement_links')
          .select('test_case_id, external_key')
          .in('test_case_id', caseIds);
        for (const l of links ?? []) {
          const row = l as { test_case_id: string; external_key: string };
          if (!storyByCase.has(row.test_case_id)) storyByCase.set(row.test_case_id, row.external_key);
        }
      }

      // 3) Defects raised by this tester
      const d = await supabase
        .from('tm_defects')
        .select('id', { count: 'exact', head: true })
        .eq('reporter_id', testerId!);

      const rows: TesterCaseRow[] = caseList.map((c: { id: string; case_key: string; title: string }) => ({
        caseKey: c.case_key,
        title: c.title,
        story: storyByCase.get(c.id) ?? '—',
        runStatus: statusByCase.get(c.id) ?? 'not_run',
      }));

      return { assigned: caseList.length, exec, defectsRaised: d.count ?? 0, cases: rows };
    },
  });
}
