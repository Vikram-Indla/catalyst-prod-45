import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StatusCategory } from '@/constants/statusCategoryColors';

export interface WorkflowStatus {
  id: string;
  project_id: string;
  name: string;
  category: StatusCategory;
  color: string;
  position: number;
  is_default: boolean;
  archived_at: string | null;
  created_at: string;
}

export interface WorkflowStatusWithTypes extends WorkflowStatus {
  work_item_types: string[];
}

async function fetchProjectId(projectKey: string): Promise<string> {
  const { data, error } = await supabase
    .from('ph_projects' as any)
    .select('id')
    .eq('key', projectKey)
    .single();
  if (error) throw error;
  return (data as any).id as string;
}

export function useWorkflowStatuses(projectKey: string) {
  return useQuery({
    queryKey: ['workflow-statuses', projectKey],
    queryFn: async (): Promise<WorkflowStatusWithTypes[]> => {
      const projectId = await fetchProjectId(projectKey);

      const { data: statuses, error } = await supabase
        .from('ph_workflow_statuses' as any)
        .select('id, project_id, name, category, color, position, is_default, archived_at, created_at')
        .eq('project_id', projectId)
        .is('archived_at', null)
        .order('category')
        .order('position');

      if (error) throw error;

      const statusRows = (statuses ?? []) as WorkflowStatus[];
      const statusIds = statusRows.map((s) => s.id);

      if (statusIds.length === 0) return [];

      const { data: typeLinks, error: tlErr } = await supabase
        .from('ph_workflow_type_statuses' as any)
        .select('status_id, work_item_type')
        .eq('project_id', projectId)
        .in('status_id', statusIds);

      if (tlErr) throw tlErr;

      const typeMap: Record<string, string[]> = {};
      for (const row of (typeLinks ?? []) as { status_id: string; work_item_type: string }[]) {
        if (!typeMap[row.status_id]) typeMap[row.status_id] = [];
        typeMap[row.status_id].push(row.work_item_type);
      }

      return statusRows.map((s) => ({
        ...s,
        work_item_types: typeMap[s.id] ?? [],
      }));
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(projectKey),
  });
}

export interface CreateStatusInput {
  name: string;
  category: StatusCategory;
  color: string;
  position?: number;
  typeAssignments?: string[];
}

export function useCreateStatus(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStatusInput) => {
      const { typeAssignments, ...statusFields } = input;
      const projectId = await fetchProjectId(projectKey);
      const { data, error } = await supabase
        .from('ph_workflow_statuses' as any)
        .insert({ project_id: projectId, ...statusFields, position: statusFields.position ?? 0 })
        .select()
        .single();
      if (error) throw error;
      const newStatus = data as WorkflowStatus;
      if (typeAssignments && typeAssignments.length > 0) {
        const { error: taErr } = await supabase
          .from('ph_workflow_type_statuses' as any)
          .insert(
            typeAssignments.map((type, i) => ({
              project_id: projectId,
              work_item_type: type,
              status_id: newStatus.id,
              position: i,
              is_initial: false,
            }))
          );
        if (taErr) throw taErr;
      }
      return newStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-statuses', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['type-workflow', projectKey] });
    },
  });
}

export interface UpdateStatusInput {
  id: string;
  name?: string;
  category?: StatusCategory;
  color?: string;
  position?: number;
  is_default?: boolean;
  typeAssignments?: string[];
}

export function useUpdateStatus(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, typeAssignments, ...patch }: UpdateStatusInput) => {
      const { data, error } = await supabase
        .from('ph_workflow_statuses' as any)
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (typeAssignments !== undefined) {
        const projectId = await fetchProjectId(projectKey);
        const { data: existing, error: fetchErr } = await supabase
          .from('ph_workflow_type_statuses' as any)
          .select('id, work_item_type')
          .eq('status_id', id)
          .eq('project_id', projectId);
        if (fetchErr) throw fetchErr;
        const existingRows = (existing ?? []) as { id: string; work_item_type: string }[];
        const existingTypes = existingRows.map((r) => r.work_item_type);
        const toRemove = existingRows.filter((r) => !typeAssignments.includes(r.work_item_type));
        if (toRemove.length > 0) {
          const { error: delErr } = await supabase
            .from('ph_workflow_type_statuses' as any)
            .delete()
            .in('id', toRemove.map((r) => r.id));
          if (delErr) throw delErr;
        }
        const toAdd = typeAssignments.filter((t) => !existingTypes.includes(t));
        if (toAdd.length > 0) {
          const { error: insErr } = await supabase
            .from('ph_workflow_type_statuses' as any)
            .insert(
              toAdd.map((type, i) => ({
                project_id: projectId,
                work_item_type: type,
                status_id: id,
                position: existingTypes.length + i,
                is_initial: false,
              }))
            );
          if (insErr) throw insErr;
        }
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-statuses', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['type-workflow', projectKey] });
    },
  });
}

export function useArchiveStatus(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (statusId: string) => {
      const { error } = await supabase
        .from('ph_workflow_statuses' as any)
        .update({ archived_at: new Date().toISOString() })
        .eq('id', statusId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-statuses', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['type-workflow', projectKey] });
    },
  });
}
