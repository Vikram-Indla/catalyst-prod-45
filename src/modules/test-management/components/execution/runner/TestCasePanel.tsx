/**
 * Test Case Panel - Left side of execution runner (65%)
 * Shows test case header, filter tabs, preconditions, and step cards
 */

import React, { useState } from 'react';
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

type StepFilterTab = 'all' | 'not_run' | 'passed' | 'failed' | 'blocked' | 'mine';

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
  const [activeFilter, setActiveFilter] = useState<StepFilterTab>('all');

  // Filter steps based on active tab
  const filteredSteps = steps.filter((step) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'not_run') return step.status === 'not_run' || step.status === 'in_progress';
    if (activeFilter === 'passed') return step.status === 'passed';
    if (activeFilter === 'failed') return step.status === 'failed';
    if (activeFilter === 'blocked') return step.status === 'blocked';
    if (activeFilter === 'mine') return true; // Would filter by assigned user in real implementation
    return true;
  });

  // Calculate step progress
  const completedSteps = steps.filter(s => 
    ['passed', 'failed', 'blocked', 'skipped'].includes(s.status)
  ).length;
  const progressPercentage = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  // Count for each status
  const notRunCount = steps.filter(s => s.status === 'not_run' || s.status === 'in_progress').length;
  const passedCount = steps.filter(s => s.status === 'passed').length;
  const failedCount = steps.filter(s => s.status === 'failed').length;
  const blockedCount = steps.filter(s => s.status === 'blocked').length;

  const filterTabs: { key: StepFilterTab; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: steps.length },
    { key: 'not_run', label: 'Not Run', count: notRunCount },
    { key: 'passed', label: 'Passed', count: passedCount },
    { key: 'failed', label: 'Failed', count: failedCount },
    { key: 'blocked', label: 'Blocked', count: blockedCount },
    { key: 'mine', label: 'Mine' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Test Case Header */}
      <TestCaseHeader testCase={testCase} run={run} />

      {/* Filter Tabs */}
      <div className="flex border-b overflow-x-auto bg-background px-4">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              'flex-1 min-w-fit px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              activeFilter === tab.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                'ml-1.5 text-xs',
                activeFilter === tab.key ? 'text-primary' : 'text-muted-foreground'
              )}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Preconditions Bar */}
      {testCase?.preconditions && (
        <div className="px-6 py-4 bg-background">
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
            {filteredSteps.map((stepResult) => {
              const originalIndex = steps.findIndex(s => s.id === stepResult.id);
              return (
                <StepExecutionCard
                  key={stepResult.id}
                  stepResult={stepResult}
                  stepNumber={originalIndex + 1}
                  isActive={originalIndex === currentStepIndex}
                  onSelect={() => onStepSelect(originalIndex)}
                  onSetStatus={onStepStatus}
                  onLogDefect={onLogDefect}
                  isUpdating={isUpdating}
                />
              );
            })}

            {filteredSteps.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                {steps.length === 0 ? 'No steps to execute' : `No ${activeFilter.replace('_', ' ')} steps`}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
