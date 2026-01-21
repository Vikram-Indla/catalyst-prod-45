/**
 * Phase 5C: Masking Rules Hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { MaskingRule, MaskingRuleFormData, MaskingConfig } from '../types/test-data-management';

export function useMasking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['masking-rules'];

  const { data: rules = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('masking_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) throw error;
      return data as MaskingRule[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: MaskingRuleFormData) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('masking_rules')
        .insert([{
          name: formData.name,
          description: formData.description || null,
          field_pattern: formData.field_pattern,
          masking_type: formData.masking_type,
          masking_config: JSON.parse(JSON.stringify(formData.masking_config)),
          priority: formData.priority,
          created_by: user?.user?.id || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Masking rule created successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to create masking rule', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<MaskingRuleFormData> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      if (formData.name) updateData.name = formData.name;
      if (formData.description !== undefined) updateData.description = formData.description;
      if (formData.field_pattern) updateData.field_pattern = formData.field_pattern;
      if (formData.masking_type) updateData.masking_type = formData.masking_type;
      if (formData.masking_config) updateData.masking_config = JSON.parse(JSON.stringify(formData.masking_config));
      if (formData.priority !== undefined) updateData.priority = formData.priority;

      const { data, error } = await supabase
        .from('masking_rules')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Masking rule updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update masking rule', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('masking_rules')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Masking rule deleted successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete masking rule', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Apply masking to a value based on rules
  const applyMasking = (fieldName: string, value: string): string => {
    for (const rule of rules) {
      const regex = new RegExp(rule.field_pattern, 'i');
      if (regex.test(fieldName)) {
        return maskValue(value, rule.masking_type, rule.masking_config as MaskingConfig);
      }
    }
    return value;
  };

  return {
    rules,
    isLoading,
    error,
    createRule: createMutation.mutateAsync,
    updateRule: updateMutation.mutateAsync,
    deleteRule: deleteMutation.mutateAsync,
    applyMasking,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

function maskValue(value: string, type: string, config: MaskingConfig | null): string {
  if (!value) return value;
  
  const maskChar = config?.mask_char || '*';
  
  switch (type) {
    case 'redact':
      return maskChar.repeat(value.length);
    
    case 'hash':
      return `[HASHED:${hashString(value).slice(0, 8)}]`;
    
    case 'partial': {
      const showFirst = config?.show_first || 0;
      const showLast = config?.show_last || 0;
      const start = value.slice(0, showFirst);
      const end = value.slice(-showLast);
      const middleLength = Math.max(0, value.length - showFirst - showLast);
      return start + maskChar.repeat(middleLength) + end;
    }
    
    case 'scramble':
      return value.split('').sort(() => Math.random() - 0.5).join('');
    
    default:
      return value;
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
