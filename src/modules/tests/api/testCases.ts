/**
 * Test Cases API
 * CRUD operations for test cases with proper error handling
 */

import { supabase } from '@/integrations/supabase/client';
import { logAuditEntry } from '@/lib/auditLogger';

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

// ═══════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * List test cases with filters, pagination, and sorting
 */
export async function listTestCases(
  projectId: string,
  filters: TestCaseFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 50 },
  sort: SortParams = { field: 'created_at', direction: 'desc' }
) {
  if (!projectId) throw new Error('Project ID is required');

  let query = supabase
    .from('test_cases')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .is('deleted_at', null);

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

  // Apply sorting
  query = query.order(sort.field, { ascending: sort.direction === 'asc' });

  // Apply pagination
  const from = (pagination.page - 1) * pagination.pageSize;
  const to = from + pagination.pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch test cases: ${error.message}`);

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
  if (!id) throw new Error('Test case ID is required');

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

  if (error) throw new Error(`Failed to fetch test case: ${error.message}`);
  if (!data) throw new Error('Test case not found');

  return data;
}

/**
 * Create a new test case
 */
export async function createTestCase(
  projectId: string,
  userId: string,
  input: TestCaseInput
) {
  if (!projectId) throw new Error('Project ID is required');
  if (!userId) throw new Error('User ID is required');
  if (!input.title?.trim()) throw new Error('Title is required');

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
      created_by: userId,
    } as any)
    .select()
    .single();

  if (error) throw new Error(`Failed to create test case: ${error.message}`);

  await logAuditEntry({
    entityType: 'test_cases',
    entityId: data.id,
    action: 'created',
    afterData: data,
  });

  return data;
}

/**
 * Update an existing test case
 */
export async function updateTestCase(
  userId: string,
  patch: TestCasePatch
) {
  if (!patch.id) throw new Error('Test case ID is required');
  if (!userId) throw new Error('User ID is required');

  // Get current state for audit
  const { data: before } = await supabase
    .from('test_cases')
    .select('*')
    .eq('id', patch.id)
    .single();

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

  if (error) throw new Error(`Failed to update test case: ${error.message}`);

  await logAuditEntry({
    entityType: 'test_cases',
    entityId: data.id,
    action: 'updated',
    beforeData: before,
    afterData: data,
  });

  return data;
}

/**
 * Soft delete (archive) a test case
 */
export async function archiveTestCase(id: string, userId: string) {
  if (!id) throw new Error('Test case ID is required');
  if (!userId) throw new Error('User ID is required');

  const { data: before } = await supabase
    .from('test_cases')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('test_cases')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    })
    .eq('id', id);

  if (error) throw new Error(`Failed to archive test case: ${error.message}`);

  await logAuditEntry({
    entityType: 'test_cases',
    entityId: id,
    action: 'deleted',
    beforeData: before,
  });

  return { success: true };
}

/**
 * Get unique components for filter dropdown
 */
export async function getTestCaseComponents(projectId: string) {
  const { data, error } = await supabase
    .from('test_cases')
    .select('component')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .not('component', 'is', null);

  if (error) throw new Error(`Failed to fetch components: ${error.message}`);

  const components = [...new Set(data?.map(d => d.component).filter(Boolean))];
  return components.sort();
}
