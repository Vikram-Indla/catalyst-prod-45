// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Work Item (Delivery Item) Analytics
// Computes executive metrics for a single Work Item (Epic/Feature/Story)
// Uses ownRisks only (leaf node - cascadedRisks equals ownRisks)
// ═══════════════════════════════════════════════════════════════════════════════

import type { Theme, Objective, KeyResult, WorkItem } from './okrTypes';
import { getDaysUntilDue, clamp } from './okrMetrics';
import {
  BaselineInfo,
  ExecutiveInsight,
  AlignmentPath,
  TrendDirection,
  InsightSeverity,
  computeBaselineInfo,
  getStatusLabel,
  RiskCounts,
  AnalyticsRiskSummary,
  EMPTY_RISK_COUNTS,
  toRiskCounts,
} from './sharedAnalyticsTypes';

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface WorkItemAnalyticsData {
  id: string;
  name: string;
  type: 'Delivery Item';
  workItemType: string;
  status: string;
  statusLabel: string;
  baseline: BaselineInfo;
  risks: AnalyticsRiskSummary;
  insights: ExecutiveInsight[];
  alignment: AlignmentPath;
  // Work item specific
  progress: number;
  releaseDate?: string;
  daysVariance?: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Compute risk summary for Work Item (own risks only)
// ─────────────────────────────────────────────────────────────────────────────────

function computeWorkItemRiskSummary(wi: WorkItem): AnalyticsRiskSummary {
  // Work item is a leaf node - ownRisks = cascadedRisks
  const ownRisks = toRiskCounts(wi.ownRisks);

  // For work items, check if blocked or delayed
  const blockedItems = wi.status === 'blocked' ? 1 : 0;
  
  const daysUntilDue = getDaysUntilDue(wi.releaseDate);
  const isDelayed = wi.status !== 'completed' && daysUntilDue !== null && daysUntilDue < 0;
  const delayedItems = isDelayed ? 1 : 0;
  const avgDaysLate = isDelayed && daysUntilDue !== null ? Math.abs(daysUntilDue) : 0;

  return {
    totals: ownRisks,
    breakdown: {
      objectiveLevel: EMPTY_RISK_COUNTS,
      krLevel: EMPTY_RISK_COUNTS,
      workItemLevel: ownRisks,
      workItemsWithHighRisk: ownRisks.high > 0 ? [{ id: wi.id, name: wi.name, type: wi.workItemType || 'work item' }] : [],
      krsWithHighRisk: [],
    },
    blockedItems,
    delayedItems,
    avgDaysLate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Build work item executive insights
// ─────────────────────────────────────────────────────────────────────────────────

function buildWorkItemInsights(
  baseline: BaselineInfo,
  risks: AnalyticsRiskSummary,
  wi: WorkItem
): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = [];

  // Priority 1: Blocked status
  if (wi.status === 'blocked') {
    insights.push({
      text: 'This delivery item is blocked; immediate intervention required to unblock.',
      severity: 'high',
    });
  }

  // Priority 2: Behind schedule
  if (baseline.trend === 'behind' && baseline.delta !== null && Math.abs(baseline.delta) >= 10) {
    insights.push({
      text: `Progress is ${Math.abs(baseline.delta)}pp behind expected baseline.`,
      severity: 'high',
    });
  }

  // Priority 3: Overdue
  if (baseline.daysToTarget !== null && baseline.daysToTarget < 0) {
    insights.push({
      text: `Target date is ${Math.abs(baseline.daysToTarget)} days overdue; update timeline or escalate.`,
      severity: 'high',
    });
  }

  // Priority 4: High risks
  if (risks.totals.high > 0) {
    insights.push({
      text: `There ${risks.totals.high === 1 ? 'is' : 'are'} ${risks.totals.high} open high-severity risk${risks.totals.high > 1 ? 's' : ''} on this item.`,
      severity: 'high',
    });
  }

  // Priority 5: Medium risks
  if (risks.totals.medium > 0 && insights.length < 4) {
    insights.push({
      text: `${risks.totals.medium} medium-severity risk${risks.totals.medium > 1 ? 's' : ''} logged for monitoring.`,
      severity: 'medium',
    });
  }

  // Priority 6: Positive outlook
  if (insights.length === 0 && baseline.actual >= 50 && risks.totals.high === 0 && wi.status !== 'blocked') {
    insights.push({
      text: 'Delivery item is on track with low delivery risk.',
      severity: 'low',
    });
  }

  // Limit to 4 insights
  const severityOrder: Record<InsightSeverity, number> = { high: 0, medium: 1, low: 2 };
  return insights
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 4);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN: Compute Work Item Analytics
// ─────────────────────────────────────────────────────────────────────────────────

export function computeWorkItemAnalytics(
  workItemId: string,
  themes: Theme[]
): WorkItemAnalyticsData | null {
  // Find the work item and its parent KR/objective/theme
  let foundWorkItem: WorkItem | null = null;
  let foundKR: KeyResult | null = null;
  let foundObjective: Objective | null = null;
  let foundTheme: Theme | null = null;

  for (const theme of themes) {
    for (const objective of theme.objectives || []) {
      for (const kr of objective.keyResults || []) {
        const wi = kr.workItems?.find(w => w.id === workItemId);
        if (wi) {
          foundWorkItem = wi;
          foundKR = kr;
          foundObjective = objective;
          foundTheme = theme;
          break;
        }
      }
      if (foundWorkItem) break;
    }
    if (foundWorkItem) break;
  }

  if (!foundWorkItem || !foundKR || !foundObjective || !foundTheme) {
    return null;
  }

  const wi = foundWorkItem;
  const kr = foundKR;
  const objective = foundObjective;
  const theme = foundTheme;

  // Compute progress baseline
  const actualProgress = wi.progress ?? 0;
  const baseline = computeBaselineInfo(actualProgress, undefined, wi.releaseDate);

  // Risk summary (own risks only for leaf node)
  const risks = computeWorkItemRiskSummary(wi);

  // Executive insights
  const insights = buildWorkItemInsights(baseline, risks, wi);

  // Alignment path
  const alignment: AlignmentPath = {
    themeName: theme.name,
    themeColor: theme.color || '#c69c6d',
    objectiveName: objective.name,
    krName: kr.name,
  };

  // Get work item type label
  const typeLabel = wi.workItemType === 'epic' ? 'Epic' 
    : wi.workItemType === 'feature' ? 'Feature'
    : wi.workItemType === 'story' ? 'Story'
    : 'Work Item';

  // Log for validation
  console.log('WorkItem Analytics:', {
    id: wi.id,
    name: wi.name,
    ownRisks: wi.ownRisks,
    cascadedRisks: wi.cascadedRisks,
    computedTotals: risks.totals,
  });

  return {
    id: wi.id,
    name: wi.name,
    type: 'Delivery Item',
    workItemType: typeLabel,
    status: wi.status,
    statusLabel: getStatusLabel(wi.status),
    baseline,
    risks,
    insights,
    alignment,
    progress: actualProgress,
    releaseDate: wi.releaseDate,
    daysVariance: wi.daysVariance,
  };
}
