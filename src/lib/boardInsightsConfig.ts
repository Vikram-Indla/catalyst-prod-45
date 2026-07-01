/**
 * Board Insights scoring configuration.
 * All weights and thresholds live here — tune without touching engine logic.
 */

export const BOARD_INSIGHTS_CONFIG = {
  // ── Explicit attention signal weights ──────────────────────────────────────
  weights: {
    flagged: 35,
    overdueTarget: 30,
    statusAtRisk: 20,      // status text matches on-hold/blocked/hold keywords
    stale7d: 15,
    stale3d: 8,
    dueWithin1d: 22,
    dueWithin3d: 15,
    dueWithin7d: 8,
    unassignedHighPriority: 20,
    aboveBoardMedian2x: 12,
  },

  // ── Priority multipliers ───────────────────────────────────────────────────
  priorityMultiplier: {
    critical: 1.35,
    high: 1.20,
    medium: 1.00,
    low: 0.85,
    unknown: 1.00,
  } as Record<string, number>,

  // ── Status category multipliers ────────────────────────────────────────────
  statusCategoryMultiplier: {
    in_progress: 1.00,
    todo: 0.90,
    done: 0,              // excluded from attention
  } as Record<string, number>,

  // ── Status text risk keywords (lowercase match) ────────────────────────────
  statusRiskKeywords: ['on_hold', 'on hold', 'blocked', 'hold', 'waiting', 'stuck', 'returned', 'failed'],

  // ── Risk band thresholds ───────────────────────────────────────────────────
  riskBands: {
    critical: 80,
    high: 60,
    medium: 40,
    low: 20,
  },

  // ── Display limits ─────────────────────────────────────────────────────────
  minScoreToShow: 20,
  maxItemsToShow: 25,

  // ── Stale thresholds (days since jira_updated_at) ─────────────────────────
  staleThresholds: {
    high: 7,
    medium: 3,
  },

  // ── Due-date proximity windows (days) ─────────────────────────────────────
  dueSoonWindows: [1, 3, 7] as const,
} as const;

export type RiskBand = 'Critical' | 'High' | 'Medium' | 'Low';

export function getRiskBand(score: number): RiskBand | null {
  const { riskBands } = BOARD_INSIGHTS_CONFIG;
  if (score >= riskBands.critical) return 'Critical';
  if (score >= riskBands.high) return 'High';
  if (score >= riskBands.medium) return 'Medium';
  if (score >= riskBands.low) return 'Low';
  return null;
}
