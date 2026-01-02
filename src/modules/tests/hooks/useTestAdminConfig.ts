/**
 * Test Admin Configuration Hook
 * CRUD operations for test configuration: types, statuses, priorities, fields
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// ==================== TYPES ====================

export interface TestCaseType {
  id: string;
  program_id: string | null;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_default: boolean;
  is_system: boolean;
  display_order: number;
}

export interface TestCaseStatus {
  id: string;
  program_id: string | null;
  name: string;
  viewable_by_owner_only: boolean;
  eligible_for_cycle_set: boolean;
  eligible_for_linked_step: boolean;
  is_default: boolean;
  is_system: boolean;
  display_order: number;
}

export interface TestCasePriority {
  id: string;
  program_id: string | null;
  name: string;
  description: string | null;
  color: string;
  weight: number;
  is_default: boolean;
  is_system: boolean;
  display_order: number;
}

export interface TestRunStatus {
  id: string;
  program_id: string | null;
  name: string;
  highlight_color: string | null;
  status_type: string | null;
  execution_completed: boolean;
  is_system: boolean;
  display_order: number;
}

export interface TestFieldConfig {
  id: string;
  program_id: string | null;
  entity_type: string;
  field_name: string;
  field_label: string;
  is_enabled: boolean;
  is_required: boolean;
  display_order: number;
}

export interface TestAdminSetting {
  id: string;
  program_id: string;
  setting_key: string;
  setting_value: Record<string, unknown>;
}

// Create input types
interface CreateCaseTypeInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_default?: boolean;
  display_order?: number;
}

interface CreateCaseStatusInput {
  name: string;
  viewable_by_owner_only?: boolean;
  eligible_for_cycle_set?: boolean;
  eligible_for_linked_step?: boolean;
  is_default?: boolean;
  display_order?: number;
}

interface CreateCasePriorityInput {
  name: string;
  description?: string;
  color?: string;
  is_default?: boolean;
  display_order?: number;
}

interface CreateRunStatusInput {
  name: string;
  status_type: string;
  highlight_color?: string;
  execution_completed?: boolean;
  display_order?: number;
}

interface CreateFieldConfigInput {
  entity_type: string;
  field_name: string;
  field_label: string;
  is_enabled?: boolean;
  is_required?: boolean;
  display_order?: number;
}

// ==================== HOOK ====================

export function useTestAdminConfig(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // =============== CASE TYPES ===============
  const { data: caseTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['test-case-types', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_case_types')
        .select('*')
        .order('display_order');

      if (programId) {
        query = query.or(`program_id.eq.${programId},program_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TestCaseType[];
    },
    enabled: !!user,
  });

  const createCaseType = useMutation({
    mutationFn: async (input: CreateCaseTypeInput) => {
      const { data, error } = await supabase
        .from('test_case_types')
        .insert([{
          name: input.name,
          description: input.description || null,
          color: input.color || '#6B7280',
          icon: input.icon || 'file-text',
          is_default: input.is_default || false,
          display_order: input.display_order || 0,
          program_id: programId,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-types'] });
      toast.success('Case type created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCaseType = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateCaseTypeInput>) => {
      const { error } = await supabase
        .from('test_case_types')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-types'] });
      toast.success('Case type updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCaseType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_case_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-types'] });
      toast.success('Case type deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // =============== CASE STATUSES ===============
  const { data: caseStatuses = [], isLoading: statusesLoading } = useQuery({
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
      return (data || []) as TestCaseStatus[];
    },
    enabled: !!user,
  });

  const createCaseStatus = useMutation({
    mutationFn: async (input: CreateCaseStatusInput) => {
      const { data, error } = await supabase
        .from('test_case_statuses')
        .insert([{
          name: input.name,
          viewable_by_owner_only: input.viewable_by_owner_only || false,
          eligible_for_cycle_set: input.eligible_for_cycle_set ?? true,
          eligible_for_linked_step: input.eligible_for_linked_step ?? true,
          is_default: input.is_default || false,
          display_order: input.display_order || 0,
          program_id: programId,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-statuses'] });
      toast.success('Case status created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCaseStatus = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateCaseStatusInput>) => {
      const { error } = await supabase
        .from('test_case_statuses')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-statuses'] });
      toast.success('Case status updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCaseStatus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_case_statuses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-statuses'] });
      toast.success('Case status deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // =============== CASE PRIORITIES ===============
  const { data: casePriorities = [], isLoading: prioritiesLoading } = useQuery({
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
      // Map to our interface
      return (data || []).map((d: any) => ({
        id: d.id,
        program_id: d.program_id,
        name: d.name,
        description: d.description || null,
        color: d.color || '#6B7280',
        weight: d.weight || 1,
        is_default: d.is_default || false,
        is_system: d.is_system || false,
        display_order: d.display_order || 0,
      })) as TestCasePriority[];
    },
    enabled: !!user,
  });

  const createCasePriority = useMutation({
    mutationFn: async (input: CreateCasePriorityInput) => {
      const { data, error } = await supabase
        .from('test_case_priorities')
        .insert([{
          name: input.name,
          color: input.color || '#6B7280',
          is_default: input.is_default || false,
          display_order: input.display_order || 0,
          program_id: programId,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-priorities'] });
      toast.success('Priority created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCasePriority = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateCasePriorityInput>) => {
      const { error } = await supabase
        .from('test_case_priorities')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-priorities'] });
      toast.success('Priority updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCasePriority = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_case_priorities')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-priorities'] });
      toast.success('Priority deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // =============== RUN STATUSES ===============
  const { data: runStatuses = [], isLoading: runStatusesLoading } = useQuery({
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
      return (data || []) as TestRunStatus[];
    },
    enabled: !!user,
  });

  const createRunStatus = useMutation({
    mutationFn: async (input: CreateRunStatusInput) => {
      const { data, error } = await supabase
        .from('test_run_statuses')
        .insert([{
          name: input.name,
          status_type: input.status_type,
          highlight_color: input.highlight_color || null,
          execution_completed: input.execution_completed || false,
          display_order: input.display_order || 0,
          program_id: programId,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-run-statuses'] });
      toast.success('Run status created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRunStatus = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateRunStatusInput>) => {
      const { error } = await supabase
        .from('test_run_statuses')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-run-statuses'] });
      toast.success('Run status updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRunStatus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_run_statuses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-run-statuses'] });
      toast.success('Run status deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // =============== FIELD CONFIGURATIONS ===============
  const { data: fieldConfigs = [], isLoading: fieldsLoading } = useQuery({
    queryKey: ['test-field-configurations', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_field_configurations')
        .select('*')
        .order('entity_type')
        .order('display_order');

      if (programId) {
        query = query.or(`program_id.eq.${programId},program_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TestFieldConfig[];
    },
    enabled: !!user,
  });

  const updateFieldConfig = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{ is_enabled: boolean; is_required: boolean; display_order: number }>) => {
      const { error } = await supabase
        .from('test_field_configurations')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-field-configurations'] });
      toast.success('Field configuration updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createFieldConfig = useMutation({
    mutationFn: async (input: CreateFieldConfigInput) => {
      const { data, error } = await supabase
        .from('test_field_configurations')
        .insert([{
          entity_type: input.entity_type,
          field_name: input.field_name,
          field_label: input.field_label,
          is_enabled: input.is_enabled ?? true,
          is_required: input.is_required || false,
          display_order: input.display_order || 0,
          program_id: programId,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-field-configurations'] });
      toast.success('Field configuration created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // =============== ADMIN SETTINGS ===============
  const { data: adminSettings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['test-admin-settings', programId],
    queryFn: async () => {
      if (!programId) return [];
      
      const { data, error } = await supabase
        .from('test_admin_settings')
        .select('*')
        .eq('program_id', programId);

      if (error) throw error;
      return (data || []) as TestAdminSetting[];
    },
    enabled: !!user && !!programId,
  });

  const getSetting = (key: string): Record<string, unknown> | null => {
    const setting = adminSettings.find(s => s.setting_key === key);
    return setting?.setting_value || null;
  };

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, unknown> }) => {
      if (!programId) throw new Error('Program ID required');

      const { error } = await supabase
        .from('test_admin_settings')
        .upsert([{
          program_id: programId,
          setting_key: key,
          setting_value: value as Json,
          updated_at: new Date().toISOString(),
        }], {
          onConflict: 'program_id,setting_key',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-admin-settings'] });
      toast.success('Settings saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isLoading = typesLoading || statusesLoading || prioritiesLoading || runStatusesLoading || fieldsLoading || settingsLoading;

  return {
    // Data
    caseTypes,
    caseStatuses,
    casePriorities,
    runStatuses,
    fieldConfigs,
    adminSettings,
    isLoading,

    // Case Types
    createCaseType: createCaseType.mutateAsync,
    updateCaseType: updateCaseType.mutateAsync,
    deleteCaseType: deleteCaseType.mutateAsync,

    // Case Statuses
    createCaseStatus: createCaseStatus.mutateAsync,
    updateCaseStatus: updateCaseStatus.mutateAsync,
    deleteCaseStatus: deleteCaseStatus.mutateAsync,

    // Case Priorities
    createCasePriority: createCasePriority.mutateAsync,
    updateCasePriority: updateCasePriority.mutateAsync,
    deleteCasePriority: deleteCasePriority.mutateAsync,

    // Run Statuses
    createRunStatus: createRunStatus.mutateAsync,
    updateRunStatus: updateRunStatus.mutateAsync,
    deleteRunStatus: deleteRunStatus.mutateAsync,

    // Field Configs
    createFieldConfig: createFieldConfig.mutateAsync,
    updateFieldConfig: updateFieldConfig.mutateAsync,

    // Settings
    getSetting,
    updateSetting: updateSetting.mutateAsync,
  };
}
