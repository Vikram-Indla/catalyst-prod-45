import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * S2 (repository redesign) — real project-hub traceability for the repository grid.
 *
 * Reads `v_tm_requirement_coverage` (the canonical coverage view: joins
 * tm_requirement_links to the latest run status per case). `requirement_type =
 * 'story'` rows are live ph_issues links; `'external'` rows carry a free-text
 * key. We aggregate per test_case_id so the Coverage and Last-run columns render
 * from real linkage — never a fabricated default. A case with no row simply has
 * no entry in the map, and the cell renders the zero-assumption dash.
 */

export type CoverageVerdict = 'ok' | 'nok' | 'not_run';
export type CaseRunStatus =
  | 'not_run'
  | 'in_progress'
  | 'passed'
  | 'failed'
  | 'blocked';

export interface CaseCoverage {
  /** Real requirement keys this case verifies (ph_issues issue_key or external key). */
  requirementKeys: string[];
  /** Roll-up verdict across the case's links: 'nok' wins, then 'not_run', then 'ok'. */
  verdict: CoverageVerdict;
  /** Latest execution status across the case's runs (null when never run). */
  latestRun: CaseRunStatus | null;
}

interface CoverageRow {
  test_case_id: string;
  external_key: string | null;
  coverage_verdict: CoverageVerdict | null;
  latest_run_status: CaseRunStatus | null;
}

// Ordering used to reduce many link rows to one case-level value.
const VERDICT_RANK: Record<CoverageVerdict, number> = { nok: 3, not_run: 2, ok: 1 };
const RUN_RANK: Record<CaseRunStatus, number> = {
  failed: 5,
  blocked: 4,
  in_progress: 3,
  passed: 2,
  not_run: 1,
};

export function useCaseCoverage(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-coverage', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Map<string, CaseCoverage>> => {
      if (!projectId) return new Map();
      const { data, error } = await supabase
        .from('v_tm_requirement_coverage')
        .select('test_case_id, external_key, coverage_verdict, latest_run_status')
        .eq('project_id', projectId);

      // Surface nothing on error — the columns degrade to the zero-assumption
      // dash rather than blocking the whole grid on a missing view/permission.
      if (error || !data) return new Map();

      const map = new Map<string, CaseCoverage>();
      for (const raw of data as CoverageRow[]) {
        const id = raw.test_case_id;
        const existing = map.get(id) ?? { requirementKeys: [], verdict: 'not_run' as CoverageVerdict, latestRun: null };

        if (raw.external_key && !existing.requirementKeys.includes(raw.external_key)) {
          existing.requirementKeys.push(raw.external_key);
        }
        if (raw.coverage_verdict && VERDICT_RANK[raw.coverage_verdict] > VERDICT_RANK[existing.verdict]) {
          existing.verdict = raw.coverage_verdict;
        }
        if (
          raw.latest_run_status &&
          (existing.latestRun === null || RUN_RANK[raw.latest_run_status] > RUN_RANK[existing.latestRun])
        ) {
          existing.latestRun = raw.latest_run_status;
        }
        map.set(id, existing);
      }
      return map;
    },
  });
}
