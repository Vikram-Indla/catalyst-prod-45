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
  position: number;
  blocked: boolean;
  blocked_reason: string | null;
  progress: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
}

export type KanbanViewMode = 'board' | 'swimlane';

// Catalyst V5 Color Palette (spec-mandated)
export const CATALYST_COLORS = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryLight: '#eff6ff',
  
  teal: '#0d9488',
  tealLight: '#f0fdfa',
  
  warning: '#d97706',
  warningLight: '#fffbeb',
  
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  
  success: '#10b981',
  successLight: '#ecfdf5',
  
  purple: '#8b5cf6',
  purpleLight: '#f5f3ff',
  
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
} as const;

// Status color mapping by slug
export const STATUS_COLORS: Record<string, string> = {
  backlog: CATALYST_COLORS.gray400,
  planned: CATALYST_COLORS.primary,
  'in-progress': CATALYST_COLORS.warning,
  review: CATALYST_COLORS.purple,
  done: CATALYST_COLORS.success,
};

// Priority styles
export const PRIORITY_STYLES: Record<KanbanTaskPriority, { bg: string; text: string; border: string }> = {
  critical: { bg: CATALYST_COLORS.dangerLight, text: CATALYST_COLORS.danger, border: CATALYST_COLORS.danger },
  high: { bg: CATALYST_COLORS.warningLight, text: CATALYST_COLORS.warning, border: CATALYST_COLORS.warning },
  medium: { bg: CATALYST_COLORS.primaryLight, text: CATALYST_COLORS.primary, border: CATALYST_COLORS.primary },
  low: { bg: CATALYST_COLORS.gray100, text: CATALYST_COLORS.gray500, border: CATALYST_COLORS.gray300 },
};
