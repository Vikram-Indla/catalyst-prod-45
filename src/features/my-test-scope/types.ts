/**
 * My Test Scope - Type Definitions
 * Based on specification: MY-TEST-SCOPE-SPEC-2.md
 */

export interface TestScopeSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  blockedTests: number;
  notRunTests: number;
  passRate: number;
  overdueCount: number;
  dueTodayCount: number;
  linkedDefectsCount: number;
  activeIncidentsCount: number;
}

export interface AIRecommendation {
  priorityTest: TestAssignment | null;
  reasons: string[];
  nextTests: TestAssignment[];
}

export interface TestAssignment {
  id: string;
  scopeId: string;
  key: string;
  title: string;
  status: 'not_run' | 'passed' | 'failed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  priorityScore: number;
  dueDate: string | null;
  urgency: 'overdue' | 'due_today' | 'due_soon' | 'on_track';
  cycleId: string;
  cycleName: string;
  releaseId?: string;
  releaseName?: string;
  releaseVersion?: string;
  linkedStories: string[];
  linkedDefects: string[];
  linkedIncidents: string[];
  blocksGate: boolean;
  riskImpact: 'critical' | 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  lastExecutedAt?: string;
  lastResult?: 'passed' | 'failed' | 'blocked';
}

export interface LinkedDefect {
  id: string;
  key: string;
  title: string;
  severity: 'critical' | 'major' | 'minor' | 'trivial';
  status: string;
  affectedTestCount: number;
  affectedTests: string[];
}

export interface RelatedIncident {
  id: string;
  key: string;
  title: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  status: string;
  module: string;
  affectedTestCount: number;
  affectedTests: string[];
}

export interface WorkloadAnalysis {
  totalRemainingTests: number;
  totalRemainingMinutes: number;
  daysUntilDeadline: number;
  dailyCapacityMinutes: number;
  projectedCompletion: 'on_track' | 'at_risk' | 'will_miss';
  burndownData: { date: string; ideal: number; actual: number }[];
  collaborators: { userId: string; name: string; module: string; testCount: number }[];
}

export interface MyTestScopeData {
  summary: TestScopeSummary;
  aiRecommendation: AIRecommendation;
  tests: TestAssignment[];
  defects: LinkedDefect[];
  incidents: RelatedIncident[];
  workload: WorkloadAnalysis;
}

export type TestScopeTab = 'tests' | 'defects' | 'incidents' | 'traceability' | 'workload';

export interface TestScopeFilters {
  status: string[];
  priority: string[];
  urgency: string[];
  cycleId: string;
  releaseId: string;
  search: string;
  groupBy: 'none' | 'feature' | 'defect' | 'cycle';
  sortBy: 'score' | 'dueDate' | 'status' | 'priority';
  sortOrder: 'asc' | 'desc';
}

// Priority score thresholds for color coding
export const SCORE_THRESHOLDS = {
  critical: { min: 90, max: 100, color: 'var(--ds-text-danger, #ef4444)', label: 'Critical' },
  high: { min: 70, max: 89, color: '#f97316', label: 'High' },
  medium: { min: 50, max: 69, color: '#eab308', label: 'Medium' },
  low: { min: 0, max: 49, color: 'var(--ds-text-subtlest, #94a3b8)', label: 'Low' },
} as const;

export function getScoreLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

export function getScoreColor(score: number): string {
  const level = getScoreLevel(score);
  return SCORE_THRESHOLDS[level].color;
}
