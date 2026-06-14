/**
 * catyMoodHistory — pure helpers for the daily-lock, worsen-only, and 7-day trend
 * behaviour. No storage here (the hook owns localStorage); these are testable functions.
 *
 * Rules (CLAUDE.md design decisions, confirmed by Vikram):
 *  - Mood is computed once each morning and LOCKED for the day → consistency.
 *  - During the day it can only WORSEN live (new incident bumps it up); good news
 *    waits until tomorrow.
 *  - Trend is framed as workload: rising = bad. The trend WORD + arrow carry meaning,
 *    never the line direction alone.
 */
import type { CatyState } from './catyMoodEngine';

export const STATE_RANK: Record<CatyState, number> = {
  zen: 0,
  content: 1,
  focused: 2,
  concerned: 3,
  alert: 4,
};

const RANK_STATE: CatyState[] = ['zen', 'content', 'focused', 'concerned', 'alert'];

export interface CatyDailyPoint {
  date: string; // YYYY-MM-DD (local)
  score: number;
  state: CatyState;
}

export type TrendDirection = 'up' | 'down' | 'flat';
export interface CatyTrend {
  word: 'spiking' | 'climbing' | 'stable' | 'easing';
  direction: TrendDirection;
  deltaPct: number; // signed, vs prior baseline
}

export const HISTORY_CAP = 14;

/** The worse (higher-rank) of two states — the worsen-only resolver. */
export function worseState(a: CatyState, b: CatyState): CatyState {
  return STATE_RANK[a] >= STATE_RANK[b] ? a : b;
}

/**
 * Resolve what to display today: the morning-locked state, but allowed to worsen to
 * the live state. Never improves below the lock until a new day's entry replaces it.
 */
export function resolveDisplayState(locked: CatyState | null, live: CatyState): CatyState {
  if (!locked) return live;
  return worseState(locked, live);
}

/**
 * Append/merge today's reading into history. Idempotent per day: re-running the same
 * day keeps the WORSE state and HIGHER score (worsen-only within the day). Caps length.
 */
export function appendDailyHistory(
  history: CatyDailyPoint[],
  today: string,
  score: number,
  state: CatyState,
): CatyDailyPoint[] {
  const existing = history.find((p) => p.date === today);
  let next: CatyDailyPoint[];
  if (existing) {
    next = history.map((p) =>
      p.date === today
        ? { date: today, score: Math.max(p.score, score), state: worseState(p.state, state) }
        : p,
    );
  } else {
    next = [...history, { date: today, score, state }];
  }
  next.sort((a, b) => a.date.localeCompare(b.date));
  return next.slice(-HISTORY_CAP);
}

/** Today's locked entry, if present. */
export function lockedStateFor(history: CatyDailyPoint[], today: string): CatyState | null {
  return history.find((p) => p.date === today)?.state ?? null;
}

/** Last N scores for the sparkline (oldest → newest). */
export function sparklineScores(history: CatyDailyPoint[], n = 7): number[] {
  return history.slice(-n).map((p) => p.score);
}

/**
 * Trend vs the baseline (mean of prior days, excluding today). Returns a workload word.
 * With <2 days of history → stable / flat.
 */
export function computeTrend(history: CatyDailyPoint[]): CatyTrend {
  if (history.length < 2) return { word: 'stable', direction: 'flat', deltaPct: 0 };
  const today = history[history.length - 1];
  const prior = history.slice(-7, -1);
  const baseline = prior.reduce((s, p) => s + p.score, 0) / prior.length;
  const delta = today.score - baseline;
  const deltaPct = Math.round((delta / Math.max(baseline, 1)) * 100);

  if (delta <= -1) return { word: 'easing', direction: 'down', deltaPct };
  if (delta < 1) return { word: 'stable', direction: 'flat', deltaPct };
  if (deltaPct >= 50) return { word: 'spiking', direction: 'up', deltaPct };
  return { word: 'climbing', direction: 'up', deltaPct };
}

export { RANK_STATE };
