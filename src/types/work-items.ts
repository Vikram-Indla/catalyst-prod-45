/**
 * CATALYST Work Items Module — TypeScript Types
 * Phase 1: Foundation Types
 */

// ═══════════════════════════════════════════════════════════════
// ENUMS & CONSTANTS
// ═══════════════════════════════════════════════════════════════

export type WorkItemType = 'story' | 'task' | 'defect' | 'subtask';

export type WorkItemStatus = 
  | 'backlog' 
  | 'ready' 
  | 'in_progress' 
  | 'in_review' 
  | 'blocked' 
  | 'done' 
  | 'closed';

export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';

export type SeverityLevel = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';

// ═══════════════════════════════════════════════════════════════
// STATUS CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const WORK_ITEM_STATUS_CONFIG: Record<WorkItemStatus, {
  label: string;
  bgColor: string;
  textColor: string;
}> = {
  backlog: {
    label: 'BACKLOG',
    bgColor: 'var(--ds-surface-sunken, #F7F8F9)',
    textColor: 'var(--ds-text-subtle, #44546F)'
  },
  ready: {
    label: 'READY',
    bgColor: 'var(--ds-background-information, #E9F2FF)',
    textColor: 'var(--ds-link-pressed, #1d4ed8)'
  },
  in_progress: {
    label: 'IN PROGRESS',
    bgColor: 'var(--ds-background-success, #DCFFF1)',
    textColor: 'var(--ds-chart-teal-bolder, #0f766e)'
  },
  in_review: {
    label: 'IN REVIEW',
    bgColor: 'var(--ds-background-warning, #FFF7D6)',
    textColor: 'var(--ds-background-warning-bold, #b45309)'
  },
  blocked: {
    label: 'BLOCKED',
    bgColor: 'var(--ds-background-danger, #FFECEB)',
    textColor: 'var(--cp-danger, #DC2626)'
  },
  done: {
    label: 'DONE',
    bgColor: 'var(--ds-background-success, #DFFCF0)',
    textColor: 'var(--ds-background-success-bold, #1F845A)'
  },
  closed: {
    label: 'CLOSED',
    bgColor: 'var(--ds-surface-sunken, #F7F8F9)',
    textColor: 'var(--ds-text-subtlest, #626F86)'
  },
};

// ═══════════════════════════════════════════════════════════════
// PRIORITY CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const PRIORITY_CONFIG: Record<PriorityLevel, {
  label: string;
  shortLabel: string;
  borderColor: string;
  showBorder: boolean;
}> = {
  P1: {
    label: 'Critical',
    shortLabel: 'P1',
    borderColor: 'var(--cp-danger, #DC2626)',
    showBorder: true
  },
  P2: {
    label: 'High',
    shortLabel: 'P2',
    borderColor: 'var(--ds-background-warning-bold, #f97316)',
    showBorder: true
  },
  P3: { 
    label: 'Medium', 
    shortLabel: 'P3',
    borderColor: 'transparent',
    showBorder: false 
  },
  P4: { 
    label: 'Low', 
    shortLabel: 'P4',
    borderColor: 'transparent',
    showBorder: false 
  },
};

// ═══════════════════════════════════════════════════════════════
// SEVERITY CONFIGURATION (Defects)
// ═══════════════════════════════════════════════════════════════

export const SEVERITY_CONFIG: Record<SeverityLevel, {
  label: string;
  shortLabel: string;
  color: string;
}> = {
  SEV1: { label: 'Blocker', shortLabel: 'SEV1', color: 'var(--cp-danger, #DC2626)' },
  SEV2: { label: 'Critical', shortLabel: 'SEV2', color: 'var(--cp-danger, #DC2626)' },
  SEV3: { label: 'Major', shortLabel: 'SEV3', color: 'var(--ds-background-warning-bold, #f97316)' },
  SEV4: { label: 'Minor', shortLabel: 'SEV4', color: 'var(--cp-amber, #F59E0B)' },
};

// ═══════════════════════════════════════════════════════════════
// TYPE ICON CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const TYPE_ICON_CONFIG: Record<WorkItemType, {
  bgColor: string;
  label: string;
}> = {
  story: { bgColor: 'var(--ds-chart-teal-bold, #0d9488)', label: 'Story' },    // Teal
  task: { bgColor: 'var(--cp-workstream-catalyst-primary, #2563eb)', label: 'Task' },      // Blue
  defect: { bgColor: 'var(--ds-background-danger-bold, #ef4444)', label: 'Defect' },  // Red
  subtask: { bgColor: 'var(--ds-text-subtlest, #626F86)', label: 'Subtask' }, // Gray
};

// ═══════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface WorkItem {
  id: string;
  key: string;
  sequence_number: number;
  type: WorkItemType;
  summary: string;
  description: string | null;
  acceptance_criteria: string | null;
  project_id: string;
  feature_id: string | null;
  parent_work_item_id: string | null;
  status: WorkItemStatus;
  assignee_id: string | null;
  reporter_id: string | null;
  priority: PriorityLevel;
  story_points: number | null;
  fixed_version_id: string | null;
  due_date: string | null;
  labels: string[] | null;
  severity: SeverityLevel | null;
  created_at: string;
  updated_at: string;
}

export interface WorkItemWithRelations extends WorkItem {
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  reporter?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  feature?: {
    id: string;
    name: string;
    display_id: string | null;
  } | null;
  fixed_version?: {
    id: string;
    name: string;
  } | null;
  parent_work_item?: {
    id: string;
    key: string;
    summary: string;
  } | null;
  subtasks?: WorkItem[];
}

export interface WorkItemFilters {
  type?: WorkItemType | 'all';
  status?: WorkItemStatus | 'all';
  assignee_id?: string | 'me' | 'all';
  feature_id?: string | 'all';
  fixed_version_id?: string | 'all';
  priority?: PriorityLevel | 'all';
  search?: string;
}

export interface WorkItemsState {
  items: WorkItemWithRelations[];
  selectedIds: Set<string>;
  focusedIndex: number;
  filters: WorkItemFilters;
  isLoading: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════

export const KEYBOARD_SHORTCUTS = [
  { key: '⌘K', label: 'Commands' },
  { key: 'C', label: 'Create Story' },
  { key: 'T', label: 'Create Task' },
  { key: 'D', label: 'Create Defect' },
  { key: 'J', label: 'Next row' },
  { key: 'K', label: 'Previous row' },
  { key: 'X', label: 'Select' },
  { key: 'Enter', label: 'Open' },
  { key: '?', label: 'Shortcuts' },
] as const;

// ═══════════════════════════════════════════════════════════════
// WORKFLOW TRANSITIONS
// ═══════════════════════════════════════════════════════════════

export const STATUS_WORKFLOW: Record<WorkItemStatus, WorkItemStatus[]> = {
  backlog: ['ready', 'in_progress'],
  ready: ['in_progress', 'backlog'],
  in_progress: ['in_review', 'blocked', 'ready'],
  in_review: ['done', 'in_progress', 'blocked'],
  blocked: ['in_progress', 'ready'],
  done: ['closed', 'in_progress'],
  closed: ['done'],
};
