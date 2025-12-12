import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useEpicIntakeSet = (epicId: string) => {
  return useQuery({
    queryKey: ['intake-set', epicId],
    queryFn: async () => {
      // Get epic's primary program's intake set
      const epicResult = await supabase
        .from('epics')
        .select('primary_program_id')
        .eq('id', epicId)
        .single();
      
      if (epicResult.error) throw epicResult.error;
      if (!epicResult.data?.primary_program_id) return null;

      // Get intake set for portfolio directly using primary_program_id
      // Note: intake_sets table still uses portfolio_id column
      const intakeResult = await supabase
        .from('intake_sets')
        .select('*, intake_fields(*)')
        .eq('portfolio_id', epicResult.data.primary_program_id);
      
      if (intakeResult.error && intakeResult.error.code !== 'PGRST116') throw intakeResult.error;
      
      // Get first one if exists, sort intake_fields by created_at
      if (!intakeResult.data || intakeResult.data.length === 0) return null;
      const intakeSet = intakeResult.data[0];
      if (intakeSet.intake_fields) {
        (intakeSet.intake_fields as any[]).sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      return intakeSet;
    },
  });
};

export const useEpicIntakeResponses = (epicId: string) => {
  return useQuery({
    queryKey: ['intake-responses', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_intake_responses')
        .select('*')
        .eq('epic_id', epicId);

      if (error) throw error;
      return data;
    },
  });
};

export const useSaveIntakeResponses = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ epicId, responses }: { 
      epicId: string; 
      responses: Record<string, string>; 
    }) => {
      const upserts = Object.entries(responses).map(([fieldId, value]) => ({
        epic_id: epicId,
        field_id: fieldId,
        value
      }));
      
      const { data, error } = await supabase
        .from('epic_intake_responses')
        .upsert(upserts, { onConflict: 'epic_id,field_id' })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { epicId }) => {
      queryClient.invalidateQueries({ queryKey: ['intake-responses', epicId] });
    },
  });
};
