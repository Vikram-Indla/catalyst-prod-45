/**
 * AI "Start My Day" Card
 * Shows AI-recommended next test with reasons
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Play, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getScoreColor } from '../types';
import type { AIRecommendation } from '../types';

interface AIStartMyDayProps {
  recommendation: AIRecommendation;
  onStartTest: (scopeId: string) => void;
  onSkip: () => void;
}

export function AIStartMyDay({ recommendation, onStartTest, onSkip }: AIStartMyDayProps) {
  const { priorityTest, reasons } = recommendation;

  if (!priorityTest) {
    return (
      <div className="flex-1 p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h3 className="font-semibold text-foreground">AI Start My Day</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          🎉 All tests complete! No pending work in your queue.
        </p>
      </div>
    );
  }

  const scoreColor = getScoreColor(priorityTest.priorityScore);

  return (
    <div className="flex-1 p-6 bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-primary/5 rounded-lg border border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <h3 className="font-semibold text-foreground">AI Start My Day</h3>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm text-muted-foreground">Start with</span>
          <span 
            className="inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold text-white"
            style={{ backgroundColor: scoreColor }}
          >
            {priorityTest.priorityScore}
          </span>
        </div>
        <p className="font-medium text-foreground">
          {priorityTest.key} — {priorityTest.title}
        </p>
      </div>

      {/* Reasons */}
      <ul className="space-y-1 mb-4">
        {reasons.map((reason, index) => (
          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-primary">•</span>
            {reason}
          </li>
        ))}
      </ul>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          onClick={() => onStartTest(priorityTest.scopeId)}
          className="bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600"
        >
          <Play className="h-4 w-4 mr-2" />
          Start This Test
        </Button>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          <SkipForward className="h-4 w-4 mr-1" />
          Skip
        </Button>
      </div>
    </div>
  );
}
