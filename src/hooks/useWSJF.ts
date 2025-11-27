import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WSJFData {
  epic_id: string;
  pi_id: string;
  business_value: number | null;
  time_value: number | null;
  rroe_value: number | null;
  job_size: number | null;
  wsjf_score: number | null;
  global_rank: number | null;
}

export const useWSJF = (epicId: string, piId: string) => {
  return useQuery({
    queryKey: ['wsjf', epicId, piId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_wsjf')
        .select('*')
        .eq('epic_id', epicId)
        .eq('pi_id', piId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });
};

export const useUpdateWSJF = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ epicId, piId, field, value }: { 
      epicId: string; 
      piId: string; 
      field: string; 
      value: number; 
    }) => {
      const { data, error } = await supabase
        .from('epic_wsjf')
        .upsert({ 
          epic_id: epicId, 
          pi_id: piId, 
          [field]: value 
        }, { 
          onConflict: 'epic_id,pi_id' 
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { epicId, piId }) => {
      queryClient.invalidateQueries({ queryKey: ['wsjf', epicId, piId] });
    },
  });
};

export const calculateWSJF = (
  businessValue: number, 
  timeValue: number, 
  rroeValue: number, 
  jobSize: number
): number | null => {
  if (jobSize === 0 || !businessValue || !timeValue || !rroeValue) return null;
  const cod = businessValue + timeValue + rroeValue;
  return Math.round((cod / jobSize) * 100) / 100;
};
