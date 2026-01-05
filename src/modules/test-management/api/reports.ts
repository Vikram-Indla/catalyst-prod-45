/**
 * Reports & Analytics API Layer
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  DateRangePreset,
  TrendGrouping,
  ExecutionSummary,
  TrendDataPoint,
  CoverageStats,
  ReportConfiguration,
  GeneratedReport,
  DashboardWidget,
  WidgetConfig,
  ReportConfig,
} from './types';

// ══════════════════════════════════════════════════════════════════════════════
// Date Range Utilities
// ══════════════════════════════════════════════════════════════════════════════

export function getDateRangeFromPreset(preset: DateRangePreset): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (preset) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: yesterday };
    case 'last_7_days':
      const last7 = new Date(today);
      last7.setDate(last7.getDate() - 6);
      return { start: last7, end: today };
    case 'last_14_days':
      const last14 = new Date(today);
      last14.setDate(last14.getDate() - 13);
      return { start: last14, end: today };
    case 'last_30_days':
      const last30 = new Date(today);
      last30.setDate(last30.getDate() - 29);
      return { start: last30, end: today };
    case 'last_90_days':
      const last90 = new Date(today);
      last90.setDate(last90.getDate() - 89);
      return { start: last90, end: today };
    case 'this_week':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { start: weekStart, end: today };
    case 'this_month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: monthStart, end: today };
    case 'this_quarter':
      const quarter = Math.floor(today.getMonth() / 3);
      const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
      return { start: quarterStart, end: today };
    default:
      return { start: today, end: today };
  }
}

export function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ══════════════════════════════════════════════════════════════════════════════
// Analytics Queries
// ══════════════════════════════════════════════════════════════════════════════

interface RpcRow {
  total_executions?: number;
  passed_count?: number;
  failed_count?: number;
  blocked_count?: number;
  skipped_count?: number;
  pass_rate?: number;
  total_duration_seconds?: number;
  defects_found?: number;
  unique_cases_executed?: number;
  period_start?: string;
  total_test_cases?: number;
  executed_test_cases?: number;
  execution_coverage_pct?: number;
  automated_test_cases?: number;
  automation_rate_pct?: number;
}

export async function fetchExecutionSummary(
  projectId: string,
  startDate: Date,
  endDate: Date,
  cycleIds?: string[]
): Promise<ExecutionSummary> {
  const { data, error } = await supabase.rpc('get_execution_summary', {
    p_project_id: projectId,
    p_start_date: formatDateForDB(startDate),
    p_end_date: formatDateForDB(endDate),
    p_cycle_ids: cycleIds || null,
  });

  if (error) throw error;
  
  const row = (data as RpcRow[])?.[0] || {};
  return {
    total_executions: Number(row.total_executions) || 0,
    passed_count: Number(row.passed_count) || 0,
    failed_count: Number(row.failed_count) || 0,
    blocked_count: Number(row.blocked_count) || 0,
    skipped_count: Number(row.skipped_count) || 0,
    pass_rate: Number(row.pass_rate) || 0,
    total_duration_seconds: Number(row.total_duration_seconds) || 0,
    defects_found: Number(row.defects_found) || 0,
    unique_cases_executed: Number(row.unique_cases_executed) || 0,
  };
}

export async function fetchExecutionTrend(
  projectId: string,
  startDate: Date,
  endDate: Date,
  grouping: TrendGrouping = 'day'
): Promise<TrendDataPoint[]> {
  const { data, error } = await supabase.rpc('get_execution_trend', {
    p_project_id: projectId,
    p_start_date: formatDateForDB(startDate),
    p_end_date: formatDateForDB(endDate),
    p_grouping: grouping,
  });

  if (error) throw error;
  
  return ((data as RpcRow[]) || []).map((row) => ({
    period_start: String(row.period_start),
    total_executions: Number(row.total_executions) || 0,
    passed_count: Number(row.passed_count) || 0,
    failed_count: Number(row.failed_count) || 0,
    blocked_count: Number(row.blocked_count) || 0,
    skipped_count: Number(row.skipped_count) || 0,
    pass_rate: Number(row.pass_rate) || 0,
  }));
}

export async function fetchCoverageStats(
  projectId: string,
  cycleId?: string
): Promise<CoverageStats> {
  const { data, error } = await supabase.rpc('get_coverage_stats', {
    p_project_id: projectId,
    p_cycle_id: cycleId || null,
  });

  if (error) throw error;
  
  const row = (data as RpcRow[])?.[0] || {};
  return {
    total_requirements: 0,
    covered_requirements: 0,
    requirements_coverage_pct: 0,
    total_test_cases: Number(row.total_test_cases) || 0,
    executed_test_cases: Number(row.executed_test_cases) || 0,
    execution_coverage_pct: Number(row.execution_coverage_pct) || 0,
    automated_test_cases: Number(row.automated_test_cases) || 0,
    automation_rate_pct: Number(row.automation_rate_pct) || 0,
  };
}

export async function fetchDailyStats(
  projectId: string,
  startDate: Date,
  endDate: Date
) {
  const { data, error } = await supabase
    .from('daily_execution_stats')
    .select('*')
    .eq('project_id', projectId)
    .gte('stat_date', formatDateForDB(startDate))
    .lte('stat_date', formatDateForDB(endDate))
    .order('stat_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ══════════════════════════════════════════════════════════════════════════════
// Report Configurations
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchReportConfigurations(projectId: string): Promise<ReportConfiguration[]> {
  const { data, error } = await supabase
    .from('report_configurations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(row => ({
    ...row,
    config: (row.config as unknown as ReportConfig) || { date_range: { type: 'last_30_days' } },
    schedule_recipients: row.schedule_recipients || [],
  })) as ReportConfiguration[];
}

export async function createReportConfiguration(
  config: Omit<ReportConfiguration, 'id' | 'created_at' | 'updated_at'>
): Promise<ReportConfiguration> {
  const insertData = {
    project_id: config.project_id,
    name: config.name,
    description: config.description,
    report_type: config.report_type,
    config: config.config as unknown as Record<string, unknown>,
    schedule_enabled: config.schedule_enabled,
    schedule_cron: config.schedule_cron,
    schedule_recipients: config.schedule_recipients,
    is_public: config.is_public,
    created_by: config.created_by,
  };
  
  const { data, error } = await supabase
    .from('report_configurations')
    .insert(insertData as never)
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    config: (data.config as unknown as ReportConfig) || { date_range: { type: 'last_30_days' } },
    schedule_recipients: data.schedule_recipients || [],
  } as ReportConfiguration;
}

// ══════════════════════════════════════════════════════════════════════════════
// Generated Reports
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchGeneratedReports(projectId: string, limit = 20): Promise<GeneratedReport[]> {
  const { data, error } = await supabase
    .from('generated_reports')
    .select('*')
    .eq('project_id', projectId)
    .order('generated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  
  return (data || []).map(row => ({
    ...row,
    parameters: (row.parameters as unknown as ReportConfig) || { date_range: { type: 'last_30_days' } },
  })) as GeneratedReport[];
}

// ══════════════════════════════════════════════════════════════════════════════
// Dashboard Widgets
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchDashboardWidgets(projectId: string, userId: string): Promise<DashboardWidget[]> {
  const { data, error } = await supabase
    .from('dashboard_widgets')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('grid_y', { ascending: true })
    .order('grid_x', { ascending: true });

  if (error) throw error;
  
  return (data || []).map(row => ({
    ...row,
    config: (row.config || {}) as WidgetConfig,
  })) as DashboardWidget[];
}

export async function createDashboardWidget(
  widget: Omit<DashboardWidget, 'id' | 'created_at' | 'updated_at'>
): Promise<DashboardWidget> {
  const insertData = {
    project_id: widget.project_id,
    user_id: widget.user_id,
    name: widget.name,
    widget_type: widget.widget_type,
    grid_x: widget.grid_x,
    grid_y: widget.grid_y,
    grid_w: widget.grid_w,
    grid_h: widget.grid_h,
    config: widget.config as unknown as Record<string, unknown>,
  };
  
  const { data, error } = await supabase
    .from('dashboard_widgets')
    .insert(insertData as never)
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    config: (data.config as unknown as WidgetConfig) || {},
  } as DashboardWidget;
}

export async function updateDashboardWidget(
  id: string, 
  updates: Partial<DashboardWidget>
): Promise<DashboardWidget> {
  const updateData: Record<string, unknown> = { ...updates };
  if (updates.config) {
    updateData.config = updates.config as unknown as Record<string, unknown>;
  }
  
  const { data, error } = await supabase
    .from('dashboard_widgets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    config: (data.config || {}) as WidgetConfig,
  } as DashboardWidget;
}

export async function deleteDashboardWidget(id: string) {
  const { error } = await supabase
    .from('dashboard_widgets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ══════════════════════════════════════════════════════════════════════════════
// Cycle Comparison
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchCycleComparison(projectId: string, limit = 5) {
  const { data, error } = await supabase
    .from('tm_test_cycles')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  
  return (data || []).map(cycle => ({
    id: cycle.id,
    key: cycle.cycle_key,
    name: cycle.name,
    status: cycle.status,
    test_case_count: cycle.total_cases || 0,
    pass_rate: cycle.total_cases > 0 
      ? Math.round(((cycle.passed_count || 0) / cycle.total_cases) * 100) 
      : 0,
    passed_count: cycle.passed_count || 0,
    failed_count: cycle.failed_count || 0,
    blocked_count: cycle.blocked_count || 0,
    skipped_count: cycle.skipped_count || 0,
    defect_count: 0,
    duration_hours: 0,
    trend_vs_previous: 0,
  }));
}
