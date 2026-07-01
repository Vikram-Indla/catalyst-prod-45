/**
 * useProductStatus — real-data hook for the Product / Business Request report (B1 group 4).
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001.
 *
 * Scope = an Epic (proxy for Business Request). Stories = epic's descendant stories via parent_key
 * (Epic→Story direct + Epic→Feature→Story). Coverage/execution/governance follow the proven chain.
 * Returns the shared ProjectTestingStatus shape so ReportStatusView can render it.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectTestingStatus, StoryRow, MismatchRow, ExecBreakdown } from './useProjectTestingStatus';

const EMPTY_EXEC: ExecBreakdown = { passed: 0, failed: 0, blocked: 0, not_run: 0, in_progress: 0, skipped: 0, total: 0 };

export function useProductStatus(epicKey?: string) {
  return useQuery({
    queryKey: ['product-status', epicKey],
    enabled: !!epicKey,
    queryFn: async (): Promise<ProjectTestingStatus> => {
      // direct children of the epic
      const { data: children } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, status, status_category, issue_type')
        .eq('parent_key', epicKey!);
      const kids = (children ?? []) as (StoryRow & { issue_type: string })[];
      const featureKeys = kids.filter((k) => k.issue_type === 'Feature').map((k) => k.issue_key);

      let stories: StoryRow[] = kids.filter((k) => k.issue_type === 'Story').map(({ issue_key, summary, status, status_category }) => ({ issue_key, summary, status, status_category }));
      if (featureKeys.length) {
        const { data: gk } = await supabase
          .from('ph_issues')
          .select('issue_key, summary, status, status_category')
          .in('parent_key', featureKeys)
          .eq('issue_type', 'Story');
        stories = stories.concat((gk ?? []) as StoryRow[]);
      }
      const storyByKey = new Map(stories.map((s) => [s.issue_key, s]));
      const storyKeys = stories.map((s) => s.issue_key);

      if (!storyKeys.length) {
        return { totalStories: 0, coveredStories: 0, coveragePct: 0, exec: { ...EMPTY_EXEC }, defects: { qaBugs: 0, incidents: 0, tmDefects: 0 }, mismatches: [], uncovered: [] };
      }

      // coverage links
      const { data: links } = await supabase.from('tm_requirement_links').select('external_key, test_case_id').eq('requirement_type', 'story').in('external_key', storyKeys);
      const coveredKeys = new Set<string>((links ?? []).map((l: { external_key: string }) => l.external_key));
      const caseIds = Array.from(new Set((links ?? []).map((l: { test_case_id: string }) => l.test_case_id)));
      const caseToStory = new Map<string, string>();
      for (const l of links ?? []) { const r = l as { external_key: string; test_case_id: string }; if (!caseToStory.has(r.test_case_id)) caseToStory.set(r.test_case_id, r.external_key); }

      // execution
      const exec: ExecBreakdown = { ...EMPTY_EXEC };
      const failedCases: string[] = [];
      if (caseIds.length) {
        const { data: scope } = await supabase.from('tm_cycle_scope').select('test_case_id, current_status').in('test_case_id', caseIds);
        for (const s of scope ?? []) {
          const row = s as { test_case_id: string; current_status: string };
          const k = row.current_status as keyof ExecBreakdown;
          if (k in exec && k !== 'total') exec[k] += 1;
          exec.total += 1;
          if (row.current_status === 'failed') failedCases.push(row.test_case_id);
        }
      }

      // governance: failed case on a Done story
      const mismatches: MismatchRow[] = [];
      for (const cid of failedCases) {
        const sk = caseToStory.get(cid);
        const story = sk ? storyByKey.get(sk) : undefined;
        if (story && story.status_category === 'done') mismatches.push({ issue_key: story.issue_key, summary: story.summary, status: story.status, case_key: cid.slice(0, 8), test_status: 'failed' });
      }

      const coveredStories = stories.filter((s) => coveredKeys.has(s.issue_key)).length;
      return {
        totalStories: stories.length,
        coveredStories,
        coveragePct: stories.length ? Math.round((coveredStories / stories.length) * 1000) / 10 : 0,
        exec,
        defects: { qaBugs: 0, incidents: 0, tmDefects: 0 },
        mismatches,
        uncovered: stories.filter((s) => !coveredKeys.has(s.issue_key)),
      };
    },
  });
}
