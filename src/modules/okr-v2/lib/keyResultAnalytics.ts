// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Key Result Analytics
// Computes executive metrics for a single Key Result
// Uses ownRisks for origin tracking, cascadedRisks for totals
// ═══════════════════════════════════════════════════════════════════════════════

import type { Theme, Objective, KeyResult, WorkItem } from './okrTypes';
import { computeKeyResultProgress, getDaysUntilDue } from './okrMetrics';
import {
  BaselineInfo,
  ExecutiveInsight,
  AlignmentPath,
  LinkedWorkSummary,
  TrendDirection,
  InsightSeverity,
  computeBaselineInfo,
  getStatusLabel,
  buildExecutiveInsights,
  RiskCounts,
  AnalyticsRiskSummary,
  EMPTY_RISK_COUNTS,
  addRiskCounts,
  toRiskCounts,
} from './sharedAnalyticsTypes';

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkItemStatusCounts {
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  pending: number;
}

export interface KeyResultAnalyticsData {
  id: string;
  name: string;
  type: 'Key Result';
  status: string;
  statusLabel: string;
  baseline: BaselineInfo;
  workItemStatus: WorkItemStatusCounts;
  risks: AnalyticsRiskSummary;
  linkedWork: LinkedWorkSummary;
  insights: ExecutiveInsight[];
  alignment: AlignmentPath;
  // KR-specific fields
  actual?: number;
  target?: number;
  baselineValue?: number;
  unit?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Count work items by status
// ─────────────────────────────────────────────────────────────────────────────────

function countWorkItemsByStatus(workItems: WorkItem[]): WorkItemStatusCounts {
  const counts: WorkItemStatusCounts = {
    total: workItems.length,
    completed: 0,
    inProgress: 0,
    blocked: 0,
    pending: 0,
  };

  for (const wi of workItems) {
    switch (wi.status) {
      case 'completed':
        counts.completed++;
        break;
      case 'in-progress':
      case 'on-track':
        counts.inProgress++;
        break;
      case 'blocked':
      case 'off-track':
        counts.blocked++;
        break;
      default:
        counts.pending++;
    }
  }

  return counts;
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Compute risk summary for KR (cascaded from work items)
// ─────────────────────────────────────────────────────────────────────────────────

function computeKRRiskSummary(kr: KeyResult): AnalyticsRiskSummary {
  const workItems = kr.workItems || [];

  // KR own risks (usually empty)
  const krOwnRisks = toRiskCounts(kr.ownRisks);
  
  // Work item own risks (leaf nodes)
  const workItemLevelRisks = workItems.reduce(
    (acc, wi) => addRiskCounts(acc, toRiskCounts(wi.ownRisks)),
    EMPTY_RISK_COUNTS
  );

  // Total is KR own + work item own risks
  const totals = addRiskCounts(krOwnRisks, workItemLevelRisks);

  // Build lists of items with high own risks
  const workItemsWithHighRisk = workItems
    .filter(wi => (wi.ownRisks?.high || 0) > 0)
    .map(wi => ({ id: wi.id, name: wi.name, type: wi.workItemType || 'work item' }));

  // Blocked items
  const blockedItems = workItems.filter(wi => wi.status === 'blocked').length;

  // Delayed items (past due and not completed)
  const delayedItems = workItems.filter(wi => {
    if (wi.status === 'completed') return false;
    const daysUntilDue = getDaysUntilDue(wi.releaseDate);
    return daysUntilDue !== null && daysUntilDue < 0;
  });

  // Average days late
  const totalDaysLate = delayedItems.reduce((sum, wi) => {
    const days = getDaysUntilDue(wi.releaseDate);
    return sum + (days !== null ? Math.abs(days) : 0);
  }, 0);
  const avgDaysLate = delayedItems.length > 0 ? Math.round(totalDaysLate / delayedItems.length) : 0;

  return {
    totals,
    breakdown: {
      objectiveLevel: EMPTY_RISK_COUNTS, // Not applicable for KR
      krLevel: krOwnRisks,
      workItemLevel: workItemLevelRisks,
      workItemsWithHighRisk,
      krsWithHighRisk: [], // Not applicable for KR
    },
    blockedItems,
    delayedItems: delayedItems.length,
    avgDaysLate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Compute linked work summary
// ─────────────────────────────────────────────────────────────────────────────────

function computeLinkedWorkSummary(workItems: WorkItem[]): LinkedWorkSummary {
  const blocked = workItems.filter(wi => wi.status === 'blocked').length;
  const completed = workItems.filter(wi => wi.status === 'completed').length;
  const inProgress = workItems.filter(wi => 
    wi.status === 'in-progress' || wi.status === 'on-track'
  ).length;
  
  const delayedCount = workItems.filter(wi => {
    if (wi.status === 'completed') return false;
    const daysUntilDue = getDaysUntilDue(wi.releaseDate);
    return daysUntilDue !== null && daysUntilDue < 0;
  }).length;

  return {
    totalWork: workItems.length,
    blocked,
    delayed: delayedCount,
    completed,
    inProgress,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN: Compute Key Result Analytics
// ─────────────────────────────────────────────────────────────────────────────────

export function computeKeyResultAnalytics(
  keyResultId: string,
  themes: Theme[]
): KeyResultAnalyticsData | null {
  // Find the KR and its parent objective/theme
  let foundKR: KeyResult | null = null;
  let foundObjective: Objective | null = null;
  let foundTheme: Theme | null = null;

  for (const theme of themes) {
    for (const objective of theme.objectives || []) {
      const kr = objective.keyResults?.find(k => k.id === keyResultId);
      if (kr) {
        foundKR = kr;
        foundObjective = objective;
        foundTheme = theme;
        break;
      }
    }
    if (foundKR) break;
  }

  if (!foundKR || !foundObjective || !foundTheme) {
    return null;
  }

  const kr = foundKR;
  const objective = foundObjective;
  const theme = foundTheme;
  const workItems = kr.workItems || [];

  // Compute progress
  const actualProgress = Math.round(computeKeyResultProgress(kr) * 10) / 10;

  // Compute baseline (KR uses due date only)
  const baseline = computeBaselineInfo(actualProgress, undefined, kr.dueDate);

  // Work item status counts
  const workItemStatus = countWorkItemsByStatus(workItems);

  // Risk summary with breakdown
  const risks = computeKRRiskSummary(kr);

  // Linked work summary
  const linkedWork = computeLinkedWorkSummary(workItems);

  // Executive insights
  const insights = buildExecutiveInsights(baseline, risks, workItems.length, 0, 'keyResult');

  // Alignment path
  const alignment: AlignmentPath = {
    themeName: theme.name,
    themeColor: theme.color || '#c69c6d',
    objectiveName: objective.name,
    krName: kr.name,
  };

  // Log for validation
  console.log('KeyResult Analytics:', {
    id: kr.id,
    name: kr.name,
    ownRisks: kr.ownRisks,
    cascadedRisks: kr.cascadedRisks,
    computedTotals: risks.totals,
  });

  return {
    id: kr.id,
    name: kr.name,
    type: 'Key Result',
    status: kr.status,
    statusLabel: getStatusLabel(kr.status),
    baseline,
    workItemStatus,
    risks,
    linkedWork,
    insights,
    alignment,
    actual: kr.actual,
    target: kr.target,
    baselineValue: kr.baseline,
    unit: kr.unit,
  };
}
