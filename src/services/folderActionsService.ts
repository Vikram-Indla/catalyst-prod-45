/**
 * CATALYST TESTS - Folder Actions Service
 * Phase 2B: Entity-Specific Folder Actions
 * 
 * API service layer for folder bulk operations.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  CreateSetFromFolderRequest,
  AddFolderToSetRequest,
  CreateCycleFromFolderRequest,
  AddFolderToCycleRequest,
  FolderCaseSummary,
} from '@/types/folderActions.types';

/**
 * Get summary of cases in folder (eligible counts, consistent values)
 */
export async function getFolderCaseSummary(
  folderId: string,
  programId: string
): Promise<FolderCaseSummary> {
  // Get all cases in folder and subfolders
  const { data: cases, error } = await supabase
    .from('test_cases')
    .select('id, status, priority')
    .eq('folder_id', folderId)
    .eq('program_id', programId);

  if (error) throw error;

  const totalCases = cases?.length || 0;
  const eligibleForSet = cases?.filter(c => c.status === 'approved').length || 0;
  const eligibleForCycle = cases?.filter(c => c.status !== 'draft').length || 0;

  return {
    total_cases: totalCases,
    eligible_for_set: eligibleForSet,
    eligible_for_cycle: eligibleForCycle,
    has_consistent_release: false,
    has_consistent_component: false,
  };
}

/**
 * Create new Set from folder cases
 */
export async function createSetFromFolder(
  request: CreateSetFromFolderRequest
) {
  // Auto-generate key
  const { count } = await supabase
    .from('test_sets')
    .select('*', { count: 'exact', head: true })
    .eq('program_id', request.program_id);
  
  const key = `SET-${String((count || 0) + 1).padStart(3, '0')}`;
  
  // Create the test set
  const { data: newSet, error: setError } = await supabase
    .from('test_sets')
    .insert({
      key,
      name: request.set_name,
      objective: request.set_description,
      program_id: request.program_id,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (setError) throw setError;

  // Get cases from folder
  const { data: cases, error: casesError } = await supabase
    .from('test_cases')
    .select('id')
    .eq('folder_id', request.folder_id)
    .eq('program_id', request.program_id)
    .eq('status', 'approved'); // Only approved cases

  if (casesError) throw casesError;

  // Filter by selected case IDs if provided
  const casesToAdd = request.selected_case_ids
    ? cases?.filter(c => request.selected_case_ids?.includes(c.id))
    : cases;

  // Add cases to set
  if (casesToAdd && casesToAdd.length > 0) {
    const setCases = casesToAdd.map((c, index) => ({
      set_id: newSet.id,
      case_id: c.id,
      sort_order: index + 1,
    }));

    const { error: linkError } = await supabase
      .from('test_set_cases')
      .insert(setCases);

    if (linkError) throw linkError;
  }

  return newSet;
}

/**
 * Add folder cases to existing Set(s)
 */
export async function addFolderToSet(
  request: AddFolderToSetRequest
): Promise<{ success: boolean; sets_updated: number }> {
  // Get cases from folder
  const { data: cases, error: casesError } = await supabase
    .from('test_cases')
    .select('id')
    .eq('folder_id', request.folder_id)
    .eq('program_id', request.program_id)
    .eq('status', 'approved');

  if (casesError) throw casesError;

  const casesToAdd = request.selected_case_ids
    ? cases?.filter(c => request.selected_case_ids?.includes(c.id))
    : cases;

  if (!casesToAdd || casesToAdd.length === 0) {
    throw new Error('No eligible cases found in folder');
  }

  // Add cases to each selected set
  for (const setId of request.set_ids) {
    const setCases = casesToAdd.map((c, index) => ({
      set_id: setId,
      case_id: c.id,
      sort_order: index + 1,
    }));

    const { error: linkError } = await supabase
      .from('test_set_cases')
      .insert(setCases);

    if (linkError) throw linkError;
  }

  return {
    success: true,
    sets_updated: request.set_ids.length,
  };
}

/**
 * Create new Cycle from folder cases
 */
export async function createCycleFromFolder(
  request: CreateCycleFromFolderRequest
) {
  const userId = (await supabase.auth.getUser()).data.user?.id;

  // Create the test cycle
  const { data: newCycle, error: cycleError } = await supabase
    .from('test_cycles')
    .insert({
      name: request.cycle_name,
      description: request.cycle_description,
      program_id: request.program_id,
      status: 'planned',
      start_date: request.start_date,
      end_date: request.end_date,
      created_by: userId,
    })
    .select()
    .single();

  if (cycleError) throw cycleError;

  // Get cases from folder (exclude draft status)
  const { data: cases, error: casesError } = await supabase
    .from('test_cases')
    .select('id, created_by')
    .eq('folder_id', request.folder_id)
    .eq('program_id', request.program_id)
    .neq('status', 'draft');

  if (casesError) throw casesError;

  const casesToAdd = request.selected_case_ids
    ? cases?.filter(c => request.selected_case_ids?.includes(c.id))
    : cases;

  // Create test executions for each case
  if (casesToAdd && casesToAdd.length > 0) {
    const executions = casesToAdd.map(c => ({
      test_case_id: c.id,
      test_cycle_id: newCycle.id,
      program_id: request.program_id,
      executed_by: request.assign_to_case_owners ? c.created_by : (request.user_assignments?.[c.id] || userId),
      execution_date: new Date().toISOString(),
      status: 'not_run' as const,
    }));

    const { error: execError } = await supabase
      .from('test_executions')
      .insert(executions);

    if (execError) throw execError;
  }

  return newCycle;
}

/**
 * Add folder cases to existing Cycle(s)
 */
export async function addFolderToCycle(
  request: AddFolderToCycleRequest
): Promise<{ success: boolean; cycles_updated: number }> {
  const userId = (await supabase.auth.getUser()).data.user?.id;

  // Get cases from folder (exclude draft status)
  const { data: cases, error: casesError } = await supabase
    .from('test_cases')
    .select('id')
    .eq('folder_id', request.folder_id)
    .eq('program_id', request.program_id)
    .neq('status', 'draft');

  if (casesError) throw casesError;

  const casesToAdd = request.selected_case_ids
    ? cases?.filter(c => request.selected_case_ids?.includes(c.id))
    : cases;

  if (!casesToAdd || casesToAdd.length === 0) {
    throw new Error('No eligible cases found in folder');
  }

  // Add cases to each selected cycle
  for (const cycleId of request.cycle_ids) {
    const executions = casesToAdd.map(c => ({
      test_case_id: c.id,
      test_cycle_id: cycleId,
      program_id: request.program_id,
      executed_by: userId,
      execution_date: new Date().toISOString(),
      status: 'not_run' as const,
    }));

    const { error: execError } = await supabase
      .from('test_executions')
      .insert(executions);

    if (execError) throw execError;
  }

  return {
    success: true,
    cycles_updated: request.cycle_ids.length,
  };
}
