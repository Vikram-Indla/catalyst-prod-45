/**
 * Execution Footer - Status bar with shortcuts, stats, and step navigation
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, SkipForward, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TestRun, StepResult } from '../../../api/types';
import { KEYBOARD_SHORTCUTS } from '../hooks/useExecutionKeyboard';

interface ExecutionFooterProps {
  run?: TestRun | null;
  steps: StepResult[];
  currentStepIndex: number;
  onStepSelect: (index: number) => void;
}

export function ExecutionFooter({ run, steps, currentStepIndex, onStepSelect }: ExecutionFooterProps) {
  // Calculate stats
  const passedCount = steps.filter(s => s.status === 'passed').length;
  const failedCount = steps.filter(s => s.status === 'failed').length;
  const blockedCount = steps.filter(s => s.status === 'blocked').length;
  const skippedCount = steps.filter(s => s.status === 'skipped').length;
  const remainingCount = steps.filter(s => s.status === 'not_run' || s.status === 'in_progress').length;

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      onStepSelect(currentStepIndex - 1);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      onStepSelect(currentStepIndex + 1);
    }
  };

  return (
    <footer className="flex items-center justify-between px-5 py-2.5 bg-background border-t flex-shrink-0 animate-fade-in"
      style={{ animationDelay: '150ms' }}
    >
      {/* Left - Status & Step Counter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
          Auto-save enabled
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Run #{run?.run_number || 1}
        </div>

        {/* Step Navigator */}
        <div className="flex items-center gap-2 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handlePrevStep}
            disabled={currentStepIndex <= 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Step <strong className="text-foreground">{currentStepIndex + 1}</strong> of <strong className="text-foreground">{steps.length}</strong>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleNextStep}
            disabled={currentStepIndex >= steps.length - 1}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Clickable Step Dots */}
        <div className="flex items-center gap-1 ml-2">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => onStepSelect(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all cursor-pointer',
                step.status === 'passed' && 'bg-teal-500',
                step.status === 'failed' && 'bg-destructive',
                step.status === 'blocked' && 'bg-orange-500',
                step.status === 'skipped' && 'bg-muted-foreground',
                (step.status === 'not_run' || step.status === 'in_progress') && 'bg-muted-foreground/30',
                currentStepIndex === index && 'ring-2 ring-offset-1 ring-primary'
              )}
              title={`Step ${index + 1} - ${step.status}`}
            />
          ))}
        </div>
      </div>

      {/* Center - Shortcuts */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Shortcuts:</span>
        {KEYBOARD_SHORTCUTS.slice(0, 5).map((shortcut) => (
          <span key={shortcut.key} className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted border rounded text-[10px] font-mono">
              {shortcut.key}
            </kbd>
            <span>{shortcut.action}</span>
          </span>
        ))}
      </div>

      {/* Right - Progress Legend with Labels */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          <span className="text-muted-foreground">Passed:</span>
          <span className="font-medium text-foreground">{passedCount}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Failed:</span>
          <span className="font-medium text-foreground">{failedCount}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-muted-foreground">Blocked:</span>
          <span className="font-medium text-foreground">{blockedCount}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground" />
          <span className="text-muted-foreground">Skipped:</span>
          <span className="font-medium text-foreground">{skippedCount}</span>
        </span>
        <span className="text-muted-foreground/60">
          {remainingCount} remaining
        </span>
      </div>
    </footer>
  );
}
