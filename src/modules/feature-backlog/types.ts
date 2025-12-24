/**
 * Feature Backlog Types
 */

export interface FeatureBacklogItem {
  id: string;
  key: string;
  summary: string;
  project_id: string | null;
  project_name: string | null;
  epic_id: string | null;
  epic_name: string | null;
  status: string | null;
  priority: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  health: string | null;
  progress_pct: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  owner_id: string | null;
  owner_name: string | null;
  change_number_id: string | null;
  change_number: string | null;
  labels: string[] | null;
}

export interface FeatureBacklogQueryParams {
  programId: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  epicId?: string | 'none';
  sortField: string;
  sortDirection: 'asc' | 'desc';
}

export interface FeatureBacklogResponse {
  items: FeatureBacklogItem[];
  total: number;
  page: number;
  pageSize: number;
}

export const FEATURE_COLUMNS = [
  { id: 'key', label: 'Key', width: 'w-24', pinned: true },
  { id: 'summary', label: 'Summary', width: 'min-w-[300px]', pinned: true },
  { id: 'project', label: 'Project', width: 'w-36', pinned: false },
  { id: 'epic', label: 'Epic', width: 'w-40', pinned: false },
  { id: 'status', label: 'Status', width: 'w-28', pinned: false },
  { id: 'priority', label: 'Priority', width: 'w-24', pinned: false },
  { id: 'assignee', label: 'Assignee', width: 'w-32', pinned: false },
  { id: 'updated', label: 'Updated', width: 'w-28', pinned: false },
];

export const OPTIONAL_COLUMNS = [
  { id: 'created', label: 'Created', width: 'w-28', pinned: false },
  { id: 'owner', label: 'Owner', width: 'w-32', pinned: false },
  { id: 'health', label: 'Health', width: 'w-24', pinned: false },
  { id: 'progress', label: 'Progress %', width: 'w-24', pinned: false },
  { id: 'planned_start', label: 'Planned Start', width: 'w-28', pinned: false },
  { id: 'planned_end', label: 'Planned End', width: 'w-28', pinned: false },
  { id: 'labels', label: 'Labels', width: 'w-32', pinned: false },
  { id: 'change_number', label: 'Change Number', width: 'w-28', pinned: false },
];

export const STATUS_OPTIONS = [
  { value: 'funnel', label: 'Funnel' },
  { value: 'analyzing', label: 'Analyzing' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'implementing', label: 'Implementing' },
  { value: 'done', label: 'Done' },
];

export const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
