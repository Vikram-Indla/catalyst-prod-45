import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';

interface ForecastTabProps {
  workItemId: string;
  workItemType: 'epic' | 'feature';
}

export function ForecastTab({ workItemId, workItemType }: ForecastTabProps) {
  const queryClient = useQueryClient();
  const [selectedPiId, setSelectedPiId] = useState<string>('');
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());

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

  // Fetch forecast entries for this work item and selected PI
  const { data: forecasts = [] } = useQuery({
    queryKey: ['forecast-entries', workItemId, selectedPiId],
    queryFn: async () => {
      if (!selectedPiId) return [];
      
      const { data, error } = await supabase
        .from('forecast_entries')
        .select('*, program_increments(name), programs(name), teams(name)')
        .eq('work_item_id', workItemId)
        .eq('work_item_type', workItemType)
        .eq('pi_id', selectedPiId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPiId,
  });

  // Fetch all programs with their teams
  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, program_id')
        .order('name');
      
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

  const toggleProgram = (programId: string) => {
    setExpandedPrograms(prev => {
      const next = new Set(prev);
      if (next.has(programId)) {
        next.delete(programId);
      } else {
        next.add(programId);
      }
      return next;
    });
  };

  const getForecastValue = (programId?: string, teamId?: string) => {
    const entry = forecasts.find(f =>
      f.program_id === programId &&
      f.team_id === teamId
    );
    return entry?.estimate?.toString() || '';
  };

  const getProgramTotal = (programId: string) => {
    return forecasts
      .filter(f => f.program_id === programId)
      .reduce((sum, f) => sum + (f.estimate || 0), 0);
  };

  const getTotalEstimate = () => {
    return forecasts.reduce((sum, f) => sum + (f.estimate || 0), 0);
  };

  const handleEstimateChange = (
    programId: string | undefined,
    teamId: string | undefined,
    value: string
  ) => {
    if (!selectedPiId) return;
    
    const estimate = parseFloat(value) || 0;
    
    updateForecastMutation.mutate({
      piId: selectedPiId,
      programId,
      teamId,
      estimate,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Program Increments Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Program Increments</h3>
        
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-sm mb-2">Estimate for</Label>
            <Select value={selectedPiId} onValueChange={setSelectedPiId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Program Increment" />
              </SelectTrigger>
              <SelectContent>
                {pis.map(pi => (
                  <SelectItem key={pi.id} value={pi.id}>
                    {pi.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              + Sum all
            </Button>
            <div className="text-lg font-semibold">{getTotalEstimate()} <span className="text-sm text-muted-foreground">PTS</span></div>
          </div>
        </div>
      </div>

      {/* Programs and Teams Section */}
      {selectedPiId && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold">Programs and teams</h3>
          
          {programs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No programs found
            </div>
          ) : (
            <div className="space-y-3">
              {programs.map(program => {
                const programTeams = teams.filter(t => t.program_id === program.id);
                const isExpanded = expandedPrograms.has(program.id);
                
                return (
                  <Card key={program.id} className="overflow-hidden">
                    <Collapsible open={isExpanded} onOpenChange={() => toggleProgram(program.id)}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors">
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                          <span className="font-medium text-sm">{program.name}</span>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="border-t">
                          {programTeams.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No teams in this program
                            </div>
                          ) : (
                            <div className="divide-y">
                              {programTeams.map(team => (
                                <div key={team.id} className="p-3 pl-10 flex items-center justify-between hover:bg-muted/30">
                                  <Label className="text-sm">{team.name}</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={getForecastValue(program.id, team.id)}
                                      onChange={(e) => handleEstimateChange(program.id, team.id, e.target.value)}
                                      placeholder="Estimate"
                                      className="w-24 h-8 text-sm"
                                    />
                                    <span className="text-xs text-muted-foreground w-8">PTS</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Program Estimate Total */}
                          <div className="p-3 pl-10 bg-muted/30 border-t flex items-center justify-between">
                            <Label className="text-sm font-semibold">Program Estimate</Label>
                            <div className="text-lg font-bold text-brand-gold">
                              {getProgramTotal(program.id)} <span className="text-sm text-muted-foreground">PTS</span>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!selectedPiId && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Select a Program Increment to view and edit forecasts
        </div>
      )}
    </div>
  );
}
