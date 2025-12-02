/**
 * CATALYST TESTS - Cycle Service
 * API service layer for test cycles and executions
 */

import { supabase } from '@/integrations/supabase/client';
import type { TestCycle, CreateCycleRequest, CycleExecution, BulkAssignRequest, ExecutionStats, CycleWithStats } from '@/types/cycle';

/**
 * Fetch cycles with optional filters
 */
export async function fetchCycles(params?: {
  program_id?: string;
  folder_id?: string | null;
  status?: string;
}): Promise<CycleWithStats[]> {
  let query = supabase
    .from('test_cycles')
    .select('*')
    .order('is_adhoc', { ascending: false }) // Adhoc cycle first
    .order('created_at', { ascending: false });

  if (params?.program_id) {
    query = query.eq('program_id', params.program_id);
  }

  if (params?.folder_id !== undefined) {
    if (params.folder_id === null) {
      query = query.is('folder_id', null);
    } else {
      query = query.eq('folder_id', params.folder_id);
    }
  }

  if (params?.status) {
    query = query.eq('status', params.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Fetch stats for each cycle
  const cyclesWithStats = await Promise.all(
    (data || []).map(async (cycle) => {
      const stats = await fetchCycleStats(cycle.id);
      return {
        ...(cycle as TestCycle),
        ...stats,
      };
    })
  );

  return cyclesWithStats;
}

/**
 * Fetch cycle statistics
 */
export async function fetchCycleStats(cycleId: string): Promise<{
  execution_stats: ExecutionStats;
  my_stats: ExecutionStats;
  days_left: number;
}> {
  // Fetch all executions
  const { data: executions, error } = await supabase
    .from('test_cycle_executions')
    .select('*')
    .eq('cycle_id', cycleId);

  if (error) throw error;

  const user = (await supabase.auth.getUser()).data.user;
  const myExecutions = executions?.filter(e => e.assigned_to === user?.id) || [];

  const calculateStats = (execs: typeof executions): ExecutionStats => ({
    total: execs?.length || 0,
    not_executed: execs?.filter(e => e.status === 'not_executed').length || 0,
    passed: execs?.filter(e => e.status === 'passed').length || 0,
    failed: execs?.filter(e => e.status === 'failed').length || 0,
    blocked: execs?.filter(e => e.status === 'blocked').length || 0,
    skipped: execs?.filter(e => e.status === 'skipped').length || 0,
  });

  // Calculate days left
  const { data: cycle } = await supabase
    .from('test_cycles')
    .select('end_date')
    .eq('id', cycleId)
    .single();

  const daysLeft = cycle?.end_date
    ? Math.ceil((new Date(cycle.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    execution_stats: calculateStats(executions),
    my_stats: calculateStats(myExecutions),
    days_left: daysLeft,
  };
}

/**
 * Create new cycle
 */
export async function createCycle(request: CreateCycleRequest): Promise<TestCycle> {
  const user = (await supabase.auth.getUser()).data.user;

  // Generate cycle key
  const { count } = await supabase
    .from('test_cycles')
    .select('*', { count: 'exact', head: true });

  const key = `CYC-${String((count || 0) + 1).padStart(3, '0')}`;

  // Create cycle
  const { data: cycle, error: cycleError } = await supabase
    .from('test_cycles')
    .insert({
      key,
      name: request.name,
      objective: request.objective || '',
      folder_id: request.folder_id || null,
      owner_id: request.owner_id || user?.id || null,
      start_date: request.start_date,
      end_date: request.end_date,
      environment: request.environment || '',
      program_id: request.program_id || null,
      status: 'not_started',
      created_by: user?.id,
    })
    .select()
    .single();

  if (cycleError) throw cycleError;

  return cycle as TestCycle;

  // Add cases if provided
  if (request.cases && request.cases.length > 0) {
    const executions = request.cases.map(c => ({
      cycle_id: cycle.id,
      case_id: c.case_id,
      case_version: c.version,
      assigned_to: c.assigned_to || null,
    }));

    const { error: execError } = await supabase
      .from('test_cycle_executions')
      .insert(executions);

    if (execError) throw execError;
  }

  // Add cases from sets if provided
  if (request.sets && request.sets.length > 0) {
    for (const setId of request.sets) {
      await addSetToCycle(cycle.id, setId);
    }
  }

  return cycle as TestCycle;
}

/**
 * Add set to cycle
 */
export async function addSetToCycle(cycleId: string, setId: string, assignAllTo?: string) {
  // Fetch cases from set
  const { data: setCases, error: setError } = await supabase
    .from('test_set_cases')
    .select('case_id, case_version')
    .eq('set_id', setId);

  if (setError) throw setError;

  if (!setCases || setCases.length === 0) {
    throw new Error('No cases found in set');
  }

  // Create executions
  const executions = setCases.map(sc => ({
    cycle_id: cycleId,
    case_id: sc.case_id,
    case_version: sc.case_version || 1,
    assigned_to: assignAllTo || null,
  }));

  const { error } = await supabase
    .from('test_cycle_executions')
    .insert(executions);

  if (error) throw error;
}

/**
 * Add cases to cycle
 */
export async function addCasesToCycle(
  cycleId: string,
  cases: { case_id: string; version: number; assigned_to?: string | null }[]
) {
  const executions = cases.map(c => ({
    cycle_id: cycleId,
    case_id: c.case_id,
    case_version: c.version,
    assigned_to: c.assigned_to || null,
  }));

  const { data, error } = await supabase
    .from('test_cycle_executions')
    .insert(executions)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Remove cases from cycle
 */
export async function removeCasesFromCycle(cycleId: string, executionIds: string[]) {
  const { error } = await supabase
    .from('test_cycle_executions')
    .delete()
    .in('id', executionIds)
    .eq('status', 'not_executed'); // Only allow removing not executed

  if (error) throw error;
}

/**
 * Bulk assign executions
 */
export async function bulkAssignExecutions(request: BulkAssignRequest) {
  const { error } = await supabase
    .from('test_cycle_executions')
    .update({ assigned_to: request.assigned_to })
    .in('id', request.execution_ids);

  if (error) throw error;
}

/**
 * Update execution status
 */
export async function updateExecutionStatus(
  executionId: string,
  status: CycleExecution['status'],
  comments?: string
) {
  const user = (await supabase.auth.getUser()).data.user;

  const { error } = await supabase
    .from('test_cycle_executions')
    .update({
      status,
      executed_at: new Date().toISOString(),
      executed_by: user?.id,
      comments: comments || '',
    })
    .eq('id', executionId);

  if (error) throw error;
}

/**
 * Delete cycle
 */
export async function deleteCycle(cycleId: string) {
  // Check if adhoc
  const { data: cycle } = await supabase
    .from('test_cycles')
    .select('is_adhoc')
    .eq('id', cycleId)
    .single();

  if (cycle?.is_adhoc) {
    throw new Error('Cannot delete Adhoc cycle');
  }

  // Check if has completed executions
  const { data: executions } = await supabase
    .from('test_cycle_executions')
    .select('status')
    .eq('cycle_id', cycleId)
    .neq('status', 'not_executed');

  if (executions && executions.length > 0) {
    throw new Error('Cannot delete cycle with completed executions');
  }

  const { error } = await supabase
    .from('test_cycles')
    .delete()
    .eq('id', cycleId);

  if (error) throw error;
}

/**
 * Update cycle
 */
export async function updateCycle(cycleId: string, updates: Partial<TestCycle>) {
  const { error } = await supabase
    .from('test_cycles')
    .update(updates)
    .eq('id', cycleId);

  if (error) throw error;
}
