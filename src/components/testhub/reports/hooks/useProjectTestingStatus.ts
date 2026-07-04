/**
 * useProjectTestingStatus — real-data hook for the Project Testing Status report.
 *
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001 (B1 group 1 + B3 coverage + B5 governance).
 * Data model (proven in discovery):
 *   - Stories  = ph_issues where project_name = <project>, issue_type = 'Story'   (D-002)
 *   - Coverage = stories with >=1 tm_requirement_links (external_key = issue_key)  (D-006)
 *   - Execution= tm_cycle_scope.current_status for cases in the project
 *   - Defects  = ph_issues 'QA Bug' / 'Production Incident' (hybrid, D-005) + tm_defects
 *   - Mismatch = story.status_category = 'Done' but a linked test failed             (B5 G-M1)
 *
 * Cross-schema (ph_* vs tm_*) has no FK, so we fetch per-source and join in JS.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPages } from './fetchAllPages';

export interface StoryRow {
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
}

export interface MismatchRow {
  issue_key: string;
  summary: string;
  status: string;
  case_key: string;
  test_status: string;
}

export interface ExecBreakdown {
  passed: number;
  failed: number;
  blocked: number;
  not_run: number;
  in_progress: number;
  skipped: number;
  total: number;
}

export interface ProjectTestingStatus {
  totalStories: number;
  coveredStories: number;
  coveragePct: number;
  exec: ExecBreakdown;
  defects: { qaBugs: number; incidents: number; tmDefects: number };
  mismatches: MismatchRow[];
  uncovered: StoryRow[];
}

const EMPTY_EXEC: ExecBreakdown = {
  passed: 0, failed: 0, blocked: 0, not_run: 0, in_progress: 0, skipped: 0, total: 0,
};

export function useProjectTestingStatus(projectId?: string, projectName?: string) {
  return useQuery({
    queryKey: ['project-testing-status', projectId, projectName],
    enabled: !!projectId && !!projectName,
    queryFn: async (): Promise<ProjectTestingStatus> => {
      // 1) In-scope stories (delivery side) — paged past the server max_rows cap
      const stories: StoryRow[] = await fetchAllPages<StoryRow>((from, to) =>
        supabase
          .from('ph_issues')
          .select('issue_key, summary, status, status_category')
          .eq('project_name', projectName!)
          .eq('issue_type', 'Story')
          .order('issue_key', { ascending: true })
          .range(from, to),
      );

      // 2) Covered story keys (test side) — requirement links for this project's cases
      const { data: linkData, error: linkError } = await supabase
        .from('tm_requirement_links')
        .select('external_key, tm_test_cases!inner(project_id)')
        .eq('requirement_type', 'story')
        .eq('tm_test_cases.project_id', projectId!);
      if (linkError) throw linkError;
      const coveredKeys = new Set<string>((linkData ?? []).map((l: { external_key: string }) => l.external_key));

      // 3) Execution distribution
      const { data: scopeData, error: scopeError } = await supabase
        .from('tm_cycle_scope')
        .select('current_status, tm_test_cases!inner(project_id)')
        .eq('tm_test_cases.project_id', projectId!);
      if (scopeError) throw scopeError;
      const exec: ExecBreakdown = { ...EMPTY_EXEC };
      for (const s of scopeData ?? []) {
        const k = (s as { current_status: string }).current_status as keyof ExecBreakdown;
        if (k in exec && k !== 'total') exec[k] += 1;
        exec.total += 1;
      }

      // 4) Governance mismatches: failed test on a story whose status_category = 'Done'
      const { data: failedData, error: failedError } = await supabase
        .from('tm_cycle_scope')
        .select('current_status, tm_test_cases!inner(case_key, project_id, tm_requirement_links(external_key, requirement_type))')
        .eq('tm_test_cases.project_id', projectId!)
        .eq('current_status', 'failed');
      if (failedError) throw failedError;
      const storyByKey = new Map(stories.map((s) => [s.issue_key, s]));
      const mismatches: MismatchRow[] = [];
      for (const row of failedData ?? []) {
        const tc = (row as { tm_test_cases?: { case_key?: string; tm_requirement_links?: { external_key: string; requirement_type: string }[] } }).tm_test_cases;
        const caseKey = tc?.case_key ?? '—';
        for (const link of tc?.tm_requirement_links ?? []) {
          if (link.requirement_type !== 'story') continue;
          const story = storyByKey.get(link.external_key);
          if (story && story.status_category === 'done') {
            mismatches.push({
              issue_key: story.issue_key,
              summary: story.summary,
              status: story.status,
              case_key: caseKey,
              test_status: 'failed',
            });
          }
        }
      }

      // 5) Defects (hybrid) + incidents — counts only
      const qaBugs = await supabase
        .from('ph_issues').select('issue_key', { count: 'exact', head: true })
        .eq('project_name', projectName!).eq('issue_type', 'QA Bug');
      if (qaBugs.error) throw qaBugs.error;
      const incidents = await supabase
        .from('ph_issues').select('issue_key', { count: 'exact', head: true })
        .eq('project_name', projectName!).eq('issue_type', 'Production Incident');
      if (incidents.error) throw incidents.error;
      const tmDefects = await supabase
        .from('tm_defects').select('id', { count: 'exact', head: true })
        .eq('project_id', projectId!);
      if (tmDefects.error) throw tmDefects.error;

      const totalStories = stories.length;
      const coveredStories = stories.filter((s) => coveredKeys.has(s.issue_key)).length;
      const uncovered = stories.filter((s) => !coveredKeys.has(s.issue_key));

      return {
        totalStories,
        coveredStories,
        coveragePct: totalStories ? Math.round((coveredStories / totalStories) * 1000) / 10 : 0,
        exec,
        defects: {
          qaBugs: qaBugs.count ?? 0,
          incidents: incidents.count ?? 0,
          tmDefects: tmDefects.count ?? 0,
        },
        mismatches,
        uncovered,
      };
    },
  });
}
