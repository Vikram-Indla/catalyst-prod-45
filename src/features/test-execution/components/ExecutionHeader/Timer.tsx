/**
 * Timer - Execution timer display with pause/play
 */

import { Clock, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TimerProps {
  time: string;
  isRunning: boolean;
  onToggle: () => void;
}

export function Timer({ time, isRunning, onToggle }: TimerProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="font-mono text-sm font-semibold tabular-nums">{time}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="h-8 w-8"
      >
        {isRunning ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
