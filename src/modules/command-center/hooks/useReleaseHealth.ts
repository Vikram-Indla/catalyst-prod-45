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

      const releaseList = releases || [];
      const releaseIds = releaseList.map((r: any) => r.id);

      // Batch: all test cycles for all releases in one query (no per-release N+1)
      const cycleToRelease = new Map<string, string>();
      const allCycleIds: string[] = [];
      if (releaseIds.length > 0) {
        const cyclesResult = await (supabase
          .from('tm_test_cycles')
          .select('id, release_id') as any)
          .in('release_id', releaseIds);
        const cycles = cyclesResult.data as { id: string; release_id: string }[] | null;
        for (const c of cycles || []) {
          cycleToRelease.set(c.id, c.release_id);
          allCycleIds.push(c.id);
        }
      }

      // Batch: all test runs for all cycles in one query, tallied per release
      const tallies = new Map<string, { passed: number; failed: number; blocked: number; notRun: number }>();
      const bump = (releaseId: string | undefined, key: 'passed' | 'failed' | 'blocked' | 'notRun') => {
        if (!releaseId) return;
        const t = tallies.get(releaseId) || { passed: 0, failed: 0, blocked: 0, notRun: 0 };
        t[key] += 1;
        tallies.set(releaseId, t);
      };
      if (allCycleIds.length > 0) {
        const runsResult = await (supabase
          .from('tm_test_runs')
          .select('status, cycle_id') as any)
          .in('cycle_id', allCycleIds);
        const runs = runsResult.data as { status: string; cycle_id: string }[] | null;
        for (const r of runs || []) {
          const releaseId = cycleToRelease.get(r.cycle_id);
          if (r.status === 'passed') bump(releaseId, 'passed');
          else if (r.status === 'failed') bump(releaseId, 'failed');
          else if (r.status === 'blocked') bump(releaseId, 'blocked');
          else if (r.status === 'not_run' || !r.status) bump(releaseId, 'notRun');
        }
      }

      const releaseHealthData: ReleaseHealthData[] = releaseList.map((release: any) => {
        const t = tallies.get(release.id) || { passed: 0, failed: 0, blocked: 0, notRun: 0 };
        const { passed, failed, blocked, notRun } = t;
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
      });

      return releaseHealthData;
    },
    refetchInterval: 60000 + Math.floor(Math.random() * 10000),
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });
}
