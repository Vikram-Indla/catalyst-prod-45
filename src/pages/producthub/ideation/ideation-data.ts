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
}

// ─── IMPACT factor data per idea ──────────────────────────────────
export interface ImpactFactors {
  I: number; M: number; P: number; A: number; C: number; T: number;
}

export const IDEA_IMPACT_FACTORS: Record<string, ImpactFactors> = {
  'IDH-001': { I: 4.5, M: 4.7, P: 4.2, A: 4.8, C: 3.5, T: 4.0 },
  'IDH-002': { I: 4.0, M: 3.8, P: 3.5, A: 4.2, C: 3.8, T: 4.0 },
  'IDH-003': { I: 3.5, M: 3.2, P: 3.8, A: 3.0, C: 3.5, T: 4.0 },
  'IDH-004': { I: 3.8, M: 3.5, P: 3.6, A: 3.8, C: 4.0, T: 3.5 },
  'IDH-005': { I: 4.8, M: 4.5, P: 4.6, A: 4.5, C: 4.2, T: 5.0 },
  'IDH-006': { I: 2.5, M: 2.8, P: 3.0, A: 2.5, C: 3.2, T: 3.0 },
  'IDH-007': { I: 3.0, M: 3.2, P: 3.5, A: 3.0, C: 3.0, T: 3.2 },
  'IDH-008': { I: 2.5, M: 2.5, P: 2.8, A: 2.5, C: 2.8, T: 2.8 },
  'IDH-009': { I: 1.5, M: 1.2, P: 1.5, A: 1.8, C: 1.5, T: 1.5 },
  'IDH-010': { I: 3.2, M: 3.0, P: 3.5, A: 3.2, C: 3.5, T: 3.5 },
  'IDH-011': { I: 4.2, M: 4.0, P: 4.5, A: 4.0, C: 4.0, T: 4.2 },
  'IDH-012': { I: 2.2, M: 2.5, P: 2.5, A: 2.2, C: 2.5, T: 2.8 },
  'IDH-013': { I: 4.5, M: 4.2, P: 4.0, A: 4.5, C: 4.0, T: 4.5 },
  'IDH-014': { I: 3.5, M: 3.2, P: 3.5, A: 3.2, C: 3.5, T: 3.5 },
  'IDH-015': { I: 4.0, M: 4.2, P: 4.0, A: 4.0, C: 4.0, T: 4.2 },
};

// ─── Data ────────────────────────────────────────────────────────
export const ideas: Idea[] = [
  { key: 'IDH-001', title: 'Unified Digital Services Portal', subtitle: 'Ministry Directive · Feb 5', status: 'converted', type: 'opportunity', priority: 'P1', impact: 4.40, votes: 12, initiative: 'INIT-001', dept: 'Digital Trans.', assignee: { name: 'Sarah K.', initials: 'SK', color: '#0D9488' }, ai: 'ready' },
  { key: 'IDH-002', title: 'AI-Powered Permit Classification', subtitle: 'Research · Feb 6', status: 'under_review', type: 'solution', priority: 'P1', impact: 3.90, votes: 8, initiative: null, dept: 'IT Ops', assignee: { name: 'Ahmed M.', initials: 'AM', color: '#2563EB' }, ai: 'ready' },
  { key: 'IDH-003', title: 'Real-Time Factory Compliance Dashboard', subtitle: 'Stakeholder · Feb 7', status: 'submitted', type: 'feature', priority: 'P2', impact: 3.50, votes: 5, initiative: null, dept: 'Data & Analytics', assignee: { name: 'Fatima R.', initials: 'FR', color: '#D97706' }, ai: 'pending' },
  { key: 'IDH-004', title: 'Bilingual Document Generation Engine', subtitle: 'Internal · Feb 8', status: 'under_review', type: 'feature', priority: 'P2', impact: 3.70, votes: 9, initiative: null, dept: 'Digital Trans.', assignee: { name: 'Omar H.', initials: 'OH', color: '#6366F1' }, ai: 'ready' },
  { key: 'IDH-005', title: 'Investor Onboarding Simplification', subtitle: 'Customer · Feb 9', status: 'approved', type: 'improvement', priority: 'P1', impact: 4.60, votes: 15, initiative: null, dept: 'Customer Exp.', assignee: { name: 'Sarah K.', initials: 'SK', color: '#0D9488' }, ai: 'ready' },
  { key: 'IDH-006', title: 'Predictive Maintenance for Legacy Systems', subtitle: 'Internal · Feb 10', status: 'under_review', type: 'solution', priority: 'P2', impact: 2.80, votes: 6, initiative: 'INIT-002', dept: 'IT Ops', assignee: { name: 'Layla S.', initials: 'LS', color: '#E11D48' }, ai: 'ready' },
  { key: 'IDH-007', title: 'Mobile-First Inspection App', subtitle: 'Stakeholder · Feb 10', status: 'submitted', type: 'feature', priority: 'P2', impact: 3.20, votes: 4, initiative: null, dept: 'Risk & Comp.', assignee: { name: 'Khalid B.', initials: 'KB', color: '#0D9488' }, ai: 'ready' },
  { key: 'IDH-008', title: 'Open Data Portal for Industry Statistics', subtitle: 'Ministry · Feb 11', status: 'draft', type: 'opportunity', priority: 'P3', impact: 2.60, votes: 0, initiative: null, dept: 'Data & Anal.', assignee: null, ai: 'pending' },
  { key: 'IDH-009', title: 'Blockchain-Based Certificate Verification', subtitle: 'Research · Feb 12', status: 'rejected', type: 'solution', priority: 'P3', impact: 1.50, votes: -2, initiative: null, dept: 'Cybersecurity', assignee: null, ai: 'ready' },
  { key: 'IDH-010', title: 'Stakeholder Communication Hub', subtitle: 'Internal · Feb 13', status: 'submitted', type: 'feature', priority: 'P2', impact: 3.30, votes: 7, initiative: null, dept: 'Customer Exp.', assignee: { name: 'Nora A.', initials: 'NA', color: '#EA580C' }, ai: 'ready' },
  { key: 'IDH-011', title: 'Automated Regulatory Impact Assessment', subtitle: 'Research · Feb 14', status: 'under_review', type: 'opportunity', priority: 'P1', impact: 4.20, votes: 11, initiative: null, dept: 'Digital Trans.', assignee: { name: 'Ahmed M.', initials: 'AM', color: '#2563EB' }, ai: 'ready' },
  { key: 'IDH-012', title: 'Employee Skills Gap Analysis Tool', subtitle: 'Internal · Feb 14', status: 'draft', type: 'feature', priority: 'P3', impact: 2.40, votes: 0, initiative: null, dept: 'HR', assignee: null, ai: 'pending' },
  { key: 'IDH-013', title: 'Integrated Payment Gateway for Ministry Fees', subtitle: 'Customer · Feb 15', status: 'converted', type: 'feature', priority: 'P1', impact: 4.30, votes: 14, initiative: 'INIT-002', dept: 'IT Ops', assignee: { name: 'Layla S.', initials: 'LS', color: '#E11D48' }, ai: 'ready' },
  { key: 'IDH-014', title: 'Carbon Footprint Tracking Module', subtitle: 'Ministry · Feb 16', status: 'submitted', type: 'opportunity', priority: 'P2', impact: 3.40, votes: 6, initiative: null, dept: 'Data & Anal.', assignee: { name: 'Fatima R.', initials: 'FR', color: '#D97706' }, ai: 'ready' },
  { key: 'IDH-015', title: 'Cross-Ministry Data Sharing Framework', subtitle: 'Internal · Feb 17', status: 'under_review', type: 'solution', priority: 'P1', impact: 4.10, votes: 10, initiative: null, dept: 'IT Ops', assignee: { name: 'Khalid B.', initials: 'KB', color: '#0D9488' }, ai: 'ready' },
];

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

// AI insight text for board cards
export const AI_INSIGHTS: Record<string, string> = {
  'IDH-001': '✦ 12 citizen services consolidated — 40% reduction target',
  'IDH-002': '✦ 94.2% classification accuracy in pilot',
  'IDH-004': '✦ Bilingual compliance: DGA-ACC-01 mandate',
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
