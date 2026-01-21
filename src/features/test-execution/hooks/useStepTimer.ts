/**
 * Module 3A-5: Step Timer Hook
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TimerStatus, UseTimerReturn } from '../types/timer-metrics';

export function useStepTimer(
  executionId: string | null,
  stepId: string | null,
  autoStart: boolean = false
): UseTimerReturn {
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (status === 'running') return;

    if (executionId && stepId) {
      await (supabase.rpc as any)('start_step_timer', {
        p_execution_id: executionId,
        p_step_id: stepId,
      });
    }

    setStatus('running');
    startTimeRef.current = Date.now() - seconds * 1000;

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
  }, [executionId, stepId, seconds, status]);

  const pause = useCallback(async () => {
    if (status !== 'running') return;

    clearTimer();
    setStatus('paused');

    if (executionId && stepId) {
      await (supabase.rpc as any)('pause_step_timer', {
        p_execution_id: executionId,
        p_step_id: stepId,
      });
    }
  }, [executionId, stepId, status, clearTimer]);

  const resume = useCallback(async () => {
    if (status !== 'paused') return;

    if (executionId && stepId) {
      await (supabase.rpc as any)('resume_step_timer', {
        p_execution_id: executionId,
        p_step_id: stepId,
      });
    }

    start();
  }, [status, start, executionId, stepId]);

  const reset = useCallback(() => {
    clearTimer();
    setSeconds(0);
    setStatus('idle');
    startTimeRef.current = null;
  }, [clearTimer]);

  const stop = useCallback(async (): Promise<number> => {
    clearTimer();
    const finalSeconds = seconds;
    setStatus('completed');

    if (executionId && stepId) {
      await (supabase.rpc as any)('complete_step_timer', {
        p_execution_id: executionId,
        p_step_id: stepId,
      });
    }

    return finalSeconds;
  }, [executionId, stepId, seconds, clearTimer]);

  useEffect(() => {
    if (autoStart && executionId && stepId && status === 'idle') {
      start();
    }
    return clearTimer;
  }, [autoStart, executionId, stepId, status, start, clearTimer]);

  const formatTime = (secs: number): string => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    seconds,
    status,
    formattedTime: formatTime(seconds),
    start,
    pause,
    resume,
    reset,
    stop: stop as unknown as () => number,
  };
}
