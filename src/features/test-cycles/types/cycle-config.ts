// ============================================================================
// MODULE 4A-2: Test Cycle Configuration - Type Definitions
// ============================================================================

// Cycle status
export type CycleStatus = 'planned' | 'in_progress' | 'completed' | 'archived';
export type CycleTestCaseStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';
export type CycleRole = 'lead' | 'tester' | 'reviewer';

// Cycle milestone
export interface CycleMilestone {
  id: string;
  cycle_id: string;
  name: string;
  target_date: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
}

// Tester workload
export interface TesterWorkload {
  assigned: number;
  completed: number;
  passed: number;
  failed: number;
}

// Cycle assignment (tester)
export interface CycleAssignment {
  id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  role: CycleRole;
  assigned_at: string;
  workload: TesterWorkload;
}

// Cycle statistics
export interface CycleStats {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  not_run: number;
}

// Cycle detail (full)
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

// Full cycle with milestones and assignments
export interface CycleWithDetails {
  cycle: CycleDetail;
  milestones: CycleMilestone[];
  assignments: CycleAssignment[];
}

// Create milestone input
export interface CreateMilestoneInput {
  cycle_id: string;
  name: string;
  target_date: string;
  description?: string;
}

// Update milestone input
export interface UpdateMilestoneInput {
  milestone_id: string;
  name?: string;
  target_date?: string;
  description?: string;
  is_completed?: boolean;
}

// Assign tester input
export interface AssignTesterInput {
  cycle_id: string;
  user_id: string;
  role?: CycleRole;
  notes?: string;
}

// Status config for UI
export const CYCLE_STATUS_CONFIG: Record<CycleStatus, { label: string; color: string; bgColor: string }> = {
  planned: { label: 'Planned', color: 'hsl(var(--muted-foreground))', bgColor: 'hsl(var(--muted))' },
  in_progress: { label: 'In Progress', color: 'hsl(217 91% 60%)', bgColor: 'hsl(217 91% 60% / 0.1)' },
  completed: { label: 'Completed', color: 'hsl(142 71% 45%)', bgColor: 'hsl(142 71% 45% / 0.1)' },
  archived: { label: 'Archived', color: 'hsl(0 0% 45%)', bgColor: 'hsl(0 0% 45% / 0.1)' },
};

export const CYCLE_ROLE_CONFIG: Record<CycleRole, { label: string; color: string }> = {
  lead: { label: 'Lead', color: 'hsl(217 91% 60%)' },
  tester: { label: 'Tester', color: 'hsl(142 71% 45%)' },
  reviewer: { label: 'Reviewer', color: 'hsl(38 92% 50%)' },
};
