import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Initiative, InitiativeStatus } from '@/types/initiative';

/**
 * Maps Jira status string to InitiativeStatus — uses the actual Jira status directly.
 */
function mapStatus(jiraStatus: string): InitiativeStatus {
  switch (jiraStatus) {
    case 'Ready for Development': return 'ready_for_development';
    case 'Technical validation': return 'technical_validation';
    case 'Under Implementation': return 'under_implementation';
    default: return 'new';
  }
}

export interface BRDTask {
  issue_key: string;
  summary: string;
  status: string;
  assignee_display_name: string | null;
  priority: string | null;
  jira_created_at: string;
  jira_updated_at: string;
}

export interface MDTInitiative extends Initiative {
  /** BRD Tasks linked by summary match */
  brd_tasks: BRDTask[];
}

/**
 * Fetches MDT Business Requests (filtered statuses) with their BRD Task children.
 * BRD Tasks are matched by the "BRD of [BR summary]" naming convention.
 */
export function useMDTBacklog() {
  return useQuery({
    queryKey: ['mdt-backlog'],
    queryFn: async (): Promise<{ data: MDTInitiative[]; count: number }> => {
      // Fetch Business Requests
      const { data: brData, error: brError } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, status, priority, assignee_display_name, reporter_display_name, description_text, due_date, labels, story_points, jira_created_at, jira_updated_at, type_icon_url')
        .eq('project_key', 'MDT')
        .eq('issue_type', 'Business Request')
        .in('status', ['Ready for Development', 'Technical validation', 'Under Implementation'])
        .order('jira_created_at', { ascending: false });

      if (brError) throw brError;

      // Fetch ALL BRD Tasks for MDT to match against BRs
      const { data: brdData, error: brdError } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, status, priority, assignee_display_name, jira_created_at, jira_updated_at')
        .eq('project_key', 'MDT')
        .eq('issue_type', 'BRD Task');

      if (brdError) throw brdError;

      // Build a lookup: normalize BR summaries for matching
      const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

      const initiatives: MDTInitiative[] = (brData || []).map((br, idx) => {
        const brSummaryNorm = normalize(br.summary);

        // Match BRD Tasks: "BRD of [summary]" or exact summary match
        const matchedTasks: BRDTask[] = (brdData || []).filter(task => {
          const taskNorm = normalize(task.summary);
          const stripped = taskNorm.replace(/^brd\s+of\s+/, '').replace(/^brdss?\s*$/, '');
          return stripped === brSummaryNorm || taskNorm.includes(brSummaryNorm);
        }).map(t => ({
          issue_key: t.issue_key,
          summary: t.summary,
          status: t.status,
          assignee_display_name: t.assignee_display_name,
          priority: t.priority,
          jira_created_at: t.jira_created_at,
          jira_updated_at: t.jira_updated_at,
        }));

        return {
          id: br.issue_key,
          initiative_key: br.issue_key,
          title: br.summary,
          description: br.description_text || null,
          status: mapStatus(br.status),
          assignee_id: null,
          assignee_name: br.assignee_display_name || null,
          assignee_avatar: null,
          business_owner_id: null,
          business_owner_name: br.reporter_display_name || null,
          reporter_id: null,
          reporter_name: br.reporter_display_name || null,
          department_id: null,
          department_name: 'Digital Transformation',
          target_quarter: null,
          business_ask_date: null,
          kickoff_date: null,
          target_complete: br.due_date || null,
          progress: br.status === 'Under Implementation' ? 50 : br.status === 'Ready for Development' ? 25 : 10,
          sort_order: idx,
          risk_count: 0,
          is_archived: false,
          is_favorited: false,
          score_strategic_alignment: null,
          score_business_impact: null,
          score_time_urgency: null,
          score_resource_feasibility: null,
          computed_score: null,
          created_at: br.jira_created_at,
          updated_at: br.jira_updated_at,
          brd_tasks: matchedTasks,
        };
      });

      return { data: initiatives, count: initiatives.length };
    },
    staleTime: 2 * 60_000,
  });
}
