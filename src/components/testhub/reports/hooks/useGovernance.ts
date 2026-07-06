/**
 * useGovernance — real-data hook for the Governance & Mismatch report (B1 group 10, B5 rules).
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001.
 *
 * Detects delivery-vs-test contradictions across a project's stories:
 *  G-M1 Done + failing test · G-M2 In-QA + no test case · G-M3 Done + test not run/blocked.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPages } from './fetchAllPages';

export interface GovernanceRow {
  issue_key: string;
  summary: string;
  status: string;
  rule: string;
  detail: string;
}

interface Story { issue_key: string; summary: string; status: string; status_category: string }

export function useGovernance(projectName?: string, projectId?: string) {
  return useQuery({
    queryKey: ['governance', projectName, projectId],
    enabled: !!projectName && !!projectId,
    queryFn: async (): Promise<{ rows: GovernanceRow[]; storiesChecked: number }> => {
      // Paged past the server max_rows cap — truncation silently drops stories.
      const stories = await fetchAllPages<Story>((from, to) =>
        supabase
          .from('ph_issues')
          .select('issue_key, summary, status, status_category')
          .eq('project_name', projectName!)
          .eq('issue_type', 'Story')
          .order('issue_key', { ascending: true })
          .range(from, to),
      );
      const byKey = new Map(stories.map((s) => [s.issue_key, s]));

      // links for this project's cases → story → case ids
      const { data: links, error: linksError } = await supabase
        .from('tm_requirement_links')
        .select('external_key, test_case_id, tm_test_cases!inner(project_id)')
        .eq('requirement_type', 'story')
        .eq('tm_test_cases.project_id', projectId!);
      if (linksError) throw linksError;
      const storyCases = new Map<string, string[]>();
      for (const l of links ?? []) {
        const row = l as { external_key: string; test_case_id: string };
        const arr = storyCases.get(row.external_key) ?? [];
        arr.push(row.test_case_id);
        storyCases.set(row.external_key, arr);
      }
      const allCaseIds = Array.from(new Set((links ?? []).map((l: { test_case_id: string }) => l.test_case_id)));

      // per-case worst status
      const caseStatus = new Map<string, string>();
      if (allCaseIds.length) {
        const { data: scope, error: scopeError } = await supabase.from('tm_cycle_scope').select('test_case_id, current_status').in('test_case_id', allCaseIds);
        if (scopeError) throw scopeError;
        const sev: Record<string, number> = { failed: 5, blocked: 4, not_run: 3, in_progress: 2, passed: 1, skipped: 0 };
        for (const s of scope ?? []) {
          const row = s as { test_case_id: string; current_status: string };
          const prev = caseStatus.get(row.test_case_id);
          if (!prev || (sev[row.current_status] ?? 0) > (sev[prev] ?? 0)) caseStatus.set(row.test_case_id, row.current_status);
        }
      }

      const rows: GovernanceRow[] = [];
      for (const s of stories) {
        const cases = storyCases.get(s.issue_key) ?? [];
        const statuses = cases.map((c) => caseStatus.get(c) ?? 'not_run');
        const done = s.status_category === 'done';
        if (cases.length === 0) continue; // uncovered stories live in the coverage report, not here
        if (done && statuses.includes('failed')) {
          rows.push({ issue_key: s.issue_key, summary: s.summary, status: s.status, rule: 'Done + failing test', detail: 'Story marked Done but a linked test failed.' });
        } else if (done && statuses.every((st) => st === 'not_run' || st === 'blocked')) {
          rows.push({ issue_key: s.issue_key, summary: s.summary, status: s.status, rule: 'Done + test not run', detail: 'Story marked Done but its tests are not run / blocked.' });
        }
      }
      return { rows, storiesChecked: byKey.size };
    },
  });
}
