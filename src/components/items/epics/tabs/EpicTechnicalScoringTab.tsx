import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calculator, Info, TrendingUp, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { calculateTechnicalScore } from '@/hooks/useEpicMutations';

/**
 * EpicTechnicalScoringTab - Technical Scoring tab for Epic details panel
 * Phase 1: Replaces WSJF with Technical Scoring (same formula, new terminology)
 * 
 * Key changes from EpicWSJFTab:
 * - No PI dimension - single technical score per Epic
 * - Renamed labels: WSJF → Technical Score, Business Value → Technical Value
 * - Auto-recompute on input changes
 */

interface EpicTechnicalScoringTabProps {
  epic: any;
}

// Fibonacci scale values
const FIBONACCI_VALUES = [0, 1, 2, 3, 5, 8, 13, 20, 40, 100];

export function EpicTechnicalScoringTab({ epic }: EpicTechnicalScoringTabProps) {
  const queryClient = useQueryClient();
  
  // Local state for scoring inputs
  const [localValues, setLocalValues] = useState({
    technical_value: 0,
    time_criticality: 0,
    risk_reduction: 0,
    job_size: 0,
  });

  // Fetch existing technical scoring data (first record per epic, no PI filter)
  const { data: scoringData, isLoading } = useQuery({
    queryKey: ['epic-technical-score', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_wsjf')
        .select('*')
        .eq('epic_id', epic.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Initialize local values from DB
      if (data) {
        setLocalValues({
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

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const score = calculateTechnicalScore(
        localValues.technical_value,
        localValues.time_criticality,
        localValues.risk_reduction,
        localValues.job_size
      );

      // Check if record exists
      const { data: existing } = await supabase
        .from('epic_wsjf')
        .select('id')
        .eq('epic_id', epic.id)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('epic_wsjf')
          .update({
            business_value: localValues.technical_value,
            time_value: localValues.time_criticality,
            rroe_value: localValues.risk_reduction,
            job_size: localValues.job_size,
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Create new record - need a placeholder PI for now (legacy constraint)
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
              business_value: localValues.technical_value,
              time_value: localValues.time_criticality,
              rroe_value: localValues.risk_reduction,
              job_size: localValues.job_size,
            });
          
          if (error) throw error;
        }
      }

      // Also update the epic's technical_score field if it exists
      await supabase
        .from('epics')
        .update({ 
          technical_score: score,
          updated_at: new Date().toISOString()
        })
        .eq('id', epic.id);

      return score;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-technical-score', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['epic-detail', epic.id] });
      toast.success('Technical score saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  if (!epic) {
    return <div className="text-center py-8 text-muted-foreground">Epic data not available</div>;
  }

  const handleValueChange = (field: keyof typeof localValues, value: number) => {
    setLocalValues(prev => ({ ...prev, [field]: value }));
  };

  // Calculate score from local values
  const calculatedScore = calculateTechnicalScore(
    localValues.technical_value,
    localValues.time_criticality,
    localValues.risk_reduction,
    localValues.job_size
  );

  const costOfDelay = localValues.technical_value + localValues.time_criticality + localValues.risk_reduction;

  return (
    <div className="space-y-6 p-6">
      <Alert className="bg-card">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Technical Scoring prioritizes work items based on Cost of Delay divided by Job Size.
          Higher scores indicate higher priority for technical delivery.
        </AlertDescription>
      </Alert>

      {/* Current Score Display */}
      <Card className="border-brand-gold">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-brand-gold" />
            Technical Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-brand-gold mb-4">
            {calculatedScore?.toFixed(2) || '0.00'}
          </div>
          <div className="text-sm text-muted-foreground">
            Formula: (TV + TC + RR) ÷ JS = ({localValues.technical_value} + {localValues.time_criticality} + {localValues.risk_reduction}) ÷ {localValues.job_size || 1}
          </div>
        </CardContent>
      </Card>

      {/* Scoring Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5 text-brand-gold" />
            Technical Scoring Inputs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Technical Value (was Business Value) */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Technical Value</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Relative technical value and impact, including architecture improvements, 
              technical debt reduction, and enabling capabilities for future work.
            </p>
            <Select 
              value={String(localValues.technical_value)} 
              onValueChange={(v) => handleValueChange('technical_value', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {FIBONACCI_VALUES.map((val) => (
                  <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Criticality */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Time Criticality</Label>
            <p className="text-xs text-muted-foreground mb-2">
              How the value may decay over time. Consider deadlines, dependencies on other work,
              and the effect on downstream deliverables while this is not available.
            </p>
            <Select 
              value={String(localValues.time_criticality)} 
              onValueChange={(v) => handleValueChange('time_criticality', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {FIBONACCI_VALUES.map((val) => (
                  <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Risk Reduction */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Risk Reduction / Opportunity Enablement</Label>
            <p className="text-xs text-muted-foreground mb-2">
              The need to eliminate risks early, the value of information gained,
              and the potential for new opportunities that may be unlocked.
            </p>
            <Select 
              value={String(localValues.risk_reduction)} 
              onValueChange={(v) => handleValueChange('risk_reduction', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {FIBONACCI_VALUES.map((val) => (
                  <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Size */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Effort / Job Size</Label>
            <p className="text-xs text-muted-foreground mb-2">
              The estimated effort required to complete this work. 
              Smaller efforts with high value yield higher priority scores.
            </p>
            <Select 
              value={String(localValues.job_size)} 
              onValueChange={(v) => handleValueChange('job_size', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select value" />
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
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full bg-brand-gold text-white hover:bg-brand-gold-hover"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Technical Score'}
          </Button>
        </CardContent>
      </Card>

      {/* Calculation Summary */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h4 className="text-sm font-semibold mb-4">Calculation Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Technical Value:</span>
              <span className="font-medium">{localValues.technical_value}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time Criticality:</span>
              <span className="font-medium">{localValues.time_criticality}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Risk Reduction:</span>
              <span className="font-medium">{localValues.risk_reduction}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground font-semibold">Cost of Delay:</span>
              <span className="font-bold">{costOfDelay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Job Size:</span>
              <span className="font-medium">{localValues.job_size}</span>
            </div>
            <div className="flex justify-between border-t pt-2 bg-brand-gold/10 -mx-4 px-4 py-2 rounded">
              <span className="font-bold">Technical Score:</span>
              <span className="text-xl font-bold text-brand-gold">{calculatedScore?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
