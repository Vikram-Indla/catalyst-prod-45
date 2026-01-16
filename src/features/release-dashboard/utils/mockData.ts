/**
 * Mock Data for Release Dashboard
 * Based on RELEASE-DASHBOARD-SPEC-V5
 */

import type {
  ReleaseDashboardData,
  ReleaseDetail,
  HealthScore,
  QualityGate,
  ReleaseMetrics,
  TestCycleSummary,
  DefectSummary,
  ExecutionTrendData,
  TeamMember,
  ActivityItem,
  AIInsight,
} from '../types';

export const mockRelease: ReleaseDetail = {
  id: 'rel-26-01-01',
  version: 'REL-26.01.01',
  name: 'Investment Portal Q1',
  description: 'Q1 release for the Investment Portal platform',
  status: 'in_progress',
  startDate: '2026-01-06',
  targetDate: '2026-01-26',
  daysRemaining: 10,
  organization: 'Ministry of Industry',
  releaseManager: {
    id: 'user-vs',
    name: 'Vikram Sharma',
    initials: 'VS',
  },
  qaLead: {
    id: 'user-aa',
    name: 'Ahmed Ali',
    initials: 'AA',
  },
};

export const mockHealthScore: HealthScore = {
  score: 72,
  level: 'at_risk',
  trend: {
    value: 3,
    direction: 'down',
    period: 'vs last week',
  },
  breakdown: {
    passRate: 85,
    coverage: 78,
    defects: 65,
  },
};

export const mockQualityGates: QualityGate[] = [
  { id: 'gate-1', name: 'Code Coverage', status: 'pass', currentValue: '82%', threshold: '≥80%' },
  { id: 'gate-2', name: 'Pass Rate', status: 'pass', currentValue: '89%', threshold: '≥85%' },
  { id: 'gate-3', name: 'Zero Blockers', status: 'fail', currentValue: '1', threshold: '0' },
  { id: 'gate-4', name: 'Regression', status: 'pass', currentValue: '98%', threshold: '≥95%' },
  { id: 'gate-5', name: 'Performance', status: 'fail', currentValue: '2.4s', threshold: '≤2.0s' },
  { id: 'gate-6', name: 'Security', status: 'pass', currentValue: '0', threshold: '0 critical' },
];

export const mockMetrics: ReleaseMetrics = {
  workItems: { total: 24, complete: 18, inProgress: 6 },
  testCases: { total: 223, trend: { value: 12, direction: 'up' } },
  testCycles: { total: 4, active: 2, complete: 2 },
  openDefects: { total: 8, trend: { value: 2, direction: 'up' } },
};

export const mockTestCycles: TestCycleSummary[] = [
  {
    id: 'cycle-1',
    name: 'Smoke Testing',
    cycleId: 'CYC-001',
    environment: 'Staging',
    progress: 100,
    status: 'complete',
    assignee: { id: 'user-vs', name: 'Vikram S.', initials: 'VS' },
  },
  {
    id: 'cycle-2',
    name: 'Regression Suite',
    cycleId: 'CYC-002',
    environment: 'Staging',
    progress: 78,
    status: 'active',
    assignee: { id: 'user-aa', name: 'Ahmed A.', initials: 'AA' },
  },
  {
    id: 'cycle-3',
    name: 'UAT Cycle 1',
    cycleId: 'CYC-003',
    environment: 'UAT',
    progress: 45,
    status: 'active',
    assignee: { id: 'user-mk', name: 'Mohammed K.', initials: 'MK' },
  },
  {
    id: 'cycle-4',
    name: 'Integration Tests',
    cycleId: 'CYC-004',
    environment: 'Staging',
    progress: 0,
    status: 'blocked',
    assignee: { id: 'user-vs', name: 'Vikram S.', initials: 'VS' },
  },
];

export const mockDefectSummary: DefectSummary = {
  blocker: 1,
  critical: 2,
  major: 4,
  minor: 1,
  total: 8,
};

export const mockExecutionTrend: ExecutionTrendData[] = [
  { date: '2026-01-10', passed: 18, failed: 3, blocked: 1 },
  { date: '2026-01-11', passed: 24, failed: 5, blocked: 2 },
  { date: '2026-01-12', passed: 32, failed: 4, blocked: 1 },
  { date: '2026-01-13', passed: 28, failed: 6, blocked: 3 },
  { date: '2026-01-14', passed: 35, failed: 2, blocked: 1 },
  { date: '2026-01-15', passed: 42, failed: 5, blocked: 2 },
  { date: '2026-01-16', passed: 38, failed: 4, blocked: 2 },
];

export const mockTeamContribution: TeamMember[] = [
  {
    id: 'user-vs',
    name: 'Vikram Sharma',
    initials: 'VS',
    role: 'Release Manager',
    avatarColor: '#2563eb',
    stats: { executed: 48, passRate: 96 },
  },
  {
    id: 'user-aa',
    name: 'Ahmed Ali',
    initials: 'AA',
    role: 'QA Engineer',
    avatarColor: '#0d9488',
    stats: { executed: 72, passRate: 89 },
  },
  {
    id: 'user-mk',
    name: 'Mohammed Khan',
    initials: 'MK',
    role: 'QA Engineer',
    avatarColor: '#d97706',
    stats: { executed: 38, passRate: 92 },
  },
];

export const mockActivityFeed: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'test',
    message: 'Ahmed executed 12 tests',
    actor: 'Ahmed A.',
    timestamp: '2026-01-16T14:30:00Z',
    relativeTime: '2 hours ago',
  },
  {
    id: 'act-2',
    type: 'defect',
    message: 'DEF-851 created',
    actor: 'System',
    target: 'DEF-851',
    timestamp: '2026-01-16T13:15:00Z',
    relativeTime: '3 hours ago',
  },
  {
    id: 'act-3',
    type: 'gate',
    message: 'Performance gate failed',
    timestamp: '2026-01-16T11:00:00Z',
    relativeTime: '5 hours ago',
  },
  {
    id: 'act-4',
    type: 'release',
    message: 'STORY-1247 added to scope',
    actor: 'Vikram S.',
    target: 'STORY-1247',
    timestamp: '2026-01-16T09:30:00Z',
    relativeTime: '7 hours ago',
  },
  {
    id: 'act-5',
    type: 'test',
    message: 'Mohammed completed UAT batch',
    actor: 'Mohammed K.',
    timestamp: '2026-01-15T17:00:00Z',
    relativeTime: '1 day ago',
  },
];

export const mockAIInsights: AIInsight[] = [
  {
    type: 'critical',
    icon: '🔴',
    message: '1 blocker defect preventing Zero Blockers gate. DEF-847 assigned to Ahmed, open for 3 days.',
    action: 'Resolve blockers immediately',
  },
  {
    type: 'warning',
    icon: '⚠',
    message: 'Performance gate failing — response time 2.4s exceeds 2.0s threshold.',
    action: 'Optimize API response time',
  },
  {
    type: 'warning',
    icon: '⚠',
    message: '37 tests remaining with 10 days until release.',
    action: 'Increase test execution velocity',
  },
];

export const mockDashboardData: ReleaseDashboardData = {
  release: mockRelease,
  metrics: mockMetrics,
  healthScore: mockHealthScore,
  qualityGates: mockQualityGates,
  testCycles: mockTestCycles,
  defectSummary: mockDefectSummary,
  executionTrend: mockExecutionTrend,
  teamContribution: mockTeamContribution,
  activityFeed: mockActivityFeed,
  aiInsights: mockAIInsights,
};
