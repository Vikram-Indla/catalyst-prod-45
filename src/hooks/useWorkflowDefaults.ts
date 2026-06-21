import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

async function fetchPhProjectId(projectKey: string): Promise<string> {
  const { data, error } = await supabase
    .from('ph_projects' as any)
    .select('id')
    .eq('key', projectKey)
    .single();
  if (error) throw error;
  return (data as any).id as string;
}

export function useSeedProjectFromDefaults(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const projectId = await fetchPhProjectId(projectKey);
      const { error } = await (supabase as any).rpc('fn_seed_project_workflow', {
        p_project_id: projectId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-statuses', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['type-workflow', projectKey] });
    },
  });
}

export function useResetProjectWorkflow(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const projectId = await fetchPhProjectId(projectKey);
      const { error } = await (supabase as any).rpc('fn_reset_project_workflow', {
        p_project_id: projectId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-statuses', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['type-workflow', projectKey] });
    },
  });
}

export function useExportProjectAsDefault(projectKey: string) {
  return useMutation({
    mutationFn: async () => {
      const projectId = await fetchPhProjectId(projectKey);
      const { error } = await (supabase as any).rpc('fn_export_project_as_default', {
        p_project_id: projectId,
      });
      if (error) throw error;
    },
  });
}
