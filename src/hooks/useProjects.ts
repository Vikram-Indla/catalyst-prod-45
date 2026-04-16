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
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
  wip_limits?: Record<string, number>;
}

export const projectKeys = {
  all: ['projects'] as const,
  withDefault: ['projects-with-default'] as const,
  defaultProject: ['default-project'] as const,
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
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

// Get all projects for user (default project first)
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.withDefault,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, key, description, program_id, status, is_default')
        .order('is_default', { ascending: false }) // Default project first
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Project[];
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

// Get only the default project
export function useDefaultProject() {
  return useQuery({
    queryKey: projectKeys.defaultProject,
    queryFn: async (): Promise<Project | null> => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, key, description, program_id, status, is_default')
        .eq('is_default', true)
        .single();
      
      if (error) {
        console.warn('No default project found:', error);
        return null;
      }
      return data as Project;
    },
  });
}
