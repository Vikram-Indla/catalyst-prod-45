/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Types for Program Execution Workbench
 * Data model: Epic → Feature → Story → Subtask (4 levels)
 */

export type WorkbenchView = 'table' | 'gantt' | 'roadmap' | 'board' | 'swimlane';

export type HealthStatus = 'On Track' | 'At Risk' | 'Blocked';
export type ItemStatus = 'Backlog' | 'In Progress' | 'Done' | 'Blocked';

export interface Owner {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface BusinessRequest {
  id: string;
  key: string;
  title: string;
}

export interface Theme {
  id: string;
  name: string;
}

export interface WorkItem {
  id: string;
  key: string;
  title: string;
  type: 'epic' | 'feature' | 'story' | 'subtask';
  status: ItemStatus;
  owner?: Owner | null;
  startDate?: string;
  endDate?: string;
  progress: number;
  projectId?: string;
  projectName?: string;
  parentId?: string;
  children?: WorkItem[];
  dependencyCount: number;
  // Epic-specific badges
  team?: string | null;
  businessRequest?: BusinessRequest | null;
  theme?: Theme | null;
}

export interface Project {
  id: string;
  name: string;
}

export interface WorkTreeCounts {
  epics: number;
  features: number;
  stories: number;
  subtasks: number;
}

export interface WorkbenchFilters {
  owners: string[];
  status: ItemStatus[];
  activeInPeriod: 'any' | 'this-quarter' | 'next-quarter' | 'custom';
  customRangeStart: Date | null;
  customRangeEnd: Date | null;
  hasDependencies: boolean | null;
}

export const DEFAULT_WORKBENCH_FILTERS: WorkbenchFilters = {
  owners: [],
  status: [],
  activeInPeriod: 'any',
  customRangeStart: null,
  customRangeEnd: null,
  hasDependencies: null,
};

export const STATUS_OPTIONS: ItemStatus[] = ['Backlog', 'In Progress', 'Done', 'Blocked'];
export const VIEW_OPTIONS: { value: WorkbenchView; label: string }[] = [
  { value: 'table', label: 'Table' },
  { value: 'gantt', label: 'Gantt' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'board', label: 'Board' },
  { value: 'swimlane', label: 'Swimlane' },
];

// Column configuration for table view
export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean; // Cannot be hidden
}

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'workItem', label: 'Work Item', visible: true, required: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'progress', label: 'Progress', visible: true },
  { id: 'owner', label: 'Owner', visible: true },
  { id: 'targetDate', label: 'Target Date', visible: true },
  { id: 'dependencies', label: 'Deps', visible: true },
  { id: 'actions', label: 'Actions', visible: true },
];

export type DensityMode = 'comfortable' | 'compact';
