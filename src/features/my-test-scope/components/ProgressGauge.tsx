/**
 * Progress Gauge Component
 * Circular progress indicator with status breakdown
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Ban, Circle } from 'lucide-react';
import type { TestScopeSummary } from '../types';

interface ProgressGaugeProps {
  summary: TestScopeSummary;
}

export function ProgressGauge({ summary }: ProgressGaugeProps) {
  const { totalTests, passedTests, failedTests, blockedTests, notRunTests, passRate } = summary;
  
  // Calculate stroke offset for circular progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (passRate / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-6 bg-muted/30 rounded-lg border border-border">
      <div className="relative w-32 h-32">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="hsl(var(--success))"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{passRate}%</span>
          <span className="text-xs text-muted-foreground">
            {passedTests}/{totalTests}
          </span>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-4 gap-2 mt-4 w-full">
        <StatusItem
          icon={CheckCircle2}
          count={passedTests}
          label="Passed"
          colorClass="text-success"
        />
        <StatusItem
          icon={XCircle}
          count={failedTests}
          label="Failed"
          colorClass="text-danger"
        />
        <StatusItem
          icon={Ban}
          count={blockedTests}
          label="Blocked"
          colorClass="text-warning"
        />
        <StatusItem
          icon={Circle}
          count={notRunTests}
          label="Not Run"
          colorClass="text-muted-foreground"
        />
      </div>
    </div>
  );
}

interface StatusItemProps {
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  label: string;
  colorClass: string;
}

function StatusItem({ icon: Icon, count, label, colorClass }: StatusItemProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1">
        <Icon className={cn('h-4 w-4', colorClass)} />
        <span className="font-semibold text-foreground">{count}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
