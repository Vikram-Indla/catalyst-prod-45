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
  { id: 1, name: 'Epic',     color: 'var(--cp-workstream-catalyst-primary, #2563EB)', colorText: 'var(--ds-link-pressed, #1d4ed8)', icon: 'zap' },
  { id: 2, name: 'Feature',  color: 'var(--cp-purple-60, #7C3AED)', colorText: 'var(--ds-background-discovery-bold, #6d28d9)', icon: 'puzzle' },
  { id: 3, name: 'Story',    color: 'var(--cp-success, #16A34A)', colorText: 'var(--ds-background-success-bold, #1F845A)', icon: 'book-open' },
  { id: 4, name: 'Sub-task', color: 'var(--cp-ink-3, var(--cp-text-secondary, #64748B))', colorText: 'var(--ds-text-subtle, #44546F)', icon: 'list-checks' },
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
