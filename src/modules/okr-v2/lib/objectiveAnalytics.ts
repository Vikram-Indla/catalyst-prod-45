// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Objective-Level Analytics
// Computes executive metrics for a single objective
// ═══════════════════════════════════════════════════════════════════════════════

import { Theme, Objective, KeyResult, WorkItem, StatusCode } from './okrTypes';
import {
  computeObjectiveProgress,
  computeProgressBaseline,
  getDaysUntilDue,
  aggregateRisks,
  clamp,
} from './okrMetrics';
import { TREND_THRESHOLDS } from './okrConfig';

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export type TrendDirection = 'ahead' | 'on-plan' | 'behind' | 'no-baseline';
export type InsightSeverity = 'high' | 'medium' | 'low';

export interface BaselineInfo {
  actual: number;
  expected: number | null;
  delta: number | null;
  trend: TrendDirection;
  daysToTarget: number | null;
}

export interface KrStatusCounts {
  total: number;
  onTrack: number;
  inProgress: number;
  atRisk: number;
  blocked: number;
  completed: number;
  pending: number;
}

export interface RiskSummary {
  high: number;
  medium: number;
  low: number;
  blockedItems: number;
  delayedItems: number;
  avgDaysLate: number;
}

export interface CoverageSummary {
  totalKRs: number;
  krsWithWork: number;
  krsWithoutWork: number;
  totalWorkItems: number;
  workByStatus: Record<string, number>;
}

export interface ExecutiveInsight {
  text: string;
  severity: InsightSeverity;
}

export interface AlignmentPath {
  themeName: string;
  themeColor: string;
  objectiveName: string;
}

export interface ObjectiveAnalyticsData {
  id: string;
  name: string;
  type: 'Objective';
  status: string;
  statusLabel: string;
  baseline: BaselineInfo;
  krStatus: KrStatusCounts;
  risks: RiskSummary;
  coverage: CoverageSummary;
  insights: ExecutiveInsight[];
  alignment: AlignmentPath;
}

// ─────────────────────────────────────────────────────────────────────────────────
// BASELINE TOLERANCE
// ─────────────────────────────────────────────────────────────────────────────────

const BASELINE_TOLERANCE = 5; // percentage points

// ─────────────────────────────────────────────────────────────────────────────────
// STATUS LABEL MAPPING
// ─────────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  'on-track': 'On Track',
  'in-progress': 'In Progress',
  'at-risk': 'At Risk',
  'off-track': 'Off Track',
  'blocked': 'Blocked',
  'pending': 'Pending',
  'completed': 'Completed',
};

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Compute baseline info
// ─────────────────────────────────────────────────────────────────────────────────

function computeBaselineInfo(
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

  // Round values to 1 decimal place
  const roundedExpected = baseline.expected !== null ? Math.round(baseline.expected * 10) / 10 : null;
  const roundedDelta = baseline.variance !== null ? Math.round(baseline.variance * 10) / 10 : null;

  return {
    actual: Math.round(actual * 10) / 10,
    expected: roundedExpected,
    delta: roundedDelta,
    trend,
    daysToTarget,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Count KRs by status
// ─────────────────────────────────────────────────────────────────────────────────

function countKrsByStatus(keyResults: KeyResult[]): KrStatusCounts {
  const counts: KrStatusCounts = {
    total: keyResults.length,
    onTrack: 0,
    inProgress: 0,
    atRisk: 0,
    blocked: 0,
    completed: 0,
    pending: 0,
  };

  for (const kr of keyResults) {
    switch (kr.status) {
      case 'on-track':
        counts.onTrack++;
        break;
      case 'in-progress':
        counts.inProgress++;
        break;
      case 'at-risk':
      case 'off-track':
        counts.atRisk++;
        break;
      case 'blocked':
        counts.blocked++;
        break;
      case 'completed':
        counts.completed++;
        break;
      default:
        counts.pending++;
    }
  }

  return counts;
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Compute risk summary
// ─────────────────────────────────────────────────────────────────────────────────

function computeRiskSummary(objective: Objective): RiskSummary {
  const keyResults = objective.keyResults || [];
  const allWorkItems = keyResults.flatMap(kr => kr.workItems || []);

  // Aggregate risks from objective + KRs + work items
  const objRisks = objective.risks || { high: 0, medium: 0, low: 0 };
  const krRisks = aggregateRisks(keyResults.map(kr => ({ risks: kr.risks || { high: 0, medium: 0, low: 0 } })));
  const wiRisks = aggregateRisks(allWorkItems.map(wi => ({ risks: wi.risks || { high: 0, medium: 0, low: 0 } })));

  // Blocked items
  const blockedItems = allWorkItems.filter(wi => wi.status === 'blocked').length;

  // Delayed items (past due and not completed)
  const delayedItems = allWorkItems.filter(wi => {
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
    high: objRisks.high + krRisks.high + wiRisks.high,
    medium: objRisks.medium + krRisks.medium + wiRisks.medium,
    low: objRisks.low + krRisks.low + wiRisks.low,
    blockedItems,
    delayedItems: delayedItems.length,
    avgDaysLate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Compute coverage summary
// ─────────────────────────────────────────────────────────────────────────────────

function computeCoverageSummary(objective: Objective): CoverageSummary {
  const keyResults = objective.keyResults || [];
  const allWorkItems = keyResults.flatMap(kr => kr.workItems || []);

  const krsWithWork = keyResults.filter(kr => (kr.workItems?.length || 0) > 0).length;
  const krsWithoutWork = keyResults.length - krsWithWork;

  // Group work items by status
  const workByStatus: Record<string, number> = {};
  for (const wi of allWorkItems) {
    const status = wi.status || 'pending';
    workByStatus[status] = (workByStatus[status] || 0) + 1;
  }

  return {
    totalKRs: keyResults.length,
    krsWithWork,
    krsWithoutWork,
    totalWorkItems: allWorkItems.length,
    workByStatus,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Build executive insights
// ─────────────────────────────────────────────────────────────────────────────────

function buildExecutiveInsights(
  baseline: BaselineInfo,
  risks: RiskSummary,
  coverage: CoverageSummary
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

  // Priority 3: High risks
  if (risks.high > 0) {
    insights.push({
      text: `There ${risks.high === 1 ? 'is' : 'are'} ${risks.high} open high-severity risk${risks.high > 1 ? 's' : ''} requiring active mitigation and periodic review.`,
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

  // Priority 5: KRs without work ("paper OKR")
  if (coverage.krsWithoutWork > 0) {
    insights.push({
      text: `${coverage.krsWithoutWork} KR${coverage.krsWithoutWork > 1 ? 's have' : ' has'} no linked delivery work; risk of 'paper OKR' with no execution plan.`,
      severity: coverage.krsWithoutWork > 1 ? 'high' : 'medium',
    });
  }

  // Priority 6: Positive outlook (if no concerns)
  if (insights.length === 0 && baseline.actual >= 50 && risks.high === 0 && risks.blockedItems === 0) {
    insights.push({
      text: 'Objective is broadly on track with low delivery risk at this stage.',
      severity: 'low',
    });
  }

  // Limit to 4 insights, sorted by severity
  const severityOrder: Record<InsightSeverity, number> = { high: 0, medium: 1, low: 2 };
  return insights
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 4);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN: Compute Objective Analytics
// ─────────────────────────────────────────────────────────────────────────────────

export function computeObjectiveAnalytics(
  objectiveId: string,
  themes: Theme[]
): ObjectiveAnalyticsData | null {
  // Find the objective and its parent theme
  let foundObjective: Objective | null = null;
  let foundTheme: Theme | null = null;

  for (const theme of themes) {
    const obj = theme.objectives?.find(o => o.id === objectiveId);
    if (obj) {
      foundObjective = obj;
      foundTheme = theme;
      break;
    }
  }

  if (!foundObjective || !foundTheme) {
    return null;
  }

  const objective = foundObjective;
  const theme = foundTheme;

  // Compute progress (rounded to 1 decimal place)
  const actualProgress = Math.round(computeObjectiveProgress(objective) * 10) / 10;

  // Compute baseline
  const baseline = computeBaselineInfo(
    actualProgress,
    objective.startDate,
    objective.dueDate
  );

  // KR status counts
  const krStatus = countKrsByStatus(objective.keyResults || []);

  // Risk summary
  const risks = computeRiskSummary(objective);

  // Coverage summary
  const coverage = computeCoverageSummary(objective);

  // Executive insights
  const insights = buildExecutiveInsights(baseline, risks, coverage);

  // Alignment path
  const alignment: AlignmentPath = {
    themeName: theme.name,
    themeColor: theme.color || '#c69c6d',
    objectiveName: objective.name,
  };

  return {
    id: objective.id,
    name: objective.name,
    type: 'Objective',
    status: objective.status,
    statusLabel: getStatusLabel(objective.status),
    baseline,
    krStatus,
    risks,
    coverage,
    insights,
    alignment,
  };
}
