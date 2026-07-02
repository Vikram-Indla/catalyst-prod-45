/**
 * Work item type registry hooks (ph_work_item_types / ph_hierarchy_levels /
 * ph_hierarchy_parent_rules) — CAT-WORKFLOW-STUDIO P3.
 * Reads are plain selects (RLS: authenticated); writes go through the
 * admin-asserted SECURITY DEFINER RPCs from 20260703100000.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const KEY = ['wf-v2', 'types'] as const;

export interface HierarchyLevel {
  id: string;
  org_id: string | null;
  level_rank: number;
  name: string;
  icon: string | null;
  color_token: string | null;
  is_enabled: boolean;
}

export interface WorkItemTypeRow {
  id: string;
  org_id: string | null;
  type_key: string;
  display_name: string;
  description: string | null;
  icon: string;
  color_token: string;
  kind: 'standard' | 'subtask';
  group_key: 'standard' | 'qa' | 'business' | 'technical';
  hierarchy_level_id: string | null;
  entity_key: string | null;
  default_wf_template_id: string | null;
  is_system: boolean;
  is_enabled: boolean;
  sort_order: number;
  archived_at: string | null;
}

export interface ParentRule {
  id: string;
  child_type_id: string;
  parent_type_id: string | null;
}

export function useHierarchyLevels() {
  return useQuery({
    queryKey: [...KEY, 'levels'],
    queryFn: async (): Promise<HierarchyLevel[]> => {
      const { data, error } = await supabase
        .from('ph_hierarchy_levels' as never)
        .select('*')
        .order('level_rank');
      if (error) throw error;
      return (data ?? []) as unknown as HierarchyLevel[];
    },
  });
}

export function useWorkItemTypes(includeArchived = false) {
  return useQuery({
    queryKey: [...KEY, 'list', includeArchived],
    queryFn: async (): Promise<WorkItemTypeRow[]> => {
      let q = supabase.from('ph_work_item_types' as never).select('*').order('sort_order');
      if (!includeArchived) q = q.is('archived_at', null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as WorkItemTypeRow[];
    },
  });
}

export function useParentRules() {
  return useQuery({
    queryKey: [...KEY, 'parent-rules'],
    queryFn: async (): Promise<ParentRule[]> => {
      const { data, error } = await supabase
        .from('ph_hierarchy_parent_rules' as never)
        .select('id, child_type_id, parent_type_id');
      if (error) throw error;
      return (data ?? []) as unknown as ParentRule[];
    },
  });
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw error;
  return data as T;
}

export interface WorkItemTypeInput {
  id?: string;
  type_key?: string;
  display_name?: string;
  description?: string;
  icon?: string;
  color_token?: string;
  kind?: 'standard' | 'subtask';
  group_key?: string;
  hierarchy_level_id?: string | null;
  entity_key?: string | null;
  is_enabled?: boolean;
  sort_order?: number;
}

export function useUpsertHierarchyLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (level: { id?: string; level_rank?: number; name?: string; is_enabled?: boolean }) =>
      rpc<string>('hi_upsert_level', { p_level: level }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'levels'] }),
  });
}

export function useUpsertWorkItemType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: WorkItemTypeInput) =>
      rpc<string>('wt_upsert_work_item_type', { p_type: type }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useArchiveWorkItemType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (typeId: string) => rpc<void>('wt_archive_work_item_type', { p_type_id: typeId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Replace the allowed-parent set. Include null in parentTypeIds for "may be root". */
export function useSetParentRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { childTypeId: string; parentTypeIds: (string | null)[] }) =>
      rpc<number>('hi_set_parent_rules', {
        p_child_type_id: input.childTypeId,
        p_parent_type_ids: input.parentTypeIds,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'parent-rules'] }),
  });
}
