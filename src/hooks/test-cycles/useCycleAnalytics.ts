/**
 * Module 4A-4: Hooks for cycle analytics
 * Quality trends, defect trends, tester performance, cycle comparison
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================
// Quality Trends
// ============================================================
export interface QualityTrendPoint {
  dateKey: string;
  dateLabel: string;
  passRate: number;
  executionRate: number;
  defectRate: number;
  cumulativePassed: number;
  cumulativeFailed: number;
  cumulativeBlocked: number;
}

export function useCycleQualityTrends(cycleId: string | null, days: number = 14) {
  return useQuery({
    queryKey: ['cycle-quality-trends', cycleId, days],
    queryFn: async (): Promise<QualityTrendPoint[]> => {
      if (!cycleId) return [];

      const { data, error } = await supabase
        .rpc('tm_get_cycle_quality_trends', { p_cycle_id: cycleId, p_days: days });

      if (error) throw error;

      return ((data as unknown as any[]) || []).map(row => ({
        dateKey: row.date_key,
        dateLabel: row.date_label,
        passRate: Number(row.pass_rate) || 0,
        executionRate: Number(row.execution_rate) || 0,
        defectRate: Number(row.defect_rate) || 0,
        cumulativePassed: Number(row.cumulative_passed) || 0,
        cumulativeFailed: Number(row.cumulative_failed) || 0,
        cumulativeBlocked: Number(row.cumulative_blocked) || 0,
      }));
    },
    enabled: !!cycleId,
    staleTime: 60000,
  });
}

// ============================================================
// Defect Trends
// ============================================================
export interface DefectTrendPoint {
  dateKey: string;
  dateLabel: string;
  blockerCount: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  totalDefects: number;
  cumulativeTotal: number;
}

export function useCycleDefectTrends(cycleId: string | null, days: number = 14) {
  return useQuery({
    queryKey: ['cycle-defect-trends', cycleId, days],
    queryFn: async (): Promise<DefectTrendPoint[]> => {
      if (!cycleId) return [];

      const { data, error } = await supabase
        .rpc('tm_get_cycle_defect_trends', { p_cycle_id: cycleId, p_days: days });

      if (error) throw error;

      return ((data as unknown as any[]) || []).map(row => ({
        dateKey: row.date_key,
        dateLabel: row.date_label,
        blockerCount: Number(row.blocker_count) || 0,
        criticalCount: Number(row.critical_count) || 0,
        majorCount: Number(row.major_count) || 0,
        minorCount: Number(row.minor_count) || 0,
        totalDefects: Number(row.total_defects) || 0,
        cumulativeTotal: Number(row.cumulative_total) || 0,
      }));
    },
    enabled: !!cycleId,
    staleTime: 60000,
  });
}

// ============================================================
// Tester Performance
// ============================================================
export interface TesterPerformance {
  userId: string;
  userName: string;
  userInitials: string;
  testsAssigned: number;
  testsCompleted: number;
  testsPassed: number;
  testsFailed: number;
  completionRate: number;
  passRate: number;
  avgExecutionTime: number;
  defectsFound: number;
  productivityScore: number;
}

export function useTesterPerformance(cycleId: string | null) {
  return useQuery({
    queryKey: ['tester-performance', cycleId],
    queryFn: async (): Promise<TesterPerformance[]> => {
      if (!cycleId) return [];

      const { data, error } = await supabase
        .rpc('tm_get_tester_performance', { p_cycle_id: cycleId });

      if (error) throw error;

      return ((data as unknown as any[]) || []).map(row => ({
        userId: row.user_id,
        userName: row.user_name,
        userInitials: row.user_initials,
        testsAssigned: Number(row.tests_assigned) || 0,
        testsCompleted: Number(row.tests_completed) || 0,
        testsPassed: Number(row.tests_passed) || 0,
        testsFailed: Number(row.tests_failed) || 0,
        completionRate: Number(row.completion_rate) || 0,
        passRate: Number(row.pass_rate) || 0,
        avgExecutionTime: Number(row.avg_execution_time) || 0,
        defectsFound: Number(row.defects_found) || 0,
        productivityScore: Number(row.productivity_score) || 0,
      }));
    },
    enabled: !!cycleId,
    staleTime: 60000,
  });
}

// ============================================================
// Cycle Comparison
// ============================================================
export interface CycleCompareData {
  cycleId: string;
  cycleName: string;
  cycleKey: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  totalCases: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  executionRate: number;
  passRate: number;
  defectDensity: number;
  avgExecutionTime: number;
  activeTesters: number;
  totalDefects: number;
  healthScore: number;
  healthLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

export function useCycleComparison(cycleIds: string[]) {
  return useQuery({
    queryKey: ['cycle-comparison', cycleIds],
    queryFn: async (): Promise<CycleCompareData[]> => {
      if (cycleIds.length === 0) return [];

      const { data, error } = await supabase
        .rpc('tm_compare_cycles', { p_cycle_ids: cycleIds });

      if (error) throw error;

      return ((data as unknown as any[]) || []).map(row => ({
        cycleId: row.cycle_id,
        cycleName: row.cycle_name,
        cycleKey: row.cycle_key,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        totalCases: Number(row.total_cases) || 0,
        passed: Number(row.passed) || 0,
        failed: Number(row.failed) || 0,
        blocked: Number(row.blocked) || 0,
        notRun: Number(row.not_run) || 0,
        executionRate: Number(row.execution_rate) || 0,
        passRate: Number(row.pass_rate) || 0,
        defectDensity: Number(row.defect_density) || 0,
        avgExecutionTime: Number(row.avg_execution_time) || 0,
        activeTesters: Number(row.active_testers) || 0,
        totalDefects: Number(row.total_defects) || 0,
        healthScore: Number(row.health_score) || 0,
        healthLevel: row.health_level as CycleCompareData['healthLevel'],
      }));
    },
    enabled: cycleIds.length > 0,
    staleTime: 60000,
  });
}

// ============================================================
// Plan Analytics
// ============================================================
export interface PlanAnalytics {
  planId: string;
  planName: string;
  totalCycles: number;
  activeCycles: number;
  completedCycles: number;
  totalTestCases: number;
  totalPassed: number;
  totalFailed: number;
  totalBlocked: number;
  overallPassRate: number;
  overallExecutionRate: number;
  avgCycleDurationDays: number;
  totalDefectsFound: number;
  planHealthScore: number;
}

export function usePlanAnalytics(planId: string | null) {
  return useQuery({
    queryKey: ['plan-analytics', planId],
    queryFn: async (): Promise<PlanAnalytics | null> => {
      if (!planId) return null;

      const { data, error } = await supabase
        .rpc('tm_get_plan_analytics', { p_plan_id: planId });

      if (error) throw error;
      if (!data || (Array.isArray(data) && data.length === 0)) return null;

      const row = Array.isArray(data) ? data[0] : data;
      
      return {
        planId: row.plan_id,
        planName: row.plan_name,
        totalCycles: Number(row.total_cycles) || 0,
        activeCycles: Number(row.active_cycles) || 0,
        completedCycles: Number(row.completed_cycles) || 0,
        totalTestCases: Number(row.total_test_cases) || 0,
        totalPassed: Number(row.total_passed) || 0,
        totalFailed: Number(row.total_failed) || 0,
        totalBlocked: Number(row.total_blocked) || 0,
        overallPassRate: Number(row.overall_pass_rate) || 0,
        overallExecutionRate: Number(row.overall_execution_rate) || 0,
        avgCycleDurationDays: Number(row.avg_cycle_duration_days) || 0,
        totalDefectsFound: Number(row.total_defects_found) || 0,
        planHealthScore: Number(row.plan_health_score) || 0,
      };
    },
    enabled: !!planId,
    staleTime: 60000,
  });
}
