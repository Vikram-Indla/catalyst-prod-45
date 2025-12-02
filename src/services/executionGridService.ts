/**
 * Execution Grid Service - API interactions for the execution grid
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ExecutionGridData,
  ExecutionGridRow,
  ExecutionGridColumn,
  ExecutionGridCell,
  ExecutionRun,
  ExecutionDataset,
  ExecutionTester,
  ExecutionStatus,
  BulkExecuteRequest,
  AssignCasesRequest,
  AddRunRequest,
  AddDatasetRequest,
  CloseCycleRequest,
  ExecutionFilter,
} from '@/types/executionGrid';

// Map database status to our ExecutionStatus type
function mapDbStatus(dbStatus: string | null): ExecutionStatus {
  const statusMap: Record<string, ExecutionStatus> = {
    'passed': 'passed',
    'failed': 'failed',
    'blocked': 'blocked',
    'skipped': 'skipped',
    'in_progress': 'in_progress',
    'not_run': 'not_executed',
    'not_executed': 'not_executed',
  };
  return statusMap[dbStatus || ''] || 'not_executed';
}

// Map our ExecutionStatus to database status
function mapToDbStatus(status: ExecutionStatus): string {
  const statusMap: Record<ExecutionStatus, string> = {
    'passed': 'passed',
    'failed': 'failed',
    'blocked': 'blocked',
    'skipped': 'skipped',
    'in_progress': 'in_progress',
    'not_executed': 'not_run',
  };
  return statusMap[status] || 'not_run';
}

/**
 * Fetch execution grid data for a cycle
 */
export async function fetchExecutionGrid(
  cycleId: string,
  filters?: ExecutionFilter
): Promise<ExecutionGridData> {
  // Fetch cycle info
  const { data: cycle, error: cycleError } = await supabase
    .from('test_cycles')
    .select('*')
    .eq('id', cycleId)
    .single();

  if (cycleError) throw cycleError;

  // Fetch cycle executions (cases in this cycle)
  const { data: cycleExecutions, error: execError } = await supabase
    .from('test_cycle_executions')
    .select('*')
    .eq('cycle_id', cycleId);

  if (execError) throw execError;

  // Get case IDs from executions
  const caseIds = [...new Set((cycleExecutions || []).map((e: any) => e.case_id).filter(Boolean))];

  // Fetch test cases
  let testCases: any[] = [];
  if (caseIds.length > 0) {
    const { data: cases } = await supabase
      .from('test_cases')
      .select('id, case_key, title, priority, status')
      .in('id', caseIds);
    testCases = cases || [];
  }

  // Fetch runs
  const { data: runs, error: runsError } = await supabase
    .from('test_execution_runs')
    .select('*')
    .eq('cycle_id', cycleId)
    .order('run_number');

  if (runsError) throw runsError;

  // Fetch datasets
  const { data: datasets, error: datasetsError } = await supabase
    .from('test_datasets')
    .select('*')
    .eq('cycle_id', cycleId);

  if (datasetsError) throw datasetsError;

  // Fetch assignments
  const { data: assignments, error: assignError } = await supabase
    .from('test_cycle_case_assignments')
    .select('*')
    .eq('cycle_id', cycleId);

  if (assignError) throw assignError;

  // Get unique testers from assignments and executions
  const testerIds = [
    ...new Set([
      ...(assignments || []).map((a: any) => a.assigned_to).filter(Boolean),
      ...(cycleExecutions || []).map((e: any) => e.assigned_to).filter(Boolean),
    ])
  ];
  
  let testers: ExecutionTester[] = [];
  if (testerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', testerIds);
    
    testers = (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.full_name || p.email || 'Unknown',
      email: p.email || '',
      avatarUrl: p.avatar_url || undefined,
      assignedCases: (cycleExecutions || []).filter((e: any) => e.assigned_to === p.id).length,
      executedCases: (cycleExecutions || []).filter((e: any) => e.executed_by === p.id && e.status !== 'not_run').length,
      passRate: 0,
    }));
  }

  // Build columns - one for each tester
  const columns: ExecutionGridColumn[] = [];
  const runNumber = 1; // Default to run 1 for now
  
  for (const tester of testers) {
    columns.push({
      id: `tester-${tester.id}-run-${runNumber}`,
      type: 'tester',
      testerId: tester.id,
      testerName: tester.name,
      runNumber,
    });
  }
  
  // Add dataset columns
  for (const dataset of datasets || []) {
    columns.push({
      id: `dataset-${(dataset as any).id}-run-${runNumber}`,
      type: 'dataset',
      datasetId: (dataset as any).id,
      datasetName: (dataset as any).name,
      runNumber,
    });
  }

  // If no columns, add a default "Unassigned" column
  if (columns.length === 0) {
    columns.push({
      id: 'unassigned-run-1',
      type: 'tester',
      testerId: undefined,
      testerName: 'Unassigned',
      runNumber: 1,
    });
  }

  // Build rows
  const rows: ExecutionGridRow[] = testCases.map(tc => {
    const cells: ExecutionGridCell[] = columns.map(col => {
      const execution = (cycleExecutions || []).find((e: any) => 
        e.case_id === tc.id &&
        (col.type === 'tester' ? e.assigned_to === col.testerId || (!col.testerId && !e.assigned_to) : true)
      );

      return {
        executionId: (execution as any)?.id || null,
        caseId: tc.id,
        testerId: col.testerId || null,
        runNumber: col.runNumber,
        datasetId: col.datasetId || null,
        status: mapDbStatus((execution as any)?.status),
        statusOverride: (execution as any)?.overall_status_override || false,
        manualStatus: mapDbStatus((execution as any)?.manual_status) || null,
        evidenceCount: (execution as any)?.evidence_count || 0,
        defectCount: 0, // TODO: Count from test_execution_defects
        inProgress: (execution as any)?.status === 'in_progress',
        lockedBy: null,
        lockedAt: null,
        executedBy: (execution as any)?.executed_by || null,
        executionDate: (execution as any)?.executed_at || null,
        actualResult: (execution as any)?.comments || null,
      };
    });

    return {
      caseId: tc.id,
      caseKey: tc.case_key || 'Unknown',
      caseTitle: tc.title || 'Unknown',
      priority: tc.priority || 'medium',
      caseStatus: tc.status || 'draft',
      cells,
    };
  });

  // Apply filters
  let filteredRows = rows;
  if (filters) {
    if (filters.priority?.length) {
      filteredRows = filteredRows.filter(r => filters.priority!.includes(r.priority));
    }
    if (filters.status?.length) {
      filteredRows = filteredRows.filter(r => 
        r.cells.some(c => filters.status!.includes(c.status))
      );
    }
    if (filters.assigneeId) {
      filteredRows = filteredRows.filter(r =>
        r.cells.some(c => c.testerId === filters.assigneeId)
      );
    }
    if (filters.hasDefects) {
      filteredRows = filteredRows.filter(r =>
        r.cells.some(c => c.defectCount > 0)
      );
    }
    if (filters.hasEvidence) {
      filteredRows = filteredRows.filter(r =>
        r.cells.some(c => c.evidenceCount > 0)
      );
    }
  }

  // Calculate metrics
  const totalCases = filteredRows.length;
  const executedCases = filteredRows.filter(r => r.cells.some(c => c.status !== 'not_executed')).length;
  const passedCases = filteredRows.filter(r => r.cells.some(c => c.status === 'passed')).length;
  const failedCases = filteredRows.filter(r => r.cells.some(c => c.status === 'failed')).length;
  const blockedCases = filteredRows.filter(r => r.cells.some(c => c.status === 'blocked')).length;
  const skippedCases = filteredRows.filter(r => r.cells.some(c => c.status === 'skipped')).length;

  return {
    cycleId,
    cycleName: (cycle as any).name,
    cycleStatus: (cycle as any).status,
    rows: filteredRows,
    columns,
    runs: (runs || []).map((r: any) => ({
      id: r.id,
      cycleId: r.cycle_id,
      runNumber: r.run_number,
      runName: r.run_name || `Run ${r.run_number}`,
      createdAt: r.created_at,
      createdBy: r.created_by,
      copiedFromRunId: r.copied_from_run_id,
    })),
    datasets: (datasets || []).map((d: any) => ({
      id: d.id,
      cycleId: d.cycle_id,
      name: d.name,
      parameters: d.parameters as Record<string, any>,
      createdAt: d.created_at,
      createdBy: d.created_by,
    })),
    testers,
    totalCases,
    executedCases,
    passedCases,
    failedCases,
    blockedCases,
    skippedCases,
    progressPercentage: totalCases > 0 ? Math.round((executedCases / totalCases) * 100) : 0,
    passRate: executedCases > 0 ? Math.round((passedCases / executedCases) * 100) : 0,
  };
}

/**
 * Execute a single cell
 */
export async function executeCell(
  cycleId: string,
  caseId: string,
  status: ExecutionStatus,
  options: {
    testerId?: string;
    runNumber?: number;
    datasetId?: string;
    actualResult?: string;
    defectId?: string;
  } = {}
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  const dbStatus = mapToDbStatus(status);

  // Check if execution exists
  const { data: existing } = await supabase
    .from('test_cycle_executions')
    .select('id')
    .eq('cycle_id', cycleId)
    .eq('case_id', caseId)
    .maybeSingle();

  if (existing) {
    // Update existing
    await supabase
      .from('test_cycle_executions')
      .update({
        status: dbStatus as any,
        comments: options.actualResult,
        executed_by: userId,
        executed_at: new Date().toISOString(),
      })
      .eq('id', (existing as any).id);
  } else {
    // Create new
    await supabase
      .from('test_cycle_executions')
      .insert({
        cycle_id: cycleId,
        case_id: caseId,
        status: dbStatus as any,
        comments: options.actualResult,
        executed_by: userId,
        executed_at: new Date().toISOString(),
        assigned_to: options.testerId,
      });
  }
}

/**
 * Bulk execute cells
 */
export async function bulkExecute(request: BulkExecuteRequest): Promise<void> {
  for (const cell of request.cells) {
    await executeCell(request.cycleId, cell.caseId, request.status, {
      testerId: cell.testerId || undefined,
      runNumber: cell.runNumber,
      datasetId: cell.datasetId || undefined,
      actualResult: request.comment,
    });
  }
}

/**
 * Assign cases to testers
 */
export async function assignCases(request: AssignCasesRequest): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  for (const assignment of request.assignments) {
    // Update the cycle execution assignment
    const { data: existing } = await supabase
      .from('test_cycle_executions')
      .select('id')
      .eq('cycle_id', request.cycleId)
      .eq('case_id', assignment.caseId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('test_cycle_executions')
        .update({
          assigned_to: assignment.testerId,
        })
        .eq('id', (existing as any).id);
    } else {
      await supabase
        .from('test_cycle_executions')
        .insert({
          cycle_id: request.cycleId,
          case_id: assignment.caseId,
          assigned_to: assignment.testerId,
          status: 'not_run' as any,
        });
    }
  }
}

/**
 * Add a new run to cycle
 */
export async function addRun(request: AddRunRequest): Promise<ExecutionRun> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  // Get next run number
  const { data: existingRuns } = await supabase
    .from('test_execution_runs')
    .select('run_number')
    .eq('cycle_id', request.cycleId)
    .order('run_number', { ascending: false })
    .limit(1);

  const nextRunNumber = ((existingRuns as any)?.[0]?.run_number || 0) + 1;

  const { data: newRun, error } = await supabase
    .from('test_execution_runs')
    .insert({
      cycle_id: request.cycleId,
      run_number: nextRunNumber,
      run_name: request.runName || `Run ${nextRunNumber}`,
      created_by: userId,
      copied_from_run_id: request.copyFromRunId,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: (newRun as any).id,
    cycleId: (newRun as any).cycle_id,
    runNumber: (newRun as any).run_number,
    runName: (newRun as any).run_name || `Run ${(newRun as any).run_number}`,
    createdAt: (newRun as any).created_at,
    createdBy: (newRun as any).created_by,
    copiedFromRunId: (newRun as any).copied_from_run_id,
  };
}

/**
 * Add a dataset to cycle
 */
export async function addDataset(request: AddDatasetRequest): Promise<ExecutionDataset> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  const { data: dataset, error } = await supabase
    .from('test_datasets')
    .insert({
      cycle_id: request.cycleId,
      name: request.name,
      parameters: request.parameters,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: (dataset as any).id,
    cycleId: (dataset as any).cycle_id,
    name: (dataset as any).name,
    parameters: (dataset as any).parameters as Record<string, any>,
    createdAt: (dataset as any).created_at,
    createdBy: (dataset as any).created_by,
  };
}

/**
 * Close a cycle
 */
export async function closeCycle(request: CloseCycleRequest): Promise<void> {
  const { error } = await supabase
    .from('test_cycles')
    .update({
      status: 'completed' as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.cycleId);

  if (error) throw error;

  // Archive if requested
  if (request.archiveCycle) {
    await supabase
      .from('test_cycles')
      .update({
        archived: true,
        archived_at: new Date().toISOString(),
        archive_reason: request.reason,
      })
      .eq('id', request.cycleId);
  }
}

/**
 * Reopen a closed cycle
 */
export async function reopenCycle(cycleId: string): Promise<void> {
  const { error } = await supabase
    .from('test_cycles')
    .update({
      status: 'active' as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cycleId);

  if (error) throw error;
}

/**
 * Remove cases from cycle
 */
export async function removeCasesFromCycle(cycleId: string, caseIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('test_cycle_executions')
    .delete()
    .eq('cycle_id', cycleId)
    .in('case_id', caseIds);

  if (error) throw error;
}
