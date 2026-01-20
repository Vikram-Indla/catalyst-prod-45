/**
 * Module 3A-2: Execution Timer Hook
 * Manages per-step timer for tracking execution duration
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useExecutionTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
    }
  }, [isRunning]);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setSeconds(0);
  }, []);

  const restart = useCallback(() => {
    setSeconds(0);
    setIsRunning(true);
  }, []);

  const getElapsed = useCallback(() => seconds, [seconds]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formattedTime = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  return {
    seconds,
    isRunning,
    start,
    stop,
    reset,
    restart,
    getElapsed,
    formattedTime,
  };
}
