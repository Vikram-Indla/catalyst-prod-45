import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ForecastGridProps {
  piId: string;
  viewLevel: 'team' | 'program';
  workItemLevel: 'epics' | 'capabilities' | 'features';
}

export function ForecastGrid({ piId, viewLevel, workItemLevel }: ForecastGridProps) {
  const queryClient = useQueryClient();

  // Fetch assignments to determine which cells should be enabled
  const { data: assignments = [] } = useQuery({
    queryKey: ['work-item-assignments', workItemLevel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_assignments')
        .select('*')
        .eq('work_item_type', workItemLevel.slice(0, -1));
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch work items for this PI
  const { data: workItems = [], isLoading: workItemsLoading } = useQuery({
    queryKey: ['forecast-work-items', piId, workItemLevel],
    queryFn: async () => {
      if (workItemLevel === 'epics') {
        const { data, error } = await supabase
          .from('epics')
          .select('*')
          .order('global_rank', { ascending: true });
        if (error) throw error;
        return (data || []).map(d => ({ ...d, item_type: 'epic' as const }));
      } else if (workItemLevel === 'capabilities') {
        const { data, error } = await supabase
          .from('capabilities')
          .select('*')
          .order('global_rank', { ascending: true });
        if (error) throw error;
        return (data || []).map(d => ({ ...d, item_type: 'capability' as const }));
      } else {
        const { data, error } = await supabase
          .from('features')
          .select('*')
          .order('rank_within_epic', { ascending: true });
        if (error) throw error;
        return (data || []).map(d => ({ ...d, item_type: 'feature' as const }));
      }
    },
  });

  // Fetch capacity plans
  const { data: capacities = [] } = useQuery({
    queryKey: ['capacity-plans', piId, viewLevel],
    queryFn: async () => {
      const query = supabase
        .from('capacity_plans')
        .select('*, programs(name), teams(name)')
        .eq('pi_id', piId);

      if (viewLevel === 'program') {
        query.not('program_id', 'is', null);
      } else {
        query.not('team_id', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch forecast entries
  const { data: forecasts = [] } = useQuery({
    queryKey: ['forecast-entries', piId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forecast_entries')
        .select('*')
        .eq('pi_id', piId);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation to update/create forecast entry
  const updateForecastMutation = useMutation({
    mutationFn: async ({
      workItemId,
      workItemType,
      programId,
      teamId,
      estimate,
    }: {
      workItemId: string;
      workItemType: string;
      programId?: string;
      teamId?: string;
      estimate: number;
    }) => {
      const { data, error } = await supabase
        .from('forecast_entries')
        .upsert({
          work_item_id: workItemId,
          work_item_type: workItemType,
          pi_id: piId,
          program_id: programId,
          team_id: teamId,
          estimate,
          unit: 'points',
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        }, {
          onConflict: 'work_item_id,work_item_type,pi_id,program_id,team_id',
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecast-entries'] });
      toast.success('Forecast updated');
    },
    onError: (error) => {
      console.error('Failed to update forecast:', error);
      toast.error('Failed to update forecast');
    },
  });

  const handleEstimateChange = (
    workItemId: string,
    programId: string | undefined,
    teamId: string | undefined,
    value: string
  ) => {
    const estimate = parseFloat(value) || 0;
    
    updateForecastMutation.mutate({
      workItemId,
      workItemType: workItemLevel.slice(0, -1), // Remove 's' from plural
      programId,
      teamId,
      estimate,
    });
  };

  const getForecastValue = (workItemId: string, programId?: string, teamId?: string) => {
    const entry = forecasts.find(f =>
      f.work_item_id === workItemId &&
      f.program_id === programId &&
      f.team_id === teamId
    );
    return entry?.estimate || 0;
  };

  const calculateTotalForContext = (programId?: string, teamId?: string) => {
    return forecasts
      .filter(f => f.program_id === programId && f.team_id === teamId)
      .reduce((sum, f) => sum + (f.estimate || 0), 0);
  };

  const getAvailableCapacity = (programId?: string, teamId?: string) => {
    const capacity = capacities.find(c =>
      c.program_id === programId && c.team_id === teamId
    );
    return capacity?.available_capacity || 0;
  };

  const isOverCapacity = (programId?: string, teamId?: string) => {
    const total = calculateTotalForContext(programId, teamId);
    const available = getAvailableCapacity(programId, teamId);
    return total > available;
  };

  if (workItemsLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  if (workItems.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No work items found</div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b">
              {/* Zone 1: Sticky left columns */}
              <th className="text-left p-3 font-medium text-sm w-[300px] sticky left-0 bg-muted/50 z-20 border-r">
                Work Item
              </th>
              
              {/* Zone 2: Scrollable default columns */}
              <th className="text-left p-3 font-medium text-sm min-w-[120px] bg-muted/50">Theme</th>
              <th className="text-left p-3 font-medium text-sm min-w-[120px] bg-muted/50">Owner</th>
              <th className="text-right p-3 font-medium text-sm min-w-[120px] bg-muted/50 border-r">PI Estimate</th>
              
              {/* Zone 3: Estimate input matrix */}
              {capacities.map((capacity, idx) => (
                <th
                  key={capacity.id}
                  className={cn(
                    "text-right p-3 font-medium text-sm min-w-[140px] bg-muted/50",
                    isOverCapacity(capacity.program_id, capacity.team_id) && "bg-destructive/10 text-destructive",
                    idx < capacities.length - 1 && "border-r"
                  )}
                >
                  <div className="font-semibold">
                    {viewLevel === 'program' ? capacity.programs?.name : capacity.teams?.name}
                  </div>
                  <div className={cn(
                    "text-xs font-normal mt-1",
                    isOverCapacity(capacity.program_id, capacity.team_id) && "font-semibold"
                  )}>
                    {calculateTotalForContext(capacity.program_id, capacity.team_id)}/{capacity.available_capacity} pts
                  </div>
                </th>
              ))}
            </tr>
          </thead>
        <tbody>
          {workItems.map((item) => {
            const piEstimate = forecasts
              .filter(f => f.work_item_id === item.id)
              .reduce((sum, f) => sum + (f.estimate || 0), 0);

            const itemKey = 
              'epic_key' in item ? item.epic_key :
              'capability_key' in item ? item.capability_key :
              'F-' + (item.id as string).slice(0, 4);

            return (
              <tr key={item.id as string} className="border-b hover:bg-muted/30 transition-colors group">
                {/* Zone 1: Sticky left */}
                <td className="p-3 sticky left-0 bg-background group-hover:bg-muted/30 z-10 border-r">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      {itemKey}
                    </span>
                    <span className="text-sm font-medium truncate">{item.name as string}</span>
                  </div>
                </td>
                
                {/* Zone 2: Scrollable columns */}
                <td className="p-3 text-sm text-muted-foreground">
                  {/* TODO: Fetch and display theme */}
                  -
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {/* TODO: Fetch and display owner */}
                  -
                </td>
                <td className="p-3 text-right text-sm font-semibold border-r">
                  {piEstimate}
                </td>
                
                {/* Zone 3: Estimate inputs */}
                {capacities.map((capacity, idx) => {
                  const value = getForecastValue(item.id as string, capacity.program_id, capacity.team_id);
                  const isAssigned = workItems.some(wi => 
                    wi.id === item.id && 
                    assignments.some(a => 
                      a.work_item_id === wi.id &&
                      ((capacity.program_id && a.program_id === capacity.program_id && !a.team_id) ||
                       (capacity.team_id && a.team_id === capacity.team_id))
                    )
                  );
                  
                  return (
                    <td key={capacity.id} className={cn(
                      "p-2",
                      idx < capacities.length - 1 && "border-r"
                    )}>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={value || ''}
                        onChange={(e) => handleEstimateChange(
                          item.id as string,
                          capacity.program_id,
                          capacity.team_id,
                          e.target.value
                        )}
                        disabled={!isAssigned}
                        className={cn(
                          "w-full text-right h-9 text-sm",
                          !isAssigned && "bg-muted/30 cursor-not-allowed"
                        )}
                        placeholder={isAssigned ? "0" : "-"}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
  );
}
