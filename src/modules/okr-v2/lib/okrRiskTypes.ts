// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Risk Type Definitions
// Separates own risks from cascaded risks for proper analytics
// ═══════════════════════════════════════════════════════════════════════════════

import type { OkrRiskSummary } from './okrTypes';

/**
 * Risk counts for display in tree and analytics
 */
export interface RiskCounts {
  high: number;
  medium: number;
  low: number;
}

/**
 * Separated risk model: own vs cascaded
 * - ownRisks: risks directly attached to this item
 * - cascadedRisks: risks inherited from children (for analytics only)
 */
export interface SeparatedRisks {
  ownRisks: RiskCounts;
  cascadedRisks: RiskCounts;
  totalRisks: RiskCounts; // ownRisks + cascadedRisks
}

/**
 * Risk origin breakdown for analytics drawer
 */
export interface RiskOriginBreakdown {
  objectiveLevel: RiskCounts;
  krLevel: RiskCounts;
  workItemLevel: RiskCounts;
  workItemsWithHighRisk: Array<{ id: string; name: string; type: string }>;
  krsWithHighRisk: Array<{ id: string; name: string }>;
}

/**
 * Extended risk summary for analytics
 */
export interface AnalyticsRiskSummary {
  totals: RiskCounts;
  breakdown: RiskOriginBreakdown;
  blockedItems: number;
  delayedItems: number;
  avgDaysLate: number;
}

/**
 * Empty risk counts
 */
export const EMPTY_RISK_COUNTS: RiskCounts = {
  high: 0,
  medium: 0,
  low: 0,
};

/**
 * Add two risk counts together
 */
export function addRiskCounts(a: RiskCounts, b: RiskCounts): RiskCounts {
  return {
    high: (a.high || 0) + (b.high || 0),
    medium: (a.medium || 0) + (b.medium || 0),
    low: (a.low || 0) + (b.low || 0),
  };
}

/**
 * Convert OkrRiskSummary to RiskCounts
 */
export function toRiskCounts(summary?: OkrRiskSummary): RiskCounts {
  return {
    high: summary?.high || 0,
    medium: summary?.medium || 0,
    low: summary?.low || 0,
  };
}

/**
 * Check if risk counts have any risks
 */
export function hasRisks(counts: RiskCounts): boolean {
  return counts.high > 0 || counts.medium > 0 || counts.low > 0;
}

/**
 * Get total risk count
 */
export function getTotalCount(counts: RiskCounts): number {
  return counts.high + counts.medium + counts.low;
}
