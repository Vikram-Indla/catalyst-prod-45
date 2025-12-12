import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CapacityWarning {
  teamId: string;
  teamName: string;
  allocated: number;
  capacity: number;
  overallocation: number;
  percentUsed: number;
}

export function useCapacityWarnings(piId: string, programId?: string) {
  return useQuery({
    queryKey: ['capacity-warnings', piId, programId],
    queryFn: async () => {
      // Fetch capacity plans for the PI
      let capacityQuery = supabase
        .from('capacity_plans')
        .select('team_id, available_capacity, teams(id, name)')
        .eq('pi_id', piId);

      if (programId) {
        capacityQuery = capacityQuery.eq('project_id', programId);
      }

      const { data: capacities, error: capacityError } = await capacityQuery;
      if (capacityError) throw capacityError;

      // Fetch forecast allocations for the PI
      const { data: forecasts, error: forecastError } = await supabase
        .from('forecast_entries')
        .select('team_id, estimate')
        .eq('pi_id', piId);

      if (forecastError) throw forecastError;

      // Calculate warnings
      const warnings: CapacityWarning[] = [];

      capacities?.forEach(cap => {
        const teamForecasts = forecasts?.filter(f => f.team_id === cap.team_id) || [];
        const allocated = teamForecasts.reduce((sum, f) => sum + (f.estimate || 0), 0);
        const capacity = cap.available_capacity;
        const overallocation = allocated - capacity;
        const percentUsed = capacity > 0 ? (allocated / capacity) * 100 : 0;

        if (overallocation > 0 || percentUsed > 80) {
          warnings.push({
            teamId: cap.team_id!,
            teamName: (cap.teams as any)?.name || 'Unknown Team',
            allocated,
            capacity,
            overallocation,
            percentUsed,
          });
        }
      });

      return warnings;
    },
    enabled: !!piId,
  });
}