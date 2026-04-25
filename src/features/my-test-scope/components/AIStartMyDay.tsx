/**
 * AI "Start My Day" Card
 * Shows AI-recommended next test with reasons
 */

import React from 'react';
import { Sparkles, Play, SkipForward } from 'lucide-react';
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
      <div className="flex-1 p-5 bg-card border border-border rounded-lg font-body">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">AI Start My Day</span>
        </div>
        <p className="text-[13px] text-muted-foreground">
          All tests complete! No pending work in your queue.
        </p>
      </div>
    );
  }

  const scoreColor = getScoreColor(priorityTest.priorityScore);

  return (
    <div className="flex-1 p-5 bg-card border border-border rounded-lg font-body">
      <div className="flex items-center gap-2 mb-3.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-foreground">AI Start My Day</span>
      </div>

      <div className="mb-3.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[13px] text-muted-foreground">Start with</span>
          <span
            className="inline-flex items-center justify-center min-w-[32px] h-[22px] rounded text-xs font-bold text-white px-1.5"
            style={{ backgroundColor: scoreColor }}
          >
            {priorityTest.priorityScore}
          </span>
        </div>
        <p className="font-medium text-foreground text-sm m-0">
          {priorityTest.key} — {priorityTest.title}
        </p>
      </div>

      <ul className="list-none p-0 mb-3.5 space-y-1">
        {reasons.map((reason, index) => (
          <li key={index} className="flex items-start gap-1.5 text-[13px] text-muted-foreground">
            <span className="text-primary">•</span>
            {reason}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onStartTest(priorityTest.scopeId)}
          className="inline-flex items-center gap-1 h-8 px-3.5 text-[13px] font-medium text-white bg-gradient-to-br from-violet-500 to-indigo-500 border-none rounded-md cursor-pointer hover:opacity-90 transition-opacity"
        >
          <Play className="w-[13px] h-[13px]" /> Start This Test
        </button>
        <button
          onClick={onSkip}
          className="inline-flex items-center gap-1 h-8 px-3 text-[13px] font-medium text-muted-foreground bg-transparent border-none rounded-md cursor-pointer hover:text-foreground transition-colors"
        >
          <SkipForward className="w-[13px] h-[13px]" /> Skip
        </button>
      </div>
    </div>
  );
}
