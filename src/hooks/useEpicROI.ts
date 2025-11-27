import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type ROIOption = 'Low' | 'Medium' | 'High';

interface EpicROI {
  id: string;
  epic_id: string;
  cost_score: number | null;
  profit_potential_score: number | null;
  time_to_market_score: number | null;
  development_risks_score: number | null;
  value_score: number | null;
}

// Cost fields: Low cost = good = 100
export const COST_SCORE_MAP: Record<ROIOption, number> = { 
  'Low': 100, 
  'Medium': 66, 
  'High': 33 
};

// Benefit fields: High benefit = good = 100
export const BENEFIT_SCORE_MAP: Record<ROIOption, number> = { 
  'Low': 33, 
  'Medium': 66, 
  'High': 100 
};

// Risk fields: Low risk = good = 100
export const RISK_SCORE_MAP: Record<ROIOption, number> = { 
  'Low': 100, 
  'Medium': 66, 
  'High': 33 
};

export const useEpicROI = (epicId: string) => {
  return useQuery({
    queryKey: ['epic-roi', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_roi_scores')
        .select('*')
        .eq('epic_id', epicId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });
};

export const useUpdateEpicROI = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ epicId, field, score }: { 
      epicId: string; 
      field: string; 
      score: number; 
    }) => {
      const { data, error} = await supabase
        .from('epic_roi_scores')
        .upsert({ 
          epic_id: epicId, 
          [`${field}_score`]: score 
        }, {
          onConflict: 'epic_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { epicId }) => {
      queryClient.invalidateQueries({ queryKey: ['epic-roi', epicId] });
    },
  });
};

export const useValueComparison = (epicId: string) => {
  return useQuery({
    queryKey: ['value-comparison', epicId],
    queryFn: async () => {
      const { data: currentEpic, error: currentError } = await supabase
        .from('epic_roi_scores')
        .select('value_score')
        .eq('epic_id', epicId)
        .single();
      
      if (currentError) throw currentError;
      
      const { data: allEpics, error: allError } = await supabase
        .from('epic_roi_scores')
        .select('value_score');
      
      if (allError) throw allError;
      
      const scores = allEpics
        .map(e => e.value_score)
        .filter((score): score is number => score !== null);
      
      const average = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
      
      return {
        score: currentEpic.value_score || 0,
        average: Math.round(average * 10) / 10,
        percentageDiff: average > 0 
          ? Math.round(((currentEpic.value_score || 0) - average) / average * 100)
          : 0,
        isHigher: (currentEpic.value_score || 0) > average
      };
    },
  });
};

export const getGaugeColor = (score: number): string => {
  if (score >= 100) return '#22c55e'; // green-500
  if (score >= 66) return '#14b8a6'; // teal-500
  if (score >= 33) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
};
