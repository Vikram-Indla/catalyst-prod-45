/**
 * Step Progress Bar - Visual progress with clickable step indicators
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Ban, SkipForward } from 'lucide-react';
import type { ExecutionStep } from '../../types/step-execution';

interface StepProgressBarProps {
  steps: ExecutionStep[];
  currentIndex: number;
  onStepClick: (index: number) => void;
}

const getStepIcon = (result: string | null) => {
  switch (result) {
    case 'passed': return <Check className="h-3 w-3" />;
    case 'failed': return <X className="h-3 w-3" />;
    case 'blocked': return <Ban className="h-3 w-3" />;
    case 'skipped': return <SkipForward className="h-3 w-3" />;
    default: return null;
  }
};

const getStepColor = (result: string | null, isCurrent: boolean) => {
  if (isCurrent) return 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background';
  switch (result) {
    case 'passed': return 'bg-green-500 text-white';
    case 'failed': return 'bg-red-500 text-white';
    case 'blocked': return 'bg-amber-500 text-white';
    case 'skipped': return 'bg-gray-400 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const StepProgressBar: React.FC<StepProgressBarProps> = React.memo(({
  steps,
  currentIndex,
  onStepClick,
}) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <button
            onClick={() => onStepClick(index)}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-all',
              'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary',
              getStepColor(step.result, index === currentIndex),
              index === currentIndex && 'bg-blue-600 text-white'
            )}
            aria-label={`Step ${index + 1}${step.result ? `, ${step.result}` : ''}`}
            aria-current={index === currentIndex ? 'step' : undefined}
          >
            {step.result ? getStepIcon(step.result) : index + 1}
          </button>
          {index < steps.length - 1 && (
            <div className={cn(
              'w-4 h-0.5',
              step.result ? 'bg-muted-foreground/50' : 'bg-muted'
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
});

StepProgressBar.displayName = 'StepProgressBar';
