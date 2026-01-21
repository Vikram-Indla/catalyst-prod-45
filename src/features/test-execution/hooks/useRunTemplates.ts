/**
 * Module 4C-1: Run Templates Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RunTemplate, CreateTemplateInput } from '../types/run-assignments';

/**
 * Hook to fetch run templates for a project
 */
export function useRunTemplates(projectId: string | null) {
  return useQuery({
    queryKey: ['run-templates', projectId],
    queryFn: async (): Promise<RunTemplate[]> => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('tm_run_templates')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      
      return (data || []) as unknown as RunTemplate[];
    },
    enabled: !!projectId,
    staleTime: 60000,
  });
}

/**
 * Hook to create a run template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { data, error } = await supabase
        .from('tm_run_templates')
        .insert([{
          project_id: input.project_id,
          name: input.name,
          description: input.description || null,
          environment: input.environment || 'staging',
          configuration: input.configuration || {} as any,
          test_case_filter: input.test_case_filter || {} as any,
          default_testers: input.default_testers || [],
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['run-templates', variables.project_id] });
      toast.success('Template created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}

/**
 * Hook to update a run template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      templateId,
      updates,
    }: {
      templateId: string;
      updates: Partial<CreateTemplateInput>;
    }) => {
      const updatePayload: any = { ...updates };
      if (updates.test_case_filter) {
        updatePayload.test_case_filter = updates.test_case_filter as any;
      }
      const { data, error } = await supabase
        .from('tm_run_templates')
        .update({
          ...updatePayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['run-templates', data.project_id] });
      toast.success('Template updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });
}

/**
 * Hook to delete a run template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ templateId, projectId }: { templateId: string; projectId: string }) => {
      const { error } = await supabase
        .from('tm_run_templates')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', templateId);
      
      if (error) throw error;
      return { templateId, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['run-templates', result.projectId] });
      toast.success('Template deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
}

/**
 * Hook to create a run from template
 */
export function useCreateRunFromTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      templateId,
      name,
      scheduledStart,
    }: {
      templateId: string;
      name?: string;
      scheduledStart?: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)('tm_create_run_from_template', {
        p_template_id: templateId,
        p_name: name || null,
        p_scheduled_start: scheduledStart || null,
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['execution-runs'] });
      toast.success(`Run #${data.run_number} created with ${data.cases_assigned} test cases`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create run: ${error.message}`);
    },
  });
}
