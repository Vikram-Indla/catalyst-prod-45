/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Types for Program Execution Workbench
 * Data model: Epic → Feature → Story (Tasks excluded)
 */

export type WorkbenchView = 'table' | 'gantt' | 'roadmap' | 'board' | 'swimlane';

export type HealthStatus = 'On Track' | 'At Risk' | 'Blocked';
export type ItemStatus = 'To Do' | 'In Progress' | 'Done' | 'Blocked';

export interface WorkItem {
  id: string;
  key: string;
  title: string;
  type: 'epic' | 'feature' | 'story';
  status: ItemStatus;
  health: HealthStatus;
  owner?: string;
  ownerInitials?: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  projectId?: string;
  projectName?: string;
  parentId?: string;
  children?: WorkItem[];
  dependencyCount: number; // TODO: wire to real dependency data when available
}

export interface Project {
  id: string;
  name: string;
}

export interface WorkbenchFilters {
  owners: string[];
  health: HealthStatus[];
  status: ItemStatus[];
  activeInPeriod: 'any' | 'this-quarter' | 'next-quarter' | 'custom';
  customRangeStart: Date | null;
  customRangeEnd: Date | null;
  hasDependencies: boolean | null; // TODO: Coming soon - dependency model integration
}

export const DEFAULT_WORKBENCH_FILTERS: WorkbenchFilters = {
  owners: [],
  health: [],
  status: [],
  activeInPeriod: 'any',
  customRangeStart: null,
  customRangeEnd: null,
  hasDependencies: null,
};

export const HEALTH_OPTIONS: HealthStatus[] = ['On Track', 'At Risk', 'Blocked'];
export const STATUS_OPTIONS: ItemStatus[] = ['To Do', 'In Progress', 'Done', 'Blocked'];
export const VIEW_OPTIONS: { value: WorkbenchView; label: string }[] = [
  { value: 'table', label: 'Table' },
  { value: 'gantt', label: 'Gantt' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'board', label: 'Board' },
  { value: 'swimlane', label: 'Swimlane' },
];
