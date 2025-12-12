import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useEpicIntakeSet = (epicId: string) => {
  return useQuery({
    queryKey: ['intake-set', epicId],
    queryFn: async () => {
      // Get epic's primary program's intake set
      const { data: epic, error: epicError } = await supabase
        .from('epics')
        .select('primary_program_id')
        .eq('id', epicId)
        .single();
      
      if (epicError) throw epicError;
      if (!epic?.primary_program_id) return null;

      // Get program's portfolio to find intake set
      // Get intake set for program directly using primary_program_id
      const { data: intakeSet, error: intakeError } = await supabase
        .from('intake_sets')
        .select(`
          *,
          intake_fields(*)
        `)
        .eq('program_id', epic.primary_program_id)
        .order('created_at', { foreignTable: 'intake_fields', ascending: true })
        .maybeSingle();
      
      if (intakeError && intakeError.code !== 'PGRST116') throw intakeError;
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
