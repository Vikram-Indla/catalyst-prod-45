import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeatureFlag {
  id: string;
  flag_key: string;
  enabled: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('flag_key');
      
      if (error) throw error;
      return data as FeatureFlag[];
    },
  });
}

export function useFeatureFlag(flagKey: string) {
  return useQuery({
    queryKey: ['feature-flag', flagKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('flag_key', flagKey)
        .single();
      
      if (error) {
        // Return default disabled flag if not found
        if (error.code === 'PGRST116') {
          return { flag_key: flagKey, enabled: false } as FeatureFlag;
        }
        throw error;
      }
      return data as FeatureFlag;
    },
  });
}

export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ flagKey, enabled }: { flagKey: string; enabled: boolean }) => {
      const { data, error } = await supabase
        .from('feature_flags')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('flag_key', flagKey)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flag', variables.flagKey] });
      toast.success('Feature flag updated');
    },
    onError: (error) => {
      toast.error('Failed to update feature flag');
      console.error('Feature flag update error:', error);
    },
  });
}

// OKR v2 is now the single source of truth - no feature flag needed
// Removed: useOKRv2Enabled hook
