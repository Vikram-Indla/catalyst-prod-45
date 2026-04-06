export interface HierarchyLevel {
  id: number;
  name: 'Epic' | 'Feature' | 'Story' | 'Sub-task';
  color: string;
  colorText: string;
  icon: string;
}

export interface WorkItemStatus {
  id: string;
  name: string;
  color: string;
  colorText: string;
  isTerminal?: boolean;
}

export interface WorkItemAssignee {
  id: string;
  displayName: string;
  email: string;
  avatar?: string;
}

export interface WorkItemPriority {
  name: string;
  color: string;
  colorText: string;
}

export interface WorkItemVersion {
  id: string;
  name: string;
}

export interface WorkItemStats {
  totalDescendants: number;
  completedCount: number;
}

export interface WorkItem {
  id: string;
  key: string;
  title: string;
  hierarchyLevel: number;
  hierarchyName: string;
  hierarchyColor: string;
  hierarchyColorText: string;
  parentId: string | null;
  parentKey?: string | null;
  parentSummary?: string | null;
  status: WorkItemStatus;
  assignee?: WorkItemAssignee;
  priority?: WorkItemPriority;
  fixVersion?: WorkItemVersion;
  children: WorkItem[];
  stats: WorkItemStats;
  dueDate?: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  /** Raw Jira issue_type for icon resolution */
  issueType?: string;
  /** Data source: 'jira' | 'catalyst' */
  source?: 'jira' | 'catalyst';
  /** Story points / estimate */
  storyPoints?: number;
  /** Reporter name */
  reporter?: string;
}

// Hierarchy Configuration (single source of truth)
export const HIERARCHY_LEVELS: HierarchyLevel[] = [
  { id: 1, name: 'Epic',     color: '#2563EB', colorText: '#1D4ED8', icon: 'zap' },
  { id: 2, name: 'Feature',  color: '#7C3AED', colorText: '#6D28D9', icon: 'puzzle' },
  { id: 3, name: 'Story',    color: '#16A34A', colorText: '#15803D', icon: 'book-open' },
  { id: 4, name: 'Sub-task', color: 'rgba(237,237,237,0.40)', colorText: '#475569', icon: 'list-checks' },
];

// Flexible parenting rules
export const PARENT_RULES: Record<number, number[]> = {
  1: [],       // Epic: no parent (root)
  2: [1],      // Feature: parent must be Epic
  3: [1, 2],   // Story: parent can be Epic OR Feature
  4: [3],      // Sub-task: parent must be Story
};

export function canBeParentOf(parentLevel: number, childLevel: number): boolean {
  return (PARENT_RULES[childLevel] ?? []).includes(parentLevel);
}

export function getHierarchyLevel(level: number): HierarchyLevel | undefined {
  return HIERARCHY_LEVELS.find((h) => h.id === level);
}
