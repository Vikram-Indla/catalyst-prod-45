/**
 * PlanHub Templates Hook
 * CRUD operations for planhub_templates table
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface PlanHubTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration_days: number;
  phases: Json;
  is_system: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: string;
  duration_days: number;
  phases?: Json;
}

export function usePlanHubTemplates() {
  return useQuery({
    queryKey: ['planhub', 'templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planhub_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as PlanHubTemplate[];
    },
    staleTime: 30000,
  });
}

export function useCreatePlanHubTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('planhub_templates')
        .insert({
          name: input.name,
          description: input.description || null,
          category: input.category,
          duration_days: input.duration_days,
          phases: input.phases || [],
          is_system: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planhub', 'templates'] });
      toast.success('Template created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}

export function useUpdatePlanHubTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanHubTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('planhub_templates')
        .update({
          name: updates.name,
          description: updates.description,
          category: updates.category,
          duration_days: updates.duration_days,
          phases: updates.phases,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planhub', 'templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });
}

export function useDeletePlanHubTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('planhub_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planhub', 'templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
}
