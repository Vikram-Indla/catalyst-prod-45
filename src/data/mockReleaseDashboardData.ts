/**
 * Mock Data for Release Dashboard
 * Based on Catalyst V5 Specification
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
// RELEASE
// =====================================================

export const mockRelease: ReleaseDashboard = {
  id: 'rel-001',
  version: '2.4',
  name: 'Release 2.4.0',
  description: 'Auth Module improvements and bug fixes',
  status: 'active',
  startDate: '2026-01-01',
  targetDate: '2026-01-20',
  sprintId: 'sprint-24',
  sprintName: 'Sprint 24',
  ownerId: 'user-001',
  ownerName: 'Sarah Chen',
  module: 'Auth Module',
};

// =====================================================
// SCORECARD METRICS
// =====================================================

export const mockScorecardMetrics: ScorecardMetrics = {
  total: 180,
  passed: 145,
  failed: 12,
  blocked: 3,
  notRun: 20,
  passRate: 80.5,
  targetPassRate: 95,
  passedTrend: 12,
  failedTrend: -2,
};

// =====================================================
// TEST CASES
// =====================================================

export const mockTestCases: TestCase[] = [
  {
    id: 'TC-2401',
    title: 'Verify OAuth token refresh works correctly',
    description: 'Test that expired OAuth tokens are automatically refreshed without user intervention',
    priority: 'critical',
    status: 'failed',
    assigneeId: 'user-002',
    assigneeName: 'Mike Johnson',
    assigneeAvatar: null,
    requirementId: 'REQ-101',
    testCycleId: 'cycle-3',
    duration: 245,
    executedAt: '2026-01-15T14:32:00Z',
    steps: [
      { id: 's1', number: 1, action: 'Login with valid credentials', expectedResult: 'User is logged in successfully', actualResult: 'User logged in', status: 'passed' },
      { id: 's2', number: 2, action: 'Wait for token to expire (simulate 1 hour)', expectedResult: 'Token expires silently', actualResult: 'Token expired', status: 'passed' },
      { id: 's3', number: 3, action: 'Attempt API call', expectedResult: 'Token is refreshed automatically and API call succeeds', actualResult: 'Error: Token refresh failed - invalid_grant', status: 'failed' },
      { id: 's4', number: 4, action: 'Verify new token in storage', expectedResult: 'New token stored with updated expiry', status: 'skipped' },
    ],
    defectIds: ['DEF-247'],
  },
  {
    id: 'TC-2402',
    title: 'User login with valid credentials',
    priority: 'high',
    status: 'passed',
    assigneeId: 'user-003',
    assigneeName: 'Emily Davis',
    testCycleId: 'cycle-3',
    duration: 120,
    executedAt: '2026-01-15T10:15:00Z',
    steps: [
      { id: 's1', number: 1, action: 'Navigate to login page', expectedResult: 'Login form is displayed', actualResult: 'Form displayed', status: 'passed' },
      { id: 's2', number: 2, action: 'Enter valid email and password', expectedResult: 'Credentials accepted', actualResult: 'Accepted', status: 'passed' },
      { id: 's3', number: 3, action: 'Click Login button', expectedResult: 'User is redirected to dashboard', actualResult: 'Redirected to dashboard', status: 'passed' },
    ],
    defectIds: [],
  },
  {
    id: 'TC-2403',
    title: 'Session timeout after 30 minutes of inactivity',
    priority: 'medium',
    status: 'blocked',
    assigneeId: 'user-002',
    assigneeName: 'Mike Johnson',
    testCycleId: 'cycle-3',
    duration: undefined,
    steps: [],
    defectIds: [],
  },
  {
    id: 'TC-2404',
    title: 'MFA enrollment with authenticator app',
    priority: 'high',
    status: 'passed',
    assigneeId: 'user-004',
    assigneeName: 'Alex Wilson',
    testCycleId: 'cycle-3',
    duration: 310,
    executedAt: '2026-01-15T11:45:00Z',
    steps: [
      { id: 's1', number: 1, action: 'Navigate to security settings', expectedResult: 'Security page loads', actualResult: 'Loaded', status: 'passed' },
      { id: 's2', number: 2, action: 'Click Enable MFA', expectedResult: 'QR code is displayed', actualResult: 'QR displayed', status: 'passed' },
      { id: 's3', number: 3, action: 'Scan QR with authenticator app', expectedResult: 'Code generated in app', actualResult: 'Code generated', status: 'passed' },
      { id: 's4', number: 4, action: 'Enter verification code', expectedResult: 'MFA is enabled', actualResult: 'MFA enabled successfully', status: 'passed' },
    ],
    defectIds: [],
  },
  {
    id: 'TC-2405',
    title: 'Password reset via email link',
    priority: 'high',
    status: 'passed',
    assigneeId: 'user-003',
    assigneeName: 'Emily Davis',
    testCycleId: 'cycle-3',
    duration: 180,
    executedAt: '2026-01-15T09:30:00Z',
    steps: [],
    defectIds: [],
  },
  {
    id: 'TC-2406',
    title: 'User logout clears all session data',
    priority: 'medium',
    status: 'not-run',
    assigneeId: 'user-004',
    assigneeName: 'Alex Wilson',
    testCycleId: 'cycle-3',
    steps: [],
    defectIds: [],
  },
  {
    id: 'TC-2407',
    title: 'Social login with Google OAuth',
    priority: 'medium',
    status: 'not-run',
    assigneeId: 'user-002',
    assigneeName: 'Mike Johnson',
    testCycleId: 'cycle-3',
    steps: [],
    defectIds: [],
  },
  {
    id: 'TC-2408',
    title: 'Account lockout after 5 failed attempts',
    priority: 'high',
    status: 'failed',
    assigneeId: 'user-003',
    assigneeName: 'Emily Davis',
    testCycleId: 'cycle-3',
    duration: 95,
    executedAt: '2026-01-15T13:20:00Z',
    steps: [
      { id: 's1', number: 1, action: 'Attempt login with wrong password 5 times', expectedResult: 'Account is locked', actualResult: 'Account locked after 6 attempts', status: 'failed' },
    ],
    defectIds: ['DEF-248'],
  },
];

// =====================================================
// QUALITY GATES
// =====================================================

export const mockQualityGates: QualityGate[] = [
  { id: 'qg-1', name: 'Coverage ≥80%', condition: 'coverage', threshold: 80, currentValue: 85, status: 'passed' },
  { id: 'qg-2', name: 'Critical Defects = 0', condition: 'critical_defects', threshold: 0, currentValue: 0, status: 'passed' },
  { id: 'qg-3', name: 'Pass Rate ≥95%', condition: 'pass_rate', threshold: 95, currentValue: 80.5, status: 'failed' },
  { id: 'qg-4', name: 'UAT Sign-off', condition: 'manual', threshold: 'Approved', currentValue: 'Pending', status: 'pending' },
  { id: 'qg-5', name: 'Security Scan', condition: 'security', threshold: 'Pass', currentValue: 'Pass', status: 'passed' },
];

// =====================================================
// COVERAGE MATRIX
// =====================================================

export const mockCoverageMatrix: RequirementCoverage[] = [
  {
    id: 'REQ-101',
    name: 'OAuth Token Refresh',
    testCases: [
      { id: 'TC-2401', status: 'failed' },
      { id: 'TC-2402', status: 'passed' },
      { id: 'TC-2405', status: 'passed' },
    ],
  },
  {
    id: 'REQ-102',
    name: 'Session Management',
    testCases: [
      { id: 'TC-2403', status: 'blocked' },
      { id: 'TC-2406', status: 'not-run' },
    ],
  },
  {
    id: 'REQ-103',
    name: 'MFA Enrollment',
    testCases: [
      { id: 'TC-2404', status: 'passed' },
      { id: 'TC-2408', status: 'failed' },
    ],
  },
  {
    id: 'REQ-104',
    name: 'Social Login',
    testCases: [
      { id: 'TC-2407', status: 'not-run' },
    ],
  },
];

// =====================================================
// TRACEABILITY CHAIN (for TC-2401)
// =====================================================

export const mockTraceabilityChain: TraceabilityNode[] = [
  { id: 'REQ-101', type: 'requirement', label: 'REQ-101', description: 'OAuth Token' },
  { id: 'TC-2401', type: 'test', label: 'TC-2401', description: 'Verify OAuth' },
  { id: 'EX-8834', type: 'execution', label: 'EX-8834', description: 'Cycle 3 Run' },
  { id: 'DEF-247', type: 'defect', label: 'DEF-247', description: 'Token fails' },
];

// =====================================================
// ACTIVITY FEED
// =====================================================

export const mockActivityFeed: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'passed',
    userId: 'user-003',
    userName: 'Emily Davis',
    action: 'marked TC-2402 as Passed',
    timestamp: '2026-01-15T10:15:00Z',
    testCaseId: 'TC-2402',
  },
  {
    id: 'act-2',
    type: 'defect-logged',
    userId: 'user-002',
    userName: 'Mike Johnson',
    action: 'logged defect DEF-247 for TC-2401',
    timestamp: '2026-01-15T14:35:00Z',
    testCaseId: 'TC-2401',
    defectId: 'DEF-247',
  },
  {
    id: 'act-3',
    type: 'blocked',
    userId: 'user-002',
    userName: 'Mike Johnson',
    action: 'marked TC-2403 as Blocked',
    timestamp: '2026-01-15T12:00:00Z',
    testCaseId: 'TC-2403',
  },
  {
    id: 'act-4',
    type: 'started',
    userId: 'user-004',
    userName: 'Alex Wilson',
    action: 'started execution of TC-2404',
    timestamp: '2026-01-15T11:30:00Z',
    testCaseId: 'TC-2404',
  },
  {
    id: 'act-5',
    type: 'passed',
    userId: 'user-004',
    userName: 'Alex Wilson',
    action: 'marked TC-2404 as Passed',
    timestamp: '2026-01-15T11:45:00Z',
    testCaseId: 'TC-2404',
  },
];

// =====================================================
// ENVIRONMENT METRICS
// =====================================================

export const mockEnvironmentMetrics: EnvironmentMetrics[] = [
  { name: 'Staging', passed: 145, failed: 10, blocked: 3, notRun: 22, total: 180, passRate: 80.5 },
  { name: 'UAT', passed: 130, failed: 12, blocked: 5, notRun: 33, total: 180, passRate: 72.2 },
  { name: 'Production', passed: 0, failed: 0, blocked: 0, notRun: 180, total: 180, passRate: 0 },
];

// =====================================================
// FILTER OPTIONS
// =====================================================

export const mockCycleOptions = [
  { value: 'all', label: 'All Cycles' },
  { value: 'cycle-1', label: 'Cycle 1 - Smoke' },
  { value: 'cycle-2', label: 'Cycle 2 - Regression' },
  { value: 'cycle-3', label: 'Cycle 3 - Full' },
];

export const mockEnvironmentOptions = [
  { value: 'all', label: 'All Environments' },
  { value: 'staging', label: 'Staging' },
  { value: 'uat', label: 'UAT' },
  { value: 'production', label: 'Production' },
];

export const mockAssigneeOptions = [
  { value: 'all', label: 'All Assignees' },
  { value: 'user-002', label: 'Mike Johnson' },
  { value: 'user-003', label: 'Emily Davis' },
  { value: 'user-004', label: 'Alex Wilson' },
];

export const mockStatusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'not-run', label: 'Not Run' },
];
