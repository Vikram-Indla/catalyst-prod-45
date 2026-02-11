import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TestSet, TestSetFilters, CreateTestSetInput, UpdateTestSetInput } from '@/types/test-sets';
import { toast } from 'sonner';

export function useTestSets(projectId: string, filters?: TestSetFilters) {
  return useQuery({
    queryKey: ['test-sets', projectId, filters],
    queryFn: async () => {
      let query = supabase
        .from('tm_test_sets' as any)
        .select('*, owner:profiles!tm_test_sets_owner_id_fkey(id, full_name, avatar_url)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,set_key.ilike.%${filters.search}%`);
      }
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('set_type', filters.type);
      }
      if (filters?.status === 'active') {
        query = query.eq('is_active', true);
      } else if (filters?.status === 'archived') {
        query = query.eq('is_active', false);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data as any[]) as TestSet[];
    },
    enabled: !!projectId,
  });
}

export function useTestSet(setId: string) {
  return useQuery({
    queryKey: ['test-set', setId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_test_sets' as any)
        .select('*, owner:profiles!tm_test_sets_owner_id_fkey(id, full_name, avatar_url)')
        .eq('id', setId)
        .single();
      if (error) throw new Error(error.message);
      return data as any as TestSet;
    },
    enabled: !!setId,
  });
}

export function useTestSetCases(setId: string) {
  return useQuery({
    queryKey: ['test-set-cases', setId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_test_set_cases' as any)
        .select('id, sort_order, added_at, test_case:tm_test_cases(id, case_key, title, status, priority:tm_case_priorities(id, name))')
        .eq('test_set_id', setId)
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data as any[];
    },
    enabled: !!setId,
  });
}

export function useCreateTestSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTestSetInput) => {
      const { data, error } = await supabase
        .from('tm_test_sets' as any)
        .insert({
          name: input.name,
          description: input.description || null,
          set_type: input.set_type,
          membership_type: input.membership_type,
          dynamic_criteria: input.membership_type === 'dynamic' ? input.dynamic_criteria : null,
          project_id: input.project_id,
          owner_id: input.owner_id,
          created_by: input.created_by,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success('Test set created');
    },
    onError: (e) => { toast.error('Failed to create test set'); console.error(e); },
  });
}

export function useUpdateTestSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: input }: { id: string; data: UpdateTestSetInput }) => {
      const { data, error } = await supabase
        .from('tm_test_sets' as any)
        .update({
          name: input.name,
          description: input.description || null,
          set_type: input.set_type,
          membership_type: input.membership_type,
          dynamic_criteria: input.membership_type === 'dynamic' ? input.dynamic_criteria : null,
          owner_id: input.owner_id,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      queryClient.invalidateQueries({ queryKey: ['test-set'] });
      toast.success('Test set updated');
    },
    onError: (e) => { toast.error('Failed to update test set'); console.error(e); },
  });
}

export function useDeleteTestSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (setId: string) => {
      const { error } = await supabase.from('tm_test_sets' as any).delete().eq('id', setId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success('Test set deleted');
    },
    onError: (e) => { toast.error('Failed to delete test set'); console.error(e); },
  });
}

export function useRefreshDynamicSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (setId: string) => {
      const { data, error } = await supabase.rpc('refresh_dynamic_test_set' as any, { p_set_id: setId });
      if (error) throw new Error(error.message);
      return data as any;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      queryClient.invalidateQueries({ queryKey: ['test-set-cases'] });
      toast.success(`Refreshed: ${data?.added || 0} test cases matched`);
    },
    onError: (e) => { toast.error('Failed to refresh'); console.error(e); },
  });
}

export function useAddTestCasesToSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ setId, testCaseIds, addedBy }: { setId: string; testCaseIds: string[]; addedBy?: string }) => {
      const { data: existing } = await supabase
        .from('tm_test_set_cases' as any)
        .select('sort_order')
        .eq('test_set_id', setId)
        .order('sort_order', { ascending: false })
        .limit(1);
      const startOrder = ((existing as any)?.[0]?.sort_order ?? -1) + 1;

      const { error } = await supabase
        .from('tm_test_set_cases' as any)
        .insert(testCaseIds.map((tcId, i) => ({
          test_set_id: setId,
          test_case_id: tcId,
          sort_order: startOrder + i,
          added_by: addedBy,
        })));
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { setId }) => {
      queryClient.invalidateQueries({ queryKey: ['test-set-cases', setId] });
      queryClient.invalidateQueries({ queryKey: ['test-set', setId] });
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success('Test cases added');
    },
    onError: (e) => { toast.error('Failed to add test cases'); console.error(e); },
  });
}

export function useRemoveTestCasesFromSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ setId, testCaseIds }: { setId: string; testCaseIds: string[] }) => {
      const { error } = await supabase
        .from('tm_test_set_cases' as any)
        .delete()
        .eq('test_set_id', setId)
        .in('test_case_id', testCaseIds);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { setId }) => {
      queryClient.invalidateQueries({ queryKey: ['test-set-cases', setId] });
      queryClient.invalidateQueries({ queryKey: ['test-set', setId] });
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success('Test cases removed');
    },
    onError: (e) => { toast.error('Failed to remove test cases'); console.error(e); },
  });
}

export function useReorderTestSetCases() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ setId, orderedIds }: { setId: string; orderedIds: string[] }) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from('tm_test_set_cases' as any).update({ sort_order: index }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: (_, { setId }) => {
      queryClient.invalidateQueries({ queryKey: ['test-set-cases', setId] });
    },
    onError: (e) => { toast.error('Failed to reorder'); console.error(e); },
  });
}

export function useCloneTestSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ setId }: { setId: string }) => {
      const { data: original, error: fetchErr } = await supabase
        .from('tm_test_sets' as any).select('*').eq('id', setId).single();
      if (fetchErr) throw new Error(fetchErr.message);
      const orig = original as any;

      const { data: newSet, error: createErr } = await supabase
        .from('tm_test_sets' as any)
        .insert({
          name: `${orig.name} (Copy)`,
          description: orig.description,
          set_type: orig.set_type,
          membership_type: orig.membership_type,
          dynamic_criteria: orig.dynamic_criteria,
          project_id: orig.project_id,
          owner_id: orig.owner_id,
          created_by: orig.created_by,
        })
        .select().single();
      if (createErr) throw new Error(createErr.message);

      if (orig.membership_type === 'static') {
        const { data: cases } = await supabase
          .from('tm_test_set_cases' as any).select('test_case_id, sort_order').eq('test_set_id', setId);
        if (cases && (cases as any[]).length > 0) {
          await supabase.from('tm_test_set_cases' as any).insert(
            (cases as any[]).map(c => ({ test_set_id: (newSet as any).id, test_case_id: c.test_case_id, sort_order: c.sort_order }))
          );
        }
      }
      return newSet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success('Test set cloned');
    },
    onError: (e) => { toast.error('Failed to clone'); console.error(e); },
  });
}

export function useArchiveTestSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ setId, archive }: { setId: string; archive: boolean }) => {
      const { error } = await supabase.from('tm_test_sets' as any).update({ is_active: !archive }).eq('id', setId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success(archive ? 'Test set archived' : 'Test set restored');
    },
    onError: (e) => { toast.error('Failed to update'); console.error(e); },
  });
}

export function useAvailableTestCases(projectId: string, excludeIds: string[], filters?: { search?: string; folderId?: string; priority?: string }) {
  return useQuery({
    queryKey: ['available-test-cases', projectId, excludeIds, filters],
    queryFn: async () => {
      let query = supabase
        .from('tm_test_cases' as any)
        .select('id, case_key, title, status, priority:tm_case_priorities(id, name), folder_id, folder:tm_folders(id, name)')
        .eq('project_id', projectId)
        .neq('status', 'deprecated')
        .order('case_key', { ascending: true });

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,case_key.ilike.%${filters.search}%`);
      }
      if (filters?.folderId && filters.folderId !== 'all') {
        query = query.eq('folder_id', filters.folderId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw new Error(error.message);
      return data as any[];
    },
    enabled: !!projectId,
  });
}
