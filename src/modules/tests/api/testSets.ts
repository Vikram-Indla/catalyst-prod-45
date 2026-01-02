/**
 * Test Sets API
 * CRUD operations for test sets with proper error handling
 */

import { supabase } from '@/integrations/supabase/client';
import { logAuditEntry } from '@/lib/auditLogger';

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
  program_id: string;
}

export interface TestSetPatch extends Partial<Omit<TestSetInput, 'program_id'>> {
  id: string;
}

// ═══════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * List test sets with filters
 */
export async function listTestSets(
  projectId: string,
  filters: TestSetFilters = {}
) {
  if (!projectId) throw new Error('Project ID is required');

  let query = supabase
    .from('test_sets')
    .select(`
      *,
      test_set_cases(case_id)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }
  if (filters.status?.length) {
    query = query.in('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch test sets: ${error.message}`);

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
  if (!id) throw new Error('Test set ID is required');

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

  if (error) throw new Error(`Failed to fetch test set: ${error.message}`);
  if (!data) throw new Error('Test set not found');

  return data;
}

/**
 * Create a new test set
 */
export async function createTestSet(
  projectId: string,
  programId: string,
  userId: string,
  input: TestSetInput
) {
  if (!projectId) throw new Error('Project ID is required');
  if (!programId) throw new Error('Program ID is required');
  if (!userId) throw new Error('User ID is required');
  if (!input.name?.trim()) throw new Error('Name is required');

  // Generate set key
  const { count } = await supabase
    .from('test_sets')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const key = `SET-${((count || 0) + 1).toString().padStart(3, '0')}`;

  const { data, error } = await supabase
    .from('test_sets')
    .insert({
      name: input.name.trim(),
      description: input.description || null,
      objective: input.objective || null,
      folder_id: input.folder_id || null,
      key,
      program_id: programId,
      project_id: projectId,
      created_by: userId,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create test set: ${error.message}`);

  await logAuditEntry({
    entityType: 'test_sets',
    entityId: data.id,
    action: 'created',
    afterData: data,
  });

  return data;
}

/**
 * Update a test set
 */
export async function updateTestSet(
  userId: string,
  patch: TestSetPatch
) {
  if (!patch.id) throw new Error('Test set ID is required');

  const { data: before } = await supabase
    .from('test_sets')
    .select('*')
    .eq('id', patch.id)
    .single();

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

  if (error) throw new Error(`Failed to update test set: ${error.message}`);

  await logAuditEntry({
    entityType: 'test_sets',
    entityId: data.id,
    action: 'updated',
    beforeData: before,
    afterData: data,
  });

  return data;
}

/**
 * Archive a test set (soft delete via status)
 */
export async function archiveTestSet(id: string, userId: string) {
  if (!id) throw new Error('Test set ID is required');

  const { data: before } = await supabase
    .from('test_sets')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('test_sets')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`Failed to archive test set: ${error.message}`);

  await logAuditEntry({
    entityType: 'test_sets',
    entityId: id,
    action: 'deleted',
    beforeData: before,
  });

  return { success: true };
}

/**
 * Add test cases to a set
 */
export async function addCasesToSet(
  setId: string,
  caseIds: string[],
  userId: string
) {
  if (!setId) throw new Error('Set ID is required');
  if (!caseIds.length) throw new Error('At least one case ID is required');

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
    added_by: userId,
  }));

  const { error } = await supabase
    .from('test_set_cases')
    .insert(inserts);

  if (error) throw new Error(`Failed to add cases to set: ${error.message}`);

  return { success: true, count: caseIds.length };
}

/**
 * Remove test cases from a set
 */
export async function removeCasesFromSet(
  setId: string,
  caseIds: string[]
) {
  if (!setId) throw new Error('Set ID is required');
  if (!caseIds.length) throw new Error('At least one case ID is required');

  const { error } = await supabase
    .from('test_set_cases')
    .delete()
    .eq('set_id', setId)
    .in('case_id', caseIds);

  if (error) throw new Error(`Failed to remove cases from set: ${error.message}`);

  return { success: true, count: caseIds.length };
}

/**
 * Reorder cases within a set
 */
export async function reorderSetCases(
  setId: string,
  orderedCaseIds: string[]
) {
  if (!setId) throw new Error('Set ID is required');

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
