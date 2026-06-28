/**
 * Strategy Room — TypeScript types aligned with es_* Supabase schema
 * All interfaces match actual database columns from types.ts
 */

import type { Database } from '@/integrations/supabase/types';

// ── Row-type aliases (from generated Supabase types) ──

export type EsMission = Database['public']['Tables']['es_missions']['Row'];
export type EsVision = Database['public']['Tables']['es_visions']['Row'];
export type EsStrategicTheme = Database['public']['Tables']['es_strategic_themes']['Row'];
export type EsGoal = Database['public']['Tables']['es_goals']['Row'];
export type EsKeyResult = Database['public']['Tables']['es_key_results']['Row'];
export type EsInitiative = Database['public']['Tables']['es_initiatives']['Row'];
export type EsInitiativeEpic = Database['public']['Tables']['es_initiative_epics']['Row'];
export type EsKrCheckin = Database['public']['Tables']['es_kr_checkins']['Row'];
export type EsHealthScore = Database['public']['Tables']['es_health_scores']['Row'];
export type EsAiRecommendation = Database['public']['Tables']['es_ai_recommendations']['Row'];
export type EsSnapshot = Database['public']['Tables']['es_snapshots']['Row'];
export type EsTeamAlignment = Database['public']['Tables']['es_team_alignment']['Row'];
export type EsInvestmentAllocation = Database['public']['Tables']['es_investment_allocations']['Row'];
export type EsStrategyRoleRecord = Database['public']['Tables']['es_strategy_roles']['Row'];

// ── View-type aliases ──

export type EsDashboardPyramidSummary = Database['public']['Views']['es_dashboard_pyramid_summary']['Row'];
export type EsDashboardOkrHeatmap = Database['public']['Views']['es_dashboard_okr_heatmap']['Row'];
export type EsDashboardOkrTree = Database['public']['Views']['es_dashboard_okr_tree']['Row'];
export type EsDashboardExecutionDials = Database['public']['Views']['es_dashboard_execution_dials']['Row'];
export type EsDashboardHealthComposite = Database['public']['Views']['es_dashboard_health_composite']['Row'];
export type EsDashboardTeamAlignment = Database['public']['Views']['es_dashboard_team_alignment']['Row'];

// ── Enums ──

export type StrategyLayer = 'mission' | 'vision' | 'theme' | 'goal' | 'key_result' | 'initiative' | 'epic_link';
export type OkrStatus = 'on_track' | 'at_risk' | 'off_track' | 'not_started' | 'completed';
export type HealthCategory = 'excellent' | 'good' | 'at_risk' | 'critical';
export type AiPriority = 'critical' | 'high' | 'medium' | 'low';
export type AiRecommendationStatus = 'pending' | 'accepted' | 'dismissed' | 'implemented';
export type SnapshotStatus = 'draft' | 'published' | 'archived';
export type StrategyRole = 'strategy_owner' | 'strategy_contributor' | 'strategy_viewer';
export type DensityMode = 'compact' | 'comfortable' | 'spacious';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

// ── Utility Types ──

export interface WidgetBaseProps {
  className?: string;
  density: DensityMode;
  isLoading?: boolean;
  onExpand?: () => void;
}

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: React.ReactNode;
}

// ── Status Color Mapping ──

export const STATUS_COLORS: Record<OkrStatus, string> = {
  on_track: 'var(--catalyst-success, var(--cp-teal-60))',
  at_risk: 'var(--catalyst-warning, var(--cp-warning))',
  off_track: 'var(--catalyst-danger)',
  not_started: 'var(--catalyst-text-tertiary, var(--cp-ink-4, var(--cp-border-neutral-light)))',
  completed: 'var(--catalyst-success, var(--cp-teal-60))',
};

export const STATUS_LABELS: Record<OkrStatus, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  off_track: 'Off Track',
  not_started: 'Not Started',
  completed: 'Completed',
};

export const THEME_COLORS: Record<string, string> = {
  'Digital Transformation': 'var(--ds-link)',
  'Workforce Development': 'var(--cp-teal-60)',
  'Supply Chain Excellence': 'var(--cp-warning)',
  'Sustainability & ESG': 'var(--cp-success)',
};

export const WORKSTREAM_COLORS: Record<string, string> = {
  senaie: 'var(--ds-icon-information)',
  catalyst: 'var(--ds-background-discovery-bold)',
  tahommona: 'var(--ds-background-discovery-bold)',
  delivery: 'var(--ds-background-warning-bold)',
  mim: 'var(--ds-background-accent-magenta-bolder)',
  standalone: 'var(--ds-background-success-bold)',
  dataai: 'var(--ds-background-accent-teal-bolder)',
};
