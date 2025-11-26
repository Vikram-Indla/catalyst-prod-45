import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ForecastPreferences {
  visible_columns: string[];
  filters: Record<string, any>;
}

const DEFAULT_COLUMNS = ['theme', 'owner', 'pi_estimate', 'program_estimate', 'team_estimate', 'capacity_needed'];

export function useForecastPreferences() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['forecast-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_forecast_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data || {
        visible_columns: DEFAULT_COLUMNS,
        filters: {},
      };
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<ForecastPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_forecast_preferences')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecast-preferences'] });
    },
  });

  return {
    preferences: preferences || { visible_columns: DEFAULT_COLUMNS, filters: {} },
    isLoading,
    updatePreferences: updatePreferences.mutate,
  };
}
