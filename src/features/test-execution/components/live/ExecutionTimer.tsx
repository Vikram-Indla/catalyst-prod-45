/**
 * Module 4C-2: Execution Timer
 * Real-time timer display with start/pause/reset controls
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExecutionTimerProps {
  initialSeconds?: number;
  isRunning?: boolean;
  onTimeUpdate?: (seconds: number) => void;
  onToggle?: (isRunning: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  showControls?: boolean;
  className?: string;
}

export function ExecutionTimer({
  initialSeconds = 0,
  isRunning: externalIsRunning,
  onTimeUpdate,
  onToggle,
  size = 'md',
  showControls = true,
  className,
}: ExecutionTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(externalIsRunning ?? false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with external running state
  useEffect(() => {
    if (externalIsRunning !== undefined) {
      setIsRunning(externalIsRunning);
    }
  }, [externalIsRunning]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          const newValue = prev + 1;
          onTimeUpdate?.(newValue);
          return newValue;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, onTimeUpdate]);

  const handleToggle = useCallback(() => {
    const newState = !isRunning;
    setIsRunning(newState);
    onToggle?.(newState);
  }, [isRunning, onToggle]);

  const handleReset = useCallback(() => {
    setSeconds(0);
    setIsRunning(false);
    onTimeUpdate?.(0);
    onToggle?.(false);
  }, [onTimeUpdate, onToggle]);

  // Format time display
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const sizeConfig = {
    sm: {
      container: 'gap-1.5',
      time: 'text-lg font-mono',
      icon: 'h-3.5 w-3.5',
      button: 'h-7 w-7',
    },
    md: {
      container: 'gap-2',
      time: 'text-2xl font-mono',
      icon: 'h-4 w-4',
      button: 'h-8 w-8',
    },
    lg: {
      container: 'gap-3',
      time: 'text-4xl font-mono',
      icon: 'h-5 w-5',
      button: 'h-10 w-10',
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn('flex items-center', config.container, className)}>
      <div className="flex items-center gap-1.5">
        <Clock className={cn('text-muted-foreground', config.icon)} />
        <span
          className={cn(
            config.time,
            'tabular-nums',
            isRunning ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {formatTime(seconds)}
        </span>
      </div>

      {showControls && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={config.button}
            onClick={handleToggle}
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          >
            {isRunning ? (
              <Pause className={config.icon} />
            ) : (
              <Play className={config.icon} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={config.button}
            onClick={handleReset}
            disabled={seconds === 0}
            aria-label="Reset timer"
          >
            <RotateCcw className={config.icon} />
          </Button>
        </div>
      )}
    </div>
  );
}

// Hook for timer logic
export function useExecutionTimerState(initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(initialSeconds);

  const start = useCallback(() => {
    if (!isRunning) {
      startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;
      setIsRunning(true);
    }
  }, [isRunning]);

  const pause = useCallback(() => {
    if (isRunning) {
      pausedTimeRef.current = seconds;
      setIsRunning(false);
    }
  }, [isRunning, seconds]);

  const reset = useCallback(() => {
    setSeconds(0);
    setIsRunning(false);
    pausedTimeRef.current = 0;
    startTimeRef.current = null;
  }, []);

  const restart = useCallback(() => {
    reset();
    setTimeout(() => {
      startTimeRef.current = Date.now();
      setIsRunning(true);
    }, 0);
  }, [reset]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setSeconds(elapsed);
        }
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    seconds,
    isRunning,
    formattedTime: formatTime(seconds),
    start,
    pause,
    reset,
    restart,
    toggle: isRunning ? pause : start,
    getElapsed: () => seconds,
  };
}
