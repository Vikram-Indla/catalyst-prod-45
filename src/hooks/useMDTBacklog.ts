import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { Initiative, InitiativeStatus } from '@/types/initiative';

/**
 * Maps database initiative_status enum to UI InitiativeStatus type.
 */
const STATUS_MAP: Record<string, InitiativeStatus> = {
  new_demand: 'new',
  new: 'new',
  under_review: 'portfolio_review',
  portfolio_review: 'portfolio_review',
  technical_validation: 'technical_validation',
  estimate: 'estimate',
  approved: 'demand_approved',
  demand_approved: 'demand_approved',
  analysis: 'analysis',
  ready_for_development: 'ready_for_development',
  in_progress: 'under_implementation',
  under_implementation: 'under_implementation',
  implementation_review: 'implementation_review',
  on_hold: 'on_hold',
  delivered: 'in_support',
  in_support: 'in_support',
  closed: 'done',
  done: 'done',
  cancelled: 'cancelled',
};

function mapDbStatus(dbStatus: string): InitiativeStatus {
  return STATUS_MAP[dbStatus] || 'new';
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
  brd_tasks: BRDTask[];
}

/**
 * Fetches initiatives from ph_backlog_initiatives_view (canonical source).
 */
export function useMDTBacklog() {
  return useQuery({
    queryKey: ['mdt-backlog'],
    queryFn: async (): Promise<{ data: MDTInitiative[]; count: number }> => {
      // Get current user for favorites
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // Fetch initiatives, profiles, departments, scores, favorites, BRD tasks in parallel
      // 2026 GUARDRAIL — only show items created or updated in 2026+
      const YEAR_2026 = '2026-01-01T00:00:00Z';

      const [initResult, profilesResult, deptsResult, scoresResult, favsResult, brdTasksResult] = await Promise.all([
        typedQuery('ph_backlog_initiatives_view').select('*').or(`created_at.gte.${YEAR_2026},updated_at.gte.${YEAR_2026}`).limit(5000),
        supabase.from('profiles').select('id, full_name, avatar_url'),
        typedQuery('ph_departments').select('id, name'),
        typedQuery('ph_initiative_scores').select('initiative_id, strategic_alignment, business_impact, time_urgency, resource_feasibility, computed_score'),
        currentUserId
          ? typedQuery('ph_user_favorites').select('initiative_id').eq('user_id', currentUserId)
          : Promise.resolve({ data: [] }),
        // Fetch BRD Tasks (sub-tasks of Business Requests) from ph_issues
        typedQuery('ph_issues')
          .select('issue_key, summary, status, assignee_display_name, priority, jira_created_at, jira_updated_at, parent_key')
          .eq('project_key', 'MDT')
          .in('issue_type', ['BRD Task', 'Sub-task'])
          .not('parent_key', 'is', null)
          .is('archived_at', null)
          .limit(5000),
      ]);

      if (initResult.error) throw initResult.error;

      // Build lookup maps
      const profileMap = new Map<string, { name: string; avatar: string | null }>();
      (profilesResult.data || []).forEach((p: any) => {
        profileMap.set(p.id, { name: p.full_name || '', avatar: p.avatar_url || null });
      });

      const deptMap = new Map<string, string>();
      (deptsResult.data || []).forEach((d: any) => {
        deptMap.set(d.id, d.name);
      });

      const scoreMap = new Map<string, any>();
      (scoresResult.data || []).forEach((s: any) => {
        scoreMap.set(s.initiative_id, s);
      });

      const favSet = new Set<string>();
      (favsResult.data || []).forEach((f: any) => {
        favSet.add(f.initiative_id);
      });

      // Build BRD tasks map: parent Jira key → BRDTask[]
      const brdTasksByParent = new Map<string, BRDTask[]>();
      (brdTasksResult.data || []).forEach((t: any) => {
        if (!t.parent_key) return;
        const key = t.parent_key;
        if (!brdTasksByParent.has(key)) brdTasksByParent.set(key, []);
        brdTasksByParent.get(key)!.push({
          issue_key: t.issue_key,
          summary: t.summary,
          status: t.status,
          assignee_display_name: t.assignee_display_name,
          priority: t.priority,
          jira_created_at: t.jira_created_at,
          jira_updated_at: t.jira_updated_at,
        });
      });

      const initiatives: MDTInitiative[] = (initResult.data || []).map((row: any, idx: number) => {
        const assigneeProfile = row.assignee_id ? profileMap.get(row.assignee_id) : null;
        const businessOwnerProfile = row.business_owner_id ? profileMap.get(row.business_owner_id) : null;
        const reporterProfile = row.reporter_id ? profileMap.get(row.reporter_id) : null;
        const deptName = row.department_id ? deptMap.get(row.department_id) : null;
        const scores = scoreMap.get(row.id);

        return {
          id: row.id,
          initiative_key: row.initiative_key,
          title: row.title,
          description: row.description || null,
          status: mapDbStatus(row.status),
          assignee_id: row.assignee_id || null,
          assignee_name: assigneeProfile?.name || null,
          assignee_avatar: assigneeProfile?.avatar || null,
          business_owner_id: row.business_owner_id || null,
          business_owner_name: businessOwnerProfile?.name || null,
          reporter_id: row.reporter_id || null,
          reporter_name: reporterProfile?.name || null,
          department_id: row.department_id || null,
          department_name: deptName || null,
          target_quarter: row.target_quarter || null,
          business_ask_date: row.business_ask_date || null,
          kickoff_date: row.kickoff_date || null,
          target_complete: row.target_complete || null,
          progress: row.progress ?? 0,
          sort_order: row.sort_order ?? idx,
          risk_count: row.risk_count ?? 0,
          is_archived: row.is_archived ?? false,
          is_favorited: favSet.has(row.id),
          score_strategic_alignment: scores?.strategic_alignment ?? null,
          score_business_impact: scores?.business_impact ?? null,
          score_time_urgency: scores?.time_urgency ?? null,
          score_resource_feasibility: scores?.resource_feasibility ?? null,
          computed_score: scores?.computed_score ?? null,
          initiative_type_key: row.initiative_type_key ?? null,
          initiative_type_label: row.initiative_type_label ?? null,
          initiative_type_color_hex: row.initiative_type_color_hex ?? null,
          on_roadmap: row.on_roadmap ?? false,
          health_status: row.health_status ?? null,
          business_value: row.business_value ?? null,
          ea_review: row.ea_review ?? null,
          priority: row.priority ?? null,
          source: row.source ?? 'catalyst',
          jira_issue_key: row.jira_issue_key ?? null,
          created_at: row.created_at,
          updated_at: row.updated_at,
          brd_tasks: brdTasksByParent.get(row.jira_issue_key || row.initiative_key) || [],
        };
      });

      return { data: initiatives, count: initiatives.length };
    },
    staleTime: 2 * 60_000,
  });
}
