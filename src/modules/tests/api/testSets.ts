/**
 * Test Sets API
 * CRUD operations for test sets using centralized action pipeline
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

export interface TestSetFilters {
  search?: string;
  status?: string[];
}

export interface TestSetInput {
  name: string;
  description?: string;
  objective?: string;
  folder_id?: string;
}

export interface TestSetPatch extends Partial<TestSetInput> {
  id: string;
}

export interface CreateTestSetParams {
  input: TestSetInput;
  context: PipelineContext;
  queryClient?: QueryClient;
}

export interface UpdateTestSetParams {
  patch: TestSetPatch;
  context: PipelineContext;
  queryClient?: QueryClient;
}

export interface ArchiveTestSetParams {
  id: string;
  context: PipelineContext;
  queryClient?: QueryClient;
}

export interface AddCasesToSetParams {
  setId: string;
  caseIds: string[];
  context: PipelineContext;
  queryClient?: QueryClient;
}

export interface RemoveCasesFromSetParams {
  setId: string;
  caseIds: string[];
  context: PipelineContext;
  queryClient?: QueryClient;
}

// ═══════════════════════════════════════════════════════════════════
// READ OPERATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * List test sets with filters
 */
export async function listTestSets(
  scopeType: 'program' | 'project',
  scopeId: string,
  filters: TestSetFilters = {}
) {
  if (!scopeId) throw new PipelineError('validation_error', 'Scope ID is required');

  let query = supabase
    .from('test_sets')
    .select(`
      *,
      test_set_cases(case_id)
    `)
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

  const { data, error } = await query;

  if (error) throw new PipelineError('unknown', `Failed to fetch test sets: ${error.message}`);

  // Add case count to each set
  return (data || []).map(set => ({
    ...set,
    caseCount: (set.test_set_cases || []).length,
  }));
}

/**
 * Get a single test set by ID with cases
 */
export async function getTestSetById(id: string) {
  if (!id) throw new PipelineError('validation_error', 'Test set ID is required');

  const { data, error } = await supabase
    .from('test_sets')
    .select(`
      *,
      test_set_cases(
        id,
        case_id,
        sort_order,
        test_case:test_cases(id, title, priority, test_type, status)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw new PipelineError('unknown', `Failed to fetch test set: ${error.message}`);
  if (!data) throw new PipelineError('not_found', 'Test set not found');

  return data;
}

// ═══════════════════════════════════════════════════════════════════
// WRITE OPERATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new test set
 */
export async function createTestSet(params: CreateTestSetParams) {
  const { input, context, queryClient } = params;
  const entityType: TestEntityType = 'test_sets';

  // Validation
  validateRequired(input, ['name']);
  validateLength(input.name, 'Name', 1, 255);

  return runMutationWithAudit(input, {
    context,
    action: 'create',
    entityType,
    activityType: 'created',
    successMessage: 'Test set created',
    queryClient,
    invalidateKeys: [
      ['test-sets', context.scopeId],
    ],
    mutationFn: async (input) => {
      // Generate set key
      const { count } = await supabase
        .from('test_sets')
        .select('id', { count: 'exact', head: true })
        .eq(context.scopeType === 'project' ? 'project_id' : 'program_id', context.scopeId);

      const key = `SET-${((count || 0) + 1).toString().padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('test_sets')
        .insert({
          name: input.name.trim(),
          description: input.description || null,
          objective: input.objective || null,
          folder_id: input.folder_id || null,
          key,
          program_id: context.programId,
          project_id: context.projectId,
          created_by: context.userId,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw new PipelineError('unknown', `Failed to create test set: ${error.message}`);
      return data;
    },
    getAuditInfo: (input, result) => ({
      entityId: result.id,
      entityTitle: input.name,
      description: `Created test set "${input.name}"`,
    }),
  });
}

/**
 * Update a test set
 */
export async function updateTestSet(params: UpdateTestSetParams) {
  const { patch, context, queryClient } = params;
  const entityType: TestEntityType = 'test_sets';

  if (!patch.id) throw new PipelineError('validation_error', 'Test set ID is required');

  return runMutationWithAudit(patch, {
    context,
    action: 'edit',
    entityType,
    activityType: 'updated',
    successMessage: 'Test set updated',
    queryClient,
    invalidateKeys: [
      ['test-sets', context.scopeId],
      ['test-set', patch.id],
    ],
    mutationFn: async (patch) => {
      const { id, ...updateData } = patch;

      const { data, error } = await supabase
        .from('test_sets')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new PipelineError('unknown', `Failed to update test set: ${error.message}`);
      return data;
    },
    getAuditInfo: (input, result) => ({
      entityId: input.id,
      entityTitle: result.name,
      description: `Updated test set "${result.name}"`,
    }),
  });
}

/**
 * Archive a test set (soft delete via status)
 */
export async function archiveTestSet(params: ArchiveTestSetParams) {
  const { id, context, queryClient } = params;
  const entityType: TestEntityType = 'test_sets';

  return runMutationWithAudit({ id }, {
    context,
    action: 'delete',
    entityType,
    activityType: 'archived',
    successMessage: 'Test set archived',
    queryClient,
    invalidateKeys: [
      ['test-sets', context.scopeId],
    ],
    mutationFn: async ({ id }) => {
      const { data: before } = await supabase
        .from('test_sets')
        .select('name')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('test_sets')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new PipelineError('unknown', `Failed to archive test set: ${error.message}`);
      return { id, name: before?.name };
    },
    getAuditInfo: (input, result) => ({
      entityId: input.id,
      entityTitle: result.name,
      description: `Archived test set "${result.name}"`,
    }),
  });
}

/**
 * Add test cases to a set
 */
export async function addCasesToSet(params: AddCasesToSetParams) {
  const { setId, caseIds, context, queryClient } = params;
  const entityType: TestEntityType = 'test_sets';

  if (!caseIds.length) throw new PipelineError('validation_error', 'At least one case ID is required');

  return runMutationWithAudit({ setId, caseIds }, {
    context,
    action: 'link',
    entityType,
    activityType: 'cases_added',
    successMessage: `${caseIds.length} case(s) added to set`,
    queryClient,
    invalidateKeys: [
      ['test-sets', context.scopeId],
      ['test-set', setId],
    ],
    mutationFn: async ({ setId, caseIds }) => {
      // Get current max sort order
      const { data: existing } = await supabase
        .from('test_set_cases')
        .select('sort_order')
        .eq('set_id', setId)
        .order('sort_order', { ascending: false })
        .limit(1);

      let sortOrder = (existing?.[0]?.sort_order || 0) + 1;

      const inserts = caseIds.map(caseId => ({
        set_id: setId,
        case_id: caseId,
        sort_order: sortOrder++,
        added_by: context.userId,
      }));

      const { error } = await supabase
        .from('test_set_cases')
        .insert(inserts);

      if (error) throw new PipelineError('unknown', `Failed to add cases to set: ${error.message}`);
      return { setId, count: caseIds.length };
    },
    getAuditInfo: (input) => ({
      entityId: input.setId,
      description: `Added ${input.caseIds.length} case(s) to set`,
      metadata: { caseIds: input.caseIds },
    }),
  });
}

/**
 * Remove test cases from a set
 */
export async function removeCasesFromSet(params: RemoveCasesFromSetParams) {
  const { setId, caseIds, context, queryClient } = params;
  const entityType: TestEntityType = 'test_sets';

  if (!caseIds.length) throw new PipelineError('validation_error', 'At least one case ID is required');

  return runMutationWithAudit({ setId, caseIds }, {
    context,
    action: 'link',
    entityType,
    activityType: 'cases_removed',
    successMessage: `${caseIds.length} case(s) removed from set`,
    queryClient,
    invalidateKeys: [
      ['test-sets', context.scopeId],
      ['test-set', setId],
    ],
    mutationFn: async ({ setId, caseIds }) => {
      const { error } = await supabase
        .from('test_set_cases')
        .delete()
        .eq('set_id', setId)
        .in('case_id', caseIds);

      if (error) throw new PipelineError('unknown', `Failed to remove cases from set: ${error.message}`);
      return { setId, count: caseIds.length };
    },
    getAuditInfo: (input) => ({
      entityId: input.setId,
      description: `Removed ${input.caseIds.length} case(s) from set`,
      metadata: { caseIds: input.caseIds },
    }),
  });
}

/**
 * Reorder cases within a set
 */
export async function reorderSetCases(
  setId: string,
  orderedCaseIds: string[]
) {
  if (!setId) throw new PipelineError('validation_error', 'Set ID is required');

  // Update each case's sort_order
  const updates = orderedCaseIds.map((caseId, index) => 
    supabase
      .from('test_set_cases')
      .update({ sort_order: index + 1 })
      .eq('set_id', setId)
      .eq('case_id', caseId)
  );

  await Promise.all(updates);

  return { success: true };
}
