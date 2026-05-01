// ============================================================================
// MODULE 4A-2: Test Cycle Configuration - Type Definitions
// Extended Lifecycle: draft → planned → active → paused → completed → archived
// ============================================================================

// Cycle status - full lifecycle enum matching database
export type CycleStatus = 'draft' | 'planned' | 'active' | 'paused' | 'completed' | 'archived';

// Status categories for grouping
export type CycleStatusCategory = 'draft' | 'in_progress' | 'completed' | 'archived';

export type CycleTestCaseStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';
export type CycleRole = 'lead' | 'tester' | 'reviewer';

// ============================================================================
// Status Transition Rules
// ============================================================================

/**
 * Valid status transitions as defined in the lifecycle:
 * draft → planned | archived
 * planned → active | archived
 * active → paused | completed
 * paused → active | archived
 * completed → archived
 * in_progress → paused | completed (legacy support)
 */
export const VALID_STATUS_TRANSITIONS: Record<CycleStatus, CycleStatus[]> = {
  draft: ['active', 'archived'],
  planned: ['active', 'archived'],
  active: ['paused', 'completed', 'archived'],
  paused: ['active', 'archived'],
  completed: ['archived'],
  archived: [],
};

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(from: CycleStatus, to: CycleStatus): boolean {
  if (from === to) return true;
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get allowed next statuses for a given status
 */
export function getAllowedNextStatuses(currentStatus: CycleStatus): CycleStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Get error message for invalid transition
 */
export function getTransitionErrorMessage(from: CycleStatus, to: CycleStatus): string {
  const allowed = VALID_STATUS_TRANSITIONS[from] || [];
  if (allowed.length === 0) {
    return `Cannot change status from "${from}" - this status is final.`;
  }
  return `Cannot transition from "${from}" to "${to}". Allowed: ${allowed.join(', ')}.`;
}

// ============================================================================
// Status Editability Rules
// ============================================================================

export interface StatusEditability {
  isEditable: boolean;
  editableFields: string[];
  lockedFields: string[];
  reason?: string;
}

/**
 * Get editability rules for a given status
 */
export function getStatusEditability(status: CycleStatus): StatusEditability {
  switch (status) {
    case 'draft':
    case 'planned':
      return {
        isEditable: true,
        editableFields: ['name', 'description', 'environment', 'planned_start', 'planned_end', 'release_id', 'assigned_to'],
        lockedFields: [],
      };
    case 'active':
    case 'paused':
      return {
        isEditable: true,
        editableFields: ['description', 'planned_end'],
        lockedFields: ['name', 'environment', 'planned_start', 'release_id'],
        reason: 'Limited editing while cycle is in progress',
      };
    case 'completed':
    case 'archived':
      return {
        isEditable: false,
        editableFields: [],
        lockedFields: ['name', 'description', 'environment', 'planned_start', 'planned_end', 'release_id', 'assigned_to'],
        reason: 'Cycle is read-only',
      };
  }
}

// ============================================================================
// Status Grouping for UI
// ============================================================================

/**
 * Map status to display category for grouping
 */
export function getStatusCategory(status: CycleStatus): CycleStatusCategory {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'active':
    case 'paused':
    case 'planned':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'archived':
      return 'archived';
  }
}

// ============================================================================
// KPI Inclusion Rules
// ============================================================================

/**
 * Check if status should be included in "Total Cycles" KPI
 * Excludes archived by default
 */
export function includeInTotalCycles(status: CycleStatus, includeArchived = false): boolean {
  if (status === 'archived') return includeArchived;
  return true;
}

/**
 * Check if status counts as "In Progress" for KPIs
 */
export function isInProgressStatus(status: CycleStatus): boolean {
  return status === 'active' || status === 'paused';
}

/**
 * Check if status should be included in Pass Rate calculation
 * Only active and completed cycles contribute to pass rate
 */
export function includeInPassRate(status: CycleStatus): boolean {
  return status === 'active' || status === 'completed';
}

/**
 * Check if status should be included in Avg Duration calculation
 * Only completed cycles have meaningful duration
 */
export function includeInAvgDuration(status: CycleStatus): boolean {
  return status === 'completed';
}

// ============================================================================
// Cycle Milestone
// ============================================================================

export interface CycleMilestone {
  id: string;
  cycle_id: string;
  name: string;
  target_date: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
}

// ============================================================================
// Tester Workload
// ============================================================================

export interface TesterWorkload {
  assigned: number;
  completed: number;
  passed: number;
  failed: number;
}

// ============================================================================
// Cycle Assignment
// ============================================================================

export interface CycleAssignment {
  id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  role: CycleRole;
  assigned_at: string;
  workload: TesterWorkload;
}

// ============================================================================
// Cycle Statistics
// ============================================================================

export interface CycleStats {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  not_run: number;
}

// ============================================================================
// Cycle Detail
// ============================================================================

export interface CycleDetail {
  id: string;
  project_id: string;
  cycle_key: string;
  name: string;
  description: string | null;
  status: CycleStatus;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  test_plan_id: string | null;
  created_at: string;
  stats: CycleStats;
}

// ============================================================================
// Full Cycle with Details
// ============================================================================

export interface CycleWithDetails {
  cycle: CycleDetail;
  milestones: CycleMilestone[];
  assignments: CycleAssignment[];
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateMilestoneInput {
  cycle_id: string;
  name: string;
  target_date: string;
  description?: string;
}

export interface UpdateMilestoneInput {
  milestone_id: string;
  name?: string;
  target_date?: string;
  description?: string;
  is_completed?: boolean;
}

export interface AssignTesterInput {
  cycle_id: string;
  user_id: string;
  role?: CycleRole;
  notes?: string;
}

// ============================================================================
// Status UI Configuration
// ============================================================================

// Atlaskit semantic-token fallback hexes (see types/views.ts).
export const CYCLE_STATUS_CONFIG: Record<CycleStatus, { label: string; color: string; bgColor: string }> = {
  draft: {
    // neutral muted
    label: 'draft',
    color: '#626F86',
    bgColor: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))'
  },
  planned: {
    // information
    label: 'planned',
    color: '#0747A6',
    bgColor: '#DEEBFF'
  },
  active: {
    // success
    label: 'active',
    color: '#006644',
    bgColor: '#E3FCEF'
  },
  paused: {
    // warning
    label: 'paused',
    color: '#974F0C',
    bgColor: '#FFF0B3'
  },
  completed: {
    // success
    label: 'completed',
    color: '#006644',
    bgColor: '#E3FCEF'
  },
  archived: {
    // neutral
    label: 'archived',
    color: '#42526E',
    bgColor: 'var(--ds-border, var(--ds-border, #DFE1E6))'
  },
};

// All statuses for filter dropdowns
export const ALL_CYCLE_STATUSES: CycleStatus[] = [
  'draft',
  'planned',
  'active',
  'paused',
  'completed',
  'archived',
];

// Active statuses (not archived/completed)
export const ACTIVE_CYCLE_STATUSES: CycleStatus[] = [
  'draft',
  'planned',
  'active',
  'paused',
];

export const CYCLE_ROLE_CONFIG: Record<CycleRole, { label: string; color: string }> = {
  lead: { label: 'Lead', color: '#0052CC' },       // information
  tester: { label: 'Tester', color: '#006644' },   // success
  reviewer: { label: 'Reviewer', color: '#974F0C' }, // warning
};
