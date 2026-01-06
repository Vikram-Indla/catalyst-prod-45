/**
 * Test Case Header - Displays current test case info and run status
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckSquare, User, Calendar, Clock, FileText } from 'lucide-react';
import type { TestCase, TestRun } from '../../../api/types';

interface TestCaseHeaderProps {
  testCase?: TestCase | null;
  run?: TestRun | null;
}

export function TestCaseHeader({ testCase, run }: TestCaseHeaderProps) {
  if (!testCase) {
    return (
      <div className="px-6 py-5 bg-background border-b">
        <div className="h-16 flex items-center justify-center text-muted-foreground">
          Loading test case...
        </div>
      </div>
    );
  }

  const runStatus = run?.status || 'not_run';
  const statusConfig: Record<string, { label: string; className: string }> = {
    not_run: { label: 'Not Started', className: 'bg-muted text-muted-foreground' },
    in_progress: { label: 'Executing', className: 'bg-[var(--sem-warning-bg)] text-[var(--sem-warning)] border-[var(--sem-warning-border)]' },
    passed: { label: 'Passed', className: 'bg-[var(--sem-success-bg)] text-[var(--sem-success)] border-[var(--sem-success-border)]' },
    failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive border-destructive/30' },
    blocked: { label: 'Blocked', className: 'bg-[var(--sem-high-bg)] text-[var(--sem-high)] border-[var(--sem-warning-border)]' },
    skipped: { label: 'Skipped', className: 'bg-muted text-muted-foreground' },
  };

  return (
    <div className="px-6 py-5 bg-background border-b">
      <div className="flex items-start justify-between">
        {/* Left - Title Block */}
        <div className="flex-1">
          {/* Case Key Badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--sem-success-bg)] rounded-lg text-xs font-bold text-[var(--sem-success)] font-mono mb-2">
            <CheckSquare className="h-3 w-3" />
            {testCase.case_key}
          </span>

          {/* Title */}
          <h1 className="text-xl font-bold text-foreground mb-1.5">
            {testCase.title}
          </h1>

          {/* Meta Info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {testCase.owner_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {testCase.owner_name}
              </span>
            )}
            {run && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Run #{run.run_number}
              </span>
            )}
            {testCase.estimated_time_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Est. {testCase.estimated_time_minutes} min
              </span>
            )}
            {testCase.tags && testCase.tags.length > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {testCase.tags[0]}
              </span>
            )}
          </div>
        </div>

        {/* Right - Status */}
        <div className="flex flex-col items-end gap-2">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 border rounded-lg",
            statusConfig[runStatus].className
          )}>
            {runStatus === 'in_progress' && (
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            )}
            <span className="text-xs font-semibold">
              {statusConfig[runStatus].label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
