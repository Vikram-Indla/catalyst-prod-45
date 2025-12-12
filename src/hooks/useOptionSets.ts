import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface OptionSet {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OptionValue {
  id: string;
  option_set_id: string;
  value_key: string;
  label: string;
  label_ar: string | null;
  color: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Fetch all option sets
export function useOptionSets() {
  return useQuery({
    queryKey: ['option-sets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('option_sets')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as OptionSet[];
    },
  });
}

// Fetch a single option set by key
export function useOptionSet(key: string) {
  return useQuery({
    queryKey: ['option-set', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('option_sets')
        .select('*')
        .eq('key', key)
        .single();
      
      if (error) throw error;
      return data as OptionSet;
    },
    enabled: !!key,
  });
}

// Fetch option values for a specific option set by key
export function useOptionValues(optionSetKey: string) {
  return useQuery({
    queryKey: ['option-values', optionSetKey],
    queryFn: async () => {
      // First get the option set ID
      const { data: optionSet, error: setError } = await supabase
        .from('option_sets')
        .select('id')
        .eq('key', optionSetKey)
        .single();
      
      if (setError) throw setError;
      
      // Then get the values
      const { data, error } = await supabase
        .from('option_values')
        .select('*')
        .eq('option_set_id', optionSet.id)
        .order('sort_order');
      
      if (error) throw error;
      return data as OptionValue[];
    },
    enabled: !!optionSetKey,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Fetch active option values only (for dropdowns)
export function useActiveOptionValues(optionSetKey: string) {
  return useQuery({
    queryKey: ['option-values', optionSetKey, 'active'],
    queryFn: async () => {
      // First get the option set ID
      const { data: optionSet, error: setError } = await supabase
        .from('option_sets')
        .select('id')
        .eq('key', optionSetKey)
        .single();
      
      if (setError) throw setError;
      
      // Then get only active values
      const { data, error } = await supabase
        .from('option_values')
        .select('*')
        .eq('option_set_id', optionSet.id)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as OptionValue[];
    },
    enabled: !!optionSetKey,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Create a new option value
export function useCreateOptionValue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      optionSetKey: string;
      valueKey: string;
      label: string;
      labelAr?: string;
      color?: string;
      isDefault?: boolean;
      sortOrder?: number;
    }) => {
      // Get option set ID
      const { data: optionSet, error: setError } = await supabase
        .from('option_sets')
        .select('id')
        .eq('key', params.optionSetKey)
        .single();
      
      if (setError) throw setError;
      
      const { data, error } = await supabase
        .from('option_values')
        .insert({
          option_set_id: optionSet.id,
          value_key: params.valueKey,
          label: params.label,
          label_ar: params.labelAr || null,
          color: params.color || null,
          is_default: params.isDefault || false,
          sort_order: params.sortOrder || 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['option-values', variables.optionSetKey] });
      toast.success('Option created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create option: ${error.message}`);
    },
  });
}

// Update an option value
export function useUpdateOptionValue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      id: string;
      optionSetKey: string;
      valueKey?: string;
      label?: string;
      labelAr?: string | null;
      color?: string | null;
      isActive?: boolean;
      isDefault?: boolean;
      sortOrder?: number;
    }) => {
      const updates: Record<string, any> = {};
      if (params.valueKey !== undefined) updates.value_key = params.valueKey;
      if (params.label !== undefined) updates.label = params.label;
      if (params.labelAr !== undefined) updates.label_ar = params.labelAr;
      if (params.color !== undefined) updates.color = params.color;
      if (params.isActive !== undefined) updates.is_active = params.isActive;
      if (params.isDefault !== undefined) updates.is_default = params.isDefault;
      if (params.sortOrder !== undefined) updates.sort_order = params.sortOrder;
      
      const { data, error } = await supabase
        .from('option_values')
        .update(updates)
        .eq('id', params.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['option-values', variables.optionSetKey] });
      toast.success('Option updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update option: ${error.message}`);
    },
  });
}

// Delete an option value (soft delete by setting is_active to false)
export function useDeleteOptionValue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { id: string; optionSetKey: string; hardDelete?: boolean }) => {
      if (params.hardDelete) {
        const { error } = await supabase
          .from('option_values')
          .delete()
          .eq('id', params.id);
        
        if (error) throw error;
      } else {
        // Soft delete - set is_active to false
        const { error } = await supabase
          .from('option_values')
          .update({ is_active: false })
          .eq('id', params.id);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['option-values', variables.optionSetKey] });
      toast.success(variables.hardDelete ? 'Option deleted' : 'Option deactivated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete option: ${error.message}`);
    },
  });
}

// Bulk update sort order
export function useBulkUpdateSortOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { optionSetKey: string; updates: Array<{ id: string; sortOrder: number }> }) => {
      const promises = params.updates.map(update =>
        supabase
          .from('option_values')
          .update({ sort_order: update.sortOrder })
          .eq('id', update.id)
      );
      
      await Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['option-values', variables.optionSetKey] });
    },
  });
}
