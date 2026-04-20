/**
 * ExecutionHeader — Header card with test case info and progress ring
 */

import { cn } from '@/lib/utils';
import { Lozenge } from '@/components/ads';
import { AlertTriangle, Clock, User, Layers } from 'lucide-react';
import { ExecutionTestCase } from '@/data/testExecutionData';

interface ExecutionHeaderProps {
  testCase: ExecutionTestCase;
  completedSteps: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
}

export function ExecutionHeader({
  testCase,
  completedSteps,
  totalSteps,
  passedSteps,
  failedSteps,
}: ExecutionHeaderProps) {
  const pendingSteps = totalSteps - completedSteps;
  const progressPercent = (completedSteps / totalSteps) * 100;
  
  // SVG progress ring calculations
  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const priorityConfig = {
    critical: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    high: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    medium: { icon: AlertTriangle, color: 'text-gray-600', bg: 'bg-gray-50' },
    low: { icon: AlertTriangle, color: 'text-gray-400', bg: 'bg-gray-50' },
  };

  const { icon: PriorityIcon, color: priorityColor } = priorityConfig[testCase.priority];

  return (
    <div className="bg-background border rounded-lg p-6">
      <div className="flex items-start justify-between gap-6">
        {/* Left: Test Case Info */}
        <div className="flex-1">
          {/* Badges Row */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-primary">{testCase.id}</span>
            <Lozenge appearance="default">
              {testCase.type}
            </Lozenge>
            <span className={cn("flex items-center gap-1 text-xs font-medium", priorityColor)}>
              <PriorityIcon className="w-3.5 h-3.5" />
              {testCase.priority.charAt(0).toUpperCase() + testCase.priority.slice(1)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-foreground mb-2">
            {testCase.title}
          </h1>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
            {testCase.description}
          </p>

          {/* Meta Row */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers className="w-4 h-4" />
              <span>Cycle:</span>
              <span className="font-medium text-primary hover:underline cursor-pointer">
                {testCase.cycleId}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Executor:</span>
              <span className="font-medium text-foreground">{testCase.executor}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Started:</span>
              <span className="font-medium text-foreground">{testCase.startedAt}</span>
            </div>
          </div>
        </div>

        {/* Right: Progress Ring */}
        <div className="flex flex-col items-center">
          {/* SVG Ring */}
          <div className="relative">
            <svg width={size} height={size} className="-rotate-90">
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-gray-200"
              />
              {/* Progress circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="text-primary transition-all duration-500"
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-foreground">{completedSteps}/{totalSteps}</span>
              <span className="text-xs text-muted-foreground">Steps</span>
            </div>
          </div>

          {/* Status counts */}
          <div className="flex items-center gap-3 mt-3 text-xs">
            <span className="flex items-center gap-1 text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-600" />
              {passedSteps} Passed
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              {failedSteps} Failed
            </span>
            <span className="flex items-center gap-1 text-gray-400">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              {pendingSteps} Pending
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
