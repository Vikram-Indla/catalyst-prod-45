// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10ProgressBar
// Purpose: Reusable progress bar component
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';

interface T10ProgressBarProps {
  completed: number;
  total: number;
  showComplete?: boolean;
}

export function T10ProgressBar({ completed, total, showComplete = true }: T10ProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = completed === total && total > 0;

  return (
    <div 
      className="t10-progress-bar"
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${completed} of ${total} completed`}
    >
      <div 
        className={`t10-progress-bar-fill ${isComplete && showComplete ? 't10-progress-bar-fill-complete' : ''}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default T10ProgressBar;
