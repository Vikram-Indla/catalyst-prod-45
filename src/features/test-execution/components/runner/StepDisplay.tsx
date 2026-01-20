/**
 * Step Display Component - Shows current step action and expected result
 */
import React from 'react';
import { cn } from '@/lib/utils';
import type { ExecutionStep } from '../../types/step-execution';

interface StepDisplayProps {
  step: ExecutionStep;
  stepNumber: number;
  totalSteps: number;
}

export const StepDisplay: React.FC<StepDisplayProps> = React.memo(({
  step,
  stepNumber,
  totalSteps,
}) => {
  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Step {stepNumber} of {totalSteps}
          </span>
          {step.result && (
            <span className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full',
              step.result === 'passed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
              step.result === 'failed' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
              step.result === 'blocked' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
              step.result === 'skipped' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
            )}>
              {step.result.charAt(0).toUpperCase() + step.result.slice(1)}
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Action
        </h3>
        <div className="p-4 bg-muted/50 rounded-lg border">
          <p className="text-base leading-relaxed">{step.action}</p>
        </div>
      </div>

      {/* Expected Result */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Expected Result
        </h3>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-base leading-relaxed">{step.expected_result}</p>
        </div>
      </div>

      {/* Test Data (if available) */}
      {step.test_data && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Test Data
          </h3>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <pre className="text-sm font-mono whitespace-pre-wrap">{step.test_data}</pre>
          </div>
        </div>
      )}
    </div>
  );
});

StepDisplay.displayName = 'StepDisplay';
