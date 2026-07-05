import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CoverageGapInfo {
  id: string;
  issue_key: string;
  type: string;
  summary: string;
  project_id: string;
  project_name: string;
  linked_test_count: number;
}

/**
 * Detects stories/features with no linked test cases.
 * Returns uncovered items grouped by project and type.
 * Sorted by project, then type, then key.
 */
export function useCoverageGaps() {
  return useQuery({
    queryKey: ['testops-coverage-gaps'],
    staleTime: 60_000,
    queryFn: async (): Promise<CoverageGapInfo[]> => {
      // Query ph_issues (story/feature) left join tm_requirement_links
      // to find items with zero test case links
      const { data: gaps, error } = await supabase.rpc('tm_get_coverage_gaps', {});

      if (error) {
        // Fallback: query client-side if RPC doesn't exist
        console.warn('RPC tm_get_coverage_gaps not found, falling back to client-side join');

        const { data: issues, error: issuesError } = await supabase
          .from('ph_issues')
          .select('id, issue_key, issue_type, summary, project_id')
          .in('issue_type', ['Story', 'Feature'])
          .is('deleted_at', null)
          .order('project_id')
          .order('issue_type');

        if (issuesError) throw issuesError;

        // Fetch all requirement links to cross-reference
        const { data: links, error: linksError } = await supabase
          .from('tm_requirement_links')
          .select('requirement_id, requirement_type');

        if (linksError) throw linksError;

        const linkedIds = new Set(
          (links ?? [])
            .filter((l: any) => l.requirement_type === 'story' || l.requirement_type === 'feature')
            .map((l: any) => l.requirement_id)
        );

        // Fetch projects for names
        const { data: projects } = await supabase.from('projects').select('id, name');
        const projectMap = new Map((projects ?? []).map((p: any) => [p.id, p.name]));

        // Filter uncovered and enrich
        return (issues ?? [])
          .filter((i: any) => !linkedIds.has(i.id))
          .map((i: any) => ({
            id: i.id,
            issue_key: i.issue_key,
            type: i.issue_type,
            summary: i.summary,
            project_id: i.project_id,
            project_name: projectMap.get(i.project_id) ?? '—',
            linked_test_count: 0,
          }));
      }

      // Use RPC result if available
      return (gaps ?? []).map((g: any) => ({
        id: g.id,
        issue_key: g.issue_key,
        type: g.issue_type,
        summary: g.summary,
        project_id: g.project_id,
        project_name: g.project_name ?? '—',
        linked_test_count: 0,
      }));
    },
  });
}
