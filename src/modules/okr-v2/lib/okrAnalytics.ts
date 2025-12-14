// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Analytics Engine
// Pure functions for computing aggregated analytics metrics
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Theme,
  Objective,
  KeyResult,
  WorkItem,
  OkrRiskSummary,
  StatusCode,
} from './okrTypes';

import {
  computeProgressBaseline,
  computeObjectiveProgress,
  computeThemeProgress,
  aggregateRisks,
  getDaysUntilDue,
  clamp,
} from './okrMetrics';

import { TREND_THRESHOLDS } from './okrConfig';

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export type TrendDirection = 'ahead' | 'on-plan' | 'behind' | 'no-baseline';
export type FocusSeverity = 'high' | 'medium' | 'low';

export interface BaselineInfo {
  actual: number;
  expected: number | null;
  delta: number | null;
  trend: TrendDirection;
}

export interface PerformanceMetrics {
  actualProgress: number;
  expectedProgress: number | null;
  progressTrend: TrendDirection;
  progressDelta: string;
  objectivesAhead: number;
  objectivesOnPlan: number;
  objectivesBehind: number;
  objectivesNoBaseline: number;
  krDistribution: { low: number; mid: number; high: number };
  coverageGaps: {
    objectivesNoKRs: number;
    krsNoWork: number;
    orphanWork: number;
  };
}

export interface ThemeAnalyticsRow {
  id: string;
  name: string;
  color: string;
  progress: number;
  baseline: number | null;
  trend: 'up' | 'down' | 'flat';
  highRisks: number;
  totalKRs: number;
  krCount: number;
  workCount: number;
  gaps: number;
  isBehind: boolean;
}

export interface RiskMetrics {
  highRiskObjectives: number;
  highRiskKRs: number;
  highRiskWork: number;
  delayedWork: number;
  avgDaysLate: number;
  objectivesBehind: number;
  krsNoWork: number;
  blockedWork: number;
  criticalDeps: number;
}

export interface FocusArea {
  text: string;
  severity: FocusSeverity;
}

export interface OkrAnalyticsResult {
  performance: PerformanceMetrics;
  themes: ThemeAnalyticsRow[];
  risks: RiskMetrics;
  focusAreas: FocusArea[];
}

export interface OkrAnalyticsInput {
  themes: Theme[];
  themeFilterIds?: string[];
  now: Date;
}

// ─────────────────────────────────────────────────────────────────────────────────
// BASELINE TOLERANCE
// ─────────────────────────────────────────────────────────────────────────────────

const BASELINE_TOLERANCE = 5; // percentage points

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Compute baseline info for an item
// ─────────────────────────────────────────────────────────────────────────────────

function computeBaselineInfo(
  actual: number,
  startDate?: string,
  dueDate?: string
): BaselineInfo {
  const baseline = computeProgressBaseline(actual, startDate, dueDate);
  
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

  return {
    actual,
    expected: baseline.expected,
    delta: baseline.variance,
    trend,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Check if work item is high risk
// ─────────────────────────────────────────────────────────────────────────────────

function isWorkItemHighRisk(wi: WorkItem): boolean {
  // High/critical risks
  if ((wi.risks?.high || 0) > 0) return true;
  // Blocked status
  if (wi.status === 'blocked') return true;
  // Schedule variance > 14 days
  if (wi.daysVariance !== undefined && wi.daysVariance > 14) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Check if KR is high risk (cascading from work items)
// ─────────────────────────────────────────────────────────────────────────────────

function isKRHighRisk(kr: KeyResult): boolean {
  // Direct high risks
  if ((kr.risks?.high || 0) > 0) return true;
  // Any work item is high risk
  return (kr.workItems || []).some(isWorkItemHighRisk);
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Check if Objective is high risk (cascading from KRs)
// ─────────────────────────────────────────────────────────────────────────────────

function isObjectiveHighRisk(obj: Objective): boolean {
  // Direct high risks
  if ((obj.risks?.high || 0) > 0) return true;
  // Any KR is high risk
  return (obj.keyResults || []).some(isKRHighRisk);
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER: Count high risks cascaded from a theme
// ─────────────────────────────────────────────────────────────────────────────────

function countThemeHighRisks(theme: Theme): number {
  let count = 0;
  for (const obj of theme.objectives || []) {
    for (const kr of obj.keyResults || []) {
      if (isKRHighRisk(kr)) count++;
    }
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN: Compute all OKR analytics
// ─────────────────────────────────────────────────────────────────────────────────

export function computeOkrAnalytics(input: OkrAnalyticsInput): OkrAnalyticsResult {
  const { themes: allThemes, themeFilterIds, now } = input;
  
  // Filter themes if needed
  const themes = themeFilterIds && themeFilterIds.length > 0
    ? allThemes.filter(t => themeFilterIds.includes(t.id))
    : allThemes;

  // Flatten all items
  const allObjectives = themes.flatMap(t => t.objectives || []);
  const allKRs = allObjectives.flatMap(o => o.keyResults || []);
  const allWorkItems = allKRs.flatMap(kr => kr.workItems || []);

  // ─────────────────────────────────────────────────────────────────────────────
  // PERFORMANCE METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  // Objective health counts based on baseline
  const objectiveBaselines = allObjectives.map(obj => ({
    obj,
    baseline: computeBaselineInfo(
      computeObjectiveProgress(obj),
      obj.startDate,
      obj.dueDate
    ),
  }));

  const objectivesAhead = objectiveBaselines.filter(o => o.baseline.trend === 'ahead').length;
  const objectivesOnPlan = objectiveBaselines.filter(o => o.baseline.trend === 'on-plan').length;
  const objectivesBehind = objectiveBaselines.filter(o => o.baseline.trend === 'behind').length;
  const objectivesNoBaseline = objectiveBaselines.filter(o => o.baseline.trend === 'no-baseline').length;

  // Aggregate progress (weighted by KR count)
  let totalKRWeight = 0;
  let weightedProgress = 0;
  let weightedExpected = 0;
  let expectedCount = 0;

  objectiveBaselines.forEach(({ obj, baseline }) => {
    const krCount = obj.keyResults?.length || 1;
    totalKRWeight += krCount;
    weightedProgress += baseline.actual * krCount;
    if (baseline.expected !== null) {
      weightedExpected += baseline.expected * krCount;
      expectedCount += krCount;
    }
  });

  const actualProgress = totalKRWeight > 0 ? Math.round(weightedProgress / totalKRWeight) : 0;
  const expectedProgress = expectedCount > 0 ? Math.round(weightedExpected / expectedCount) : null;
  
  // Overall trend
  let progressTrend: TrendDirection = 'no-baseline';
  let progressDelta = 'No baseline';
  if (expectedProgress !== null) {
    const delta = actualProgress - expectedProgress;
    if (delta >= BASELINE_TOLERANCE) {
      progressTrend = 'ahead';
      progressDelta = `Ahead by ${Math.abs(delta)}pp`;
    } else if (delta <= -BASELINE_TOLERANCE) {
      progressTrend = 'behind';
      progressDelta = `Behind by ${Math.abs(delta)}pp`;
    } else {
      progressTrend = 'on-plan';
      progressDelta = 'On plan';
    }
  }

  // KR progress distribution
  const krProgressCounts = { low: 0, mid: 0, high: 0 };
  allKRs.forEach(kr => {
    const progress = kr.progress || 0;
    if (progress < 30) krProgressCounts.low++;
    else if (progress <= 70) krProgressCounts.mid++;
    else krProgressCounts.high++;
  });
  
  const totalKRs = allKRs.length || 1;
  const krDistribution = {
    low: Math.round((krProgressCounts.low / totalKRs) * 100),
    mid: Math.round((krProgressCounts.mid / totalKRs) * 100),
    high: Math.round((krProgressCounts.high / totalKRs) * 100),
  };

  // Coverage gaps
  const objectivesNoKRs = allObjectives.filter(o => !o.keyResults || o.keyResults.length === 0).length;
  const krsNoWork = allKRs.filter(kr => !kr.workItems || kr.workItems.length === 0).length;
  // For orphan work, we'd need to compare with a full work item list - assume 0 for now
  const orphanWork = 0;

  const performance: PerformanceMetrics = {
    actualProgress,
    expectedProgress,
    progressTrend,
    progressDelta,
    objectivesAhead,
    objectivesOnPlan,
    objectivesBehind,
    objectivesNoBaseline,
    krDistribution,
    coverageGaps: {
      objectivesNoKRs,
      krsNoWork,
      orphanWork,
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // THEME ANALYTICS ROWS
  // ─────────────────────────────────────────────────────────────────────────────

  const themeRows: ThemeAnalyticsRow[] = themes.map(theme => {
    const themeObjs = theme.objectives || [];
    const themeKRs = themeObjs.flatMap(o => o.keyResults || []);
    const themeWork = themeKRs.flatMap(kr => kr.workItems || []);

    const progress = computeThemeProgress(theme);
    
    // Calculate theme baseline from objective baselines
    let themeExpectedSum = 0;
    let themeExpectedCount = 0;
    themeObjs.forEach(obj => {
      const baseline = computeBaselineInfo(
        computeObjectiveProgress(obj),
        obj.startDate,
        obj.dueDate
      );
      if (baseline.expected !== null) {
        themeExpectedSum += baseline.expected;
        themeExpectedCount++;
      }
    });
    
    const baseline = themeExpectedCount > 0 
      ? Math.round(themeExpectedSum / themeExpectedCount) 
      : null;

    // Trend
    let trend: 'up' | 'down' | 'flat' = 'flat';
    if (baseline !== null) {
      if (progress > baseline + BASELINE_TOLERANCE) trend = 'up';
      else if (progress < baseline - BASELINE_TOLERANCE) trend = 'down';
    }

    const highRisks = countThemeHighRisks(theme);
    const krsWithNoWork = themeKRs.filter(kr => !kr.workItems || kr.workItems.length === 0).length;

    return {
      id: theme.id,
      name: theme.name,
      color: theme.color || '#c69c6d',
      progress,
      baseline,
      trend,
      highRisks,
      totalKRs: themeKRs.length,
      krCount: themeKRs.length,
      workCount: themeWork.length,
      gaps: krsWithNoWork,
      isBehind: trend === 'down',
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RISK METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  const highRiskObjectives = allObjectives.filter(isObjectiveHighRisk).length;
  const highRiskKRs = allKRs.filter(isKRHighRisk).length;
  const highRiskWork = allWorkItems.filter(isWorkItemHighRisk).length;

  // Delayed work items (due date passed and not completed)
  const delayedWorkItems = allWorkItems.filter(wi => {
    if (wi.status === 'completed') return false;
    const daysUntilDue = getDaysUntilDue(wi.releaseDate);
    return daysUntilDue !== null && daysUntilDue < 0;
  });
  
  const delayedWork = delayedWorkItems.length;
  const totalDaysLate = delayedWorkItems.reduce((sum, wi) => {
    const days = getDaysUntilDue(wi.releaseDate);
    return sum + (days !== null ? Math.abs(days) : 0);
  }, 0);
  const avgDaysLate = delayedWork > 0 ? Math.round(totalDaysLate / delayedWork) : 0;

  const blockedWork = allWorkItems.filter(wi => wi.status === 'blocked').length;

  // Themes with critical dependencies (any theme with high-risk items)
  const criticalDeps = themes.filter(t => countThemeHighRisks(t) > 0).length;

  const risks: RiskMetrics = {
    highRiskObjectives,
    highRiskKRs,
    highRiskWork,
    delayedWork,
    avgDaysLate,
    objectivesBehind,
    krsNoWork,
    blockedWork,
    criticalDeps,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // FOCUS AREAS (auto-generated)
  // ─────────────────────────────────────────────────────────────────────────────

  const focusAreas: FocusArea[] = [];

  // Theme behind baseline
  const behindThemes = themeRows.filter(t => t.isBehind && t.baseline !== null);
  if (behindThemes.length > 0) {
    const worst = behindThemes.sort((a, b) => (a.progress - (a.baseline || 0)) - (b.progress - (b.baseline || 0)))[0];
    const delta = (worst.baseline || 0) - worst.progress;
    focusAreas.push({
      text: `${worst.name} is trending ${delta}pp behind baseline; ${worst.highRisks} high-risk KRs.`,
      severity: 'high',
    });
  }

  // Objectives with no KRs
  if (objectivesNoKRs > 0) {
    focusAreas.push({
      text: `${objectivesNoKRs} objective${objectivesNoKRs > 1 ? 's' : ''} have no KRs defined (execution structure incomplete).`,
      severity: 'high',
    });
  }

  // Highest risk density theme
  const highestRiskTheme = themeRows.filter(t => t.highRisks > 0).sort((a, b) => b.highRisks - a.highRisks)[0];
  if (highestRiskTheme && highestRiskTheme.highRisks > 2) {
    focusAreas.push({
      text: `${highestRiskTheme.name} has the highest high-risk density (${highestRiskTheme.highRisks} high-risk KRs).`,
      severity: 'high',
    });
  }

  // Delayed work items
  if (delayedWork > 0 && avgDaysLate > 7) {
    const impactedKRCount = allKRs.filter(kr => 
      (kr.workItems || []).some(wi => {
        const days = getDaysUntilDue(wi.releaseDate);
        return days !== null && days < 0;
      })
    ).length;
    focusAreas.push({
      text: `${delayedWork} work item${delayedWork > 1 ? 's are' : ' is'} > ${avgDaysLate} days late, impacting ${impactedKRCount} KRs.`,
      severity: 'medium',
    });
  }

  // KRs with no work
  if (krsNoWork > 0) {
    focusAreas.push({
      text: `${krsNoWork} KR${krsNoWork > 1 ? 's' : ''} have no linked delivery work ("paper OKRs").`,
      severity: 'medium',
    });
  }

  // High-risk KR percentage
  const highRiskPct = totalKRs > 0 ? (highRiskKRs / totalKRs) * 100 : 0;
  if (highRiskPct > 20) {
    focusAreas.push({
      text: `High-risk KRs represent ${Math.round(highRiskPct)}% of all KRs — review mitigation plans.`,
      severity: 'high',
    });
  }

  // Sort by severity and limit to 5
  const severityOrder: Record<FocusSeverity, number> = { high: 0, medium: 1, low: 2 };
  focusAreas.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    performance,
    themes: themeRows,
    risks,
    focusAreas: focusAreas.slice(0, 5),
  };
}
