/**
 * Module 5C-1 & 5C-2: Release Analytics Hooks
 * Provides release-level analytics and cross-release comparison
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ReleaseAnalyticsSummary,
  AnalyticsTrendData,
  DefectAgingData,
  CoverageBreakdown,
  ReleaseComparisonItem,
  TimeGranularity,
} from '../types/analytics';

// ─────────────────────────────────────────────────────────────────────────────
// 5C-1: Release Analytics Summary
// ─────────────────────────────────────────────────────────────────────────────

export function useReleaseAnalyticsSummary(releaseId: string | null) {
  return useQuery({
    queryKey: ['release-analytics-summary', releaseId],
    queryFn: async (): Promise<ReleaseAnalyticsSummary | null> => {
      if (!releaseId) return null;

      // Fetch release basic info
      const { data: release, error: releaseError } = await supabase
        .from('releases')
        .select('id, name, version, status, start_date, release_date')
        .eq('id', releaseId)
        .single();

      if (releaseError) throw releaseError;
      const releaseData = release as any;

      // Fetch test execution metrics from cycles
      const { data: cycleStats } = await supabase
        .from('tm_test_cycles')
        .select('id')
        .eq('release_id', releaseId);

      const cycleIds = (cycleStats as any[])?.map(c => c.id) || [];

      // Aggregate cycle case data
      let totalCases = 0, executed = 0, passed = 0, failed = 0, blocked = 0, skipped = 0;
      
      if (cycleIds.length > 0) {
        const { data: caseData } = await supabase
          .from('tm_cycle_scope')
          .select('current_status')
          .in('cycle_id', cycleIds);

        const cases = caseData as any[] || [];
        totalCases = cases.length;
        cases.forEach(c => {
          if (c.current_status === 'passed') passed++;
          else if (c.current_status === 'failed') failed++;
          else if (c.current_status === 'blocked') blocked++;
          else if (c.current_status === 'skipped') skipped++;
          if (c.current_status !== 'not_run' && c.current_status !== 'pending') executed++;
        });
      }

      // Fetch defect metrics
      const { data: defects } = await supabase
        .from('tm_defects')
        .select('id, severity, status, created_at, resolved_at')
        .eq('release_id', releaseId);

      const defectList = defects as any[] || [];
      const openDefects = defectList.filter(d => d.status !== 'closed' && d.status !== 'resolved');
      const closedDefects = defectList.filter(d => d.status === 'closed' || d.status === 'resolved');

      // Calculate resolution time
      let totalResolutionDays = 0;
      let resolvedCount = 0;
      closedDefects.forEach(d => {
        if (d.resolved_at && d.created_at) {
          const days = (new Date(d.resolved_at).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24);
          totalResolutionDays += days;
          resolvedCount++;
        }
      });

      // Fetch quality gate status
      const { data: gateResults } = await supabase
        .from('tm_release_gate_results')
        .select('*, gate:tm_release_quality_gates(*)')
        .eq('release_id', releaseId);

      const results = gateResults as any[] || [];
      const passedGates = results.filter(g => g.passed);
      const blockingGates = results.filter(g => g.gate?.is_blocking);
      const blockingPassed = blockingGates.filter(g => g.passed);

      const executionRate = totalCases > 0 ? (executed / totalCases) * 100 : 0;
      const passRate = executed > 0 ? (passed / executed) * 100 : 0;

      return {
        releaseId: releaseData.id,
        releaseName: releaseData.name,
        period: {
          start: releaseData.start_date || new Date().toISOString(),
          end: releaseData.release_date || new Date().toISOString(),
        },
        keyMetrics: {
          totalTestCases: totalCases,
          executedCount: executed,
          passedCount: passed,
          failedCount: failed,
          blockedCount: blocked,
          skippedCount: skipped,
          executionRate: Math.round(executionRate * 10) / 10,
          passRate: Math.round(passRate * 10) / 10,
          failRate: executed > 0 ? Math.round((failed / executed) * 1000) / 10 : 0,
          automationRate: 0,
        },
        defectMetrics: {
          totalOpen: openDefects.length,
          totalClosed: closedDefects.length,
          blockers: openDefects.filter(d => d.severity === 'blocker').length,
          criticals: openDefects.filter(d => d.severity === 'critical').length,
          avgResolutionDays: resolvedCount > 0 ? Math.round(totalResolutionDays / resolvedCount * 10) / 10 : 0,
          defectDensity: totalCases > 0 ? Math.round(defectList.length / totalCases * 100) / 100 : 0,
        },
        velocityMetrics: {
          avgDailyExecution: 0,
          peakDailyExecution: 0,
          estimatedCompletionDate: null,
          daysRemaining: null,
        },
        qualityGateMetrics: {
          totalGates: results.length,
          passedGates: passedGates.length,
          failedGates: results.length - passedGates.length,
          blockingPassed: blockingPassed.length,
          blockingTotal: blockingGates.length,
        },
      };
    },
    enabled: !!releaseId,
    staleTime: 60000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5C-1: Analytics Trend Data
// ─────────────────────────────────────────────────────────────────────────────

export function useAnalyticsTrend(
  releaseId: string | null,
  days: number = 30,
  _granularity: TimeGranularity = 'day'
) {
  return useQuery({
    queryKey: ['release-analytics-trend', releaseId, days],
    queryFn: async (): Promise<AnalyticsTrendData[]> => {
      if (!releaseId) return [];

      const { data, error } = await supabase.rpc('get_release_execution_trend', {
        p_release_id: releaseId,
        p_days: days,
      });

      if (error) throw error;

      const result = data as unknown as { success: boolean; trend: any[] } | null;
      if (!result?.success) return [];

      return (result.trend || []).map((row: any) => ({
        date: row.date,
        dateLabel: row.date_label || row.date,
        executed: Number(row.executed) || 0,
        passed: Number(row.passed) || 0,
        failed: Number(row.failed) || 0,
        blocked: Number(row.blocked) || 0,
        passRate: Number(row.pass_rate) || 0,
        executionRate: Number(row.execution_rate) || 0,
        cumulativeExecuted: Number(row.cumulative_executed) || 0,
        cumulativePassed: Number(row.cumulative_passed) || 0,
      }));
    },
    enabled: !!releaseId,
    staleTime: 60000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5C-1: Defect Aging Analysis
// ─────────────────────────────────────────────────────────────────────────────

export function useDefectAging(releaseId: string | null) {
  return useQuery({
    queryKey: ['release-defect-aging', releaseId],
    queryFn: async (): Promise<DefectAgingData[]> => {
      if (!releaseId) return [];

      const { data: defects, error } = await supabase
        .from('tm_defects')
        .select('id, severity, created_at, status')
        .eq('release_id', releaseId)
        .neq('status', 'closed')
        .neq('status', 'resolved');

      if (error) throw error;

      const now = new Date();
      const defectList = defects as any[] || [];
      const ageGroups = [
        { label: '0-3 days', min: 0, max: 3 },
        { label: '4-7 days', min: 4, max: 7 },
        { label: '1-2 weeks', min: 8, max: 14 },
        { label: '2-4 weeks', min: 15, max: 28 },
        { label: '1+ month', min: 29, max: Infinity },
      ];

      return ageGroups.map(group => {
        const matching = defectList.filter(d => {
          const ageDays = Math.floor((now.getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24));
          return ageDays >= group.min && ageDays <= group.max;
        });

        return {
          ageGroup: group.label,
          ageMin: group.min,
          ageMax: group.max === Infinity ? 999 : group.max,
          blocker: matching.filter(d => d.severity === 'blocker').length,
          critical: matching.filter(d => d.severity === 'critical').length,
          major: matching.filter(d => d.severity === 'major').length,
          minor: matching.filter(d => d.severity === 'minor').length,
          total: matching.length,
        };
      });
    },
    enabled: !!releaseId,
    staleTime: 60000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5C-1: Test Coverage Breakdown
// ─────────────────────────────────────────────────────────────────────────────

export function useCoverageBreakdown(releaseId: string | null, groupBy: 'folder' | 'priority' | 'type' = 'folder') {
  return useQuery({
    queryKey: ['release-coverage-breakdown', releaseId, groupBy],
    queryFn: async (): Promise<CoverageBreakdown[]> => {
      if (!releaseId) return [];

      // Get cycles for this release
      const { data: cycles } = await supabase
        .from('tm_test_cycles')
        .select('id')
        .eq('release_id', releaseId);

      const cycleList = cycles as any[] || [];
      if (!cycleList.length) return [];

      const cycleIds = cycleList.map(c => c.id);

      // Get cycle scope with test case details
      const { data: scopeData, error } = await supabase
        .from('tm_cycle_scope')
        .select('id, current_status, test_case_id')
        .in('cycle_id', cycleIds);

      if (error) throw error;
      const scope = scopeData as any[] || [];

      // Group by status for simple breakdown
      const statusGroups = new Map<string, any[]>();
      scope.forEach(s => {
        const status = s.current_status || 'not_run';
        if (!statusGroups.has(status)) {
          statusGroups.set(status, []);
        }
        statusGroups.get(status)!.push(s);
      });

      const total = scope.length;
      const executed = scope.filter(s => s.current_status !== 'not_run' && s.current_status !== 'pending').length;
      const passed = scope.filter(s => s.current_status === 'passed').length;
      const failed = scope.filter(s => s.current_status === 'failed').length;

      return [{
        category: 'All Tests',
        categoryId: 'all',
        totalCases: total,
        executed,
        passed,
        failed,
        coveragePercent: total > 0 ? Math.round((executed / total) * 100) : 0,
        passRate: executed > 0 ? Math.round((passed / executed) * 100) : 0,
      }];
    },
    enabled: !!releaseId,
    staleTime: 60000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5C-2: Cross-Release Comparison
// ─────────────────────────────────────────────────────────────────────────────

export function useReleaseComparison(releaseIds: string[]) {
  return useQuery({
    queryKey: ['release-comparison', releaseIds],
    queryFn: async (): Promise<ReleaseComparisonItem[]> => {
      if (releaseIds.length === 0) return [];

      const items: ReleaseComparisonItem[] = [];

      for (const releaseId of releaseIds) {
        const { data: release } = await supabase
          .from('releases')
          .select('id, name, version, status, start_date, release_date')
          .eq('id', releaseId)
          .single();

        if (!release) continue;
        const r = release as any;

        // Get cycles
        const { data: cycles } = await supabase
          .from('tm_test_cycles')
          .select('id')
          .eq('release_id', releaseId);

        const cycleList = cycles as any[] || [];
        const cycleIds = cycleList.map(c => c.id);

        // Get test stats
        let totalCases = 0, executed = 0, passed = 0, failed = 0;
        if (cycleIds.length > 0) {
          const { data: cases } = await supabase
            .from('tm_cycle_scope')
            .select('current_status')
            .in('cycle_id', cycleIds);

          const caseList = cases as any[] || [];
          totalCases = caseList.length;
          caseList.forEach(c => {
            if (c.current_status !== 'not_run' && c.current_status !== 'pending') executed++;
            if (c.current_status === 'passed') passed++;
            if (c.current_status === 'failed') failed++;
          });
        }

        // Get defects
        const { data: defects } = await supabase
          .from('tm_defects')
          .select('id, severity, status')
          .eq('release_id', releaseId);

        const defectList = defects as any[] || [];
        const openDefects = defectList.filter(d => d.status !== 'closed' && d.status !== 'resolved');
        const blockers = openDefects.filter(d => d.severity === 'blocker');

        // Calculate health
        const executionRate = totalCases > 0 ? (executed / totalCases) * 100 : 0;
        const passRate = executed > 0 ? (passed / executed) * 100 : 0;
        const failRate = executed > 0 ? (failed / executed) * 100 : 0;

        let healthScore = 100;
        healthScore -= (100 - executionRate) * 0.3;
        healthScore -= (100 - passRate) * 0.4;
        healthScore -= blockers.length * 10;
        healthScore -= (openDefects.length - blockers.length) * 2;
        healthScore = Math.max(0, Math.min(100, healthScore));

        let healthLevel: ReleaseComparisonItem['healthLevel'] = 'healthy';
        if (healthScore < 50) healthLevel = 'critical';
        else if (healthScore < 70) healthLevel = 'at_risk';
        else if (healthScore < 85) healthLevel = 'attention';

        items.push({
          releaseId: r.id,
          releaseName: r.name,
          releaseVersion: r.version,
          status: r.status,
          startDate: r.start_date,
          endDate: r.release_date,
          totalCycles: cycleIds.length,
          totalTestCases: totalCases,
          executionRate: Math.round(executionRate * 10) / 10,
          passRate: Math.round(passRate * 10) / 10,
          failRate: Math.round(failRate * 10) / 10,
          totalDefects: defectList.length,
          openDefects: openDefects.length,
          blockerDefects: blockers.length,
          healthScore: Math.round(healthScore),
          healthLevel,
        });
      }

      return items;
    },
    enabled: releaseIds.length > 0,
    staleTime: 60000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5C-2: Get Comparable Releases
// ─────────────────────────────────────────────────────────────────────────────

export function useComparableReleases(projectId: string | null, excludeReleaseId?: string) {
  return useQuery({
    queryKey: ['comparable-releases', projectId, excludeReleaseId],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from('releases')
        .select('id, name, version, status, start_date, release_date')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (excludeReleaseId) {
        query = query.neq('id', excludeReleaseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!projectId,
  });
}
