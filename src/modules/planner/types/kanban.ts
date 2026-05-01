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
  primary: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
  primaryHover: 'var(--ds-background-brand-bold-hovered, var(--ds-background-brand-bold-hovered, #1d4ed8))',
  primaryLight: 'var(--ds-background-selected, var(--ds-background-selected, #eff6ff))',
  
  teal: '#0d9488',
  tealLight: '#f0fdfa',
  
  warning: 'var(--ds-text-warning, var(--ds-text-warning, #d97706))',
  warningLight: '#fffbeb',
  
  danger: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))',
  dangerLight: 'var(--ds-background-danger, var(--ds-background-danger, #fef2f2))',
  
  success: '#10b981',
  successLight: '#ecfdf5',
  
  purple: '#8b5cf6',
  purpleLight: '#f5f3ff',
  
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: 'var(--ds-border, var(--ds-border, #e5e7eb))',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
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
