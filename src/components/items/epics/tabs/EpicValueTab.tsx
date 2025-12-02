import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface EpicValueTabProps {
  epic: any;
}

// ROI field configuration matching Jira Align scorecards
interface ROIField {
  id: string;
  number: number;
  label: string;
  options: string[];
  dbField: string;
  scoreType: 'benefit' | 'cost' | 'risk';
}

const ROI_FIELDS: ROIField[] = [
  {
    id: 'cost',
    number: 1,
    label: 'Expected Cost',
    options: ['Low', 'Medium', 'High'],
    dbField: 'cost_score',
    scoreType: 'cost'
  },
  {
    id: 'profit_potential',
    number: 2,
    label: 'Profit Potential',
    options: ['Low', 'Medium', 'High'],
    dbField: 'profit_potential_score',
    scoreType: 'benefit'
  },
  {
    id: 'time_to_market',
    number: 3,
    label: 'Time to Market',
    options: ['Low', 'Medium', 'High'],
    dbField: 'time_to_market_score',
    scoreType: 'benefit'
  },
  {
    id: 'development_risks',
    number: 4,
    label: 'Development Risks',
    options: ['Low', 'Medium', 'High'],
    dbField: 'development_risks_score',
    scoreType: 'risk'
  }
];

// Score mapping based on field type
const SCORE_MAPS = {
  benefit: { 'Low': 33, 'Medium': 66, 'High': 100 },
  cost: { 'Low': 100, 'Medium': 66, 'High': 33 },
  risk: { 'Low': 100, 'Medium': 66, 'High': 33 }
};

// Reverse mapping from score to option
const getOptionFromScore = (score: number | null, scoreType: 'benefit' | 'cost' | 'risk'): string => {
  if (score === null || score === undefined) return 'Medium';
  const map = SCORE_MAPS[scoreType];
  const reversedMap = Object.entries(map).reduce((acc, [key, val]) => {
    acc[val] = key;
    return acc;
  }, {} as Record<number, string>);
  
  // Find closest match
  const scores = Object.keys(reversedMap).map(Number);
  const closest = scores.reduce((prev, curr) => 
    Math.abs(curr - score) < Math.abs(prev - score) ? curr : prev
  );
  return reversedMap[closest] || 'Medium';
};

// Get score color based on value
function getScoreColor(score: number): string {
  if (score >= 80) return 'hsl(var(--success))';
  if (score >= 50) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

// Circular Score Gauge component
function ScoreGauge({ score }: { score: number }) {
  const color = getScoreColor(score);
  
  return (
    <div 
      className="flex items-center justify-center w-16 h-16 rounded-full border-[6px] transition-colors"
      style={{ borderColor: color }}
    >
      <span className="text-xl font-bold text-foreground">{score}</span>
    </div>
  );
}

export function EpicValueTab({ epic }: EpicValueTabProps) {
  const queryClient = useQueryClient();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [selectedScorecard, setSelectedScorecard] = useState('default');

  // Fetch ROI scores
  const { data: roiScores, isLoading } = useQuery({
    queryKey: ['epic-roi-scores', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_roi_scores')
        .select('*')
        .eq('epic_id', epic.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Fetch average value score for comparison
  const { data: comparison } = useQuery({
    queryKey: ['epic-value-comparison', epic.id],
    queryFn: async () => {
      const { data: allScores, error } = await supabase
        .from('epic_roi_scores')
        .select('value_score');
      
      if (error) throw error;
      
      const scores = allScores
        ?.map(s => s.value_score)
        .filter((s): s is number => s !== null) || [];
      
      const average = scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0;
      
      const currentScore = roiScores?.value_score || 0;
      const diff = average > 0 
        ? Math.round(((currentScore - average) / average) * 100) 
        : 0;
      
      return {
        average: Math.round(average),
        percentageDiff: Math.abs(diff),
        isHigher: diff > 0
      };
    },
    enabled: !!roiScores
  });

  // Initialize field values from database
  useEffect(() => {
    if (roiScores) {
      const values: Record<string, string> = {};
      ROI_FIELDS.forEach(field => {
        const dbValue = roiScores[field.dbField as keyof typeof roiScores] as number | null;
        values[field.id] = getOptionFromScore(dbValue, field.scoreType);
      });
      setFieldValues(values);
    }
  }, [roiScores]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ fieldId, value }: { fieldId: string; value: string }) => {
      const field = ROI_FIELDS.find(f => f.id === fieldId);
      if (!field) return;

      const score = SCORE_MAPS[field.scoreType][value as keyof typeof SCORE_MAPS.benefit];
      
      // Calculate new value score using current scores
      const currentCost = field.dbField === 'cost_score' ? score : (roiScores?.cost_score ?? 66);
      const currentProfit = field.dbField === 'profit_potential_score' ? score : (roiScores?.profit_potential_score ?? 66);
      const currentTime = field.dbField === 'time_to_market_score' ? score : (roiScores?.time_to_market_score ?? 66);
      const currentRisk = field.dbField === 'development_risks_score' ? score : (roiScores?.development_risks_score ?? 66);
      
      const calculatedValueScore = Math.round(
        (currentCost + currentProfit + currentTime + (100 - currentRisk)) / 4
      );

      const { error } = await supabase
        .from('epic_roi_scores')
        .upsert({
          epic_id: epic.id,
          [field.dbField]: score,
          value_score: calculatedValueScore
        }, {
          onConflict: 'epic_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-roi-scores', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['epic-value-comparison', epic.id] });
    },
    onError: () => {
      toast.error('Failed to update score');
    }
  });

  // Handle field value change
  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
    updateMutation.mutate({ fieldId, value });
  };

  // Calculate field scores for display
  const fieldScores = useMemo(() => {
    const scores: Record<string, number> = {};
    ROI_FIELDS.forEach(field => {
      const value = fieldValues[field.id] || 'Medium';
      scores[field.id] = SCORE_MAPS[field.scoreType][value as keyof typeof SCORE_MAPS.benefit];
    });
    return scores;
  }, [fieldValues]);

  // Calculate overall value score
  const valueScore = useMemo(() => {
    if (roiScores?.value_score) return roiScores.value_score;
    
    const scores = Object.values(fieldScores);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [roiScores, fieldScores]);

  const handleAnalyze = () => {
    toast.info('ROI Analysis', {
      description: 'Detailed ROI analysis report will be generated.'
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-[1fr_300px] gap-8">
          <div className="space-y-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-16 w-16 rounded-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Scorecard Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Scorecard
        </label>
        <Select value={selectedScorecard} onValueChange={setSelectedScorecard}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select scorecard" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default ROI Scorecard</SelectItem>
            <SelectItem value="custom">Custom Scorecard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Left Column - ROI Questions */}
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-6">High Level ROI</h3>
          
          <div className="flex flex-col gap-6">
            {ROI_FIELDS.map((field) => (
              <div key={field.id} className="flex items-center justify-between gap-6">
                <div className="flex-1 max-w-[320px]">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {field.number}. {field.label}
                  </label>
                  <Select 
                    value={fieldValues[field.id] || 'Medium'} 
                    onValueChange={(value) => handleFieldChange(field.id, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <ScoreGauge score={fieldScores[field.id] || 66} />
              </div>
            ))}
          </div>
        </div>
        
        {/* Right Column - Value Score Card */}
        <div className="flex flex-col items-center p-6 bg-card border border-border rounded-lg h-fit">
          <p className="text-sm text-muted-foreground mb-2">Value Score:</p>
          <div className="text-6xl font-bold text-primary leading-none mb-2">
            {valueScore}
          </div>
          {comparison && (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                (Average: {comparison.average})
              </p>
              {comparison.percentageDiff > 0 && (
                <p className="text-sm text-foreground text-center mb-6">
                  That's{' '}
                  <span className={`font-semibold ${comparison.isHigher ? 'text-success' : 'text-destructive'}`}>
                    {comparison.percentageDiff}% {comparison.isHigher ? 'Higher' : 'Lower'}
                  </span>{' '}
                  than other associated Epics using this scorecard.
                </p>
              )}
            </>
          )}
          <Button 
            size="lg" 
            className="w-full bg-primary hover:bg-primary/90"
            onClick={handleAnalyze}
          >
            Analyze
          </Button>
        </div>
      </div>
    </div>
  );
}
