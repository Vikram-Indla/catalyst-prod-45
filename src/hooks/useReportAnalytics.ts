import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ExecutionMetrics, 
  TrendDataPoint, 
  CoverageMetrics,
  FolderMetrics,
  TesterPerformance,
  ReportDefinition,
  ReportSchedule,
} from '@/types/reports';
import { ExportData, ExportOptions, reportExportToPDF, reportExportToExcel, reportExportToCSV } from '@/lib/reportExportUtils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useState } from 'react';

// ─── Execution Metrics ───────────────────────────────────────────
export function useExecutionMetrics(
  startDate: Date,
  endDate: Date,
  cycleId?: string
) {
  return useQuery({
    queryKey: ['report-execution-metrics', startDate.toISOString(), endDate.toISOString(), cycleId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_report_execution_metrics', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_cycle_id: cycleId || null,
      });
      if (error) throw error;
      return data as unknown as ExecutionMetrics;
    },
  });
}

// ─── Execution Trend ─────────────────────────────────────────────
export function useExecutionTrend(
  startDate: Date,
  endDate: Date,
  interval: 'day' | 'week' | 'month' = 'day'
) {
  return useQuery({
    queryKey: ['report-execution-trend', startDate.toISOString(), endDate.toISOString(), interval],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_report_execution_trend', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_interval: interval,
      });
      if (error) throw error;
      return (data || []) as unknown as TrendDataPoint[];
    },
  });
}

// ─── Coverage Metrics ────────────────────────────────────────────
export function useCoverageMetrics() {
  return useQuery({
    queryKey: ['report-coverage-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_report_coverage_metrics');
      if (error) throw error;
      return data as unknown as CoverageMetrics;
    },
  });
}

// ─── Results By Folder ───────────────────────────────────────────
export function useResultsByFolder(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['report-results-by-folder', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_report_results_by_folder', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
      });
      if (error) throw error;
      return (data || []) as unknown as FolderMetrics[];
    },
  });
}

// ─── Tester Performance ──────────────────────────────────────────
export function useTesterPerformance(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['report-tester-performance', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_report_tester_performance', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
      });
      if (error) throw error;
      return (data || []) as unknown as TesterPerformance[];
    },
  });
}

// ─── Defect Metrics ──────────────────────────────────────────────
export function useDefectMetrics(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['report-defect-metrics', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_defect_metrics', {
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
      });
      if (error) throw new Error(error.message);
      return data as unknown as import('@/types/reports').DefectMetrics;
    },
  });
}

// ─── Report Definitions CRUD ─────────────────────────────────────
export function useReportDefinitions() {
  return useQuery({
    queryKey: ['report-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_definitions')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ReportDefinition[];
    },
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (report: Partial<ReportDefinition>) => {
      const { data, error } = await supabase
        .from('report_definitions')
        .insert(report as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-definitions'] });
      toast.success('Report saved');
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('report_definitions')
        .delete()
        .eq('id', reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-definitions'] });
      toast.success('Report deleted');
    },
  });
}

// ─── Schedules ───────────────────────────────────────────────────
export function useReportSchedules(reportId: string) {
  return useQuery({
    queryKey: ['report-schedules', reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_schedules')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ReportSchedule[];
    },
    enabled: !!reportId,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (schedule: Partial<ReportSchedule>) => {
      const nextRun = calculateNextRun(schedule);
      const { data, error } = await supabase
        .from('report_schedules')
        .insert({ ...schedule, next_run_at: nextRun.toISOString() } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules', variables.report_id] });
      toast.success('Schedule created');
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReportSchedule> & { id: string }) => {
      const { data, error } = await supabase
        .from('report_schedules')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules', data.report_id] });
      toast.success('Schedule updated');
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('report_schedules')
        .delete()
        .eq('id', scheduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success('Schedule deleted');
    },
  });
}

// ─── Export ──────────────────────────────────────────────────────
export function useExportReport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportReport = async (
    dateRange: { start: Date; end: Date },
    exportFormat: 'pdf' | 'excel' | 'csv',
    options: ExportOptions
  ) => {
    setIsExporting(true);
    try {
      const [execMetrics, folderData] = await Promise.all([
        supabase.rpc('get_report_execution_metrics', {
          p_start_date: dateRange.start.toISOString(),
          p_end_date: dateRange.end.toISOString(),
        }),
        supabase.rpc('get_report_results_by_folder', {
          p_start_date: dateRange.start.toISOString(),
          p_end_date: dateRange.end.toISOString(),
        }),
      ]);

      const exportData: ExportData = {
        title: 'Test Execution Report',
        subtitle: `${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`,
        generatedAt: new Date(),
        metrics: execMetrics.data as any,
        tableData: {
          headers: ['Module', 'Total', 'Passed', 'Failed', 'Pass Rate'],
          rows: ((folderData.data as any) || []).map((f: any) => [
            f.folder_name || 'Uncategorized',
            f.total,
            f.passed,
            f.failed,
            `${f.pass_rate}%`,
          ]),
        },
      };

      switch (exportFormat) {
        case 'pdf': await reportExportToPDF(exportData, options); break;
        case 'excel': reportExportToExcel(exportData, options); break;
        case 'csv': reportExportToCSV(exportData); break;
      }
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return { exportReport, isExporting };
}

// ─── Helpers ─────────────────────────────────────────────────────
function calculateNextRun(schedule: Partial<ReportSchedule>): Date {
  const now = new Date();
  const [hours, minutes] = (schedule.time_of_day || '09:00').split(':').map(Number);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  switch (schedule.frequency) {
    case 'daily': break;
    case 'weekly': {
      const targetDay = schedule.day_of_week ?? 1;
      while (next.getDay() !== targetDay) next.setDate(next.getDate() + 1);
      break;
    }
    case 'monthly': {
      const targetDate = schedule.day_of_month ?? 1;
      next.setDate(targetDate);
      if (next <= now) next.setMonth(next.getMonth() + 1);
      break;
    }
  }
  return next;
}
