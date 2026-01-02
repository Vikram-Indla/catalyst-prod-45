/**
 * Test Reports API
 * CRUD operations for test reports
 */

import { supabase } from '@/integrations/supabase/client';
import { logAuditEntry } from '@/lib/auditLogger';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface TestReportFilters {
  search?: string;
  type?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface TestReportInput {
  report_type: string;
  config: Record<string, any>;
  program_id: string;
}

export interface TestReportPatch extends Partial<Omit<TestReportInput, 'program_id'>> {
  id: string;
}

// ═══════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * List test reports
 */
export async function listTestReports(
  programId: string,
  filters: TestReportFilters = {}
) {
  if (!programId) throw new Error('Program ID is required');

  let query = supabase
    .from('test_reports')
    .select('*')
    .eq('program_id', programId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.type?.length) {
    query = query.in('report_type', filters.type);
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch reports: ${error.message}`);

  return data || [];
}

/**
 * Get a single report by ID
 */
export async function getTestReportById(id: string) {
  if (!id) throw new Error('Report ID is required');

  const { data, error } = await supabase
    .from('test_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed to fetch report: ${error.message}`);
  if (!data) throw new Error('Report not found');

  return data;
}

/**
 * Create a new report
 */
export async function createTestReport(
  programId: string,
  userId: string,
  input: TestReportInput
) {
  if (!programId) throw new Error('Program ID is required');
  if (!userId) throw new Error('User ID is required');

  const { data, error } = await supabase
    .from('test_reports')
    .insert({
      report_type: input.report_type,
      config: input.config || {},
      program_id: programId,
      generated_by: userId,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create report: ${error.message}`);

  await logAuditEntry({
    entityType: 'test_reports',
    entityId: data.id,
    action: 'created',
    afterData: data,
  });

  return data;
}

/**
 * Update a report
 */
export async function updateTestReport(
  userId: string,
  patch: TestReportPatch
) {
  if (!patch.id) throw new Error('Report ID is required');

  const { data: before } = await supabase
    .from('test_reports')
    .select('*')
    .eq('id', patch.id)
    .single();

  const { id, ...updateData } = patch;

  const { data, error } = await supabase
    .from('test_reports')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update report: ${error.message}`);

  await logAuditEntry({
    entityType: 'test_reports',
    entityId: data.id,
    action: 'updated',
    beforeData: before,
    afterData: data,
  });

  return data;
}

/**
 * Delete a report
 */
export async function deleteTestReport(id: string, userId: string) {
  if (!id) throw new Error('Report ID is required');

  const { data: before } = await supabase
    .from('test_reports')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('test_reports')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete report: ${error.message}`);

  await logAuditEntry({
    entityType: 'test_reports',
    entityId: id,
    action: 'deleted',
    beforeData: before,
  });

  return { success: true };
}

/**
 * Generate report data from cycle executions
 */
export async function generateReportData(
  cycleIds: string[]
) {
  if (!cycleIds.length) throw new Error('At least one cycle ID is required');

  // Get cycles with executions
  const { data: cycles, error: cyclesError } = await supabase
    .from('test_cycles')
    .select(`
      id, name, key, environment, build_version, start_date, end_date, status,
      test_cycle_executions(id, status, executed_at, effort_minutes)
    `)
    .in('id', cycleIds);

  if (cyclesError) throw new Error(`Failed to fetch cycles: ${cyclesError.message}`);

  // Calculate stats for each cycle
  const cycleStats = (cycles || []).map((cycle: any) => {
    const execs = cycle.test_cycle_executions || [];
    return {
      cycle_id: cycle.id,
      cycle_name: cycle.name,
      cycle_key: cycle.key,
      environment: cycle.environment,
      build_version: cycle.build_version,
      total: execs.length,
      passed: execs.filter((e: any) => e.status === 'passed').length,
      failed: execs.filter((e: any) => e.status === 'failed').length,
      blocked: execs.filter((e: any) => e.status === 'blocked').length,
      notRun: execs.filter((e: any) => e.status === 'not_run' || !e.status).length,
      totalEffort: execs.reduce((sum: number, e: any) => sum + (e.effort_minutes || 0), 0),
    };
  });

  // Calculate totals
  const totals = cycleStats.reduce((acc, c) => ({
    total: acc.total + c.total,
    passed: acc.passed + c.passed,
    failed: acc.failed + c.failed,
    blocked: acc.blocked + c.blocked,
    notRun: acc.notRun + c.notRun,
    totalEffort: acc.totalEffort + c.totalEffort,
  }), { total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0, totalEffort: 0 });

  return {
    cycles: cycleStats,
    totals,
    passRate: totals.total > 0 
      ? Math.round((totals.passed / (totals.passed + totals.failed + totals.blocked)) * 100) || 0 
      : 0,
    completionRate: totals.total > 0 
      ? Math.round(((totals.total - totals.notRun) / totals.total) * 100) 
      : 0,
  };
}
