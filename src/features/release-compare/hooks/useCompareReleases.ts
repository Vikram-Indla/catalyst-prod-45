/**
 * Release Compare Hooks
 * Production-ready hooks — single-query pattern (no N+1)
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

      if (error) throw new Error(error.message);

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
    case 'development': return 'in_progress';
    case 'staging': return 'in_progress';
    case 'uat': return 'testing';
    case 'testing': return 'testing';
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

// Fetch detailed metrics for selected releases — single batch query
export function useCompareMetrics(releaseIds: string[]) {
  return useQuery({
    queryKey: ['release-compare', 'metrics', releaseIds],
    queryFn: async (): Promise<ComparedRelease[]> => {
      if (releaseIds.length < 2) return [];

      // Single query for all release data
      const { data: releases, error } = await (supabase
        .from('releases')
        .select('id, name, version, status, target_date, progress, test_cases_total, test_cases_passed, defects_open, coverage_percent, health') as any)
        .in('id', releaseIds);

      if (error) throw new Error(error.message);

      // Batch fetch defect counts per release in one query
      const { data: defects } = await (supabase
        .from('tm_defects')
        .select('release_id, severity') as any)
        .in('release_id', releaseIds);

      // Group defects by release
      const defectsByRelease: Record<string, { blocker: number; critical: number; major: number; minor: number }> = {};
      (defects || []).forEach((d: any) => {
        if (!defectsByRelease[d.release_id]) {
          defectsByRelease[d.release_id] = { blocker: 0, critical: 0, major: 0, minor: 0 };
        }
        const bucket = defectsByRelease[d.release_id];
        if (d.severity === 'blocker') bucket.blocker++;
        else if (d.severity === 'critical') bucket.critical++;
        else if (d.severity === 'major') bucket.major++;
        else if (d.severity === 'minor') bucket.minor++;
      });

      // Batch fetch test runs per release via cycles in two queries instead of N
      const { data: cycles } = await (supabase
        .from('tm_test_cycles')
        .select('id, release_id') as any)
        .in('release_id', releaseIds);

      const cycleIds = (cycles || []).map((c: any) => c.id);
      const cycleToRelease: Record<string, string> = {};
      (cycles || []).forEach((c: any) => { cycleToRelease[c.id] = c.release_id; });

      let runsByRelease: Record<string, { passed: number; failed: number; blocked: number; notRun: number; total: number }> = {};
      if (cycleIds.length > 0) {
        const { data: runs } = await (supabase
          .from('tm_test_runs')
          .select('cycle_id, status') as any)
          .in('cycle_id', cycleIds);

        (runs || []).forEach((r: any) => {
          const relId = cycleToRelease[r.cycle_id];
          if (!relId) return;
          if (!runsByRelease[relId]) {
            runsByRelease[relId] = { passed: 0, failed: 0, blocked: 0, notRun: 0, total: 0 };
          }
          const bucket = runsByRelease[relId];
          bucket.total++;
          if (r.status === 'passed') bucket.passed++;
          else if (r.status === 'failed') bucket.failed++;
          else if (r.status === 'blocked') bucket.blocked++;
          else bucket.notRun++;
        });
      }

      return (releases || []).map((release: any) => {
        const runs = runsByRelease[release.id] || { passed: 0, failed: 0, blocked: 0, notRun: 0, total: 0 };
        const defs = defectsByRelease[release.id] || { blocker: 0, critical: 0, major: 0, minor: 0 };

        const targetDate = release.target_date ? new Date(release.target_date) : new Date();
        const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86400000));
        const testProgress = runs.total > 0 ? Math.round((runs.passed + runs.failed) / runs.total * 100) : 0;
        const passRate = (runs.passed + runs.failed) > 0 ? Math.round(runs.passed / (runs.passed + runs.failed) * 100) : 0;
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
            testProgress: { executed: runs.passed + runs.failed, total: runs.total || release.test_cases_total || 0, percentage: testProgress },
            passRate: { passed: runs.passed, executed: runs.passed + runs.failed, percentage: passRate },
            testBreakdown: { passed: runs.passed, failed: runs.failed, blocked: runs.blocked, notRun: runs.notRun },
            defects: { ...defs, total: defs.blocker + defs.critical + defs.major + defs.minor },
            qualityGates: { passing: passRate >= 80 ? 4 : 2, failing: passRate < 80 ? 2 : 0, pending: 0, total: 6 },
            workItems: { total: release.test_cases_total || 0, complete: release.test_cases_passed || 0, inProgress: 0 },
          },
        } as ComparedRelease;
      });
    },
    enabled: releaseIds.length >= 2,
    staleTime: 30_000,
  });
}
