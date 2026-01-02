/**
 * Cycle Execution API
 * Full execution workflow including step-level tracking, effort, reset, and defect linking
 */

import { supabase } from '@/integrations/supabase/client';
import { logAuditEntry } from '@/lib/auditLogger';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface StepResult {
  step_order: number;
  step_description: string;
  expected_result: string | null;
  actual_result: string | null;
  status: 'not_run' | 'passed' | 'failed' | 'blocked' | 'skipped';
  comments: string | null;
  executed_at: string | null;
}

export interface ExecutionWithSteps {
  id: string;
  cycle_id: string;
  case_id: string;
  status: string;
  assigned_to: string | null;
  executed_by: string | null;
  executed_at: string | null;
  comments: string | null;
  effort_minutes: number | null;
  timer_start_at: string | null;
  timer_accumulated_seconds: number | null;
  timer_paused_at: string | null;
  test_case: {
    id: string;
    title: string;
    description: string | null;
    preconditions: string | null;
    priority: string;
    test_type: string;
    component: string | null;
  };
  step_results: StepResult[];
  defect_links: { defect_work_item_id: string }[];
}

export interface StepStatusUpdate {
  step_order: number;
  status: 'not_run' | 'passed' | 'failed' | 'blocked' | 'skipped';
  actual_result?: string;
  comments?: string;
}

export interface EffortUpdate {
  effort_minutes?: number;
  timer_start_at?: string | null;
  timer_accumulated_seconds?: number;
  timer_paused_at?: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all executions for a cycle with full step details
 */
export async function getCycleExecutions(cycleId: string): Promise<ExecutionWithSteps[]> {
  if (!cycleId) throw new Error('Cycle ID is required');

  // Get executions with test case info
  const { data: executions, error: execError } = await supabase
    .from('test_cycle_executions')
    .select(`
      *,
      test_case:test_cases(
        id, title, description, preconditions, priority, test_type, component
      ),
      test_execution_defects(defect_work_item_id)
    `)
    .eq('cycle_id', cycleId)
    .order('created_at', { ascending: true });

  if (execError) throw new Error(`Failed to fetch executions: ${execError.message}`);

  // Get step results for all executions
  const executionIds = (executions || []).map((e: any) => e.id);
  
  if (executionIds.length === 0) return [];

  const { data: stepResults, error: stepsError } = await supabase
    .from('test_execution_step_results')
    .select('*')
    .in('execution_id', executionIds)
    .order('step_order', { ascending: true });

  if (stepsError) throw new Error(`Failed to fetch step results: ${stepsError.message}`);

  // Group step results by execution ID
  const stepsByExecution = new Map<string, StepResult[]>();
  (stepResults || []).forEach((step: any) => {
    if (!stepsByExecution.has(step.execution_id)) {
      stepsByExecution.set(step.execution_id, []);
    }
    stepsByExecution.get(step.execution_id)!.push({
      step_order: step.step_order,
      step_description: step.step_description,
      expected_result: step.expected_result,
      actual_result: step.actual_result,
      status: step.status,
      comments: step.comments,
      executed_at: step.executed_at,
    });
  });

  return (executions || []).map((exec: any) => ({
    ...exec,
    step_results: stepsByExecution.get(exec.id) || [],
    defect_links: exec.test_execution_defects || [],
  }));
}

/**
 * Update a step's status and actual result
 */
export async function updateStepResult(
  executionId: string,
  userId: string,
  update: StepStatusUpdate
) {
  if (!executionId) throw new Error('Execution ID is required');

  const { data, error } = await supabase
    .from('test_execution_step_results')
    .update({
      status: update.status,
      actual_result: update.actual_result || null,
      comments: update.comments || null,
      executed_at: new Date().toISOString(),
    })
    .eq('execution_id', executionId)
    .eq('step_order', update.step_order)
    .select()
    .single();

  if (error) throw new Error(`Failed to update step: ${error.message}`);

  // Auto-derive execution status from step results
  await deriveExecutionStatus(executionId, userId);

  return data;
}

/**
 * Derive overall execution status from step results
 */
async function deriveExecutionStatus(executionId: string, userId: string) {
  const { data: steps } = await supabase
    .from('test_execution_step_results')
    .select('status')
    .eq('execution_id', executionId);

  if (!steps?.length) return;

  const statuses = steps.map((s: any) => s.status);
  
  let derivedStatus = 'not_run';
  if (statuses.some(s => s === 'failed')) {
    derivedStatus = 'failed';
  } else if (statuses.some(s => s === 'blocked')) {
    derivedStatus = 'blocked';
  } else if (statuses.every(s => s === 'passed')) {
    derivedStatus = 'passed';
  } else if (statuses.some(s => s === 'passed' || s === 'failed' || s === 'blocked' || s === 'skipped')) {
    derivedStatus = 'in_progress';
  }

  await supabase
    .from('test_cycle_executions')
    .update({
      status: derivedStatus,
      executed_at: derivedStatus !== 'not_run' ? new Date().toISOString() : null,
      executed_by: derivedStatus !== 'not_run' ? userId : null,
    })
    .eq('id', executionId);
}

/**
 * Update execution effort (manual entry or timer)
 */
export async function updateExecutionEffort(
  executionId: string,
  effort: EffortUpdate
) {
  if (!executionId) throw new Error('Execution ID is required');

  const updateData: any = {};
  
  if (effort.effort_minutes !== undefined) {
    updateData.effort_minutes = effort.effort_minutes;
  }
  if (effort.timer_start_at !== undefined) {
    updateData.timer_start_at = effort.timer_start_at;
  }
  if (effort.timer_accumulated_seconds !== undefined) {
    updateData.timer_accumulated_seconds = effort.timer_accumulated_seconds;
  }
  if (effort.timer_paused_at !== undefined) {
    updateData.timer_paused_at = effort.timer_paused_at;
  }

  const { data, error } = await supabase
    .from('test_cycle_executions')
    .update(updateData)
    .eq('id', executionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update effort: ${error.message}`);

  return data;
}

/**
 * Start execution timer
 */
export async function startExecutionTimer(executionId: string) {
  return updateExecutionEffort(executionId, {
    timer_start_at: new Date().toISOString(),
    timer_paused_at: null,
  });
}

/**
 * Pause execution timer
 */
export async function pauseExecutionTimer(executionId: string) {
  // Get current timer state
  const { data: exec } = await supabase
    .from('test_cycle_executions')
    .select('timer_start_at, timer_accumulated_seconds')
    .eq('id', executionId)
    .single();

  if (!exec?.timer_start_at) return;

  const elapsed = Math.floor((Date.now() - new Date(exec.timer_start_at).getTime()) / 1000);
  const accumulated = (exec.timer_accumulated_seconds || 0) + elapsed;

  return updateExecutionEffort(executionId, {
    timer_start_at: null,
    timer_accumulated_seconds: accumulated,
    timer_paused_at: new Date().toISOString(),
  });
}

/**
 * Reset an execution (clear all step results and status)
 */
export async function resetExecution(executionId: string, userId: string) {
  if (!executionId) throw new Error('Execution ID is required');

  // Reset step results
  await supabase
    .from('test_execution_step_results')
    .update({
      status: 'not_run',
      actual_result: null,
      comments: null,
      executed_at: null,
    })
    .eq('execution_id', executionId);

  // Reset execution
  const { data, error } = await supabase
    .from('test_cycle_executions')
    .update({
      status: 'not_run',
      executed_at: null,
      executed_by: null,
      comments: null,
      effort_minutes: null,
      timer_start_at: null,
      timer_accumulated_seconds: null,
      timer_paused_at: null,
    })
    .eq('id', executionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to reset execution: ${error.message}`);

  await logAuditEntry({
    entityType: 'test_executions',
    entityId: executionId,
    action: 'updated',
    afterData: { action: 'reset', by: userId },
  });

  return data;
}

/**
 * Link a defect to an execution
 */
export async function linkDefectToExecution(
  executionId: string,
  defectId: string,
  userId: string
) {
  if (!executionId || !defectId) throw new Error('Execution ID and Defect ID are required');

  const { data, error } = await supabase
    .from('test_execution_defects')
    .insert({
      execution_id: executionId,
      defect_work_item_id: defectId,
      linked_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to link defect: ${error.message}`);

  return data;
}

/**
 * Unlink a defect from an execution
 */
export async function unlinkDefectFromExecution(
  executionId: string,
  defectId: string
) {
  const { error } = await supabase
    .from('test_execution_defects')
    .delete()
    .eq('execution_id', executionId)
    .eq('defect_work_item_id', defectId);

  if (error) throw new Error(`Failed to unlink defect: ${error.message}`);

  return { success: true };
}

/**
 * Add a comment to an execution
 */
export async function addExecutionComment(
  executionId: string,
  comment: string
) {
  if (!executionId) throw new Error('Execution ID is required');

  const { data, error } = await supabase
    .from('test_cycle_executions')
    .update({ comments: comment })
    .eq('id', executionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to add comment: ${error.message}`);

  return data;
}

/**
 * Generate executions for a cycle from test cases
 */
export async function generateCycleExecutions(
  cycleId: string,
  caseIds: string[],
  userId: string
) {
  if (!cycleId) throw new Error('Cycle ID is required');
  if (!caseIds.length) throw new Error('At least one case ID is required');

  // Create execution records
  const executions = caseIds.map(caseId => ({
    cycle_id: cycleId,
    case_id: caseId,
    status: 'not_run',
  }));

  const { data: insertedExecs, error: execError } = await supabase
    .from('test_cycle_executions')
    .insert(executions)
    .select();

  if (execError) throw new Error(`Failed to create executions: ${execError.message}`);

  // Get test steps for each case
  const { data: testSteps } = await supabase
    .from('test_steps')
    .select('*')
    .in('test_case_id', caseIds)
    .order('step_order', { ascending: true });

  if (!testSteps?.length) return insertedExecs;

  // Create step results for each execution
  const stepResults: any[] = [];
  (insertedExecs || []).forEach((exec: any) => {
    const caseSteps = testSteps.filter((s: any) => s.test_case_id === exec.case_id);
    caseSteps.forEach((step: any) => {
      stepResults.push({
        execution_id: exec.id,
        step_order: step.step_order,
        step_description: step.action,
        expected_result: step.expected_result,
        status: 'not_run',
      });
    });
  });

  if (stepResults.length > 0) {
    await supabase.from('test_execution_step_results').insert(stepResults);
  }

  return insertedExecs;
}
