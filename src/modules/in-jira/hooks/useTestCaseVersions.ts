/**
 * Test Case Versions Hook
 * Manages version history, snapshots, and diff comparisons
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';

export interface TestCaseVersion {
  id: string;
  case_id: string;
  version: number;
  title: string;
  objective: string | null;
  preconditions: string | null;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
  status: string | null;
  priority: string | null;
  owner_id: string | null;
  folder_id: string | null;
  component: string | null;
  release: string | null;
  labels: string[] | null;
  snapshot_data: Record<string, unknown> | null;
}

export interface VersionDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface CreateVersionInput {
  caseId: string;
  changeSummary: string;
  snapshotData?: Record<string, unknown>;
}

async function logTestActivity(
  userId: string | undefined,
  activityType: string,
  entityId: string,
  entityTitle: string,
  programId: string | null,
  description?: string
) {
  try {
    await supabase.from('test_activity_log').insert({
      user_id: userId,
      activity_type: activityType,
      entity_type: 'test_case_version',
      entity_id: entityId,
      entity_title: entityTitle,
      program_id: programId,
      description: description || null,
    });
  } catch (err) {
    console.error('Failed to log test activity:', err);
  }
}

export function useTestCaseVersions(caseId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all versions for a test case
  const {
    data: versions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-case-versions', caseId],
    queryFn: async () => {
      if (!caseId) return [];

      const { data, error } = await supabase
        .from('test_case_versions')
        .select('*')
        .eq('case_id', caseId)
        .order('version', { ascending: false });

      if (error) throw error;
      return data as TestCaseVersion[];
    },
    enabled: !!caseId && !!user,
  });

  // Get the current test case for comparison
  const { data: currentCase } = useQuery({
    queryKey: ['test-case-current', caseId],
    queryFn: async () => {
      if (!caseId) return null;

      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!caseId && !!user,
  });

  // Create a new version (snapshot current state before update)
  const createVersionMutation = useMutation({
    mutationFn: async (input: CreateVersionInput) => {
      if (!user) throw new Error('Not authenticated');

      // Get current test case data
      const { data: testCase, error: fetchError } = await supabase
        .from('test_cases')
        .select('*')
        .eq('id', input.caseId)
        .single();

      if (fetchError || !testCase) throw new Error('Test case not found');

      // Calculate next version number
      const currentVersion = testCase.version || 1;
      const nextVersion = currentVersion + 1;

      // Create version snapshot - prepare snapshot data as proper JSON
      const snapshotPayload = input.snapshotData ? JSON.parse(JSON.stringify(input.snapshotData)) : {
        description: testCase.description,
        expected_result: testCase.expected_result,
        test_type: testCase.test_type,
        automation_status: testCase.automation_status,
      };

      const { data: versionData, error: versionError } = await supabase
        .from('test_case_versions')
        .insert([{
          case_id: input.caseId,
          version: currentVersion,
          title: testCase.title,
          objective: testCase.objective,
          preconditions: testCase.preconditions,
          change_summary: input.changeSummary,
          created_by: user.id,
          status: testCase.status,
          priority: testCase.priority,
          owner_id: testCase.owner_id,
          folder_id: testCase.folder_id,
          component: testCase.component,
          release: testCase.release,
          labels: testCase.labels,
          snapshot_data: snapshotPayload,
        }])
        .select()
        .single();

      if (versionError) throw versionError;

      // Update the test case version number
      await supabase
        .from('test_cases')
        .update({ version: nextVersion })
        .eq('id', input.caseId);

      // Audit log
      await logAuditEntry({
        entityType: 'test_case_versions',
        entityId: versionData.id,
        action: 'created',
        afterData: versionData,
      });

      await logTestActivity(
        user.id,
        'version_created',
        versionData.id,
        testCase.title,
        testCase.program_id,
        `Created version ${currentVersion} of "${testCase.title}"`
      );

      return versionData as TestCaseVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-versions'] });
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success('Version snapshot created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Compare two versions and return diff
  const compareVersions = (v1: TestCaseVersion, v2: TestCaseVersion): VersionDiff[] => {
    const diffs: VersionDiff[] = [];
    const fieldsToCompare = [
      'title', 'objective', 'preconditions', 'status', 'priority',
      'component', 'release', 'labels'
    ];

    for (const field of fieldsToCompare) {
      const oldVal = v1[field as keyof TestCaseVersion];
      const newVal = v2[field as keyof TestCaseVersion];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diffs.push({
          field,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }

    // Compare snapshot data if present
    if (v1.snapshot_data && v2.snapshot_data) {
      for (const key of Object.keys(v1.snapshot_data)) {
        if (JSON.stringify(v1.snapshot_data[key]) !== JSON.stringify(v2.snapshot_data[key])) {
          diffs.push({
            field: key,
            oldValue: v1.snapshot_data[key],
            newValue: v2.snapshot_data[key],
          });
        }
      }
    }

    return diffs;
  };

  // Compare a version to current state
  const compareToCurrentVersion = (version: TestCaseVersion): VersionDiff[] => {
    if (!currentCase) return [];

    const diffs: VersionDiff[] = [];
    const fieldsToCompare = [
      'title', 'objective', 'preconditions', 'status', 'priority',
      'component', 'release', 'labels'
    ];

    for (const field of fieldsToCompare) {
      const oldVal = version[field as keyof TestCaseVersion];
      const newVal = currentCase[field as keyof typeof currentCase];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diffs.push({
          field,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }

    return diffs;
  };

  return {
    versions: versions || [],
    isLoading,
    error,
    refetch,
    currentVersion: currentCase?.version || 1,
    createVersion: createVersionMutation.mutateAsync,
    isCreatingVersion: createVersionMutation.isPending,
    compareVersions,
    compareToCurrentVersion,
  };
}
