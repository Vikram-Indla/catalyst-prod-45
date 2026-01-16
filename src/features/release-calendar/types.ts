/**
 * Release Calendar Types
 * Catalyst V5 Color Compliant
 */

export type TimeScale = 'week' | 'month' | 'quarter';
export type ReleaseStatus = 'planning' | 'in_progress' | 'testing' | 'staging' | 'released' | 'cancelled';
export type HealthLevel = 'healthy' | 'attention' | 'at_risk' | 'critical';
export type MilestoneType = 'code_freeze' | 'uat_start' | 'go_live' | 'gate_review' | 'custom';
export type MilestoneStatus = 'pending' | 'complete' | 'missed';

export interface CalendarRelease {
  id: string;
  version: string;
  name: string;
  status: ReleaseStatus;
  startDate: string;
  targetDate: string;
  actualDate?: string;
  healthScore: number;
  healthLevel: HealthLevel;
  progress: number;
  milestones: ReleaseMilestone[];
  row: number;
  extendsLeft: boolean;
  extendsRight: boolean;
}

export interface ReleaseMilestone {
  id: string;
  type: MilestoneType;
  name: string;
  date: string;
  status: MilestoneStatus;
}

export interface ReleaseDependency {
  id: string;
  sourceReleaseId: string;
  targetReleaseId: string;
  type: 'blocks' | 'depends_on';
  status: 'valid' | 'conflict';
}

export interface ConflictWarning {
  type: 'overlap' | 'cluster' | 'milestone_collision' | 'dependency';
  severity: 'warning' | 'error';
  releaseIds: string[];
  message: string;
  suggestion: string;
}

export interface CalendarInsight {
  type: 'conflict' | 'risk' | 'upcoming' | 'overdue';
  message: string;
  action: string;
  releaseIds: string[];
}

export interface CalendarView {
  viewStart: string;
  viewEnd: string;
  scale: TimeScale;
  releases: CalendarRelease[];
  dependencies: ReleaseDependency[];
  conflicts: ConflictWarning[];
  aiInsights: CalendarInsight[];
}

// Catalyst V5 Color Constants
export const CATALYST_COLORS = {
  primary: '#2563eb',
  primaryLight: '#eff6ff',
  teal: '#0d9488',
  tealDark: '#0f766e',
  tealLight: '#ccfbf1',
  warning: '#d97706',
  warningDark: '#b45309',
  warningLight: '#fef3c7',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  dangerLight: '#fee2e2',
  aiPurpleStart: '#8b5cf6',
  aiPurpleEnd: '#6366f1',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
} as const;

export const HEALTH_COLORS: Record<HealthLevel | 'released', { bar: string; progress: string; badge: string; badgeText: string }> = {
  healthy: { bar: CATALYST_COLORS.teal, progress: CATALYST_COLORS.tealDark, badge: CATALYST_COLORS.tealLight, badgeText: CATALYST_COLORS.teal },
  attention: { bar: CATALYST_COLORS.warning, progress: CATALYST_COLORS.warningDark, badge: '#fef3c7', badgeText: '#92400e' },
  at_risk: { bar: CATALYST_COLORS.warning, progress: CATALYST_COLORS.warningDark, badge: '#ffedd5', badgeText: '#c2410c' },
  critical: { bar: CATALYST_COLORS.danger, progress: CATALYST_COLORS.dangerDark, badge: CATALYST_COLORS.dangerLight, badgeText: '#b91c1c' },
  released: { bar: CATALYST_COLORS.gray400, progress: CATALYST_COLORS.gray500, badge: CATALYST_COLORS.gray100, badgeText: CATALYST_COLORS.gray500 },
};

export const MILESTONE_COLORS: Record<MilestoneType, { icon: string; color: string }> = {
  code_freeze: { icon: '◆', color: CATALYST_COLORS.primary },
  uat_start: { icon: '▲', color: CATALYST_COLORS.teal },
  go_live: { icon: '●', color: CATALYST_COLORS.teal },
  gate_review: { icon: '■', color: CATALYST_COLORS.warning },
  custom: { icon: '○', color: CATALYST_COLORS.gray400 },
};
