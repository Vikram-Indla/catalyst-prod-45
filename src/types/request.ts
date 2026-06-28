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
  new:                     { label: 'New',                    lozenge: 'grey',  dot: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))', bg: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))', border: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))', text: 'var(--ds-text-subtle)' },
  portfolio_review:        { label: 'Portfolio Review',       lozenge: 'blue',  dot: 'var(--ds-link)', bg: 'var(--ds-link)', border: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface)))' },
  technical_validation:    { label: 'Technical Validation',   lozenge: 'blue',  dot: 'var(--ds-link)', bg: 'var(--ds-link)', border: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface)))' },
  estimate:                { label: 'Estimate',               lozenge: 'blue',  dot: 'var(--ds-link)', bg: 'var(--ds-link)', border: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface)))' },
  demand_approved:         { label: 'Demand Approved',        lozenge: 'blue',  dot: 'var(--ds-link)', bg: 'var(--ds-link)', border: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface)))' },
  analysis:                { label: 'Analysis',               lozenge: 'blue',  dot: 'var(--ds-link)', bg: 'var(--ds-link)', border: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface)))' },
  ready_for_development:   { label: 'Ready for Development',  lozenge: 'blue',  dot: 'var(--ds-link)', bg: 'var(--ds-link)', border: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface)))' },
  under_implementation:    { label: 'Under Implementation',   lozenge: 'blue',  dot: 'var(--ds-link)', bg: 'var(--ds-link)', border: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface)))' },
  on_hold:                 { label: 'On Hold',                lozenge: 'grey',  dot: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))', bg: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))', border: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))', text: 'var(--ds-text-subtle)' },
  implementation_review:   { label: 'Implementation Review',  lozenge: 'blue',  dot: 'var(--ds-link)', bg: 'var(--ds-link)', border: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface)))' },
  in_support:              { label: 'In Support',             lozenge: 'blue',  dot: 'var(--ds-link)', bg: 'var(--ds-link)', border: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface)))' },
  done:                    { label: 'Done',                   lozenge: 'green', dot: 'var(--cp-lozenge-green-bg, var(--ds-background-success-bold))', bg: 'var(--cp-lozenge-green-bg, var(--ds-background-success-bold))', border: 'var(--cp-lozenge-green-bg, var(--ds-background-success-bold))', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface)))' },
  cancelled:               { label: 'Cancelled',              lozenge: 'grey',  dot: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))', bg: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))', border: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))', text: 'var(--ds-text-subtle)' },
};

export const PRIORITY_THRESHOLDS: { min: number; max: number; level: PriorityLevel; bg: string; border: string; text: string }[] = [
  { min: 4.0, max: 5.0, level: 'High',     bg: 'var(--ds-background-success)', border: 'var(--ds-background-success)', text: 'var(--ds-text-success)' },
  { min: 3.0, max: 3.99, level: 'Medium',  bg: 'var(--ds-background-information)', border: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)' },
  { min: 2.0, max: 2.99, level: 'Low',     bg: 'var(--ds-background-warning)', border: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)' },
  { min: 1.0, max: 1.99, level: 'Rejected', bg: 'var(--ds-background-danger)', border: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)' },
];

export const UNSCORED_STYLE = { bg: 'var(--ds-surface-sunken)', border: 'var(--ds-border)', text: 'var(--ds-text-subtlest)' };

export function getPriorityLevel(score: number | null): { level: PriorityLevel; bg: string; border: string; text: string } {
  if (score === null) return { level: 'Unscored', ...UNSCORED_STYLE };
  const match = PRIORITY_THRESHOLDS.find(t => score >= t.min && score <= t.max);
  return match || { level: 'Unscored', ...UNSCORED_STYLE };
}

/** Deterministic avatar colors — Catalyst-approved only (no purple/pink/magenta/golden-hour) */
const AVATAR_PALETTE = ['var(--cp-teal-60, var(--ds-chart-teal-bold))', 'var(--ds-link)', 'var(--cp-warning, var(--ds-background-warning-bold))', 'var(--cp-success, var(--ds-background-success-bold))', 'var(--cp-danger, var(--ds-background-danger-bold))', 'var(--ds-text-subtlest)', 'var(--ds-link)'];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
