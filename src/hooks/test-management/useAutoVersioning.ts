/**
 * Auto-versioning helper - creates version snapshots on test case changes
 */

import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export interface CreateVersionParams {
  testCaseId: string;
  changeSummary: string;
}

/**
 * Creates a version snapshot of the current test case state
 * Call this AFTER a successful mutation to record the change
 */
export async function createVersionSnapshot(params: CreateVersionParams): Promise<void> {
  const { testCaseId, changeSummary } = params;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Skip if not authenticated

    // Fetch current test case state
    const { data: testCase, error: caseError } = await supabase
      .from('tm_test_cases')
      .select('*')
      .eq('id', testCaseId)
      .single();

    if (caseError || !testCase) {
      console.error('Failed to fetch test case for versioning:', caseError);
      return;
    }

    // Fetch current steps
    const { data: steps, error: stepsError } = await supabase
      .from('tm_test_steps')
      .select('*')
      .eq('test_case_id', testCaseId)
      .order('step_number', { ascending: true });

    if (stepsError) {
      console.error('Failed to fetch steps for versioning:', stepsError);
      return;
    }

    // Get next version number
    const { data: existingVersions } = await (supabase as any)
      .from('tm_test_case_versions')
      .select('version_number')
      .eq('test_case_id', testCaseId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;

    // Create snapshot
    const snapshot = {
      title: testCase.title,
      description: testCase.description,
      preconditions: testCase.preconditions,
      status: testCase.status,
      priority_id: testCase.priority_id,
      case_type_id: testCase.case_type_id,
      folder_id: testCase.folder_id,
      assigned_to: testCase.assigned_to,
      steps: (steps || []).map((s: any) => ({
        step_number: s.step_number,
        action: s.action,
        expected_result: s.expected_result || '',
        test_data: s.test_data,
      })),
    };

    // Insert version
    const { error: insertError } = await (supabase as any)
      .from('tm_test_case_versions')
      .insert({
        test_case_id: testCaseId,
        version_number: nextVersion,
        snapshot,
        change_summary: changeSummary,
        changed_by: user.id,
      });

    if (insertError) {
      console.error('Failed to create version snapshot:', insertError);
    }
  } catch (error) {
    console.error('Error in createVersionSnapshot:', error);
  }
}

/**
 * Hook that provides a version-creating wrapper
 */
export function useAutoVersioning() {
  const queryClient = useQueryClient();

  const createVersion = useCallback(async (params: CreateVersionParams) => {
    await createVersionSnapshot(params);
    // Invalidate version queries
    queryClient.invalidateQueries({ queryKey: ['tm-case-versions', params.testCaseId] });
    queryClient.invalidateQueries({ queryKey: ['tm-case-versions-count', params.testCaseId] });
  }, [queryClient]);

  return { createVersion };
}
