/**
 * Release Dashboard Types
 * Based on Catalyst V5 Specification
 */

// =====================================================
// RELEASE TYPES
// =====================================================

export interface ReleaseDashboard {
  id: string;
  version: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  startDate: string;
  targetDate: string;
  sprintId?: string;
  sprintName?: string;
  ownerId: string | null;
  ownerName?: string;
  module?: string;
}

// =====================================================
// TEST CASE TYPES
// =====================================================

export type TestCaseStatus = 'passed' | 'failed' | 'blocked' | 'not-run' | 'in-progress';
export type TestCasePriority = 'critical' | 'high' | 'medium' | 'low';

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  priority: TestCasePriority;
  status: TestCaseStatus;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  requirementId?: string;
  testCycleId: string;
  duration?: number; // seconds
  executedAt?: string;
  steps: TestStep[];
  defectIds: string[];
}

export interface TestStep {
  id: string;
  number: number;
  action: string;
  expectedResult: string;
  actualResult?: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
}

// =====================================================
// DEFECT TYPES
// =====================================================

export type DefectSeverity = 'critical' | 'major' | 'minor';
export type DefectStatus = 'open' | 'in-progress' | 'resolved' | 'closed';

export interface Defect {
  id: string;
  title: string;
  description: string;
  severity: DefectSeverity;
  status: DefectStatus;
  testCaseIds: string[];
  assigneeId?: string;
  createdAt: string;
}

// =====================================================
// QUALITY GATE TYPES
// =====================================================

export type QualityGateStatus = 'passed' | 'failed' | 'pending';

export interface QualityGate {
  id: string;
  name: string;
  condition: string;
  threshold: number | string;
  currentValue: number | string;
  status: QualityGateStatus;
}

// =====================================================
// COVERAGE MATRIX TYPES
// =====================================================

export interface RequirementCoverage {
  id: string;
  name: string;
  testCases: Array<{
    id: string;
    status: TestCaseStatus;
  }>;
}

export interface CoverageItem {
  requirementId: string;
  requirementName: string;
  testStatuses: TestCaseStatus[];
}

// =====================================================
// TRACEABILITY TYPES
// =====================================================

export type TraceabilityNodeType = 'requirement' | 'test' | 'execution' | 'defect';

export interface TraceabilityNode {
  id: string;
  type: TraceabilityNodeType;
  label: string;
  description?: string;
}

// =====================================================
// ACTIVITY TYPES
// =====================================================

export type ActivityType = 'test-passed' | 'test-failed' | 'defect-logged' | 'test-blocked' | 'execution-started';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  description: string;
  timestamp: string;
  testCaseId?: string;
  defectId?: string;
}

// =====================================================
// SCORECARD TYPES
// =====================================================

export interface ScorecardMetrics {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  passRate: number;
  targetPassRate: number;
  passedTrend: number; // delta today
  failedTrend: number; // delta today
}

// =====================================================
// FILTER TYPES
// =====================================================

export interface DashboardFilters {
  cycle: string | null;
  environment: string | null;
  assignee: string | null;
  status: TestCaseStatus | null;
  priority: TestCasePriority | null;
}

// =====================================================
// ENVIRONMENT COMPARISON
// =====================================================

export interface EnvironmentMetrics {
  name: string;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  total: number;
  passRate: number;
}

export interface EnvironmentStats {
  name: string;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
}

// =====================================================
// RELEASE (for ReleaseHeader)
// =====================================================

export interface Release {
  id: string;
  version: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  startDate: string;
  targetDate: string;
  sprintId?: string;
  ownerId: string | null;
  testCycles: { id: string; name: string; testCount: number; passedCount: number }[];
  qualityGates: QualityGate[];
}

// =====================================================
// STATUS DISPLAY CONFIG - Catalyst V5
// =====================================================

export const TEST_STATUS_CONFIG: Record<TestCaseStatus, { 
  label: string; 
  bgClass: string; 
  textClass: string;
  icon: 'check' | 'x' | 'ban' | 'circle' | 'dot';
}> = {
  passed: { 
    label: 'Passed', 
    bgClass: 'bg-[var(--ds-background-success)]', 
    textClass: 'text-[var(--ds-chart-teal-bold)]',
    icon: 'check'
  },
  failed: { 
    label: 'Failed', 
    bgClass: 'bg-[var(--ds-background-danger)]', 
    textClass: 'text-[var(--ds-background-danger-bold)]',
    icon: 'x'
  },
  blocked: { 
    label: 'Blocked', 
    bgClass: 'bg-[var(--ds-background-warning)]', 
    textClass: 'text-[var(--ds-background-warning-bold)]',
    icon: 'ban'
  },
  'not-run': { 
    label: 'Not Run', 
    bgClass: 'bg-[var(--ds-surface-sunken)]', 
    textClass: 'text-[var(--ds-text-subtlest)]',
    icon: 'circle'
  },
  'in-progress': { 
    label: 'In Progress', 
    bgClass: 'bg-[var(--ds-background-information)]', 
    textClass: 'text-[var(--cp-workstream-catalyst-primary)]',
    icon: 'dot'
  },
};

export const PRIORITY_CONFIG: Record<TestCasePriority, {
  label: string;
  bgClass: string;
  textClass: string;
}> = {
  critical: { 
    label: 'Critical', 
    bgClass: 'bg-[var(--ds-background-danger)]', 
    textClass: 'text-[var(--ds-background-danger-bold)]'
  },
  high: { 
    label: 'High', 
    bgClass: 'bg-[var(--ds-background-warning)]', 
    textClass: 'text-[var(--ds-background-warning-bold)]'
  },
  medium: { 
    label: 'Medium', 
    bgClass: 'bg-[var(--ds-background-information)]', 
    textClass: 'text-[var(--cp-workstream-catalyst-primary)]'
  },
  low: { 
    label: 'Low', 
    bgClass: 'bg-[var(--ds-surface-sunken)]', 
    textClass: 'text-[var(--ds-text-subtlest)]'
  },
};

export const SEVERITY_CONFIG: Record<DefectSeverity, {
  label: string;
  bgClass: string;
  textClass: string;
}> = {
  critical: { 
    label: 'Critical', 
    bgClass: 'bg-[var(--ds-background-danger)]', 
    textClass: 'text-[var(--ds-background-danger-bold)]'
  },
  major: { 
    label: 'Major', 
    bgClass: 'bg-[var(--ds-background-warning)]', 
    textClass: 'text-[var(--ds-background-warning-bold)]'
  },
  minor: { 
    label: 'Minor', 
    bgClass: 'bg-[var(--ds-background-information)]', 
    textClass: 'text-[var(--cp-workstream-catalyst-primary)]'
  },
};
