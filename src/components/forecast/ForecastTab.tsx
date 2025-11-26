import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';

interface ForecastTabProps {
  workItemId: string;
  workItemType: 'epic' | 'capability' | 'feature';
}

export function ForecastTab({ workItemId, workItemType }: ForecastTabProps) {
  const queryClient = useQueryClient();

  // Fetch all PIs
  const { data: pis = [] } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch forecast entries for this work item
  const { data: forecasts = [] } = useQuery({
    queryKey: ['forecast-entries', workItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forecast_entries')
        .select('*, program_increments(name), programs(name), teams(name)')
        .eq('work_item_id', workItemId)
        .eq('work_item_type', workItemType);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch programs and teams for this work item
  const { data: assignments = [] } = useQuery({
    queryKey: ['work-item-assignments', workItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_assignments')
        .select('*, programs(name), teams(name)')
        .eq('work_item_id', workItemId)
        .eq('work_item_type', workItemType);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation to update forecast entry
  const updateForecastMutation = useMutation({
    mutationFn: async ({
      piId,
      programId,
      teamId,
      estimate,
    }: {
      piId: string;
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

  const getForecastValue = (piId: string, programId?: string, teamId?: string) => {
    const entry = forecasts.find(f =>
      f.pi_id === piId &&
      f.program_id === programId &&
      f.team_id === teamId
    );
    return entry?.estimate || 0;
  };

  const getPITotal = (piId: string) => {
    return forecasts
      .filter(f => f.pi_id === piId)
      .reduce((sum, f) => sum + (f.estimate || 0), 0);
  };

  const getProgramTotal = (piId: string, programId: string) => {
    return forecasts
      .filter(f => f.pi_id === piId && f.program_id === programId)
      .reduce((sum, f) => sum + (f.estimate || 0), 0);
  };

  const handleEstimateChange = (
    piId: string,
    programId: string | undefined,
    teamId: string | undefined,
    value: string
  ) => {
    const estimate = parseFloat(value) || 0;
    
    updateForecastMutation.mutate({
      piId,
      programId,
      teamId,
      estimate,
    });
  };

  // Group assignments by program
  const programAssignments = assignments.filter(a => a.program_id && !a.team_id);
  const teamAssignments = assignments.filter(a => a.team_id);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Forecast by Program Increment</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Enter forecasted estimates for each team within each program for each PI.
          Team-level entries automatically roll up into program and PI totals.
        </p>
      </div>

      {pis.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No Program Increments found
        </div>
      ) : (
        <div className="space-y-4">
          {pis.map(pi => (
            <Card key={pi.id} className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold">{pi.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(pi.start_date).toLocaleDateString()} - {new Date(pi.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <Label className="text-sm text-muted-foreground">PI Total</Label>
                  <div className="text-2xl font-bold">{getPITotal(pi.id)}</div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Program-level estimates */}
                {programAssignments.map(assignment => (
                  <div key={assignment.id} className="border-l-2 border-primary/20 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-medium">{assignment.programs?.name}</Label>
                      <div className="text-sm text-muted-foreground">
                        Total: {getProgramTotal(pi.id, assignment.program_id!)}
                      </div>
                    </div>
                    
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={getForecastValue(pi.id, assignment.program_id, undefined) || ''}
                      onChange={(e) => handleEstimateChange(
                        pi.id,
                        assignment.program_id,
                        undefined,
                        e.target.value
                      )}
                      placeholder="Enter program estimate"
                      className="max-w-xs"
                    />

                    {/* Team-level estimates under this program */}
                    {teamAssignments
                      .filter(ta => ta.program_id === assignment.program_id)
                      .map(teamAssignment => (
                        <div key={teamAssignment.id} className="ml-4 mt-2">
                          <Label className="text-sm">{teamAssignment.teams?.name}</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={getForecastValue(pi.id, undefined, teamAssignment.team_id) || ''}
                            onChange={(e) => handleEstimateChange(
                              pi.id,
                              undefined,
                              teamAssignment.team_id,
                              e.target.value
                            )}
                            placeholder="Enter team estimate"
                            className="max-w-xs mt-1"
                          />
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
