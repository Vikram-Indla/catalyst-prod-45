// ============================================================
// PLANNER KANBAN MODULE - TYPE DEFINITIONS
// ============================================================

export interface PlannerStatus {
  id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  is_default: boolean;
  is_completed_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface KanbanTask {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status_id: string;
  priority: KanbanTaskPriority;
  workstream_id: string | null;
  assignee_id: string | null;
  due_date: string | null;
  start_date: string | null;
  position: number;
  blocked: boolean;
  blocked_reason: string | null;
  progress: number;
  is_starred: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  cover_url: string | null;
  // Joined data
  status?: PlannerStatus;
  workstream?: KanbanWorkstream;
  assignee?: KanbanProfile;
}

export interface KanbanWorkstream {
  id: string;
  name: string;
}

export interface KanbanProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export type KanbanTaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface KanbanTaskFilters {
  search: string;
  priority: KanbanTaskPriority | 'all';
  assignee_id: string | 'all';
  workstream_id: string | 'all';
  status_slug?: string | null; // Filter by status slug (e.g., 'backlog', 'in-progress')
}

export type KanbanViewMode = 'board' | 'swimlane';

// Catalyst V5 Color Palette (spec-mandated)
export const CATALYST_COLORS = {
  primary: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))',
  primaryHover: 'var(--ds-background-brand-bold-hovered, #1d4ed8)',
  primaryLight: 'var(--ds-background-selected, #eff6ff)',
  
  teal: 'var(--ds-chart-teal-bold, #0d9488)',
  tealLight: 'var(--ds-background-success, #DFFCF0)',
  
  warning: 'var(--ds-text-warning, #d97706)',
  warningLight: 'var(--ds-background-warning, #FFF7D6)',
  
  danger: 'var(--ds-text-danger, #ef4444)',
  dangerLight: 'var(--ds-background-danger, #fef2f2)',
  
  success: 'var(--ds-background-success-bold, #059669)',
  successLight: 'var(--ds-background-success, #DFFCF0)',
  
  purple: 'var(--ds-background-discovery-bold, #8b5cf6)',
  purpleLight: 'var(--ds-background-discovery, #F3F0FF)',
  
  gray50: 'var(--ds-surface-sunken, #F7F8F9)',
  gray100: 'var(--ds-background-neutral-subtle, #F7F8F9)',
  gray200: 'var(--ds-border, #e5e7eb)',
  gray300: 'var(--ds-border, #DFE1E6)',
  gray400: 'var(--ds-text-disabled, #8590A2)',
  gray500: 'var(--ds-text-subtlest, #626F86)',
  gray600: 'var(--ds-text-subtlest, #626F86)',
  gray700: 'var(--ds-text-subtle, #44546F)',
  gray800: 'var(--ds-text, #172B4D)',
  gray900: 'var(--ds-text, #172B4D)',
} as const;

// Status color mapping by slug - Catalyst V5 semantic colors
export const STATUS_COLORS: Record<string, string> = {
  backlog: CATALYST_COLORS.gray400,
  planned: CATALYST_COLORS.primary,
  'in-progress': CATALYST_COLORS.warning,
  review: CATALYST_COLORS.teal,
  done: CATALYST_COLORS.success,
};

// Priority styles - Catalyst V5 semantic priority colors with icons
export const PRIORITY_STYLES: Record<KanbanTaskPriority, { 
  bg: string; 
  text: string; 
  border: string; 
  icon: string;
  borderLeft: string;
}> = {
  critical: { 
    bg: CATALYST_COLORS.dangerLight, 
    text: CATALYST_COLORS.danger, 
    border: CATALYST_COLORS.danger,
    icon: '⚠️',
    borderLeft: CATALYST_COLORS.danger,
  },
  high: { 
    bg: CATALYST_COLORS.warningLight, 
    text: CATALYST_COLORS.warning, 
    border: CATALYST_COLORS.warning,
    icon: '🔥',
    borderLeft: CATALYST_COLORS.warning,
  },
  medium: { 
    bg: CATALYST_COLORS.primaryLight, 
    text: CATALYST_COLORS.primary, 
    border: CATALYST_COLORS.primary,
    icon: '●',
    borderLeft: CATALYST_COLORS.primary,
  },
  low: { 
    bg: CATALYST_COLORS.gray100, 
    text: CATALYST_COLORS.gray500, 
    border: CATALYST_COLORS.gray300,
    icon: '○',
    borderLeft: CATALYST_COLORS.gray400,
  },
};

// Progress color helper - returns color based on percentage
export const getProgressColor = (progress: number): string => {
  if (progress >= 67) return CATALYST_COLORS.teal;
  if (progress >= 34) return CATALYST_COLORS.warning;
  return CATALYST_COLORS.gray400;
};

// Workstream colors - Catalyst V5 palette for differentiation
export const WORKSTREAM_COLORS = [
  { bg: CATALYST_COLORS.tealLight, text: CATALYST_COLORS.teal, dot: CATALYST_COLORS.teal },
  { bg: CATALYST_COLORS.primaryLight, text: CATALYST_COLORS.primary, dot: CATALYST_COLORS.primary },
  { bg: CATALYST_COLORS.warningLight, text: CATALYST_COLORS.warning, dot: CATALYST_COLORS.warning },
  { bg: CATALYST_COLORS.purpleLight, text: CATALYST_COLORS.purple, dot: CATALYST_COLORS.purple },
  { bg: CATALYST_COLORS.successLight, text: CATALYST_COLORS.success, dot: CATALYST_COLORS.success },
  { bg: CATALYST_COLORS.dangerLight, text: CATALYST_COLORS.danger, dot: CATALYST_COLORS.danger },
];

// Get workstream color by index (consistent per workstream name)
export function getWorkstreamColor(workstreamName: string) {
  const hash = workstreamName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return WORKSTREAM_COLORS[hash % WORKSTREAM_COLORS.length];
}
