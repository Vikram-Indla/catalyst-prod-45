/**
 * Shared data, types, and config for the Ideation module.
 * V12 Hybrid Precision — 3-color StatusLozenge guardrail
 * Updated: Approved = BLUE (active state), Converted to Request = GREEN (terminal)
 * Submitted = GREY (initial state)
 */

// ─── Types ───────────────────────────────────────────────────────
export type IdeaStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted';
export type IdeaType = 'opportunity' | 'solution' | 'feature' | 'improvement' | 'problem';
export type IdeationView = 'list' | 'board' | 'matrix' | 'analytics' | 'drives';

export interface Assignee {
  name: string;
  initials: string;
  color: string;
}

export interface Idea {
  key: string;
  title: string;
  subtitle: string;
  status: IdeaStatus;
  type: IdeaType;
  priority: string;
  impact: number;
  votes: number;
  request: string | null;
  dept: string;
  assignee: Assignee | null;
  ai: 'ready' | 'pending';
  theme?: string | null;
  assigned_team?: string | null;
  target_release_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  roadmap_quarter?: string | null;
}

export interface ImpactFactors {
  I: number; M: number; P: number; A: number; C: number; T: number;
}

export const IDEA_IMPACT_FACTORS: Record<string, ImpactFactors> = {};
export const ideas: Idea[] = [];

// ─── V12 STATUS LOZENGE — 3-COLOR GUARDRAIL — NO DOTS ──────────
// UPDATED: Approved = BLUE (active/in-progress), Submitted = GREY
export const STATUS_CONFIG: Record<IdeaStatus, { bg: string; text: string; label: string }> = {
  draft:        { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text-subtle)', label: 'Draft' },
  submitted:    { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text-subtle)', label: 'Submitted' },
  under_review: { bg: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', label: 'Under Review' },
  approved:     { bg: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', label: 'Approved' },
  rejected:     { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text-subtle)', label: 'Rejected' },
  converted:    { bg: 'var(--cp-lozenge-green-bg, var(--ds-background-success-bold))', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', label: 'Converted' },
};

// ─── TYPE CONFIG — ALL NEUTRAL GREY ─────────────────────────────
export const TYPE_CONFIG: Record<IdeaType, { bg: string; text: string; label: string }> = {
  opportunity:  { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', label: 'Opportunity' },
  solution:     { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', label: 'Solution' },
  feature:      { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', label: 'Feature' },
  improvement:  { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', label: 'Improvement' },
  problem:      { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', label: 'Problem' },
};

// ─── V12 PRIORITY BADGES — ALL NEUTRAL GREY ─────────────────────
export const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  P1: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', border: 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))' },
  P2: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', border: 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))' },
  P3: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', border: 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))' },
  P4: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', border: 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))' },
};

export const VIEW_TITLES: Record<IdeationView, string> = {
  list: 'Ideas Backlog',
  board: 'Ideas Board',
  matrix: 'Impact Matrix',
  analytics: 'Ideas Analytics',
  drives: 'Ideas Themes',
};

export type StatusFilter = 'all' | IdeaStatus | 'my_ideas';

// ─── FILTER PILLS — NO DOTS ────────────────────────────────────
export const FILTER_PILLS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'converted', label: 'Converted' },
  { key: 'my_ideas', label: '⭐ My Ideas' },
];

// ─── Quarter badge — HIGH CONTRAST (AAA) ────────────────────────
export const QUARTER_BADGE: Record<string, { bg: string; text: string }> = {
  Q1: { bg: 'var(--ds-text-danger)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' },
  Q2: { bg: 'var(--ds-link-pressed)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' },
  Q3: { bg: 'var(--ds-text-success)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' },
  Q4: { bg: 'var(--ds-text-warning)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' },
};

// ─── Helpers ────────────────────────────────────────────────────
export function getImpactColor(score: number) {
  if (score >= 4.0) return { gradient: 'linear-gradient(90deg, var(--ds-text-success, var(--cp-success)), var(--ds-text-success))', text: 'var(--ds-text-success, var(--cp-success))' };
  if (score >= 3.0) return { gradient: 'linear-gradient(90deg, var(--ds-text-brand, var(--cp-workstream-catalyst-primary)), var(--ds-text-brand))', text: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' };
  if (score >= 2.0) return { gradient: 'linear-gradient(90deg, var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary))), var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light))))', text: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' };
  return { gradient: 'linear-gradient(90deg, var(--ds-text-disabled), var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border)))))', text: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' };
}

export const AI_INSIGHTS: Record<string, string> = {};

// ─── STATUS DB MAP ──────────────────────────────────────────────
export const STATUS_DB_TO_UI: Record<string, IdeaStatus> = {
  'Draft': 'draft',
  'Submitted': 'submitted',
  'Under Review': 'under_review',
  'Approved': 'approved',
  'Rejected': 'rejected',
  'Converted': 'converted',
  'Converted to Request': 'converted',
};

export const STATUS_LOZENGE_COLORS: Record<string, { bg: string; text: string }> = {
  'Draft':                    { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text-subtle)' },
  'Submitted':                { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text-subtle)' },
  'Under Review':             { bg: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' },
  'Approved':                 { bg: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' },
  'Rejected':                 { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text-subtle)' },
  'Converted':                { bg: 'var(--cp-lozenge-green-bg, var(--ds-background-success-bold))', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' },
  'Converted to Request':  { bg: 'var(--cp-lozenge-green-bg, var(--ds-background-success-bold))', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' },
};
