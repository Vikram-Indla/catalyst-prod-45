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
      const { data: program, error: programError } = await supabase
        .from('projects')
        .select('program_id')
        .eq('id', epic.primary_program_id)
        .single();
      
      if (programError) throw programError;
      if (!program?.program_id) return null;

      // Get intake set for program
      const { data: intakeSet, error: intakeError } = await supabase
        .from('intake_sets')
        .select(`
          *,
          intake_fields(*)
        `)
        .eq('program_id', program.program_id)
        .order('created_at', { foreignTable: 'intake_fields', ascending: true })
        .single();
      
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
