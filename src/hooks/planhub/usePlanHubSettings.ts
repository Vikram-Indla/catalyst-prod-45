/**
 * PlanHub Settings Hook
 * Reads/writes from planhub_settings table
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface PlanHubGeneralSettings {
  module_name: string;
  default_duration_days: number;
  max_tasks_per_plan: number;
  auto_save_interval_seconds: number;
  default_sentiment: 'conservative' | 'moderate' | 'aggressive';
}

export interface PlanHubFeatureSettings {
  version_control: boolean;
  auto_save: boolean;
  require_approval_delete: boolean;
  presentation_mode: boolean;
  scenario_compare: boolean;
  master_plan_view: boolean;
  resource_management: boolean;
  report_center: boolean;
}

export interface PlanHubSettings {
  general: PlanHubGeneralSettings;
  features: PlanHubFeatureSettings;
}

const DEFAULT_GENERAL: PlanHubGeneralSettings = {
  module_name: 'PlanHub™',
  default_duration_days: 90,
  max_tasks_per_plan: 500,
  auto_save_interval_seconds: 30,
  default_sentiment: 'moderate',
};

const DEFAULT_FEATURES: PlanHubFeatureSettings = {
  version_control: true,
  auto_save: true,
  require_approval_delete: false,
  presentation_mode: true,
  scenario_compare: true,
  master_plan_view: true,
  resource_management: true,
  report_center: true,
};

export function usePlanHubSettings() {
  return useQuery({
    queryKey: ['planhub', 'settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planhub_settings')
        .select('key, value');

      if (error) throw error;

      const settings: PlanHubSettings = {
        general: DEFAULT_GENERAL,
        features: DEFAULT_FEATURES,
      };

      data?.forEach((row) => {
        if (row.key === 'general' && row.value) {
          settings.general = { ...DEFAULT_GENERAL, ...(row.value as unknown as Partial<PlanHubGeneralSettings>) };
        }
        if (row.key === 'features' && row.value) {
          settings.features = { ...DEFAULT_FEATURES, ...(row.value as unknown as Partial<PlanHubFeatureSettings>) };
        }
      });

      return settings;
    },
    staleTime: 30000,
  });
}

export function useUpdatePlanHubSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<PlanHubSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updates = [];
      
      if (settings.general) {
        updates.push({
          key: 'general',
          value: settings.general as unknown as Json,
          updated_by: user.id,
        });
      }
      
      if (settings.features) {
        updates.push({
          key: 'features',
          value: settings.features as unknown as Json,
          updated_by: user.id,
        });
      }

      for (const update of updates) {
        const { error } = await supabase
          .from('planhub_settings')
          .upsert(update, { onConflict: 'key' });
        
        if (error) throw error;
      }

      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planhub', 'settings'] });
      toast.success('PlanHub settings saved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}
