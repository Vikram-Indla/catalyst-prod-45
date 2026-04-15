export interface PhBoard {
  id: string;
  projectId: string;
  name: string;
  boardType: 'kanban' | 'scrum';
  columnConfig: PhBoardColumn[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PhBoardColumn {
  id: string;
  boardId: string;
  name: string;
  statusMapping: string[];
  position: number;
  wipLimit?: number;
  isDoneColumn: boolean;
}

export interface BoardIssue {
  id: string;
  summary: string;
  type: 'Story' | 'Task' | 'Bug' | 'Epic' | 'Improvement' | 'New Feature' | 'Subtask';
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  status: string;
  sp?: number;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  epicId?: string;
  epicName?: string;
  epicKey?: string;
  boardColumnId?: string;
  boardPosition?: number;
  labels?: string[];
  deletedAt?: string | null;
}

export interface Swimlane {
  epicId: string;
  epicKey: string;
  epicName: string;
  epicStatus: 'Backlog' | 'In Progress' | 'Done';
  totalCount: number;
  columns: SwimlaneColumn[];
}

export interface SwimlaneColumn {
  column: PhBoardColumn;
  issues: BoardIssue[];
}

export interface BoardUserPrefs {
  collapsedEpics: string[];
  assigneeFilter: string[];
  typeFilter: string[];
}

export interface BoardFilters {
  search: string;
  epicId: string | null;
  type: string | null;
  assigneeId: string | null;
  quickFilter: 'mine' | 'unassigned' | 'recently_updated' | null;
}

export interface DragState {
  draggingId: string | null;
  sourceColumnId: string | null;
  targetColumnId: string | null;
}

export interface MoveResult {
  success: boolean;
  error?: string;
}

export interface BoardAnalyticsEvent {
  boardId: string;
  eventType: 'card_moved' | 'board_viewed' | 'filter_applied' | 'swimlane_collapsed';
  issueId?: string;
  columnId?: string;
  metadata?: Record<string, unknown>;
}

export interface BoardLoadState {
  config: 'idle' | 'loading' | 'success' | 'error';
  issues: 'idle' | 'loading' | 'success' | 'error';
}

export interface ContextMenuState {
  issueId: string | null;
  x: number;
  y: number;
}
