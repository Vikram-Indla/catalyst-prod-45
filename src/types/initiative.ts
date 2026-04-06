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
  ea_review?: string | null;
  priority?: string | null;
  source?: string | null;
  jira_issue_key?: string | null;
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

/**
 * V12 STATUS LOZENGE GUARDRAIL — 3 colors ONLY:
 * Grey (To-Do): New, On Hold, Cancelled
 * Blue (In-Progress): Portfolio Review, Technical Validation, Estimate, Analysis, Ready for Dev, Under Implementation, Implementation Review, In Support, Demand Approved
 * Green (Done): Done
 */
export type LozengeColor = 'grey' | 'blue' | 'green';

export const STATUS_DISPLAY: Record<InitiativeStatus, { label: string; lozenge: LozengeColor; dot: string; bg: string; border: string; text: string }> = {
  new:                     { label: 'New',                    lozenge: 'grey',  dot: '#DFE1E6', bg: '#DFE1E6', border: '#DFE1E6', text: '#42526E' },
  portfolio_review:        { label: 'Portfolio Review',       lozenge: 'blue',  dot: '#0C66E4', bg: '#0C66E4', border: '#0C66E4', text: '#FFFFFF' },
  technical_validation:    { label: 'Technical Validation',   lozenge: 'blue',  dot: '#0C66E4', bg: '#0C66E4', border: '#0C66E4', text: '#FFFFFF' },
  estimate:                { label: 'Estimate',               lozenge: 'blue',  dot: '#0C66E4', bg: '#0C66E4', border: '#0C66E4', text: '#FFFFFF' },
  demand_approved:         { label: 'Demand Approved',        lozenge: 'blue',  dot: '#0C66E4', bg: '#0C66E4', border: '#0C66E4', text: '#FFFFFF' },
  analysis:                { label: 'Analysis',               lozenge: 'blue',  dot: '#0C66E4', bg: '#0C66E4', border: '#0C66E4', text: '#FFFFFF' },
  ready_for_development:   { label: 'Ready for Development',  lozenge: 'blue',  dot: '#0C66E4', bg: '#0C66E4', border: '#0C66E4', text: '#FFFFFF' },
  under_implementation:    { label: 'Under Implementation',   lozenge: 'blue',  dot: '#0C66E4', bg: '#0C66E4', border: '#0C66E4', text: '#FFFFFF' },
  on_hold:                 { label: 'On Hold',                lozenge: 'grey',  dot: '#DFE1E6', bg: '#DFE1E6', border: '#DFE1E6', text: '#42526E' },
  implementation_review:   { label: 'Implementation Review',  lozenge: 'blue',  dot: '#0C66E4', bg: '#0C66E4', border: '#0C66E4', text: '#FFFFFF' },
  in_support:              { label: 'In Support',             lozenge: 'blue',  dot: '#0C66E4', bg: '#0C66E4', border: '#0C66E4', text: '#FFFFFF' },
  done:                    { label: 'Done',                   lozenge: 'green', dot: '#1B7F37', bg: '#1B7F37', border: '#1B7F37', text: '#FFFFFF' },
  cancelled:               { label: 'Cancelled',              lozenge: 'grey',  dot: '#DFE1E6', bg: '#DFE1E6', border: '#DFE1E6', text: '#42526E' },
};

export const PRIORITY_THRESHOLDS: { min: number; max: number; level: PriorityLevel; bg: string; border: string; text: string }[] = [
  { min: 4.0, max: 5.0, level: 'High',     bg: 'var(--tint-green-soft, #ECFDF5)', border: '#A7F3D0', text: '#065F46' },
  { min: 3.0, max: 3.99, level: 'Medium',  bg: 'var(--tint-blue, #EFF6FF)', border: '#BFDBFE', text: '#1E40AF' },
  { min: 2.0, max: 2.99, level: 'Low',     bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  { min: 1.0, max: 1.99, level: 'Rejected', bg: 'var(--tint-red, #FEF2F2)', border: '#FECACA', text: '#991B1B' },
];

export const UNSCORED_STYLE = { bg: '#F9FAFB', border: '#E5E7EB', text: '#6B7280' };

export function getPriorityLevel(score: number | null): { level: PriorityLevel; bg: string; border: string; text: string } {
  if (score === null) return { level: 'Unscored', ...UNSCORED_STYLE };
  const match = PRIORITY_THRESHOLDS.find(t => score >= t.min && score <= t.max);
  return match || { level: 'Unscored', ...UNSCORED_STYLE };
}

/** Deterministic avatar colors — Catalyst-approved only (no purple/pink/magenta/golden-hour) */
const AVATAR_PALETTE = ['#0D9488', '#2563EB', '#D97706', '#16A34A', '#DC2626', '#71717A', '#0284C7'];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
