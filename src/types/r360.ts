export interface R360Resource {
  id: string;
  rid: string;
  profile_id: string | null;
  name: string;
  role_name: string;
  department: string;
  vendor: string | null;
  resource_type: string | null;
  is_active: boolean;
}

export interface R360WorkItem {
  id: string;
  item_key: string;
  title: string;
  item_type: string;
  priority: string;
  status: string;
  status_category: string;
  status_label: string;
  status_color: string;
  status_bg: string;
  status_dot: string;
  project_key: string;
  project_name: string;
  assignee_name: string;
  reporter_name: string;
  parent_key: string | null;
  parent_title: string | null;
  sprint_name: string | null;
  story_points: number | null;
  fix_version: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  labels: string[];
  /** Days since assigned to this resource (not ticket creation) */
  age_days: number;
  age_class: 'green' | 'amber' | 'red';
  /** Date when this item was assigned to the current resource */
  assigned_at: string;
  /** Human-readable carry-over label e.g. "From W48" or "From Jan" */
  carried_from_label: string | null;
  group_date: string;
  date_label: string;
  /** 'Assignee' for directly assigned items, 'Contributor' for reported-by items */
  role_on_item: 'Assignee' | 'Contributor';
}

export interface R360Filters {
  status_categories?: string[];
  project_keys?: string[];
  item_types?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
  pending_only?: boolean;
}

export type R360ViewType = 'ring' | 'chronology' | 'board';

// ═══ R360 Profile Module Types (Stage A) ═══

export type ResourceAvailability = 'available' | 'high-load' | 'overloaded';

export type WorkItemStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export type WorkItemType = 'Bug' | 'Story' | 'Subtask' | 'Task' | 'Incident' |
  'Epic' | 'New Feature' | 'Improvement' | 'Changes' | 'Question';

export interface R360ProfileResource {
  id: string;
  resourceKey: string;
  fullName: string;
  role: string;
  department: string;
  skills: string[];
  availability: ResourceAvailability;
  avatarInitials: string;
  avatarGradientStart: string;
  avatarGradientEnd: string;
  openItemCount: number;
  roleAvgOpenCount: number;
}

export interface R360ProfileWorkItem {
  id: string;
  itemKey: string;
  title: string;
  status: WorkItemStatus;
  itemType: WorkItemType;
  hubSource: string;
  assigneeId: string;
  updatedAt: string;
  createdAt: string;
  ageDays: number;
}

export interface R360ActivityEvent {
  id: string;
  resourceId: string;
  workItemId: string;
  workItemKey: string;
  workItemTitle: string;
  workItemStatus: WorkItemStatus;
  workItemType: WorkItemType;
  eventTime: string;
  eventDate: string;
  dayName: string;
}

export interface R360WeeklyStats {
  resourceId: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  totalOpen: number;
  closedThisWeek: number;
  inReview: number;
  pickupSpeedHours: number;
  inProgressConcurrent: number;
  closedOfTouched: number;
  totalTouched: number;
  avgCycleTimeDays: number;
  oldestItemAgeDays: number;
  oldestItemKey: string;
  closureRatePct: number;
}

export interface R360ClosureTrendPoint {
  weekNumber: number;
  weekLabel: string;
  closedCount: number;
  isCurrent: boolean;
}

export interface R360WorkMixRow {
  itemType: WorkItemType;
  count: number;
  percentage: number;
  roleAvgPct: number;
}

export interface R360HubBreakdownRow {
  hubName: string;
  hubCode: string;
  isIncident: boolean;
  openCount: number;
  closedCount: number;
  totalCount: number;
  closurePct: number;
}
