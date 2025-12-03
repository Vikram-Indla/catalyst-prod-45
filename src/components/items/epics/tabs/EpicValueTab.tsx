import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
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
  { id: 'cost', number: 1, label: 'Cost', options: ['Low', 'Medium', 'High'], dbField: 'cost_score', scoreType: 'cost' },
  { id: 'profit_potential', number: 2, label: 'Profit Potential', options: ['Low', 'Medium', 'High'], dbField: 'profit_potential_score', scoreType: 'benefit' },
  { id: 'time_to_market', number: 3, label: 'Time to Market', options: ['Low', 'Medium', 'High'], dbField: 'time_to_market_score', scoreType: 'benefit' },
  { id: 'development_risks', number: 4, label: 'Development Risks', options: ['Low', 'Medium', 'High'], dbField: 'development_risks_score', scoreType: 'risk' }
];

const SCORE_MAPS = {
  benefit: { 'Low': 33, 'Medium': 66, 'High': 100 },
  cost: { 'Low': 100, 'Medium': 66, 'High': 33 },
  risk: { 'Low': 100, 'Medium': 66, 'High': 33 }
};

const getOptionFromScore = (score: number | null, scoreType: 'benefit' | 'cost' | 'risk'): string => {
  if (score === null || score === undefined) return 'Low';
  const map = SCORE_MAPS[scoreType];
  const reversedMap = Object.entries(map).reduce((acc, [key, val]) => {
    acc[val] = key;
    return acc;
  }, {} as Record<number, string>);
  const scores = Object.keys(reversedMap).map(Number);
  const closest = scores.reduce((prev, curr) => Math.abs(curr - score) < Math.abs(prev - score) ? curr : prev);
  return reversedMap[closest] || 'Low';
};

// Circular Score Badge - matches Jira Align style
function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const getColor = () => {
    if (score >= 80) return { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700' };
    if (score >= 50) return { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700' };
    return { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700' };
  };
  const colors = getColor();
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-16 h-16 text-xl'
  };
  
  return (
    <div className={`flex items-center justify-center rounded-full border-4 ${colors.bg} ${colors.border} ${sizeClasses[size]}`}>
      <span className={`font-bold ${colors.text}`}>{score}</span>
    </div>
  );
}

// Diamond/Radar Chart Component
function DiamondChart({ scores, averages }: { scores: Record<string, number>; averages: Record<string, number> }) {
  const size = 200;
  const center = size / 2;
  const maxRadius = 80;
  
  const labels = [
    { key: 'cost', label: 'Cost', angle: -90 },
    { key: 'profit_potential', label: 'Profit\nPotential', angle: 0 },
    { key: 'time_to_market', label: 'Time to Market', angle: 90 },
    { key: 'development_risks', label: 'Development\nRisks', angle: 180 }
  ];

  const getPoint = (value: number, angleDeg: number) => {
    const radius = (value / 100) * maxRadius;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(angleRad),
      y: center + radius * Math.sin(angleRad)
    };
  };

  const yourEpicPoints = labels.map(l => getPoint(scores[l.key] || 50, l.angle));
  const avgPoints = labels.map(l => getPoint(averages[l.key] || 50, l.angle));

  const createPath = (points: { x: number; y: number }[]) => {
    return `M ${points.map(p => `${p.x},${p.y}`).join(' L ')} Z`;
  };

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((scale, i) => (
          <polygon
            key={i}
            points={labels.map(l => {
              const p = getPoint(scale * 100, l.angle);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        
        {/* Axis lines */}
        {labels.map((l, i) => {
          const end = getPoint(100, l.angle);
          return (
            <line key={i} x1={center} y1={center} x2={end.x} y2={end.y} stroke="#e5e7eb" strokeWidth="1" />
          );
        })}

        {/* Average score polygon */}
        <polygon
          points={avgPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(249, 115, 22, 0.2)"
          stroke="#f97316"
          strokeWidth="2"
        />

        {/* Your epic polygon */}
        <polygon
          points={yourEpicPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(14, 165, 166, 0.3)"
          stroke="#0ea5a6"
          strokeWidth="2"
        />

        {/* Points */}
        {yourEpicPoints.map((p, i) => (
          <circle key={`epic-${i}`} cx={p.x} cy={p.y} r="4" fill="#0ea5a6" />
        ))}
      </svg>

      {/* Labels */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground text-center">Cost</div>
      <div className="absolute top-1/2 -right-16 -translate-y-1/2 text-xs text-muted-foreground text-center whitespace-pre-line">Profit{'\n'}Potential</div>
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground text-center">Time to Market</div>
      <div className="absolute top-1/2 -left-20 -translate-y-1/2 text-xs text-muted-foreground text-center whitespace-pre-line">Development{'\n'}Risks</div>
    </div>
  );
}

// Individual Score Card
function IndividualScoreCard({ number, label, score, level, average }: {
  number: number;
  label: string;
  score: number;
  level: string;
  average: number;
}) {
  return (
    <div className="flex flex-col items-center p-4 bg-card border border-border rounded-lg min-w-[140px]">
      <ScoreBadge score={score} size="lg" />
      <p className="text-sm font-medium text-foreground mt-3">{number}. {label}</p>
      <p className="text-xs text-muted-foreground">{level}</p>
      <p className="text-xs text-muted-foreground mt-2">Average: {average}</p>
    </div>
  );
}

// Value Engineering Stepper
function ValueEngineeringStepper({ currentStage }: { currentStage: string }) {
  const stages = ['Hypothesize', 'Bet', 'Pivot/Persevere'];
  const currentIndex = stages.indexOf(currentStage);

  return (
    <div className="flex items-center w-full">
      {stages.map((stage, index) => (
        <div key={stage} className="flex-1 relative">
          <div 
            className={`h-10 flex items-center justify-center text-sm font-medium transition-colors
              ${index <= currentIndex 
                ? 'bg-[#0ea5a6] text-white' 
                : 'bg-muted text-muted-foreground'}
              ${index === 0 ? 'rounded-l-lg' : ''}
              ${index === stages.length - 1 ? 'rounded-r-lg' : ''}
            `}
          >
            {stage}
          </div>
        </div>
      ))}
    </div>
  );
}

// ROI Analysis Modal
function ROIAnalysisModal({ 
  isOpen, 
  onClose, 
  epic, 
  allEpics, 
  fieldScores, 
  averages,
  valueScore
}: {
  isOpen: boolean;
  onClose: () => void;
  epic: any;
  allEpics: any[];
  fieldScores: Record<string, number>;
  averages: Record<string, number>;
  valueScore: number;
}) {
  const [selectedEpicId, setSelectedEpicId] = useState(epic.id);
  
  const sortedEpics = useMemo(() => {
    return [...allEpics].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [allEpics]);

  const currentIndex = sortedEpics.findIndex(e => e.id === selectedEpicId);
  const selectedEpic = sortedEpics.find(e => e.id === selectedEpicId) || epic;

  const goToPrev = () => {
    if (currentIndex > 0) {
      setSelectedEpicId(sortedEpics[currentIndex - 1].id);
    }
  };

  const goToNext = () => {
    if (currentIndex < sortedEpics.length - 1) {
      setSelectedEpicId(sortedEpics[currentIndex + 1].id);
    }
  };

  const avgScore = allEpics.length > 0 
    ? Math.round(allEpics.reduce((sum, e) => sum + (e.score || 0), 0) / allEpics.length) 
    : 0;
  const percentDiff = avgScore > 0 ? Math.round(((valueScore - avgScore) / avgScore) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Left Panel - Epic List */}
          <div className="w-[380px] bg-[#1a1a2e] text-white flex flex-col">
            <div className="p-4 border-b border-white/10">
              <div className="bg-[#0ea5a6] text-white text-sm px-3 py-2 rounded mb-4">
                Results are being displayed according to your context menu
              </div>
              <h3 className="text-lg font-semibold">Epic Ranked By ROI Score</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sortedEpics.map((e) => (
                <div
                  key={e.id}
                  onClick={() => setSelectedEpicId(e.id)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-white/5
                    ${e.id === selectedEpicId ? 'bg-[#0ea5a6]' : 'hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-5 h-5 rounded bg-[#0ea5a6] flex items-center justify-center text-xs">✓</div>
                    <span className="text-sm truncate">{e.epic_key || e.id.slice(0, 8)} : {e.name}</span>
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap ml-2">Score {e.score || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Analysis */}
          <div className="flex-1 bg-background p-8 overflow-y-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-2">ROI Score Analysis</h2>
              <h3 className="text-xl text-foreground">{selectedEpic.name}</h3>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#0ea5a6]" />
                  <span className="text-sm text-muted-foreground">Your Epic</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm text-muted-foreground">Average Score</span>
                </div>
              </div>
            </div>

            {/* Chart and Score */}
            <div className="flex items-center justify-center gap-12 mb-8">
              {/* Value Score Card */}
              <div className="bg-card border border-border rounded-lg p-6 text-center min-w-[180px]">
                <p className="text-sm text-muted-foreground mb-1">Value Score:</p>
                <p className="text-5xl font-bold text-[#0ea5a6] mb-2">{valueScore}</p>
                <p className="text-xs text-muted-foreground mb-2">(Average: {avgScore})</p>
                {percentDiff !== 0 && (
                  <p className="text-xs text-foreground">
                    That's <span className={`font-semibold ${percentDiff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {Math.abs(percentDiff)}% {percentDiff > 0 ? 'Higher' : 'Lower'}
                    </span> than other associated Epics that are using this score card.
                  </p>
                )}
              </div>

              {/* Diamond Chart */}
              <div className="px-20 py-10">
                <DiamondChart scores={fieldScores} averages={averages} />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-8 mb-8">
              <button 
                onClick={goToPrev} 
                disabled={currentIndex === 0}
                className="p-2 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <div className="w-64 h-1 bg-muted rounded-full" />
              <button 
                onClick={goToNext}
                disabled={currentIndex === sortedEpics.length - 1}
                className="p-2 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>

            {/* Individual Scores */}
            <div className="text-center mb-6">
              <h4 className="text-lg font-semibold text-foreground">Individual Scores</h4>
              <p className="text-sm text-muted-foreground">Here's how the Epic did on each question.</p>
            </div>

            <div className="flex justify-center gap-4">
              {ROI_FIELDS.map((field) => (
                <IndividualScoreCard
                  key={field.id}
                  number={field.number}
                  label={field.label}
                  score={fieldScores[field.id] || 66}
                  level={getOptionFromScore(fieldScores[field.id], field.scoreType)}
                  average={averages[field.id] || 50}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EpicValueTab({ epic }: EpicValueTabProps) {
  const queryClient = useQueryClient();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Fetch ROI scores
  const { data: roiScores, isLoading } = useQuery({
    queryKey: ['epic-roi-scores', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_roi_scores')
        .select('*')
        .eq('epic_id', epic.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Fetch all epics with scores for comparison
  const { data: allEpicsWithScores } = useQuery({
    queryKey: ['all-epics-roi-scores'],
    queryFn: async () => {
      const { data: scores, error } = await supabase
        .from('epic_roi_scores')
        .select('*, epics!inner(id, name, epic_key)');
      if (error) throw error;
      return (scores || []).map(s => ({
        id: s.epics?.id,
        name: s.epics?.name,
        epic_key: s.epics?.epic_key,
        score: s.value_score || 0,
        cost: s.cost_score,
        profit: s.profit_potential_score,
        time: s.time_to_market_score,
        risk: s.development_risks_score
      }));
    }
  });

  // Calculate averages
  const averages = useMemo(() => {
    if (!allEpicsWithScores || allEpicsWithScores.length === 0) {
      return { cost: 65, profit_potential: 54, time_to_market: 64, development_risks: 63 };
    }
    const count = allEpicsWithScores.length;
    return {
      cost: Math.round(allEpicsWithScores.reduce((s, e) => s + (e.cost || 66), 0) / count),
      profit_potential: Math.round(allEpicsWithScores.reduce((s, e) => s + (e.profit || 66), 0) / count),
      time_to_market: Math.round(allEpicsWithScores.reduce((s, e) => s + (e.time || 66), 0) / count),
      development_risks: Math.round(allEpicsWithScores.reduce((s, e) => s + (e.risk || 66), 0) / count)
    };
  }, [allEpicsWithScores]);

  // Initialize field values
  useEffect(() => {
    if (roiScores) {
      const values: Record<string, string> = {};
      ROI_FIELDS.forEach(field => {
        const dbValue = roiScores[field.dbField as keyof typeof roiScores] as number | null;
        values[field.id] = getOptionFromScore(dbValue, field.scoreType);
      });
      setFieldValues(values);
    } else {
      // Default to Low for all fields
      const defaults: Record<string, string> = {};
      ROI_FIELDS.forEach(f => defaults[f.id] = 'Low');
      setFieldValues(defaults);
    }
  }, [roiScores]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ fieldId, value }: { fieldId: string; value: string }) => {
      const field = ROI_FIELDS.find(f => f.id === fieldId);
      if (!field) return;

      const score = SCORE_MAPS[field.scoreType][value as keyof typeof SCORE_MAPS.benefit];
      
      const currentCost = field.dbField === 'cost_score' ? score : (roiScores?.cost_score ?? 100);
      const currentProfit = field.dbField === 'profit_potential_score' ? score : (roiScores?.profit_potential_score ?? 100);
      const currentTime = field.dbField === 'time_to_market_score' ? score : (roiScores?.time_to_market_score ?? 100);
      const currentRisk = field.dbField === 'development_risks_score' ? score : (roiScores?.development_risks_score ?? 100);
      
      const calculatedValueScore = Math.round((currentCost + currentProfit + currentTime + currentRisk) / 4 * 10) / 10;

      const { error } = await supabase
        .from('epic_roi_scores')
        .upsert({ epic_id: epic.id, [field.dbField]: score, value_score: calculatedValueScore }, { onConflict: 'epic_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-roi-scores', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['all-epics-roi-scores'] });
      toast.success('Score updated');
    },
    onError: () => toast.error('Failed to update score')
  });

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
    updateMutation.mutate({ fieldId, value });
  };

  const fieldScores = useMemo(() => {
    const scores: Record<string, number> = {};
    ROI_FIELDS.forEach(field => {
      const value = fieldValues[field.id] || 'Low';
      scores[field.id] = SCORE_MAPS[field.scoreType][value as keyof typeof SCORE_MAPS.benefit];
    });
    return scores;
  }, [fieldValues]);

  const valueScore = useMemo(() => {
    if (roiScores?.value_score) return roiScores.value_score;
    const scores = Object.values(fieldScores);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0;
  }, [roiScores, fieldScores]);

  const avgScore = allEpicsWithScores?.length 
    ? Math.round(allEpicsWithScores.reduce((s, e) => s + e.score, 0) / allEpicsWithScores.length) 
    : 0;
  const percentDiff = avgScore > 0 ? Math.round(((valueScore - avgScore) / avgScore) * 100) : 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-[1fr_280px] gap-8">
          <div className="space-y-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-14 w-14 rounded-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* Left - High Level ROI */}
        <Card className="border border-border/60">
          <CardContent className="p-5">
            <h3 className="text-base font-semibold text-foreground mb-5">High Level ROI</h3>
            <div className="space-y-5">
              {ROI_FIELDS.map((field) => (
                <div key={field.id} className="flex items-center justify-between gap-4">
                  <div className="flex-1 max-w-[280px]">
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      {field.number}. {field.label}
                    </label>
                    <Select 
                      value={fieldValues[field.id] || 'Low'} 
                      onValueChange={(value) => handleFieldChange(field.id, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <ScoreBadge score={fieldScores[field.id] || 100} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right - Value Score Summary */}
        <div className="space-y-4">
          <Card className="border border-border/60">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Value Score:</p>
              <p className="text-5xl font-bold text-[#0ea5a6] mb-1">{valueScore}</p>
              <p className="text-xs text-muted-foreground mb-2">(Average: {avgScore})</p>
              {percentDiff !== 0 && (
                <p className="text-xs text-foreground mb-4">
                  That's <span className={`font-semibold ${percentDiff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {Math.abs(percentDiff)}% {percentDiff > 0 ? 'Higher' : 'Lower'}
                  </span> than other associated Epics that are using this score card.
                </p>
              )}
              
              {/* Progress Metrics */}
              <div className="text-left text-xs text-muted-foreground space-y-1 mb-4 border-t pt-3">
                <div className="flex justify-between">
                  <span>Story points accepted</span>
                  <span className="text-foreground">— of —</span>
                </div>
                <div className="flex justify-between">
                  <span>Features Accepted</span>
                  <span className="text-foreground">— of —</span>
                </div>
                <div className="flex justify-between">
                  <span>Features in Delivery</span>
                  <span className="text-foreground">— of —</span>
                </div>
                <div className="flex justify-between">
                  <span>Features Delivered</span>
                  <span className="text-foreground">— of —</span>
                </div>
              </div>

              <Button 
                className="w-full bg-[#0ea5a6] hover:bg-[#0d9495] text-white"
                onClick={() => setShowAnalysis(true)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analyze
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Value Engineering Section */}
      <Card className="border border-border/60">
        <CardContent className="p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">Value Engineering</h3>
          <ValueEngineeringStepper currentStage="Hypothesize" />
          <Button className="mt-4 bg-[#0ea5a6] hover:bg-[#0d9495] text-white">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analyze
          </Button>
        </CardContent>
      </Card>

      {/* ROI Analysis Modal */}
      <ROIAnalysisModal
        isOpen={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        epic={epic}
        allEpics={allEpicsWithScores || [{ id: epic.id, name: epic.name, epic_key: epic.epic_key, score: valueScore }]}
        fieldScores={fieldScores}
        averages={averages}
        valueScore={valueScore}
      />
    </div>
  );
}
