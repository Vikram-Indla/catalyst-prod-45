/**
 * Project Context Hook
 * Resolves projectId from URL params and provides project data
 */

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface ProjectContext {
  projectId: string | null;
  projectKey: string | null;
  projectName: string | null;
  programId: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useProjectContext(): ProjectContext {
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['project-context', paramProjectId],
    queryFn: async () => {
      if (!paramProjectId) return null;

      const { data: project, error } = await supabase
        .from('projects')
        .select('id, key, name, program_id')
        .eq('id', paramProjectId)
        .single();

      if (error) throw error;

      return {
        projectId: project.id,
        projectKey: project.key || project.id.slice(0, 6).toUpperCase(),
        projectName: project.name,
        programId: project.program_id,
      };
    },
    enabled: !!paramProjectId && !!user,
    staleTime: 60000,
  });

  return {
    projectId: data?.projectId || paramProjectId || null,
    projectKey: data?.projectKey || null,
    projectName: data?.projectName || null,
    programId: data?.programId || null,
    isLoading,
    error: error as Error | null,
  };
}
