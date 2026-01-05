/**
 * Reports & Analytics React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchExecutionSummary,
  fetchExecutionTrend,
  fetchCoverageStats,
  fetchDailyStats,
  fetchReportConfigurations,
  fetchGeneratedReports,
  fetchDashboardWidgets,
  fetchCycleComparison,
  createDashboardWidget,
  updateDashboardWidget,
  deleteDashboardWidget,
  getDateRangeFromPreset,
} from '../api/reports';
import type { DateRangePreset, TrendGrouping, DashboardWidget } from '../api/types';

// ══════════════════════════════════════════════════════════════════════════════
// Analytics Hooks
// ══════════════════════════════════════════════════════════════════════════════

export function useExecutionSummary(
  projectId: string,
  dateRange: DateRangePreset = 'last_30_days',
  cycleIds?: string[]
) {
  const { start, end } = getDateRangeFromPreset(dateRange);
  
  return useQuery({
    queryKey: ['execution-summary', projectId, dateRange, cycleIds],
    queryFn: () => fetchExecutionSummary(projectId, start, end, cycleIds),
    enabled: !!projectId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useExecutionTrend(
  projectId: string,
  dateRange: DateRangePreset = 'last_30_days',
  grouping: TrendGrouping = 'day'
) {
  const { start, end } = getDateRangeFromPreset(dateRange);
  
  return useQuery({
    queryKey: ['execution-trend', projectId, dateRange, grouping],
    queryFn: () => fetchExecutionTrend(projectId, start, end, grouping),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

export function useCoverageStats(projectId: string, cycleId?: string) {
  return useQuery({
    queryKey: ['coverage-stats', projectId, cycleId],
    queryFn: () => fetchCoverageStats(projectId, cycleId),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

export function useDailyStats(projectId: string, dateRange: DateRangePreset = 'last_30_days') {
  const { start, end } = getDateRangeFromPreset(dateRange);
  
  return useQuery({
    queryKey: ['daily-stats', projectId, dateRange],
    queryFn: () => fetchDailyStats(projectId, start, end),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

export function useCycleComparison(projectId: string, limit = 5) {
  return useQuery({
    queryKey: ['cycle-comparison', projectId, limit],
    queryFn: () => fetchCycleComparison(projectId, limit),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Report Configuration Hooks
// ══════════════════════════════════════════════════════════════════════════════

export function useReportConfigurations(projectId: string) {
  return useQuery({
    queryKey: ['report-configurations', projectId],
    queryFn: () => fetchReportConfigurations(projectId),
    enabled: !!projectId,
  });
}

export function useGeneratedReports(projectId: string, limit = 20) {
  return useQuery({
    queryKey: ['generated-reports', projectId, limit],
    queryFn: () => fetchGeneratedReports(projectId, limit),
    enabled: !!projectId,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Dashboard Widget Hooks
// ══════════════════════════════════════════════════════════════════════════════

export function useDashboardWidgets(projectId: string, userId: string) {
  return useQuery({
    queryKey: ['dashboard-widgets', projectId, userId],
    queryFn: () => fetchDashboardWidgets(projectId, userId),
    enabled: !!projectId && !!userId,
  });
}

export function useCreateWidget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (widget: Omit<DashboardWidget, 'id' | 'created_at' | 'updated_at'>) => 
      createDashboardWidget(widget),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard-widgets', variables.project_id] 
      });
    },
  });
}

export function useUpdateWidget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DashboardWidget> }) => 
      updateDashboardWidget(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    },
  });
}

export function useDeleteWidget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteDashboardWidget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    },
  });
}
