/**
 * Execution Timer Hook
 * Auto-starts on first action, pauses on inactivity, persists across refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const TIMER_STORAGE_KEY = 'execution_timer_state';

interface TimerState {
  runId: string;
  elapsed: number;
  isRunning: boolean;
  lastActivity: number;
}

export function useExecutionTimer(runId: string | null, isComplete: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load persisted state
  useEffect(() => {
    if (!runId) return;

    try {
      const stored = localStorage.getItem(TIMER_STORAGE_KEY);
      if (stored) {
        const state: TimerState = JSON.parse(stored);
        if (state.runId === runId) {
          setElapsed(state.elapsed);
          setIsRunning(state.isRunning);
          setHasStarted(state.elapsed > 0 || state.isRunning);
          lastActivityRef.current = state.lastActivity;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [runId]);

  // Persist state changes
  useEffect(() => {
    if (!runId) return;

    const state: TimerState = {
      runId,
      elapsed,
      isRunning,
      lastActivity: lastActivityRef.current,
    };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  }, [runId, elapsed, isRunning]);

  // Timer interval
  useEffect(() => {
    if (isRunning && !isComplete) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isComplete]);

  // Inactivity detection
  useEffect(() => {
    if (!isRunning || isComplete) return;

    const checkInactivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > INACTIVITY_TIMEOUT) {
        setIsRunning(false);
      }
    };

    const inactivityCheck = setInterval(checkInactivity, 10000);
    return () => clearInterval(inactivityCheck);
  }, [isRunning, isComplete]);

  // Stop timer when complete
  useEffect(() => {
    if (isComplete) {
      setIsRunning(false);
      if (runId) {
        localStorage.removeItem(TIMER_STORAGE_KEY);
      }
    }
  }, [isComplete, runId]);

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (!hasStarted) {
      setHasStarted(true);
      setIsRunning(true);
    } else if (!isRunning && !isComplete) {
      setIsRunning(true);
    }
  }, [hasStarted, isRunning, isComplete]);

  const toggleTimer = useCallback(() => {
    if (!isComplete) {
      setIsRunning((prev) => !prev);
      lastActivityRef.current = Date.now();
    }
  }, [isComplete]);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    elapsed,
    isRunning,
    hasStarted,
    formattedTime: formatTime(elapsed),
    recordActivity,
    toggleTimer,
  };
}
