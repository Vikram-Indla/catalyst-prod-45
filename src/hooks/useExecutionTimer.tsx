import { useState, useEffect, useCallback } from 'react';
import { updateExecutionTimer } from '@/services/executionService';

export function useExecutionTimer(executionId: string, initialSeconds: number = 0) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(initialSeconds);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setSeconds(initialSeconds + elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime, initialSeconds]);

  const start = useCallback(async () => {
    const now = Date.now();
    setStartTime(now);
    setIsRunning(true);
    await updateExecutionTimer(executionId, 'start');
  }, [executionId]);

  const pause = useCallback(async () => {
    setIsRunning(false);
    setStartTime(null);
    await updateExecutionTimer(executionId, 'pause', seconds);
  }, [executionId, seconds]);

  const reset = useCallback(async () => {
    setIsRunning(false);
    setStartTime(null);
    setSeconds(0);
    await updateExecutionTimer(executionId, 'reset');
  }, [executionId]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    seconds,
    isRunning,
    formattedTime: formatTime(seconds),
    start,
    pause,
    reset,
  };
}
