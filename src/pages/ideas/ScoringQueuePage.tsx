// ============================================================
// SCORING QUEUE PAGE
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  SkipForward,
  Sparkles,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useImprovementIdeas, useUpdateImprovementIdea } from '@/hooks/useImprovementIdeas';
import { IDEA_CATEGORY_LABELS } from '@/types/improvement-ideas';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { PageChrome } from '@/components/layout/PageChrome';

interface ScoringCriteria {
  imperative: number;
  ministry_efficiency: number;
  pain_severity: number;
  alignment: number;
  complexity: number;
  timeframe: number;
}

const CRITERIA_LABELS: Record<keyof ScoringCriteria, { label: string; description: string }> = {
  imperative: { label: 'Strategic Imperative', description: 'How critical is this for strategic goals?' },
  ministry_efficiency: { label: 'Ministry Efficiency', description: 'Impact on operational efficiency' },
  pain_severity: { label: 'Pain Severity', description: 'How severe is the current pain point?' },
  alignment: { label: 'V2030 Alignment', description: 'Alignment with Vision 2030 objectives' },
  complexity: { label: 'Implementation Complexity', description: 'Lower score = more complex' },
  timeframe: { label: 'Time to Value', description: 'How quickly can value be realized?' },
};

export default function ScoringQueuePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateIdea = useUpdateImprovementIdea();
  
  const { data: ideas, isLoading } = useImprovementIdeas({
    status: ['submitted', 'under_review', 'scoring'],
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<ScoringCriteria>({
    imperative: 3,
    ministry_efficiency: 3,
    pain_severity: 3,
    alignment: 3,
    complexity: 3,
    timeframe: 3,
  });
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingIdeas = ideas?.filter(i => !i.impact_score) || [];
  const currentIdea = pendingIdeas[currentIndex];
  
  const calculatedScore = Object.values(scores).reduce((a, b) => a + b, 0) / 6 * 20;

  const handleScoreChange = (key: keyof ScoringCriteria, value: number[]) => {
    setScores(prev => ({ ...prev, [key]: value[0] }));
  };

  const handleSubmitScore = async () => {
    if (!currentIdea || !user) return;
    
    setIsSubmitting(true);
    try {
      // Insert impact score
      const { error: scoreError } = await supabase
        .from('impact_scores')
        .insert({
          idea_id: currentIdea.id,
          imperative: scores.imperative,
          ministry_efficiency: scores.ministry_efficiency,
          pain_severity: scores.pain_severity,
          alignment: scores.alignment,
          complexity: scores.complexity,
          timeframe: scores.timeframe,
          calculated_score: calculatedScore,
          justification,
          scored_by: user.id,
          ai_assisted: false,
          version: 1,
          is_current: true,
        });

      if (scoreError) throw scoreError;

      // Update idea status
      await updateIdea.mutateAsync({
        id: currentIdea.id,
        status: 'scoring',
      });

      toast.success('Score submitted successfully');
      
      // Reset and move to next
      setScores({
        imperative: 3,
        ministry_efficiency: 3,
        pain_severity: 3,
        alignment: 3,
        complexity: 3,
        timeframe: 3,
      });
      setJustification('');
      
      if (currentIndex < pendingIdeas.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    } catch (error) {
      toast.error('Failed to submit score');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < pendingIdeas.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const headerActions = (
    <>
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        {pendingIdeas.length} pending
      </Badge>
      <Button variant="outline" onClick={() => navigate('/industry/ideas/matrix')} className="h-8 text-sm">
        View Matrix
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </>
  );

  if (isLoading) {
    return (
      <PageChrome rightActions={headerActions}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome rightActions={headerActions}>
      <div className="flex flex-col gap-6 p-6">
      {pendingIdeas.length > 0 && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Idea {currentIndex + 1} of {pendingIdeas.length}
          </span>
          <Progress value={((currentIndex + 1) / pendingIdeas.length) * 100} className="flex-1 h-2" />
        </div>
      )}

      {pendingIdeas.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">All caught up!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No ideas are waiting to be scored.
          </p>
          <Button onClick={() => navigate('/industry/ideas/all')}>
            Browse All Ideas
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Idea Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono">
                  {currentIdea?.code}
                </Badge>
                <Badge variant="secondary">
                  {IDEA_CATEGORY_LABELS[currentIdea?.category || 'other']}
                </Badge>
              </div>
              <CardTitle>{currentIdea?.title}</CardTitle>
              {currentIdea?.title_ar && (
                <p className="text-muted-foreground" dir="rtl">{currentIdea.title_ar}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{currentIdea?.description}</p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Submitted:</span>
                  <p>{currentIdea?.created_at ? format(new Date(currentIdea.created_at), 'MMM dd, yyyy') : '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Votes:</span>
                  <p>👍 {currentIdea?.for_votes || 0} / 👎 {currentIdea?.against_votes || 0}</p>
                </div>
                {currentIdea?.initiative && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Initiative:</span>
                    <p>{currentIdea.initiative.title}</p>
                  </div>
                )}
              </div>

              {currentIdea?.ai_summary && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">AI Summary</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{currentIdea.ai_summary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scoring Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Impact Scoring</span>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-primary">{calculatedScore.toFixed(1)}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
              </CardTitle>
              <CardDescription>
                Rate each dimension from 1 (lowest) to 5 (highest)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(Object.keys(CRITERIA_LABELS) as Array<keyof ScoringCriteria>).map((key) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      {CRITERIA_LABELS[key].label}
                    </Label>
                    <Badge variant="outline">{scores[key]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {CRITERIA_LABELS[key].description}
                  </p>
                  <Slider
                    value={[scores[key]]}
                    onValueChange={(v) => handleScoreChange(key, v)}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                </div>
              ))}

              <Separator />

              <div className="space-y-2">
                <Label>Justification (Optional)</Label>
                <Textarea
                  placeholder="Provide reasoning for your scores..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  disabled={currentIndex === pendingIdeas.length - 1}
                  className="gap-1"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip
                </Button>
                <Button 
                  onClick={handleSubmitScore}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Score'}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  </PageChrome>
  );
}
