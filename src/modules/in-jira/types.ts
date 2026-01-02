/**
 * In-Jira Module Types
 * Type definitions for the Jira-class project execution module
 */

// Issue types following canonical hierarchy
export type IssueType = 'feature' | 'story' | 'subtask' | 'defect' | 'incident';

// Issue priority levels
export type IssuePriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

// Issue status categories
export type StatusCategory = 'to-do' | 'in-progress' | 'done';

// Kanban column configuration
export interface KanbanColumn {
  id: string;
  name: string;
  statusCategory: StatusCategory;
  color: string;
  limit?: number;
  statuses: string[];
}

// Default Kanban columns
export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', name: 'Backlog', statusCategory: 'to-do', color: 'var(--color-status-todo)', statuses: ['backlog'] },
  { id: 'in-review', name: 'In Review', statusCategory: 'in-progress', color: 'var(--color-status-in-progress)', statuses: ['in-review'] },
  { id: 'ready-for-analysis', name: 'Ready for Analysis', statusCategory: 'in-progress', color: 'var(--color-status-in-progress)', statuses: ['ready-for-analysis'] },
  { id: 'implementation-review', name: 'Implementation Review', statusCategory: 'in-progress', color: 'var(--color-status-in-progress)', statuses: ['implementation-review'] },
  { id: 'under-implementation', name: 'Under Implementation', statusCategory: 'in-progress', color: 'var(--color-status-in-progress)', statuses: ['under-implementation'] },
  { id: 'done', name: 'Done', statusCategory: 'done', color: 'var(--color-status-done)', statuses: ['done'] },
];

// Issue interface
export interface Issue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  type: IssueType;
  status: string;
  statusCategory: StatusCategory;
  priority: IssuePriority;
  assigneeId?: string;
  reporterId?: string;
  epicId?: string;
  featureId?: string;
  storyPoints?: number;
  labels?: string[];
  components?: string[];
  fixVersions?: string[];
  sprintId?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  parentId?: string;
}

// Release/Version interface
export interface Version {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  released: boolean;
  archived: boolean;
  projectId: string;
  issueCount: number;
  doneCount: number;
  inProgressCount: number;
  toDoCount: number;
}

// Sprint interface (for Scrum board)
export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  state: 'future' | 'active' | 'closed';
  projectId: string;
}

// Quick filter interface
export interface QuickFilter {
  id: string;
  name: string;
  query: string;
  isActive: boolean;
}

// Board configuration
export interface BoardConfig {
  id: string;
  name: string;
  type: 'kanban' | 'scrum';
  projectId: string;
  columns: KanbanColumn[];
  quickFilters: QuickFilter[];
  swimlaneBy?: 'none' | 'assignee' | 'epic' | 'priority';
}

// KPI metrics for summary dashboard
export interface ProjectMetrics {
  totalIssues: number;
  doneIssues: number;
  inProgressIssues: number;
  toDoIssues: number;
  overdue: number;
  noAssignee: number;
  storyPointsTotal: number;
  storyPointsCompleted: number;
  velocityAvg: number;
  cycleTimeAvg: number;
}

// Issue type distribution
export interface TypeDistribution {
  type: IssueType;
  count: number;
  percentage: number;
}

// Priority breakdown
export interface PriorityBreakdown {
  priority: IssuePriority;
  count: number;
  percentage: number;
}

// Team workload
export interface TeamMemberWorkload {
  userId: string;
  userName: string;
  avatarUrl?: string;
  assignedCount: number;
  inProgressCount: number;
  storyPoints: number;
}

// Epic progress
export interface EpicProgress {
  epicId: string;
  epicName: string;
  epicKey: string;
  totalIssues: number;
  doneIssues: number;
  progressPercent: number;
  storyPointsTotal: number;
  storyPointsDone: number;
}

// Create issue form data
export interface CreateIssueData {
  projectKey: string;
  type: IssueType;
  summary: string;
  description?: string;
  priority?: IssuePriority;
  assigneeId?: string;
  labels?: string[];
  components?: string[];
  fixVersions?: string[];
  epicId?: string;
  parentId?: string;
  storyPoints?: number;
  dueDate?: string;
}
