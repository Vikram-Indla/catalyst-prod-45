import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SharedStepInfo {
  id: string;
  name: string;
  action: string;
  expected_result: string;
  project_id: string;
  project_name: string;
  usage_count: number;
}

/**
 * Fetches shared test steps (marked with is_shared=true).
 * Returns list with usage count (how many test cases reference each step).
 * Sorted by project, then usage count (descending).
 */
export function useSharedSteps(projectId?: string) {
  return useQuery({
    queryKey: ['testops-shared-steps', projectId],
    staleTime: 120_000,
    queryFn: async (): Promise<SharedStepInfo[]> => {
      // Query shared steps
      const { data: steps, error: stepsError } = await supabase
        .from('tm_test_steps')
        .select('id, name, action, expected_result, test_case_id')
        .eq('is_shared', true)
        .is('deleted_at', null);

      if (stepsError) throw stepsError;

      if (!steps || steps.length === 0) return [];

      // Get test case details to find projects
      const testCaseIds = [...new Set((steps as any[]).map((s: any) => s.test_case_id))];

      const { data: testCases } = await supabase
        .from('tm_test_cases')
        .select('id, project_id')
        .in('id', testCaseIds);

      const testCaseMap = new Map((testCases ?? []).map((tc: any) => [tc.id, tc.project_id]));

      // Get projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name');

      const projectMap = new Map((projects ?? []).map((p: any) => [p.id, p.name]));

      // Count step usage (how many unique test cases reference this step)
      const stepUsageMap = new Map<string, Set<string>>();
      (steps as any[]).forEach((s: any) => {
        if (!stepUsageMap.has(s.id)) {
          stepUsageMap.set(s.id, new Set());
        }
        stepUsageMap.get(s.id)?.add(s.test_case_id);
      });

      // Build result
      return (steps as any[])
        .reduce((acc: SharedStepInfo[], step: any) => {
          const existing = acc.find((s) => s.id === step.id);
          if (!existing) {
            const projectId = testCaseMap.get(step.test_case_id);
            acc.push({
              id: step.id,
              name: step.name,
              action: step.action,
              expected_result: step.expected_result,
              project_id: projectId ?? '—',
              project_name: projectMap.get(projectId) ?? '—',
              usage_count: stepUsageMap.get(step.id)?.size ?? 0,
            });
          }
          return acc;
        }, [])
        .filter((s) => !projectId || s.project_id === projectId)
        .sort((a, b) => {
          const projectCmp = a.project_name.localeCompare(b.project_name);
          if (projectCmp !== 0) return projectCmp;
          return b.usage_count - a.usage_count;
        });
    },
  });
}
