/**
 * Test Cases Hook
 * CRUD operations for test cases with permission checks and audit logging
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';

export type TestCasePriority = 'critical' | 'high' | 'medium' | 'low';
export type TestCaseStatus = 'draft' | 'under_review' | 'approved' | 'published' | 'deprecated';
export type TestCaseType = 'manual' | 'automated' | 'bdd';

export interface TestCase {
  id: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  expected_result: string | null;
  test_type: TestCaseType;
  priority: TestCasePriority;
  status: TestCaseStatus;
  folder_id: string | null;
  linked_work_item_type: string | null;
  linked_work_item_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  program_id: string | null;
  objective: string | null;
  component: string | null;
  release: string | null;
  estimated_effort: number | null;
  automation_status: string | null;
  automation_owner_id: string | null;
  automation_key: string | null;
  case_type: string | null;
  version: number | null;
  labels: string[] | null;
  owner_id: string | null;
  is_archived: boolean | null;
  deleted_at: string | null;
}

export interface CreateTestCaseInput {
  title: string;
  description?: string;
  preconditions?: string;
  expected_result?: string;
  test_type?: TestCaseType;
  priority?: TestCasePriority;
  status?: TestCaseStatus;
  folder_id?: string;
  linked_work_item_type: 'story'; // Enforced to be story
  linked_work_item_id: string; // Required
  program_id: string;
  objective?: string;
  component?: string;
  labels?: string[];
}

export interface UpdateTestCaseInput {
  id: string;
  title?: string;
  description?: string;
  preconditions?: string;
  expected_result?: string;
  test_type?: TestCaseType;
  priority?: TestCasePriority;
  status?: TestCaseStatus;
  folder_id?: string;
  objective?: string;
  component?: string;
  labels?: string[];
  owner_id?: string;
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
      entity_type: 'test_case',
      entity_id: entityId,
      entity_title: entityTitle,
      program_id: programId,
      description: description || null,
    });
  } catch (err) {
    console.error('Failed to log test activity:', err);
  }
}

export function useTestCases(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Permission checks
  const { hasPermission: canCreate } = usePermission('test_cases', 'create', 'program', programId || undefined);
  const { hasPermission: canEdit } = usePermission('test_cases', 'edit', 'program', programId || undefined);
  const { hasPermission: canDelete } = usePermission('test_cases', 'delete', 'program', programId || undefined);

  // Fetch test cases for program
  const {
    data: testCases,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-cases', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_cases')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TestCase[];
    },
    enabled: !!user,
  });

  // Create test case
  const createMutation = useMutation({
    mutationFn: async (input: CreateTestCaseInput) => {
      if (!user) throw new Error('Not authenticated');
      if (!canCreate) throw new Error('Permission denied: Cannot create test cases');

      // Validate linked story
      if (input.linked_work_item_type !== 'story' || !input.linked_work_item_id) {
        throw new Error('Test case must be linked to a Story');
      }

      // Verify the story exists
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .select('id, story_key')
        .eq('id', input.linked_work_item_id)
        .is('deleted_at', null)
        .single();

      if (storyError || !story) {
        throw new Error('Invalid story link: Story not found');
      }

      const { data, error } = await supabase
        .from('test_cases')
        .insert([{
          title: input.title,
          description: input.description || null,
          preconditions: input.preconditions || null,
          expected_result: input.expected_result || null,
          test_type: (input.test_type || 'manual') as 'manual' | 'automated' | 'bdd',
          priority: (input.priority || 'medium') as 'critical' | 'high' | 'medium' | 'low',
          status: (input.status || 'draft') as 'draft' | 'under_review' | 'approved' | 'published' | 'deprecated',
          folder_id: input.folder_id || null,
          linked_work_item_type: 'story',
          linked_work_item_id: input.linked_work_item_id,
          program_id: input.program_id,
          objective: input.objective || null,
          component: input.component || null,
          labels: input.labels || null,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Create link in test_case_work_items
      await supabase.from('test_case_work_items').insert({
        test_case_id: data.id,
        work_item_id: input.linked_work_item_id,
        work_item_type: 'story',
        link_type: 'tests',
        created_by: user.id,
      });

      // Audit log
      await logAuditEntry({
        entityType: 'test_cases',
        entityId: data.id,
        action: 'created',
        afterData: data,
      });

      await logTestActivity(
        user.id,
        'created',
        data.id,
        data.title,
        input.program_id,
        `Created test case "${data.title}"`
      );

      return data as TestCase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success('Test case created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update test case
  const updateMutation = useMutation({
    mutationFn: async (input: UpdateTestCaseInput) => {
      if (!user) throw new Error('Not authenticated');
      if (!canEdit) throw new Error('Permission denied: Cannot edit test cases');

      // Get current data for audit
      const { data: before } = await supabase
        .from('test_cases')
        .select('*')
        .eq('id', input.id)
        .single();

      const updateData: Record<string, unknown> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.preconditions !== undefined) updateData.preconditions = input.preconditions;
      if (input.expected_result !== undefined) updateData.expected_result = input.expected_result;
      if (input.test_type !== undefined) updateData.test_type = input.test_type;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.folder_id !== undefined) updateData.folder_id = input.folder_id;
      if (input.objective !== undefined) updateData.objective = input.objective;
      if (input.component !== undefined) updateData.component = input.component;
      if (input.labels !== undefined) updateData.labels = input.labels;
      if (input.owner_id !== undefined) updateData.owner_id = input.owner_id;

      const { data, error } = await supabase
        .from('test_cases')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await logAuditEntry({
        entityType: 'test_cases',
        entityId: data.id,
        action: 'updated',
        beforeData: before,
        afterData: data,
      });

      await logTestActivity(
        user.id,
        'updated',
        data.id,
        data.title,
        data.program_id,
        `Updated test case "${data.title}"`
      );

      return data as TestCase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success('Test case updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete test case (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      if (!canDelete) throw new Error('Permission denied: Cannot delete test cases');

      // Get current data for audit
      const { data: before } = await supabase
        .from('test_cases')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('test_cases')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', id);

      if (error) throw error;

      // Audit log
      await logAuditEntry({
        entityType: 'test_cases',
        entityId: id,
        action: 'deleted',
        beforeData: before,
      });

      await logTestActivity(
        user.id,
        'deleted',
        id,
        before?.title || 'Unknown',
        before?.program_id,
        `Deleted test case "${before?.title}"`
      );

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success('Test case deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk delete
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user) throw new Error('Not authenticated');
      if (!canDelete) throw new Error('Permission denied: Cannot delete test cases');

      // Log bulk operation
      await supabase.from('test_case_bulk_operations').insert({
        operation_type: 'bulk_delete',
        case_ids: ids,
        executed_by: user.id,
        status: 'in_progress',
      });

      const { error } = await supabase
        .from('test_cases')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .in('id', ids);

      if (error) throw error;

      // Log each deletion
      for (const id of ids) {
        await logAuditEntry({
          entityType: 'test_cases',
          entityId: id,
          action: 'deleted',
        });
      }

      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast.success(`${ids.length} test case(s) deleted`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    testCases: testCases || [],
    isLoading,
    error,
    refetch,
    canCreate,
    canEdit,
    canDelete,
    createTestCase: createMutation.mutateAsync,
    updateTestCase: updateMutation.mutateAsync,
    deleteTestCase: deleteMutation.mutateAsync,
    bulkDeleteTestCases: bulkDeleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook to fetch stories for linking
export function useStoriesForLinking(projectId: string | null) {
  return useQuery({
    queryKey: ['stories-for-linking', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // Get the project's features first
      const { data: features, error: featuresError } = await supabase
        .from('features')
        .select('id')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      if (featuresError) throw featuresError;
      if (!features?.length) return [];

      const featureIds = features.map(f => f.id);

      // Get stories linked to those features
      const { data: stories, error } = await supabase
        .from('stories')
        .select('id, story_key, title')
        .in('feature_id', featureIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return stories || [];
    },
    enabled: !!projectId,
  });
}
