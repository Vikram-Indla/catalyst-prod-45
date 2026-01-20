/**
 * Module 3A-2: Execution Header Component
 * Shows timer, progress, and run context
 */
import React from 'react';
import { Clock, Play, Pause, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { ExecutionProgress, RunContext, ExecutionTestCase } from '../../types/step-execution';

interface ExecutionHeaderProps {
  testCase: ExecutionTestCase | undefined;
  run: RunContext | undefined;
  progress: ExecutionProgress;
  timerDisplay: string;
  isTimerRunning: boolean;
  onTimerToggle: () => void;
  onExit: () => void;
}

export function ExecutionHeader({
  testCase,
  run,
  progress,
  timerDisplay,
  isTimerRunning,
  onTimerToggle,
  onExit,
}: ExecutionHeaderProps) {
  return (
    <div className="bg-card border-b border-border px-4 py-3">
      {/* Top Row: Navigation and Timer */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Exit
            <span className="ml-1 text-xs opacity-60">(Esc)</span>
          </Button>
          
          {run && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{run.name}</span>
              <span>•</span>
              <Badge variant="outline" className="text-xs">
                {run.environment}
              </Badge>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-lg ${
              isTimerRunning ? 'bg-brand-primary/10 text-brand-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Clock className={`h-4 w-4 ${isTimerRunning ? 'animate-pulse' : ''}`} />
            <span>{timerDisplay}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onTimerToggle}
            className="h-8 w-8 p-0"
          >
            {isTimerRunning ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Test Case Info */}
      {testCase && (
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-muted-foreground">
                {testCase.case_number}
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${
                  testCase.priority === 'critical' ? 'border-red-500 text-red-600' :
                  testCase.priority === 'high' ? 'border-amber-500 text-amber-600' :
                  testCase.priority === 'medium' ? 'border-blue-500 text-blue-600' :
                  'border-gray-400 text-gray-500'
                }`}
              >
                {testCase.priority}
              </Badge>
            </div>
            <h1 className="text-lg font-semibold text-foreground truncate">
              {testCase.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {testCase.suite_name}
            </p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Step {progress.completed} of {progress.total}
          </span>
          <div className="flex items-center gap-3">
            {progress.passed > 0 && (
              <span className="text-green-600">✓ {progress.passed}</span>
            )}
            {progress.failed > 0 && (
              <span className="text-red-600">✕ {progress.failed}</span>
            )}
            {progress.blocked > 0 && (
              <span className="text-amber-600">⊘ {progress.blocked}</span>
            )}
            {progress.skipped > 0 && (
              <span className="text-gray-500">→ {progress.skipped}</span>
            )}
          </div>
        </div>
        <Progress value={progress.percentage} className="h-2" />
      </div>
    </div>
  );
}
