export type InitiativeStatus =
  | 'new_demand'
  | 'under_review'
  | 'approved'
  | 'in_progress'
  | 'on_hold'
  | 'delivered'
  | 'closed'
  | 'cancelled';

export type PriorityLevel = 'High' | 'Medium' | 'Low' | 'Rejected' | 'Unscored';

export type Density = 'compact' | 'standard' | 'comfortable';

export type ViewMode = 'table' | 'board' | 'timeline' | 'cards';

export interface Initiative {
  id: string;
  initiative_key: string;
  title: string;
  description: string | null;
  status: InitiativeStatus;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  business_owner_id: string | null;
  business_owner_name: string | null;
  reporter_id: string | null;
  department_id: string | null;
  department_name: string | null;
  target_quarter: string | null;
  business_ask_date: string | null;
  kickoff_date: string | null;
  target_complete: string | null;
  progress: number;
  sort_order: number;
  risk_count: number;
  is_archived: boolean;
  is_favorited: boolean;
  score_strategic_alignment: number | null;
  score_business_impact: number | null;
  score_time_urgency: number | null;
  score_resource_feasibility: number | null;
  computed_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
}

export interface SavedView {
  id: string;
  name: string;
  is_shared: boolean;
  is_default: boolean;
  config: {
    filters: FilterCondition[];
    sort: { id: string; desc: boolean }[];
    columns: string[];
    groupBy: string | null;
    density: Density;
  };
}

export const STATUS_DISPLAY: Record<InitiativeStatus, { label: string; dot: string; bg: string; border: string; text: string }> = {
  new_demand:    { label: 'New Demand',    dot: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
  under_review:  { label: 'Under Review',  dot: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' },
  approved:      { label: 'Approved',      dot: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC', text: '#155E75' },
  in_progress:   { label: 'In Progress',   dot: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  on_hold:       { label: 'On Hold',       dot: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', text: '#374151' },
  delivered:     { label: 'Delivered',     dot: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
  closed:        { label: 'Closed',        dot: '#1F2937', bg: '#F3F4F6', border: '#D1D5DB', text: '#111827' },
  cancelled:     { label: 'Cancelled',     dot: '#EF4444', bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
};

export const PRIORITY_THRESHOLDS: { min: number; max: number; level: PriorityLevel; bg: string; border: string; text: string }[] = [
  { min: 4.0, max: 5.0, level: 'High',     bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
  { min: 3.0, max: 3.99, level: 'Medium',  bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
  { min: 2.0, max: 2.99, level: 'Low',     bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  { min: 1.0, max: 1.99, level: 'Rejected', bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
];

export const UNSCORED_STYLE = { bg: '#F9FAFB', border: '#E5E7EB', text: '#6B7280' };

export function getPriorityLevel(score: number | null): { level: PriorityLevel; bg: string; border: string; text: string } {
  if (score === null) return { level: 'Unscored', ...UNSCORED_STYLE };
  const match = PRIORITY_THRESHOLDS.find(t => score >= t.min && score <= t.max);
  return match || { level: 'Unscored', ...UNSCORED_STYLE };
}

/** Spec-defined deterministic avatar colors by first name */
const AVATAR_COLOR_MAP: Record<string, string> = {
  'Sarah': '#6366f1',
  'Ahmed': '#10b981',
  'Fatima': '#ec4899',
  'Omar': '#f97316',
  'Layla': '#06b6d4',
  'Khalid': '#8b5cf6',
  'Nora': '#f43f5e',
  'Mohammed': '#0d9488',
};

export function getAvatarColor(name: string): string {
  const firstName = name.split(' ')[0];
  if (AVATAR_COLOR_MAP[firstName]) return AVATAR_COLOR_MAP[firstName];
  // Fallback hash
  const colors = ['#6366f1', '#10b981', '#ec4899', '#f97316', '#06b6d4', '#8b5cf6', '#f43f5e', '#0d9488', '#84cc16', '#e11d48'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
