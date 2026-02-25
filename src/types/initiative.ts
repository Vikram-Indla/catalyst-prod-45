export type InitiativeStatus =
  | 'new'
  | 'portfolio_review'
  | 'technical_validation'
  | 'estimate'
  | 'demand_approved'
  | 'analysis'
  | 'ready_for_development'
  | 'under_implementation'
  | 'on_hold'
  | 'implementation_review'
  | 'in_support'
  | 'done'
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
  reporter_name: string | null;
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
  // Roadmap & type fields
  on_roadmap?: boolean;
  initiative_type_key?: string | null;
  initiative_type_label?: string | null;
  initiative_type_color_hex?: string | null;
  health_status?: string | null;
  business_value?: string | null;
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
  new:                     { label: 'New',                    dot: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
  portfolio_review:        { label: 'Portfolio Review',       dot: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' },
  technical_validation:    { label: 'Technical Validation',   dot: '#A855F7', bg: '#FAF5FF', border: '#E9D5FF', text: '#7E22CE' },
  estimate:                { label: 'Estimate',               dot: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE', text: '#4338CA' },
  demand_approved:         { label: 'Demand Approved',        dot: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC', text: '#155E75' },
  analysis:                { label: 'Analysis',               dot: '#0EA5E9', bg: '#F0F9FF', border: '#BAE6FD', text: '#0369A1' },
  ready_for_development:   { label: 'Ready for Development',  dot: '#14B8A6', bg: '#F0FDFA', border: '#99F6E4', text: '#115E59' },
  under_implementation:    { label: 'Under Implementation',   dot: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  on_hold:                 { label: 'On Hold',                dot: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', text: '#374151' },
  implementation_review:   { label: 'Implementation Review',  dot: '#F97316', bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
  in_support:              { label: 'In Support',             dot: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
  done:                    { label: 'Done',                   dot: '#22C55E', bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' },
  cancelled:               { label: 'Cancelled',              dot: '#EF4444', bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
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

/** Catalyst V11 approved avatar colors — no purple/magenta/pink */
const AVATAR_COLOR_MAP: Record<string, string> = {
  'Sarah': '#2563eb',
  'Ahmed': '#0d9488',
  'Fatima': '#0369a1',
  'Omar': '#d97706',
  'Layla': '#0891b2',
  'Khalid': '#1e40af',
  'Nora': '#b45309',
  'Mohammed': '#0f766e',
};

export function getAvatarColor(name: string): string {
  const firstName = name.split(' ')[0];
  if (AVATAR_COLOR_MAP[firstName]) return AVATAR_COLOR_MAP[firstName];
  // Catalyst-approved hash palette: blues, teals, slates, ambers — no purple/magenta
  const colors = ['#2563eb', '#0d9488', '#0369a1', '#d97706', '#0891b2', '#1e40af', '#b45309', '#0f766e', '#475569', '#334155'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
