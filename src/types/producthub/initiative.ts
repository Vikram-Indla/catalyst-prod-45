// =====================================================
// PRODUCT HUB — Initiative Timeline Types
// =====================================================

export type InitiativeStatus = 'new_demand' | 'under_review' | 'approved' | 'in_progress' | 'on_hold' | 'delivered' | 'cancelled';

export type PriorityLevel = 'unscored' | 'rejected' | 'low' | 'medium' | 'high';

export type Granularity = 'day' | 'week' | 'month' | 'quarter';

export type Density = 'compact' | 'standard' | 'comfortable';

export type GroupByOption = 'none' | 'department' | 'assignee' | 'quarter' | 'priority' | 'status';

export type FilterChip = 'all' | 'my' | 'quarter' | 'high' | 'unscored' | 'overdue' | 'starred';

export interface TimelineInitiative {
  id: string;
  initiative_key: string;
  title: string;
  description: string | null;
  status: InitiativeStatus;
  assignee_id: string | null;
  assignee_name: string | null;
  business_owner_id: string | null;
  reporter_id: string | null;
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

export const STATUS_CONFIG: Record<InitiativeStatus, { label: string; color: string; bg: string; fill: string }> = {
  new_demand:   { label: 'New Demand',    color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  fill: 'rgba(59,130,246,0.40)' },
  under_review: { label: 'Under Review',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)',  fill: 'rgba(139,92,246,0.40)' },
  approved:     { label: 'Approved',      color: '#06B6D4', bg: 'rgba(6,182,212,0.15)',    fill: 'rgba(6,182,212,0.40)' },
  in_progress:  { label: 'In Progress',   color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  fill: 'rgba(245,158,11,0.40)' },
  on_hold:      { label: 'On Hold',       color: '#6B7280', bg: 'rgba(107,114,128,0.15)', fill: 'rgba(107,114,128,0.40)' },
  delivered:    { label: 'Delivered',      color: '#10B981', bg: 'rgba(16,185,129,0.15)',  fill: 'rgba(16,185,129,0.40)' },
  cancelled:    { label: 'Cancelled',      color: '#EF4444', bg: 'rgba(239,68,68,0.15)',  fill: 'rgba(239,68,68,0.40)' },
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
  const colors = ['#6366f1', '#10b981', '#ec4899', '#f97316', '#06b6d4', '#8b5cf6', '#f43f5e', '#0d9488', '#84cc16', '#e11d48'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
