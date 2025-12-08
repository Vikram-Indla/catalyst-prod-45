/**
 * Responsive Audit Scoring
 * Calculate scores and prioritize issues
 */

import type { 
  ResponsiveIssue, 
  ResponsiveAuditScores,
  RouteResponsiveResult,
  ComponentFamilyScores,
  ModuleScores,
  ViewportResult,
} from './responsiveTypes';
import type { ViewportId, IssueCategory, RouteCategory, ResponsiveSeverity } from './responsiveConfig';
import { responsiveViewports, issueCategories } from './responsiveConfig';

// Severity weights for scoring
const severityWeights: Record<ResponsiveSeverity, number> = {
  P0: 10,
  P1: 5,
  P2: 2,
  P3: 1,
};

// Category weights (higher = more important for responsive)
const categoryWeights: Record<IssueCategory, number> = {
  'overflow': 1.5,
  'overlap': 1.4,
  'touch-target': 1.3,
  'text-overflow': 1.0,
  'table-layout': 1.2,
  'modal-drawer': 1.3,
  'navigation': 1.4,
  'header': 1.2,
  'layout-shift': 1.1,
  'contrast': 1.0,
  'spacing': 0.8,
};

// Viewport weights (mobile more important for responsive)
const viewportWeights: Record<string, number> = {
  'mobile-s': 1.5,
  'mobile-m': 1.5,
  'mobile-l': 1.4,
  'tablet-portrait': 1.2,
  'tablet-landscape': 1.1,
  'laptop': 1.0,
  'desktop': 0.9,
  'wide-desktop': 0.8,
};

/**
 * Calculate viewport-specific score
 */
export function calculateViewportScore(
  issues: ResponsiveIssue[],
  viewportId: ViewportId
): number {
  const viewportIssues = issues.filter(i => i.viewport === viewportId);
  if (viewportIssues.length === 0) return 100;
  
  let totalPenalty = 0;
  viewportIssues.forEach(issue => {
    const severityPenalty = severityWeights[issue.severity];
    const categoryWeight = categoryWeights[issue.category];
    totalPenalty += severityPenalty * categoryWeight;
  });
  
  // Max penalty capped at 100
  const score = Math.max(0, 100 - Math.min(totalPenalty, 100));
  return Math.round(score);
}

/**
 * Calculate category-specific score
 */
export function calculateCategoryScore(
  issues: ResponsiveIssue[],
  category: IssueCategory
): number {
  const categoryIssues = issues.filter(i => i.category === category);
  if (categoryIssues.length === 0) return 100;
  
  let totalPenalty = 0;
  categoryIssues.forEach(issue => {
    const severityPenalty = severityWeights[issue.severity];
    totalPenalty += severityPenalty;
  });
  
  const score = Math.max(0, 100 - Math.min(totalPenalty * 2, 100));
  return Math.round(score);
}

/**
 * Calculate module scores
 */
export function calculateModuleScores(
  routeResults: RouteResponsiveResult[]
): ModuleScores {
  const moduleGroups: Record<RouteCategory, number[]> = {
    dashboard: [],
    admin: [],
    table: [],
    board: [],
    visualization: [],
    form: [],
    utility: [],
  };
  
  routeResults.forEach(result => {
    moduleGroups[result.category].push(result.overallScore);
  });
  
  const calculateAvg = (scores: number[]) => 
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;
  
  return {
    admin: calculateAvg(moduleGroups.admin),
    dashboard: calculateAvg(moduleGroups.dashboard),
    table: calculateAvg(moduleGroups.table),
    board: calculateAvg(moduleGroups.board),
    visualization: calculateAvg(moduleGroups.visualization),
    form: calculateAvg(moduleGroups.form),
    utility: calculateAvg(moduleGroups.utility),
  };
}

/**
 * Calculate component family scores
 */
export function calculateComponentFamilyScores(
  issues: ResponsiveIssue[]
): ComponentFamilyScores {
  const familyIssues = {
    navigation: issues.filter(i => i.category === 'navigation'),
    header: issues.filter(i => i.category === 'header'),
    tables: issues.filter(i => i.category === 'table-layout'),
    forms: issues.filter(i => ['touch-target', 'text-overflow'].includes(i.category)),
    overlays: issues.filter(i => i.category === 'modal-drawer'),
    charts: issues.filter(i => i.selector.includes('chart') || i.selector.includes('svg')),
    cards: issues.filter(i => i.selector.includes('card')),
    buttons: issues.filter(i => i.category === 'touch-target' && i.selector.includes('button')),
  };
  
  const calculateFamilyScore = (familyIssueList: ResponsiveIssue[]) => {
    if (familyIssueList.length === 0) return 100;
    let penalty = 0;
    familyIssueList.forEach(issue => {
      penalty += severityWeights[issue.severity];
    });
    return Math.max(0, Math.round(100 - Math.min(penalty * 3, 100)));
  };
  
  return {
    navigation: calculateFamilyScore(familyIssues.navigation),
    header: calculateFamilyScore(familyIssues.header),
    tables: calculateFamilyScore(familyIssues.tables),
    forms: calculateFamilyScore(familyIssues.forms),
    overlays: calculateFamilyScore(familyIssues.overlays),
    charts: calculateFamilyScore(familyIssues.charts),
    cards: calculateFamilyScore(familyIssues.cards),
    buttons: calculateFamilyScore(familyIssues.buttons),
  };
}

/**
 * Calculate global audit scores
 */
export function calculateGlobalScores(
  allIssues: ResponsiveIssue[],
  routeResults: RouteResponsiveResult[]
): ResponsiveAuditScores {
  // Count by severity
  const p0Count = allIssues.filter(i => i.severity === 'P0').length;
  const p1Count = allIssues.filter(i => i.severity === 'P1').length;
  const p2Count = allIssues.filter(i => i.severity === 'P2').length;
  const p3Count = allIssues.filter(i => i.severity === 'P3').length;
  
  // Calculate weighted global score
  let weightedSum = 0;
  let totalWeight = 0;
  
  responsiveViewports.forEach(vp => {
    const vpScore = calculateViewportScore(allIssues, vp.id);
    const weight = viewportWeights[vp.id] || 1.0;
    weightedSum += vpScore * weight;
    totalWeight += weight;
  });
  
  const globalScore = Math.round(weightedSum / totalWeight);
  
  // By viewport
  const byViewport: Record<ViewportId, number> = {} as Record<ViewportId, number>;
  responsiveViewports.forEach(vp => {
    byViewport[vp.id] = calculateViewportScore(allIssues, vp.id);
  });
  
  // By category
  const byCategory: Record<IssueCategory, number> = {} as Record<IssueCategory, number>;
  issueCategories.forEach(cat => {
    byCategory[cat] = calculateCategoryScore(allIssues, cat);
  });
  
  return {
    globalScore,
    byViewport,
    byCategory,
    byModule: calculateModuleScores(routeResults),
    byComponentFamily: calculateComponentFamilyScores(allIssues),
    p0Count,
    p1Count,
    p2Count,
    p3Count,
  };
}

/**
 * Prioritize issues for "Top 20" list
 */
export function prioritizeIssues(issues: ResponsiveIssue[]): ResponsiveIssue[] {
  return [...issues].sort((a, b) => {
    // First by severity
    const severityOrder: Record<ResponsiveSeverity, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    
    // Then by category weight
    const catWeightA = categoryWeights[a.category];
    const catWeightB = categoryWeights[b.category];
    if (catWeightA !== catWeightB) {
      return catWeightB - catWeightA; // Higher weight first
    }
    
    // Then by mobile viewport first
    const vpWeightA = viewportWeights[a.viewport] || 1;
    const vpWeightB = viewportWeights[b.viewport] || 1;
    return vpWeightB - vpWeightA;
  });
}

/**
 * Get score color based on value
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-emerald-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get score background color based on value
 */
export function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-green-50';
  if (score >= 75) return 'bg-emerald-50';
  if (score >= 60) return 'bg-yellow-50';
  if (score >= 40) return 'bg-orange-50';
  return 'bg-red-50';
}

/**
 * Get severity badge variant
 */
export function getSeverityBadgeVariant(severity: ResponsiveSeverity): 'destructive' | 'secondary' | 'outline' {
  switch (severity) {
    case 'P0': return 'destructive';
    case 'P1': return 'destructive';
    case 'P2': return 'secondary';
    case 'P3': return 'outline';
  }
}

/**
 * Calculate viewport result summary
 */
export function calculateViewportResult(
  viewportId: ViewportId,
  width: number,
  height: number,
  issues: ResponsiveIssue[]
): ViewportResult {
  const vpIssues = issues.filter(i => i.viewport === viewportId);
  
  return {
    viewport: viewportId,
    width,
    height,
    score: calculateViewportScore(issues, viewportId),
    issueCount: vpIssues.length,
    p0Count: vpIssues.filter(i => i.severity === 'P0').length,
    p1Count: vpIssues.filter(i => i.severity === 'P1').length,
    p2Count: vpIssues.filter(i => i.severity === 'P2').length,
    p3Count: vpIssues.filter(i => i.severity === 'P3').length,
    checks: [],
  };
}
