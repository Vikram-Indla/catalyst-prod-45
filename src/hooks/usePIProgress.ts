import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePIProgress = (piId: string) => {
  return useQuery({
    queryKey: ['pi-progress', piId],
    queryFn: async () => {
      // Get all epics for this PI
      const { data: epicPIs } = await supabase
        .from('epic_program_increments')
        .select('epic_id')
        .eq('pi_id', piId);

      if (!epicPIs || epicPIs.length === 0) {
        return { percentage: 0, acceptedPoints: 0, totalPoints: 0 };
      }

      const epicIds = epicPIs.map(ep => ep.epic_id);

      // Get all features for these epics
      const { data: features } = await supabase
        .from('features')
        .select('estimate_points, status')
        .in('epic_id', epicIds);

      if (!features || features.length === 0) {
        return { percentage: 0, acceptedPoints: 0, totalPoints: 0 };
      }

      // Calculate totals
      const totalPoints = features.reduce(
        (sum, f) => sum + (f.estimate_points || 0),
        0
      );

      const acceptedPoints = features
        .filter(f => f.status === 'done')
        .reduce((sum, f) => sum + (f.estimate_points || 0), 0);

      const percentage = totalPoints > 0 
        ? Math.round((acceptedPoints / totalPoints) * 100)
        : 0;

      return { percentage, acceptedPoints, totalPoints };
    },
    enabled: !!piId,
  });
};
