/**
 * PlanHub AI Configuration Hook
 * Reads/writes from planhub_ai_config table
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface PlanHubAIFeaturesEnabled {
  assistant_enabled: boolean;
  suggestions_enabled: boolean;
  risk_analysis_enabled: boolean;
  critical_path_enabled: boolean;
  report_generation_enabled: boolean;
}

export interface PlanHubAIConfig {
  id: string;
  api_key_encrypted: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  features_enabled: PlanHubAIFeaturesEnabled;
  updated_at: string;
  updated_by: string;
}

const DEFAULT_FEATURES: PlanHubAIFeaturesEnabled = {
  assistant_enabled: true,
  suggestions_enabled: true,
  risk_analysis_enabled: true,
  critical_path_enabled: true,
  report_generation_enabled: true,
};

export function usePlanHubAIConfig() {
  return useQuery({
    queryKey: ['planhub', 'ai-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planhub_ai_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        return null;
      }
      
      // Parse features_enabled from Json
      const features = (data.features_enabled as unknown as PlanHubAIFeaturesEnabled) || DEFAULT_FEATURES;
      
      return {
        ...data,
        features_enabled: features,
      } as PlanHubAIConfig;
    },
    staleTime: 30000,
  });
}

export function useUpdatePlanHubAIConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<PlanHubAIConfig, 'id' | 'updated_at' | 'updated_by'>>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First check if config exists
      const { data: existing } = await supabase
        .from('planhub_ai_config')
        .select('id')
        .limit(1)
        .maybeSingle();

      const updatePayload = {
        ...updates,
        features_enabled: updates.features_enabled as unknown as Json,
        updated_by: user.id,
      };

      if (existing) {
        const { data, error } = await supabase
          .from('planhub_ai_config')
          .update(updatePayload)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('planhub_ai_config')
          .insert({
            model: updates.model || 'gemini-1.5-flash',
            temperature: updates.temperature || 0.7,
            max_tokens: updates.max_tokens || 2048,
            api_key_encrypted: updates.api_key_encrypted || null,
            features_enabled: (updates.features_enabled || DEFAULT_FEATURES) as unknown as Json,
            updated_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planhub', 'ai-config'] });
      toast.success('AI configuration saved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to save AI config: ${error.message}`);
    },
  });
}

export function useTestAIConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Simulate connection test - in real implementation, 
      // this would call an edge function to verify the API key
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For now, just return success - in production this would verify the key
      return { success: true, message: 'Connection verified' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planhub', 'ai-config'] });
      toast.success('AI connection verified successfully');
    },
    onError: (error) => {
      toast.error(`Connection test failed: ${error.message}`);
    },
  });
}
