import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// NOTE: Function names reference WSJF for legacy/internal reasons
// UI displays "Technical Scoring" - these apply tech scores to global_rank
export function useApplyWSJFToRankEpics(piId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Fetch epics with technical scores (stored in epic_wsjf table)
      let query = supabase
        .from('epic_wsjf')
        .select('epic_id, wsjf_score, pi_id')
        .order('wsjf_score', { ascending: false });

      if (piId) {
        query = query.eq('pi_id', piId);
      }

      const { data: wsjfData, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (!wsjfData || wsjfData.length === 0) {
        throw new Error('No WSJF data found for ranking');
      }

      // Update global_rank for each epic based on WSJF score order
      const updates = wsjfData.map((item, index) => ({
        id: item.epic_id,
        global_rank: index + 1,
      }));

      // Batch update epics
      for (const update of updates) {
        const { error } = await supabase
          .from('epics')
          .update({ global_rank: update.global_rank })
          .eq('id', update.id);

        if (error) throw error;
      }

      return updates.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['wsjf'] });
      toast.success(`Applied Technical Scoring ranking to ${count} epics`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply Technical Scoring ranking: ${error.message}`);
    },
  });
}

// NOTE: Function name references WSJF for legacy/internal reasons
// UI displays "Technical Scoring" - applies tech scores to global_rank
export function useApplyWSJFToRankFeatures(piId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Fetch features with technical scores
      let query = supabase
        .from('features')
        .select('id, wsjf_score, pi_id')
        .not('wsjf_score', 'is', null)
        .order('wsjf_score', { ascending: false });

      if (piId) {
        query = query.eq('pi_id', piId);
      }

      const { data: features, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (!features || features.length === 0) {
        throw new Error('No Technical Scores found for ranking');
      }

      // Update global_rank for each feature based on WSJF score order
      const updates = features.map((feature, index) => ({
        id: feature.id,
        global_rank: index + 1,
      }));

      // Batch update features
      for (const update of updates) {
        const { error } = await supabase
          .from('features')
          .update({ global_rank: update.global_rank })
          .eq('id', update.id);

        if (error) throw error;
      }

      return updates.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success(`Applied Technical Scoring ranking to ${count} features`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply Technical Scoring ranking: ${error.message}`);
    },
  });
}