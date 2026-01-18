/**
 * Execution Progress Hook
 * Fetches real daily execution data from tm_test_runs
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO, startOfDay } from 'date-fns';

interface DailyExecution {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
}

export function useExecutionProgress(cycleId: string, days: number = 14) {
  return useQuery({
    queryKey: ['execution-progress', cycleId, days],
    queryFn: async (): Promise<DailyExecution[]> => {
      if (!cycleId) return [];

      // Get cycle scope IDs for this cycle
      const { data: scopes, error: scopeError } = await supabase
        .from('tm_cycle_scope')
        .select('id')
        .eq('cycle_id', cycleId);

      if (scopeError) throw scopeError;
      if (!scopes || scopes.length === 0) return generateEmptyData(days);

      const scopeIds = scopes.map(s => s.id);

      // Fetch test runs for these scopes within the date range
      const startDate = subDays(new Date(), days);
      
      const { data: runs, error: runsError } = await supabase
        .from('tm_test_runs')
        .select('status, completed_at')
        .in('cycle_scope_id', scopeIds)
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', { ascending: true });

      if (runsError) throw runsError;

      // Group by date
      const dailyMap = new Map<string, { passed: number; failed: number; blocked: number }>();

      // Initialize all days
      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyMap.set(date, { passed: 0, failed: 0, blocked: 0 });
      }

      // Count executions by day
      (runs || []).forEach(run => {
        if (!run.completed_at) return;
        
        const date = format(parseISO(run.completed_at), 'yyyy-MM-dd');
        const stats = dailyMap.get(date);
        
        if (stats) {
          if (run.status === 'passed') stats.passed++;
          else if (run.status === 'failed') stats.failed++;
          else if (run.status === 'blocked') stats.blocked++;
        }
      });

      // Convert to array
      return Array.from(dailyMap.entries()).map(([date, stats]) => ({
        date: format(parseISO(date), 'MMM d'),
        ...stats,
      }));
    },
    enabled: !!cycleId,
    staleTime: 60000,
  });
}

function generateEmptyData(days: number): DailyExecution[] {
  const data: DailyExecution[] = [];
  for (let i = days - 1; i >= 0; i--) {
    data.push({
      date: format(subDays(new Date(), i), 'MMM d'),
      passed: 0,
      failed: 0,
      blocked: 0,
    });
  }
  return data;
}
