/**
 * Resource 360° Drawer Types
 * Complete work context visualization for resources
 */

export interface Resource360Data {
  id: string;
  profile_id?: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar_url?: string;
  currentAllocation: number;
  availableCapacity: number;
}

export interface WorkItemAssignment {
  id: string;
  item_id: string;
  title: string;
  type: 'theme' | 'objective' | 'key_result' | 'epic' | 'feature' | 'story' | 'defect' | 'incident' | 'business_request';
  status: 'current' | 'future' | 'completed' | 'cancelled';
  level: 'enterprise' | 'program' | 'project' | 'product';
  project?: { id: string; name: string };
  parent?: { id: string; item_id: string; title: string; type: string };
  story_points?: number;
  allocation_percentage?: number;
  release_version?: string;
  start_date?: string;
  end_date?: string;
}

export interface HierarchyNode {
  id: string;
  item_id: string;
  title: string;
  type: 'theme' | 'objective' | 'key_result' | 'epic' | 'feature' | 'story' | 'defect' | 'incident' | 'business_request';
  status: 'current' | 'future' | 'completed';
  level: 'enterprise' | 'program' | 'project' | 'product';
  project?: string;
  story_points?: number;
  release_version?: string;
  children?: HierarchyNode[];
}

export interface SunburstNode {
  name: string;
  id?: string;
  value?: number;
  color?: string;
  type?: string;
  children?: SunburstNode[];
}

export interface SunburstMetrics {
  totalItems: number;
  totalStoryPoints: number;
  itemsByType: Record<string, number>;
  itemsByStatus?: {
    completed: number;
    in_progress: number;
    upcoming: number;
  };
}

export type DrawerTab = 'hierarchy' | 'sunburst';

// Work item type icons and colors config
export const WorkItemConfig = {
  theme: { color: '#0d9488', bgColor: 'bg-[#0d9488]/10', label: 'Theme', level: 'enterprise' },
  objective: { color: '#6b7280', bgColor: 'bg-[#6b7280]/10', label: 'Objective', level: 'enterprise' },
  key_result: { color: '#3b82f6', bgColor: 'bg-[#3b82f6]/10', label: 'Key Result', level: 'enterprise' },
  epic: { color: '#2563eb', bgColor: 'bg-[#2563eb]/10', label: 'Epic', level: 'program' },
  feature: { color: '#0d9488', bgColor: 'bg-[#0d9488]/10', label: 'Feature', level: 'project' },
  story: { color: '#10b981', bgColor: 'bg-[#10b981]/10', label: 'Story', level: 'project' },
  defect: { color: '#dc2626', bgColor: 'bg-[#dc2626]/10', label: 'Defect', level: 'project' },
  incident: { color: '#d97706', bgColor: 'bg-[#d97706]/10', label: 'Incident', level: 'project' },
  business_request: { color: '#22c55e', bgColor: 'bg-[#22c55e]/10', label: 'Business Request', level: 'product' },
} as const;

export const StatusConfig = {
  current: { color: '#0d9488', bgColor: 'bg-[#0d9488]/10', label: 'CURRENT' },
  future: { color: '#2563eb', bgColor: 'bg-[#2563eb]/10', label: 'FUTURE' },
  completed: { color: '#6b7280', bgColor: 'bg-[#6b7280]/10', label: 'COMPLETED' },
  cancelled: { color: '#dc2626', bgColor: 'bg-[#dc2626]/10', label: 'CANCELLED' },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// R360 V2 — Database-aligned interfaces (from G03 Schema)
// ═══════════════════════════════════════════════════════════════════════════════

export type R360Hub =
  | 'StrategyHub' | 'ProductHub' | 'ProjectHub' | 'ReleaseHub'
  | 'TestHub' | 'IncidentHub' | 'TaskHub';

export type R360WorkItemType =
  | 'Request' | 'Epic' | 'Feature' | 'Story' | 'Subtask' | 'Bug' | 'Task'
  | 'Test Case' | 'Test Plan' | 'Incident' | 'Release' | 'Requirement';

export type R360StatusCategory = 'todo' | 'progress' | 'done';
export type R360Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type R360ResourceRole = 'assigned' | 'reported';
export type R360ContractType = 'Fixed' | 'Variable' | 'Freelance';
export type R360LocationType = 'Onsite' | 'Off-Shore' | 'Hybrid';
export type R360ReleaseStatus = 'Planning' | 'In Progress' | 'Released' | 'Cancelled';
export type R360Verdict = 'on_track' | 'at_risk' | 'off_track';
export type R360ExportFormat = 'pdf' | 'docx' | 'xlsx';

export interface R360AuditFields {
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: string | null;
}

export interface R360Department extends R360AuditFields {
  id: string;
  deptCode: string;
  name: string;
  description: string | null;
}

export interface R360Vendor extends R360AuditFields {
  id: string;
  vendorCode: string;
  name: string;
}

export interface R360Assignment extends R360AuditFields {
  id: string;
  assignmentCode: string;
  name: string;
}

export interface R360Resource extends R360AuditFields {
  id: string;
  rid: string;
  userId: string | null;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  initials: string | null;
  jobRole: string;
  departmentId: string;
  assignmentId: string | null;
  contractStart: string;
  contractEnd: string;
  contractType: R360ContractType;
  vendorId: string;
  country: string;
  locationType: R360LocationType;
  ctc: number | null;
  isActive: boolean;
}

export interface R360Release extends R360AuditFields {
  id: string;
  releaseKey: string;
  name: string;
  startDate: string;
  endDate: string;
  status: R360ReleaseStatus;
}

export interface R360Project extends R360AuditFields {
  id: string;
  projectKey: string;
  name: string;
}

export interface R360WorkItem extends R360AuditFields {
  id: string;
  itemKey: string;
  title: string;
  description: string | null;
  workItemType: R360WorkItemType;
  sourceHub: R360Hub;
  status: string;
  statusCategory: R360StatusCategory;
  priority: R360Priority;
  projectId: string | null;
  releaseId: string | null;
  parentItemId: string | null;
  resourceId: string;
  resourceRole: R360ResourceRole;
  assignedBy: string | null;
  assignedDate: string;
  dueDate: string | null;
  resolvedDate: string | null;
  sourceTable: string | null;
  sourceId: string | null;
}

export interface R360StatusTransition {
  id: string;
  workItemId: string;
  fromStatus: string | null;
  toStatus: string;
  fromCategory: R360StatusCategory | null;
  toCategory: R360StatusCategory;
  transitionedAt: string;
  dwellDays: number | null;
  createdAt: string;
  createdBy: string | null;
}

export interface R360DeliveryMetrics {
  avgSubtaskDays: number;
  avgStoryDays: number;
  avgBugDays: number;
  pickupSpeedHours: number;
  weeklyClosureAvg: number;
  weeklyClosureHistory: number[];
  closureRatePct: number;
  totalAssigned: number;
  totalClosed: number;
}

export interface R360HubDistributionEntry { pct: number; items: number; }
export interface R360HubClosureEntry { closurePct: number; avgCycleDays: number | null; }

export interface R360RoleExpectationData {
  expected: string[];
  actualDistribution: Array<{ label: string; pct: number }>;
  anomalies: string[];
}

export interface R360AiProfile extends R360AuditFields {
  id: string;
  resourceId: string;
  resourcePattern: string;
  deliverySummary: string | null;
  strengthAnalysis: string | null;
  deliveryMetrics: R360DeliveryMetrics;
  hubDistribution: Record<R360Hub, R360HubDistributionEntry>;
  hubClosureRates: Record<R360Hub, R360HubClosureEntry>;
  roleExpectation: R360RoleExpectationData;
  generatedAt: string;
  generationVersion: string;
  nextRefreshAt: string | null;
}

export interface R360AiBehavioralPattern extends R360AuditFields {
  id: string;
  resourceId: string;
  patternText: string;
  evidenceRefs: string[];
  evidenceFilter: string | null;
  sortOrder: number;
}

export interface R360ProjectStandingEntry {
  project: string;
  items: number;
  done: number;
  statusEmoji: string;
}

export interface R360AiReleaseStanding extends R360AuditFields {
  id: string;
  resourceId: string;
  releaseId: string;
  totalItems: number;
  doneCount: number;
  progressCount: number;
  todoCount: number;
  completionPct: number;
  projectStandings: R360ProjectStandingEntry[];
  criticalPathItems: string[];
  verdict: R360Verdict;
  verdictText: string | null;
  confidenceScore: number | null;
  currentClosureRate: number | null;
  requiredClosureRate: number | null;
  snapshotDate: string;
}

export interface R360AiExport {
  id: string;
  resourceId: string;
  exportDate: string;
  exportFormat: R360ExportFormat;
  fileUrl: string | null;
  requestedBy: string;
  createdAt: string;
}

// View interfaces
export interface R360ResourceSummary {
  resourceId: string;
  fullName: string;
  jobRole: string;
  rid: string;
  totalItems: number;
  todoCount: number;
  progressCount: number;
  doneCount: number;
}

export interface R360WorkItemEnriched extends R360WorkItem {
  ageDays: number;
  resourceName: string;
  resourceInitials: string;
  resourceJobRole: string;
  assignedByName: string | null;
  projectName: string | null;
  projectKey: string | null;
  releaseKey: string | null;
  releaseEndDate: string | null;
  parentItemKey: string | null;
  effectiveDueDate: string | null;
  daysUntilDue: number | null;
}

export interface R360ResourceHubDistribution {
  resourceId: string;
  sourceHub: R360Hub;
  hubItemCount: number;
  hubPct: number;
  hubDoneCount: number;
  hubClosurePct: number;
}

export interface R360ChronologyEvent {
  resourceId: string;
  eventType: 'assigned' | 'status_change' | 'closed';
  eventDate: string;
  workItemId: string;
  itemKey: string;
  title: string;
  workItemType: R360WorkItemType;
  sourceHub: R360Hub;
  statusCategory: R360StatusCategory;
  actorName: string | null;
  releaseKey: string | null;
}

export interface R360GanttEntry {
  resourceId: string;
  workItemId: string;
  itemKey: string;
  title: string;
  workItemType: R360WorkItemType;
  statusCategory: R360StatusCategory;
  barStart: string;
  barEnd: string;
  barDays: number;
  releaseKey: string | null;
  projectName: string | null;
}

export interface R360ConstellationMember {
  resourceId: string;
  fullName: string;
  initials: string;
  jobRole: string;
  vendorId: string;
  vendorName: string;
  totalItems: number;
  doneItems: number;
  projectCount: number;
}

// Edge function types
export interface R360GenerateAiProfileRequest {
  resourceId: string;
  forceRefresh?: boolean;
}

export interface R360GenerateAiProfileResponse {
  success: boolean;
  profileId: string;
  generatedAt: string;
  sections: {
    resourcePattern: boolean;
    deliveryMetrics: boolean;
    hubDistribution: boolean;
    roleExpectation: boolean;
    behavioralPatterns: boolean;
    releaseStanding: boolean;
  };
}

export interface R360ExportPdfRequest {
  resourceId: string;
  exportDate: string;
  sections?: string[];
}

export interface R360ExportPdfResponse {
  success: boolean;
  exportId: string;
  fileUrl: string;
  generatedAt: string;
}

export interface R360TimeLapseRequest {
  resourceId: string;
  releaseId?: string;
}

export interface R360TimeLapseStep {
  stepIndex: number;
  date: string;
  eventType: 'assigned' | 'created' | 'resolved';
  workItem: R360WorkItemEnriched;
  assignerName: string;
  narrativeText: string;
}

export interface R360TimeLapseResponse {
  steps: R360TimeLapseStep[];
  totalSteps: number;
  dateRange: { start: string; end: string };
}

// ═══════════════════════════════════════════════════════════════════════════════
// R360 V3 — WorkHub-aligned types (from vw_wh_resource_360)
// ═══════════════════════════════════════════════════════════════════════════════

/** Single status transition event */
export interface StatusTransition {
  status: string;
  days: number;
  changed_at: string;
}

/** Main data row from vw_wh_resource_360 — one row per work item assigned to a resource */
export interface Resource360Item {
  resource_id: string;
  resource_name: string;
  resource_email: string;
  job_role: string;
  department: string;
  avatar_url: string | null;
  work_item_id: string;
  item_key: string;
  title: string;
  item_type: string;
  status: string;
  status_category: string;
  priority: string;
  hub: string;
  item_created_at: string;
  assigned_at: string;
  role_on_item: string;
  allocation_percent: number;
  age_days: number;
  project_name: string | null;
  project_key: string | null;
  release_name: string | null;
  release_end_date: string | null;
  release_status: string | null;
  parent_id: string | null;
  parent_key: string | null;
  parent_title: string | null;
  parent_type: string | null;
  parent_status: string | null;
  parent_hub: string | null;
  assigner_name: string | null;
  status_transitions: StatusTransition[];
  total_cycle_days: number;
}

/** Summary stats from vw_wh_resource_360_summary */
export interface Resource360Summary {
  resource_id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar_url: string | null;
  total_items: number;
  todo_count: number;
  progress_count: number;
  done_count: number;
  hub_count: number;
  project_count: number;
}

/** Sibling work item from fn_resource_360_siblings */
export interface Resource360Sibling {
  id: string;
  item_key: string;
  title: string;
  item_type: string;
  status: string;
  hub: string;
  assigner_name: string | null;
  age_days: number;
}

/** Status filter categories */
export type StatusCategory = 'all' | 'todo' | 'progress' | 'done';

/** Stale item indicator — returns badge info for items exceeding age thresholds */
export function getStaleIndicator(ageDays: number, status: string, statusCategory?: string): { icon: string; color: string; label: string } | null {
  const cat = getStatusCategory(status, statusCategory);
  if (cat === 'done') return null;
  if (ageDays > 21) return { icon: '⚠️', color: '#CA8A04', label: 'Critically stale (>21d)' };
  if (ageDays > 14) return { icon: '🔴', color: '#E23636', label: 'Stale (>14d)' };
  return null;
}

/** View modes for the 360° page */
export type ViewMode = 'ring' | 'chronology' | 'list' | 'board';

/** Quarter selector options */
export type Quarter = 'Q4-2025' | 'Q1-2026' | 'Q2-2026';

/** Time period bucket for progressive disclosure rings */
export interface RingPeriod {
  label: string;
  sub: string;
  startDate: string;
  endDate: string;
  items?: Resource360Item[];
}

/**
 * Status-to-category mapping helper.
 * Delegates to the shared admin-managed status mapping for consistency.
 */
export function getStatusCategory(status: string, statusCategory?: string): StatusCategory {
  // Inline logic matching the shared mapping to avoid circular imports
  // Uses Jira status_category first, then string matching
  if (statusCategory) {
    const cat = statusCategory.toLowerCase().trim();
    if (cat === 'done' || cat === 'complete') return 'done';
    if (cat === 'in progress' || cat === 'indeterminate' || cat === 'in review') return 'progress';
    if (cat === 'new' || cat === 'to do') return 'todo';
  }
  const s = status.toLowerCase().trim();
  const todoStatuses = ['to do', 'open', 'backlog', 'new', 'todo', 're-open', 'reopened',
    'awaiting info', 'on hold', 'reported', 'in requirements', 'ready for dev', 'ready for test'];
  const progressStatuses = [
    'in progress', 'in development', 'in design', 'in qa', 'in review',
    'in investigation', 'fix in progress', 'in fix', 'in execution',
    'active', 'under implementation', 'in entity integration', 'in beta',
    'in production', 'deferred for int', 'ready for development',
    'code review', 'ready for qa', 'retest', 'technical validation',
    'end to end testing', 'in testing', 'in uat', 'uat ready', 'qa pass', 'qa fail',
  ];
  const doneStatuses = ['done', 'resolved', 'closed', 'complete', 'completed',
    'ready for production', 'beta ready', 'production ready', 'monitor', 'released', 'verified', 'approved'];
  if (todoStatuses.includes(s)) return 'todo';
  if (progressStatuses.includes(s)) return 'progress';
  if (doneStatuses.includes(s)) return 'done';
  return 'todo';
}

/** Status category color tokens — Catalyst V5 compliant */
export const STATUS_COLORS: Record<StatusCategory, { bg: string; text: string; border: string; dot: string }> = {
  all:      { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB', dot: '#6B7280' },
  todo:     { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1', dot: '#64748B' },
  progress: { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD', dot: '#2563EB' },
  done:     { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7', dot: '#059669' },
};

/** Hub color mapping (V3) */
export const WH_HUB_COLORS: Record<string, string> = {
  StrategyHub:  '#7C3AED',
  ProductHub:   '#0D9488',
  ProjectHub:   '#2563EB',
  ReleaseHub:   '#D97706',
  TestHub:      '#DC2626',
  IncidentHub:  '#EF4444',
  TaskHub:      '#64748B',
};

/** Hub short names for badges (V3) */
export const WH_HUB_SHORT: Record<string, string> = {
  StrategyHub:  'STRAT',
  ProductHub:   'PROD',
  ProjectHub:   'PROJ',
  ReleaseHub:   'REL',
  TestHub:      'TEST',
  IncidentHub:  'INC',
  TaskHub:      'TASK',
};

// ═══════════════════════════════════════════════════════════
// RESOURCE 360° — Member Detail Interfaces (Stage A)
// Ring-fenced types for the /resource360/members/:memberId page
// Prefixed with R360MD_ to avoid collisions with existing R360 types
// ═══════════════════════════════════════════════════════════

export interface R360MDMember {
  id: string;
  full_name: string;
  role: string;
  department: string;
  team: string;
  email: string;
  avatar_url: string;
  capacity_hours: number;
  is_active: boolean;
}

export interface R360MDStatusConfig {
  id: string;
  name: string;
  category: 'unstarted' | 'started' | 'completed' | 'blocked';
  color: string;
  bg_color: string;
  dot_color: string;
  sort_order: number;
  is_terminal: boolean;
}

export interface R360MDWorkItem {
  id: string;
  item_key: string;
  title: string;
  item_type: 'bug' | 'task' | 'story' | 'epic' | 'subtask';
  priority: 'highest' | 'critical' | 'high' | 'medium' | 'low';
  project_id: string;
  assigned_to: string;
  parent_item_id: string | null;
  status_id: string;
  age_days: number;
  comments_count: number;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface R360MDChronologyItem {
  id: string;
  item_key: string;
  title: string;
  item_type: 'bug' | 'task' | 'story' | 'epic' | 'subtask';
  priority: 'highest' | 'critical' | 'high' | 'medium' | 'low';
  status_name: string;
  status_category: string;
  status_color: string;
  status_bg_color: string;
  status_dot_color: string;
  project_key: string;
  project_name: string;
  project_color: string;
  assignee_name: string;
  assignee_avatar: string;
  assigner_name: string;
  assigner_avatar: string;
  parent_key: string | null;
  parent_title: string | null;
  group_date: string;
  date_label: string;
  age_days: number;
  age_class: 'green' | 'amber' | 'red';
  release: string | null;
  due_date: string | null;
}

export interface R360MDDateGroupStats {
  group_date: string;
  date_label: string;
  total_count: number;
  done_count: number;
  in_progress_count: number;
  todo_count: number;
  blocked_count: number;
  progress_pct: number;
}

export interface R360MDMemberKpis {
  member_id: string;
  total_items: number;
  open_items: number;
  stale_items: number;
  closure_pct: number;
  avg_age_days: number;
}

export interface R360MDChronologyFilters {
  status_ids?: string[];
  project_ids?: string[];
  item_types?: Array<'bug' | 'task' | 'story' | 'epic' | 'subtask'>;
  date_from?: string;
  date_to?: string;
  search?: string;
  pending_only?: boolean;
  sort_by?: 'updated_at' | 'created_at' | 'priority';
  sort_dir?: 'asc' | 'desc';
}

export type R360ViewType = 'ring' | 'chronology' | 'board';

export interface R360MDPanelState {
  isOpen: boolean;
  item: R360MDChronologyItem | null;
}
