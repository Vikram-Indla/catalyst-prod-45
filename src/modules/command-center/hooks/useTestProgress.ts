/**
 * Hook: useTestProgress
 * Fetches test progress by sprint for stacked bar chart
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SprintProgress } from '../types';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export function useTestProgress(sprintCount: number = 6, projectId?: string) {
  return useQuery({
    queryKey: ['command-center-test-progress', sprintCount, projectId],
    queryFn: async (): Promise<SprintProgress[]> => {
      // Generate last N months as "sprints"
      const sprints: SprintProgress[] = [];
      
      for (let i = sprintCount - 1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        // Fetch test runs for this period
        const { data: runs } = await supabase
          .from('tm_test_runs')
          .select('status, created_at')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString()) as { data: { status: string }[] | null };

        const passed = runs?.filter(r => r.status === 'passed').length || 0;
        const failed = runs?.filter(r => r.status === 'failed').length || 0;
        const blocked = runs?.filter(r => r.status === 'blocked').length || 0;
        const notRun = runs?.filter(r => r.status === 'not_run' || !r.status).length || 0;

        sprints.push({
          sprint: format(monthDate, 'MMM'),
          sprintName: format(monthDate, 'MMMM yyyy'),
          passed,
          failed,
          blocked,
          notRun,
          total: passed + failed + blocked + notRun,
        });
      }

      // No-mock-data policy: return empty array when no data exists
      return sprints;
    },
    refetchInterval: 120000, // Refresh every 2 minutes
    staleTime: 60000,
  });
}
