/**
 * Test Executions API
 * CRUD operations for test executions
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
    query = query.in('status', filters.status as any);
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
      test_cycle:test_cycles(id, name, key, environment, build_version)
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
    comments: update.notes || null,
    updated_at: new Date().toISOString(),
  };

  // Set execution metadata if actually executed
  if (['passed', 'failed', 'blocked'].includes(update.status)) {
    updateData.executed_at = new Date().toISOString();
    updateData.executed_by = userId;
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
      description: input.description || `Generated from test failure: ${(execution.test_case as any)?.title}`,
      severity: input.severity,
      priority: input.priority,
      workflow_status: 'open',
      expected_result: input.expected_result || '',
      actual_result: input.actual_result || execution.comments || '',
      steps_to_reproduce: input.steps_to_reproduce ? JSON.parse(input.steps_to_reproduce) : null,
      project_id: projectId,
      reporter_id: userId,
    })
    .select()
    .single();

  if (defectError) throw new Error(`Failed to create defect: ${defectError.message}`);

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
    action: 'created',
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

/**
 * Assign execution to a user
 */
export async function assignExecution(
  id: string,
  assigneeId: string
) {
  if (!id) throw new Error('Execution ID is required');

  const { data, error } = await supabase
    .from('test_cycle_executions')
    .update({
      assigned_to: assigneeId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to assign execution: ${error.message}`);

  return data;
}

/**
 * Get execution statistics for a cycle
 */
export async function getCycleExecutionStats(cycleId: string) {
  const { data, error } = await supabase
    .from('test_cycle_executions')
    .select('status')
    .eq('cycle_id', cycleId);

  if (error) throw new Error(`Failed to get cycle stats: ${error.message}`);

  const stats = {
    total: data?.length || 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    notRun: 0,
    inProgress: 0,
  };

  data?.forEach((exec: any) => {
    switch (exec.status) {
      case 'passed': stats.passed++; break;
      case 'failed': stats.failed++; break;
      case 'blocked': stats.blocked++; break;
      case 'in_progress': stats.inProgress++; break;
      default: stats.notRun++; break;
    }
  });

  return stats;
}
