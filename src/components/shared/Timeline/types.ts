/**
 * Shared types + sizing constants for the canonical Timeline shell.
 * Used by ProjectHubTimelinePage AND ProductHubTimelinePage.
 *
 * The TimelineIssue shape is the single normalized data contract every
 * data source feeds into TimelineView. Project hub maps ph_issues into
 * it; product hub maps business_requests into it.
 */

import type { ReactNode } from 'react';
import type { useQueryClient } from '@tanstack/react-query';

/* ─────────────────────────────── normalized issue ─────────────────────── */

export interface TimelineIssue {
  id: string;
  issueKey: string;
  projectKey: string;
  issueType: string;
  summary: string;
  status: string;
  statusCategory: string | null;
  priority: string | null;
  assigneeDisplayName: string | null;
  assigneeAvatarUrl: string | null;
  parentKey: string | null;
  startDate: string | null;
  dueDate: string | null;
  epicColor: string | null;
  fixVersions: string[];
  children: TimelineIssue[];
  /** Synthetic group header row (e.g. product hub's "Feature" bucket).
   *  Group rows render in the sidebar with collapse + per-group "+" but
   *  produce no bar/diamond/empty-row-add on the grid. Click does not open
   *  a detail view. The row's `issueType` is the group's type — clicking
   *  "+" creates a new BR inheriting that type. */
  isGroup?: boolean;
  /** Sparse rank for user-controlled ordering on the product hub timeline.
   *  Top-level rows read from `business_requests.display_order`; nested
   *  rows read from `ph_issues.position`. Used by the product-jira menu
   *  variant's "Move work item" submenu. */
  displayOrder?: number | null;
}

/* ─────────────────────────────── ui state types ───────────────────────── */

export type ZoomLevel = 'week' | 'month' | 'quarter';
export type OpenDropdown = 'type' | 'status' | 'assignee' | 'quick' | 'more' | null;

export interface FlatRow {
  issue: TimelineIssue;
  depth: number;
}

export interface EpicProgress {
  done: number;
  inProgress: number;
  toDo: number;
  total: number;
}

export interface HeaderCol { label: string; left: number; width: number; }

/* ─────────────────────────────── sizing constants ─────────────────────── */

export const ROW_H = 40;
export const DEFAULT_SIDEBAR_W = 384;
export const MIN_SIDEBAR_W = 350;
export const MAX_SIDEBAR_W = 560;
export const HEADER_H = 40;
export const BAR_H = 24;
export const BAR_RADIUS = 3;
export const MIN_BAR_W = 18;

export const ZOOM_PX_PER_DAY: Record<ZoomLevel, number> = { week: 28, month: 8, quarter: 3 };

export const STATUS_CAT_OPTIONS = [
  { value: 'done', label: 'Done', color: 'var(--ds-chart-success-bold, #94C748)' },
  { value: 'progress', label: 'In Progress', color: 'var(--ds-chart-information-bold, #8FB8F6)' },
  { value: 'default', label: 'To Do', color: 'var(--ds-background-neutral, #DDDEE1)' },
];

export const BUILT_IN_QUICK_FILTERS = [
  { value: 'unscheduled', label: 'Unscheduled' },
  { value: 'no_assignee', label: 'Unassigned' },
];

export const DEFAULT_WORK_ITEM_TYPES = [
  'Story', 'Epic', 'Feature', 'Task', 'Sub-task',
  'QA Bug', 'Production Incident', 'Change Request',
  'Business Gap', 'Backend', 'Frontend', 'Integration', 'Idea',
];

export const JIRA_EPIC_COLORS = [
  { label: 'Purple',  hex: '#8869AC' },
  { label: 'Blue',    hex: '#3C6FBB' },
  { label: 'Teal',    hex: '#3BAF85' },
  { label: 'Green',   hex: '#65C170' },
  { label: 'Yellow',  hex: '#F0C43F' },
  { label: 'Orange',  hex: '#F79231' },
  { label: 'Red',     hex: '#F04D44' },
  { label: 'Pink',    hex: '#E74A8E' },
];

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ─────────────────────────────── view props ───────────────────────────── */

export interface SavedFilterRow {
  id: string;
  name: string;
  filter_config?: Record<string, unknown>;
  jql_query?: string;
}

/**
 * Mutations are OPT-IN. Project hub provides them all. Product hub provides
 * none (read-only timeline). When a mutation is undefined, the corresponding
 * UI surface (drag handles, menu items, inline create) is hidden.
 */
export interface TimelineMutations {
  onUpdateDates?: (issueKey: string, startDate: string | null, dueDate: string | null) => Promise<void>;
  onRemoveDates?: (issueKey: string) => Promise<void>;
  onCreateEpic?: (summary: string) => Promise<TimelineIssue | null>;
  onCreateChild?: (parentKey: string, parentType: string, type: string, summary: string) => Promise<TimelineIssue | null>;
  onChangeParent?: (issueKey: string, newParentKey: string) => Promise<void>;
  onAddDependency?: (issueKey: string, linkType: string, targetKey: string) => Promise<void>;
  onRemoveDependency?: (issueKey: string, index: number) => Promise<void>;
  onMoveToRelease?: (issueKey: string, versionName: string) => Promise<void>;
  onChangeEpicColor?: (issueKey: string, hex: string) => Promise<void>;
  fetchIssueRawJson?: (issueKey: string) => Promise<any>;
  /** Reorder a row among its siblings. `direction` matches the Jira
   *  three-dots "Move work item" submenu (first / up / down / last).
   *  Top-level rows reorder within their product; nested rows reorder
   *  within their parent BR. */
  onReorderSibling?: (issueKey: string, direction: 'first' | 'up' | 'down' | 'last') => Promise<void>;
  /** Remove only one half of the date range. Used by the product-jira
   *  menu's "Remove dates" submenu. */
  onRemoveStartDate?: (issueKey: string) => Promise<void>;
  onRemoveDueDate?: (issueKey: string) => Promise<void>;
}

export interface TimelineFilterOptions {
  workItemTypes: string[];
  enableSavedFilters: boolean;
  savedFilters?: SavedFilterRow[];
}

export interface TimelineViewProps {
  /* data */
  items: TimelineIssue[];
  isLoading: boolean;
  error: unknown | null;

  /* chrome */
  chromeBand: ReactNode;            // page header rendered above the timeline
  hubLabel: string;                 // shown in the "releases" header row
  hubKey: string;                   // namespacing for localStorage (sidebar/panel width)

  /* filter options */
  filterOptions: TimelineFilterOptions;

  /* routing */
  buildIssueDetailRoute: (issueKey: string) => string;     // full-page navigation
  resolveItemType: (issue: TimelineIssue) => string;        // for detail panel itemType
  detailRouteOwnerKey: string;                              // project key for CatalystDetailPanel

  /* mutations (opt-in) */
  mutations?: TimelineMutations;

  /* feature flags */
  enableRowCheckbox?: boolean;
  enableRowProgress?: boolean;
  enableInlineCreate?: boolean;
  enableRowMenu?: boolean;
  enableBarDrag?: boolean;
  enableCreateEpicRow?: boolean;
  enableEmptyRowAdd?: boolean;
  enableDetailPanel?: boolean;

  /** Configures the bottom "Create" row in the sidebar. Defaults to the
   *  project-hub epic. Product hub overrides with a Business Request label. */
  createTopLevelConfig?: { label: string; iconType: string };

  /** Override the inline-create type picker options on every row. Product
   *  hub passes ['Business Request'] for the flat product timeline. */
  childTypesOverride?: string[];

  /** When true, only `isGroup` rows are allowed to have children. BR rows
   *  inside a group lose their "+" button. Default false. */
  childrenOnlyOnGroupRows?: boolean;

  /** When true, only top-level rows (depth === 0) can have children — the
   *  inline-create "+" hides on every nested row. Product hub uses this so
   *  BRs can spawn subtasks but those subtasks can't spawn their own
   *  grandchildren via the timeline. Default false. */
  childrenOnlyOnTopLevel?: boolean;

  /** Selects which three-dots menu component renders on each row.
   *  - `default`: legacy inline menu inside SidebarRow with Create child /
   *    Epic color / Move to release / Change parent / Edit deps / Edit
   *    dates / Remove dates (flat list).
   *  - `jira`: Jira-parity menu (ProductTimelineRowMenu) shared by every
   *    Catalyst timeline. Always renders Create / Move / Change parent /
   *    Change color / Edit dates / Remove dates / Edit dependencies with
   *    per-row disable based on context. */
  menuVariant?: 'default' | 'jira';

  /** Which entity kind the detail panel should dispatch to (forwarded to
   *  CatalystDetailPanel's `entityKind`). Defaults to 'ph_issue' (project
   *  hub / product hub legacy path). Tasks Hub passes 'task' so
   *  CatalystDetailRouter dispatches to TaskCatalystView. Added 2026-06-16
   *  for Phase 3 Tasks Timeline. */
  detailEntityKind?: 'ph_issue' | 'task' | 'release';

  /* the query client used for cache invalidations after mutations.
     Pages keep ownership of the cache key so the view never hardcodes it. */
  queryClient?: ReturnType<typeof useQueryClient>;
}
