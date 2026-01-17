/**
 * Requirement Traceability Matrix Types
 * Catalyst Platform | TRUE 9.8 Build
 */

// ═══════════════════════════════════════════════════
// ENUMS & TYPES
// ═══════════════════════════════════════════════════
export type RequirementType = 'epic' | 'feature' | 'story' | 'requirement';
export type CoverageStatus = 'covered' | 'partial' | 'gap';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TestExecutionStatus = 'passed' | 'failed' | 'blocked' | 'not_run';
export type TrendDirection = 'up' | 'down' | 'stable';
export type ViewMode = 'matrix' | 'list' | 'tree';

// ═══════════════════════════════════════════════════
// TREND INFO
// ═══════════════════════════════════════════════════
export interface TrendInfo {
  direction: TrendDirection;
  value: number;
  percentage?: number;
}

// ═══════════════════════════════════════════════════
// COVERAGE METRICS
// ═══════════════════════════════════════════════════
export interface CoverageMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  blockedTests: number;
  notRunTests: number;
  coveragePercentage: number;
  passRate: number;
  childrenTotal: number;
  childrenCovered: number;
  childrenPartial: number;
  childrenGaps: number;
  aggregateCoverage: number;
  trend: TrendDirection;
  trendValue: number;
}

// ═══════════════════════════════════════════════════
// TEST LINK
// ═══════════════════════════════════════════════════
export interface TestLink {
  testCaseId: string;
  testCaseKey: string;
  testCaseTitle: string;
  lastExecutionId: string | null;
  lastExecutionStatus: TestExecutionStatus | null;
  lastExecutedAt: string | null;
  lastExecutionDuration: number | null;
  linkedAt: string;
  linkedBy: string;
}

// ═══════════════════════════════════════════════════
// REQUIREMENT ITEM
// ═══════════════════════════════════════════════════
export interface RequirementItem {
  id: string;
  key: string;
  type: RequirementType;
  title: string;
  description: string;
  parentId: string | null;
  parentKey: string | null;
  level: number;
  path: string[];
  hasChildren: boolean;
  childCount: number;
  priority: Priority;
  status: 'draft' | 'approved' | 'implemented' | 'deprecated';
  releaseId: string;
  releaseName: string;
  coverage: CoverageMetrics;
  coverageStatus: CoverageStatus;
  linkedTestIds: string[];
  linkedDefectIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  externalId: string | null;
  externalUrl: string | null;
}

// ═══════════════════════════════════════════════════
// TREE NODE
// ═══════════════════════════════════════════════════
export interface RequirementTreeNode {
  id: string;
  key: string;
  type: RequirementType;
  title: string;
  coveragePercentage: number;
  coverageStatus: CoverageStatus;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  depth: number;
  children: RequirementTreeNode[];
}

// ═══════════════════════════════════════════════════
// PAGE METRICS
// ═══════════════════════════════════════════════════
export interface RTMMetrics {
  totalRequirements: number;
  totalTrend: TrendInfo;
  fullyCovered: number;
  coveredTrend: TrendInfo;
  partiallyCovered: number;
  partialTrend: TrendInfo;
  coverageGaps: number;
  gapsTrend: TrendInfo;
  linkedTests: number;
  testsTrend: TrendInfo;
  sparklineData: {
    total: number[];
    covered: number[];
    partial: number[];
    gaps: number[];
    tests: number[];
  };
  overallCoveragePercentage: number;
}

// ═══════════════════════════════════════════════════
// TABLE ROW
// ═══════════════════════════════════════════════════
export interface RequirementTableRow {
  id: string;
  key: string;
  title: string;
  type: RequirementType;
  priority: Priority;
  linkedTests: TestLink[];
  coveragePercentage: number;
  coverageStatus: CoverageStatus;
  coverageDetail: {
    passed: number;
    failed: number;
    blocked: number;
    notRun: number;
  };
}

// ═══════════════════════════════════════════════════
// DETAIL VIEW MODEL
// ═══════════════════════════════════════════════════
export interface RequirementDetailViewModel {
  id: string;
  key: string;
  title: string;
  description: string;
  type: RequirementType;
  priority: Priority;
  coveragePercentage: number;
  coverageStatus: CoverageStatus;
  coverageStats: {
    passed: number;
    failed: number;
    blocked: number;
    notRun: number;
  };
  parentKey: string | null;
  releaseName: string;
  createdAt: string;
  updatedAt: string;
  linkedTests: TestLink[];
}

// ═══════════════════════════════════════════════════
// FILTERS & SORTING
// ═══════════════════════════════════════════════════
export interface RTMFilters {
  releaseId: string | null;
  type: RequirementType | null;
  coverageStatus: CoverageStatus | null;
  priority: Priority | null;
  searchQuery: string;
}

export interface RTMSorting {
  column: 'key' | 'title' | 'priority' | 'coverage' | 'type';
  direction: 'asc' | 'desc';
}
