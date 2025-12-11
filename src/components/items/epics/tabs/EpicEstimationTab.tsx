/**
 * =====================================================
 * EpicEstimationTab - Unified Estimation & Technical Scoring
 * =====================================================
 * 
 * Contains:
 * - Estimation method selector (Points, T-shirt, Team Weeks, Member Weeks)
 * - Dynamic fields based on selected method
 * - Technical Scoring section (Technical Value, Time Criticality, Risk Reduction, Job Size)
 * - Computed Technical Score display
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Info, TrendingUp, Save, Loader2, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { calculateTechnicalScore } from '@/hooks/useEpicMutations';

interface EpicEstimationTabProps {
  epic: any;
}

// Fibonacci scale values for scoring
const FIBONACCI_VALUES = [0, 1, 2, 3, 5, 8, 13, 20, 40, 100];

// T-shirt sizes with team week conversions
const TSHIRT_SIZES = [
  { value: 'xs', label: 'XS', weeks: 1 },
  { value: 's', label: 'S', weeks: 2 },
  { value: 'm', label: 'M', weeks: 4 },
  { value: 'l', label: 'L', weeks: 8 },
  { value: 'xl', label: 'XL', weeks: 16 },
];

export function EpicEstimationTab({ epic }: EpicEstimationTabProps) {
  const queryClient = useQueryClient();
  
  // Estimation method state
  const [estimationSystem, setEstimationSystem] = useState(epic.estimation_system || 'points');
  const [pointsEstimate, setPointsEstimate] = useState<number>(epic.points_estimate || 0);
  const [tshirtSize, setTshirtSize] = useState(epic.tshirt_size || 'm');
  const [teamWeeks, setTeamWeeks] = useState<number>(epic.team_weeks || 0);
  const [memberWeeks, setMemberWeeks] = useState<number>(epic.member_weeks || 0);

  // Technical scoring state
  const [scoringValues, setScoringValues] = useState({
    technical_value: 0,
    time_criticality: 0,
    risk_reduction: 0,
    job_size: 0,
  });

  // Sync estimation fields when epic changes
  useEffect(() => {
    setEstimationSystem(epic.estimation_system || 'points');
    setPointsEstimate(epic.points_estimate || 0);
    setTshirtSize(epic.tshirt_size || 'm');
    setTeamWeeks(epic.team_weeks || 0);
    setMemberWeeks(epic.member_weeks || 0);
  }, [epic]);

  // Fetch existing technical scoring data
  const { data: scoringData, isLoading: loadingScoring } = useQuery({
    queryKey: ['epic-technical-score-data', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_wsjf')
        .select('*')
        .eq('epic_id', epic.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setScoringValues({
          technical_value: data.business_value || 0,
          time_criticality: data.time_value || 0,
          risk_reduction: data.rroe_value || 0,
          job_size: data.job_size || 0,
        });
      }
      
      return data;
    },
    enabled: !!epic?.id,
  });

  // Update estimation mutation
  const updateEstimationMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('epics')
        .update(updates)
        .eq('id', epic.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['epic-detail', epic.id] });
      toast.success('Estimation updated');
    },
    onError: () => {
      toast.error('Failed to update estimation');
    }
  });

  // Save technical scoring mutation
  const saveScoringMutation = useMutation({
    mutationFn: async () => {
      const score = calculateTechnicalScore(
        scoringValues.technical_value,
        scoringValues.time_criticality,
        scoringValues.risk_reduction,
        scoringValues.job_size
      );

      const { data: existing } = await supabase
        .from('epic_wsjf')
        .select('id')
        .eq('epic_id', epic.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('epic_wsjf')
          .update({
            business_value: scoringValues.technical_value,
            time_value: scoringValues.time_criticality,
            rroe_value: scoringValues.risk_reduction,
            job_size: scoringValues.job_size,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { data: anyPi } = await supabase
          .from('program_increments')
          .select('id')
          .limit(1)
          .single();
        
        if (anyPi) {
          const { error } = await supabase
            .from('epic_wsjf')
            .insert({
              epic_id: epic.id,
              pi_id: anyPi.id,
              business_value: scoringValues.technical_value,
              time_value: scoringValues.time_criticality,
              rroe_value: scoringValues.risk_reduction,
              job_size: scoringValues.job_size,
            });
          if (error) throw error;
        }
      }

      // Update epic's technical_score field
      await supabase
        .from('epics')
        .update({ technical_score: score, updated_at: new Date().toISOString() })
        .eq('id', epic.id);

      return score;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-technical-score-data', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['epic-technical-score', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Technical score saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Handle estimation system change
  const handleEstimationSystemChange = (value: string) => {
    setEstimationSystem(value);
    updateEstimationMutation.mutate({ estimation_system: value });
  };

  // Handle points change
  const handlePointsChange = (value: number) => {
    setPointsEstimate(value);
    updateEstimationMutation.mutate({ points_estimate: value });
  };

  // Handle T-shirt size change
  const handleTshirtChange = (value: string) => {
    setTshirtSize(value);
    const weeks = TSHIRT_SIZES.find(s => s.value === value)?.weeks || 0;
    updateEstimationMutation.mutate({ tshirt_size: value, team_weeks: weeks });
  };

  // Handle team/member weeks change
  const handleWeeksChange = (field: 'team_weeks' | 'member_weeks', value: number) => {
    if (field === 'team_weeks') {
      setTeamWeeks(value);
    } else {
      setMemberWeeks(value);
    }
    updateEstimationMutation.mutate({ [field]: value });
  };

  // Handle scoring value change
  const handleScoringValueChange = (field: keyof typeof scoringValues, value: number) => {
    setScoringValues(prev => ({ ...prev, [field]: value }));
  };

  // Calculate technical score
  const calculatedScore = calculateTechnicalScore(
    scoringValues.technical_value,
    scoringValues.time_criticality,
    scoringValues.risk_reduction,
    scoringValues.job_size
  );

  const costOfDelay = scoringValues.technical_value + scoringValues.time_criticality + scoringValues.risk_reduction;

  if (!epic) {
    return <div className="text-center py-8 text-muted-foreground">Epic data not available</div>;
  }

  return (
    <div className="space-y-6 p-4">
      {/* Estimation Method Section */}
      <Card className="border border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-5 w-5 text-primary" />
            Estimation Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Estimation System</Label>
            <Select value={estimationSystem} onValueChange={handleEstimationSystemChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points">Story Points</SelectItem>
                <SelectItem value="tshirt">T-Shirt Sizing</SelectItem>
                <SelectItem value="team_weeks">Team Weeks</SelectItem>
                <SelectItem value="member_weeks">Member Weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic fields based on estimation system */}
          {estimationSystem === 'points' && (
            <div>
              <Label className="text-sm font-medium">Story Points</Label>
              <Select value={String(pointsEstimate)} onValueChange={(v) => handlePointsChange(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIBONACCI_VALUES.map((val) => (
                    <SelectItem key={val} value={String(val)}>{val} pts</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {estimationSystem === 'tshirt' && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">T-Shirt Size</Label>
                <Select value={tshirtSize} onValueChange={handleTshirtChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TSHIRT_SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label} (~{size.weeks} team weeks)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                Converts to approximately {TSHIRT_SIZES.find(s => s.value === tshirtSize)?.weeks || 0} team weeks
              </div>
            </div>
          )}

          {estimationSystem === 'team_weeks' && (
            <div>
              <Label className="text-sm font-medium">Team Weeks</Label>
              <Input
                type="number"
                min={0}
                value={teamWeeks}
                onChange={(e) => handleWeeksChange('team_weeks', parseInt(e.target.value) || 0)}
              />
            </div>
          )}

          {estimationSystem === 'member_weeks' && (
            <div>
              <Label className="text-sm font-medium">Member Weeks</Label>
              <Input
                type="number"
                min={0}
                value={memberWeeks}
                onChange={(e) => handleWeeksChange('member_weeks', parseInt(e.target.value) || 0)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical Scoring Section */}
      <Alert className="bg-card border-primary/20">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Technical Scoring prioritizes work based on Cost of Delay divided by Job Size.
          Higher scores indicate higher priority.
        </AlertDescription>
      </Alert>

      <Card className="border-primary/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Technical Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary mb-2">
            {calculatedScore?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-muted-foreground mb-4">
            Formula: (TV + TC + RR) ÷ JS = ({scoringValues.technical_value} + {scoringValues.time_criticality} + {scoringValues.risk_reduction}) ÷ {scoringValues.job_size || 1}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5 text-primary" />
            Scoring Inputs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Technical Value */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Technical Value</Label>
            <p className="text-xs text-muted-foreground">
              Relative technical value including architecture improvements and enabling capabilities.
            </p>
            <Select 
              value={String(scoringValues.technical_value)} 
              onValueChange={(v) => handleScoringValueChange('technical_value', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIBONACCI_VALUES.map((val) => (
                  <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Criticality */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Time Criticality</Label>
            <p className="text-xs text-muted-foreground">
              How value decays over time. Consider deadlines and downstream dependencies.
            </p>
            <Select 
              value={String(scoringValues.time_criticality)} 
              onValueChange={(v) => handleScoringValueChange('time_criticality', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIBONACCI_VALUES.map((val) => (
                  <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Risk Reduction */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Risk Reduction / Opportunity</Label>
            <p className="text-xs text-muted-foreground">
              The need to eliminate risks early and potential for new opportunities.
            </p>
            <Select 
              value={String(scoringValues.risk_reduction)} 
              onValueChange={(v) => handleScoringValueChange('risk_reduction', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIBONACCI_VALUES.map((val) => (
                  <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Size */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Effort / Job Size</Label>
            <p className="text-xs text-muted-foreground">
              Estimated effort required. Smaller efforts with high value yield higher scores.
            </p>
            <Select 
              value={String(scoringValues.job_size)} 
              onValueChange={(v) => handleScoringValueChange('job_size', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIBONACCI_VALUES.map((val) => (
                  <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Save Button */}
          <Button 
            onClick={() => saveScoringMutation.mutate()}
            disabled={saveScoringMutation.isPending}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveScoringMutation.isPending ? 'Saving...' : 'Save Technical Score'}
          </Button>
        </CardContent>
      </Card>

      {/* Calculation Summary */}
      <Card className="bg-muted/20 border-border/40">
        <CardContent className="pt-4">
          <h4 className="text-sm font-semibold mb-3">Calculation Summary</h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Technical Value:</span>
              <span className="font-medium">{scoringValues.technical_value}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time Criticality:</span>
              <span className="font-medium">{scoringValues.time_criticality}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Risk Reduction:</span>
              <span className="font-medium">{scoringValues.risk_reduction}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5">
              <span className="text-muted-foreground font-semibold">Cost of Delay:</span>
              <span className="font-bold">{costOfDelay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Job Size:</span>
              <span className="font-medium">{scoringValues.job_size}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 bg-primary/10 -mx-3 px-3 py-1.5 rounded">
              <span className="font-bold">Technical Score:</span>
              <span className="text-lg font-bold text-primary">{calculatedScore?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
