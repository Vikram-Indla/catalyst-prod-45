import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { useCapacityWarnings } from '@/hooks/useCapacityWarnings';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Estimation system constants
const FIBONACCI_VALUES = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

const TSHIRT_OPTIONS = [
  { value: 'xs', label: 'XS', teamWeeks: 1 },
  { value: 's', label: 'S', teamWeeks: 2 },
  { value: 'm', label: 'M', teamWeeks: 4 },
  { value: 'l', label: 'L', teamWeeks: 8 },
  { value: 'xl', label: 'XL', teamWeeks: 16 },
  { value: 'xxl', label: 'XXL', teamWeeks: 32 },
];

type EstimationSystem = 'points' | 'wsjf' | 'tshirt' | 'team_weeks' | 'member_weeks';

interface ForecastTabProps {
  workItemId: string;
  workItemType: 'epic' | 'feature';
  estimationSystem?: EstimationSystem;
}

// Helper to get unit label based on estimation system
const getUnitLabel = (system: EstimationSystem): string => {
  switch (system) {
    case 'points':
    case 'wsjf':
      return 'PTS';
    case 'tshirt':
      return 'T-Shirt';
    case 'team_weeks':
      return 'TW';
    case 'member_weeks':
      return 'MW';
    default:
      return 'PTS';
  }
};

// Helper to get estimate label based on estimation system
const getEstimateLabel = (system: EstimationSystem): string => {
  switch (system) {
    case 'points':
      return 'PI Estimate (Points)';
    case 'wsjf':
      return 'PI Estimate (Job Size)';
    case 'tshirt':
      return 'PI Estimate (T-Shirt Size)';
    case 'team_weeks':
      return 'PI Estimate (Team Weeks)';
    case 'member_weeks':
      return 'PI Estimate (Member Weeks)';
    default:
      return 'PI Estimate';
  }
};

// Get T-Shirt conversion display
const getTShirtConversion = (value: string): string => {
  const option = TSHIRT_OPTIONS.find(o => o.value === value);
  return option ? `≈ ${option.teamWeeks} Team Weeks` : '';
};

export function ForecastTab({ workItemId, workItemType, estimationSystem = 'points' }: ForecastTabProps) {
  const queryClient = useQueryClient();
  const [selectedPiId, setSelectedPiId] = useState<string>('');
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());

  // Fetch capacity warnings
  const { data: capacityWarnings = [] } = useCapacityWarnings(selectedPiId);

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
        .select('*, project_id')
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
      unit,
      tshirtValue,
    }: {
      piId: string;
      programId?: string;
      teamId?: string;
      estimate: number;
      unit: string;
      tshirtValue?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // Build query for existing entry - use limit(1) to avoid maybeSingle failing on duplicates
      let query = supabase
        .from('forecast_entries')
        .select('id')
        .eq('work_item_id', workItemId)
        .eq('work_item_type', workItemType)
        .eq('pi_id', piId);
      
      // Handle nullable columns
      if (programId) {
        query = query.eq('program_id', programId);
      } else {
        query = query.is('program_id', null);
      }
      
      if (teamId) {
        query = query.eq('team_id', teamId);
      } else {
        query = query.is('team_id', null);
      }

      const { data: existingRows } = await query.order('updated_at', { ascending: false }).limit(1);
      const existing = existingRows?.[0];

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('forecast_entries')
          .update({
            estimate,
            unit,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('forecast_entries')
          .insert({
            work_item_id: workItemId,
            work_item_type: workItemType,
            pi_id: piId,
            program_id: programId || null,
            team_id: teamId || null,
            estimate,
            unit,
            updated_by: userId,
          })
          .select();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecast-entries'] });
      // Use toast ID to prevent duplicate notifications
      toast.success('Forecast updated', { id: 'forecast-update' });
    },
    onError: (error) => {
      console.error('Failed to update forecast:', error);
      toast.error('Failed to update forecast', { id: 'forecast-error' });
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
    // Database constraint: team estimates are saved with program_id=NULL
    // So when looking for team-level estimates, we must look for NULL program_id
    const entry = forecasts.find(f => {
      if (teamId) {
        // For team-level entries, program_id is NULL in database
        return f.team_id === teamId && f.program_id === null;
      }
      // For program-level entries (no team)
      return f.program_id === programId && f.team_id === null;
    });
    return entry?.estimate?.toString() || '';
  };

  const getProgramTotal = (programId: string) => {
    // Get teams for this program
    const programTeams = teams.filter(t => t.project_id === programId);
    const teamIds = programTeams.map(t => t.id);
    
    // Sum estimates for all teams in this program
    // Team estimates are stored with team_id set and program_id=NULL
    let total = 0;
    for (const teamId of teamIds) {
      const entry = forecasts.find(f => f.team_id === teamId);
      if (entry) {
        total += entry.estimate || 0;
      }
    }
    return total;
  };

  const getTotalEstimate = () => {
    return forecasts.reduce((sum, f) => sum + (f.estimate || 0), 0);
  };

  // Map estimation system to valid database unit values
  // Database constraint: CHECK unit IN ('points', 'team_weeks', 'member_weeks')
  const getDbUnit = (system: EstimationSystem): string => {
    switch (system) {
      case 'points':
      case 'wsjf':
        return 'points';
      case 'tshirt':
      case 'team_weeks':
        return 'team_weeks';
      case 'member_weeks':
        return 'member_weeks';
      default:
        return 'points';
    }
  };

  const handleEstimateChange = (
    programId: string | undefined,
    teamId: string | undefined,
    value: string
  ) => {
    if (!selectedPiId) return;
    
    let estimate: number;
    let unit = getDbUnit(estimationSystem);
    
    if (estimationSystem === 'tshirt') {
      // For T-Shirt, convert to team weeks for storage
      const option = TSHIRT_OPTIONS.find(o => o.value === value);
      estimate = option?.teamWeeks || 0;
    } else {
      estimate = parseFloat(value) || 0;
    }
    
    // Database constraint: if team_id is set, program_id must be NULL
    // Only one scope level allowed: PI-only, program-only, or team-only
    updateForecastMutation.mutate({
      piId: selectedPiId,
      programId: teamId ? undefined : programId, // Clear programId if team is specified
      teamId,
      estimate,
      unit,
      tshirtValue: estimationSystem === 'tshirt' ? value : undefined,
    });
  };

  // Render the appropriate input based on estimation system
  // Using onBlur instead of onChange to prevent mutation on every keystroke
  const renderEstimateInput = (programId: string, teamId: string) => {
    const currentValue = getForecastValue(programId, teamId);
    
    switch (estimationSystem) {
      case 'points':
        return (
          <div className="flex items-center gap-2">
            <Select
              value={currentValue || undefined}
              onValueChange={(value) => handleEstimateChange(programId, teamId, value)}
            >
              <SelectTrigger className="w-24 h-8 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {FIBONACCI_VALUES.map(v => (
                  <SelectItem key={v} value={v.toString()}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground w-8">PTS</span>
          </div>
        );
        
      case 'tshirt':
        // Find the T-Shirt value from the stored team weeks
        const tshirtOption = TSHIRT_OPTIONS.find(o => o.teamWeeks === parseFloat(currentValue));
        return (
          <div className="flex items-center gap-2">
            <Select
              value={tshirtOption?.value || undefined}
              onValueChange={(value) => handleEstimateChange(programId, teamId, value)}
            >
              <SelectTrigger className="w-24 h-8 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {TSHIRT_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground w-16">
              {tshirtOption ? `≈ ${tshirtOption.teamWeeks} TW` : ''}
            </span>
          </div>
        );
        
      case 'team_weeks':
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="0.5"
              defaultValue={currentValue}
              onBlur={(e) => handleEstimateChange(programId, teamId, e.target.value)}
              placeholder="Estimate"
              className="w-24 h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground w-8">TW</span>
          </div>
        );
        
      case 'member_weeks':
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="1"
              defaultValue={currentValue}
              onBlur={(e) => handleEstimateChange(programId, teamId, e.target.value)}
              placeholder="Estimate"
              className="w-24 h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground w-8">MW</span>
          </div>
        );
        
      case 'wsjf':
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="1"
              defaultValue={currentValue}
              onBlur={(e) => handleEstimateChange(programId, teamId, e.target.value)}
              placeholder="Job Size"
              className="w-24 h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground w-8">PTS</span>
          </div>
        );
        
      default:
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="0.5"
              defaultValue={currentValue}
              onBlur={(e) => handleEstimateChange(programId, teamId, e.target.value)}
              placeholder="Estimate"
              className="w-24 h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground w-8">PTS</span>
          </div>
        );
    }
  };

  const unitLabel = getUnitLabel(estimationSystem);

  return (
    <div className="p-6 space-y-6">
      {/* WSJF Info Banner */}
      {estimationSystem === 'wsjf' && (
        <Alert className="executive-card border-brand-gold/30">
          <Info className="h-4 w-4 text-brand-gold" />
          <AlertDescription className="text-sm">
            <strong>WSJF is for prioritisation, not effort estimation.</strong> The Job Size from the WSJF tab can be used as an effort proxy for forecasting.
            Visit the WSJF tab to calculate priority scores.
          </AlertDescription>
        </Alert>
      )}

      {/* Program Increments Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Program Increments</h3>
        
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-sm mb-2">{getEstimateLabel(estimationSystem)}</Label>
            <Select 
              value={selectedPiId || undefined} 
              onValueChange={(value) => setSelectedPiId(value || '')}
            >
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
            <div className="text-lg font-semibold">
              {getTotalEstimate()} <span className="text-sm text-muted-foreground">{unitLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Warnings */}
      {selectedPiId && capacityWarnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Capacity Warnings</div>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {capacityWarnings.map(warning => (
                <li key={warning.teamId}>
                  <span className="font-medium">{warning.teamName}</span>: 
                  {warning.overallocation > 0 
                    ? ` Overallocated by ${warning.overallocation} ${unitLabel.toLowerCase()} (${Math.round(warning.percentUsed)}% capacity used)`
                    : ` At ${Math.round(warning.percentUsed)}% capacity`
                  }
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

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
                const programTeams = teams.filter(t => t.project_id === program.id);
                const isExpanded = expandedPrograms.has(program.id);
                
                return (
                  <Card key={program.id} className="overflow-hidden border-brand-gold">
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
                                  {renderEstimateInput(program.id, team.id)}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Program Estimate Total */}
                          <div className="p-3 pl-10 bg-muted/30 border-t flex items-center justify-between">
                            <Label className="text-sm font-semibold">Program Estimate</Label>
                            <div className="text-lg font-bold text-brand-gold">
                              {getProgramTotal(program.id)} <span className="text-sm text-muted-foreground">{unitLabel}</span>
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
