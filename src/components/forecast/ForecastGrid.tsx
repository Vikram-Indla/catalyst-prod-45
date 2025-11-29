import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import { ForecastContextMenu } from './ForecastContextMenu';

interface ForecastGridProps {
  piId: string;
  viewLevel: 'team' | 'program';
  workItemLevel: 'epics' | 'features';
}

export function ForecastGrid({ piId, viewLevel, workItemLevel }: ForecastGridProps) {
  const queryClient = useQueryClient();
  const [orderedWorkItems, setOrderedWorkItems] = useState<any[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, string>>({});
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

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

  // Fetch forecast ranks
  const { data: ranks = [] } = useQuery({
    queryKey: ['forecast-ranks', piId, workItemLevel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_forecast_ranks')
        .select('*')
        .eq('pi_id', piId)
        .eq('work_item_type', workItemLevel.slice(0, -1))
        .order('rank', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Update ordered items when work items or ranks change
  useEffect(() => {
    if (workItems.length > 0) {
      const rankedItems = [...workItems].sort((a, b) => {
        const rankA = ranks.find(r => r.work_item_id === a.id)?.rank ?? 999999;
        const rankB = ranks.find(r => r.work_item_id === b.id)?.rank ?? 999999;
        return rankA - rankB;
      });
      setOrderedWorkItems(rankedItems);
    }
  }, [workItems, ranks]);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check permission
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const isEditor = roleData?.role === 'admin' || 
                      roleData?.role === 'program_manager' || 
                      roleData?.role === 'team_lead';
      
      if (!isEditor) {
        throw new Error('You do not have permission to edit forecasts');
      }

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
          updated_by: user.id,
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
    onError: (error: any) => {
      console.error('Failed to update forecast:', error);
      toast.error(error.message || 'Failed to update forecast');
    },
  });

  // Debounced save on blur
  const handleInputChange = useCallback((key: string, value: string) => {
    setPendingUpdates(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleInputBlur = useCallback((
    workItemId: string,
    programId: string | undefined,
    teamId: string | undefined,
    key: string
  ) => {
    const value = pendingUpdates[key];
    if (value === undefined) return;

    // Clear any existing timeout for this input
    if (saveTimeoutRef.current[key]) {
      clearTimeout(saveTimeoutRef.current[key]);
    }

    // Debounce the save by 300ms
    saveTimeoutRef.current[key] = setTimeout(() => {
      const estimate = parseFloat(value) || 0;
      
      updateForecastMutation.mutate({
        workItemId,
        workItemType: workItemLevel.slice(0, -1),
        programId,
        teamId,
        estimate,
      });

      // Clear the pending update
      setPendingUpdates(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 300);
  }, [pendingUpdates, workItemLevel, updateForecastMutation]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const getForecastValue = (workItemId: string, programId?: string, teamId?: string, key?: string) => {
    // Check pending updates first
    if (key && pendingUpdates[key] !== undefined) {
      return pendingUpdates[key];
    }
    
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
    return total > available && available > 0;
  };

  // Check if a work item row is over capacity (any cell red)
  const isRowOverCapacity = (workItemId: string) => {
    return capacities.some(capacity => {
      const total = calculateTotalForContext(capacity.program_id, capacity.team_id);
      const available = getAvailableCapacity(capacity.program_id, capacity.team_id);
      const itemValue = getForecastValue(workItemId, capacity.program_id, capacity.team_id);
      const numValue = typeof itemValue === 'string' ? parseFloat(itemValue) || 0 : itemValue;
      return numValue > 0 && total > available && available > 0;
    });
  };

  // Rank mutation
  const updateRankMutation = useMutation({
    mutationFn: async ({ workItemId, newRank }: { workItemId: string; newRank: number }) => {
      const { error } = await supabase
        .from('work_item_forecast_ranks')
        .upsert({
          work_item_id: workItemId,
          work_item_type: workItemLevel.slice(0, -1),
          pi_id: piId,
          rank: newRank,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'work_item_id,work_item_type,pi_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecast-ranks'] });
      toast.success('Rank updated');
    },
    onError: (error) => {
      console.error('Failed to update rank:', error);
      toast.error('Failed to update rank');
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(orderedWorkItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedWorkItems(items);

    // Update ranks in database
    items.forEach((item, index) => {
      updateRankMutation.mutate({ workItemId: item.id as string, newRank: index });
    });
  };

  const handleRankAction = (workItemId: string, action: 'top' | 'bottom' | 'up' | 'down') => {
    const currentIndex = orderedWorkItems.findIndex(item => item.id === workItemId);
    if (currentIndex === -1) return;

    const items = Array.from(orderedWorkItems);
    const [item] = items.splice(currentIndex, 1);

    let newIndex = currentIndex;
    switch (action) {
      case 'top':
        newIndex = 0;
        break;
      case 'bottom':
        newIndex = items.length;
        break;
      case 'up':
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'down':
        newIndex = Math.min(items.length, currentIndex + 1);
        break;
    }

    items.splice(newIndex, 0, item);
    setOrderedWorkItems(items);

    // Update ranks in database
    items.forEach((item, index) => {
      updateRankMutation.mutate({ workItemId: item.id as string, newRank: index });
    });
  };

  if (workItemsLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  if (workItems.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No work items found</div>;
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b">
                {/* Zone 1: Sticky left columns */}
                <th className="text-left p-3 font-medium text-sm w-[50px] sticky left-0 bg-muted/50 z-20">
                  <span className="sr-only">Drag</span>
                </th>
                <th className="text-left p-3 font-medium text-sm w-[250px] sticky left-[50px] bg-muted/50 z-20 border-r">
                  Epic
                </th>
              
                {/* Zone 2: Scrollable default columns per screenshot */}
                <th className="text-left p-3 font-medium text-sm min-w-[150px] bg-muted/50">Theme</th>
                <th className="text-left p-3 font-medium text-sm min-w-[120px] bg-muted/50">Owner</th>
                <th className="text-right p-3 font-medium text-sm min-w-[100px] bg-muted/50">PI estimate</th>
                <th className="text-right p-3 font-medium text-sm min-w-[120px] bg-muted/50">Program estimate</th>
                <th className="text-right p-3 font-medium text-sm min-w-[120px] bg-muted/50">Team estimate</th>
                <th className="text-right p-3 font-medium text-sm min-w-[100px] bg-muted/50 border-r">Capacity %</th>
              
                {/* Zone 3: Estimate input matrix (Pts columns) */}
                {capacities.map((capacity, idx) => (
                  <th
                    key={capacity.id}
                    className={cn(
                      "text-right p-3 font-medium text-sm min-w-[100px]",
                      isOverCapacity(capacity.program_id, capacity.team_id) ? "bg-destructive text-destructive-foreground" : "bg-muted/50",
                      idx < capacities.length - 1 && "border-r"
                    )}
                  >
                    <div className="font-semibold text-xs">
                      {viewLevel === 'program' ? capacity.programs?.name : capacity.teams?.name}
                    </div>
                    <div className={cn(
                      "text-xs font-normal mt-1",
                      isOverCapacity(capacity.program_id, capacity.team_id) && "font-bold"
                    )}>
                      {calculateTotalForContext(capacity.program_id, capacity.team_id)}/{capacity.available_capacity}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <Droppable droppableId="forecast-items">
              {(provided) => (
                <tbody ref={provided.innerRef} {...provided.droppableProps}>
                  {orderedWorkItems.map((item, index) => {
            const piEstimate = forecasts
              .filter(f => f.work_item_id === item.id)
              .reduce((sum, f) => sum + (f.estimate || 0), 0);

            const itemKey = 
              'epic_key' in item ? item.epic_key :
              'capability_key' in item ? item.capability_key :
              'F-' + (item.id as string).slice(0, 4);

                    return (
                      <Draggable key={item.id as string} draggableId={item.id as string} index={index}>
                        {(provided, snapshot) => (
                          <ForecastContextMenu
                            onMoveToTop={() => handleRankAction(item.id as string, 'top')}
                            onMoveToBottom={() => handleRankAction(item.id as string, 'bottom')}
                            onMoveUp={() => handleRankAction(item.id as string, 'up')}
                            onMoveDown={() => handleRankAction(item.id as string, 'down')}
                          >
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "border-b hover:bg-muted/30 transition-colors group",
                                snapshot.isDragging && "bg-muted/50 shadow-lg",
                                isRowOverCapacity(item.id as string) && "bg-destructive/10 hover:bg-destructive/20"
                              )}
                            >
                              {/* Zone 1: Drag handle + Sticky left */}
                              <td className="p-3 sticky left-0 bg-background group-hover:bg-muted/30 z-10">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </td>
                              <td className="p-3 sticky left-[50px] bg-background group-hover:bg-muted/30 z-10 border-r">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {itemKey}
                                  </span>
                                  <span className="text-sm font-medium truncate">{item.name as string}</span>
                                </div>
                              </td>
                
                              {/* Zone 2: Scrollable default columns */}
                              <td className="p-3 text-sm text-muted-foreground">
                                {/* TODO: Fetch theme from epics.theme_id join */}
                                -
                              </td>
                              <td className="p-3 text-sm text-muted-foreground">
                                {/* TODO: Fetch owner from owner_id */}
                                -
                              </td>
                              <td className="p-3 text-right text-sm font-semibold">
                                {piEstimate}
                              </td>
                              <td className="p-3 text-right text-sm font-medium">
                                {forecasts
                                  .filter(f => f.work_item_id === item.id && f.program_id && !f.team_id)
                                  .reduce((sum, f) => sum + (f.estimate || 0), 0) || 'No data'}
                              </td>
                              <td className="p-3 text-right text-sm font-medium">
                                {forecasts
                                  .filter(f => f.work_item_id === item.id && f.team_id)
                                  .reduce((sum, f) => sum + (f.estimate || 0), 0) || 'No data'}
                              </td>
                              <td className="p-3 text-right text-sm font-medium border-r">
                                {piEstimate > 0 && capacities.length > 0
                                  ? `${Math.round((piEstimate / capacities.reduce((sum, c) => sum + c.available_capacity, 0)) * 100)}%`
                                  : '0%'}
                              </td>
                
                 {/* Zone 3: Estimate inputs */}
                 {capacities.map((capacity, idx) => {
                   const inputKey = `${item.id}-${capacity.program_id || 'null'}-${capacity.team_id || 'null'}`;
                   const value = getForecastValue(item.id as string, capacity.program_id, capacity.team_id, inputKey);
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
                         onChange={(e) => handleInputChange(inputKey, e.target.value)}
                         onBlur={() => handleInputBlur(
                           item.id as string,
                           capacity.program_id,
                           capacity.team_id,
                           inputKey
                         )}
                         disabled={!isAssigned}
                         className={cn(
                           "h-8 text-right text-sm",
                           !isAssigned && "bg-muted/50 cursor-not-allowed",
                           isOverCapacity(capacity.program_id, capacity.team_id) && "bg-destructive/20 border-destructive"
                         )}
                         placeholder={isAssigned ? "0" : "-"}
                       />
                     </td>
                               );
                            })}
                            </tr>
                          </ForecastContextMenu>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </tbody>
              )}
            </Droppable>
          </table>
        </div>
      </div>
    </DragDropContext>
  );
}
