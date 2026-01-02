/**
 * Test Set Versions Hook
 * Manages version history, snapshots, and comparisons
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface TestSetVersion {
  id: string;
  set_id: string;
  version: number;
  name: string;
  description: string | null;
  objective: string | null;
  is_smart_set: boolean;
  smart_set_criteria: Record<string, unknown> | null;
  snapshot_cases: string[] | null;
  change_summary: string | null;
  created_at: string;
  created_by: string | null;
}

export interface VersionDiff {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
  type: 'text' | 'array' | 'json' | 'boolean';
}

export function useTestSetVersions(setId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all versions for a set
  const {
    data: versions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-set-versions', setId],
    queryFn: async () => {
      if (!setId) return [];
      
      const { data, error } = await supabase
        .from('test_set_versions')
        .select('*')
        .eq('set_id', setId)
        .order('version', { ascending: false });
      
      if (error) throw error;
      return (data || []) as TestSetVersion[];
    },
    enabled: !!setId && !!user,
  });

  // Create a new version snapshot
  const createVersionMutation = useMutation({
    mutationFn: async ({
      setId,
      changeSummary,
    }: {
      setId: string;
      changeSummary: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Get current set data
      const { data: currentSet, error: setError } = await supabase
        .from('test_sets')
        .select('*')
        .eq('id', setId)
        .single();

      if (setError) throw setError;

      // Get current cases
      const { data: currentCases } = await supabase
        .from('test_set_cases')
        .select('case_id')
        .eq('set_id', setId);

      const caseIds = (currentCases || []).map(c => c.case_id);

      // Calculate next version
      const { data: latestVersion } = await supabase
        .from('test_set_versions')
        .select('version')
        .eq('set_id', setId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const nextVersion = (latestVersion?.version || 0) + 1;

      // Create version snapshot
      const { data: version, error: versionError } = await supabase
        .from('test_set_versions')
        .insert({
          set_id: setId,
          version: nextVersion,
          name: currentSet.name,
          description: currentSet.description,
          objective: currentSet.objective,
          is_smart_set: currentSet.is_smart_set,
          smart_set_criteria: currentSet.smart_set_criteria,
          snapshot_cases: caseIds,
          change_summary: changeSummary,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (versionError) throw versionError;

      // Update set version number
      await supabase
        .from('test_sets')
        .update({ version: nextVersion })
        .eq('id', setId);

      return version as TestSetVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-set-versions'] });
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success('Version snapshot created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Compare two versions and return differences
  const compareVersions = (v1: TestSetVersion, v2: TestSetVersion): VersionDiff[] => {
    const diffs: VersionDiff[] = [];

    if (v1.name !== v2.name) {
      diffs.push({
        field: 'name',
        label: 'Name',
        before: v1.name,
        after: v2.name,
        type: 'text',
      });
    }

    if (v1.description !== v2.description) {
      diffs.push({
        field: 'description',
        label: 'Description',
        before: v1.description,
        after: v2.description,
        type: 'text',
      });
    }

    if (v1.objective !== v2.objective) {
      diffs.push({
        field: 'objective',
        label: 'Objective',
        before: v1.objective,
        after: v2.objective,
        type: 'text',
      });
    }

    if (v1.is_smart_set !== v2.is_smart_set) {
      diffs.push({
        field: 'is_smart_set',
        label: 'Smart Set',
        before: v1.is_smart_set,
        after: v2.is_smart_set,
        type: 'boolean',
      });
    }

    // Compare cases
    const cases1 = v1.snapshot_cases || [];
    const cases2 = v2.snapshot_cases || [];
    const added = cases2.filter(c => !cases1.includes(c));
    const removed = cases1.filter(c => !cases2.includes(c));

    if (added.length > 0 || removed.length > 0) {
      diffs.push({
        field: 'cases',
        label: 'Test Cases',
        before: { count: cases1.length, removed },
        after: { count: cases2.length, added },
        type: 'array',
      });
    }

    // Compare criteria
    if (JSON.stringify(v1.smart_set_criteria) !== JSON.stringify(v2.smart_set_criteria)) {
      diffs.push({
        field: 'smart_set_criteria',
        label: 'Smart Set Criteria',
        before: v1.smart_set_criteria,
        after: v2.smart_set_criteria,
        type: 'json',
      });
    }

    return diffs;
  };

  return {
    versions: versions || [],
    isLoading,
    error,
    refetch,
    createVersion: createVersionMutation.mutateAsync,
    isCreatingVersion: createVersionMutation.isPending,
    compareVersions,
  };
}
