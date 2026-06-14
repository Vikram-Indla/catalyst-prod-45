/**
 * useCatyMood — combines live signals (useCatySignals) with the daily-lock,
 * worsen-only, and 7-day trend behaviour. localStorage holds per-user history so the
 * sparkline accrues over days with zero backend (a daily cron table can replace it
 * later for cross-device — see CatyWhyCard).
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCatySignals } from './useCatySignals';
import {
  appendDailyHistory,
  computeTrend,
  lockedStateFor,
  resolveDisplayState,
  sparklineScores,
  type CatyDailyPoint,
} from './catyMoodHistory';
import type { CatyState } from './catyMoodEngine';

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}

function loadHistory(key: string): CatyDailyPoint[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useCatyMood() {
  const { user } = useAuth();
  const { signals, evidence, byType, mood, isLoading, isError, jiraAccountId } = useCatySignals();
  const storageKey = user?.id ? `caty.mood.history.${user.id}` : null;

  const [history, setHistory] = useState<CatyDailyPoint[]>([]);

  // Hydrate history once we know the user.
  useEffect(() => {
    if (!storageKey) return;
    setHistory(loadHistory(storageKey));
  }, [storageKey]);

  // Record today's reading whenever the live score changes (worsen-only merge).
  useEffect(() => {
    if (!storageKey || isLoading) return;
    setHistory((prev) => {
      const next = appendDailyHistory(prev, localToday(), mood.score, mood.state);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* storage unavailable — sparkline simply won't persist */
      }
      return next;
    });
  }, [storageKey, isLoading, mood.score, mood.state]);

  const today = localToday();
  const locked = lockedStateFor(history, today);
  const displayState: CatyState = resolveDisplayState(locked, mood.state);
  const trend = useMemo(() => computeTrend(history), [history]);
  const sparkline = useMemo(() => sparklineScores(history, 7), [history]);

  return {
    displayState,
    liveMood: mood,
    signals,
    evidence,
    byType,
    history,
    trend,
    sparkline,
    isLoading,
    fetchSucceeded: !isError && !isLoading && jiraAccountId !== null,
    jiraAccountId,
  };
}
