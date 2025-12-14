// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Metrics Engine
// Pure functions for all OKR calculations (no side effects, no DB access)
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Theme,
  Objective,
  KeyResult,
  WorkItem,
  OkrRiskSummary,
  StatusCode,
  RollupMetrics,
  TreeItem,
  OKRSmartFiltersV2,
} from './okrTypes';

import {
  PROGRESS_THRESHOLDS,
  RISK_SEVERITY_WEIGHTS,
  RISK_SCORE_THRESHOLDS,
  DUE_DATE_THRESHOLDS,
  VARIANCE_THRESHOLDS,
  VALUE_THRESHOLDS,
  HEALTH_FROM_PROGRESS,
  STATUS_COLORS,
  STATUS_LABELS,
  MAX_PROGRESS_CALCULATION,
  MAX_PROGRESS_DISPLAY,
  TREND_THRESHOLDS,
} from './okrConfig';

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get days between two dates
 */
export function daysBetween(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get days until a due date (negative if overdue)
 */
export function getDaysUntilDue(dateStr?: string): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format currency value (SAR)
 */
export function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M SAR`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K SAR`;
  return `${value.toLocaleString()} SAR`;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Get status color from config
 */
export function getStatusColor(status: StatusCode): string {
  return STATUS_COLORS[status] || STATUS_COLORS['pending'];
}

/**
 * Get status label from config
 */
export function getStatusLabel(status: StatusCode): string {
  return STATUS_LABELS[status] || status;
}

// ─────────────────────────────────────────────────────────────────────────────────
// RISK CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Calculate risk score from risk summary using weighted formula
 */
export function calculateRiskScore(risks: OkrRiskSummary): number {
  return (
    (risks.high || 0) * RISK_SEVERITY_WEIGHTS.high +
    (risks.medium || 0) * RISK_SEVERITY_WEIGHTS.medium +
    (risks.low || 0) * RISK_SEVERITY_WEIGHTS.low
  );
}

/**
 * Get total risk count from summary
 */
export function getTotalRiskCount(risks: OkrRiskSummary): number {
  return (risks.high || 0) + (risks.medium || 0) + (risks.low || 0);
}

/**
 * Aggregate risk summaries from child items
 */
export function aggregateRisks(items: Array<{ risks: OkrRiskSummary }>): OkrRiskSummary {
  return items.reduce(
    (acc, item) => ({
      high: acc.high + (item.risks?.high || 0),
      medium: acc.medium + (item.risks?.medium || 0),
      low: acc.low + (item.risks?.low || 0),
    }),
    { high: 0, medium: 0, low: 0 }
  );
}

/**
 * Get risk UI variant based on score
 */
export function getRiskVariant(riskScore: number): 'default' | 'warning' | 'danger' | 'success' {
  if (riskScore >= RISK_SCORE_THRESHOLDS.DANGER) return 'danger';
  if (riskScore >= RISK_SCORE_THRESHOLDS.WARNING) return 'warning';
  if (riskScore > 0) return 'default';
  return 'success';
}

// ─────────────────────────────────────────────────────────────────────────────────
// PROGRESS CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Calculate Key Result progress from actual vs target
 * Supports increase, decrease, and maintain directions
 */
export function computeKeyResultProgress(kr: KeyResult): number {
  // If explicit progress is set and no actual/target, use it
  if (kr.actual === undefined || kr.target === undefined) {
    return clamp(kr.progress || 0, 0, MAX_PROGRESS_DISPLAY);
  }

  const baseline = kr.baseline ?? 0;
  const actual = kr.actual;
  const target = kr.target;
  const direction = kr.direction || 'increase';

  // Handle edge cases
  if (direction === 'increase') {
    if (target <= baseline) return 0;
    const progress = ((actual - baseline) / (target - baseline)) * 100;
    return clamp(progress, 0, MAX_PROGRESS_CALCULATION);
  } else if (direction === 'decrease') {
    if (target >= baseline) return 0;
    const progress = ((baseline - actual) / (baseline - target)) * 100;
    return clamp(progress, 0, MAX_PROGRESS_CALCULATION);
  } else {
    // maintain: 100% if current equals baseline, else diminish based on deviation
    const range = Math.max(1, Math.abs(target - baseline));
    const deviation = Math.abs(actual - baseline);
    const progress = Math.max(0, 100 - (deviation / range) * 100);
    return clamp(progress, 0, MAX_PROGRESS_DISPLAY);
  }
}

/**
 * Calculate Objective progress from weighted KR progress
 * Normalizes weights to sum to 1
 */
export function computeObjectiveProgress(objective: Objective): number {
  const krs = objective.keyResults || [];
  if (krs.length === 0) return 0;

  // Calculate total weight
  const totalWeight = krs.reduce((sum, kr) => sum + (kr.weight || 1), 0);
  if (totalWeight === 0) return 0;

  // Calculate weighted progress
  const weightedProgress = krs.reduce((sum, kr) => {
    const normalizedWeight = (kr.weight || 1) / totalWeight;
    const krProgress = computeKeyResultProgress(kr);
    return sum + normalizedWeight * krProgress;
  }, 0);

  return Math.round(clamp(weightedProgress, 0, MAX_PROGRESS_DISPLAY));
}

/**
 * Calculate Theme progress from weighted Objective progress
 * Weight by value if available, otherwise equal weight
 */
export function computeThemeProgress(theme: Theme): number {
  const objectives = theme.objectives || [];
  if (objectives.length === 0) return 0;

  // Use value-weighted if available, else use sum of KR weights, else equal
  const weights = objectives.map(obj => {
    if (obj.value?.estimated > 0) return obj.value.estimated;
    const krWeightSum = (obj.keyResults || []).reduce((sum, kr) => sum + (kr.weight || 1), 0);
    return krWeightSum > 0 ? krWeightSum : 1;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return 0;

  const weightedProgress = objectives.reduce((sum, obj, idx) => {
    const normalizedWeight = weights[idx] / totalWeight;
    const objProgress = computeObjectiveProgress(obj);
    return sum + normalizedWeight * objProgress;
  }, 0);

  return Math.round(clamp(weightedProgress, 0, MAX_PROGRESS_DISPLAY));
}

// ─────────────────────────────────────────────────────────────────────────────────
// BASELINE PROGRESS & TREND CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────────

import type { ProgressBaseline, TrendCode } from './okrTypes';

/**
 * Calculate expected (baseline) progress and trend for an item with start/due dates
 */
export function computeProgressBaseline(
  actual: number,
  startDate?: string,
  dueDate?: string
): ProgressBaseline {
  const today = new Date().toISOString().split('T')[0];
  
  // If no dates, cannot compute expected
  if (!startDate || !dueDate) {
    return {
      actual,
      expected: null,
      variance: null,
      trend: 'none',
    };
  }
  
  const totalDays = daysBetween(startDate, dueDate);
  if (totalDays <= 0) {
    return {
      actual,
      expected: null,
      variance: null,
      trend: 'none',
    };
  }
  
  const elapsedDays = clamp(daysBetween(startDate, today), 0, totalDays);
  const expected = (elapsedDays / totalDays) * 100;
  const variance = actual - expected;
  
  let trend: TrendCode = 'on-plan';
  if (variance >= TREND_THRESHOLDS.AHEAD_PP) {
    trend = 'ahead';
  } else if (variance <= TREND_THRESHOLDS.BEHIND_PP) {
    trend = 'behind';
  }
  
  return {
    actual,
    expected: Math.round(expected),
    variance: Math.round(variance),
    trend,
  };
}

/**
 * Get progress baseline for an Objective
 */
export function getObjectiveProgressBaseline(objective: Objective): ProgressBaseline {
  const actualProgress = computeObjectiveProgress(objective);
  return computeProgressBaseline(actualProgress, objective.startDate, objective.dueDate);
}

/**
 * Get progress baseline for a Key Result
 */
export function getKeyResultProgressBaseline(kr: KeyResult): ProgressBaseline {
  const actualProgress = computeKeyResultProgress(kr);
  // KR uses dueDate only - startDate comes from parent objective
  return computeProgressBaseline(actualProgress, undefined, kr.dueDate);
}

// ─────────────────────────────────────────────────────────────────────────────────
// STATUS DERIVATION
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Derive status from progress and risk (RAG + blockers)
 * Follows Big-5 portfolio management practice
 */
export function deriveStatus(
  progress: number,
  risks: OkrRiskSummary,
  dueDate?: string,
  isBlocked?: boolean,
  daysVariance?: number
): StatusCode {
  // Check for explicit blocked status
  if (isBlocked) return 'blocked';

  // Check for variance-based blocking (work items)
  if (daysVariance !== undefined && daysVariance > VARIANCE_THRESHOLDS.BLOCKED) {
    return 'blocked';
  }

  // Completed check
  if (progress >= 100) return 'completed';

  // Risk-based overrides
  const hasHighRisk = (risks.high || 0) > 0;

  // Progress + risk rules
  if (progress < PROGRESS_THRESHOLDS.AT_RISK && hasHighRisk) {
    return 'off-track';
  }

  if (hasHighRisk) {
    return 'at-risk';
  }

  // Due date urgency
  const daysToDue = getDaysUntilDue(dueDate);
  if (daysToDue !== null && daysToDue < 0) {
    // Overdue
    return progress < PROGRESS_THRESHOLDS.IN_PROGRESS ? 'off-track' : 'at-risk';
  }

  // Progress-based status
  if (progress >= PROGRESS_THRESHOLDS.ON_TRACK) {
    return 'on-track';
  }
  if (progress >= PROGRESS_THRESHOLDS.IN_PROGRESS) {
    return 'in-progress';
  }
  if (progress >= PROGRESS_THRESHOLDS.AT_RISK) {
    return (risks.medium || 0) > 0 ? 'at-risk' : 'pending';
  }

  return 'pending';
}

/**
 * Derive status for a Key Result considering its work items
 */
export function deriveKeyResultStatus(kr: KeyResult): StatusCode {
  // Check if any work item is blocked
  const hasBlockedWork = kr.workItems?.some(
    wi => wi.status === 'blocked' || (wi.daysVariance && wi.daysVariance > VARIANCE_THRESHOLDS.BLOCKED)
  );

  const daysToDue = getDaysUntilDue(kr.dueDate);
  if (hasBlockedWork && daysToDue !== null && daysToDue < DUE_DATE_THRESHOLDS.WARNING) {
    return 'off-track';
  }

  const progress = computeKeyResultProgress(kr);
  return deriveStatus(progress, kr.risks, kr.dueDate, hasBlockedWork);
}

/**
 * Derive status for an Objective
 */
export function deriveObjectiveStatus(objective: Objective): StatusCode {
  // Check if any KR is off-track or blocked
  const hasOffTrackKR = objective.keyResults?.some(
    kr => kr.status === 'off-track' || kr.status === 'blocked'
  );

  const progress = computeObjectiveProgress(objective);
  const aggregatedRisks = aggregateRisks(objective.keyResults || []);

  if (hasOffTrackKR) {
    return 'at-risk';
  }

  return deriveStatus(progress, aggregatedRisks, objective.dueDate);
}

/**
 * Derive status for a Theme
 */
export function deriveThemeStatus(theme: Theme): StatusCode {
  // Check if any objective is off-track or blocked
  const hasOffTrackObjective = theme.objectives?.some(
    obj => obj.status === 'off-track' || obj.status === 'blocked'
  );

  const progress = computeThemeProgress(theme);
  const aggregatedRisks = aggregateRisks(theme.objectives || []);

  if (hasOffTrackObjective) {
    return 'at-risk';
  }

  return deriveStatus(progress, aggregatedRisks);
}

// ─────────────────────────────────────────────────────────────────────────────────
// VALUE CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Calculate value realization percentage
 */
export function calculateValueRealization(estimated: number, realized: number): number {
  if (estimated <= 0) return 0;
  return Math.round((realized / estimated) * 100);
}

/**
 * Calculate remaining potential value
 */
export function calculateRemainingValue(estimated: number, realized: number): number {
  return Math.max(0, estimated - realized);
}

/**
 * Aggregate value from child items
 */
export function aggregateValue(items: Array<{ value?: { estimated: number; realized: number } }>): {
  estimated: number;
  realized: number;
} {
  return items.reduce(
    (acc, item) => ({
      estimated: acc.estimated + (item.value?.estimated || 0),
      realized: acc.realized + (item.value?.realized || 0),
    }),
    { estimated: 0, realized: 0 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROLLUP METRICS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get rollup metrics for a Theme
 */
export function getThemeRollupMetrics(theme: Theme): RollupMetrics {
  const objectives = theme.objectives || [];
  const allKRs = objectives.flatMap(o => o.keyResults || []);
  const allWorkItems = allKRs.flatMap(kr => kr.workItems || []);

  const objectivesByStatus = objectives.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<StatusCode, number>);

  const krsByStatus = allKRs.reduce((acc, kr) => {
    acc[kr.status] = (acc[kr.status] || 0) + 1;
    return acc;
  }, {} as Record<StatusCode, number>);

  const krsWithoutWork = allKRs.filter(kr => !kr.workItems || kr.workItems.length === 0).length;
  const aggregatedValue = aggregateValue(objectives);

  return {
    objectiveCount: objectives.length,
    krCount: allKRs.length,
    workItemCount: allWorkItems.length,
    objectivesByStatus,
    krsByStatus,
    krsWithoutWork,
    totalRiskScore: calculateRiskScore(aggregateRisks(objectives)),
    valueRealizationPct: calculateValueRealization(aggregatedValue.estimated, aggregatedValue.realized),
    totalEstimatedValue: aggregatedValue.estimated,
    totalRealizedValue: aggregatedValue.realized,
  };
}

/**
 * Get rollup metrics for an Objective
 */
export function getObjectiveRollupMetrics(objective: Objective): Partial<RollupMetrics> {
  const krs = objective.keyResults || [];
  const allWorkItems = krs.flatMap(kr => kr.workItems || []);

  const krsByStatus = krs.reduce((acc, kr) => {
    acc[kr.status] = (acc[kr.status] || 0) + 1;
    return acc;
  }, {} as Record<StatusCode, number>);

  const krsWithoutWork = krs.filter(kr => !kr.workItems || kr.workItems.length === 0).length;

  return {
    krCount: krs.length,
    workItemCount: allWorkItems.length,
    krsByStatus,
    krsWithoutWork,
    totalRiskScore: calculateRiskScore(aggregateRisks(krs)),
    valueRealizationPct: calculateValueRealization(
      objective.value?.estimated || 0,
      objective.value?.realized || 0
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// SMART FILTERS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Filter themes based on smart filter criteria
 */
export function filterThemes(themes: Theme[], filters: OKRSmartFiltersV2): Theme[] {
  if (!filters || Object.keys(filters).length === 0) return themes;

  return themes.filter(theme => {
    // Theme ID filter
    if (filters.selectedThemeIds && filters.selectedThemeIds.length > 0) {
      if (!filters.selectedThemeIds.includes(theme.id)) return false;
    }

    // Status filter
    if (filters.statuses && filters.statuses.length > 0) {
      if (!filters.statuses.includes(theme.status)) return false;
    }

    // Risk filters
    if (filters.hasHighRisk && theme.risks.high === 0) return false;
    if (filters.noRisks && getTotalRiskCount(theme.risks) > 0) return false;

    // Progress filters
    if (filters.progressMin !== undefined && theme.progress < filters.progressMin) return false;
    if (filters.progressMax !== undefined && theme.progress > filters.progressMax) return false;

    // Value realization filter
    if (filters.lowValueRealization) {
      const realization = calculateValueRealization(
        theme.value?.estimated || 0,
        theme.value?.realized || 0
      );
      if (realization >= VALUE_THRESHOLDS.LOW_REALIZATION) return false;
    }

    return true;
  });
}

/**
 * Filter any item with a name (for search)
 */
export function matchesSearch(item: { name: string }, query: string): boolean {
  if (!query) return true;
  const lowerQuery = query.toLowerCase();
  return item.name.toLowerCase().includes(lowerQuery);
}

/**
 * Check if theme or any of its children match search
 */
export function themeMatchesSearch(theme: Theme, query: string): boolean {
  if (!query) return true;
  if (matchesSearch(theme, query)) return true;

  return theme.objectives?.some(obj => {
    if (matchesSearch(obj, query)) return true;
    return obj.keyResults?.some(kr => {
      if (matchesSearch(kr, query)) return true;
      return kr.workItems?.some(wi => matchesSearch(wi, query));
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────────
// INSIGHT PRESETS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get high-risk themes (riskScore >= threshold)
 */
export function getHighRiskThemes(themes: Theme[], threshold = RISK_SCORE_THRESHOLDS.DANGER): Theme[] {
  return themes.filter(theme => calculateRiskScore(theme.risks) >= threshold);
}

/**
 * Get unimplemented KRs (KRs with zero work items)
 */
export function getUnimplementedKRs(themes: Theme[]): KeyResult[] {
  return themes.flatMap(theme =>
    theme.objectives.flatMap(obj =>
      obj.keyResults.filter(kr => !kr.workItems || kr.workItems.length === 0)
    )
  );
}

/**
 * Get items due within N days
 */
export function getItemsDueWithinDays(themes: Theme[], days: number): Array<KeyResult | WorkItem> {
  const items: Array<KeyResult | WorkItem> = [];

  themes.forEach(theme => {
    theme.objectives.forEach(obj => {
      obj.keyResults.forEach(kr => {
        const daysToDue = getDaysUntilDue(kr.dueDate);
        if (daysToDue !== null && daysToDue > 0 && daysToDue <= days) {
          items.push(kr);
        }
        kr.workItems?.forEach(wi => {
          const wiDays = getDaysUntilDue(wi.releaseDate);
          if (wiDays !== null && wiDays > 0 && wiDays <= days) {
            items.push(wi);
          }
        });
      });
    });
  });

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXPORT HELPERS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExportRow {
  themeId: string;
  themeName: string;
  objectiveId?: string;
  objectiveName?: string;
  krId?: string;
  krName?: string;
  workItemId?: string;
  workItemName?: string;
  type: string;
  status: string;
  progress: number;
  riskScore: number;
  valueRealizationPct: number | null;
}

/**
 * Flatten themes into export rows
 */
export function flattenForExport(themes: Theme[]): ExportRow[] {
  const rows: ExportRow[] = [];

  themes.forEach(theme => {
    // Theme row
    rows.push({
      themeId: theme.id,
      themeName: theme.name,
      type: 'Theme',
      status: theme.status,
      progress: theme.progress,
      riskScore: calculateRiskScore(theme.risks),
      valueRealizationPct: calculateValueRealization(
        theme.value?.estimated || 0,
        theme.value?.realized || 0
      ),
    });

    theme.objectives?.forEach(obj => {
      // Objective row
      rows.push({
        themeId: theme.id,
        themeName: theme.name,
        objectiveId: obj.id,
        objectiveName: obj.name,
        type: 'Objective',
        status: obj.status,
        progress: obj.progress,
        riskScore: calculateRiskScore(obj.risks),
        valueRealizationPct: calculateValueRealization(
          obj.value?.estimated || 0,
          obj.value?.realized || 0
        ),
      });

      obj.keyResults?.forEach(kr => {
        // KR row
        rows.push({
          themeId: theme.id,
          themeName: theme.name,
          objectiveId: obj.id,
          objectiveName: obj.name,
          krId: kr.id,
          krName: kr.name,
          type: 'Key Result',
          status: kr.status,
          progress: kr.progress,
          riskScore: calculateRiskScore(kr.risks),
          valueRealizationPct: calculateValueRealization(
            kr.value?.estimated || 0,
            kr.value?.realized || 0
          ),
        });

        kr.workItems?.forEach(wi => {
          // Work item row
          rows.push({
            themeId: theme.id,
            themeName: theme.name,
            objectiveId: obj.id,
            objectiveName: obj.name,
            krId: kr.id,
            krName: kr.name,
            workItemId: wi.id,
            workItemName: wi.name,
            type: 'Work Item',
            status: wi.status,
            progress: wi.progress,
            riskScore: calculateRiskScore(wi.risks),
            valueRealizationPct: calculateValueRealization(
              wi.value?.estimated || 0,
              wi.value?.realized || 0
            ),
          });
        });
      });
    });
  });

  return rows;
}

/**
 * Convert export rows to CSV string
 */
export function exportToCsv(rows: ExportRow[]): string {
  const headers = [
    'Theme ID',
    'Theme Name',
    'Objective ID',
    'Objective Name',
    'KR ID',
    'KR Name',
    'Work Item ID',
    'Work Item Name',
    'Type',
    'Status',
    'Progress (%)',
    'Risk Score',
    'Value Realization (%)',
  ];

  const csvRows = [
    headers.join(','),
    ...rows.map(row =>
      [
        row.themeId,
        `"${row.themeName}"`,
        row.objectiveId || '',
        row.objectiveName ? `"${row.objectiveName}"` : '',
        row.krId || '',
        row.krName ? `"${row.krName}"` : '',
        row.workItemId || '',
        row.workItemName ? `"${row.workItemName}"` : '',
        row.type,
        row.status,
        row.progress,
        row.riskScore,
        row.valueRealizationPct !== null ? row.valueRealizationPct : 'N/A',
      ].join(',')
    ),
  ];

  return csvRows.join('\n');
}

/**
 * Export themes to CSV file and trigger download
 */
export function exportOkrViewToCsv(themes: Theme[], filename: string = 'okr-export'): void {
  const rows = flattenForExport(themes);
  const csv = exportToCsv(rows);
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
