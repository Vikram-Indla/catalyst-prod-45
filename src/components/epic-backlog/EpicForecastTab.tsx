import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Plus, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EpicForecastTabProps {
  epicId: string;
}

export function EpicForecastTab({ epicId }: EpicForecastTabProps) {
  const queryClient = useQueryClient();
  const [selectedPIId, setSelectedPIId] = useState<string>('');
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [previousPIEstimate, setPreviousPIEstimate] = useState<number | null>(null);

  // Fetch PIs associated with this epic
  const { data: pis = [] } = useQuery({
    queryKey: ['epic-pis', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_program_increments')
        .select('program_increments(id, name, start_date, end_date)')
        .eq('epic_id', epicId);
      
      if (error) throw error;
      return data?.map(d => d.program_increments).filter(Boolean) || [];
    },
  });

  // Fetch work item assignments (programs and teams)
  const { data: assignments = [] } = useQuery({
    queryKey: ['epic-assignments', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_assignments')
        .select('*, programs(name), teams(name, program_id)')
        .eq('work_item_id', epicId)
        .eq('work_item_type', 'epic');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch forecast entries for selected PI
  const { data: forecasts = [], refetch } = useQuery({
    queryKey: ['epic-forecast', epicId, selectedPIId],
    queryFn: async () => {
      if (!selectedPIId) return [];
      
      const { data, error } = await supabase
        .from('forecast_entries')
        .select('*')
        .eq('work_item_id', epicId)
        .eq('work_item_type', 'epic')
        .eq('pi_id', selectedPIId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPIId,
  });

  // Auto-select first PI if only one exists
  useEffect(() => {
    if (pis.length === 1 && !selectedPIId) {
      setSelectedPIId(pis[0].id);
    }
  }, [pis, selectedPIId]);

  // Mutation to upsert forecast entry
  const upsertForecastMutation = useMutation({
    mutationFn: async ({
      piId,
      programId,
      teamId,
      estimate,
    }: {
      piId: string;
      programId?: string | null;
      teamId?: string | null;
      estimate: number;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('forecast_entries')
        .upsert({
          work_item_id: epicId,
          work_item_type: 'epic',
          pi_id: piId,
          program_id: programId || null,
          team_id: teamId || null,
          estimate,
          unit: 'points',
          updated_by: user.user?.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'work_item_id,work_item_type,pi_id,program_id,team_id',
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['epic-forecast'] });
    },
    onError: (error) => {
      console.error('Failed to update forecast:', error);
      toast.error('Failed to save forecast');
    },
  });

  // Get forecast value by scope
  const getForecastValue = (programId?: string | null, teamId?: string | null) => {
    const entry = forecasts.find(f =>
      f.program_id === (programId || null) &&
      f.team_id === (teamId || null)
    );
    return entry?.estimate || 0;
  };

  // Check if epic is out of scope for selected PI
  const isOutOfScope = forecasts.some(f => 
    f.pi_id === selectedPIId && 
    f.program_id === null && 
    f.team_id === null && 
    f.in_scope === false
  );

  // Get PI estimate (entry with both program_id and team_id null)
  const piEstimate = getForecastValue(null, null);

  // Calculate sum of all program estimates
  const programAssignments = assignments.filter(a => a.program_id && !a.team_id);
  const sumOfProgramEstimates = programAssignments.reduce((sum, assignment) => {
    return sum + getForecastValue(assignment.program_id, null);
  }, 0);

  // Check if Sum all should be shown
  const showSumAll = programAssignments.length > 0 && sumOfProgramEstimates !== piEstimate;

  // Get teams for a program
  const getTeamsForProgram = (programId: string) => {
    return assignments.filter(a => a.team_id && a.program_id === programId);
  };

  // Calculate sum of team estimates for a program
  const getSumOfTeamEstimates = (programId: string) => {
    const teams = getTeamsForProgram(programId);
    return teams.reduce((sum, team) => {
      return sum + getForecastValue(null, team.team_id);
    }, 0);
  };

  // Check if program should show Sum button
  const shouldShowProgramSum = (programId: string) => {
    if (!expandedPrograms.has(programId)) return false;
    const teams = getTeamsForProgram(programId);
    if (teams.length === 0) return false;
    const programEst = getForecastValue(programId, null);
    const teamSum = getSumOfTeamEstimates(programId);
    return teamSum !== programEst;
  };

  // Handle estimate change with autosave
  const handleEstimateChange = (
    value: string,
    programId?: string | null,
    teamId?: string | null
  ) => {
    if (!selectedPIId) return;
    
    const estimate = parseFloat(value) || 0;
    upsertForecastMutation.mutate({
      piId: selectedPIId,
      programId,
      teamId,
      estimate,
    });
  };

  // Handle Sum button (program level)
  const handleProgramSum = (programId: string) => {
    if (!selectedPIId) return;
    const teamSum = getSumOfTeamEstimates(programId);
    upsertForecastMutation.mutate({
      piId: selectedPIId,
      programId,
      teamId: null,
      estimate: teamSum,
    });
    toast.success('Program estimate updated');
  };

  // Handle Sum all button (PI level)
  const handleSumAll = () => {
    if (!selectedPIId) return;
    setPreviousPIEstimate(piEstimate);
    upsertForecastMutation.mutate({
      piId: selectedPIId,
      programId: null,
      teamId: null,
      estimate: sumOfProgramEstimates,
    });
    toast.success('PI estimate updated');
  };

  // Handle Undo
  const handleUndo = () => {
    if (!selectedPIId || previousPIEstimate === null) return;
    upsertForecastMutation.mutate({
      piId: selectedPIId,
      programId: null,
      teamId: null,
      estimate: previousPIEstimate,
    });
    setPreviousPIEstimate(null);
    toast.success('Undo applied');
  };

  // Toggle program expansion
  const toggleProgram = (programId: string) => {
    const newExpanded = new Set(expandedPrograms);
    if (newExpanded.has(programId)) {
      newExpanded.delete(programId);
    } else {
      newExpanded.add(programId);
    }
    setExpandedPrograms(newExpanded);
  };

  // Check if epic has no PIs
  if (pis.length === 0) {
    return (
      <div className="p-6">
        <Alert className="bg-card">
          <AlertDescription>
            No Program Increment associated with this epic. Please associate a PI to use the Forecast feature.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Out of scope state
  if (isOutOfScope) {
    const selectedPI = pis.find(p => p.id === selectedPIId);
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Program Increment</Label>
            <Select value={selectedPIId} onValueChange={setSelectedPIId}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Select PI" />
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
          <Alert className="bg-card">
            <AlertDescription>
              Marked out-of-scope for {selectedPI?.name}.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* PI Selection and PI Estimate */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-semibold">Program Increment</Label>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Estimate for</span>
              <Select value={selectedPIId} onValueChange={setSelectedPIId}>
                <SelectTrigger className="flex-1 max-w-xs">
                  <SelectValue placeholder="Select PI" />
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
              <Input
                type="number"
                value={piEstimate || ''}
                onChange={(e) => handleEstimateChange(e.target.value, null, null)}
                className="w-24 text-right"
                step="0.5"
                min="0"
                disabled={!selectedPIId}
              />
              <span className="text-sm text-muted-foreground">pts</span>
              {showSumAll && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSumAll}
                    className="ml-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Sum all
                  </Button>
                  {previousPIEstimate !== null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleUndo}
                    >
                      <Undo2 className="h-3 w-3 mr-1" />
                      Undo
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Programs and Teams */}
      {selectedPIId && programAssignments.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Programs and teams</Label>
          <div className="space-y-1">
            {programAssignments.map((programAssignment) => {
              const programId = programAssignment.program_id!;
              const isExpanded = expandedPrograms.has(programId);
              const teams = getTeamsForProgram(programId);
              const programEst = getForecastValue(programId, null);

              return (
                <div key={programId} className="space-y-1">
                  {/* Program Row */}
                  <div className="flex items-center gap-2 py-2 hover:bg-muted/50 rounded px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleProgram(programId)}
                      className="h-6 w-6 p-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <span className="flex-1 text-sm font-medium">
                      {programAssignment.programs?.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={programEst || ''}
                        onChange={(e) => handleEstimateChange(e.target.value, programId, null)}
                        className="w-24 text-right h-8"
                        step="0.5"
                        min="0"
                      />
                      <span className="text-sm text-muted-foreground w-8">pts</span>
                    </div>
                  </div>

                  {/* Team Rows (when expanded) */}
                  {isExpanded && teams.length > 0 && (
                    <div className="ml-8 space-y-1">
                      {teams.map((teamAssignment) => {
                        const teamId = teamAssignment.team_id!;
                        const teamEst = getForecastValue(null, teamId);

                        return (
                          <div key={teamId} className="flex items-center gap-2 py-2 hover:bg-muted/50 rounded px-2">
                            <span className="flex-1 text-sm">
                              {teamAssignment.teams?.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={teamEst || ''}
                                onChange={(e) => handleEstimateChange(e.target.value, null, teamId)}
                                className="w-24 text-right h-8"
                                step="0.5"
                                min="0"
                              />
                              <span className="text-sm text-muted-foreground w-8">pts</span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Program Estimate Row (under teams) */}
                      <div className="flex items-center gap-2 py-2 border-t mt-2 pt-2 px-2">
                        <span className="flex-1 text-sm font-medium text-muted-foreground">
                          Program Estimate
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 text-right text-sm font-semibold">
                            {programEst || 0}
                          </div>
                          <span className="text-sm text-muted-foreground w-8">pts</span>
                          {shouldShowProgramSum(programId) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleProgramSum(programId)}
                              className="h-7"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Sum
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
