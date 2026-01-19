/**
 * Hook: useReleaseHealth
 * Fetches release health data with test statistics
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReleaseHealthData, HealthStatus } from '../types';
import { format } from 'date-fns';

function calculateHealthStatus(passRate: number): HealthStatus {
  if (passRate >= 90) return 'healthy';
  if (passRate >= 50) return 'at-risk';
  return 'critical';
}

export function useReleaseHealth(limit: number = 5) {
  return useQuery({
    queryKey: ['command-center-release-health', limit],
    queryFn: async (): Promise<ReleaseHealthData[]> => {
      // Fetch active releases with their test cycles
      const { data: releases, error } = await supabase
        .from('releases')
        .select(`
          id,
          name,
          version,
          status,
          target_date,
          progress,
          health,
          project:projects(name)
        `)
        .order('target_date', { ascending: true })
        .limit(limit) as { data: any[] | null; error: any };

      if (error) throw error;

      // Fetch test run statistics for each release
      const releaseHealthData: ReleaseHealthData[] = await Promise.all(
        (releases || []).map(async (release: any) => {
          // Get test cycles for this release - cast to any to avoid deep type instantiation
          const cyclesResult = await (supabase
            .from('tm_test_cycles')
            .select('id') as any)
            .eq('release_id', release.id);
          const cycles = cyclesResult.data as { id: string }[] | null;

          const cycleIds = cycles?.map(c => c.id) || [];

          let passed = 0, failed = 0, blocked = 0, notRun = 0;

          if (cycleIds.length > 0) {
            // Get test run statistics - cast to any to avoid deep type instantiation
            const runsResult = await (supabase
              .from('tm_test_runs')
              .select('status') as any)
              .in('cycle_id', cycleIds);
            const runs = runsResult.data as { status: string }[] | null;

            if (runs) {
              passed = runs.filter(r => r.status === 'passed').length;
              failed = runs.filter(r => r.status === 'failed').length;
              blocked = runs.filter(r => r.status === 'blocked').length;
              notRun = runs.filter(r => r.status === 'not_run' || !r.status).length;
            }
          }

          const total = passed + failed + blocked + notRun;
          const executed = passed + failed + blocked;
          const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;

          return {
            id: release.id,
            name: release.name,
            version: release.version || 'v1.0',
            product: (release.project as any)?.name || 'Unknown',
            sprint: `Sprint ${format(new Date(), 'yy.w')}`,
            dueDate: release.target_date || '',
            healthScore: passRate,
            healthStatus: calculateHealthStatus(passRate),
            passed,
            failed,
            blocked,
            notRun,
            total,
            passRate,
          };
        })
      );

      return releaseHealthData;
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });
}
