/**
 * CATALYST TESTS - Enhanced Cycle Management Service
 * Comprehensive API service for 12-feature cycle management
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  EnhancedTestCycle,
  CreateEnhancedCycleRequest,
  CopyCycleRequest,
  MoveCycleRequest,
  ArchiveCycleRequest,
  BulkAddCasesRequest,
  BulkAssignCasesRequest,
  CycleTemplate,
  CycleAssignment,
  CycleDependency,
  CyclePlanningData,
} from '@/types/cycleManagement';

/**
 * Fetch cycle templates
 */
export async function fetchCycleTemplates(): Promise<CycleTemplate[]> {
  const { data, error } = await supabase
    .from('test_cycle_templates')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data as CycleTemplate[];
}

/**
 * Create cycle from template
 */
export async function createCycleFromTemplate(
  templateId: string,
  overrides: Partial<CreateEnhancedCycleRequest>
): Promise<EnhancedTestCycle> {
  const { data: template, error: templateError } = await supabase
    .from('test_cycle_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError) throw templateError;

  const config = (template as CycleTemplate).config;
  
  return createEnhancedCycle({
    name: overrides.name || template.name,
    objective: overrides.objective,
    folder_id: overrides.folder_id,
    owner_id: overrides.owner_id,
    start_date: overrides.start_date || new Date().toISOString().split('T')[0],
    end_date: overrides.end_date || new Date().toISOString().split('T')[0],
    environment: config.environment || 'production',
    auto_close_on_completion: config.auto_close_on_completion ?? false,
    email_notifications: config.email_notifications ?? true,
    scope_locked: config.scope_locked ?? false,
    template_id: templateId,
    ...overrides,
  });
}

/**
 * Create enhanced cycle with all features
 */
export async function createEnhancedCycle(
  request: CreateEnhancedCycleRequest
): Promise<EnhancedTestCycle> {
  const user = (await supabase.auth.getUser()).data.user;

  // Generate cycle key
  const { count } = await supabase
    .from('test_cycles')
    .select('*', { count: 'exact', head: true });

  const key = `CYC-${String((count || 0) + 1).padStart(3, '0')}`;

  const { data: cycle, error } = await supabase
    .from('test_cycles')
    .insert({
      key,
      name: request.name,
      objective: request.objective || '',
      folder_id: request.folder_id || null,
      owner_id: request.owner_id || user?.id || null,
      start_date: request.start_date,
      end_date: request.end_date,
      build_version: request.build_version || null,
      environment: request.environment || 'production',
      program_id: request.program_id || null,
      template_id: request.template_id || null,
      auto_close_on_completion: request.auto_close_on_completion ?? false,
      email_notifications: request.email_notifications ?? true,
      scope_locked: request.scope_locked ?? false,
      sync_with_set: request.sync_with_set ?? false,
      source_set_id: request.source_set_id || null,
      custom_fields: request.custom_fields || {},
      status: 'not_started',
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Add cases if provided
  if (request.cases && request.cases.length > 0) {
    const executions = request.cases.map((c) => ({
      cycle_id: cycle.id,
      case_id: c.case_id,
      case_version: c.version,
      assigned_to: c.assigned_to || null,
    }));

    await supabase.from('test_cycle_executions').insert(executions);
  }

  // Add cases from sets if provided
  if (request.sets && request.sets.length > 0) {
    for (const setId of request.sets) {
      await addSetToCycle(cycle.id, setId);
    }
  }

  return cycle as EnhancedTestCycle;
}

/**
 * Add set to cycle
 */
export async function addSetToCycle(cycleId: string, setId: string, assignAllTo?: string) {
  const { data: setCases, error: setError } = await supabase
    .from('test_set_cases')
    .select('case_id, case_version')
    .eq('set_id', setId);

  if (setError) throw setError;
  if (!setCases || setCases.length === 0) {
    throw new Error('No cases found in set');
  }

  const executions = setCases.map((sc) => ({
    cycle_id: cycleId,
    case_id: sc.case_id,
    case_version: sc.case_version || 1,
    assigned_to: assignAllTo || null,
  }));

  const { error } = await supabase.from('test_cycle_executions').insert(executions);
  if (error) throw error;
}

/**
 * Copy cycle
 */
export async function copyCycle(request: CopyCycleRequest): Promise<EnhancedTestCycle> {
  const { data: sourceCycle, error: sourceError } = await supabase
    .from('test_cycles')
    .select('*')
    .eq('id', request.source_cycle_id)
    .single();

  if (sourceError) throw sourceError;

  const user = (await supabase.auth.getUser()).data.user;

  // Generate new key
  const { count } = await supabase
    .from('test_cycles')
    .select('*', { count: 'exact', head: true });

  const key = `CYC-${String((count || 0) + 1).padStart(3, '0')}`;

  // Create new cycle
  const { data: newCycle, error: createError } = await supabase
    .from('test_cycles')
    .insert({
      key,
      name: request.new_name,
      objective: sourceCycle.objective,
      folder_id: request.destination_folder_id ?? sourceCycle.folder_id,
      owner_id: user?.id,
      start_date: sourceCycle.start_date,
      end_date: sourceCycle.end_date,
      build_version: sourceCycle.build_version,
      environment: sourceCycle.environment,
      program_id: sourceCycle.program_id,
      auto_close_on_completion: sourceCycle.auto_close_on_completion,
      email_notifications: sourceCycle.email_notifications,
      custom_fields: sourceCycle.custom_fields,
      status: 'not_started',
      created_by: user?.id,
    })
    .select()
    .single();

  if (createError) throw createError;

  // Copy cases if requested
  if (request.copy_cases) {
    const { data: executions } = await supabase
      .from('test_cycle_executions')
      .select('case_id, case_version, assigned_to')
      .eq('cycle_id', request.source_cycle_id);

    if (executions && executions.length > 0) {
      const newExecutions = executions.map((e) => ({
        cycle_id: newCycle.id,
        case_id: e.case_id,
        case_version: e.case_version,
        assigned_to: request.copy_assignments ? e.assigned_to : null,
      }));

      await supabase.from('test_cycle_executions').insert(newExecutions);
    }
  }

  return newCycle as EnhancedTestCycle;
}

/**
 * Move cycles to folder
 */
export async function moveCycles(request: MoveCycleRequest): Promise<void> {
  const { error } = await supabase
    .from('test_cycles')
    .update({ folder_id: request.target_folder_id })
    .in('id', request.cycle_ids);

  if (error) throw error;
}

/**
 * Archive cycles
 */
export async function archiveCycles(request: ArchiveCycleRequest): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;

  const { error } = await supabase
    .from('test_cycles')
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      archived_by: user?.id,
      archive_reason: request.archive_reason,
    })
    .in('id', request.cycle_ids);

  if (error) throw error;
}

/**
 * Restore archived cycles
 */
export async function restoreCycles(cycleIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('test_cycles')
    .update({
      archived: false,
      archived_at: null,
      archived_by: null,
      archive_reason: null,
    })
    .in('id', cycleIds);

  if (error) throw error;
}

/**
 * Lock cycle scope
 */
export async function lockCycleScope(cycleId: string): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;

  const { error } = await supabase
    .from('test_cycles')
    .update({
      scope_locked: true,
      scope_locked_at: new Date().toISOString(),
      scope_locked_by: user?.id,
    })
    .eq('id', cycleId);

  if (error) throw error;
}

/**
 * Unlock cycle scope
 */
export async function unlockCycleScope(cycleId: string): Promise<void> {
  const { error } = await supabase
    .from('test_cycles')
    .update({
      scope_locked: false,
      scope_locked_at: null,
      scope_locked_by: null,
    })
    .eq('id', cycleId);

  if (error) throw error;
}

/**
 * Update cycle
 */
export async function updateEnhancedCycle(
  cycleId: string,
  updates: Partial<EnhancedTestCycle>
): Promise<void> {
  const { error } = await supabase
    .from('test_cycles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cycleId);

  if (error) throw error;
}

/**
 * Delete cycle
 */
export async function deleteCycle(cycleId: string): Promise<void> {
  // Check if cycle is in progress
  const { data: cycle } = await supabase
    .from('test_cycles')
    .select('status, is_adhoc')
    .eq('id', cycleId)
    .single();

  if (cycle?.is_adhoc) {
    throw new Error('Cannot delete Adhoc cycle');
  }

  if (cycle?.status === 'active') {
    throw new Error('Cannot delete cycle in progress. Close the cycle first.');
  }

  const { error } = await supabase
    .from('test_cycles')
    .delete()
    .eq('id', cycleId);

  if (error) throw error;
}

/**
 * Bulk add cases to cycles
 */
export async function bulkAddCasesToCycles(request: BulkAddCasesRequest): Promise<void> {
  for (const cycleId of request.cycle_ids) {
    // Check if scope is locked
    const { data: cycle } = await supabase
      .from('test_cycles')
      .select('scope_locked')
      .eq('id', cycleId)
      .single();

    if (cycle?.scope_locked) {
      throw new Error(`Cycle scope is locked. Unlock to add cases.`);
    }

    const executions = request.case_ids.map((caseId) => ({
      cycle_id: cycleId,
      case_id: caseId,
      case_version: 1,
      assigned_to: request.assigned_to || null,
    }));

    await supabase.from('test_cycle_executions').insert(executions);
  }
}

/**
 * Bulk assign cases
 */
export async function bulkAssignCases(request: BulkAssignCasesRequest): Promise<void> {
  const { error } = await supabase
    .from('test_cycle_executions')
    .update({ assigned_to: request.assigned_to })
    .eq('cycle_id', request.cycle_id)
    .in('case_id', request.case_ids);

  if (error) throw error;
}

/**
 * Save cycle planning data
 */
export async function saveCyclePlanning(
  cycleId: string,
  assignments: Partial<CycleAssignment>[],
  dependencies: Partial<CycleDependency>[]
): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;

  // Clear existing assignments
  await supabase
    .from('test_cycle_case_assignments')
    .delete()
    .eq('cycle_id', cycleId);

  // Insert new assignments
  if (assignments.length > 0) {
    const assignmentData = assignments
      .filter((a) => a.case_id) // Only include assignments with case_id
      .map((a) => ({
        case_id: a.case_id,
        assigned_to: a.assigned_to || null,
        sort_order: a.sort_order || 0,
        milestone: a.milestone || null,
        estimated_effort: a.estimated_effort || 0,
        cycle_id: cycleId,
        assigned_by: user?.id,
      }));

    if (assignmentData.length > 0) {
      await supabase.from('test_cycle_case_assignments').insert(assignmentData);
    }
  }

  // Clear existing dependencies
  await supabase
    .from('test_cycle_dependencies')
    .delete()
    .eq('cycle_id', cycleId);

  // Insert new dependencies
  if (dependencies.length > 0) {
    const validDependencies = dependencies.filter(
      (d) => d.predecessor_case_id && d.successor_case_id
    );

    if (validDependencies.length > 0) {
      const dependencyData = validDependencies.map((d) => ({
        cycle_id: cycleId,
        predecessor_case_id: d.predecessor_case_id as string,
        successor_case_id: d.successor_case_id as string,
        dependency_type: d.dependency_type || 'finish_to_start',
      }));

      await supabase.from('test_cycle_dependencies').insert(dependencyData);
    }
  }
}

/**
 * Fetch cycle planning data
 */
export async function fetchCyclePlanning(cycleId: string): Promise<CyclePlanningData> {
  const { data: assignments } = await supabase
    .from('test_cycle_case_assignments')
    .select('*')
    .eq('cycle_id', cycleId)
    .order('sort_order');

  const { data: dependencies } = await supabase
    .from('test_cycle_dependencies')
    .select('*')
    .eq('cycle_id', cycleId);

  const totalEffort = (assignments || []).reduce(
    (sum, a) => sum + (a.estimated_effort || 0),
    0
  );

  // Group by tester
  const testerMap = new Map<string, { count: number; effort: number }>();
  for (const a of assignments || []) {
    if (a.assigned_to) {
      const current = testerMap.get(a.assigned_to) || { count: 0, effort: 0 };
      testerMap.set(a.assigned_to, {
        count: current.count + 1,
        effort: current.effort + (a.estimated_effort || 0),
      });
    }
  }

  return {
    assignments: (assignments || []) as CycleAssignment[],
    dependencies: (dependencies || []) as CycleDependency[],
    total_estimated_effort: totalEffort,
    testers: Array.from(testerMap.entries()).map(([userId, data]) => ({
      user_id: userId,
      user_name: userId, // Would be enriched with user lookup
      assigned_count: data.count,
      estimated_effort: data.effort,
    })),
  };
}

/**
 * Create cycle from set
 */
export async function createCycleFromSet(
  setId: string,
  overrides: Partial<CreateEnhancedCycleRequest>
): Promise<EnhancedTestCycle> {
  const { data: set } = await supabase
    .from('test_sets')
    .select('name')
    .eq('id', setId)
    .single();

  const today = new Date().toISOString().split('T')[0];
  
  return createEnhancedCycle({
    name: overrides.name || `${set?.name || 'Set'} - ${today}`,
    start_date: overrides.start_date || today,
    end_date: overrides.end_date || today,
    sync_with_set: true,
    source_set_id: setId,
    sets: [setId],
    ...overrides,
  });
}

/**
 * Auto-balance case assignments
 */
export async function autoBalanceAssignments(
  cycleId: string,
  testerIds: string[]
): Promise<CycleAssignment[]> {
  const { data: executions } = await supabase
    .from('test_cycle_executions')
    .select('id, case_id')
    .eq('cycle_id', cycleId);

  if (!executions || executions.length === 0 || testerIds.length === 0) {
    return [];
  }

  const casesPerTester = Math.ceil(executions.length / testerIds.length);
  const assignments: Partial<CycleAssignment>[] = [];

  executions.forEach((exec, index) => {
    const testerIndex = Math.floor(index / casesPerTester);
    const assignedTo = testerIds[Math.min(testerIndex, testerIds.length - 1)];

    assignments.push({
      cycle_id: cycleId,
      case_id: exec.case_id,
      assigned_to: assignedTo,
      sort_order: index,
    });
  });

  // Update executions with assignments
  for (const assignment of assignments) {
    await supabase
      .from('test_cycle_executions')
      .update({ assigned_to: assignment.assigned_to })
      .eq('cycle_id', cycleId)
      .eq('case_id', assignment.case_id);
  }

  return assignments as CycleAssignment[];
}
