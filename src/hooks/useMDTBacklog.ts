import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Initiative, InitiativeStatus } from '@/types/initiative';

/**
 * Maps database initiative_status enum to UI InitiativeStatus type.
 */
function mapDbStatus(dbStatus: string): InitiativeStatus {
  const statusMap: Record<string, InitiativeStatus> = {
    new_demand: 'new',
    under_review: 'portfolio_review',
    approved: 'demand_approved',
    in_progress: 'under_implementation',
    on_hold: 'on_hold',
    delivered: 'in_support',
    closed: 'done',
    cancelled: 'cancelled',
  };
  return statusMap[dbStatus] || 'new';
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
      // Fetch initiatives and profiles/departments in parallel
      const [initResult, profilesResult, deptsResult] = await Promise.all([
        (supabase as any).from('ph_backlog_initiatives_view').select('*').limit(5000),
        supabase.from('profiles').select('id, full_name, avatar_url'),
        (supabase as any).from('ph_departments').select('id, name'),
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

      const initiatives: MDTInitiative[] = (initResult.data || []).map((row: any, idx: number) => {
        const assigneeProfile = row.assignee_id ? profileMap.get(row.assignee_id) : null;
        const deptName = row.department_id ? deptMap.get(row.department_id) : null;

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
          business_owner_name: null,
          reporter_id: row.reporter_id || null,
          reporter_name: null,
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
          is_favorited: false,
          score_strategic_alignment: null,
          score_business_impact: null,
          score_time_urgency: null,
          score_resource_feasibility: null,
          computed_score: null,
          initiative_type_key: row.initiative_type_key ?? null,
          initiative_type_label: row.initiative_type_label ?? null,
          initiative_type_color_hex: row.initiative_type_color_hex ?? null,
          on_roadmap: row.on_roadmap ?? false,
          health_status: row.health_status ?? null,
          business_value: row.business_value ?? null,
          created_at: row.created_at,
          updated_at: row.updated_at,
          brd_tasks: [],
        };
      });

      return { data: initiatives, count: initiatives.length };
    },
    staleTime: 2 * 60_000,
  });
}
