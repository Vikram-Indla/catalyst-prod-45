/**
 * useSprintTestingStatus — real-data hook for the Sprint Testing Status report.
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001 (B1 group 3 + B2 sprint scope).
 *
 * Sprint scope (D-002/D-003): a sprint's stories = ph_issues (issue_type='Story') whose
 * sprint_release JSONB contains an entry with name = <sprint name>. Coverage/execution/
 * governance then follow the same tm_* chain as the project report.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StoryRow, MismatchRow, ExecBreakdown, ProjectTestingStatus } from './useProjectTestingStatus';

const EMPTY_EXEC: ExecBreakdown = {
  passed: 0, failed: 0, blocked: 0, not_run: 0, in_progress: 0, skipped: 0, total: 0,
};

export function useSprintTestingStatus(sprintName?: string) {
  return useQuery({
    queryKey: ['sprint-testing-status', sprintName],
    enabled: !!sprintName,
    queryFn: async (): Promise<ProjectTestingStatus> => {
      // sprint_release is a JSONB array [{id,name,releaseDate}]; PostgREST containment encoding is
      // unreliable for names with spaces/commas, so scope is resolved client-side.
      const inSprint = (sr: unknown) => Array.isArray(sr) && sr.some((e) => (e as { name?: string })?.name === sprintName);

      // 1) Sprint-scope stories
      const { data: storyData } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, status, status_category, sprint_release')
        .eq('issue_type', 'Story');
      const stories: StoryRow[] = (storyData ?? [])
        .filter((s) => inSprint((s as { sprint_release?: unknown }).sprint_release))
        .map((s) => {
          const r = s as StoryRow;
          return { issue_key: r.issue_key, summary: r.summary, status: r.status, status_category: r.status_category };
        });
      const storyKeys = stories.map((s) => s.issue_key);
      const storyByKey = new Map(stories.map((s) => [s.issue_key, s]));

      if (storyKeys.length === 0) {
        return {
          totalStories: 0, coveredStories: 0, coveragePct: 0,
          exec: { ...EMPTY_EXEC }, defects: { qaBugs: 0, incidents: 0, tmDefects: 0 },
          mismatches: [], uncovered: [],
        };
      }

      // 2) Links for those stories → covered keys + case ids
      const { data: linkData } = await supabase
        .from('tm_requirement_links')
        .select('external_key, test_case_id')
        .eq('requirement_type', 'story')
        .in('external_key', storyKeys);
      const coveredKeys = new Set<string>((linkData ?? []).map((l: { external_key: string }) => l.external_key));
      const caseIds = Array.from(new Set((linkData ?? []).map((l: { test_case_id: string }) => l.test_case_id)));
      const caseToStory = new Map<string, string>();
      for (const l of linkData ?? []) {
        const row = l as { external_key: string; test_case_id: string };
        if (!caseToStory.has(row.test_case_id)) caseToStory.set(row.test_case_id, row.external_key);
      }

      // case_key lookup for readable governance rows
      const caseKeyById = new Map<string, string>();
      if (caseIds.length) {
        const { data: cs } = await supabase.from('tm_test_cases').select('id, case_key').in('id', caseIds);
        for (const c of cs ?? []) caseKeyById.set((c as { id: string }).id, (c as { case_key: string }).case_key);
      }

      // 3) Execution + per-case status (for governance)
      const exec: ExecBreakdown = { ...EMPTY_EXEC };
      const caseStatus = new Map<string, string>();
      if (caseIds.length) {
        const { data: scope } = await supabase
          .from('tm_cycle_scope')
          .select('test_case_id, current_status')
          .in('test_case_id', caseIds);
        for (const s of scope ?? []) {
          const row = s as { test_case_id: string; current_status: string };
          const k = row.current_status as keyof ExecBreakdown;
          if (k in exec && k !== 'total') exec[k] += 1;
          exec.total += 1;
          if (row.current_status === 'failed') caseStatus.set(row.test_case_id, 'failed');
        }
      }

      // 4) Governance mismatches: failed case on a Done story
      const mismatches: MismatchRow[] = [];
      for (const [caseId, status] of caseStatus) {
        if (status !== 'failed') continue;
        const storyKey = caseToStory.get(caseId);
        const story = storyKey ? storyByKey.get(storyKey) : undefined;
        if (story && story.status_category === 'Done') {
          mismatches.push({ issue_key: story.issue_key, summary: story.summary, status: story.status, case_key: caseKeyById.get(caseId) ?? '—', test_status: 'failed' });
        }
      }

      // 5) Defects (hybrid): test-linked + sprint QA bugs/incidents
      let tmDefects = 0;
      if (caseIds.length) {
        const d = await supabase.from('tm_defects').select('id', { count: 'exact', head: true }).in('source_test_case_id', caseIds);
        tmDefects = d.count ?? 0;
      }
      const { data: qb } = await supabase.from('ph_issues').select('sprint_release').eq('issue_type', 'QA Bug');
      const qaBugs = (qb ?? []).filter((r) => inSprint((r as { sprint_release?: unknown }).sprint_release)).length;
      const { data: inc } = await supabase.from('ph_issues').select('sprint_release').eq('issue_type', 'Production Incident');
      const incidents = (inc ?? []).filter((r) => inSprint((r as { sprint_release?: unknown }).sprint_release)).length;

      const coveredStories = stories.filter((s) => coveredKeys.has(s.issue_key)).length;
      const uncovered = stories.filter((s) => !coveredKeys.has(s.issue_key));

      return {
        totalStories: stories.length,
        coveredStories,
        coveragePct: stories.length ? Math.round((coveredStories / stories.length) * 1000) / 10 : 0,
        exec,
        defects: { qaBugs, incidents, tmDefects },
        mismatches,
        uncovered,
      };
    },
  });
}
