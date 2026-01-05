/**
 * Test Case Panel - Left side of execution runner (65%)
 * Shows test case header, preconditions, and step cards
 */

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TestCaseHeader } from './TestCaseHeader';
import { PreconditionsBar } from './PreconditionsBar';
import { StepExecutionCard } from './StepExecutionCard';
import type { TestCase, TestRun, StepResult, ExecutionStatus } from '../../../api/types';

interface TestCasePanelProps {
  testCase?: TestCase | null;
  run?: TestRun | null;
  steps: StepResult[];
  currentStepIndex: number;
  preconditionsVerified: boolean;
  onVerifyPreconditions: () => void;
  onStepStatus: (status: ExecutionStatus) => void;
  onStepSelect: (index: number) => void;
  onLogDefect: () => void;
  isUpdating: boolean;
}

export function TestCasePanel({
  testCase,
  run,
  steps,
  currentStepIndex,
  preconditionsVerified,
  onVerifyPreconditions,
  onStepStatus,
  onStepSelect,
  onLogDefect,
  isUpdating,
}: TestCasePanelProps) {
  // Calculate step progress
  const completedSteps = steps.filter(s => 
    ['passed', 'failed', 'blocked', 'skipped'].includes(s.status)
  ).length;
  const progressPercentage = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Test Case Header */}
      <TestCaseHeader testCase={testCase} run={run} />

      {/* Preconditions Bar */}
      {testCase?.preconditions && (
        <div className="px-6 pb-4 bg-background">
          <PreconditionsBar
            preconditions={testCase.preconditions}
            verified={preconditionsVerified}
            onVerify={onVerifyPreconditions}
          />
        </div>
      )}

      {/* Steps Execution Area */}
      <ScrollArea className="flex-1 bg-gradient-to-b from-muted/30 to-muted/50">
        <div className="p-6">
          {/* Steps Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Test Steps
            </span>
            <div className="flex items-center gap-2">
              <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {completedSteps} / {steps.length} completed
              </span>
            </div>
          </div>

          {/* Step Cards */}
          <div className="flex flex-col gap-3">
            {steps.map((stepResult, index) => (
              <StepExecutionCard
                key={stepResult.id}
                stepResult={stepResult}
                stepNumber={index + 1}
                isActive={index === currentStepIndex}
                onSelect={() => onStepSelect(index)}
                onSetStatus={onStepStatus}
                onLogDefect={onLogDefect}
                isUpdating={isUpdating}
              />
            ))}

            {steps.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No steps to execute
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
