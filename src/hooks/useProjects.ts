// =====================================================
// PROJECTS HOOK
// React Query hooks for project operations
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  key: string;
  program_id: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  wip_limits?: Record<string, number>;
}

export const projectKeys = {
  all: ['projects'] as const,
  one: (id: string) => [...projectKeys.all, id] as const,
};

// Get single project
export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.one(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
}

// Get all projects for user
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, key, description, program_id')
        .order('name');

      if (error) throw error;
      return data as Project[];
    },
  });
}
