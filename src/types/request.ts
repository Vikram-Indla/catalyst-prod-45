export type RequestStatus =
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

export interface Request {
  id: string;
  initiative_key: string;
  title: string;
  description: string | null;
  /**
   * Catalyst UI-mapped status — translated by `STATUS_MAP` in `useRequestsBacklog`.
   * Consumed by every legacy RequestStatus switch across the app
   * (lozenge color, list cells, planner pills, reports, etc.).
   * Don't remove until every consumer is migrated.
   */
  status: RequestStatus;
  /**
   * Raw `ph_requests.status` enum value, untranslated.
   * Catalyst-native column-routing on the kanban reads this so the
   * `slug_aliases` mapping in `catalyst_workflow_statuses` actually fires.
   * Examples: `new_demand`, `under_review`, `approved`, `in_progress`,
   * `on_hold`, `delivered`, `closed`, `cancelled`.
   * Optional so existing callsites that construct Request literally
   * compile without churn — populated by the canonical hub data hook.
   */
  db_status?: string | null;
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
  milestone_count?: number;
  is_archived: boolean;
  is_favorited: boolean;
  score_strategic_alignment: number | null;
  score_business_impact: number | null;
  score_time_urgency: number | null;
  score_resource_feasibility: number | null;
  computed_score: number | null;
  created_at: string;
  updated_at: string;
  // Roadmap fields
  on_roadmap?: boolean;
  health_status?: string | null;
  business_value?: string | null;
  ea_review?: string | null;
  priority?: string | null;
  source?: string | null;
  jira_issue_key?: string | null;
  // Linked work-item progress (computed in ph_backlog_requests_view)
  linked_items_total: number;
  linked_items_done: number;
  linked_items_progress: number;
  // Business request type — 'feature' | 'gap' | 'integration' | 'data_request'
  request_type?: string | null;
  // Product code — scope context for display transformations (e.g., MDT→INV)
  product_code?: string | null;
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

export const STATUS_DISPLAY: Record<RequestStatus, { label: string; lozenge: LozengeColor; dot: string; bg: string; border: string; text: string }> = {
  new:                     { label: 'New',                    lozenge: 'grey',  dot: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))', bg: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))', border: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))', text: 'var(--ds-text-subtle, #42526E)' },
  portfolio_review:        { label: 'Portfolio Review',       lozenge: 'blue',  dot: 'var(--ds-link, #0C66E4)', bg: 'var(--ds-link, #0C66E4)', border: 'var(--ds-link, #0C66E4)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF)))' },
  technical_validation:    { label: 'Technical Validation',   lozenge: 'blue',  dot: 'var(--ds-link, #0C66E4)', bg: 'var(--ds-link, #0C66E4)', border: 'var(--ds-link, #0C66E4)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF)))' },
  estimate:                { label: 'Estimate',               lozenge: 'blue',  dot: 'var(--ds-link, #0C66E4)', bg: 'var(--ds-link, #0C66E4)', border: 'var(--ds-link, #0C66E4)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF)))' },
  demand_approved:         { label: 'Demand Approved',        lozenge: 'blue',  dot: 'var(--ds-link, #0C66E4)', bg: 'var(--ds-link, #0C66E4)', border: 'var(--ds-link, #0C66E4)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF)))' },
  analysis:                { label: 'Analysis',               lozenge: 'blue',  dot: 'var(--ds-link, #0C66E4)', bg: 'var(--ds-link, #0C66E4)', border: 'var(--ds-link, #0C66E4)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF)))' },
  ready_for_development:   { label: 'Ready for Development',  lozenge: 'blue',  dot: 'var(--ds-link, #0C66E4)', bg: 'var(--ds-link, #0C66E4)', border: 'var(--ds-link, #0C66E4)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF)))' },
  under_implementation:    { label: 'Under Implementation',   lozenge: 'blue',  dot: 'var(--ds-link, #0C66E4)', bg: 'var(--ds-link, #0C66E4)', border: 'var(--ds-link, #0C66E4)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF)))' },
  on_hold:                 { label: 'On Hold',                lozenge: 'grey',  dot: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))', bg: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))', border: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))', text: 'var(--ds-text-subtle, #42526E)' },
  implementation_review:   { label: 'Implementation Review',  lozenge: 'blue',  dot: 'var(--ds-link, #0C66E4)', bg: 'var(--ds-link, #0C66E4)', border: 'var(--ds-link, #0C66E4)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF)))' },
  in_support:              { label: 'In Support',             lozenge: 'blue',  dot: 'var(--ds-link, #0C66E4)', bg: 'var(--ds-link, #0C66E4)', border: 'var(--ds-link, #0C66E4)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF)))' },
  done:                    { label: 'Done',                   lozenge: 'green', dot: 'var(--cp-lozenge-green-bg, var(--ds-background-success-bold, #1F845A))', bg: 'var(--cp-lozenge-green-bg, var(--ds-background-success-bold, #1F845A))', border: 'var(--cp-lozenge-green-bg, var(--ds-background-success-bold, #1F845A))', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF)))' },
  cancelled:               { label: 'Cancelled',              lozenge: 'grey',  dot: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))', bg: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))', border: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))', text: 'var(--ds-text-subtle, #42526E)' },
};

export const PRIORITY_THRESHOLDS: { min: number; max: number; level: PriorityLevel; bg: string; border: string; text: string }[] = [
  { min: 4.0, max: 5.0, level: 'High',     bg: 'var(--ds-background-success, #DFFCF0)', border: 'var(--ds-background-success, #A7F3D0)', text: 'var(--ds-text-success, #216E4E)' },
  { min: 3.0, max: 3.99, level: 'Medium',  bg: 'var(--ds-background-information, #E9F2FF)', border: 'var(--ds-background-information, #E9F2FF)', text: 'var(--ds-link-pressed, #1e40af)' },
  { min: 2.0, max: 2.99, level: 'Low',     bg: 'var(--ds-background-warning, #FFF7D6)', border: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #974F0C)' },
  { min: 1.0, max: 1.99, level: 'Rejected', bg: 'var(--ds-background-danger, #FFECEB)', border: 'var(--ds-background-danger, #FFECEB)', text: 'var(--ds-text-danger, #AE2A19)' },
];

export const UNSCORED_STYLE = { bg: 'var(--ds-surface-sunken, #F7F8F9)', border: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text-subtlest, #626F86)' };

export function getPriorityLevel(score: number | null): { level: PriorityLevel; bg: string; border: string; text: string } {
  if (score === null) return { level: 'Unscored', ...UNSCORED_STYLE };
  const match = PRIORITY_THRESHOLDS.find(t => score >= t.min && score <= t.max);
  return match || { level: 'Unscored', ...UNSCORED_STYLE };
}

/** Deterministic avatar colors — Catalyst-approved only (no purple/pink/magenta/golden-hour) */
const AVATAR_PALETTE = ['var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))', 'var(--ds-link, #2563eb)', 'var(--cp-warning, var(--ds-background-warning-bold, #d97706))', 'var(--cp-success, var(--ds-background-success-bold, #1F845A))', 'var(--cp-danger, var(--ds-background-danger-bold, #dc2626))', 'var(--ds-text-subtlest, #626F86)', 'var(--ds-link, #0284c7)'];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
