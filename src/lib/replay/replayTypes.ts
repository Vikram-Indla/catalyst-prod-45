// Catalyst Replay — type contracts for the business rule engine.
// All inputs come from Supabase; outputs feed the React timeline surface.

export type StatusCategory = 'To Do' | 'In Progress' | 'Done';

// ─── Input types (from Supabase) ────────────────────────────────────────────

export interface WorkItemTransition {
  id: string;
  work_item_id: string; // ph_issues.id (uuid)
  from_status: string | null;
  to_status: string;
  from_status_category: string | null;
  to_status_category: string;
  transitioned_by: string;
  transitioned_by_avatar: string | null;
  transitioned_at: string; // ISO
  time_in_from_status_ms: number | null;
  jira_changelog_id: string;
}

export interface ReplayIssue {
  id: string; // ph_issues.id (uuid)
  issue_key: string; // e.g. "BAU-5609"
  issue_type: string; // "Story" | "Epic" | "Business Request" | etc.
  summary: string;
  parent_key: string | null;
  project_key: string; // "BAU" | "MDT" | etc.
  jira_created_at: string | null; // ISO — used as segment[0].startAt
  jira_updated_at: string | null;
  // Optional milestone fields pulled from raw_json or DB columns
  due_date?: string | null;
  target_start?: string | null;
  target_end?: string | null;
  sprint_end_date?: string | null;
  release_date?: string | null;
  // Product hub linkage
  business_request_id?: string | null;
}

// ─── Output types (consumed by the React surface) ───────────────────────────

export interface ReplaySegment {
  status: string;
  category: StatusCategory;
  startAt: string; // ISO
  endAt: string | null; // null = current/open
  durationMs: number | null;
  transitionedBy: string | null;
  transitionedByAvatar: string | null;
}

export interface ReplayDetour {
  // A backward move that persisted > OVERSIGHT_TOLERANCE_MS
  fromStatus: string; // status the issue regressed FROM
  toStatus: string; // status it regressed TO (lower rank)
  detourStartAt: string; // when the regression started
  detourEndAt: string | null; // when it moved forward again (null = still regressed)
  durationMs: number | null;
}

export type MilestoneType = 'sprint_end' | 'release' | 'due_date' | 'target_end';

export interface ReplayMilestone {
  type: MilestoneType;
  at: string; // ISO
  label: string;
}

export type AnnotationType = 'handover' | 'hold' | 'defect' | 'incident';

export interface ReplayAnnotation {
  type: AnnotationType;
  at: string; // ISO
  label: string;
  fromPerson?: string | null;
  toPerson?: string | null;
  avatarFrom?: string | null;
  avatarTo?: string | null;
}

export interface ReplayLane {
  issueKey: string;
  issueType: string;
  summary: string;
  parentKey: string | null;
  projectKey: string;
  moduleSource: string; // "Product · MDT" | "Project · BAU" | "Project · ICP"
  hierarchyLevel: number; // 0=BR/Epic, 1=Feature/Story, 2=Task/Sub-task/Bug
  segments: ReplaySegment[];
  detours: ReplayDetour[];
  milestones: ReplayMilestone[];
  annotations: ReplayAnnotation[];
  isScopeCreep: boolean; // issue created after parent's first non-To Do transition
  scopeCreepDaysAfterParent: number | null;
  overallStartAt: string | null;
  overallEndAt: string | null; // null = in flight
  totalDurationMs: number | null;
}

export interface ReplayOptions {
  // How long (ms) a backward move must persist to be a real detour vs oversight.
  // Default: 3_600_000 (1 hour)
  oversightToleranceMs?: number;
  // Minimum ms a parent must have been in progress before a child is "scope creep".
  // Default: 86_400_000 (1 day)
  scopeCreepThresholdMs?: number;
  // Issue types that appear as sub-tasks (excluded from main swimlanes per spec).
  subtaskTypes?: string[];
  // Known status rank overrides (status name → rank integer, lower = earlier in flow).
  // Engine uses category rank as fallback.
  statusRankOverrides?: Record<string, number>;
}

export interface ReplayResult {
  lanes: ReplayLane[];
  timelineStart: string; // earliest startAt across all lanes
  timelineEnd: string; // latest endAt (or now) across all lanes
  options: Required<ReplayOptions>;
}
