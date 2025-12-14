// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Shared Analytics Types & Utilities
// Common types, helpers, and components for all analytics drawers
// ═══════════════════════════════════════════════════════════════════════════════

import type { OkrRiskSummary, StatusCode } from './okrTypes';
import {
  RiskCounts,
  AnalyticsRiskSummary,
  EMPTY_RISK_COUNTS,
  addRiskCounts,
  toRiskCounts,
} from './okrRiskTypes';
import { getDaysUntilDue, clamp, computeProgressBaseline } from './okrMetrics';

// ─────────────────────────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export type TrendDirection = 'ahead' | 'on-plan' | 'behind' | 'no-baseline';
export type InsightSeverity = 'high' | 'medium' | 'low';

export interface BaselineInfo {
  actual: number;
  expected: number | null;
  delta: number | null;
  trend: TrendDirection;
  daysToTarget: number | null;
  timingLabel: string;
}

export interface ExecutiveInsight {
  text: string;
  severity: InsightSeverity;
}

export interface AlignmentPath {
  themeName: string;
  themeColor: string;
  objectiveName?: string;
  krName?: string;
}

export interface LinkedWorkSummary {
  totalWork: number;
  blocked: number;
  delayed: number;
  completed: number;
  inProgress: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SHARED CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────────

export const BASELINE_TOLERANCE = 5; // percentage points

export const STATUS_LABELS: Record<string, string> = {
  'on-track': 'On Track',
  'in-progress': 'In Progress',
  'at-risk': 'At Risk',
  'off-track': 'Off Track',
  'blocked': 'Blocked',
  'pending': 'Pending',
  'completed': 'Completed',
};

// ─────────────────────────────────────────────────────────────────────────────────
// SHARED HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function getTimingLabel(daysToTarget: number | null): string {
  if (daysToTarget === null) return 'No target date';
  if (daysToTarget === 0) return 'Due today';
  if (daysToTarget > 0) return `${daysToTarget} days to target`;
  return `Overdue by ${Math.abs(daysToTarget)} days`;
}

export function computeBaselineInfo(
  actual: number,
  startDate?: string,
  dueDate?: string
): BaselineInfo {
  const baseline = computeProgressBaseline(actual, startDate, dueDate);
  const daysToTarget = getDaysUntilDue(dueDate);
  
  let trend: TrendDirection = 'no-baseline';
  if (baseline.expected !== null) {
    const delta = actual - baseline.expected;
    if (delta >= BASELINE_TOLERANCE) {
      trend = 'ahead';
    } else if (delta <= -BASELINE_TOLERANCE) {
      trend = 'behind';
    } else {
      trend = 'on-plan';
    }
  }

  const roundedExpected = baseline.expected !== null ? Math.round(baseline.expected * 10) / 10 : null;
  const roundedDelta = baseline.variance !== null ? Math.round(baseline.variance * 10) / 10 : null;

  return {
    actual: Math.round(actual * 10) / 10,
    expected: roundedExpected,
    delta: roundedDelta,
    trend,
    daysToTarget,
    timingLabel: getTimingLabel(daysToTarget),
  };
}

/**
 * Build executive insights based on baseline, risks, and work coverage
 * Same rule engine for all drawer types
 */
export function buildExecutiveInsights(
  baseline: BaselineInfo,
  risks: AnalyticsRiskSummary,
  totalWork: number,
  unlinkedItems: number = 0,
  itemType: 'objective' | 'keyResult' | 'workItem' = 'objective'
): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = [];

  // Priority 1: Behind schedule
  if (baseline.trend === 'behind' && baseline.delta !== null && Math.abs(baseline.delta) >= 10) {
    insights.push({
      text: `Progress is ${Math.abs(baseline.delta)}pp behind expected baseline; consider scope adjustment or fast-tracking.`,
      severity: 'high',
    });
  }

  // Priority 2: Overdue
  if (baseline.daysToTarget !== null && baseline.daysToTarget < 0) {
    insights.push({
      text: `Target date is ${Math.abs(baseline.daysToTarget)} days overdue; update timeline or escalate blockers.`,
      severity: 'high',
    });
  }

  // Priority 3: High risks with origin
  if (risks.totals.high > 0) {
    const originParts: string[] = [];
    if (risks.breakdown.workItemLevel.high > 0) {
      const firstItem = risks.breakdown.workItemsWithHighRisk[0];
      originParts.push(`${risks.breakdown.workItemLevel.high} at Work item level${firstItem ? ` (${firstItem.name})` : ''}`);
    }
    if (risks.breakdown.krLevel.high > 0) {
      originParts.push(`${risks.breakdown.krLevel.high} at KR level`);
    }
    if (risks.breakdown.objectiveLevel?.high > 0) {
      originParts.push(`${risks.breakdown.objectiveLevel.high} at Objective level`);
    }
    
    insights.push({
      text: `There ${risks.totals.high === 1 ? 'is' : 'are'} ${risks.totals.high} open high-severity risk${risks.totals.high > 1 ? 's' : ''} requiring active mitigation and periodic review.`,
      severity: 'high',
    });
  }

  // Priority 4: Blocked/delayed items
  if (risks.blockedItems > 0 || risks.delayedItems > 0) {
    const parts: string[] = [];
    if (risks.blockedItems > 0) parts.push(`${risks.blockedItems} blocked`);
    if (risks.delayedItems > 0) parts.push(`${risks.delayedItems} delayed (avg ${risks.avgDaysLate} days late)`);
    insights.push({
      text: `${parts.join(' and ')} delivery item${risks.blockedItems + risks.delayedItems > 1 ? 's' : ''}; risk of timeline slip.`,
      severity: risks.blockedItems > 0 ? 'high' : 'medium',
    });
  }

  // Priority 5: Items without work (for Objectives and KRs)
  if (itemType === 'objective' && unlinkedItems > 0) {
    insights.push({
      text: `${unlinkedItems} KR${unlinkedItems > 1 ? 's have' : ' has'} no linked delivery work; risk of 'paper OKR' with no execution plan.`,
      severity: unlinkedItems > 1 ? 'high' : 'medium',
    });
  } else if (itemType === 'keyResult' && totalWork === 0) {
    insights.push({
      text: `This Key Result has no linked delivery work; risk of 'paper KR' with no execution plan.`,
      severity: 'high',
    });
  }

  // Priority 6: Positive outlook (if no concerns)
  if (insights.length === 0 && baseline.actual >= 50 && risks.totals.high === 0 && risks.blockedItems === 0) {
    const itemName = itemType === 'objective' ? 'Objective' : itemType === 'keyResult' ? 'Key Result' : 'Work Item';
    insights.push({
      text: `${itemName} is on track with low delivery risk.`,
      severity: 'low',
    });
  }

  // Limit to 4 insights, sorted by severity
  const severityOrder: Record<InsightSeverity, number> = { high: 0, medium: 1, low: 2 };
  return insights
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 4);
}

// Re-export risk types for convenience
export type { RiskCounts, AnalyticsRiskSummary };
export { EMPTY_RISK_COUNTS, addRiskCounts, toRiskCounts };
