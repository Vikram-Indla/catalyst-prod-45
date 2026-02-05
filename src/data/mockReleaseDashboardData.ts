/**
 * Release Dashboard Data Types
 * NOTE: No mock data - all data comes from database hooks
 */

import type {
  ReleaseDashboard,
  TestCase,
  QualityGate,
  RequirementCoverage,
  ActivityItem,
  ScorecardMetrics,
  EnvironmentMetrics,
  TraceabilityNode,
} from '@/types/release-dashboard';

// =====================================================
// EMPTY DATA - No mock data, use database hooks
// =====================================================

export const mockRelease: ReleaseDashboard = {
  id: '',
  version: '',
  name: 'No Release Selected',
  description: '',
  status: 'draft',
  startDate: '',
  targetDate: '',
  sprintId: '',
  sprintName: '',
  ownerId: '',
  ownerName: '',
  module: '',
};

export const mockScorecardMetrics: ScorecardMetrics = {
  total: 0,
  passed: 0,
  failed: 0,
  blocked: 0,
  notRun: 0,
  passRate: 0,
  targetPassRate: 95,
  passedTrend: 0,
  failedTrend: 0,
};

export const mockTestCases: TestCase[] = [];

export const mockQualityGates: QualityGate[] = [];

export const mockCoverageMatrix: RequirementCoverage[] = [];

export const mockTraceabilityChain: TraceabilityNode[] = [];

export const mockActivityFeed: ActivityItem[] = [];

export const mockEnvironmentMetrics: EnvironmentMetrics[] = [];

// =====================================================
// FILTER OPTIONS (Static UI options, not mock data)
// =====================================================

export const mockCycleOptions = [
  { value: 'all', label: 'All Cycles' },
];

export const mockEnvironmentOptions = [
  { value: 'all', label: 'All Environments' },
  { value: 'staging', label: 'Staging' },
  { value: 'uat', label: 'UAT' },
  { value: 'production', label: 'Production' },
];

export const mockAssigneeOptions = [
  { value: 'all', label: 'All Assignees' },
];

export const mockStatusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'not-run', label: 'Not Run' },
];
