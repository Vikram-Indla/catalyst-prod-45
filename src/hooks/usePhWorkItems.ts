/**
 * usePhWorkItems — Fetches ProjectHub work items with all joins
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
  reporter_id: string | null;
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
  created_at: string | null;
  updated_at: string | null;
  type_name: string;
  type_color: string;
  type_icon: string;
  type_level: string;
  status_name: string;
  status_category: string;
  status_color: string;
  assignee_name: string | null;
  assignee_avatar: string | null;
  reporter_name: string | null;
  release_name: string | null;
  release_status: string | null;
  comment_count: number;
  children_count: number;
  subtask_done: number;
  subtask_total: number;
  link_count: number;
  label_names: string[];
  component_names: string[];
}

export function usePhWorkItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['ph-work-items-full', projectId],
    queryFn: async (): Promise<WorkItemRow[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('ph_work_items')
        .select(`
          id, item_key, title, summary, item_type, priority, parent_id,
          assignee_id, reporter_id, due_date, start_date, is_flagged, flag_reason, sort_order,
          status_id, type_id, release_id, department, team, environment,
          security_level, cycle_time_days, status_changed_at, resolution,
          created_at, updated_at,
          ph_work_types!ph_work_items_type_id_fkey (name, color, icon, level),
          ph_workflow_statuses!ph_work_items_status_id_fkey (name, category, color)
        `)
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const rows = data || [];

      // Batch-fetch profiles
      const profileIds = [...new Set(rows.flatMap((r: any) => [r.assignee_id, r.reporter_id]).filter(Boolean))];
      const profileMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', profileIds);
        for (const p of profiles || []) profileMap.set(p.id, { full_name: p.full_name || '', avatar_url: p.avatar_url });
      }

      // Batch-fetch releases
      const releaseIds = [...new Set(rows.map((r: any) => r.release_id).filter(Boolean))];
      const releaseMap = new Map<string, { name: string; status: string }>();
      if (releaseIds.length > 0) {
        const { data: releases } = await supabase.from('ph_releases').select('id, name, title, status').in('id', releaseIds);
        for (const r of releases || []) releaseMap.set(r.id, { name: r.name || r.title || '', status: r.status || 'planning' });
      }

      // Children counts + subtask progress
      const childrenCountMap = new Map<string, number>();
      const subtaskProgressMap = new Map<string, { done: number; total: number }>();
      for (const row of rows) {
        if ((row as any).parent_id) {
          const pid = (row as any).parent_id;
          childrenCountMap.set(pid, (childrenCountMap.get(pid) || 0) + 1);
          const cat = (row as any).ph_workflow_statuses?.category;
          const p = subtaskProgressMap.get(pid) || { done: 0, total: 0 };
          p.total++;
          if (cat === 'done') p.done++;
          subtaskProgressMap.set(pid, p);
        }
      }

      return rows.map((row: any) => {
        const assignee = profileMap.get(row.assignee_id);
        const reporter = profileMap.get(row.reporter_id);
        const release = releaseMap.get(row.release_id);
        const sp = subtaskProgressMap.get(row.id);
        return {
          id: row.id, item_key: row.item_key, title: row.title || row.summary, summary: row.summary,
          item_type: row.item_type, priority: row.priority || 'medium', parent_id: row.parent_id,
          assignee_id: row.assignee_id, reporter_id: row.reporter_id,
          due_date: row.due_date, start_date: row.start_date,
          is_flagged: row.is_flagged ?? false, flag_reason: row.flag_reason,
          sort_order: row.sort_order ?? 0, release_id: row.release_id,
          department: row.department, team: row.team, environment: row.environment,
          security_level: row.security_level ?? 'standard',
          cycle_time_days: row.cycle_time_days, status_changed_at: row.status_changed_at,
          resolution: row.resolution, created_at: row.created_at, updated_at: row.updated_at,
          status_id: row.status_id, type_id: row.type_id,
          type_name: row.ph_work_types?.name ?? row.item_type,
          type_color: row.ph_work_types?.color ?? '#94A3B8',
          type_icon: row.ph_work_types?.icon ?? 'circle',
          type_level: row.ph_work_types?.level ?? 'work',
          status_name: row.ph_workflow_statuses?.name ?? 'Backlog',
          status_category: row.ph_workflow_statuses?.category ?? 'todo',
          status_color: row.ph_workflow_statuses?.color ?? '#94A3B8',
          assignee_name: assignee?.full_name ?? null,
          assignee_avatar: assignee?.avatar_url ?? null,
          reporter_name: reporter?.full_name ?? null,
          release_name: release?.name ?? null,
          release_status: release?.status ?? null,
          comment_count: 0, children_count: childrenCountMap.get(row.id) || 0,
          subtask_done: sp?.done ?? 0, subtask_total: sp?.total ?? 0,
          link_count: 0, label_names: [], component_names: [],
        };
      });
    },
    enabled: !!projectId,
  });
}
