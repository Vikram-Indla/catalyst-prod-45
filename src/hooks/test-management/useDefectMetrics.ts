import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DefectMetric {
  id: string;
  defect_key: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  mttr_hours: number | null;
}

export interface DefectMetricsStats {
  total_defects: number;
  closed_defects: number;
  open_defects: number;
  avg_mttr_hours: number | null;
  median_mttr_hours: number | null;
  by_status: Record<string, number>;
}

/**
 * Fetches defect metrics including MTTR (mean-time-to-resolution).
 * Returns list of defects with their MTTR + aggregate stats.
 */
export function useDefectMetrics(projectId?: string) {
  return useQuery({
    queryKey: ['testops-defect-metrics', projectId],
    staleTime: 120_000,
    queryFn: async (): Promise<{ defects: DefectMetric[]; stats: DefectMetricsStats }> => {
      // Call RPC to get defect MTTR data
      const { data, error } = await supabase.rpc('tm_get_defect_mttr', {
        p_project_id: projectId ?? null,
      });

      if (error) throw error;

      const defects = (data ?? []) as DefectMetric[];

      // Compute stats
      const closedDefects = defects.filter((d) => d.closed_at);
      const mtrrs = closedDefects.map((d) => d.mttr_hours).filter((h) => h !== null) as number[];
      const statusCounts: Record<string, number> = {};

      defects.forEach((d) => {
        statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1;
      });

      // Calculate avg and median MTTR
      const avgMttr = mtrrs.length > 0 ? mtrrs.reduce((a, b) => a + b, 0) / mtrrs.length : null;
      const medianMttr = mtrrs.length > 0
        ? (() => {
          const sorted = [...mtrrs].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        })()
        : null;

      return {
        defects,
        stats: {
          total_defects: defects.length,
          closed_defects: closedDefects.length,
          open_defects: defects.length - closedDefects.length,
          avg_mttr_hours: avgMttr,
          median_mttr_hours: medianMttr,
          by_status: statusCounts,
        },
      };
    },
  });
}
