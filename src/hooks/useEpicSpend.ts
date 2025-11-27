import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useEpicSpend = (epicId: string) => {
  return useQuery({
    queryKey: ['epic-spend', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_spend')
        .select('*')
        .eq('epic_id', epicId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Create default record if doesn't exist
        const { data: newData, error: insertError } = await supabase
          .from('epic_spend')
          .insert({ epic_id: epicId, budget: 0 })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newData;
      }
      return data;
    },
  });
};

export const useUpdateEpicBudget = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ epicId, budget }: { epicId: string; budget: number }) => {
      const { data, error } = await supabase
        .from('epic_spend')
        .upsert({ epic_id: epicId, budget }, { onConflict: 'epic_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { epicId }) => {
      queryClient.invalidateQueries({ queryKey: ['epic-spend', epicId] });
    },
  });
};

export const useEpicSpendCalculations = (epicId: string) => {
  return useQuery({
    queryKey: ['epic-spend-calc', epicId],
    queryFn: async () => {
      // Fetch forecasts for Forecasted Spend
      const { data: forecasts } = await supabase
        .from('forecast_entries')
        .select(`
          estimate,
          program:programs(spend_per_point)
        `)
        .eq('work_item_id', epicId)
        .eq('work_item_type', 'epic');
      
      // Fetch features for Estimated Spend
      const { data: features } = await supabase
        .from('features')
        .select(`
          points_estimate,
          primary_program:programs(spend_per_point)
        `)
        .eq('epic_id', epicId);
      
      // Fetch accepted spend from features
      const { data: featureSpends } = await supabase
        .from('features')
        .select('accepted_spend')
        .eq('epic_id', epicId);
      
      // Calculate totals
      const forecastedSpend = forecasts?.reduce((sum, f) => 
        sum + ((f.estimate || 0) * (f.program?.spend_per_point || 340)), 0
      ) || 0;
      
      const estimatedSpend = features?.reduce((sum, f) => 
        sum + ((f.points_estimate || 0) * (f.primary_program?.spend_per_point || 340)), 0
      ) || 0;
      
      const acceptedSpend = featureSpends?.reduce((sum, f) => 
        sum + (f.accepted_spend || 0), 0
      ) || 0;
      
      return { forecastedSpend, estimatedSpend, acceptedSpend };
    },
  });
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};
