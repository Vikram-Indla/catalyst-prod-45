/**
 * useWorkItemDetail — Fetches a single work item with all joined data
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkItemDetail {
  id: string;
  project_id: string;
  item_key: string;
  title: string;
  summary: string;
  description: string | null;
  item_type: string;
  priority: string;
  parent_id: string | null;
  assignee_id: string | null;
  reporter_id: string | null;
  due_date: string | null;
  start_date: string | null;
  is_flagged: boolean;
  sort_order: number;
  story_points: number | null;
  time_estimate: number | null;
  time_spent: number;
  resolution: string | null;
  status_id: string;
  type_id: string;
  created_at: string;
  updated_at: string;
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
  reporter_name: string | null;
  // Parent info
  parent_key: string | null;
  parent_title: string | null;
  parent_type_name: string | null;
  parent_type_color: string | null;
  parent_status_name: string | null;
  parent_status_category: string | null;
  // Children
  children: ChildItem[];
  // Linked items
  linked_items: LinkedItem[];
}

export interface ChildItem {
  id: string;
  item_key: string;
  title: string;
  summary: string;
  priority: string;
  status_name: string;
  status_category: string;
  assignee_name: string | null;
  type_name: string;
  type_color: string;
  status_id: string;
}

export interface LinkedItem {
  id: string;
  item_key: string;
  title: string;
  summary: string;
  link_type: string;
  type_name: string;
  type_color: string;
  status_name: string;
  status_category: string;
}

export function useWorkItemDetail(itemId: string | null) {
  return useQuery({
    queryKey: ['ph-work-item-detail', itemId],
    queryFn: async (): Promise<WorkItemDetail | null> => {
      if (!itemId) return null;

      // Main item
      const { data, error } = await supabase
        .from('ph_work_items')
        .select(`
          *,
          ph_work_types!ph_work_items_type_id_fkey (name, color, icon, level),
          ph_workflow_statuses!ph_work_items_status_id_fkey (name, category, color)
        `)
        .eq('id', itemId)
        .single();

      if (error) throw new Error(error.message);
      if (!data) return null;

      // Batch fetch profiles (assignee + reporter)
      const profileIds = [data.assignee_id, data.reporter_id].filter(Boolean) as string[];
      const profileMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', profileIds);
        for (const p of profiles || []) {
          profileMap.set(p.id, { full_name: p.full_name || '', avatar_url: p.avatar_url });
        }
      }

      // Fetch parent info
      let parentInfo: any = null;
      if (data.parent_id) {
        const { data: parent } = await supabase
          .from('ph_work_items')
          .select(`
            item_key, title, summary,
            ph_work_types!ph_work_items_type_id_fkey (name, color),
            ph_workflow_statuses!ph_work_items_status_id_fkey (name, category)
          `)
          .eq('id', data.parent_id)
          .single();
        parentInfo = parent;
      }

      // Fetch children
      const { data: childrenRaw } = await supabase
        .from('ph_work_items')
        .select(`
          id, item_key, title, summary, priority, status_id,
          ph_work_types!ph_work_items_type_id_fkey (name, color),
          ph_workflow_statuses!ph_work_items_status_id_fkey (name, category)
        `)
        .eq('parent_id', itemId)
        .order('sort_order');

      // Fetch children assignees
      const childAssigneeIds = [...new Set((childrenRaw || []).map((c: any) => c.assignee_id).filter(Boolean))];
      if (childAssigneeIds.length > 0) {
        const { data: childProfiles } = await supabase
          .from('profiles').select('id, full_name').in('id', childAssigneeIds);
        for (const p of childProfiles || []) {
          if (!profileMap.has(p.id)) profileMap.set(p.id, { full_name: p.full_name || '', avatar_url: null });
        }
      }

      const children: ChildItem[] = (childrenRaw || []).map((c: any) => ({
        id: c.id,
        item_key: c.item_key,
        title: c.title || c.summary,
        summary: c.summary,
        priority: c.priority || 'Medium',
        status_name: c.ph_workflow_statuses?.name ?? 'Backlog',
        status_category: c.ph_workflow_statuses?.category ?? 'todo',
        assignee_name: profileMap.get(c.assignee_id)?.full_name ?? null,
        type_name: c.ph_work_types?.name ?? 'Task',
        type_color: c.ph_work_types?.color ?? '#94A3B8',
        status_id: c.status_id,
      }));

      // Fetch linked items
      const { data: linksRaw } = await supabase
        .from('ph_issue_links')
        .select('id, link_type, source_id, target_id')
        .or(`source_id.eq.${itemId},target_id.eq.${itemId}`);

      const linkedItemIds = (linksRaw || []).map((l: any) => l.source_id === itemId ? l.target_id : l.source_id);
      let linked_items: LinkedItem[] = [];
      if (linkedItemIds.length > 0) {
        const { data: linkedRaw } = await supabase
          .from('ph_work_items')
          .select(`
            id, item_key, title, summary,
            ph_work_types!ph_work_items_type_id_fkey (name, color),
            ph_workflow_statuses!ph_work_items_status_id_fkey (name, category)
          `)
          .in('id', linkedItemIds);

        linked_items = (linkedRaw || []).map((li: any) => {
          const link = (linksRaw || []).find((l: any) =>
            (l.source_id === itemId && l.target_id === li.id) ||
            (l.target_id === itemId && l.source_id === li.id)
          );
          return {
            id: li.id,
            item_key: li.item_key,
            title: li.title || li.summary,
            summary: li.summary,
            link_type: link?.link_type ?? 'relates_to',
            type_name: li.ph_work_types?.name ?? 'Task',
            type_color: li.ph_work_types?.color ?? '#94A3B8',
            status_name: li.ph_workflow_statuses?.name ?? 'Backlog',
            status_category: li.ph_workflow_statuses?.category ?? 'todo',
          };
        });
      }

      const assignee = profileMap.get(data.assignee_id);
      const reporter = profileMap.get(data.reporter_id);

      return {
        id: data.id,
        project_id: data.project_id,
        item_key: data.item_key,
        title: data.title || data.summary,
        summary: data.summary,
        description: data.description,
        item_type: data.item_type,
        priority: data.priority || 'Medium',
        parent_id: data.parent_id,
        assignee_id: data.assignee_id,
        reporter_id: data.reporter_id,
        due_date: data.due_date,
        start_date: data.start_date,
        is_flagged: data.is_flagged ?? false,
        sort_order: data.sort_order ?? 0,
        story_points: data.story_points,
        time_estimate: data.time_estimate,
        time_spent: data.time_spent ?? 0,
        resolution: data.resolution,
        status_id: data.status_id,
        type_id: data.type_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        type_name: (data as any).ph_work_types?.name ?? data.item_type,
        type_color: (data as any).ph_work_types?.color ?? '#94A3B8',
        type_icon: (data as any).ph_work_types?.icon ?? 'circle',
        type_level: (data as any).ph_work_types?.level ?? 'work',
        status_name: (data as any).ph_workflow_statuses?.name ?? 'Backlog',
        status_category: (data as any).ph_workflow_statuses?.category ?? 'todo',
        status_color: (data as any).ph_workflow_statuses?.color ?? '#94A3B8',
        assignee_name: assignee?.full_name ?? null,
        assignee_avatar: assignee?.avatar_url ?? null,
        reporter_name: reporter?.full_name ?? null,
        parent_key: parentInfo?.item_key ?? null,
        parent_title: (parentInfo?.title || parentInfo?.summary) ?? null,
        parent_type_name: parentInfo?.ph_work_types?.name ?? null,
        parent_type_color: parentInfo?.ph_work_types?.color ?? null,
        parent_status_name: parentInfo?.ph_workflow_statuses?.name ?? null,
        parent_status_category: parentInfo?.ph_workflow_statuses?.category ?? null,
        children,
        linked_items,
      };
    },
    enabled: !!itemId,
  });
}
