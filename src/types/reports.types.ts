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
