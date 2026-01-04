/**
 * Execution Timer Component
 * Displays timer with pause/resume controls
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Timer, Pause, Play } from 'lucide-react';

interface ExecutionTimerProps {
  formattedTime: string;
  isRunning: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ExecutionTimer({
  formattedTime,
  isRunning,
  onToggle,
  disabled,
}: ExecutionTimerProps) {
  return (
    <div className="flex items-center gap-2">
      <Timer className="h-4 w-4 text-muted-foreground" />
      <span
        className={cn(
          'font-mono text-sm tabular-nums min-w-[60px]',
          isRunning ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
        )}
      >
        {formattedTime}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onToggle}
        disabled={disabled}
        title={isRunning ? 'Pause timer (Space)' : 'Resume timer (Space)'}
      >
        {isRunning ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
