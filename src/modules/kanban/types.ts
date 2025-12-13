// Kanban Module Types - Matching the frontend specification exactly

export type StatusId = 
  | 'new_request'
  | 'analyse'
  | 'approved'
  | 'implement'
  | 'closed'
  | 'rejected'
  | 'on_hold';

export type PriorityId = 'critical' | 'high' | 'medium' | 'low';

export type DepartmentId = 
  | 'investment_ops'
  | 'investor_relations'
  | 'legal_compliance'
  | 'finance'
  | 'it_systems'
  | 'strategy';

export type GroupByOption = 'none' | 'priority' | 'assignee' | 'department' | 'business_owner';
export type ScoringFilter = 'all' | 'scored' | 'unscored';

export interface KanbanTicket {
  id: string;
  summary: string;
  status: StatusId;
  priority: PriorityId;
  assignee: string | null;
  businessOwner: string | null;
  department: string | null;
  score: number | null;
  rank: number | null;
  epic: string | null;
  platform: string | null;
  dueDate: string | null;
  createdAt: string;
  daysInColumn: number;
}

export interface StatusConfig {
  id: StatusId;
  label: string;
  color: string;
  order: number;
}

export interface PriorityConfig {
  id: PriorityId;
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

// Kanban colors matching the specification exactly
export const KANBAN_COLORS = {
  // Primary Brand
  olive: '#5c7c5c',
  oliveLight: '#6d8d6d',
  oliveDark: '#4a6a4a',
  bronze: '#8b7355',
  bronzeLight: '#a08868',
  bronzeDark: '#6f5c44',
  gold: '#c69c6d',
  goldLight: '#d4ae85',
  goldDark: '#b8894f',
  champagne: '#d4b896',
  champagneLight: '#e5d4be',
  champagneDark: '#c4a67e',
  grey: '#c8ccd0',
  greyLight: '#e5e7eb',
  greyDark: '#9ca3af',
  
  // Backgrounds
  bgPage: '#ffffff',
  bgCard: '#ffffff',
  bgColumn: '#f8f9fa',
  bgHeader: '#ffffff',
  bgHover: '#fafafa',
  bgSelected: 'rgba(198, 156, 109, 0.08)',
  
  // Borders
  borderLight: '#e5e7eb',
  borderDefault: '#d1d5db',
  
  // Text
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
  
  // Status
  danger: '#dc2626',
  warning: '#f59e0b',
  info: '#3b82f6',
  success: '#22c55e',
  purple: '#8b5cf6',
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
  { id: 'priority', label: 'Priority', icon: '⚡' },
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
