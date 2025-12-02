import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, TrendingUp, Calendar, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KeyResult } from '../../types/keyResult.types';
import { format } from 'date-fns';

interface KeyResultCardProps {
  keyResult: any; // Using any due to extended fields from useObjectiveDetail
  onUpdate?: (id: string, value: number) => void;
  className?: string;
}

export function KeyResultCard({ keyResult, onUpdate, className }: KeyResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const startValue = keyResult.baseline_value ?? keyResult.start_value ?? 0;
  const targetValue = keyResult.goal_value ?? keyResult.target_value ?? 0;
  const currentValue = keyResult.current_value ?? 0;
  
  const progress = startValue !== undefined && targetValue
    ? ((currentValue - startValue) / (targetValue - startValue)) * 100
    : 0;
  
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  const getConfidenceColor = () => {
    const confidence = keyResult.confidence_score;
    if (!confidence) return 'bg-muted text-muted-foreground';
    if (confidence >= 0.7) return 'bg-success/20 text-success border-success/30';
    if (confidence >= 0.4) return 'bg-warning/20 text-warning border-warning/30';
    return 'bg-destructive/20 text-destructive border-destructive/30';
  };

  const title = keyResult.summary ?? keyResult.title;
  const description = keyResult.description;

  return (
    <Card className={cn('p-[var(--s4)]', className)}>
      <div className="flex items-start justify-between gap-[var(--s3)] mb-[var(--s3)]">
        <div className="flex-1">
          <div className="flex items-center gap-[var(--s2)] mb-[var(--s2)]">
            <TrendingUp className="h-4 w-4 text-brand-gold" />
            <h4 className="font-medium text-sm">{title}</h4>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mb-[var(--s3)]">
              {description}
            </p>
          )}
        </div>
        
        <Badge variant="outline" className={getConfidenceColor()}>
          {keyResult.confidence_score ? `${(keyResult.confidence_score * 100).toFixed(0)}%` : 'N/A'}
        </Badge>
      </div>

      {/* Progress Section */}
      <div className="space-y-[var(--s2)] mb-[var(--s3)]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{clampedProgress.toFixed(0)}%</span>
        </div>
        <Progress value={clampedProgress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{startValue}</span>
          <span>{currentValue} / {targetValue}</span>
        </div>
      </div>

      {/* Metric Type & Last Check-in */}
      <div className="flex items-center gap-[var(--s4)] text-xs text-muted-foreground mb-[var(--s3)]">
        <span className="capitalize">{keyResult.metric_type}</span>
        {keyResult.last_checkin_at && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Last: {format(new Date(keyResult.last_checkin_at), 'MMM d, yyyy')}
          </span>
        )}
      </div>

      {/* Check-in History Toggle */}
      {keyResult.checkins && keyResult.checkins.length > 0 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2 text-xs">
              <MessageSquare className="h-3 w-3" />
              Check-in History ({keyResult.checkins.length})
            </span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {isExpanded && (
            <div className="mt-[var(--s3)] space-y-[var(--s3)] border-t pt-[var(--s3)]">
              {keyResult.checkins.map((checkin: any) => (
                <div key={checkin.id} className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{checkin.value}</span>
                    <span className="text-muted-foreground">
                      {format(new Date(checkin.checked_in_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {checkin.note_richtext && (
                    <p className="text-muted-foreground">{checkin.note_richtext}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
