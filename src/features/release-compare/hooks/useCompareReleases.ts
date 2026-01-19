/**
 * Release Compare Hooks
 * Production-ready hooks for fetching release comparison data
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ComparedRelease, ReleaseOption, CompareHealthLevel, CompareReleaseStatus } from '../types';

// Fetch available releases for selection
export function useAvailableReleases() {
  return useQuery({
    queryKey: ['release-compare', 'available'],
    queryFn: async (): Promise<ReleaseOption[]> => {
      const { data, error } = await (supabase
        .from('releases')
        .select('id, name, version, status') as any)
        .order('target_date', { ascending: true })
        .limit(50);

      if (error) throw error;

      return (data || []).map((r: any) => ({
        id: r.id,
        version: r.version || r.name,
        name: r.name,
      }));
    },
    staleTime: 60_000,
  });
}

// Map database status to compare status
function mapStatus(status: string | null): CompareReleaseStatus {
  switch (status) {
    case 'planned': return 'planning';
    case 'active': return 'in_progress';
    case 'uat': return 'testing';
    case 'released': return 'released';
    default: return 'planning';
  }
}

// Calculate health level from score
function getHealthLevel(score: number): CompareHealthLevel {
  if (score >= 85) return 'healthy';
  if (score >= 70) return 'attention';
  if (score >= 50) return 'at_risk';
  return 'critical';
}

// Fetch detailed metrics for selected releases
export function useCompareMetrics(releaseIds: string[]) {
  return useQuery({
    queryKey: ['release-compare', 'metrics', releaseIds],
    queryFn: async (): Promise<ComparedRelease[]> => {
      if (releaseIds.length < 2) return [];

      const { data: releases, error } = await (supabase
        .from('releases')
        .select('id, name, version, status, target_date, progress, test_cases_total, test_cases_passed, defects_open') as any)
        .in('id', releaseIds);

      if (error) throw error;

      const metricsPromises = (releases || []).map(async (release: any) => {
        const { data: cycles } = await (supabase.from('tm_test_cycles').select('id') as any).eq('release_id', release.id);
        const cycleIds = (cycles || []).map((c: any) => c.id);

        let passed = 0, failed = 0, blocked = 0, notRun = 0, total = 0;
        if (cycleIds.length > 0) {
          const { data: runs } = await (supabase.from('tm_test_runs').select('status') as any).in('cycle_id', cycleIds);
          (runs || []).forEach((r: any) => {
            total++;
            if (r.status === 'passed') passed++;
            else if (r.status === 'failed') failed++;
            else if (r.status === 'blocked') blocked++;
            else notRun++;
          });
        }

        const { data: defects } = await (supabase.from('tm_defects').select('severity') as any).eq('release_id', release.id);
        let blocker = 0, critical = 0, major = 0, minor = 0;
        (defects || []).forEach((d: any) => {
          if (d.severity === 'blocker') blocker++;
          else if (d.severity === 'critical') critical++;
          else if (d.severity === 'major') major++;
          else if (d.severity === 'minor') minor++;
        });

        const targetDate = release.target_date ? new Date(release.target_date) : new Date();
        const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86400000));
        const testProgress = total > 0 ? Math.round((passed + failed) / total * 100) : 0;
        const passRate = (passed + failed) > 0 ? Math.round(passed / (passed + failed) * 100) : 0;
        const healthScore = Math.max(0, Math.min(100, Math.round((passRate * 0.4) + (testProgress * 0.3) + 30)));

        return {
          id: release.id,
          version: release.version || release.name,
          name: release.name,
          status: mapStatus(release.status),
          targetDate: release.target_date || new Date().toISOString(),
          daysRemaining,
          metrics: {
            healthScore,
            healthLevel: getHealthLevel(healthScore),
            healthTrend: { value: 0, direction: 'flat' as const },
            testProgress: { executed: passed + failed, total: total || release.test_cases_total || 0, percentage: testProgress },
            passRate: { passed, executed: passed + failed, percentage: passRate },
            testBreakdown: { passed, failed, blocked, notRun },
            defects: { blocker, critical, major, minor, total: blocker + critical + major + minor },
            qualityGates: { passing: passRate >= 80 ? 4 : 2, failing: passRate < 80 ? 2 : 0, pending: 0, total: 6 },
            workItems: { total: release.test_cases_total || 0, complete: release.test_cases_passed || 0, inProgress: 0 },
          },
        } as ComparedRelease;
      });

      return Promise.all(metricsPromises);
    },
    enabled: releaseIds.length >= 2,
    staleTime: 30_000,
  });
}
