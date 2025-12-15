// Kanban Module Types - Matching the frontend specification exactly

export type StatusId = 
  | 'new_request'
  | 'analyse'
  | 'approved'
  | 'implement'
  | 'closed'
  | 'rejected'
  | 'on_hold';

// Priority is now derived from business_score only, not stored in DB

export type DepartmentId = 
  | 'investment_ops'
  | 'investor_relations'
  | 'legal_compliance'
  | 'finance'
  | 'it_systems'
  | 'strategy';

export type GroupByOption = 'none' | 'assignee' | 'department' | 'business_owner';
export type ScoringFilter = 'all' | 'scored' | 'unscored';

export interface KanbanTicket {
  id: string;
  summary: string;
  status: StatusId;
  assignee: string | null;
  businessOwner: string | null;
  department: string | null;
  score: number | null;
  rank: number | null;
  epic: string | null;
  platform: string | null;
  createdAt: string;
  daysInColumn: number;
  _dbId?: string; // Database ID for opening drawers
}

export interface StatusConfig {
  id: StatusId;
  label: string;
  color: string;
  order: number;
}

// Priority configuration kept for visual styling but derived from score, not stored in DB
export interface PriorityConfig {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export interface DepartmentConfig {
  id: string;
  label: string;
  color: string;
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface BusinessOwner {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface GroupByConfig {
  id: GroupByOption;
  label: string;
  icon: string;
}

export interface ScoringOption {
  id: ScoringFilter;
  label: string;
  icon: string;
}

export interface SwimlaneGroup {
  label: string;
  color?: string;
  icon?: string;
  tickets: KanbanTicket[];
}

// Kanban colors - semantic token based for dark/light theme parity
export const KANBAN_COLORS = {
  // Primary Brand (kept for backwards compat but prefer tokens)
  olive: 'hsl(var(--secondary-green))',
  oliveLight: 'hsl(var(--secondary-green) / 0.7)',
  oliveDark: 'hsl(var(--secondary-green))',
  bronze: 'hsl(var(--secondary-bronze))',
  bronzeLight: 'hsl(var(--secondary-bronze) / 0.7)',
  bronzeDark: 'hsl(var(--secondary-bronze))',
  gold: 'hsl(var(--brand-gold))',
  goldLight: 'hsl(var(--brand-gold) / 0.7)',
  goldDark: 'hsl(var(--brand-gold))',
  champagne: 'hsl(var(--palette-beginner))',
  champagneLight: 'hsl(var(--palette-beginner) / 0.5)',
  champagneDark: 'hsl(var(--palette-beginner))',
  grey: 'var(--text-3)',
  greyLight: 'var(--surface-2)',
  greyDark: 'var(--text-2)',
  
  // Backgrounds - semantic tokens
  bgPage: 'var(--bg)',
  bgCard: 'var(--surface-1)',
  bgColumn: 'var(--surface-2)',
  bgHeader: 'var(--surface-1)',
  bgHover: 'var(--surface-3)',
  bgSelected: 'var(--accent-muted)',
  
  // Borders - semantic tokens
  borderLight: 'var(--border-color)',
  borderDefault: 'var(--border-strong)',
  
  // Text - semantic tokens
  textPrimary: 'var(--text-1)',
  textSecondary: 'var(--text-2)',
  textMuted: 'var(--text-3)',
  textLight: 'var(--text-muted)',
  
  // Status
  danger: 'hsl(var(--destructive))',
  warning: 'hsl(var(--y300))',
  info: 'hsl(var(--b400))',
  success: 'hsl(var(--g300))',
  purple: 'hsl(var(--p300))',
};

// Column configuration
export const COLUMNS_CONFIG: StatusConfig[] = [
  { id: 'new_request', label: 'New Request', color: KANBAN_COLORS.greyDark, order: 0 },
  { id: 'analyse', label: 'Analyse', color: KANBAN_COLORS.bronze, order: 1 },
  { id: 'approved', label: 'Approved', color: KANBAN_COLORS.purple, order: 2 },
  { id: 'implement', label: 'Implement', color: KANBAN_COLORS.success, order: 3 },
  { id: 'closed', label: 'Closed', color: KANBAN_COLORS.olive, order: 4 },
  { id: 'rejected', label: 'Rejected', color: KANBAN_COLORS.danger, order: 5 },
  { id: 'on_hold', label: 'On-Hold', color: KANBAN_COLORS.warning, order: 6 },
];

// Priority configuration
export const PRIORITIES: PriorityConfig[] = [
  { id: 'critical', label: 'Critical', color: KANBAN_COLORS.danger, icon: '🔴' },
  { id: 'high', label: 'High', color: KANBAN_COLORS.warning, icon: '🟠' },
  { id: 'medium', label: 'Medium', color: KANBAN_COLORS.info, icon: '🔵' },
  { id: 'low', label: 'Low', color: KANBAN_COLORS.success, icon: '🟢' },
];

// Department configuration
export const DEPARTMENTS: DepartmentConfig[] = [
  { id: 'investment_ops', label: 'Investment Operations', color: KANBAN_COLORS.olive },
  { id: 'investor_relations', label: 'Investor Relations', color: KANBAN_COLORS.bronze },
  { id: 'legal_compliance', label: 'Legal & Compliance', color: KANBAN_COLORS.purple },
  { id: 'finance', label: 'Finance', color: KANBAN_COLORS.info },
  { id: 'it_systems', label: 'IT & Systems', color: KANBAN_COLORS.success },
  { id: 'strategy', label: 'Strategy & Planning', color: KANBAN_COLORS.warning },
];

// Group By Options
export const GROUP_BY_OPTIONS: GroupByConfig[] = [
  { id: 'none', label: 'No Grouping', icon: '⊟' },
  { id: 'assignee', label: 'Assignee', icon: '👤' },
  { id: 'department', label: 'Department', icon: '🏢' },
  { id: 'business_owner', label: 'Business Owner', icon: '👔' },
];

// Scoring Filter Options
export const SCORING_OPTIONS: ScoringOption[] = [
  { id: 'all', label: 'All Requests', icon: '📋' },
  { id: 'scored', label: 'Scored', icon: '✅' },
  { id: 'unscored', label: 'Unscored', icon: '⏳' },
];
