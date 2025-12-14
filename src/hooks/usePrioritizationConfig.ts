import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PrioritizationConfig {
  id: string;
  version: number;
  weight_strategic_alignment: number;
  weight_business_impact: number;
  weight_time_urgency: number;
  weight_resource_feasibility: number;
  threshold_rejected_min: number;
  threshold_rejected_max: number;
  threshold_low_min: number;
  threshold_low_max: number;
  threshold_medium_min: number;
  threshold_medium_max: number;
  threshold_high_min: number;
  threshold_high_max: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CONFIG: Omit<PrioritizationConfig, 'id' | 'created_at' | 'updated_at'> = {
  version: 1,
  weight_strategic_alignment: 30,
  weight_business_impact: 30,
  weight_time_urgency: 20,
  weight_resource_feasibility: 20,
  threshold_rejected_min: 1.0,
  threshold_rejected_max: 2.0,
  threshold_low_min: 2.0,
  threshold_low_max: 3.0,
  threshold_medium_min: 3.0,
  threshold_medium_max: 4.0,
  threshold_high_min: 4.0,
  threshold_high_max: 5.0,
};

export function usePrioritizationConfig() {
  return useQuery({
    queryKey: ['prioritization-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prioritization_config')
        .select('*')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      // Return default config if none exists
      if (!data) {
        return DEFAULT_CONFIG as PrioritizationConfig;
      }
      
      return data as PrioritizationConfig;
    },
  });
}

export function useUpdatePrioritizationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<PrioritizationConfig> & { id?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get current config to determine version
      const { data: currentConfig } = await supabase
        .from('prioritization_config')
        .select('version')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newVersion = (currentConfig?.version || 0) + 1;

      // Insert new config record with incremented version
      const { data, error } = await supabase
        .from('prioritization_config')
        .insert({
          ...DEFAULT_CONFIG,
          ...config,
          version: newVersion,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prioritization-config'] });
    },
  });
}

// Utility functions for score calculation
export type PriorityTier = 'unscored' | 'rejected' | 'low' | 'medium' | 'high';

export function calculatePriorityScore(
  scores: {
    strategic_alignment: number | null;
    business_impact: number | null;
    time_urgency: number | null;
    resource_feasibility: number | null;
  },
  config: PrioritizationConfig
): number | null {
  const { strategic_alignment, business_impact, time_urgency, resource_feasibility } = scores;
  
  // If any score is missing, return null (unscored)
  if (!strategic_alignment || !business_impact || !time_urgency || !resource_feasibility) {
    return null;
  }

  const score = (
    (config.weight_strategic_alignment * strategic_alignment) +
    (config.weight_business_impact * business_impact) +
    (config.weight_time_urgency * time_urgency) +
    (config.weight_resource_feasibility * resource_feasibility)
  ) / 100;

  return Math.round(score * 100) / 100; // 2 decimal places
}

export function getPriorityTier(score: number | null, config: PrioritizationConfig): PriorityTier {
  if (score === null) return 'unscored';
  
  if (score >= config.threshold_high_min && score <= config.threshold_high_max) return 'high';
  if (score >= config.threshold_medium_min && score < config.threshold_medium_max) return 'medium';
  if (score >= config.threshold_low_min && score < config.threshold_low_max) return 'low';
  if (score >= config.threshold_rejected_min && score < config.threshold_rejected_max) return 'rejected';
  
  return 'unscored';
}

export function getTierDisplayInfo(tier: PriorityTier): { label: string; color: string; bgColor: string } {
  switch (tier) {
    case 'high':
      return { label: 'HIGH', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' };
    case 'medium':
      return { label: 'MEDIUM', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' };
    case 'low':
      return { label: 'LOW', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' };
    case 'rejected':
      return { label: 'REJECTED', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' };
    default:
      return { label: 'UNSCORED', color: 'text-muted-foreground', bgColor: 'bg-muted border-border' };
  }
}

export function getScoreBadgeColor(score: number | null): string {
  if (score === null) return 'bg-muted text-muted-foreground';
  if (score === 1) return 'bg-red-500 text-white';
  if (score === 2) return 'bg-orange-500 text-white';
  if (score === 3) return 'bg-gray-500 text-white';
  if (score === 4) return 'bg-blue-500 text-white';
  if (score === 5) return 'bg-green-500 text-white';
  return 'bg-muted text-muted-foreground';
}
