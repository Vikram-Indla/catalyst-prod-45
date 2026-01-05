/**
 * Step Execution Card - Individual step with expand/collapse and actions
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  AlertTriangle,
  SkipForward,
  ChevronDown,
  Bug,
  Image,
  Paperclip,
} from 'lucide-react';
import type { StepResult, ExecutionStatus } from '../../../api/types';

interface StepExecutionCardProps {
  stepResult: StepResult;
  stepNumber: number;
  isActive: boolean;
  onSelect: () => void;
  onSetStatus: (status: ExecutionStatus) => void;
  onLogDefect: () => void;
  isUpdating: boolean;
}

const statusConfig: Record<ExecutionStatus, {
  className: string;
  badgeClass: string;
  label: string;
  icon?: React.ReactNode;
}> = {
  not_run: {
    className: 'border-border bg-background',
    badgeClass: 'bg-muted text-muted-foreground',
    label: 'Pending',
  },
  in_progress: {
    className: 'border-primary/30 bg-background shadow-md shadow-primary/5',
    badgeClass: 'bg-muted text-muted-foreground',
    label: 'Pending',
  },
  passed: {
    className: 'border-teal-300 bg-gradient-to-br from-background to-teal-50/50 dark:to-teal-950/20',
    badgeClass: 'bg-teal-100 text-teal-700',
    label: 'Passed',
    icon: <Check className="h-2.5 w-2.5" />,
  },
  failed: {
    className: 'border-destructive/30 bg-gradient-to-br from-background to-destructive/5',
    badgeClass: 'bg-destructive/10 text-destructive',
    label: 'Failed',
    icon: <X className="h-2.5 w-2.5" />,
  },
  blocked: {
    className: 'border-orange-300 bg-gradient-to-br from-background to-orange-50/50 dark:to-orange-950/20',
    badgeClass: 'bg-orange-100 text-orange-700',
    label: 'Blocked',
    icon: <AlertTriangle className="h-2.5 w-2.5" />,
  },
  skipped: {
    className: 'border-border bg-muted/50 opacity-70',
    badgeClass: 'bg-muted text-muted-foreground',
    label: 'Skipped',
    icon: <SkipForward className="h-2.5 w-2.5" />,
  },
};

export function StepExecutionCard({
  stepResult,
  stepNumber,
  isActive,
  onSelect,
  onSetStatus,
  onLogDefect,
  isUpdating,
}: StepExecutionCardProps) {
  const [isExpanded, setIsExpanded] = useState(isActive);
  const [actualResult, setActualResult] = useState(stepResult.actual_result || '');

  const status = stepResult.status as ExecutionStatus;
  const config = statusConfig[status];
  const step = stepResult.step;
  const isCompleted = ['passed', 'failed', 'blocked', 'skipped'].includes(status);

  // Auto-expand when becomes active
  React.useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [isActive]);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        className={cn(
          'border rounded-2xl overflow-hidden transition-all duration-300 ease-out',
          config.className,
          isActive && 'ring-2 ring-primary/20 shadow-lg scale-[1.01]',
          !isActive && 'hover:shadow-md hover:scale-[1.005]'
        )}
        onClick={() => {
          onSelect();
          if (!isExpanded) setIsExpanded(true);
        }}
      >
        {/* Step Header */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3.5 px-4 py-4 cursor-pointer">
            {/* Step Number / Status Icon */}
            <div className={cn(
              'flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm flex-shrink-0 transition-all',
              isCompleted
                ? status === 'passed' 
                  ? 'bg-teal-500 text-white'
                  : status === 'failed'
                  ? 'bg-destructive text-destructive-foreground'
                  : status === 'blocked'
                  ? 'bg-orange-500 text-white'
                  : 'bg-muted-foreground text-background'
                : isActive
                ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground'
            )}>
              {isCompleted && config.icon ? (
                <span className="scale-150">{config.icon}</span>
              ) : (
                stepNumber
              )}
            </div>

            {/* Step Content Preview */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground mb-0.5">
                {step?.action?.slice(0, 50) || `Step ${stepNumber}`}
                {step?.action && step.action.length > 50 && '...'}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate flex-1">
                  {step?.action?.slice(0, 40)}
                </span>
                <span className="text-muted-foreground/50">→</span>
                <span className="truncate flex-1">
                  {step?.expected_result?.slice(0, 40)}
                </span>
              </div>
            </div>

            {/* Status Badge */}
            <span className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide',
              config.badgeClass
            )}>
              {config.icon}
              {config.label}
            </span>

            {/* Chevron */}
            <ChevronDown className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180'
            )} />
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div className="h-px bg-border mb-4" />

            {/* Step Fields */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Action
                </label>
                <div className="p-3 bg-muted/50 border rounded-lg text-sm text-foreground">
                  {step?.action || 'No action defined'}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Expected Result
                </label>
                <div className="p-3 bg-muted/50 border rounded-lg text-sm text-foreground">
                  {step?.expected_result || 'No expected result defined'}
                </div>
              </div>
              {step?.test_data && (
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Test Data
                  </label>
                  <div className="p-3 bg-muted/50 border rounded-lg text-sm text-foreground font-mono">
                    {step.test_data}
                  </div>
                </div>
              )}
            </div>

            {/* Actual Result Input */}
            {!isCompleted && (
              <div className="mb-4">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Actual Result
                </label>
                <Textarea
                  value={actualResult}
                  onChange={(e) => setActualResult(e.target.value)}
                  placeholder="Enter the actual result observed..."
                  className="min-h-[80px] resize-none"
                />
              </div>
            )}

            {/* Completed Actual Result */}
            {isCompleted && stepResult.actual_result && (
              <div className="mb-4">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Actual Result
                </label>
                <div className={cn(
                  "p-3 border rounded-lg text-sm",
                  status === 'passed' && "bg-teal-50 border-teal-200 dark:bg-teal-950/20 dark:border-teal-800",
                  status === 'failed' && "bg-destructive/5 border-destructive/20"
                )}>
                  {stepResult.actual_result}
                </div>
              </div>
            )}

            {/* Evidence Attachments */}
            {!isCompleted && (
              <div className="flex items-center gap-2 mb-4">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Image className="h-3 w-3" />
                  Add Screenshot
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Paperclip className="h-3 w-3" />
                  Attach File
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            {!isCompleted && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetStatus('passed');
                    }}
                    disabled={isUpdating}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Pass
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetStatus('failed');
                    }}
                    disabled={isUpdating}
                  >
                    <X className="h-3.5 w-3.5" />
                    Fail
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-orange-600 border-orange-200 hover:bg-orange-50 gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetStatus('blocked');
                    }}
                    disabled={isUpdating}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Blocked
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetStatus('skipped');
                    }}
                    disabled={isUpdating}
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    Skip
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/20 hover:bg-destructive/5 gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLogDefect();
                  }}
                  disabled={isUpdating}
                >
                  <Bug className="h-3.5 w-3.5" />
                  Log Defect
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
