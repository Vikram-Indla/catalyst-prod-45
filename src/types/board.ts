// Board Manager Type Definitions
// ProjectHub Kanban Board system

export type BoardVisibility = 'private' | 'project' | 'global';
export type SwimlaneType = 'none' | 'release' | 'assignee' | 'epic' | 'stories' | 'project' | 'jql';
export type CardColorMethod = 'none' | 'issue_type' | 'priorities' | 'assignees' | 'jql';
export type EpicDisplayMode = 'board' | 'panel';
export type ColumnConstraintType = 'none' | 'issue_count';

export interface WorkingDaysConfig {
  region: string;
  timezone: string;
  /** [Mon, Tue, Wed, Thu, Fri, Sat, Sun] */
  workdays: [boolean, boolean, boolean, boolean, boolean, boolean, boolean];
  nonWorkingDates: string[];
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  projectId: string | null;
  isPersonal: boolean;
  visibility: BoardVisibility;
  boardType: 'kanban' | 'scrum';
  swimlaneType: SwimlaneType;
  swimlaneJql: string | null;
  showSwimlanes: boolean;
  filterProjectIds: string[];
  filterConfig: Record<string, unknown>;
  boardQuery: string | null;
  subFilterQuery: string | null;
  completedIssuesCutoff: string | null;
  cardLayout: 'default' | 'compact';
  cardColors: Array<{ id: string; label: string; jql: string; color: string }>;
  cardColorMethod: CardColorMethod;
  cardExtraFields: string[];
  daysInColumnEnabled: boolean;
  workingDaysConfig: WorkingDaysConfig;
  timelineEnabled: boolean;
  timelineIncludeChildren: boolean;
  kanbanBacklogEnabled: boolean;
  epicDisplayMode: EpicDisplayMode;
  columnConstraintType: ColumnConstraintType;
  isStarred: boolean;
  sortOrder: number;
  lastViewedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  primaryWorkItemType?: string;
}

export interface BoardQuickFilter {
  id: string;
  boardId: string;
  name: string;
  filterType: string;
  filterValue: Record<string, unknown>;
  /** JQL query string (also mirrored in filterValue.jql for legacy compat) */
  jqlQuery: string | null;
  description: string | null;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface BoardListItem extends Board {
  columnCount: number;
  issueCount: number;
  createdByName: string | null;
  /** FK boards.filter_id → ph_saved_filters.id */
  filterId: string | null;
  /** Display name of the filter owner (board Lead) */
  leadName: string | null;
  leadAvatarUrl: string | null;
}

export interface BoardColumn {
  id: string;
  boardId: string;
  name: string;
  position: number;
  color: string | null;
  statusIds: string[];
  isBacklog: boolean;
  isDone: boolean;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: 'admin' | 'editor' | 'viewer';
  isStarred: boolean;
  lastViewedAt: string | null;
}

export interface KanbanCard {
  id: string;
  key: string;
  title: string;
  type: 'story' | 'task' | 'bug' | 'epic' | 'subtask' | 'improvement' | 'new_feature';
  statusId: string;
  rankValue: string;
  storyPoints: number | null;
  priority: { id: string; name: 'critical' | 'high' | 'medium' | 'low'; color: string } | null;
  assignee: { id: string; displayName: string; avatarUrl: string | null; initials: string } | null;
  release: { id: string; name: string } | null;
  epic: { id: string; key: string; title: string; color: string } | null;
  labels: Array<{ id: string; name: string; color: string }>;
  isBlocked: boolean;
  dueDate: string | null;
  swimlaneId: string;
  swimlaneName: string;
}

export interface CreateBoardInput {
  name: string;
  projectId?: string;
  isPersonal?: boolean;
  visibility?: BoardVisibility;
  boardType?: 'kanban' | 'scrum';
  swimlaneType?: SwimlaneType;
  color?: string;
  boardQuery?: string;
  filterId?: string;
  columns?: Array<{ name: string; isBacklog?: boolean; isDone?: boolean }>;
  isDefault?: boolean;
  primaryWorkItemType?: string;
}
