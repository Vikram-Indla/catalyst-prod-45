export interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  notRunTests: number;
  passRate: number;
}

export interface ExecutionTrend {
  date: string;
  passed: number;
  failed: number;
  notRun: number;
}

export interface FeatureCoverage {
  featureId: string;
  featureName: string;
  totalTests: number;
  completedTests: number;
  coveragePercentage: number;
}

export interface RecentExecution {
  id: string;
  testCaseId: string;
  testCaseTitle: string;
  executedBy: string;
  executedAt: string;
  status: 'passed' | 'failed' | 'blocked' | 'skipped';
  duration?: number;
}

// Defect Report Types
export interface DefectOverview {
  totalDefects: number;
  linkedToCases: number;
  linkedPercentage: number;
  unlinked: number;
  avgPerFailedCase: number;
}

export interface DefectStatusDistribution {
  status: string;
  count: number;
  color: string;
}

export interface DefectPriorityDistribution {
  priority: string;
  count: number;
  color: string;
}

export interface DefectImpactRow {
  key: string;
  title: string;
  priority: string;
  status: string;
  linkedCases: number;
  linkedExecutions: number;
  firstFound: string;
  lastOccurrence: string;
}

export interface DefectTrendPoint {
  date: string;
  created: number;
  resolved: number;
  open: number;
}

export interface DefectVelocity {
  createdThisPeriod: number;
  resolvedThisPeriod: number;
  netChange: number;
  avgPerWeek: number;
  resolutionRate: number;
}

export interface DefectAgingBucket {
  range: string;
  count: number;
  minDays: number;
  maxDays: number;
}

// Project Report Types
export interface ProjectOverviewMetrics {
  testCases: number;
  testSets: number;
  cycles: number;
  executions: number;
  defects: number;
  automated: number;
  automatedPercentage: number;
  contributors: number;
  storageUsed: number;
  storageLimit: number;
}

export interface ContributorData {
  userId: string;
  userName: string;
  avatar?: string;
  casesCreated: number;
  casesExecuted: number;
  defectsFound: number;
  contributionScore: number;
}

export interface TopCaseData {
  key: string;
  title: string;
  timesUsed: number;
  defectsDiscovered: number;
  usageScore: number;
}

export interface HealthScoreBreakdown {
  coverage: { score: number; weight: number };
  automation: { score: number; weight: number };
  passRate: { score: number; weight: number };
  defectResolution: { score: number; weight: number };
  activity: { score: number; weight: number };
  overall: number;
}

export interface ActivitySummary {
  total: number;
  mostActiveDay: string;
  mostActiveDayCount: number;
  mostActiveUser: string;
  mostActiveUserCount: number;
  activityTypes: number;
}

export interface ActivityByType {
  type: string;
  count: number;
  color: string;
}

export interface ActivityFeedItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  avatar?: string;
  action: string;
  target: string;
  targetId: string;
  details: string;
}

export interface HourlyActivityData {
  day: string;
  hours: number[];
}

// User Report Types
export interface UserOverview {
  userId: string;
  userName: string;
  avatar?: string;
  role: string;
  memberSince: string;
  totalContributions: number;
}

export interface UserActivityMetrics {
  casesCreated: number;
  casesExecuted: number;
  defectsFound: number;
  effortHours: number;
}

export interface UserExecutionPerformance {
  executions: number;
  passRate: number;
  avgTimeMinutes: number;
  efficiency: number;
}

export interface UserVsTeamComparison {
  metric: string;
  userValue: number;
  teamAvg: number;
  difference: number;
}

// Run Report Types
export interface RunOverview {
  totalRuns: number;
  totalExecutions: number;
  avgPerRun: number;
  activeRuns: number;
}

export interface RunPerformanceRow {
  runId: string;
  cycleName: string;
  startDate: string;
  endDate?: string;
  duration: string;
  caseCount: number;
  passRate: number;
  testerCount: number;
  status: string;
}

export interface TesterParticipation {
  testerId: string;
  testerName: string;
  runsParticipated: number;
  executions: number;
  avgPerRun: number;
  passRate: number;
}

// Case Usage Report Types
export interface CaseUsageOverview {
  total: number;
  uniqueExecuted: number;
  executedPercentage: number;
  neverExecuted: number;
  neverExecutedPercentage: number;
  avgExecutionsPerCase: number;
}

export interface CaseUsageRow {
  rank: number;
  key: string;
  title: string;
  executionCount: number;
  uniqueCycles: number;
  passRate: number;
  defectsFound: number;
  usageScore: number;
}

export interface CaseStabilityAnalysis {
  stable: { count: number; cases: string[] };
  flaky: { count: number; cases: string[] };
  unstable: { count: number; cases: string[] };
}

export interface RetirementCandidate {
  key: string;
  title: string;
  lastExecuted: string;
  daysInactive: number;
  recommendation: string;
}

// Report Filter Types
export interface ReportFilters {
  projectId?: string;
  programId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  cycleIds?: string[];
  userIds?: string[];
  status?: string[];
  priority?: string[];
  folders?: string[];
}

// Export Options
export interface ReportExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  includeRawData: boolean;
  dateRange?: { start: Date; end: Date };
}
