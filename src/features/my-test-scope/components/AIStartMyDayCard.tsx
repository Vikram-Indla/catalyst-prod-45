/**
 * AI "Start My Day" Recommendation Card
 * Shows the highest priority test to execute next
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Play, SkipForward, Clock, AlertTriangle, Bug, AlertCircle, Sparkles } from 'lucide-react';
import type { AIRecommendation } from '../types';
import { getScoreClass, formatDueDate } from '../utils/helpers';

interface AIStartMyDayCardProps {
  recommendation: AIRecommendation | null;
  onExecute: () => void;
  onSkip: () => void;
  isExecuting?: boolean;
  isSkipping?: boolean;
  className?: string;
}

export function AIStartMyDayCard({
  recommendation,
  onExecute,
  onSkip,
  isExecuting,
  isSkipping,
  className,
}: AIStartMyDayCardProps) {
  if (!recommendation) {
    return (
      <Card className={cn("bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800", className)}>
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="font-semibold text-green-800 dark:text-green-300">All caught up!</span>
          </div>
          <p className="text-sm text-green-700 dark:text-green-400">
            You've completed all your assigned tests. Great work!
          </p>
        </CardContent>
      </Card>
    );
  }

  const dueInfo = formatDueDate(recommendation.due_date, 'not_run');
  
  return (
    <Card className={cn(
      "relative overflow-hidden",
      recommendation.is_overdue 
        ? "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800"
        : "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800",
      className
    )}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
              AI Recommendation
            </span>
          </div>
          <Badge className={cn("text-xs font-bold", getScoreClass(recommendation.score))}>
            {recommendation.score}
          </Badge>
        </div>

        {/* Test Info */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">
              {recommendation.key}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {recommendation.cycle_name}
            </span>
          </div>
          <h3 className="font-semibold text-foreground line-clamp-2">
            {recommendation.title}
          </h3>
        </div>

        {/* Reasons */}
        {recommendation.reasons.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {recommendation.reasons.map((reason, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full",
                  reason.type === 'overdue' && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
                  reason.type === 'defects' && "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
                  reason.type === 'incidents' && "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                )}
              >
                {reason.type === 'overdue' && <AlertTriangle className="h-3 w-3" />}
                {reason.type === 'defects' && <Bug className="h-3 w-3" />}
                {reason.type === 'incidents' && <AlertCircle className="h-3 w-3" />}
                <span>{reason.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{recommendation.estimated_minutes || 5}m</span>
          </div>
          <div className={cn("flex items-center gap-1", dueInfo.className)}>
            {dueInfo.isUrgent && <AlertTriangle className="h-3.5 w-3.5" />}
            <span>{dueInfo.text}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={onExecute}
            disabled={isExecuting || isSkipping}
            className="flex-1 bg-brand-primary hover:bg-brand-primary/90"
          >
            <Play className="h-4 w-4 mr-2" />
            {isExecuting ? 'Starting...' : 'Execute Now'}
          </Button>
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isExecuting || isSkipping}
            className="px-3"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
