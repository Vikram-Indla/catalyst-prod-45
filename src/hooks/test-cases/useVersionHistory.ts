// =====================================================
// VERSION HISTORY HOOKS
// Hooks for test case versioning and cloning
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VersionSnapshot {
  title: string;
  description: string | null;
  description_html: string | null;
  preconditions: string | null;
  preconditions_html: string | null;
  postconditions: string | null;
  postconditions_html: string | null;
  status: string;
  priority: string;
  type: string;
  test_format: string | null;
  gherkin_feature: string | null;
  gherkin_scenario: string | null;
  folder_id: string | null;
  steps: Array<{
    step_number: number;
    step_type: string;
    action: string;
    action_html: string | null;
    expected_result: string;
    expected_result_html: string | null;
    test_data: string | null;
    notes: string | null;
    is_optional: boolean;
    estimated_time_seconds: number | null;
  }>;
}

export interface VersionEntry {
  id: string;
  version_number: number;
  change_summary: string | null;
  changed_by: string | null;
  changed_by_name: string;
  created_at: string;
  snapshot: VersionSnapshot;
}

// Hook to get version history
export function useVersionHistory(caseId: string | null) {
  return useQuery({
    queryKey: ['version-history', caseId],
    queryFn: async (): Promise<VersionEntry[]> => {
      if (!caseId) return [];

      const { data, error } = await supabase.rpc('tm_get_version_history', {
        p_case_id: caseId,
      });

      if (error) throw error;
      return (data || []) as unknown as VersionEntry[];
    },
    enabled: !!caseId,
  });
}

// Hook to create version snapshot
export function useCreateVersionSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      changeSummary,
    }: {
      caseId: string;
      changeSummary?: string;
    }) => {
      const { data, error } = await supabase.rpc('tm_create_version_snapshot', {
        p_case_id: caseId,
        p_change_summary: changeSummary || null,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['version-history', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['test-case', variables.caseId] });
    },
  });
}

// Hook to restore a version
export function useRestoreVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      versionNumber,
    }: {
      caseId: string;
      versionNumber: number;
    }) => {
      const { data, error } = await supabase.rpc('tm_restore_version', {
        p_case_id: caseId,
        p_version_number: versionNumber,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['version-history', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['test-case', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-steps', variables.caseId] });
    },
  });
}

// Hook to clone a test case
export function useCloneTestCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      newTitle,
      targetFolderId,
    }: {
      caseId: string;
      newTitle?: string;
      targetFolderId?: string;
    }) => {
      const { data, error } = await supabase.rpc('tm_clone_test_case', {
        p_case_id: caseId,
        p_new_title: newTitle || null,
        p_target_folder_id: targetFolderId || null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
    },
  });
}

// Utility to compare two versions
export function compareVersions(v1: VersionSnapshot, v2: VersionSnapshot): {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}[] {
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
  const fields: (keyof VersionSnapshot)[] = [
    'title', 'description', 'preconditions', 'postconditions', 
    'priority', 'type', 'test_format'
  ];

  for (const field of fields) {
    if (v1[field] !== v2[field]) {
      changes.push({ field, oldValue: v1[field], newValue: v2[field] });
    }
  }

  // Compare steps
  if (JSON.stringify(v1.steps) !== JSON.stringify(v2.steps)) {
    changes.push({ 
      field: 'steps', 
      oldValue: `${v1.steps.length} steps`, 
      newValue: `${v2.steps.length} steps` 
    });
  }

  return changes;
}
