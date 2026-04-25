// @ts-nocheck
/**
 * Universal Work View — type definitions.
 * See spec at /docs/uwv-spec.md (Forge G7 brief).
 */

export type HubSource = 'projecthub' | 'producthub' | 'incidenthub' | 'testhub' | 'releasehub';

export interface UWVParams {
  project: string;
  hubSource: HubSource[];
  scope?: 'quarter' | 'custom' | 'all';
  quarter?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  status?: string[];
  keys?: string[];
  title?: string;
  /** Optional list of issue types to restrict to (e.g. only 'Epic'). */
  issueTypes?: string[];
  /** Optional explicit list of epic keys whose children should also be loaded. */
  epicKeys?: string[];
  /** Optional data type hint for downstream consumers. */
  dataType?: 'epics' | 'incidents' | 'defects' | 'releases' | 'overdue' | 'onhold' | 'demand';
  /** Optional explicit ph_projects.id (used by ReleaseHealthUWV for canonical lookup). */
  projectId?: string;
  /** Optional list of fix_version names to filter ph_issues by (JSONB containment). */
  fixVersions?: string[];
  /** Gadget-forwarded filters (Layer 2 settings). All AND-combined when present. */
  statusFilter?: string[];
  assigneeFilter?: string[];
  itemTypeFilter?: string[];
  priorityFilter?: string[];
  releaseFilter?: string[];
  /** Human-readable label for the active date preset (e.g. "Q2 2026"). */
  dateLabel?: string;
}

export type ColumnType =
  | 'string'
  | 'user'
  | 'status'
  | 'date'
  | 'number'
  | 'type-icon'
  | 'hub'
  | 'comments';

export interface UWVColumn {
  fieldId: string;
  label: string;
  width: number;
  visible: boolean;
  sortable: boolean;
  type: ColumnType;
}

export interface UWVItem {
  id: string;
  key: string;
  summary: string;
  issueType: string;
  status: string;
  statusCategory: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeAvatar?: string | null;
  parentKey?: string | null;
  priority?: string | null;
  created?: string | null;
  updated?: string | null;
  dueDate?: string | null;
  commentCount?: number;
  hubSource: HubSource;
  level: 0 | 1 | 2;
}

export interface UWVSort {
  fieldId: string;
  direction: 'asc' | 'desc';
}

export interface UWVPrefs {
  version: 1;
  columns: { fieldId: string; width: number; visible: boolean }[];
  sort: UWVSort[];
  density: 'comfortable' | 'compact';
}

export interface UWVState {
  isOpen: boolean;
  params: UWVParams | null;
}
