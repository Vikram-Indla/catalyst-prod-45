/**
 * Test Cases API
 * CRUD operations for test cases using centralized action pipeline
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  runMutationWithAudit,
  assertPermission,
  createPipelineContext,
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

export interface TestCaseFilters {
  search?: string;
  priority?: string[];
  status?: string[];
  testType?: string[];
  component?: string;
  linkedWorkItemId?: string;
  folderId?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TestCaseInput {
  title: string;
  description?: string;
  preconditions?: string;
  test_type?: string;
  priority?: string;
  status?: string;
  linked_work_item_id?: string;
  linked_work_item_type?: string;
  component?: string;
  objective?: string;
  expected_result?: string;
  folder_id?: string;
  labels?: string[];
}

export interface TestCasePatch extends Partial<TestCaseInput> {
  id: string;
}

export interface CreateTestCaseParams {
  projectId: string;
  input: TestCaseInput;
  context: PipelineContext;
  queryClient?: QueryClient;
}

export interface UpdateTestCaseParams {
  patch: TestCasePatch;
  context: PipelineContext;
  queryClient?: QueryClient;
}

export interface ArchiveTestCaseParams {
  id: string;
  context: PipelineContext;
  queryClient?: QueryClient;
}

// ═══════════════════════════════════════════════════════════════════
// READ OPERATIONS (No mutation pipeline needed)
// ═══════════════════════════════════════════════════════════════════

/**
 * List test cases with filters, pagination, and sorting
 */
export async function listTestCases(
  scopeType: 'program' | 'project',
  scopeId: string,
  filters: TestCaseFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 50 },
  sort: SortParams = { field: 'created_at', direction: 'desc' }
) {
  if (!scopeId) throw new PipelineError('validation_error', 'Scope ID is required');

  let query = supabase
    .from('test_cases')
    .select('*', { count: 'exact' })
    .is('deleted_at', null);

  // Apply scope filter
  if (scopeType === 'project') {
    query = query.eq('project_id', scopeId);
  } else {
    query = query.eq('program_id', scopeId);
  }

  // Apply filters
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }
  if (filters.priority?.length) {
    query = query.in('priority', filters.priority as any);
  }
  if (filters.status?.length) {
    query = query.in('status', filters.status as any);
  }
  if (filters.testType?.length) {
    query = query.in('test_type', filters.testType as any);
  }
  if (filters.component) {
    query = query.eq('component', filters.component);
  }
  if (filters.linkedWorkItemId) {
    query = query.eq('linked_work_item_id', filters.linkedWorkItemId);
  }
  if (filters.folderId) {
    query = query.eq('folder_id', filters.folderId);
  }

  // Apply sorting
  query = query.order(sort.field, { ascending: sort.direction === 'asc' });

  // Apply pagination
  const from = (pagination.page - 1) * pagination.pageSize;
  const to = from + pagination.pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw new PipelineError('unknown', `Failed to fetch test cases: ${error.message}`);

  return {
    data: data || [],
    total: count || 0,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil((count || 0) / pagination.pageSize),
  };
}

/**
 * Get a single test case by ID with related data
 */
export async function getTestCaseById(id: string) {
  if (!id) throw new PipelineError('validation_error', 'Test case ID is required');

  const { data, error } = await supabase
    .from('test_cases')
    .select(`
      *,
      test_steps(*),
      test_case_work_items(
        work_item_id,
        work_item_type,
        link_type
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) throw new PipelineError('unknown', `Failed to fetch test case: ${error.message}`);
  if (!data) throw new PipelineError('not_found', 'Test case not found');

  return data;
}

/**
 * Get unique components for filter dropdown
 */
export async function getTestCaseComponents(scopeType: 'program' | 'project', scopeId: string) {
  let query = supabase
    .from('test_cases')
    .select('component')
    .is('deleted_at', null)
    .not('component', 'is', null);

  if (scopeType === 'project') {
    query = query.eq('project_id', scopeId);
  } else {
    query = query.eq('program_id', scopeId);
  }

  const { data, error } = await query;

  if (error) throw new PipelineError('unknown', `Failed to fetch components: ${error.message}`);

  const components = [...new Set(data?.map(d => d.component).filter(Boolean))];
  return components.sort();
}

// ═══════════════════════════════════════════════════════════════════
// WRITE OPERATIONS (Using mutation pipeline)
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new test case
 * Uses full pipeline: permission → mutation → audit → invalidation → toast
 */
export async function createTestCase(params: CreateTestCaseParams) {
  const { projectId, input, context, queryClient } = params;
  const entityType: TestEntityType = 'test_cases';

  // Validation
  validateRequired(input, ['title']);
  validateLength(input.title, 'Title', 1, 500);

  return runMutationWithAudit(input, {
    context,
    action: 'create',
    entityType,
    activityType: 'created',
    successMessage: 'Test case created',
    queryClient,
    invalidateKeys: [
      ['test-cases', context.scopeId],
      ['test-metrics', context.scopeId],
    ],
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from('test_cases')
        .insert({
          title: input.title.trim(),
          description: input.description || null,
          preconditions: input.preconditions || null,
          test_type: (input.test_type || 'manual') as any,
          priority: (input.priority || 'medium') as any,
          status: (input.status || 'draft') as any,
          linked_work_item_id: input.linked_work_item_id || null,
          linked_work_item_type: input.linked_work_item_type || null,
          component: input.component || null,
          objective: input.objective || null,
          folder_id: input.folder_id || null,
          labels: input.labels || [],
          project_id: projectId,
          program_id: context.programId,
          created_by: context.userId,
        } as any)
        .select()
        .single();

      if (error) throw new PipelineError('unknown', `Failed to create test case: ${error.message}`);
      return data;
    },
    getAuditInfo: (input, result) => ({
      entityId: result.id,
      entityTitle: input.title,
      description: `Created test case "${input.title}"`,
    }),
  });
}

/**
 * Update an existing test case
 */
export async function updateTestCase(params: UpdateTestCaseParams) {
  const { patch, context, queryClient } = params;
  const entityType: TestEntityType = 'test_cases';

  if (!patch.id) throw new PipelineError('validation_error', 'Test case ID is required');

  return runMutationWithAudit(patch, {
    context,
    action: 'edit',
    entityType,
    activityType: 'updated',
    successMessage: 'Test case updated',
    queryClient,
    invalidateKeys: [
      ['test-cases', context.scopeId],
      ['test-case', patch.id],
    ],
    mutationFn: async (patch) => {
      const { id, ...updateData } = patch;

      const { data, error } = await supabase
        .from('test_cases')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw new PipelineError('unknown', `Failed to update test case: ${error.message}`);
      return data;
    },
    getAuditInfo: (input, result) => ({
      entityId: input.id,
      entityTitle: result.title,
      description: `Updated test case "${result.title}"`,
    }),
  });
}

/**
 * Soft delete (archive) a test case
 */
export async function archiveTestCase(params: ArchiveTestCaseParams) {
  const { id, context, queryClient } = params;
  const entityType: TestEntityType = 'test_cases';

  return runMutationWithAudit({ id }, {
    context,
    action: 'delete',
    entityType,
    activityType: 'archived',
    successMessage: 'Test case archived',
    queryClient,
    invalidateKeys: [
      ['test-cases', context.scopeId],
      ['test-metrics', context.scopeId],
    ],
    mutationFn: async ({ id }) => {
      // Get title for audit before archiving
      const { data: before } = await supabase
        .from('test_cases')
        .select('title')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('test_cases')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: context.userId,
        })
        .eq('id', id);

      if (error) throw new PipelineError('unknown', `Failed to archive test case: ${error.message}`);
      return { id, title: before?.title };
    },
    getAuditInfo: (input, result) => ({
      entityId: input.id,
      entityTitle: result.title,
      description: `Archived test case "${result.title}"`,
    }),
  });
}
