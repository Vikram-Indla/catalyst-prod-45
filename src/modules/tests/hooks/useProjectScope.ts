/**
 * useProjectScope Hook
 * Resolves projectKey → projectId/programId with loading/error states
 */

import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface ProjectScope {
  projectId: string | null;
  projectKey: string | null;
  projectName: string | null;
  programId: string | null;
  programKey: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to resolve project scope from URL params
 * Supports both /projects/:projectId and /project/:projectKey patterns
 */
export function useProjectScope(): ProjectScope {
  const { user } = useAuth();
  const params = useParams<{ projectId?: string; projectKey?: string }>();
  const [searchParams] = useSearchParams();

  // Get from URL params or search params
  const projectIdFromUrl = params.projectId || searchParams.get('projectId');
  const projectKeyFromUrl = params.projectKey || searchParams.get('projectKey');
  const programIdFromUrl = searchParams.get('programId');

  const { data, isLoading, error } = useQuery({
    queryKey: ['project-scope', projectIdFromUrl, projectKeyFromUrl],
    queryFn: async () => {
      // If we have a projectId, fetch project details
      if (projectIdFromUrl) {
        const { data: project, error } = await supabase
          .from('projects')
          .select('id, key, name, program_id, program:programs(id, key, name)')
          .eq('id', projectIdFromUrl)
          .single();

        if (error) throw new Error(`Project not found: ${error.message}`);

        return {
          projectId: project.id,
          projectKey: project.key,
          projectName: project.name,
          programId: (project.program as any)?.id || programIdFromUrl || null,
          programKey: (project.program as any)?.key || null,
        };
      }

      // If we have a projectKey, resolve to projectId
      if (projectKeyFromUrl) {
        const { data: project, error } = await supabase
          .from('projects')
          .select('id, key, name, program_id, program:programs(id, key, name)')
          .eq('key', projectKeyFromUrl)
          .single();

        if (error) throw new Error(`Project not found: ${error.message}`);

        return {
          projectId: project.id,
          projectKey: project.key,
          projectName: project.name,
          programId: (project.program as any)?.id || programIdFromUrl || null,
          programKey: (project.program as any)?.key || null,
        };
      }

      // No project context available
      return {
        projectId: null,
        projectKey: null,
        projectName: null,
        programId: programIdFromUrl,
        programKey: null,
      };
    },
    enabled: !!user && !!(projectIdFromUrl || projectKeyFromUrl),
    staleTime: 60000, // Cache for 1 minute
  });

  return {
    projectId: data?.projectId || projectIdFromUrl || null,
    projectKey: data?.projectKey || projectKeyFromUrl || null,
    projectName: data?.projectName || null,
    programId: data?.programId || programIdFromUrl || null,
    programKey: data?.programKey || null,
    isLoading,
    error: error as Error | null,
  };
}
