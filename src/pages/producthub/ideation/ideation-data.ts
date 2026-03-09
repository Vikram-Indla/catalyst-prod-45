/**
 * Shared data, types, and config for the Ideation module.
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
}

// ─── IMPACT factor data per idea ──────────────────────────────────
export interface ImpactFactors {
  I: number; M: number; P: number; A: number; C: number; T: number;
}

export const IDEA_IMPACT_FACTORS: Record<string, ImpactFactors> = {};

// ─── Data (deprecated — use useIdeas() hook instead) ─────────────
export const ideas: Idea[] = [];

// ─── Config Maps ─────────────────────────────────────────────────
export const STATUS_CONFIG: Record<IdeaStatus, { dot: string; bg: string; text: string; label: string }> = {
  draft:        { dot: '#A1A1AA', bg: '#F4F4F5', text: '#71717A', label: 'Draft' },
  submitted:    { dot: '#2563EB', bg: '#DBEAFE', text: '#1D4ED8', label: 'Submitted' },
  under_review: { dot: '#D97706', bg: '#FEF3C7', text: '#B45309', label: 'Under Review' },
  approved:     { dot: '#16A34A', bg: '#DCFCE7', text: '#15803D', label: 'Approved' },
  rejected:     { dot: '#EF4444', bg: '#FECACA', text: '#B91C1C', label: 'Rejected' },
  converted:    { dot: '#0D9488', bg: '#CCFBF1', text: '#0F766E', label: 'Converted' },
};

export const TYPE_CONFIG: Record<IdeaType, { bg: string; text: string; label: string }> = {
  opportunity:  { bg: '#F0FDF4', text: '#15803D', label: 'Opportunity' },
  solution:     { bg: '#FAF5FF', text: '#7C3AED', label: 'Solution' },
  feature:      { bg: '#EFF6FF', text: '#1D4ED8', label: 'Feature' },
  improvement:  { bg: '#FFF7ED', text: '#C2410C', label: 'Improvement' },
  problem:      { bg: '#FEF2F2', text: '#B91C1C', label: 'Problem' },
};

export const PRIORITY_CONFIG: Record<string, { bg: string; text: string }> = {
  P1: { bg: '#FECACA', text: '#991B1B' },
  P2: { bg: '#FED7AA', text: '#9A3412' },
  P3: { bg: '#E4E4E7', text: '#52525B' },
  P4: { bg: '#F4F4F5', text: '#A1A1AA' },
};

export const VIEW_TITLES: Record<IdeationView, string> = {
  list: 'Idea Backlog',
  board: 'Idea Board',
  matrix: 'Impact Matrix',
  analytics: 'Analytics',
  drives: 'Innovation Drives',
};

export type StatusFilter = 'all' | IdeaStatus | 'my_ideas';

export const FILTER_PILLS: { key: StatusFilter; label: string; dot?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted', dot: '#2563EB' },
  { key: 'under_review', label: 'Under Review', dot: '#D97706' },
  { key: 'approved', label: 'Approved', dot: '#16A34A' },
  { key: 'converted', label: 'Converted', dot: '#0D9488' },
  { key: 'my_ideas', label: '⭐ My Ideas' },
];

// ─── Helpers ─────────────────────────────────────────────────────
export function getImpactColor(score: number) {
  if (score >= 4.0) return { gradient: 'linear-gradient(90deg, #16A34A, #22C55E)', text: '#16A34A' };
  if (score >= 3.0) return { gradient: 'linear-gradient(90deg, #2563EB, #3B82F6)', text: '#2563EB' };
  if (score >= 2.0) return { gradient: 'linear-gradient(90deg, #D97706, #F59E0B)', text: '#D97706' };
  return { gradient: 'linear-gradient(90deg, #EF4444, #F87171)', text: '#EF4444' };
}

// AI insight text for board cards (deprecated — use DB ai_summary)
export const AI_INSIGHTS: Record<string, string> = {};
  'IDH-005': '✦ 67% onboarding drop-off rate — critical fix',
  'IDH-006': '✦ 3 legacy systems at EOL in Q3 2026',
  'IDH-007': '✦ Mobile adoption: 78% field inspector preference',
  'IDH-009': '✦ Blockchain ROI below threshold — defer',
  'IDH-010': '✦ 87% overlap with IDH-001 — merge candidate',
  'IDH-011': '✦ V2030 Pillar 1 alignment: 5/5',
  'IDH-013': '✦ 14 ministry fee types — single gateway',
  'IDH-014': '✦ ESG reporting mandate effective Q2 2026',
  'IDH-015': '✦ Cross-ministry data sharing: 5 ministries ready',
};
