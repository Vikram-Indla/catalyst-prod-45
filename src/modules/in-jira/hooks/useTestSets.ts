/**
 * Test Sets Hook
 * CRUD operations for test sets with permission checks and audit logging
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';

export interface TestSet {
  id: string;
  key: string;
  name: string;
  objective: string | null;
  folder_id: string | null;
  program_id: string;
  owner_id: string | null;
  status: string | null;
  version: number | null;
  parent_version_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface TestSetWithCount extends TestSet {
  case_count: number;
  last_executed: string | null;
}

export interface CreateTestSetInput {
  name: string;
  objective?: string;
  folder_id?: string;
  program_id: string;
  status?: string;
}

export interface UpdateTestSetInput {
  id: string;
  name?: string;
  objective?: string;
  folder_id?: string;
  status?: string;
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
      entity_type: 'test_set',
      entity_id: entityId,
      entity_title: entityTitle,
      program_id: programId,
      description: description || null,
    });
  } catch (err) {
    console.error('Failed to log test activity:', err);
  }
}

export function useTestSets(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Permission checks
  const { hasPermission: canCreate } = usePermission('test_sets', 'create', 'program', programId || undefined);
  const { hasPermission: canEdit } = usePermission('test_sets', 'edit', 'program', programId || undefined);
  const { hasPermission: canDelete } = usePermission('test_sets', 'delete', 'program', programId || undefined);

  // Fetch test sets with case counts
  const {
    data: testSets,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-sets', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_sets')
        .select(`
          *,
          test_set_cases(count)
        `)
        .order('created_at', { ascending: false });

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform to include case count
      return (data || []).map((set: any) => ({
        ...set,
        case_count: set.test_set_cases?.[0]?.count || 0,
        last_executed: null, // Would need to join with cycles
      })) as TestSetWithCount[];
    },
    enabled: !!user,
  });

  // Create test set
  const createMutation = useMutation({
    mutationFn: async (input: CreateTestSetInput) => {
      if (!user) throw new Error('Not authenticated');
      if (!canCreate) throw new Error('Permission denied: Cannot create test sets');

      // Generate key
      const timestamp = Date.now().toString(36).toUpperCase();
      const key = `TS-${timestamp}`;

      const { data, error } = await supabase
        .from('test_sets')
        .insert({
          key,
          name: input.name,
          objective: input.objective || null,
          folder_id: input.folder_id || null,
          program_id: input.program_id,
          status: input.status || 'active',
          created_by: user.id,
          version: 1,
        })
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await logAuditEntry({
        entityType: 'test_sets',
        entityId: data.id,
        action: 'created',
        afterData: data,
      });

      await logTestActivity(
        user.id,
        'created',
        data.id,
        data.name,
        input.program_id,
        `Created test set "${data.name}"`
      );

      return data as TestSet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success('Test set created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update test set
  const updateMutation = useMutation({
    mutationFn: async (input: UpdateTestSetInput) => {
      if (!user) throw new Error('Not authenticated');
      if (!canEdit) throw new Error('Permission denied: Cannot edit test sets');

      // Get current data for audit
      const { data: before } = await supabase
        .from('test_sets')
        .select('*')
        .eq('id', input.id)
        .single();

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.objective !== undefined) updateData.objective = input.objective;
      if (input.folder_id !== undefined) updateData.folder_id = input.folder_id;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.owner_id !== undefined) updateData.owner_id = input.owner_id;

      const { data, error } = await supabase
        .from('test_sets')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await logAuditEntry({
        entityType: 'test_sets',
        entityId: data.id,
        action: 'updated',
        beforeData: before,
        afterData: data,
      });

      await logTestActivity(
        user.id,
        'updated',
        data.id,
        data.name,
        data.program_id,
        `Updated test set "${data.name}"`
      );

      return data as TestSet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success('Test set updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete test set
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      if (!canDelete) throw new Error('Permission denied: Cannot delete test sets');

      // Get current data for audit
      const { data: before } = await supabase
        .from('test_sets')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('test_sets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Audit log
      await logAuditEntry({
        entityType: 'test_sets',
        entityId: id,
        action: 'deleted',
        beforeData: before,
      });

      await logTestActivity(
        user.id,
        'deleted',
        id,
        before?.name || 'Unknown',
        before?.program_id,
        `Deleted test set "${before?.name}"`
      );

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success('Test set deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Add cases to set
  const addCasesMutation = useMutation({
    mutationFn: async ({ setId, caseIds }: { setId: string; caseIds: string[] }) => {
      if (!user) throw new Error('Not authenticated');

      const inserts = caseIds.map((caseId, index) => ({
        set_id: setId,
        case_id: caseId,
        sort_order: index,
        added_by: user.id,
      }));

      const { error } = await supabase
        .from('test_set_cases')
        .upsert(inserts, { onConflict: 'set_id,case_id' });

      if (error) throw error;

      await logTestActivity(
        user.id,
        'cases_added',
        setId,
        `${caseIds.length} cases`,
        null,
        `Added ${caseIds.length} cases to test set`
      );

      return { setId, caseIds };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success('Cases added to set');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    testSets: testSets || [],
    isLoading,
    error,
    refetch,
    canCreate,
    canEdit,
    canDelete,
    createTestSet: createMutation.mutateAsync,
    updateTestSet: updateMutation.mutateAsync,
    deleteTestSet: deleteMutation.mutateAsync,
    addCasesToSet: addCasesMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
