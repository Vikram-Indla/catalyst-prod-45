import { supabase } from '@/integrations/supabase/client';

export interface ReportConfig {
  dateRange: string;
  filters?: {
    cycles?: string[];
    users?: string[];
    status?: string[];
    priority?: string[];
  };
  format?: 'web' | 'pdf' | 'excel';
}

export interface ReportSchedule {
  id?: string;
  report_type: string;
  program_id: string;
  config: ReportConfig;
  schedule_cron: string;
  recipients: string[];
  format: string;
  is_active: boolean;
}

export const reportsService = {
  async generateReport(reportType: string, programId: string, config: ReportConfig) {
    const { data, error } = await supabase
      .from('test_reports')
      .insert({
        report_type: reportType,
        program_id: programId,
        config: config as any,
        generated_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getReports(programId: string, limit = 10) {
    const { data, error } = await supabase
      .from('test_reports')
      .select('*')
      .eq('program_id', programId)
      .order('generated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getReport(id: string) {
    const { data, error } = await supabase
      .from('test_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createShareLink(reportId: string, expiresInDays = 7) {
    const token = Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { data, error } = await supabase
      .from('test_reports')
      .update({
        share_token: token,
        share_expires_at: expiresAt.toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    return { token, url: `${window.location.origin}/reports/shared/${token}` };
  },

  async createSchedule(schedule: ReportSchedule) {
    const user = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('test_report_schedules')
      .insert({
        report_type: schedule.report_type,
        program_id: schedule.program_id,
        config: schedule.config as unknown as any,
        schedule_cron: schedule.schedule_cron,
        recipients: schedule.recipients,
        format: schedule.format,
        is_active: schedule.is_active,
        created_by: user.data.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSchedules(programId: string) {
    const { data, error } = await supabase
      .from('test_report_schedules')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateSchedule(id: string, updates: Partial<Omit<ReportSchedule, 'config'>> & { config?: any }) {
    const { data, error } = await supabase
      .from('test_report_schedules')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSchedule(id: string) {
    const { error } = await supabase
      .from('test_report_schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getProjectMetrics(programId: string, dateRange: string) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

    // Get test cases stats
    const { data: cases } = await supabase
      .from('test_cases')
      .select('status, priority')
      .eq('program_id', programId);

    // Get test sets stats
    const { data: sets } = await supabase
      .from('test_sets')
      .select('id')
      .eq('program_id', programId);

    // Get active cycles
    const { data: cycles } = await supabase
      .from('test_cycles')
      .select('id, status')
      .eq('program_id', programId)
      .in('status', ['not_started', 'active']);

    // Get execution stats
    const { data: executions } = await supabase
      .from('test_cycle_executions')
      .select('status')
      .gte('executed_at', daysAgo.toISOString());

    const totalCases = cases?.length || 0;
    const publishedCases = cases?.filter(c => c.status === 'published').length || 0;
    const executionRate = executions?.length 
      ? (executions.filter(e => e.status !== 'not_executed').length / executions.length) * 100 
      : 0;

    return {
      totalCases,
      publishedPercentage: totalCases ? (publishedCases / totalCases) * 100 : 0,
      totalSets: sets?.length || 0,
      activeCycles: cycles?.length || 0,
      executionRate,
      casesByStatus: this.groupBy(cases || [], 'status'),
      casesByPriority: this.groupBy(cases || [], 'priority'),
    };
  },

  async getExecutionStats(programId: string, dateRange: string) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

    const { data: executions } = await supabase
      .from('test_cycle_executions')
      .select('*, test_cycles(name), test_cases(title)')
      .gte('executed_at', daysAgo.toISOString())
      .order('executed_at', { ascending: true });

    return executions || [];
  },

  groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = String(item[key]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  },
};
