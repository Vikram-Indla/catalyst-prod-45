/**
 * Hook for managing test case release assignment
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export interface SelectableRelease {
  id: string;
  name: string;
  version: string | null;
  status: string | null;
  release_date: string | null;
}

/**
 * Fetch selectable releases (planned/active only)
 * Uses release_versions table as that's what tm_test_cases references
 */
export function useSelectableReleases() {
  return useQuery({
    queryKey: ['tm-releases-selectable'],
    queryFn: async (): Promise<SelectableRelease[]> => {
      const { data, error } = await supabase
        .from('release_versions')
        .select('id, name, version, status, release_date')
        .in('status', ['planned', 'active', 'in_progress'])
        .order('release_date', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error fetching releases:', error);
        // Fallback: get all releases if status filter fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('release_versions')
          .select('id, name, version, status, release_date')
          .order('release_date', { ascending: true, nullsFirst: false })
          .limit(50);
        
        if (fallbackError) throw fallbackError;
        return (fallbackData || []) as SelectableRelease[];
      }

      return (data || []) as SelectableRelease[];
    },
  });
}

interface UpdateReleaseInput {
  testCaseId: string;
  projectId: string;
  releaseId: string | null;
}

/**
 * Update test case release assignment
 */
export function useUpdateTestCaseRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateReleaseInput) => {
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ release_version_id: input.releaseId })
        .eq('id', input.testCaseId);

      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['tm-cases', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['tm-cases'] });
      catalystToast.success(data.releaseId ? 'Release assigned' : 'Release cleared');
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to update release', error.message);
    },
  });
}
