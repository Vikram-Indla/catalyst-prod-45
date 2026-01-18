/**
 * Hook for fetching available test cases with filtering
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TMTestCase } from '@/types/test-management';
import type { TestCaseFilters } from '../types';

export function useAvailableTestCases(
  projectId: string | undefined,
  filters: TestCaseFilters
) {
  return useQuery({
    queryKey: ['add-cycle-test-cases', projectId, filters],
    queryFn: async (): Promise<TMTestCase[]> => {
      if (!projectId) return [];

      let query = supabase
        .from('tm_test_cases')
        .select(`
          *,
          priority:tm_case_priorities(*),
          type:tm_case_types(*),
          folder:tm_folders(id, name, path)
        `)
        .eq('project_id', projectId)
        .in('status', ['draft', 'ready', 'approved']) // Exclude deprecated
        .order('folder_id', { ascending: true, nullsFirst: true })
        .order('title', { ascending: true });

      // Search filter
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,case_key.ilike.%${filters.search}%`);
      }

      // Folder filter
      if (filters.folders.length > 0) {
        query = query.in('folder_id', filters.folders);
      }

      // Type filter
      if (filters.types.length > 0) {
        query = query.in('case_type_id', filters.types);
      }

      // Priority filter
      if (filters.priorities.length > 0) {
        query = query.in('priority_id', filters.priorities);
      }

      // Status filter
      if (filters.statuses.length > 0) {
        const validStatuses = filters.statuses.filter(
          s => ['draft', 'ready', 'approved', 'deprecated'].includes(s)
        ) as ('draft' | 'ready' | 'approved' | 'deprecated')[];
        if (validStatuses.length > 0) {
          query = query.in('status', validStatuses);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching test cases:', error);
        throw error;
      }

      return (data || []).map(c => ({
        ...c,
        key: c.case_key,
        status: c.status?.toUpperCase() || 'DRAFT',
        type_id: c.case_type_id,
        updated_by: c.created_by || '',
        objective: c.description,
      })) as unknown as TMTestCase[];
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
}
