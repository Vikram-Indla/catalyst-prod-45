/**
 * useProjectWorkItems — Fetches work items for a project with joined type/status/assignee
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
}

export function useProjectWorkItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['ph-work-items', projectId],
    queryFn: async (): Promise<WorkItemRow[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('ph_work_items')
        .select(`
          id, item_key, title, summary, item_type, priority, parent_id,
          assignee_id, due_date, start_date, is_flagged, flag_reason, sort_order,
          status_id, type_id, release_id, department, team, environment,
          security_level, cycle_time_days, status_changed_at, resolution,
          ph_work_types!ph_work_items_type_id_fkey (name, color, icon, level),
          ph_workflow_statuses!ph_work_items_status_id_fkey (name, category, color)
        `)
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching work items:', error);
        throw error;
      }

      // Batch-fetch assignee profiles
      const assigneeIds = [...new Set((data || []).map((r: any) => r.assignee_id).filter(Boolean))];
      let profileMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', assigneeIds);
        for (const p of profiles || []) {
          profileMap.set(p.id, { full_name: p.full_name || '', avatar_url: p.avatar_url });
        }
      }

      return (data || []).map((row: any) => {
        const profile = profileMap.get(row.assignee_id);
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
        };
      });
    },
    enabled: !!projectId,
  });
}
