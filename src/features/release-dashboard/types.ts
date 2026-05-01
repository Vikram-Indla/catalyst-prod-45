/**
 * Release Dashboard Types
 * Based on RELEASE-DASHBOARD-SPEC-V5
 */

export interface User {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
}

export interface ReleaseDetail {
  id: string;
  version: string;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'testing' | 'staging' | 'released' | 'cancelled';
  startDate: string;
  targetDate: string;
  actualDate?: string;
  daysRemaining: number;
  releaseManager: User;
  qaLead?: User;
  organization?: string;
}

export interface HealthScore {
  score: number;
  level: 'healthy' | 'attention' | 'at_risk' | 'critical';
  trend: {
    value: number;
    direction: 'up' | 'down' | 'flat';
    period: string;
  };
  breakdown: {
    passRate: number;
    coverage: number;
    defects: number;
  };
}

export interface QualityGate {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'pending';
  currentValue: string;
  threshold: string;
  description?: string;
}

export interface ReleaseMetrics {
  workItems: { total: number; complete: number; inProgress: number };
  testCases: { total: number; trend: { value: number; direction: 'up' | 'down' | 'flat' } };
  testCycles: { total: number; active: number; complete: number };
  openDefects: { total: number; trend: { value: number; direction: 'up' | 'down' | 'flat' } };
}

export interface TestCycleSummary {
  id: string;
  name: string;
  cycleId: string;
  environment: string;
  progress: number;
  assignee: User;
  status: 'active' | 'complete' | 'blocked';
}

export interface DefectSummary {
  blocker: number;
  critical: number;
  major: number;
  minor: number;
  total: number;
}

export interface ExecutionTrendData {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  avatarColor: string;
  stats: {
    executed: number;
    passRate: number;
  };
}

export interface ActivityItem {
  id: string;
  type: 'test' | 'defect' | 'gate' | 'release';
  message: string;
  actor?: string;
  target?: string;
  timestamp: string;
  relativeTime: string;
}

export interface AIInsight {
  type: 'critical' | 'warning' | 'positive';
  icon: string;
  message: string;
  action?: string;
}

export interface ReleaseDashboardData {
  release: ReleaseDetail;
  metrics: ReleaseMetrics;
  healthScore: HealthScore;
  qualityGates: QualityGate[];
  testCycles: TestCycleSummary[];
  defectSummary: DefectSummary;
  executionTrend: ExecutionTrendData[];
  teamContribution: TeamMember[];
  activityFeed: ActivityItem[];
  aiInsights: AIInsight[];
}

// Health level configuration - Catalyst V5 compliant
export const HEALTH_THRESHOLDS = {
  healthy: { min: 85, color: '#0d9488' },
  attention: { min: 70, color: 'var(--ds-text-warning, var(--ds-text-warning, #d97706))' },
  at_risk: { min: 50, color: 'var(--ds-text-warning, var(--ds-text-warning, #d97706))' },
  critical: { min: 0, color: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))' },
} as const;

export function getHealthLevel(score: number): 'healthy' | 'attention' | 'at_risk' | 'critical' {
  if (score >= 85) return 'healthy';
  if (score >= 70) return 'attention';
  if (score >= 50) return 'at_risk';
  return 'critical';
}

export function getHealthColor(level: 'healthy' | 'attention' | 'at_risk' | 'critical'): string {
  return HEALTH_THRESHOLDS[level].color;
}

// Catalyst V5 Colors
export const CATALYST_COLORS = {
  primary: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
  teal: '#0d9488',
  warning: 'var(--ds-text-warning, var(--ds-text-warning, #d97706))',
  danger: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))',
  aiPurple: '#8b5cf6',
  aiPurpleEnd: '#6366f1',
  gray: {
    50: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #f8fafc))',
    100: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #f1f5f9))',
    200: 'var(--ds-border, var(--ds-border, #e2e8f0))',
    300: 'var(--ds-text-disabled, var(--ds-text-disabled, #cbd5e1))',
    400: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94a3b8))',
    500: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
    600: 'var(--ds-text-subtle, var(--ds-text-subtle, #475569))',
    700: 'var(--ds-text-subtle, var(--ds-text-subtle, #334155))',
    800: '#1e293b',
    900: 'var(--ds-text, var(--ds-text, #0f172a))',
  },
} as const;

// Status label mapping
export const STATUS_LABELS: Record<ReleaseDetail['status'], string> = {
  planning: 'Planning',
  in_progress: 'In Progress',
  testing: 'Testing',
  staging: 'Staging',
  released: 'Released',
  cancelled: 'Cancelled',
};
