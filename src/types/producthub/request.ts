// =====================================================
// PRODUCT HUB — Request Timeline Types
// =====================================================

export type RequestStatus = 'new' | 'portfolio_review' | 'technical_validation' | 'estimate' | 'demand_approved' | 'analysis' | 'ready_for_development' | 'under_implementation' | 'on_hold' | 'implementation_review' | 'in_support' | 'done' | 'cancelled';

export type PriorityLevel = 'unscored' | 'rejected' | 'low' | 'medium' | 'high';

export type Granularity = 'day' | 'week' | 'month' | 'quarter';

export type Density = 'compact' | 'standard' | 'comfortable';

export type GroupByOption = 'none' | 'department' | 'assignee' | 'quarter' | 'priority' | 'status';

export type FilterChip = 'all' | 'my' | 'quarter' | 'high' | 'unscored' | 'overdue' | 'starred';

export interface TimelineRequest {
  id: string;
  initiative_key: string;
  title: string;
  description: string | null;
  status: RequestStatus;
  assignee_id: string | null;
  assignee_name: string | null;
  business_owner_id: string | null;
  reporter_id: string | null;
  reporter_name: string | null;
  department_id: string | null;
  department_name: string | null;
  department_code: string | null;
  target_quarter: string | null;
  business_ask_date: string | null;
  kickoff_date: string | null;
  target_complete: string | null;
  progress: number;
  sort_order: number;
  risk_count: number;
  is_archived: boolean;
  score_strategic_alignment: number | null;
  score_business_impact: number | null;
  score_time_urgency: number | null;
  score_resource_feasibility: number | null;
  computed_score: number | null;
  created_at: string;
  updated_at: string;
  // Roadmap fields
  health_status?: string | null;
  business_value?: string | null;
  ea_review?: string | null;
  priority?: string | null;
  on_roadmap?: boolean;
  source?: string | null;
  jira_issue_key?: string | null;
}

export interface TimelineState {
  granularity: Granularity;
  density: Density;
  groupBy: GroupByOption;
  activeFilter: FilterChip;
  searchTerm: string;
  selectedInitiativeId: string | null;
  isDetailOpen: boolean;
}

export const DENSITY_MAP: Record<Density, { row: number; bar: number }> = {
  compact: { row: 32, bar: 20 },
  standard: { row: 44, bar: 28 },
  comfortable: { row: 56, bar: 36 },
};

export const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string; fill: string }> = {
  new:                     { label: 'New',                    color: 'var(--ds-background-information-bold, #3b82f6)', bg: 'var(--ds-background-information-bold, rgba(59,130,246,0.15))',   fill: 'var(--ds-background-information-bold, rgba(59,130,246,0.40))' },
  portfolio_review:        { label: 'Portfolio Review',       color: 'var(--ds-background-discovery-bold, #8b5cf6)', bg: 'var(--ds-background-discovery-bold, rgba(139,92,246,0.15))',   fill: 'var(--ds-background-discovery-bold, rgba(139,92,246,0.40))' },
  technical_validation:    { label: 'Technical Validation',   color: '#A855F7', bg: 'rgba(168,85,247,0.15)',   fill: 'rgba(168,85,247,0.40)' }, // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  estimate:                { label: 'Estimate',               color: 'var(--ds-background-discovery-bold, #6366f1)', bg: 'rgba(99,102,241,0.15)',   fill: 'rgba(99,102,241,0.40)' },
  demand_approved:         { label: 'Demand Approved',        color: 'var(--ds-icon-information, #1D7AFC)', bg: 'rgba(6,182,212,0.15)',    fill: 'rgba(6,182,212,0.40)' },
  analysis:                { label: 'Analysis',               color: '#0EA5E9', bg: 'rgba(14,165,233,0.15)',   fill: 'rgba(14,165,233,0.40)' }, // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  ready_for_development:   { label: 'Ready for Development',  color: 'var(--ds-background-accent-teal-bolder, #14b8a6)', bg: 'rgba(20,184,166,0.15)',   fill: 'rgba(20,184,166,0.40)' },
  under_implementation:    { label: 'Under Implementation',   color: 'var(--cp-amber, #F59E0B)', bg: 'var(--ds-background-warning-bold, rgba(245,158,11,0.15))',   fill: 'var(--ds-background-warning-bold, rgba(245,158,11,0.40))' },
  on_hold:                 { label: 'On Hold',                color: 'var(--ds-text-subtlest, #626F86)', bg: 'rgba(107,114,128,0.15)',  fill: 'rgba(107,114,128,0.40)' },
  implementation_review:   { label: 'Implementation Review',  color: 'var(--ds-background-warning-bold, #f97316)', bg: 'rgba(249,115,22,0.15)',   fill: 'rgba(249,115,22,0.40)' },
  in_support:              { label: 'In Support',             color: 'var(--ds-background-success-bold, #059669)', bg: 'var(--ds-background-success-bold, rgba(16,185,129,0.15))',   fill: 'var(--ds-background-success-bold, rgba(16,185,129,0.40))' },
  done:                    { label: 'Done',                   color: 'var(--ds-background-success-bold, #1F845A)', bg: 'var(--ds-background-success-bold, rgba(34,197,94,0.15))',    fill: 'var(--ds-background-success-bold, rgba(34,197,94,0.40))' },
  cancelled:               { label: 'Cancelled',              color: 'var(--ds-background-danger-bold, #ef4444)', bg: 'var(--ds-background-danger, rgba(239,68,68,0.15))',    fill: 'var(--ds-background-danger, rgba(239,68,68,0.40))' },
};

export const FILTER_CHIPS: { key: FilterChip; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'my', label: 'My Items' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'high', label: 'High Priority' },
  { key: 'unscored', label: 'Unscored' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'starred', label: '★ Starred' },
];

export const GROUP_BY_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'department', label: 'Department' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
];

/** Get priority level from computed score */
export function getPriorityFromScore(score: number | null): PriorityLevel {
  if (score === null) return 'unscored';
  if (score >= 4.0) return 'high';
  if (score >= 3.0) return 'medium';
  if (score >= 2.0) return 'low';
  return 'rejected';
}

/** Generate initials from a name string */
export function getInitialsFromName(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/** Deterministic color from string */
export function hashColor(str: string): string {
  const colors = ['var(--ds-link, #2563eb)', 'var(--ds-chart-teal-bold, #0d9488)', '#0369a1', 'var(--ds-background-warning-bold, #d97706)', 'var(--ds-link, #0C66E4)', 'var(--ds-link-pressed, #1e40af)', 'var(--ds-background-warning-bold, #b45309)', 'var(--ds-chart-teal-bolder, #0f766e)', 'var(--ds-text-subtle, #44546F)', 'var(--cp-ink-2, var(--cp-ink-2, #334155))'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
