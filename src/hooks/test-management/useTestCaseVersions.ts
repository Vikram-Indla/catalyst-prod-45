/**
 * Hook for managing test case versions
 * Queries tm_test_case_versions table
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
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
  steps?: any[];
  changed_fields?: string[];
}

/**
 * Fetch all versions for a test case
 */
export function useTestCaseVersions(testCaseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-versions', testCaseId],
    queryFn: async (): Promise<TestCaseVersion[]> => {
      if (!testCaseId) return [];

      const { data, error } = await typedQuery('tm_test_case_versions')
        .select(`
          id,
          test_case_id,
          version_number,
          snapshot,
          change_summary,
          changed_by,
          created_at,
          steps,
          changed_fields,
          changed_by_profile:profiles!tm_test_case_versions_changed_by_fkey(id, full_name, avatar_url)
        `)
        .eq('test_case_id', testCaseId)
        .order('version_number', { ascending: false });

      if (error) {
        console.error('Error fetching versions:', error);
        // If the join fails, try without profile
        const { data: fallbackData, error: fallbackError } = await typedQuery('tm_test_case_versions')
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
        steps: v.steps || [],
        changed_fields: v.changed_fields || [],
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

      const { count, error } = await typedQuery('tm_test_case_versions')
        .select('*', { count: 'exact', head: true })
        .eq('test_case_id', testCaseId);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!testCaseId,
  });
}

interface RestoreVersionInput {
  testCaseId: string;
  versionNumber: number;
}

/**
 * Restore a test case to a specific version.
 *
 * P1-S4 / VER-003/004: restore is snapshot-first and append-only — it never
 * rewrites history. The old implementation hard-DELETEd every live step
 * (destroying step identity, and — before P1-S1's soft-delete — silently
 * wiping execution history via CASCADE) then reinserted from the snapshot.
 * Restore now soft-deletes current steps, inserts fresh rows matching the
 * target snapshot, and records the restore itself as a NEW version via the
 * canonical RPC — "restore to v2" reads as "v(latest+1) == v2's content" in
 * the version list, never as a rewrite of the past.
 */
export function useRestoreTestCaseVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RestoreVersionInput) => {
      const { data: version, error: versionError } = await typedQuery('tm_test_case_versions')
        .select('snapshot')
        .eq('test_case_id', input.testCaseId)
        .eq('version_number', input.versionNumber)
        .single();

      if (versionError) throw versionError;

      const snapshot = version.snapshot as TestCaseVersionSnapshot;

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

      // Soft-delete current steps (P1-S1) — never destroy step history.
      const { error: archiveStepsError } = await supabase
        .from('tm_test_steps')
        .update({ deleted_at: new Date().toISOString() })
        .eq('test_case_id', input.testCaseId)
        .is('deleted_at', null);

      if (archiveStepsError) throw archiveStepsError;

      if (snapshot.steps && snapshot.steps.length > 0) {
        const stepsToInsert = snapshot.steps.map(s => ({
          test_case_id: input.testCaseId,
          step_number: s.step_number,
          action: s.action,
          expected_result: s.expected_result,
          test_data: s.test_data,
        }));

        const { error: insertStepsError } = await supabase
          .from('tm_test_steps')
          .insert(stepsToInsert);

        if (insertStepsError) throw insertStepsError;
      }

      // Record the restore as a new version (P1-S3 canonical writer) —
      // append-only history, never a rewrite of the restored-from version.
      const { error: snapshotError } = await supabase.rpc('tm_create_version_snapshot', {
        p_case_id: input.testCaseId,
        p_change_summary: `Restored to version ${input.versionNumber}`,
      });

      if (snapshotError) throw snapshotError;

      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', data.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions', data.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions-count', data.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['tm-cases'] });
      catalystToast.success(`Restored to version ${data.versionNumber}`);
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to restore version', error.message);
    },
  });
}
