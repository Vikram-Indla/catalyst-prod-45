/**
 * Module 3B-1: Start/pause/stop execution controls
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Settings,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RunControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  hasTests: boolean;
  hasFailedWorkers?: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRequeueAbandoned?: () => void;
  className?: string;
}

export function RunControls({
  isRunning,
  isPaused,
  hasTests,
  hasFailedWorkers = false,
  onStart,
  onPause,
  onResume,
  onStop,
  onRequeueAbandoned,
  className,
}: RunControlsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Main Control Button */}
      {!isRunning ? (
        <Button
          onClick={onStart}
          disabled={!hasTests}
          className="gap-2"
          size="lg"
        >
          <Play className="h-5 w-5" />
          Start Execution
        </Button>
      ) : isPaused ? (
        <Button
          onClick={onResume}
          variant="outline"
          className="gap-2 border-warning text-warning hover:bg-warning/10"
          size="lg"
        >
          <Play className="h-5 w-5" />
          Resume
        </Button>
      ) : (
        <Button
          onClick={onPause}
          variant="outline"
          className="gap-2 border-warning text-warning hover:bg-warning/10"
          size="lg"
        >
          <Pause className="h-5 w-5" />
          Pause
        </Button>
      )}

      {/* Stop Button */}
      {isRunning && (
        <Button
          onClick={onStop}
          variant="destructive"
          size="lg"
          className="gap-2"
        >
          <Square className="h-5 w-5" />
          Stop
        </Button>
      )}

      {/* Options Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-10 w-10">
            <Settings className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Execution Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {onRequeueAbandoned && (
            <DropdownMenuItem 
              onClick={onRequeueAbandoned}
              disabled={!isRunning}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Requeue Abandoned Tests
            </DropdownMenuItem>
          )}

          {hasFailedWorkers && (
            <DropdownMenuItem className="text-warning">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Restart Failed Workers
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status Indicator */}
      {isRunning && (
        <div className="flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-muted">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isPaused ? 'bg-warning' : 'bg-success animate-pulse'
          )} />
          <span className="text-sm font-medium">
            {isPaused ? 'Paused' : 'Running'}
          </span>
        </div>
      )}
    </div>
  );
}
