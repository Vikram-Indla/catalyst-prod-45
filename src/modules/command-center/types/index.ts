/**
 * Catalyst Command Center - Type Definitions
 * Executive Testing Operations Dashboard
 */

// KPI Types
export type KPIColor = 'primary' | 'teal' | 'warning' | 'danger';
export type TrendDirection = 'up' | 'down' | 'neutral';

export interface KPITrend {
  direction: TrendDirection;
  percentage: number;
  isPositive: boolean;
  period: string;
}

export interface KPIMetric {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  trend: KPITrend;
  color: KPIColor;
  icon: string;
}

// Release Health Types
export type HealthStatus = 'healthy' | 'at-risk' | 'critical';

export interface ReleaseHealthData {
  id: string;
  name: string;
  version: string;
  product: string;
  sprint: string;
  dueDate: string;
  healthScore: number;
  healthStatus: HealthStatus;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  total: number;
  passRate: number;
}

// Quality Gate Types
export type GateStatus = 'passed' | 'warning' | 'failed';

export interface QualityGate {
  id: string;
  name: string;
  status: GateStatus;
  currentValue: string;
  threshold: string;
  numericValue?: number;
  numericThreshold?: number;
}

// Test Progress Types
export interface SprintProgress {
  sprint: string;
  sprintName?: string;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  total: number;
}

// Defect Trend Types
export interface DefectTrendPoint {
  date: string;
  dateLabel: string;
  opened: number;
  closed: number;
  net: number;
}

// Team Performance Types
export type AvatarColor = 'blue' | 'teal' | 'purple' | 'orange' | 'green' | 'pink';

export interface TeamMemberPerformance {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  role: string;
  testsToday: number;
  passRate: number;
  color: AvatarColor;
}

// Activity Types
export type ActivityType = 'passed' | 'failed' | 'defect' | 'comment' | 'status_change' | 'blocked';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  user: string;
  userId?: string;
  userAvatarUrl?: string;
  action: string;
  subject: string;
  title: string;
  time: string;
  timestamp: Date;
}

// Milestone Types
export type MilestoneUrgency = 'normal' | 'warning' | 'danger' | 'today';

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  daysRemaining: number;
  urgency: MilestoneUrgency;
  related: string;
  releaseId?: string;
}

// Command Center State
export interface CommandCenterState {
  isLoading: boolean;
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  refreshInterval: number; // in seconds
  selectedRelease?: string;
  timeRange: '7d' | '14d' | '30d' | '90d';
}

// Chart Configuration
export interface ChartConfig {
  showLegend: boolean;
  showTooltip: boolean;
  animate: boolean;
  colors: {
    passed: string;
    failed: string;
    blocked: string;
    notRun: string;
    opened: string;
    closed: string;
  };
}

export const DEFAULT_CHART_COLORS = {
  passed: '#0d9488',  // Teal
  failed: '#ef4444',  // Danger
  blocked: '#d97706', // Warning
  notRun: '#e2e8f0',  // Gray
  opened: '#ef4444',  // Danger
  closed: '#0d9488',  // Teal
};
