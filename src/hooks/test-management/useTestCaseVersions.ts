/**
 * Hook for managing test case versions
 * Queries tm_test_case_versions table
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export interface TestCaseVersionSnapshot {
  title: string;
  description: string | null;
  preconditions: string | null;
  status: string;
  priority_id: string | null;
  case_type_id: string | null;
  folder_id: string | null;
  steps: Array<{
    step_number: number;
    action: string;
    expected_result: string;
    test_data: string | null;
  }>;
}

export interface TestCaseVersion {
  id: string;
  test_case_id: string;
  version_number: number;
  snapshot: TestCaseVersionSnapshot;
  change_summary: string | null;
  changed_by: string | null;
  changed_by_profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  created_at: string;
}

/**
 * Fetch all versions for a test case
 */
export function useTestCaseVersions(testCaseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-versions', testCaseId],
    queryFn: async (): Promise<TestCaseVersion[]> => {
      if (!testCaseId) return [];

      const { data, error } = await (supabase as any)
        .from('tm_test_case_versions')
        .select(`
          id,
          test_case_id,
          version_number,
          snapshot,
          change_summary,
          changed_by,
          created_at,
          changed_by_profile:profiles!tm_test_case_versions_changed_by_fkey(id, full_name, avatar_url)
        `)
        .eq('test_case_id', testCaseId)
        .order('version_number', { ascending: false });

      if (error) {
        console.error('Error fetching versions:', error);
        // If the join fails, try without profile
        const { data: fallbackData, error: fallbackError } = await (supabase as any)
          .from('tm_test_case_versions')
          .select('*')
          .eq('test_case_id', testCaseId)
          .order('version_number', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        return (fallbackData || []).map((v: any) => ({
          ...v,
          changed_by_profile: null,
        }));
      }

      return (data || []).map((v: any) => ({
        id: v.id,
        test_case_id: v.test_case_id,
        version_number: v.version_number,
        snapshot: v.snapshot || {},
        change_summary: v.change_summary,
        changed_by: v.changed_by,
        changed_by_profile: v.changed_by_profile,
        created_at: v.created_at,
      }));
    },
    enabled: !!testCaseId,
  });
}

/**
 * Get version count for a test case
 */
export function useTestCaseVersionsCount(testCaseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-versions-count', testCaseId],
    queryFn: async (): Promise<number> => {
      if (!testCaseId) return 0;

      const { count, error } = await (supabase as any)
        .from('tm_test_case_versions')
        .select('*', { count: 'exact', head: true })
        .eq('test_case_id', testCaseId);

      if (error) {
        // Don't log if it's just empty/permissions - return 0
        if (error.message) {
          console.error('Error counting versions:', error);
        }
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!testCaseId,
  });
}

interface CreateVersionInput {
  testCaseId: string;
  changeSummary?: string;
}

/**
 * Create a new version snapshot of the current test case state
 */
export function useCreateTestCaseVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVersionInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch current test case state
      const { data: testCase, error: caseError } = await supabase
        .from('tm_test_cases')
        .select('*')
        .eq('id', input.testCaseId)
        .single();

      if (caseError) throw caseError;

      // Fetch current steps
      const { data: steps, error: stepsError } = await supabase
        .from('tm_test_steps')
        .select('*')
        .eq('test_case_id', input.testCaseId)
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;

      // Get next version number
      const { data: existingVersions } = await (supabase as any)
        .from('tm_test_case_versions')
        .select('version_number')
        .eq('test_case_id', input.testCaseId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;

      // Create snapshot
      const snapshot: TestCaseVersionSnapshot = {
        title: testCase.title,
        description: testCase.description,
        preconditions: testCase.preconditions,
        status: testCase.status,
        priority_id: testCase.priority_id,
        case_type_id: testCase.case_type_id,
        folder_id: testCase.folder_id,
        steps: (steps || []).map(s => ({
          step_number: s.step_number,
          action: s.action,
          expected_result: s.expected_result || '',
          test_data: s.test_data,
        })),
      };

      // Insert version
      const { data, error } = await (supabase as any)
        .from('tm_test_case_versions')
        .insert({
          test_case_id: input.testCaseId,
          version_number: nextVersion,
          snapshot,
          change_summary: input.changeSummary || null,
          changed_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions', variables.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions-count', variables.testCaseId] });
      catalystToast.success('Version snapshot created');
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to create version', error.message);
    },
  });
}

interface RestoreVersionInput {
  testCaseId: string;
  versionNumber: number;
}

/**
 * Restore a test case to a specific version
 */
export function useRestoreTestCaseVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RestoreVersionInput) => {
      // Fetch the version to restore
      const { data: version, error: versionError } = await (supabase as any)
        .from('tm_test_case_versions')
        .select('snapshot')
        .eq('test_case_id', input.testCaseId)
        .eq('version_number', input.versionNumber)
        .single();

      if (versionError) throw versionError;

      const snapshot = version.snapshot as TestCaseVersionSnapshot;

      // Update the test case
      const { error: updateError } = await supabase
        .from('tm_test_cases')
        .update({
          title: snapshot.title,
          description: snapshot.description,
          preconditions: snapshot.preconditions,
          status: snapshot.status as any,
          priority_id: snapshot.priority_id,
          case_type_id: snapshot.case_type_id,
          folder_id: snapshot.folder_id,
        })
        .eq('id', input.testCaseId);

      if (updateError) throw updateError;

      // Delete existing steps and insert from snapshot
      await supabase
        .from('tm_test_steps')
        .delete()
        .eq('test_case_id', input.testCaseId);

      if (snapshot.steps && snapshot.steps.length > 0) {
        const stepsToInsert = snapshot.steps.map(s => ({
          test_case_id: input.testCaseId,
          step_number: s.step_number,
          action: s.action,
          expected_result: s.expected_result,
          test_data: s.test_data,
        }));

        await supabase
          .from('tm_test_steps')
          .insert(stepsToInsert);
      }

      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', data.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['tm-cases'] });
      catalystToast.success(`Restored to version ${data.versionNumber}`);
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to restore version', error.message);
    },
  });
}
