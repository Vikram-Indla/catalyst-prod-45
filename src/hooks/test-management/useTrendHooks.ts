import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TMCaseTrendData, TMExecutionTrendData } from '@/types/test-management-dashboard';

interface CaseRow {
  created_at: string | null;
  updated_at: string | null;
}

interface CycleRow {
  id: string;
}

interface RunRow {
  started_at: string | null;
  status: string | null;
}

export function useCaseActivityTrends(projectId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['tm-case-trends', projectId, days],
    queryFn: async (): Promise<TMCaseTrendData[]> => {
      if (!projectId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('tm_test_cases')
        .select('created_at, updated_at')
        .eq('project_id', projectId)
        .gte('updated_at', startDate.toISOString());

      if (error) throw error;

      // Initialize all dates
      const grouped = new Map<string, { created: number; edited: number }>();
      for (let i = 0; i <= days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        grouped.set(d.toISOString().split('T')[0], { created: 0, edited: 0 });
      }

      // Count activities
      const rows = (data || []) as CaseRow[];
      rows.forEach(item => {
        const createdDate = item.created_at?.split('T')[0];
        const updatedDate = item.updated_at?.split('T')[0];

        if (createdDate && grouped.has(createdDate) && new Date(createdDate) >= startDate) {
          grouped.get(createdDate)!.created++;
        }
        if (updatedDate && createdDate !== updatedDate && grouped.has(updatedDate)) {
          grouped.get(updatedDate)!.edited++;
        }
      });

      return Array.from(grouped.entries())
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useExecutionTrends(projectId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['tm-execution-trends', projectId, days],
    queryFn: async (): Promise<TMExecutionTrendData[]> => {
      if (!projectId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Query cycles for the project
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cyclesData } = await (supabase as any)
        .from('tm_test_cycles')
        .select('id')
        .eq('project_id', projectId);

      const cycles = (cyclesData || []) as CycleRow[];
      if (!cycles.length) return [];

      const cycleIds = cycles.map(c => c.id);
      
      // Query runs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: runsData, error } = await (supabase as any)
        .from('tm_test_runs')
        .select('started_at, status')
        .in('cycle_id', cycleIds)
        .gte('started_at', startDate.toISOString());

      if (error) throw error;

      // Initialize dates
      const grouped = new Map<string, TMExecutionTrendData>();
      for (let i = 0; i <= days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        grouped.set(dateStr, { date: dateStr, passed: 0, failed: 0, blocked: 0, total: 0 });
      }

      // Count by status
      const runs = (runsData || []) as RunRow[];
      runs.forEach(run => {
        const date = run.started_at?.split('T')[0];
        if (date && grouped.has(date)) {
          const entry = grouped.get(date)!;
          entry.total++;
          if (run.status === 'PASSED') entry.passed++;
          else if (run.status === 'FAILED') entry.failed++;
          else if (run.status === 'BLOCKED') entry.blocked++;
        }
      });

      return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}
