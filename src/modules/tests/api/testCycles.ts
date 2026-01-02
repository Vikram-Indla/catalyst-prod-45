/**
 * Test Cycles API
 * CRUD operations for test cycles
 */

import { supabase } from '@/integrations/supabase/client';
import { logAuditEntry } from '@/lib/auditLogger';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface TestCycleFilters {
  search?: string;
  status?: string[];
  environment?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TestCycleInput {
  name: string;
  notes?: string;
  environment?: string;
  build_version?: string;
  start_date?: string;
  end_date?: string;
  test_set_ids?: string[];
}

export interface TestCyclePatch extends Partial<TestCycleInput> {
  id: string;
}

// ═══════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * List test cycles with filters
 */
export async function listTestCycles(
  projectId: string,
  filters: TestCycleFilters = {}
) {
  if (!projectId) throw new Error('Project ID is required');

  let query = supabase
    .from('test_cycles')
    .select(`
      *,
      test_cycle_executions(id, status)
    `)
    .eq('project_id', projectId)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }
  if (filters.status?.length) {
    query = query.in('status', filters.status);
  }
  if (filters.environment) {
    query = query.eq('environment', filters.environment);
  }
  if (filters.dateFrom) {
    query = query.gte('start_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('end_date', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch test cycles: ${error.message}`);

  // Calculate execution stats for each cycle
  return (data || []).map(cycle => {
    const execs = cycle.test_cycle_executions || [];
    const total = execs.length;
    const passed = execs.filter((e: any) => e.status === 'passed').length;
    const failed = execs.filter((e: any) => e.status === 'failed').length;
    const blocked = execs.filter((e: any) => e.status === 'blocked').length;
    const notRun = execs.filter((e: any) => e.status === 'not_run' || !e.status).length;
    const executed = total - notRun;
    const progress = total > 0 ? Math.round((executed / total) * 100) : 0;

    return {
      ...cycle,
      stats: { total, passed, failed, blocked, notRun, progress },
    };
  });
}

/**
 * Get a single test cycle by ID with full details
 */
export async function getTestCycleById(id: string) {
  if (!id) throw new Error('Test cycle ID is required');

  const { data, error } = await supabase
    .from('test_cycles')
    .select(`
      *,
      test_cycle_executions(
        *,
        test_case:test_cases(id, title, priority, test_type)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed to fetch test cycle: ${error.message}`);
  if (!data) throw new Error('Test cycle not found');

  return data;
}

/**
 * Create a new test cycle
 */
export async function createTestCycle(
  projectId: string,
  userId: string,
  input: TestCycleInput
) {
  if (!projectId) throw new Error('Project ID is required');
  if (!userId) throw new Error('User ID is required');
  if (!input.name?.trim()) throw new Error('Name is required');

  // Generate cycle key
  const { count } = await supabase
    .from('test_cycles')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const key = `CYC-${((count || 0) + 1).toString().padStart(3, '0')}`;

  const { data, error } = await supabase
    .from('test_cycles')
    .insert({
      name: input.name.trim(),
      notes: input.notes || null,
      environment: input.environment || null,
      build_version: input.build_version || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      key,
      project_id: projectId,
      status: 'planned',
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create test cycle: ${error.message}`);

  // Add test cases from test sets if provided
  if (input.test_set_ids?.length) {
    await addTestCasesFromSets(data.id, input.test_set_ids, userId);
  }

  await logAuditEntry({
    entityType: 'test_cycles',
    entityId: data.id,
    action: 'created',
    afterData: data,
  });

  return data;
}

/**
 * Add test cases to cycle from test sets
 */
async function addTestCasesFromSets(cycleId: string, testSetIds: string[], userId: string) {
  // Get test cases from sets
  const { data: setCases } = await supabase
    .from('test_set_cases')
    .select('test_case_id')
    .in('test_set_id', testSetIds);

  if (!setCases?.length) return;

  // Create execution records for each test case
  const executions = setCases.map(sc => ({
    cycle_id: cycleId,
    case_id: sc.test_case_id,
    status: 'not_run',
    created_by: userId,
  }));

  await supabase.from('test_cycle_executions').insert(executions);
}

/**
 * Update a test cycle
 */
export async function updateTestCycle(
  userId: string,
  patch: TestCyclePatch
) {
  if (!patch.id) throw new Error('Test cycle ID is required');

  const { data: before } = await supabase
    .from('test_cycles')
    .select('*')
    .eq('id', patch.id)
    .single();

  const { id, ...updateData } = patch;

  const { data, error } = await supabase
    .from('test_cycles')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update test cycle: ${error.message}`);

  await logAuditEntry({
    entityType: 'test_cycles',
    entityId: data.id,
    action: 'updated',
    beforeData: before,
    afterData: data,
  });

  return data;
}

/**
 * Archive a test cycle
 */
export async function archiveTestCycle(id: string, userId: string, reason?: string) {
  if (!id) throw new Error('Test cycle ID is required');

  const { data: before } = await supabase
    .from('test_cycles')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('test_cycles')
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      archived_by: userId,
      archive_reason: reason || null,
    })
    .eq('id', id);

  if (error) throw new Error(`Failed to archive test cycle: ${error.message}`);

  await logAuditEntry({
    entityType: 'test_cycles',
    entityId: id,
    action: 'archived',
    beforeData: before,
  });

  return { success: true };
}

/**
 * Get available environments for filter dropdown
 */
export async function getTestCycleEnvironments(projectId: string) {
  const { data, error } = await supabase
    .from('test_cycles')
    .select('environment')
    .eq('project_id', projectId)
    .eq('archived', false)
    .not('environment', 'is', null);

  if (error) throw new Error(`Failed to fetch environments: ${error.message}`);

  const environments = [...new Set(data?.map(d => d.environment).filter(Boolean))];
  return environments.sort();
}
