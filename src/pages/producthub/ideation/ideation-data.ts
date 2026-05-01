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
  draft:        { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E', label: 'Draft' },
  submitted:    { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E', label: 'Submitted' },
  under_review: { bg: '#0C66E4', text: 'var(--ds-text-inverse, #FFFFFF)', label: 'Under Review' },
  approved:     { bg: '#0C66E4', text: 'var(--ds-text-inverse, #FFFFFF)', label: 'Approved' },
  rejected:     { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E', label: 'Rejected' },
  converted:    { bg: '#1B7F37', text: 'var(--ds-text-inverse, #FFFFFF)', label: 'Converted' },
};

// ─── TYPE CONFIG — ALL NEUTRAL GREY ─────────────────────────────
export const TYPE_CONFIG: Record<IdeaType, { bg: string; text: string; label: string }> = {
  opportunity:  { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #334155)', label: 'Opportunity' },
  solution:     { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #334155)', label: 'Solution' },
  feature:      { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #334155)', label: 'Feature' },
  improvement:  { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #334155)', label: 'Improvement' },
  problem:      { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #334155)', label: 'Problem' },
};

// ─── V12 PRIORITY BADGES — ALL NEUTRAL GREY ─────────────────────
export const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  P1: { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #334155)', border: 'var(--bd-default, #E2E8F0)' },
  P2: { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #334155)', border: 'var(--bd-default, #E2E8F0)' },
  P3: { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #334155)', border: 'var(--bd-default, #E2E8F0)' },
  P4: { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #334155)', border: 'var(--bd-default, #E2E8F0)' },
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
  Q1: { bg: 'var(--ds-text-danger, #991B1B)', text: 'var(--ds-text-inverse, #FFFFFF)' },
  Q2: { bg: '#1E40AF', text: 'var(--ds-text-inverse, #FFFFFF)' },
  Q3: { bg: '#115E59', text: 'var(--ds-text-inverse, #FFFFFF)' },
  Q4: { bg: '#78350F', text: 'var(--ds-text-inverse, #FFFFFF)' },
};

// ─── Helpers ────────────────────────────────────────────────────
export function getImpactColor(score: number) {
  if (score >= 4.0) return { gradient: 'linear-gradient(90deg, var(--ds-text-success, #16A34A), var(--ds-text-success, #22C55E))', text: 'var(--ds-text-success, #16A34A)' };
  if (score >= 3.0) return { gradient: 'linear-gradient(90deg, var(--ds-text-brand, #2563EB), var(--ds-text-brand, #3B82F6))', text: 'var(--ds-text-brand, #2563EB)' };
  if (score >= 2.0) return { gradient: 'linear-gradient(90deg, var(--ds-text-subtlest, #64748B), var(--ds-text-subtlest, #94A3B8))', text: 'var(--ds-text-subtlest, #64748B)' };
  return { gradient: 'linear-gradient(90deg, var(--ds-text-disabled, #CBD5E1), var(--bd-default, #E2E8F0))', text: 'var(--ds-text-subtlest, #94A3B8)' };
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
  'Draft':                    { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E' },
  'Submitted':                { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E' },
  'Under Review':             { bg: '#0C66E4', text: 'var(--ds-text-inverse, #FFFFFF)' },
  'Approved':                 { bg: '#0C66E4', text: 'var(--ds-text-inverse, #FFFFFF)' },
  'Rejected':                 { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E' },
  'Converted':                { bg: '#1B7F37', text: 'var(--ds-text-inverse, #FFFFFF)' },
  'Converted to Request':  { bg: '#1B7F37', text: 'var(--ds-text-inverse, #FFFFFF)' },
};
