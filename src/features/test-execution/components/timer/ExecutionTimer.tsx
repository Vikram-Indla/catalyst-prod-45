/**
 * Module 3A-5: Execution Timer Widget
 */
import React from 'react';
import { Play, Pause, RotateCcw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TimerStatus } from '../../types/timer-metrics';

interface ExecutionTimerProps {
  formattedTime: string;
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onStop?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showControls?: boolean;
}

export const ExecutionTimer: React.FC<ExecutionTimerProps> = React.memo(({
  formattedTime,
  status,
  onStart,
  onPause,
  onResume,
  onReset,
  onStop,
  size = 'md',
  showControls = true,
}) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Timer Display */}
      <div className={cn(
        'font-mono font-bold tabular-nums tracking-tight',
        sizeClasses[size],
        status === 'running' && 'text-green-600 dark:text-green-400',
        status === 'paused' && 'text-amber-600 dark:text-amber-400 animate-pulse',
        status === 'completed' && 'text-muted-foreground',
        status === 'idle' && 'text-muted-foreground'
      )}>
        {formattedTime}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-2">
          {status === 'idle' && (
            <Button size="sm" variant="outline" onClick={onStart}>
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}
          
          {status === 'running' && (
            <Button size="sm" variant="outline" onClick={onPause}>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}
          
          {status === 'paused' && (
            <>
              <Button size="sm" variant="outline" onClick={onResume}>
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
              <Button size="sm" variant="ghost" onClick={onReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </>
          )}

          {(status === 'running' || status === 'paused') && onStop && (
            <Button size="sm" variant="destructive" onClick={onStop}>
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

ExecutionTimer.displayName = 'ExecutionTimer';
