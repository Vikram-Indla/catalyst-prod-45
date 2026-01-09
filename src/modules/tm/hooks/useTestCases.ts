/**
 * useTestCases - Test Case CRUD & queries
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TMTestCase, TMSortState, TestCaseCreateInput, TestCaseUpdateInput } from '../types';

interface UseTestCasesOptions {
  folderId?: string | null;
  search?: string;
  sort?: TMSortState;
}

export function useTestCases(options: UseTestCasesOptions = {}) {
  const { folderId, search, sort } = options;

  return useQuery({
    queryKey: ['tm-test-cases', folderId, search, sort],
    queryFn: async () => {
      let query = supabase
        .from('tm_test_cases')
        .select('*');

      // Filter by folder
      if (folderId === 'root') {
        query = query.is('folder_id', null);
      } else if (folderId) {
        query = query.eq('folder_id', folderId);
      }

      // Search by key or title
      if (search) {
        query = query.or(`case_key.ilike.%${search}%,title.ilike.%${search}%`);
      }

      // Sort
      if (sort) {
        const column = sort.column === 'key' ? 'case_key' : 
                       sort.column === 'title' ? 'title' : 
                       sort.column === 'status' ? 'status' : 
                       sort.column === 'priority' ? 'priority_id' : 'created_at';
        query = query.order(column, { ascending: sort.direction === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform to typed objects (map DB columns to our interface)
      return (data || []).map(tc => ({
        id: tc.id,
        folderId: tc.folder_id,
        key: tc.case_key,
        title: tc.title,
        description: tc.description,
        status: tc.status as TMTestCase['status'],
        priority: 'P3' as TMTestCase['priority'], // Default - would need priority lookup
        type: 'functional' as TMTestCase['type'], // Default - would need type lookup
        estimatedTime: tc.estimated_time,
        automationStatus: tc.automation_status as TMTestCase['automationStatus'],
        tags: null,
        assigneeId: tc.created_by, // No assignee_id column in DB yet
        createdBy: tc.created_by,
        createdAt: tc.created_at,
        updatedAt: tc.updated_at,
      })) as TMTestCase[];
    },
    staleTime: 30000,
  });
}

export function useCreateTestCase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: TestCaseCreateInput) => {
      // Get default project - for now we'll skip project requirement
      const { data, error } = await supabase
        .from('tm_test_cases')
        .insert({
          case_key: `TC-${Date.now()}`, // Temporary - should use DB trigger
          title: input.title,
          folder_id: input.folderId || null,
          description: input.description || null,
          status: input.status || 'draft',
          owner_id: input.assigneeId || null,
          project_id: '00000000-0000-0000-0000-000000000000', // Placeholder
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders'] });
      toast({ title: 'Test case created', description: `${data.case_key} - ${data.title}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create test case', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateTestCase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: TestCaseUpdateInput) => {
      const { id, ...updates } = input;
      
      const updateData: Record<string, unknown> = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.folderId !== undefined) updateData.folder_id = updates.folderId;
      if (updates.assigneeId !== undefined) updateData.assignee_id = updates.assigneeId;
      if (updates.tags !== undefined) updateData.tags = updates.tags;

      const { data, error } = await supabase
        .from('tm_test_cases')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders'] });
      toast({ title: 'Test case updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update test case', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteTestCase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tm_test_cases')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders'] });
      toast({ title: 'Test case deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete test case', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkDeleteTestCases() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('tm_test_cases')
        .delete()
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['tm-test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders'] });
      toast({ title: `${ids.length} test case(s) deleted` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete test cases', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkMoveTestCases() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ids, folderId }: { ids: string[]; folderId: string | null }) => {
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ folder_id: folderId })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders'] });
      toast({ title: `${ids.length} test case(s) moved` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to move test cases', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: 'draft' | 'ready' | 'approved' | 'deprecated' }) => {
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ status })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-test-cases'] });
      toast({ title: `${ids.length} test case(s) updated` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDuplicateTestCase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First fetch the original
      const { data: original, error: fetchError } = await supabase
        .from('tm_test_cases')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Create copy
      const { data, error } = await supabase
        .from('tm_test_cases')
        .insert({
          case_key: `TC-${Date.now()}`,
          title: `${original.title} (Copy)`,
          folder_id: original.folder_id,
          description: original.description,
          status: 'draft',
          project_id: original.project_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders'] });
      toast({ title: 'Test case duplicated', description: `Created ${data.case_key}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to duplicate test case', description: error.message, variant: 'destructive' });
    },
  });
}
