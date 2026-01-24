/**
 * useCreateRunWithDataRows — Data-Driven Test Execution Hook
 * Creates one execution run per selected data row, with snapshot for traceability
 * ATOMIC: All-or-nothing — if any run fails, all created runs are rolled back
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type DbExecutionStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';

export interface DataRowSelection {
  id: string;
  row_data: Record<string, string>;
  row_order: number;
}

export interface CreateRunWithDataRowsInput {
  cycle_id: string;
  scope_id: string;
  case_id: string;
  selected_rows: DataRowSelection[];
}

export interface CreatedRunInfo {
  run_id: string;
  data_row_id: string | null;
  data_row_number: number | null;
}

export interface CreateRunWithDataRowsResult {
  created_runs: CreatedRunInfo[];
  first_run_id: string;
  total_count: number;
}

export function useCreateRunWithDataRows() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRunWithDataRowsInput): Promise<CreateRunWithDataRowsResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const createdRunIds: string[] = [];

      // Rollback helper — deletes all created runs and their step results
      const rollback = async (errorMessage: string) => {
        if (createdRunIds.length > 0) {
          // Delete step results first (FK constraint)
          await supabase
            .from('tm_step_results')
            .delete()
            .in('test_run_id', createdRunIds);
          
          // Delete runs
          await supabase
            .from('tm_test_runs')
            .delete()
            .in('id', createdRunIds);
        }
        throw new Error(errorMessage);
      };

      try {
        // If no data rows selected, create a single regular run
        if (input.selected_rows.length === 0) {
          const { count } = await supabase
            .from('tm_test_runs')
            .select('*', { count: 'exact', head: true })
            .eq('cycle_scope_id', input.scope_id);

          const runNumber = (count || 0) + 1;

          const { data: run, error: runError } = await supabase
            .from('tm_test_runs')
            .insert({
              cycle_scope_id: input.scope_id,
              run_number: runNumber,
              status: 'in_progress' as DbExecutionStatus,
              executed_by: user.id,
              started_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (runError) throw runError;

          createdRunIds.push(run.id);

          // Create step results
          await createStepResultsForRun(run.id, input.case_id);

          // Update scope status
          await supabase
            .from('tm_cycle_scope')
            .update({ current_status: 'in_progress' as DbExecutionStatus })
            .eq('id', input.scope_id);

          return {
            created_runs: [{
              run_id: run.id,
              data_row_id: null,
              data_row_number: null,
            }],
            first_run_id: run.id,
            total_count: 1,
          };
        }

        // DDT: Create one run per selected data row (ALL-OR-NOTHING)
        const { count: existingCount } = await supabase
          .from('tm_test_runs')
          .select('*', { count: 'exact', head: true })
          .eq('cycle_scope_id', input.scope_id);

        let runNumber = (existingCount || 0) + 1;
        const createdRuns: CreatedRunInfo[] = [];

        for (const row of input.selected_rows) {
          const { data: run, error: runError } = await supabase
            .from('tm_test_runs')
            .insert({
              cycle_scope_id: input.scope_id,
              run_number: runNumber,
              status: 'in_progress' as DbExecutionStatus,
              executed_by: user.id,
              started_at: new Date().toISOString(),
              test_data_row_id: row.id,
              test_data_row_snapshot: row.row_data,
              test_data_row_number: row.row_order + 1,
            })
            .select()
            .single();

          if (runError) {
            await rollback(`Failed to create run for Row ${row.row_order + 1}: ${runError.message}`);
            return null as never; // Never reached, rollback throws
          }

          createdRunIds.push(run.id);

          // Create step results for this run
          try {
            await createStepResultsForRun(run.id, input.case_id);
          } catch (stepError) {
            await rollback(`Failed to create steps for Row ${row.row_order + 1}: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
            return null as never;
          }

          createdRuns.push({
            run_id: run.id,
            data_row_id: row.id,
            data_row_number: row.row_order + 1,
          });

          runNumber++;
        }

        // All runs created successfully — update scope status
        await supabase
          .from('tm_cycle_scope')
          .update({ current_status: 'in_progress' as DbExecutionStatus })
          .eq('id', input.scope_id);

        return {
          created_runs: createdRuns,
          first_run_id: createdRuns[0].run_id,
          total_count: createdRuns.length,
        };

      } catch (error) {
        // Any unexpected error — attempt rollback
        if (createdRunIds.length > 0) {
          try {
            await supabase
              .from('tm_step_results')
              .delete()
              .in('test_run_id', createdRunIds);
            await supabase
              .from('tm_test_runs')
              .delete()
              .in('id', createdRunIds);
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
          }
        }
        throw error;
      }
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-runs', variables.cycle_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', variables.cycle_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle', variables.cycle_id] });
      
      if (result.total_count === 1) {
        toast.success('Execution started');
      } else {
        toast.success(`Started ${result.total_count} executions`, {
          description: `Data rows: ${result.created_runs
            .filter(r => r.data_row_number)
            .map(r => r.data_row_number)
            .join(', ')}`,
        });
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to start execution: ${error.message}`);
    },
  });
}

// Helper function to create step results for a run
async function createStepResultsForRun(runId: string, caseId: string) {
  const { data: steps, error: stepsError } = await supabase
    .from('tm_test_steps')
    .select('*')
    .eq('test_case_id', caseId)
    .order('step_number', { ascending: true });

  if (stepsError) throw stepsError;

  if (steps && steps.length > 0) {
    const stepResults = steps.map(step => ({
      test_run_id: runId,
      test_step_id: step.id,
      status: 'not_run' as DbExecutionStatus,
    }));

    const { error: resultsError } = await supabase
      .from('tm_step_results')
      .insert(stepResults);

    if (resultsError) throw resultsError;
  }
}

// Hook to fetch data rows for selection
export function useTestDataRowsForExecution(testCaseId: string | undefined) {
  return {
    async fetchRows(): Promise<DataRowSelection[]> {
      if (!testCaseId) return [];
      
      const { data, error } = await supabase
        .from('test_data_rows')
        .select('id, row_data, row_order')
        .eq('test_case_id', testCaseId)
        .order('row_order', { ascending: true });

      if (error) {
        console.error('Error fetching test data rows:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        row_data: row.row_data as Record<string, string>,
        row_order: row.row_order,
      }));
    }
  };
}
