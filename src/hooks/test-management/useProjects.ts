// ============================================================================
// HOOK: useProjects
// File: /hooks/test-management/useProjects.ts
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TMProject } from '@/types/test-management';
import { toast } from 'sonner';

// Fetch all projects
export function useProjects() {
  return useQuery({
    queryKey: ['tm-projects'],
    queryFn: async (): Promise<TMProject[]> => {
      const { data, error } = await supabase
        .from('tm_projects')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch single project
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-project', projectId],
    queryFn: async (): Promise<TMProject | null> => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('tm_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        throw error;
      }

      return data;
    },
    enabled: !!projectId,
  });
}

// Create project
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; key: string; description?: string }): Promise<TMProject> => {
      const { data, error } = await supabase
        .from('tm_projects')
        .insert({
          name: input.name,
          key: input.key.toUpperCase(),
          description: input.description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-projects'] });
      toast.success('Project created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });
}
