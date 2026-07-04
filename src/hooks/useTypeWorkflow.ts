import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type { WorkflowStatus } from './useWorkflowStatuses';

export const WORK_ITEM_TYPES = [
  'Story',
  'Epic',
  'Feature',
  'Task',
  'Sub-task',
  'QA Bug',
  'Production Incident',
  'Business Request',
  'BRD Task',
  'Business Gap',
  'Change Request',
  'API Requirement',
  'UAT Finding',
  'Frontend',
  'Backend',
  'Integration',
  'Figma',
] as const;

export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export interface TypeStatus extends WorkflowStatus {
  position: number;
  is_initial: boolean;
}

export interface Transition {
  id: string;
  project_id: string;
  work_item_type: string | null;
  from_status_id: string | null;
  to_status_id: string;
}

export interface TypeWorkflow {
  statuses: TypeStatus[];
  transitions: Transition[];
  initialStatusId: string | null;
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

/**
 * Legacy write freeze (ph_workflow_type_statuses / ph_workflow_transitions
 * only). All 11 entities have a published ph_wf_* version, so
 * useCanonicalIssueWorkflow always resolves canonical and these tables are
 * already dead for gating — editing them here silently does nothing to
 * runtime enforcement. Reads (useTypeWorkflow) stay live: WorkflowTypePanel
 * still displays this data, it just can't be edited from here anymore.
 * ph_workflow_statuses (board-column master, read across ~15 live surfaces)
 * is NOT frozen — it has no Studio replacement yet.
 */
function assertLegacyRulesWritable(): never {
  throw new Error(
    'This workflow editor is frozen. Transition and status rules are edited in the Workflow Studio (/admin/workflows) now.'
  );
}

export function useTypeWorkflow(projectKey: string, workItemType: WorkItemType) {
  return useQuery({
    queryKey: ['type-workflow', projectKey, workItemType],
    queryFn: async (): Promise<TypeWorkflow> => {
      const projectId = await fetchProjectId(projectKey);

      const { data: typeStatuses, error: tsErr } = await supabase
        .from('ph_workflow_type_statuses' as any)
        .select('status_id, position, is_initial')
        .eq('project_id', projectId)
        .eq('work_item_type', workItemType)
        .order('position');

      if (tsErr) throw tsErr;

      const typeStatusRows = (typeStatuses ?? []) as {
        status_id: string;
        position: number;
        is_initial: boolean;
      }[];

      const statusIds = typeStatusRows.map((r) => r.status_id);

      let statuses: TypeStatus[] = [];

      if (statusIds.length > 0) {
        const { data: statusData, error: sdErr } = await supabase
          .from('ph_workflow_statuses' as any)
          .select('id, project_id, name, category, color, position, is_default, archived_at, created_at')
          .in('id', statusIds)
          .is('archived_at', null);

        if (sdErr) throw sdErr;

        const statusMap = new Map(
          ((statusData ?? []) as WorkflowStatus[]).map((s) => [s.id, s])
        );

        statuses = typeStatusRows
          .filter((r) => statusMap.has(r.status_id))
          .map((r) => ({
            ...statusMap.get(r.status_id)!,
            position: r.position,
            is_initial: r.is_initial,
          }));
      }

      // Type-specific transitions
      const { data: typeTransitions, error: ttErr } = await supabase
        .from('ph_workflow_transitions' as any)
        .select('id, project_id, work_item_type, from_status_id, to_status_id')
        .eq('project_id', projectId)
        .eq('work_item_type', workItemType);

      if (ttErr) throw ttErr;

      // Global transitions (work_item_type IS NULL)
      const { data: globalTransitions, error: gtErr } = await supabase
        .from('ph_workflow_transitions' as any)
        .select('id, project_id, work_item_type, from_status_id, to_status_id')
        .eq('project_id', projectId)
        .is('work_item_type', null);

      if (gtErr) throw gtErr;

      const transitions = [
        ...((typeTransitions ?? []) as Transition[]),
        ...((globalTransitions ?? []) as Transition[]),
      ];

      const initialRow = typeStatusRows.find((r) => r.is_initial);

      return {
        statuses,
        transitions,
        initialStatusId: initialRow?.status_id ?? null,
      };
    },
    staleTime: 0,
    enabled: Boolean(projectKey) && Boolean(workItemType),
  });
}

export interface AddTypeStatusInput {
  statusId: string;
  position?: number;
  isInitial?: boolean;
}

export function useAddTypeStatus(projectKey: string, workItemType: WorkItemType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ statusId, position = 0, isInitial = false }: AddTypeStatusInput) => {
      assertLegacyRulesWritable();
      const projectId = await fetchProjectId(projectKey);
      const { error } = await supabase
        .from('ph_workflow_type_statuses' as any)
        .insert({
          project_id: projectId,
          work_item_type: workItemType,
          status_id: statusId,
          position,
          is_initial: isInitial,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-statuses', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['type-workflow', projectKey] });
    },
    onError: (err: unknown) => {
      catalystToast.error(err instanceof Error ? err.message : 'Legacy workflow editing is frozen.');
    },
  });
}

export function useRemoveTypeStatus(projectKey: string, workItemType: WorkItemType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (statusId: string) => {
      assertLegacyRulesWritable();
      const projectId = await fetchProjectId(projectKey);
      const { error } = await supabase
        .from('ph_workflow_type_statuses' as any)
        .delete()
        .eq('project_id', projectId)
        .eq('work_item_type', workItemType)
        .eq('status_id', statusId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-statuses', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['type-workflow', projectKey] });
    },
    onError: (err: unknown) => {
      catalystToast.error(err instanceof Error ? err.message : 'Legacy workflow editing is frozen.');
    },
  });
}

export interface SetInitialStatusInput {
  statusId: string;
}

export function useSetInitialStatus(projectKey: string, workItemType: WorkItemType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ statusId }: SetInitialStatusInput) => {
      assertLegacyRulesWritable();
      const projectId = await fetchProjectId(projectKey);
      // Clear existing initial
      const { error: clearErr } = await supabase
        .from('ph_workflow_type_statuses' as any)
        .update({ is_initial: false })
        .eq('project_id', projectId)
        .eq('work_item_type', workItemType);
      if (clearErr) throw clearErr;
      // Set new initial
      const { error } = await supabase
        .from('ph_workflow_type_statuses' as any)
        .update({ is_initial: true })
        .eq('project_id', projectId)
        .eq('work_item_type', workItemType)
        .eq('status_id', statusId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['type-workflow', projectKey] });
    },
    onError: (err: unknown) => {
      catalystToast.error(err instanceof Error ? err.message : 'Legacy workflow editing is frozen.');
    },
  });
}

export interface AddTransitionInput {
  fromStatusId: string | null;
  toStatusId: string;
  isGlobal?: boolean;
}

export function useAddTransition(projectKey: string, workItemType: WorkItemType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fromStatusId, toStatusId, isGlobal = false }: AddTransitionInput) => {
      assertLegacyRulesWritable();
      const projectId = await fetchProjectId(projectKey);
      const { error } = await supabase
        .from('ph_workflow_transitions' as any)
        .insert({
          project_id: projectId,
          work_item_type: isGlobal ? null : workItemType,
          from_status_id: fromStatusId,
          to_status_id: toStatusId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['type-workflow', projectKey] });
    },
    onError: (err: unknown) => {
      catalystToast.error(err instanceof Error ? err.message : 'Legacy workflow editing is frozen.');
    },
  });
}

export function useDeleteTransition(projectKey: string, workItemType: WorkItemType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transitionId: string) => {
      assertLegacyRulesWritable();
      const { error } = await supabase
        .from('ph_workflow_transitions' as any)
        .delete()
        .eq('id', transitionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['type-workflow', projectKey] });
    },
    onError: (err: unknown) => {
      catalystToast.error(err instanceof Error ? err.message : 'Legacy workflow editing is frozen.');
    },
  });
}

export function useReorderTypeStatuses(projectKey: string, workItemType: WorkItemType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderedStatusIds: string[]) => {
      assertLegacyRulesWritable();
      const projectId = await fetchProjectId(projectKey);
      const updates = orderedStatusIds.map((statusId, index) =>
        supabase
          .from('ph_workflow_type_statuses' as any)
          .update({ position: index })
          .eq('project_id', projectId)
          .eq('work_item_type', workItemType)
          .eq('status_id', statusId)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['type-workflow', projectKey] });
    },
    onError: (err: unknown) => {
      catalystToast.error(err instanceof Error ? err.message : 'Legacy workflow editing is frozen.');
    },
  });
}

export function useCopyTypeWorkflow(projectKey: string, workItemType: WorkItemType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fromType: WorkItemType) => {
      assertLegacyRulesWritable();
      const projectId = await fetchProjectId(projectKey);

      // 1. Fetch source type statuses
      const { data: srcStatuses, error: srcErr } = await supabase
        .from('ph_workflow_type_statuses' as any)
        .select('status_id, position, is_initial')
        .eq('project_id', projectId)
        .eq('work_item_type', fromType)
        .order('position');
      if (srcErr) throw srcErr;
      const srcRows = (srcStatuses ?? []) as { status_id: string; position: number; is_initial: boolean }[];

      // 2. Fetch current type statuses (for dedup)
      const { data: curStatuses, error: curErr } = await supabase
        .from('ph_workflow_type_statuses' as any)
        .select('status_id, position')
        .eq('project_id', projectId)
        .eq('work_item_type', workItemType);
      if (curErr) throw curErr;
      const curRows = (curStatuses ?? []) as { status_id: string; position: number }[];
      const curIds = new Set(curRows.map((r) => r.status_id));
      const maxPos = curRows.reduce((m, r) => Math.max(m, r.position), -1);

      // 3. Insert statuses not already in target (never copy is_initial flag)
      const toAddStatuses = srcRows.filter((r) => !curIds.has(r.status_id));
      let addedStatuses = 0;
      if (toAddStatuses.length > 0) {
        const { error: insErr } = await supabase
          .from('ph_workflow_type_statuses' as any)
          .insert(
            toAddStatuses.map((r, i) => ({
              project_id: projectId,
              work_item_type: workItemType,
              status_id: r.status_id,
              position: maxPos + 1 + i,
              is_initial: false,
            }))
          );
        if (insErr) throw insErr;
        addedStatuses = toAddStatuses.length;
      }

      // 4. Fetch source type-specific transitions
      const { data: srcTrans, error: stErr } = await supabase
        .from('ph_workflow_transitions' as any)
        .select('from_status_id, to_status_id')
        .eq('project_id', projectId)
        .eq('work_item_type', fromType);
      if (stErr) throw stErr;
      const srcTRows = (srcTrans ?? []) as { from_status_id: string | null; to_status_id: string }[];

      // 5. Fetch current type transitions (for dedup)
      const { data: curTrans, error: ctErr } = await supabase
        .from('ph_workflow_transitions' as any)
        .select('from_status_id, to_status_id')
        .eq('project_id', projectId)
        .eq('work_item_type', workItemType);
      if (ctErr) throw ctErr;
      const curTRows = (curTrans ?? []) as { from_status_id: string | null; to_status_id: string }[];
      const curTKeys = new Set(curTRows.map((t) => `${t.from_status_id ?? ''}:${t.to_status_id}`));

      // 6. Insert transitions not already present
      const toAddTrans = srcTRows.filter(
        (t) => !curTKeys.has(`${t.from_status_id ?? ''}:${t.to_status_id}`)
      );
      let addedTransitions = 0;
      if (toAddTrans.length > 0) {
        const { error: tInsErr } = await supabase
          .from('ph_workflow_transitions' as any)
          .insert(
            toAddTrans.map((t) => ({
              project_id: projectId,
              work_item_type: workItemType,
              from_status_id: t.from_status_id,
              to_status_id: t.to_status_id,
            }))
          );
        if (tInsErr) throw tInsErr;
        addedTransitions = toAddTrans.length;
      }

      return { addedStatuses, addedTransitions };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-statuses', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['type-workflow', projectKey] });
    },
    onError: (err: unknown) => {
      catalystToast.error(err instanceof Error ? err.message : 'Legacy workflow editing is frozen.');
    },
  });
}
