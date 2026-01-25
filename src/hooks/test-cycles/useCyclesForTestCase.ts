/**
 * Hook: useCyclesForTestCase
 * 
 * Finds all active cycles that include a specific test case in their scope.
 * Used by "Run Test" button to identify execution contexts.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CycleForTestCase {
  cycleId: string;
  cycleName: string;
  cycleKey: string;
  cycleStatus: string;
  scopeId: string;  // The tm_cycle_scope.id for this test case in this cycle
}

/**
 * Finds cycles that contain this test case in their scope
 * Only returns active/in_progress cycles (executable)
 */
export function useCyclesForTestCase(testCaseId: string | undefined) {
  return useQuery({
    queryKey: ['cycles-for-test-case', testCaseId],
    queryFn: async (): Promise<CycleForTestCase[]> => {
      if (!testCaseId) return [];

      // Find cycles via tm_cycle_scope that link to this test case
      const { data, error } = await (supabase as any)
        .from('tm_cycle_scope')
        .select(`
          id,
          cycle_id,
          cycle:tm_test_cycles(id, name, cycle_key, status)
        `)
        .eq('test_case_id', testCaseId);

      if (error) {
        console.error('Error fetching cycles for test case:', error);
        throw error;
      }

      // Filter to only active/executable cycles and map to clean structure
      const activeStatuses = ['active', 'in_progress', 'planned'];
      
      return ((data || []) as any[])
        .filter(row => row.cycle && activeStatuses.includes(row.cycle.status))
        .map(row => ({
          cycleId: row.cycle.id,
          cycleName: row.cycle.name,
          cycleKey: row.cycle.cycle_key,
          cycleStatus: row.cycle.status,
          scopeId: row.id,
        }));
    },
    enabled: !!testCaseId,
    staleTime: 30000,
  });
}
