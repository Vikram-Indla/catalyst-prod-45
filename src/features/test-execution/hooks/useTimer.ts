/**
 * Timer Hook for Test Execution
 */

import { useEffect, useRef, useCallback } from 'react';
import { useExecutionStore } from '../stores/executionStore';

export function useTimer() {
  const { elapsedSeconds, isTimerRunning, tick, startTimer, stopTimer, toggleTimer } = useExecutionStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isTimerRunning) {
      intervalRef.current = setInterval(tick, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTimerRunning, tick]);
  
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  return {
    elapsed: elapsedSeconds,
    formattedTime: formatTime(elapsedSeconds),
    isRunning: isTimerRunning,
    start: startTimer,
    stop: stopTimer,
    toggle: toggleTimer,
  };
}
