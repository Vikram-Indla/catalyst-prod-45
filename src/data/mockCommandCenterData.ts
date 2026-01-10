// Command Center Mock Data — Catalyst V5
// All typed mock data for the Release & Test Management module

export interface MetricData {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    text: string;
  };
  progress?: number;
  iconVariant: 'primary' | 'success' | 'warning' | 'danger' | 'teal' | 'purple';
  icon: 'package' | 'play' | 'check-circle' | 'bug' | 'target';
}

export interface ReleaseData {
  id: string;
  key: string;
  name: string;
  dateRange: string;
  startDate: Date;
  endDate: Date;
  health: number;
  healthStatus: 'excellent' | 'good' | 'caution' | 'at-risk';
  stats: {
    workItems: number;
    testCases: number;
    cycles: number;
  };
  status: 'draft' | 'active' | 'approved' | 'rejected' | 'at-risk';
  team: Array<{ initials: string; name: string; color: string }>;
}

export interface CycleData {
  id: string;
  key: string;
  name: string;
  releaseId: string;
  environment: 'dev' | 'staging' | 'production';
  progress: number;
  assignee: { initials: string; name: string; color: string };
  testsCompleted: number;
  testsTotal: number;
}

export interface ActivityData {
  id: string;
  type: 'test-passed' | 'test-failed' | 'defect-logged' | 'ai-generated' | 'release-created' | 'system-alert';
  actor: string;
  action: string;
  target: { text: string; link: string };
  context?: string;
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════
// METRICS DATA
// ═══════════════════════════════════════════════════════════════
export const mockMetrics: MetricData[] = [
  {
    id: 'active-releases',
    label: 'Active Releases',
    value: 3,
    icon: 'package',
    iconVariant: 'primary',
    trend: { direction: 'up', text: '+1 from last week' },
  },
  {
    id: 'tests-executed',
    label: 'Tests Executed',
    value: 223,
    icon: 'play',
    iconVariant: 'teal',
    progress: 87,
  },
  {
    id: 'pass-rate',
    label: 'Pass Rate',
    value: 91,
    suffix: '%',
    icon: 'check-circle',
    iconVariant: 'success',
    trend: { direction: 'up', text: '+3% from last cycle' },
  },
  {
    id: 'open-defects',
    label: 'Open Defects',
    value: 8,
    icon: 'bug',
    iconVariant: 'danger',
    trend: { direction: 'down', text: '3 critical blockers' },
  },
  {
    id: 'coverage',
    label: 'Coverage',
    value: 87,
    suffix: '%',
    icon: 'target',
    iconVariant: 'purple',
    progress: 87,
  },
];

// ═══════════════════════════════════════════════════════════════
// RELEASES DATA
// ═══════════════════════════════════════════════════════════════
export const mockReleases: ReleaseData[] = [
  {
    id: 'rel-26-01-01',
    key: 'REL-26.01.01',
    name: 'Investment Portal Q1',
    dateRange: 'Jan 6 – Jan 22, 2026',
    startDate: new Date('2026-01-06'),
    endDate: new Date('2026-01-22'),
    health: 86,
    healthStatus: 'good',
    stats: { workItems: 42, testCases: 156, cycles: 3 },
    status: 'active',
    team: [
      { initials: 'VS', name: 'Vikram Singh', color: '#2563eb' },
      { initials: 'AA', name: 'Ahmed Al-Rashid', color: '#0d9488' },
      { initials: 'SK', name: 'Sara Khan', color: '#7c3aed' },
    ],
  },
  {
    id: 'rel-26-01-02',
    key: 'REL-26.01.02',
    name: 'Licensing Module v2',
    dateRange: 'Jan 15 – Feb 5, 2026',
    startDate: new Date('2026-01-15'),
    endDate: new Date('2026-02-05'),
    health: 60,
    healthStatus: 'caution',
    stats: { workItems: 28, testCases: 84, cycles: 1 },
    // FIX 5: Change status from 'active' to 'at-risk'
    status: 'at-risk',
    team: [
      { initials: 'MR', name: 'Mohammed Rizvi', color: '#d97706' },
      { initials: 'AA', name: 'Ahmed Al-Rashid', color: '#0d9488' },
    ],
  },
  {
    id: 'rel-25-12-01',
    key: 'REL-25.12.01',
    name: 'Security Patch',
    dateRange: 'Dec 18 – Jan 8, 2026',
    startDate: new Date('2025-12-18'),
    endDate: new Date('2026-01-08'),
    health: 92,
    healthStatus: 'excellent',
    stats: { workItems: 12, testCases: 48, cycles: 2 },
    status: 'approved',
    team: [
      { initials: 'VS', name: 'Vikram Singh', color: '#2563eb' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// TEST CYCLES DATA
// ═══════════════════════════════════════════════════════════════
export const mockCycles: CycleData[] = [
  {
    id: 'cy-26-01-01-01',
    key: 'CY-26.01.01-01',
    name: 'Smoke Testing',
    releaseId: 'rel-26-01-01',
    environment: 'staging',
    progress: 45,
    assignee: { initials: 'VS', name: 'Vikram S.', color: '#2563eb' },
    testsCompleted: 18,
    testsTotal: 40,
  },
  {
    id: 'cy-26-01-01-02',
    key: 'CY-26.01.01-02',
    name: 'Regression Suite',
    releaseId: 'rel-26-01-01',
    environment: 'staging',
    progress: 78,
    assignee: { initials: 'AA', name: 'Ahmed A.', color: '#0d9488' },
    testsCompleted: 62,
    testsTotal: 80,
  },
  {
    id: 'cy-26-01-01-03',
    key: 'CY-26.01.01-03',
    name: 'UAT Sign-off',
    releaseId: 'rel-26-01-01',
    environment: 'production',
    progress: 0,
    assignee: { initials: 'SK', name: 'Sara K.', color: '#7c3aed' },
    testsCompleted: 0,
    testsTotal: 36,
  },
  {
    id: 'cy-26-01-02-01',
    key: 'CY-26.01.02-01',
    name: 'Integration Tests',
    releaseId: 'rel-26-01-02',
    environment: 'dev',
    progress: 22,
    assignee: { initials: 'MR', name: 'Mohammed R.', color: '#d97706' },
    testsCompleted: 11,
    testsTotal: 50,
  },
];

// ═══════════════════════════════════════════════════════════════
// ACTIVITY FEED DATA
// ═══════════════════════════════════════════════════════════════
const now = new Date();

export const mockActivity: ActivityData[] = [
  {
    id: 'act-1',
    type: 'test-passed',
    actor: 'Ahmed Al-Rashid',
    action: 'passed',
    target: { text: 'TC-156', link: '/test-management/test-cases/tc-156' },
    context: 'CY-26.01.01-02',
    timestamp: new Date(now.getTime() - 2 * 60 * 1000), // 2 min ago
  },
  {
    id: 'act-2',
    type: 'defect-logged',
    actor: 'Sara Khan',
    action: 'logged defect',
    target: { text: 'DEF-089', link: '/test-management/defects/def-089' },
    context: 'Payment timeout',
    timestamp: new Date(now.getTime() - 15 * 60 * 1000), // 15 min ago
  },
  {
    id: 'act-3',
    type: 'ai-generated',
    actor: 'AI',
    action: 'generated',
    target: { text: '12 test cases', link: '/test-management/test-cases?generated=true' },
    context: 'Payment Flow',
    timestamp: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
  },
  {
    id: 'act-4',
    type: 'release-created',
    actor: 'Vikram Singh',
    action: 'created release',
    target: { text: 'REL-26.01.02', link: '/releases/rel-26-01-02' },
    timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
  },
  {
    id: 'act-5',
    type: 'system-alert',
    actor: 'System',
    action: 'flagged',
    target: { text: 'REL-26.01.02', link: '/releases/rel-26-01-02' },
    context: '3 blockers',
    timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
  },
];
