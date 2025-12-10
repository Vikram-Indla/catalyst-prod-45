// Project Work Hub Types - Strict Hierarchy
// TOP: Feature → Story → (Subtask, Defect, Incident)

export type WorkItemType = 'FEATURE' | 'STORY' | 'SUBTASK' | 'DEFECT' | 'INCIDENT';

export type StatusCategory = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type Priority = 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST';

export interface WorkItem {
  id: string;
  key: string;
  type: WorkItemType;
  summary: string;
  description?: string;
  status: string;
  statusCategory: StatusCategory;
  priority: Priority;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  reporterId?: string;
  reporterName?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  quarterId?: string;
  quarterName?: string;
  releaseVersionId?: string;
  releaseVersionName?: string;
  programId?: string;
  epicId?: string;
  epicKey?: string;
  epicName?: string;
  parentId?: string;
  parentKey?: string;
  parentSummary?: string;
  isArchived?: boolean;
  // Child counts for Story cards
  subtaskCount?: number;
  defectCount?: number;
  incidentCount?: number;
  // Acceptance criteria for stories
  acceptanceCriteria?: AcceptanceCriterion[];
}

export interface AcceptanceCriterion {
  id: string;
  text: string;
  completed: boolean;
}

export interface WorkItemWithChildren extends WorkItem {
  children: WorkItemWithChildren[];
  hasChildren: boolean;
  level: number;
}

export interface ReleaseVersion {
  id: string;
  name: string;
  status: 'UNRELEASED' | 'RELEASED' | 'ARCHIVED';
  startDate?: string;
  releaseDate?: string;
  description?: string;
  progress: number;
  storiesCount: number;
  defectsCount: number;
  incidentsCount: number;
}

export interface Quarter {
  id: string;
  name: string; // Q1 2025, Q2 2025, etc.
  startDate: string;
  endDate: string;
}

export interface ProjectMetrics {
  completed: number;
  updated: number;
  created: number;
  dueSoon: number;
}

export interface StatusCount {
  status: string;
  count: number;
  color: string;
}

export interface PriorityCount {
  priority: Priority;
  count: number;
}

export interface TypeCount {
  type: WorkItemType;
  count: number;
  percentage: number;
}

// Board column definition
export interface BoardColumn {
  id: string;
  name: string;
  statusCategory: StatusCategory;
  statuses: string[];
}

// Swimlane definition
export interface Swimlane {
  id: string;
  name: string;
  avatar?: string;
  itemCount: number;
  items: WorkItem[];
}

// Filter state
export interface WorkHubFilters {
  search: string;
  types: WorkItemType[];
  statuses: string[];
  priorities: Priority[];
  assignees: string[];
  reporters: string[];
  quarters: string[];
  releaseVersions: string[];
  hasDefects?: boolean;
  hasIncidents?: boolean;
  unassigned?: boolean;
}

// Quick filter presets
export type QuickFilter = 
  | 'MY_OPEN_ITEMS'
  | 'HIGH_PRIORITY'
  | 'NEW_THIS_WEEK'
  | 'OVERDUE'
  | 'CURRENT_QUARTER'
  | 'UNASSIGNED';

// Board grouping options
export type BoardGrouping = 'NONE' | 'ASSIGNEE' | 'STATUS' | 'QUARTER' | 'PRIORITY';

// View mode for list
export type ListViewMode = 'HIERARCHY' | 'FLAT';

// Tab definitions
export type WorkHubTab = 'summary' | 'board' | 'list' | 'releases' | 'archived';

// Default board columns
export const DEFAULT_BOARD_COLUMNS: BoardColumn[] = [
  { id: 'open', name: 'OPEN', statusCategory: 'TODO', statuses: ['open', 'new', 'backlog'] },
  { id: 'assigned', name: 'ASSIGNED', statusCategory: 'TODO', statuses: ['assigned'] },
  { id: 'in_development', name: 'IN DEVELOPMENT', statusCategory: 'IN_PROGRESS', statuses: ['in_development', 'in_progress'] },
  { id: 'in_qa', name: 'IN QA', statusCategory: 'IN_PROGRESS', statuses: ['in_qa', 'testing'] },
  { id: 'qa_pass', name: 'QA PASS', statusCategory: 'IN_PROGRESS', statuses: ['qa_pass'] },
  { id: 'qa_fail', name: 'QA FAIL', statusCategory: 'IN_PROGRESS', statuses: ['qa_fail'] },
  { id: 'in_uat', name: 'IN UAT', statusCategory: 'IN_PROGRESS', statuses: ['in_uat', 'uat_testing'] },
  { id: 'done', name: 'DONE', statusCategory: 'DONE', statuses: ['done', 'closed', 'resolved'] },
];

// Status to category mapping
export const STATUS_CATEGORY_MAP: Record<string, StatusCategory> = {
  'open': 'TODO',
  'new': 'TODO',
  'backlog': 'TODO',
  'assigned': 'TODO',
  'in_development': 'IN_PROGRESS',
  'in_progress': 'IN_PROGRESS',
  'in_qa': 'IN_PROGRESS',
  'testing': 'IN_PROGRESS',
  'qa_pass': 'IN_PROGRESS',
  'qa_fail': 'IN_PROGRESS',
  'in_uat': 'IN_PROGRESS',
  'uat_testing': 'IN_PROGRESS',
  'done': 'DONE',
  'closed': 'DONE',
  'resolved': 'DONE',
};

// Type icons mapping
export const WORK_ITEM_TYPE_CONFIG: Record<WorkItemType, { label: string; color: string; icon: string }> = {
  FEATURE: { label: 'Feature', color: '#36B37E', icon: 'lightning' },
  STORY: { label: 'Story', color: '#36B37E', icon: 'bookmark' },
  SUBTASK: { label: 'Subtask', color: '#2684FF', icon: 'subtask' },
  DEFECT: { label: 'Defect', color: '#FF5630', icon: 'bug' },
  INCIDENT: { label: 'Incident', color: '#FF991F', icon: 'warning' },
};

// Priority config
export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  HIGHEST: { label: 'Highest', color: '#FF5630' },
  HIGH: { label: 'High', color: '#FF7452' },
  MEDIUM: { label: 'Medium', color: '#FFAB00' },
  LOW: { label: 'Low', color: '#36B37E' },
  LOWEST: { label: 'Lowest', color: '#6B778C' },
};
