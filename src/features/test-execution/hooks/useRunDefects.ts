/**
 * Module 4C-3: Run Defects Hook
 * Fetches and manages defects linked to a test run
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCatalystToast } from '@/hooks/useCatalystToast';
import type { DefectSeverity, DefectStatus } from '../types/defect-linking';

// Run defect summary
export interface RunDefectSummary {
  total: number;
  by_severity: Record<DefectSeverity, number>;
  by_status: Record<DefectStatus, number>;
  open_critical: number;
}

// Run defect item
export interface RunDefectItem {
  id: string;
  key: string;
  title: string;
  status: DefectStatus;
  severity: DefectSeverity;
  test_case_id: string;
  test_case_key: string;
  test_case_title: string;
  step_number: number | null;
  linked_at: string;
  assignee_name: string | null;
}

// Hook to get defects for a run
export function useRunDefects(runId: string) {
  const query = useQuery({
    queryKey: ['run-defects', runId],
    queryFn: async (): Promise<{ defects: RunDefectItem[]; summary: RunDefectSummary }> => {
      // Get defects linked through step results in this run
      const result = await (supabase
        .from('tm_defect_links') as any)
        .select(`
          id,
          linked_at,
          defect:tm_defects!inner(
            id,
            key,
            title,
            status,
            severity,
            assignee:profiles!tm_defects_assigned_to_fkey(full_name)
          ),
          step_result:test_execution_step_results!inner(
            step_order,
            execution:test_cycle_executions!inner(
              test_case:tm_test_cases!inner(
                id,
                key,
                title
              )
            )
          )
        `)
        .eq('step_result.execution.run_id', runId);

      if (result.error) {
        // If the query fails (table might not exist yet), return empty
        console.warn('Failed to fetch run defects:', result.error);
        return {
          defects: [],
          summary: {
            total: 0,
            by_severity: { critical: 0, major: 0, minor: 0, trivial: 0 },
            by_status: { open: 0, in_progress: 0, resolved: 0, closed: 0, reopened: 0 },
            open_critical: 0,
          },
        };
      }

      const defects: RunDefectItem[] = (result.data || []).map((link: any) => ({
        id: link.defect?.id,
        key: link.defect?.key,
        title: link.defect?.title,
        status: link.defect?.status || 'open',
        severity: link.defect?.severity || 'major',
        test_case_id: link.step_result?.execution?.test_case?.id,
        test_case_key: link.step_result?.execution?.test_case?.key,
        test_case_title: link.step_result?.execution?.test_case?.title,
        step_number: link.step_result?.step_order,
        linked_at: link.linked_at,
        assignee_name: link.defect?.assignee?.full_name || null,
      }));

      // Calculate summary
      const summary: RunDefectSummary = {
        total: defects.length,
        by_severity: { critical: 0, major: 0, minor: 0, trivial: 0 },
        by_status: { open: 0, in_progress: 0, resolved: 0, closed: 0, reopened: 0 },
        open_critical: 0,
      };

      defects.forEach((d) => {
        if (d.severity && summary.by_severity[d.severity] !== undefined) {
          summary.by_severity[d.severity]++;
        }
        if (d.status && summary.by_status[d.status] !== undefined) {
          summary.by_status[d.status]++;
        }
        if (d.severity === 'critical' && (d.status === 'open' || d.status === 'reopened')) {
          summary.open_critical++;
        }
      });

      return { defects, summary };
    },
    enabled: !!runId,
    staleTime: 30000,
  });

  return {
    defects: query.data?.defects || [],
    summary: query.data?.summary || {
      total: 0,
      by_severity: { critical: 0, major: 0, minor: 0, trivial: 0 },
      by_status: { open: 0, in_progress: 0, resolved: 0, closed: 0, reopened: 0 },
      open_critical: 0,
    },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// Hook to get defect count for an assignment
export function useAssignmentDefectCount(assignmentId: string, testCaseId: string) {
  const query = useQuery({
    queryKey: ['assignment-defect-count', assignmentId, testCaseId],
    queryFn: async (): Promise<number> => {
      // This would require a more specific query based on how assignments link to step results
      // For now, return 0 as placeholder
      return 0;
    },
    enabled: !!assignmentId && !!testCaseId,
    staleTime: 60000,
  });

  return query.data || 0;
}

// Hook to create inline defect during execution
export function useInlineDefectCreate(runId: string) {
  const queryClient = useQueryClient();
  const toast = useCatalystToast();

  const mutation = useMutation({
    mutationFn: async (input: {
      project_id: string;
      title: string;
      description?: string;
      severity: DefectSeverity;
      test_case_id: string;
      step_result_id?: string;
    }) => {
      // Create defect
      const { data: defect, error: defectError } = await (supabase
        .from('tm_defects') as any)
        .insert({
          project_id: input.project_id,
          title: input.title,
          description: input.description,
          severity: input.severity,
          status: 'open',
          source: 'execution',
          source_run_id: runId,
          source_test_case_id: input.test_case_id,
        })
        .select('id, key')
        .single();

      if (defectError) throw defectError;

      // Link to step result if provided
      if (input.step_result_id && defect?.id) {
        await (supabase.from('tm_defect_links') as any).insert({
          defect_id: defect.id,
          step_result_id: input.step_result_id,
          link_type: 'auto',
        });
      }

      return defect;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['run-defects', runId] });
      toast.success('Defect Created', `${data?.key || 'Defect'} has been logged`);
    },
    onError: (error: Error) => {
      toast.error('Failed to create defect', error.message);
    },
  });

  return {
    createDefect: mutation.mutate,
    isCreating: mutation.isPending,
  };
}
