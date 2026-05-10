/**
 * AI "Start My Day" Card
 * Shows AI-recommended next test with reasons
 */

import React from 'react';
import SparklesIcon from '@atlaskit/icon/core/atlassian-intelligence';
// No @atlaskit/icon equivalent — inline SVG
const PlayIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const SkipForwardIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />
  </svg>
);
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
      <div className="flex-1 p-5 bg-card border border-border rounded-lg font-['Inter']">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
            <SparklesIcon label="" size="small" primaryColor="currentColor" />
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
    <div className="flex-1 p-5 bg-card border border-border rounded-lg font-['Inter']">
      <div className="flex items-center gap-2 mb-3.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
          <SparklesIcon label="" size="small" primaryColor="currentColor" />
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
          <PlayIcon size={13} /> Start This Test
        </button>
        <button
          onClick={onSkip}
          className="inline-flex items-center gap-1 h-8 px-3 text-[13px] font-medium text-muted-foreground bg-transparent border-none rounded-md cursor-pointer hover:text-foreground transition-colors"
        >
          <SkipForwardIcon size={13} /> Skip
        </button>
      </div>
    </div>
  );
}
