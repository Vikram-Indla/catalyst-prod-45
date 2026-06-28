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
  primary: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  primaryLight: 'var(--ds-background-selected)',
  teal: 'var(--ds-chart-teal-bold)',
  tealDark: 'var(--ds-chart-teal-bolder)',
  tealLight: 'var(--ds-background-success)',
  warning: 'var(--ds-text-warning)',
  warningDark: 'var(--ds-background-warning-bold)',
  warningLight: 'var(--ds-background-warning)',
  danger: 'var(--ds-text-danger)',
  dangerDark: 'var(--ds-text-danger)',
  dangerLight: 'var(--ds-background-danger)',
  aiPurpleStart: 'var(--ds-background-discovery-bold)',
  aiPurpleEnd: 'var(--ds-background-discovery-bold)',
  gray50: 'var(--ds-surface-sunken)',
  gray100: 'var(--ds-surface-sunken)',
  gray200: 'var(--ds-border, var(--cp-bg-sunken))',
  gray300: 'var(--ds-text-disabled)',
  gray400: 'var(--ds-text-subtlest)',
  gray500: 'var(--ds-text-subtlest)',
  gray600: 'var(--ds-text-subtle)',
  gray700: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))',
  gray800: 'var(--ds-text)',
  gray900: 'var(--ds-text)',
} as const;

export const HEALTH_COLORS: Record<HealthLevel | 'released', { bar: string; progress: string; badge: string; badgeText: string }> = {
  healthy: { bar: CATALYST_COLORS.teal, progress: CATALYST_COLORS.tealDark, badge: CATALYST_COLORS.tealLight, badgeText: CATALYST_COLORS.teal },
  attention: { bar: CATALYST_COLORS.warning, progress: CATALYST_COLORS.warningDark, badge: 'var(--ds-background-warning)', badgeText: 'var(--ds-text-warning)' },
  at_risk: { bar: CATALYST_COLORS.warning, progress: CATALYST_COLORS.warningDark, badge: 'var(--ds-background-warning)', badgeText: 'var(--ds-text-danger)' },
  critical: { bar: CATALYST_COLORS.danger, progress: CATALYST_COLORS.dangerDark, badge: CATALYST_COLORS.dangerLight, badgeText: 'var(--ds-text-danger)' },
  released: { bar: CATALYST_COLORS.gray400, progress: CATALYST_COLORS.gray500, badge: CATALYST_COLORS.gray100, badgeText: CATALYST_COLORS.gray500 },
};

export const MILESTONE_COLORS: Record<MilestoneType, { icon: string; color: string }> = {
  code_freeze: { icon: '◆', color: CATALYST_COLORS.primary },
  uat_start: { icon: '▲', color: CATALYST_COLORS.teal },
  go_live: { icon: '●', color: CATALYST_COLORS.teal },
  gate_review: { icon: '■', color: CATALYST_COLORS.warning },
  custom: { icon: '○', color: CATALYST_COLORS.gray400 },
};
