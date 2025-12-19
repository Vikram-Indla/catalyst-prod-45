/**
 * Dependency Framework Types
 * Work-item-centric dependency model
 */

// Work item types that can be part of a dependency
export type WorkItemDependencyType = 'epic' | 'feature';

// Dependency levels (auto-derived from work item types)
export type DependencyLevelV2 = 'execution' | 'delivery' | 'cross_level';

// Expanded dependency type semantics
export type DependencyTypeV2 = 
  | 'blocks' 
  | 'is_blocked_by' 
  | 'enables' 
  | 'provides_input' 
  | 'approves' 
  | 'governs'
  // Legacy types for backwards compatibility
  | 'sequential' 
  | 'concurrent' 
  | 'program' 
  | 'external';

// Dependency status lifecycle
export type DependencyStatus = 
  | 'draft'
  | 'pending_commit' 
  | 'committed' 
  | 'in_progress' 
  | 'delivered' 
  | 'cancelled'
  | 'not_required'
  // Legacy statuses
  | 'open'
  | 'negotiation'
  | 'done'
  | 'no_work_done'
  | 'rejected';

// Risk levels
export type RiskLevel = 'low' | 'med' | 'high';

// Container types derived from work items
export type ContainerType = 'program' | 'project';

/**
 * Core dependency interface for the new work-item-centric model
 */
export interface DependencyV2 {
  id: string;
  
  // Source work item (requesting)
  requesting_work_item_id: string | null;
  requesting_work_item_type: WorkItemDependencyType | null;
  
  // Target work item (depends on)
  depends_on_work_item_id: string | null;
  depends_on_work_item_type: WorkItemDependencyType | null;
  
  // Derived dependency level
  dependency_level_v2: DependencyLevelV2 | null;
  is_cross_level_exception: boolean;
  
  // Classification
  type: DependencyTypeV2 | null;
  risk_level: RiskLevel | null;
  
  // Scheduling
  quarter: string;
  needed_by_date: string | null;
  committed_by_date: string | null;
  quarter_derived_from_date: boolean;
  
  // Sprint fields (conditional)
  needed_by_sprint_id: string | null;
  committed_by_sprint_id: string | null;
  container_uses_sprints: boolean;
  
  // Ownership
  requestor_owner_id: string | null;
  respondent_owner_id: string | null;
  
  // Derived containers (read-only)
  derived_requesting_container_type: ContainerType | null;
  derived_requesting_container_id: string | null;
  derived_respondent_container_type: ContainerType | null;
  derived_respondent_container_id: string | null;
  
  // Status & workflow
  status: DependencyStatus | null;
  
  // Blocked state (replaces dual checkboxes)
  source_blocked: boolean;
  source_blocked_reason: string | null;
  source_blocked_at: string | null;
  source_blocked_by: string | null;
  target_delayed: boolean;
  target_delayed_reason: string | null;
  target_delayed_at: string | null;
  target_delayed_by: string | null;
  
  // Other flags
  no_work_required: boolean;
  
  // Description
  description: string | null;
  
  // Timestamps
  created_at: string | null;
  updated_at: string | null;
  
  // Legacy fields (for backwards compatibility)
  from_feature_id: string;
  to_feature_id: string;
  requesting_team_id: string | null;
  depends_on_team_id: string | null;
  requesting_project_id: string | null;
  depends_on_project_id: string | null;
  dependency_level: string | null;
}

/**
 * Work item reference for dependency pickers
 */
export interface WorkItemReference {
  id: string;
  type: WorkItemDependencyType;
  key: string;
  name: string;
  containerId: string | null;
  containerName: string | null;
  containerType: ContainerType | null;
}

/**
 * Container reference (derived)
 */
export interface ContainerReference {
  id: string;
  type: ContainerType;
  name: string;
}

/**
 * Dependency form data for the refactored drawer
 */
export interface DependencyFormData {
  // Work items
  requesting_work_item_id: string;
  requesting_work_item_type: WorkItemDependencyType;
  depends_on_work_item_id: string;
  depends_on_work_item_type: WorkItemDependencyType;
  
  // Classification
  type: DependencyTypeV2;
  risk_level: RiskLevel;
  
  // Scheduling
  needed_by_date: string;
  quarter: string;
  
  // Sprint (conditional)
  needed_by_sprint_id?: string;
  committed_by_sprint_id?: string;
  committed_by_date?: string;
  
  // Ownership
  requestor_owner_id?: string;
  respondent_owner_id?: string;
  
  // Status
  status: DependencyStatus;
  
  // Blocked state
  source_blocked: boolean;
  source_blocked_reason?: string;
  target_delayed: boolean;
  target_delayed_reason?: string;
  
  // Other
  no_work_required: boolean;
  description?: string;
}

/**
 * Dependency type labels for UI
 */
export const DEPENDENCY_TYPE_LABELS: Record<DependencyTypeV2, string> = {
  blocks: 'Blocks',
  is_blocked_by: 'Is Blocked By',
  enables: 'Enables',
  provides_input: 'Provides Input',
  approves: 'Approves',
  governs: 'Governs',
  sequential: 'Sequential (Legacy)',
  concurrent: 'Concurrent (Legacy)',
  program: 'Program (Legacy)',
  external: 'External (Legacy)',
};

/**
 * Dependency level labels for UI
 */
export const DEPENDENCY_LEVEL_LABELS: Record<DependencyLevelV2, string> = {
  execution: 'Execution Dependency (Epic ↔ Epic)',
  delivery: 'Delivery Dependency (Feature ↔ Feature)',
  cross_level: 'Cross-Level (Exception)',
};

/**
 * Status labels for UI
 */
export const DEPENDENCY_STATUS_LABELS: Record<DependencyStatus, string> = {
  draft: 'Draft',
  pending_commit: 'Pending Commit',
  committed: 'Committed',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  not_required: 'Not Required',
  open: 'Open (Legacy)',
  negotiation: 'Negotiation (Legacy)',
  done: 'Done (Legacy)',
  no_work_done: 'No Work Done (Legacy)',
  rejected: 'Rejected (Legacy)',
};
