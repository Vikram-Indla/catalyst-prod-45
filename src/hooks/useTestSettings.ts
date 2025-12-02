import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types per documentation
export interface TestCaseStatus {
  id: string;
  program_id: string | null;
  name: string;
  viewable_by_owner_only: boolean;
  eligible_for_cycle_set: boolean;
  eligible_for_linked_step: boolean;
  display_order: number;
  is_default: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestCasePriority {
  id: string;
  program_id: string | null;
  name: string;
  color: string;
  display_order: number;
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestRunStatus {
  id: string;
  program_id: string | null;
  name: string;
  highlight_color: string;
  status_type: 'NOT_RUN' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'BLOCKED';
  execution_completed: boolean;
  display_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestFieldConfiguration {
  id: string;
  program_id: string | null;
  entity_type: 'case' | 'set' | 'cycle' | 'run';
  field_name: string;
  field_label: string;
  is_enabled: boolean;
  is_required: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Case Statuses Hook
export function useTestCaseStatuses(programId?: string) {
  const queryClient = useQueryClient();

  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ['test-case-statuses', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_case_statuses')
        .select('*')
        .order('display_order');
      
      if (programId) {
        query = query.or(`program_id.eq.${programId},program_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TestCaseStatus[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (status: Partial<TestCaseStatus>) => {
      const { data, error } = await supabase
        .from('test_case_statuses')
        .insert(status as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-statuses'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TestCaseStatus> & { id: string }) => {
      const { error } = await supabase
        .from('test_case_statuses')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-statuses'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_case_statuses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-statuses'] });
    },
  });

  return {
    statuses,
    isLoading,
    createStatus: createMutation.mutate,
    updateStatus: updateMutation.mutate,
    deleteStatus: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Case Priorities Hook
export function useTestCasePriorities(programId?: string) {
  const queryClient = useQueryClient();

  const { data: priorities = [], isLoading } = useQuery({
    queryKey: ['test-case-priorities', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_case_priorities')
        .select('*')
        .order('display_order');
      
      if (programId) {
        query = query.or(`program_id.eq.${programId},program_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TestCasePriority[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (priority: Partial<TestCasePriority>) => {
      const { data, error } = await supabase
        .from('test_case_priorities')
        .insert(priority as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-priorities'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TestCasePriority> & { id: string }) => {
      const { error } = await supabase
        .from('test_case_priorities')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-priorities'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_case_priorities')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-priorities'] });
    },
  });

  return {
    priorities,
    isLoading,
    createPriority: createMutation.mutate,
    updatePriority: updateMutation.mutate,
    deletePriority: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Run Statuses Hook
export function useTestRunStatuses(programId?: string) {
  const queryClient = useQueryClient();

  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ['test-run-statuses', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_run_statuses')
        .select('*')
        .order('display_order');
      
      if (programId) {
        query = query.or(`program_id.eq.${programId},program_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TestRunStatus[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (status: Partial<TestRunStatus>) => {
      const { data, error } = await supabase
        .from('test_run_statuses')
        .insert(status as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-run-statuses'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TestRunStatus> & { id: string }) => {
      const { error } = await supabase
        .from('test_run_statuses')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-run-statuses'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_run_statuses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-run-statuses'] });
    },
  });

  return {
    statuses,
    isLoading,
    createStatus: createMutation.mutate,
    updateStatus: updateMutation.mutate,
    deleteStatus: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Field Configurations Hook
export function useTestFieldConfigurations(programId?: string, entityType?: string) {
  const queryClient = useQueryClient();

  const { data: configurations = [], isLoading } = useQuery({
    queryKey: ['test-field-configurations', programId, entityType],
    queryFn: async () => {
      let query = supabase
        .from('test_field_configurations')
        .select('*')
        .order('display_order');
      
      if (programId) {
        query = query.or(`program_id.eq.${programId},program_id.is.null`);
      }
      
      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TestFieldConfiguration[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (config: Partial<TestFieldConfiguration>) => {
      const { data, error } = await supabase
        .from('test_field_configurations')
        .upsert(config as any, { onConflict: 'program_id,entity_type,field_name' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-field-configurations'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TestFieldConfiguration> & { id: string }) => {
      const { error } = await supabase
        .from('test_field_configurations')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-field-configurations'] });
    },
  });

  return {
    configurations,
    isLoading,
    upsertConfiguration: upsertMutation.mutate,
    updateConfiguration: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
