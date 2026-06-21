import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkflowTemplate {
  id: string;
  name: string;
  work_item_type: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateStatus {
  id: string;
  template_id: string;
  name: string;
  category: string;
  color: string;
  position: number;
  is_initial: boolean;
}

export interface TemplateTransition {
  id: string;
  template_id: string;
  from_status_name: string | null;
  to_status_name: string;
}

export interface WorkflowAssignment {
  project_id: string;
  work_item_type: string;
  template_id: string | null;
  is_customized: boolean;
  applied_at: string;
  template?: { name: string; work_item_type: string } | null;
}

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: ['workflow-templates'],
    queryFn: async (): Promise<WorkflowTemplate[]> => {
      const { data, error } = await supabase
        .from('ph_workflow_templates' as any)
        .select('*')
        .order('work_item_type')
        .order('name');
      if (error) throw error;
      return (data ?? []) as WorkflowTemplate[];
    },
    staleTime: 30_000,
  });
}

export function useTemplateDetail(templateId: string | null) {
  return useQuery({
    queryKey: ['workflow-template-detail', templateId],
    queryFn: async () => {
      if (!templateId) return { statuses: [], transitions: [] };
      const [sRes, tRes] = await Promise.all([
        supabase
          .from('ph_workflow_template_statuses' as any)
          .select('*')
          .eq('template_id', templateId)
          .order('position'),
        supabase
          .from('ph_workflow_template_transitions' as any)
          .select('*')
          .eq('template_id', templateId),
      ]);
      if (sRes.error) throw sRes.error;
      if (tRes.error) throw tRes.error;
      return {
        statuses: (sRes.data ?? []) as TemplateStatus[],
        transitions: (tRes.data ?? []) as TemplateTransition[],
      };
    },
    enabled: !!templateId,
    staleTime: 30_000,
  });
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

export function useProjectWorkflowAssignment(projectKey: string, workItemType: string) {
  return useQuery({
    queryKey: ['workflow-assignment', projectKey, workItemType],
    queryFn: async (): Promise<WorkflowAssignment | null> => {
      const projectId = await fetchProjectId(projectKey);
      const { data, error } = await supabase
        .from('ph_project_workflow_assignments' as any)
        .select('*, template:template_id(name, work_item_type)')
        .eq('project_id', projectId)
        .eq('work_item_type', workItemType)
        .maybeSingle();
      if (error) throw error;
      return data as WorkflowAssignment | null;
    },
    enabled: !!projectKey && !!workItemType,
    staleTime: 15_000,
  });
}

export function useAllProjectAssignments(projectKey: string) {
  return useQuery({
    queryKey: ['workflow-assignments-all', projectKey],
    queryFn: async (): Promise<WorkflowAssignment[]> => {
      const projectId = await fetchProjectId(projectKey);
      const { data, error } = await supabase
        .from('ph_project_workflow_assignments' as any)
        .select('*, template:template_id(name, work_item_type)')
        .eq('project_id', projectId);
      if (error) throw error;
      return (data ?? []) as WorkflowAssignment[];
    },
    enabled: !!projectKey,
    staleTime: 15_000,
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      projectKey,
      workItemType,
    }: {
      templateId: string;
      projectKey: string;
      workItemType: string;
    }) => {
      const projectId = await fetchProjectId(projectKey);
      const { error } = await (supabase as any).rpc('fn_apply_workflow_template', {
        p_template_id: templateId,
        p_project_id: projectId,
        p_work_item_type: workItemType,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-statuses', vars.projectKey] });
      queryClient.invalidateQueries({ queryKey: ['type-workflow', vars.projectKey] });
      queryClient.invalidateQueries({ queryKey: ['workflow-assignment', vars.projectKey] });
      queryClient.invalidateQueries({ queryKey: ['workflow-assignments-all', vars.projectKey] });
    },
  });
}

export function usePushTemplate() {
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await (supabase as any).rpc('fn_push_template_to_projects', {
        p_template_id: templateId,
      });
      if (error) throw error;
      return data as Array<{ project_id: string; work_item_type: string }>;
    },
  });
}

export function useCreateWorkflowTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      workItemType,
      description,
    }: {
      name: string;
      workItemType: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('ph_workflow_templates' as any)
        .insert({ name, work_item_type: workItemType, description: description ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as WorkflowTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
    },
  });
}

export function useMarkWorkflowCustomized() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectKey,
      workItemType,
    }: {
      projectKey: string;
      workItemType: string;
    }) => {
      const projectId = await fetchProjectId(projectKey);
      const { error } = await supabase
        .from('ph_project_workflow_assignments' as any)
        .update({ is_customized: true })
        .eq('project_id', projectId)
        .eq('work_item_type', workItemType);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-assignment', vars.projectKey] });
      queryClient.invalidateQueries({ queryKey: ['workflow-assignments-all', vars.projectKey] });
    },
  });
}
