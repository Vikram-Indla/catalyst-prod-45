/**
 * Shared data, types, and config for the Ideation module.
 * V12 Hybrid Precision — 3-color StatusLozenge guardrail
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
  initiative: string | null;
  dept: string;
  assignee: Assignee | null;
  ai: 'ready' | 'pending';
  theme?: string | null;
  assigned_team?: string | null;
  target_release_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ─── IMPACT factor data per idea ──────────────────────────────────
export interface ImpactFactors {
  I: number; M: number; P: number; A: number; C: number; T: number;
}

export const IDEA_IMPACT_FACTORS: Record<string, ImpactFactors> = {};

// ─── Data (deprecated — use useIdeas() hook instead) ─────────────
export const ideas: Idea[] = [];

// ─── V12 STATUS LOZENGE — 3-COLOR GUARDRAIL (IMMUTABLE) ─────────
export const STATUS_CONFIG: Record<IdeaStatus, { dot: string; bg: string; text: string; label: string }> = {
  draft:        { dot: '#64748B', bg: '#DFE1E6', text: '#253858', label: 'Draft' },
  submitted:    { dot: '#64748B', bg: '#DFE1E6', text: '#253858', label: 'Submitted' },
  under_review: { dot: '#0747A6', bg: '#DEEBFF', text: '#0747A6', label: 'Under Review' },
  approved:     { dot: '#006644', bg: '#E3FCEF', text: '#006644', label: 'Approved' },
  rejected:     { dot: '#64748B', bg: '#DFE1E6', text: '#253858', label: 'Rejected' },
  converted:    { dot: '#006644', bg: '#E3FCEF', text: '#006644', label: 'Converted' },
};

export const TYPE_CONFIG: Record<IdeaType, { bg: string; text: string; label: string }> = {
  opportunity:  { bg: '#F0FDF4', text: '#15803D', label: 'Opportunity' },
  solution:     { bg: '#FAF5FF', text: '#7C3AED', label: 'Solution' },
  feature:      { bg: '#EFF6FF', text: '#1D4ED8', label: 'Feature' },
  improvement:  { bg: '#FFF7ED', text: '#C2410C', label: 'Improvement' },
  problem:      { bg: '#FEF2F2', text: '#B91C1C', label: 'Problem' },
};

// ─── V12 PRIORITY BADGES — No amber/orange ───────────────────────
export const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  P1: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  P2: { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0' },
  P3: { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' },
  P4: { bg: '#F8FAFC', text: '#94A3B8', border: '#E2E8F0' },
};

export const VIEW_TITLES: Record<IdeationView, string> = {
  list: 'Ideas Backlog',
  board: 'Ideas Board',
  matrix: 'Impact Matrix',
  analytics: 'Ideas Analytics',
  drives: 'Ideas Drives',
};

export type StatusFilter = 'all' | IdeaStatus | 'my_ideas';

// ─── V12 FILTER DOTS — match 3-color guardrail ──────────────────
export const FILTER_PILLS: { key: StatusFilter; label: string; dot?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted', dot: '#64748B' },
  { key: 'under_review', label: 'Under Review', dot: '#0747A6' },
  { key: 'approved', label: 'Approved', dot: '#006644' },
  { key: 'converted', label: 'Converted', dot: '#006644' },
  { key: 'my_ideas', label: '⭐ My Ideas' },
];

// ─── Helpers ─────────────────────────────────────────────────────
export function getImpactColor(score: number) {
  if (score >= 4.0) return { gradient: 'linear-gradient(90deg, #16A34A, #22C55E)', text: '#16A34A' };
  if (score >= 3.0) return { gradient: 'linear-gradient(90deg, #2563EB, #3B82F6)', text: '#2563EB' };
  if (score >= 2.0) return { gradient: 'linear-gradient(90deg, #64748B, #94A3B8)', text: '#64748B' };
  return { gradient: 'linear-gradient(90deg, #CBD5E1, #E2E8F0)', text: '#94A3B8' };
}

// AI insight text for board cards (deprecated — use DB ai_summary)
export const AI_INSIGHTS: Record<string, string> = {};
