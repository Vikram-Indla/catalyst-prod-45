import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CoverageSnapshot {
  snapshot_date: string;
  coverage_pct: number;
  total_items: number;
  covered_items: number;
}

export interface CoverageTrend {
  project_id: string;
  snapshots: CoverageSnapshot[];
}

/**
 * Fetches coverage history snapshots for a project.
 * Returns 30-day trend data (coverage % over time).
 */
export function useCoverageHistory(projectId: string, days: number = 30) {
  return useQuery({
    queryKey: ['testops-coverage-history', projectId, days],
    staleTime: 300_000, // 5 minutes
    queryFn: async (): Promise<CoverageTrend> => {
      const { data, error } = await supabase
        .from('tm_coverage_history')
        .select('snapshot_date, coverage_pct, total_items, covered_items')
        .eq('project_id', projectId)
        .gte('snapshot_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) throw error;

      return {
        project_id: projectId,
        snapshots: (data ?? []).map((row: any) => ({
          snapshot_date: row.snapshot_date,
          coverage_pct: parseFloat(row.coverage_pct ?? 0),
          total_items: row.total_items ?? 0,
          covered_items: row.covered_items ?? 0,
        })),
      };
    },
  });
}

/**
 * Fetch all projects for coverage history.
 */
export function useProjects() {
  return useQuery({
    queryKey: ['projects-for-coverage-history'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data ?? [];
    },
  });
}
