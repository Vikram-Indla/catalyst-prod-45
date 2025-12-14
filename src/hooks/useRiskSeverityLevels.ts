/**
 * Hook for managing Risk Severity Levels (admin-configurable)
 * Replaces hardcoded SEVERITY_OPTIONS in RiskFormV2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface RiskSeverityLevel {
  id: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch all severity levels (for admin)
export function useRiskSeverityLevels() {
  return useQuery({
    queryKey: ['risk-severity-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_severity_levels')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as RiskSeverityLevel[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch active severity levels (for dropdowns)
export function useActiveRiskSeverityLevels() {
  return useQuery({
    queryKey: ['risk-severity-levels', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_severity_levels')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as RiskSeverityLevel[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Create a new severity level
export function useCreateRiskSeverityLevel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { value: string; label: string; sort_order: number }) => {
      const { data: result, error } = await supabase
        .from('risk_severity_levels')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-severity-levels'] });
      toast({ title: 'Success', description: 'Severity level created.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Update a severity level
export function useUpdateRiskSeverityLevel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { data, error } = await supabase
        .from('risk_severity_levels')
        .update({ label })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-severity-levels'] });
      toast({ title: 'Success', description: 'Severity level updated.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Toggle active status
export function useToggleRiskSeverityLevel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('risk_severity_levels')
        .update({ is_active: !is_active })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-severity-levels'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
