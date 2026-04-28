import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { Request, RequestStatus } from '@/types/request';

/**
 * Maps database initiative_status enum to UI RequestStatus type.
 */
const STATUS_MAP: Record<string, RequestStatus> = {
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

function mapDbStatus(dbStatus: string): RequestStatus {
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

export interface MDTInitiative extends Request {
  brd_tasks: BRDTask[];
}

/**
 * Fetches requests from ph_backlog_initiatives_view (canonical source).
 *
 * @deprecated Prefer `useRequestsBacklog` — the `MDT` in the legacy
 * name is a Jira-project-key fossil from the original mirror. The data
 * source today is `ph_backlog_initiatives_view`, a Catalyst-canonical
 * view over `ph_requests`. New consumers should adopt the renamed
 * alias; the old name stays exported until every call site is migrated.
 */
export function useMDTBacklog() {
  return useQuery({
    queryKey: ['mdt-backlog'],
    queryFn: async (): Promise<{ data: MDTInitiative[]; count: number }> => {
      // Get current user for favorites
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // Fetch requests, profiles, departments, scores, favorites, BRD tasks in parallel
      // 2026 GUARDRAIL — only show items created or updated in 2026+
      const YEAR_2026 = '2026-01-01T00:00:00Z';

      // BRD-Task sidecar fetch dropped — that path read `ph_issues`
      // filtered by project_key='MDT' AND issue_type IN ('BRD Task',
      // 'Sub-task') from the legacy Jira mirror. With Catalyst standing
      // on its own (no Jira inflow), the sub-task list rebuilds on
      // Catalyst-native data (existing `ph_request_milestones` and
      // the linked-items roll-up). Keeping `brd_tasks` shape on the
      // returned request as an empty array so consumers compile
      // unchanged; rebuild lands in a follow-up cycle.
      const [initResult, profilesResult, deptsResult, scoresResult, favsResult, milestonesResult] = await Promise.all([
        typedQuery('ph_backlog_initiatives_view').select('*').or(`created_at.gte.${YEAR_2026},updated_at.gte.${YEAR_2026}`).limit(5000),
        supabase.from('profiles').select('id, full_name, avatar_url'),
        typedQuery('ph_departments').select('id, name'),
        typedQuery('ph_request_scores').select('request_id, strategic_alignment, business_impact, time_urgency, resource_feasibility, computed_score'),
        currentUserId
          ? typedQuery('ph_user_favorites').select('request_id').eq('user_id', currentUserId)
          : Promise.resolve({ data: [] }),
        // Milestone counts per request — minimal projection for tally only
        typedQuery('ph_request_milestones').select('request_id').limit(10000),
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
        scoreMap.set(s.request_id, s);
      });

      const favSet = new Set<string>();
      (favsResult.data || []).forEach((f: any) => {
        favSet.add(f.request_id);
      });

      // BRD-Task → parent map dropped along with the sidecar fetch.
      // Consumers that read `brd_tasks` get an empty array per row so
      // existing JSX (`init.brd_tasks?.length` checks) compiles and
      // renders no sub-tasks until the Catalyst-native rebuild lands.

      // Tally milestones per request_id
      const milestoneCountMap = new Map<string, number>();
      (milestonesResult.data || []).forEach((m: any) => {
        if (!m.request_id) return;
        milestoneCountMap.set(m.request_id, (milestoneCountMap.get(m.request_id) || 0) + 1);
      });

      const requests: MDTInitiative[] = (initResult.data || []).map((row: any, idx: number) => {
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
          // Raw DB enum value passed through untranslated — kanban
          // column-routing reads this so `catalyst_workflow_statuses.slug_aliases`
          // can route legacy DB values (`new_demand`, `in_progress`,
          // `closed` etc.) into their post-rename columns. Without this,
          // STATUS_MAP collides with the workflow scheme and 41 of 47
          // cards drop on the floor.
          db_status: row.status as string,
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
          // `progress` is now driven by the linked-items roll-up computed in
          // ph_backlog_initiatives_view. Falls back to the legacy column for
          // older rows that have no linked work items yet.
          progress: row.linked_items_progress ?? row.progress ?? 0,
          linked_items_total: row.linked_items_total ?? 0,
          linked_items_done: row.linked_items_done ?? 0,
          linked_items_progress: row.linked_items_progress ?? 0,
          sort_order: row.sort_order ?? idx,
          risk_count: row.risk_count ?? 0,
          milestone_count: milestoneCountMap.get(row.id) ?? 0,
          is_archived: row.is_archived ?? false,
          is_favorited: favSet.has(row.id),
          score_strategic_alignment: scores?.strategic_alignment ?? null,
          score_business_impact: scores?.business_impact ?? null,
          score_time_urgency: scores?.time_urgency ?? null,
          score_resource_feasibility: scores?.resource_feasibility ?? null,
          computed_score: scores?.computed_score ?? null,
          on_roadmap: row.on_roadmap ?? false,
          health_status: row.health_status ?? null,
          business_value: row.business_value ?? null,
          ea_review: row.ea_review ?? null,
          priority: row.priority ?? null,
          source: row.source ?? 'catalyst',
          jira_issue_key: row.jira_issue_key ?? null,
          created_at: row.created_at,
          updated_at: row.updated_at,
          brd_tasks: [], // see comment above — empty until rebuild lands
        };
      });

      return { data: requests, count: requests.length };
    },
    staleTime: 2 * 60_000,
  });
}

/**
 * Catalyst-canonical name for the ProductHub backlog hook.
 *
 * Identical behavior to `useMDTBacklog` — both names point at the same
 * underlying query. Use this name in net-new code; the legacy name will
 * be removed once existing call sites have been migrated.
 */
export const useRequestsBacklog = useMDTBacklog;
