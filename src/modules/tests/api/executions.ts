/**
 * Test Executions API
 * CRUD operations for test executions and step results
 */

import { supabase } from '@/integrations/supabase/client';
import { logAuditEntry } from '@/lib/auditLogger';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface ExecutionFilters {
  search?: string;
  status?: string[];
  cycleId?: string;
  testCaseId?: string;
  assignedTo?: string;
  executedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExecutionStatusUpdate {
  status: 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';
  notes?: string;
  defect_id?: string;
}

export interface StepResultInput {
  step_id: string;
  status: 'not_run' | 'passed' | 'failed' | 'blocked';
  actual_result?: string;
  notes?: string;
  attachments?: string[];
}

export interface DefectFromFailureInput {
  title: string;
  description?: string;
  severity: 'critical' | 'major' | 'minor' | 'trivial';
  priority: 'critical' | 'high' | 'medium' | 'low';
  steps_to_reproduce?: string;
  expected_result?: string;
  actual_result?: string;
}

// ═══════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * List executions with filters
 */
export async function listExecutions(
  projectId: string,
  filters: ExecutionFilters = {}
) {
  if (!projectId) throw new Error('Project ID is required');

  let query = supabase
    .from('test_cycle_executions')
    .select(`
      *,
      test_case:test_cases(id, title, priority, test_type, component),
      test_cycle:test_cycles(id, name, key, project_id)
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  // Apply filters
  if (filters.cycleId) {
    query = query.eq('cycle_id', filters.cycleId);
  }
  if (filters.testCaseId) {
    query = query.eq('case_id', filters.testCaseId);
  }
  if (filters.status?.length) {
    query = query.in('status', filters.status);
  }
  if (filters.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }
  if (filters.executedBy) {
    query = query.eq('executed_by', filters.executedBy);
  }
  if (filters.dateFrom) {
    query = query.gte('executed_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('executed_at', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch executions: ${error.message}`);

  // Filter by project (join doesn't filter directly)
  const filtered = (data || []).filter((e: any) => e.test_cycle?.project_id === projectId);

  // Apply search filter on client side
  if (filters.search) {
    const q = filters.search.toLowerCase();
    return filtered.filter((e: any) =>
      e.test_case?.title?.toLowerCase().includes(q) ||
      e.test_cycle?.key?.toLowerCase().includes(q)
    );
  }

  return filtered;
}

/**
 * Get a single execution by ID with full details
 */
export async function getExecutionById(id: string) {
  if (!id) throw new Error('Execution ID is required');

  const { data, error } = await supabase
    .from('test_cycle_executions')
    .select(`
      *,
      test_case:test_cases(
        id, title, description, preconditions, priority, test_type, component,
        test_steps(*)
      ),
      test_cycle:test_cycles(id, name, key, environment, build_version),
      step_results:test_step_results(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed to fetch execution: ${error.message}`);
  if (!data) throw new Error('Execution not found');

  return data;
}

/**
 * Update execution status
 */
export async function updateExecutionStatus(
  id: string,
  userId: string,
  update: ExecutionStatusUpdate
) {
  if (!id) throw new Error('Execution ID is required');
  if (!userId) throw new Error('User ID is required');

  const { data: before } = await supabase
    .from('test_cycle_executions')
    .select('*')
    .eq('id', id)
    .single();

  const updateData: any = {
    status: update.status,
    notes: update.notes || null,
    updated_at: new Date().toISOString(),
  };

  // Set execution metadata if actually executed
  if (['passed', 'failed', 'blocked'].includes(update.status)) {
    updateData.executed_at = new Date().toISOString();
    updateData.executed_by = userId;
  }

  // Link defect if failed
  if (update.defect_id) {
    updateData.defect_id = update.defect_id;
  }

  const { data, error } = await supabase
    .from('test_cycle_executions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update execution: ${error.message}`);

  await logAuditEntry({
    entityType: 'test_executions',
    entityId: data.id,
    action: 'status_changed',
    beforeData: before,
    afterData: data,
  });

  return data;
}

/**
 * Upsert a step result
 */
export async function upsertStepResult(
  executionId: string,
  userId: string,
  input: StepResultInput
) {
  if (!executionId) throw new Error('Execution ID is required');
  if (!input.step_id) throw new Error('Step ID is required');

  // Check if result exists
  const { data: existing } = await supabase
    .from('test_step_results')
    .select('id')
    .eq('execution_id', executionId)
    .eq('step_id', input.step_id)
    .maybeSingle();

  const resultData = {
    execution_id: executionId,
    step_id: input.step_id,
    status: input.status,
    actual_result: input.actual_result || null,
    notes: input.notes || null,
    attachments: input.attachments || [],
    executed_at: input.status !== 'not_run' ? new Date().toISOString() : null,
    executed_by: input.status !== 'not_run' ? userId : null,
  };

  let data;
  let error;

  if (existing) {
    const result = await supabase
      .from('test_step_results')
      .update(resultData)
      .eq('id', existing.id)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    const result = await supabase
      .from('test_step_results')
      .insert(resultData)
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) throw new Error(`Failed to save step result: ${error.message}`);

  // Recalculate execution status based on all step results
  await recalculateExecutionStatus(executionId, userId);

  return data;
}

/**
 * Recalculate execution status based on step results
 */
async function recalculateExecutionStatus(executionId: string, userId: string) {
  const { data: results } = await supabase
    .from('test_step_results')
    .select('status')
    .eq('execution_id', executionId);

  if (!results?.length) return;

  const statuses = results.map(r => r.status);
  
  let newStatus: string;
  if (statuses.some(s => s === 'failed')) {
    newStatus = 'failed';
  } else if (statuses.some(s => s === 'blocked')) {
    newStatus = 'blocked';
  } else if (statuses.every(s => s === 'passed')) {
    newStatus = 'passed';
  } else if (statuses.some(s => s !== 'not_run')) {
    newStatus = 'in_progress';
  } else {
    newStatus = 'not_run';
  }

  await supabase
    .from('test_cycle_executions')
    .update({
      status: newStatus,
      executed_at: newStatus !== 'not_run' ? new Date().toISOString() : null,
      executed_by: newStatus !== 'not_run' ? userId : null,
    })
    .eq('id', executionId);
}

/**
 * Create a defect from a failed execution
 */
export async function createDefectFromFailure(
  executionId: string,
  userId: string,
  projectId: string,
  input: DefectFromFailureInput
) {
  if (!executionId) throw new Error('Execution ID is required');
  if (!projectId) throw new Error('Project ID is required');
  if (!input.title?.trim()) throw new Error('Title is required');

  // Get execution details for context
  const execution = await getExecutionById(executionId);
  
  // Generate defect ID
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('defects')
    .select('id', { count: 'exact', head: true });

  const defectId = `DEF-${year}-${((count || 0) + 1).toString().padStart(4, '0')}`;

  // Create defect
  const { data: defect, error: defectError } = await supabase
    .from('defects')
    .insert({
      defect_id: defectId,
      title: input.title.trim(),
      description: input.description || `Generated from test failure: ${execution.test_case?.title}`,
      severity: input.severity,
      priority: input.priority,
      workflow_status: 'open',
      expected_result: input.expected_result || execution.test_case?.expected_result || '',
      actual_result: input.actual_result || execution.notes || '',
      steps_to_reproduce: input.steps_to_reproduce ? JSON.parse(input.steps_to_reproduce) : null,
      project_id: projectId,
      reporter_id: userId,
    })
    .select()
    .single();

  if (defectError) throw new Error(`Failed to create defect: ${defectError.message}`);

  // Link defect to execution
  await supabase
    .from('test_cycle_executions')
    .update({ defect_id: defect.id })
    .eq('id', executionId);

  // Create work item link
  await supabase.from('defect_work_item_links').insert({
    defect_id: defect.id,
    linked_item_id: execution.case_id,
    linked_item_type: 'test_case',
    relationship_type: 'discovered_by',
    created_by: userId,
  });

  await logAuditEntry({
    entityType: 'defects',
    entityId: defect.id,
    action: 'created_from_test_failure',
    afterData: { defect, executionId },
  });

  return defect;
}

/**
 * Bulk update execution statuses
 */
export async function bulkUpdateExecutionStatus(
  ids: string[],
  userId: string,
  status: string
) {
  if (!ids.length) throw new Error('At least one execution ID is required');

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (['passed', 'failed', 'blocked'].includes(status)) {
    updateData.executed_at = new Date().toISOString();
    updateData.executed_by = userId;
  }

  const { error } = await supabase
    .from('test_cycle_executions')
    .update(updateData)
    .in('id', ids);

  if (error) throw new Error(`Failed to bulk update executions: ${error.message}`);

  return { success: true, count: ids.length };
}
