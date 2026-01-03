/**
 * Test Cycles API
 * CRUD operations for test cycles using centralized action pipeline
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  runMutationWithAudit,
  validateRequired,
  validateLength,
  PipelineError,
  type PipelineContext,
  type TestEntityType,
} from '../lib/actionPipeline';
import { QueryClient } from '@tanstack/react-query';

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
  status?: string;
}

export interface CreateTestCycleParams {
  input: TestCycleInput;
  context: PipelineContext;
  queryClient?: QueryClient;
}

export interface UpdateTestCycleParams {
  patch: TestCyclePatch;
  context: PipelineContext;
  queryClient?: QueryClient;
}

export interface ArchiveTestCycleParams {
  id: string;
  reason?: string;
  context: PipelineContext;
  queryClient?: QueryClient;
}

// ═══════════════════════════════════════════════════════════════════
// READ OPERATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * List test cycles with filters
 */
export async function listTestCycles(
  scopeType: 'program' | 'project',
  scopeId: string,
  filters: TestCycleFilters = {}
) {
  if (!scopeId) throw new PipelineError('validation_error', 'Scope ID is required');

  let query = supabase
    .from('test_cycles')
    .select(`
      *,
      test_cycle_executions(id, status)
    `)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  // Apply scope filter
  if (scopeType === 'project') {
    query = query.eq('project_id', scopeId);
  } else {
    query = query.eq('program_id', scopeId);
  }

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

  if (error) throw new PipelineError('unknown', `Failed to fetch test cycles: ${error.message}`);

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
  if (!id) throw new PipelineError('validation_error', 'Test cycle ID is required');

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

  if (error) throw new PipelineError('unknown', `Failed to fetch test cycle: ${error.message}`);
  if (!data) throw new PipelineError('not_found', 'Test cycle not found');

  return data;
}

/**
 * Get available environments for filter dropdown
 */
export async function getTestCycleEnvironments(scopeType: 'program' | 'project', scopeId: string) {
  let query = supabase
    .from('test_cycles')
    .select('environment')
    .eq('archived', false)
    .not('environment', 'is', null);

  if (scopeType === 'project') {
    query = query.eq('project_id', scopeId);
  } else {
    query = query.eq('program_id', scopeId);
  }

  const { data, error } = await query;

  if (error) throw new PipelineError('unknown', `Failed to fetch environments: ${error.message}`);

  const environments = [...new Set(data?.map(d => d.environment).filter(Boolean))];
  return environments.sort();
}

// ═══════════════════════════════════════════════════════════════════
// WRITE OPERATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new test cycle
 */
export async function createTestCycle(params: CreateTestCycleParams) {
  const { input, context, queryClient } = params;
  const entityType: TestEntityType = 'test_cycles';

  // Validation
  validateRequired(input, ['name']);
  validateLength(input.name, 'Name', 1, 255);

  return runMutationWithAudit(input, {
    context,
    action: 'create',
    entityType,
    activityType: 'created',
    successMessage: 'Test cycle created',
    queryClient,
    invalidateKeys: [
      ['test-cycles', context.scopeId],
      ['test-metrics', context.scopeId],
    ],
    mutationFn: async (input) => {
      // Generate cycle key
      const { count } = await supabase
        .from('test_cycles')
        .select('id', { count: 'exact', head: true })
        .eq(context.scopeType === 'project' ? 'project_id' : 'program_id', context.scopeId);

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
          program_id: context.programId,
          project_id: context.projectId,
          status: 'planned',
          created_by: context.userId,
        })
        .select()
        .single();

      if (error) throw new PipelineError('unknown', `Failed to create test cycle: ${error.message}`);
      return data;
    },
    getAuditInfo: (input, result) => ({
      entityId: result.id,
      entityTitle: input.name,
      description: `Created test cycle "${input.name}"`,
    }),
  });
}

/**
 * Update a test cycle
 */
export async function updateTestCycle(params: UpdateTestCycleParams) {
  const { patch, context, queryClient } = params;
  const entityType: TestEntityType = 'test_cycles';

  if (!patch.id) throw new PipelineError('validation_error', 'Test cycle ID is required');

  // Check if this is a status change
  const activityType = patch.status ? 'status_changed' : 'updated';

  return runMutationWithAudit(patch, {
    context,
    action: 'edit',
    entityType,
    activityType,
    successMessage: 'Test cycle updated',
    queryClient,
    invalidateKeys: [
      ['test-cycles', context.scopeId],
      ['test-cycle', patch.id],
    ],
    mutationFn: async (patch) => {
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

      if (error) throw new PipelineError('unknown', `Failed to update test cycle: ${error.message}`);
      return data;
    },
    getAuditInfo: (input, result) => ({
      entityId: input.id,
      entityTitle: result.name,
      description: input.status 
        ? `Changed status to "${input.status}"` 
        : `Updated test cycle "${result.name}"`,
      metadata: input.status ? { newStatus: input.status } : undefined,
    }),
  });
}

/**
 * Archive a test cycle
 */
export async function archiveTestCycle(params: ArchiveTestCycleParams) {
  const { id, reason, context, queryClient } = params;
  const entityType: TestEntityType = 'test_cycles';

  return runMutationWithAudit({ id, reason }, {
    context,
    action: 'delete',
    entityType,
    activityType: 'archived',
    successMessage: 'Test cycle archived',
    queryClient,
    invalidateKeys: [
      ['test-cycles', context.scopeId],
      ['test-metrics', context.scopeId],
    ],
    mutationFn: async ({ id, reason }) => {
      const { data: before } = await supabase
        .from('test_cycles')
        .select('name')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('test_cycles')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: context.userId,
          archive_reason: reason || null,
        })
        .eq('id', id);

      if (error) throw new PipelineError('unknown', `Failed to archive test cycle: ${error.message}`);
      return { id, name: before?.name };
    },
    getAuditInfo: (input, result) => ({
      entityId: input.id,
      entityTitle: result.name,
      description: `Archived test cycle "${result.name}"${input.reason ? `: ${input.reason}` : ''}`,
      metadata: input.reason ? { reason: input.reason } : undefined,
    }),
  });
}
