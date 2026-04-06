/**
 * useProjectWorkItems — Fetches work items for a project with joined type/status/assignee
 * Stage D: Includes source provenance fields from real DB
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkItemRow {
  id: string;
  item_key: string;
  title: string;
  summary: string;
  item_type: string;
  priority: string;
  parent_id: string | null;
  assignee_id: string | null;
  due_date: string | null;
  start_date: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  sort_order: number;
  status_id: string;
  type_id: string;
  release_id: string | null;
  department: string | null;
  team: string | null;
  environment: string | null;
  security_level: string;
  cycle_time_days: number | null;
  status_changed_at: string | null;
  resolution: string | null;
  // Joined
  type_name: string;
  type_color: string;
  type_icon: string;
  type_level: string;
  status_name: string;
  status_category: string;
  status_color: string;
  assignee_name: string | null;
  assignee_avatar: string | null;
  // Source provenance (Stage D)
  source: 'catalyst' | 'jira';
  sync_status: string | null;
  last_synced_at: string | null;
  jira_issue_id: string | null;
  release_name: string | null;
}

export function useProjectWorkItems(projectId: string | undefined, sourceFilter?: 'all' | 'catalyst' | 'jira') {
  return useQuery({
    queryKey: ['ph-work-items', projectId, sourceFilter],
    queryFn: async (): Promise<WorkItemRow[]> => {
      if (!projectId) return [];

      // @ts-ignore - deep type instantiation with complex select
      let query = supabase
        .from('ph_work_items')
        .select(
          'id, item_key, title, summary, item_type, priority, parent_id, assignee_id, due_date, start_date, is_flagged, flag_reason, sort_order, status_id, type_id, release_id, department, team, environment, security_level, cycle_time_days, status_changed_at, resolution, sync_source, last_synced_at, jira_issue_id, ph_work_types!ph_work_items_type_id_fkey (name, color, icon, level), ph_workflow_statuses!ph_work_items_status_id_fkey (name, category, color), ph_releases!ph_work_items_release_id_fkey (name)'
        )
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      // Apply source filter at DB level
      if (sourceFilter && sourceFilter !== 'all') {
        query = query.eq('sync_source', sourceFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching work items:', error);
        throw error;
      }

      // Batch-fetch assignee profiles
      const assigneeIds = [...new Set((data || []).map((r: any) => r.assignee_id).filter(Boolean))] as string[];
      let profileMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', assigneeIds as string[]);
        for (const p of profiles || []) {
          profileMap.set(p.id, { full_name: p.full_name || '', avatar_url: p.avatar_url });
        }
      }

      // Derive sync_status for ph_work_items (which don't have it natively)
      // Logic: if sync_source='jira' and last_synced_at older than 3 days → stale
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

      return (data || []).map((row: any) => {
        const profile = profileMap.get(row.assignee_id);
        const syncSource = row.sync_source || 'catalyst';
        let syncStatus: string | null = null;

        if (syncSource === 'jira') {
          if (row.last_synced_at) {
            const age = Date.now() - new Date(row.last_synced_at).getTime();
            syncStatus = age > THREE_DAYS_MS ? 'stale' : 'synced';
          } else {
            syncStatus = 'pending';
          }
        }

        return {
          id: row.id,
          item_key: row.item_key,
          title: row.title || row.summary,
          summary: row.summary,
          item_type: row.item_type,
          priority: row.priority || 'medium',
          parent_id: row.parent_id,
          assignee_id: row.assignee_id,
          due_date: row.due_date,
          start_date: row.start_date,
          is_flagged: row.is_flagged ?? false,
          flag_reason: row.flag_reason,
          sort_order: row.sort_order ?? 0,
          release_id: row.release_id,
          department: row.department,
          team: row.team,
          environment: row.environment,
          security_level: row.security_level ?? 'standard',
          cycle_time_days: row.cycle_time_days,
          status_changed_at: row.status_changed_at,
          resolution: row.resolution,
          status_id: row.status_id,
          type_id: row.type_id,
          type_name: row.ph_work_types?.name ?? row.item_type,
          type_color: row.ph_work_types?.color ?? '#94A3B8',
          type_icon: row.ph_work_types?.icon ?? 'circle',
          type_level: row.ph_work_types?.level ?? 'work',
          status_name: row.ph_workflow_statuses?.name ?? 'Backlog',
          status_category: row.ph_workflow_statuses?.category ?? 'todo',
          status_color: row.ph_workflow_statuses?.color ?? '#94A3B8',
          assignee_name: profile?.full_name ?? null,
          assignee_avatar: profile?.avatar_url ?? null,
          // Source provenance
          source: syncSource as 'catalyst' | 'jira',
          sync_status: syncStatus,
          last_synced_at: row.last_synced_at ?? null,
          jira_issue_id: row.jira_issue_id ?? null,
          release_name: row.ph_releases?.name ?? null,
        };
      });
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}
