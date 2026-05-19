/** Type definitions for the CatalystJiraListView / @atlaskit/dynamic-table wrapper. */

export interface JiraStatusCategory {
  key: 'new' | 'indeterminate' | 'done' | string;
  colorName: string;
  name: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory: JiraStatusCategory;
}

export interface JiraIssueType {
  id: string;
  name: string;
  iconUrl: string;
}

export interface JiraParentIssue {
  id: string;
  key: string;
  summary: string;
  issueType: JiraIssueType;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  avatarUrl: string;
}

export interface JiraPriority {
  name: string;
  iconUrl: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  issueType: JiraIssueType;
  status: JiraStatus;
  priority: JiraPriority | null;
  assignee: JiraUser | null;
  reporter: JiraUser | null;
  created: string;
  updated: string;
  parent: JiraParentIssue | null;
  subtasks: JiraIssue[];
  /** Flattened hierarchy depth: 0 = root, 1 = subtask, etc. */
  depth: number;
  /** Jira project key (e.g. "BAU") */
  projectKey?: string;
}

export type VisibleColumnKey = 'checkbox' | 'work' | 'parent' | 'status' | 'columnConfig';

export interface CatalystJiraListViewProps {
  /** Flat + ordered issues (call buildFlattenedIssues first if hierarchical). */
  issues: JiraIssue[];
  /** Current 1-based page number. */
  currentPage: number;
  /** Whether a data fetch is in flight. */
  isLoading: boolean;
  /** Active sort column key. */
  sortKey: string;
  /** Active sort direction. */
  sortOrder: 'ASC' | 'DESC';
  /** Called by DynamicTable when user clicks a column header to sort. */
  onSort: (data: { key: string; sortOrder: 'ASC' | 'DESC' }) => void;
  /** Called by DynamicTable when user navigates to a page. */
  onSetPage: (page: number) => void;
  /** Called when a row item is opened (key cell click or row click). */
  onOpen?: (key: string) => void;
  /** Called when a status is changed via the inline dropdown. */
  onStatusChange?: (issueKey: string, newStatusId: string) => void;
  /** All available statuses for the project (for the inline status picker). */
  availableStatuses?: JiraStatus[];
  /** Columns to show. Defaults to all 5. */
  visibleColumns?: VisibleColumnKey[];
}

export interface CatalystJiraDynamicTableProps {
  issues: JiraIssue[];
  currentPage: number;
  isLoading: boolean;
  sortKey: string;
  sortOrder: 'ASC' | 'DESC';
  onSort: (data: { key: string; sortOrder: 'ASC' | 'DESC' }) => void;
  onSetPage: (page: number) => void;
  onOpen?: (key: string) => void;
  onStatusChange?: (issueKey: string, newStatusId: string) => void;
  availableStatuses?: JiraStatus[];
}

export interface WorkCellProps {
  issue: JiraIssue;
  onOpen: (key: string) => void;
}

export interface ParentCellProps {
  issue: JiraIssue;
  onOpen: (key: string) => void;
}

export interface StatusDropdownCellProps {
  issue: JiraIssue;
  onStatusChange: (issueKey: string, newStatusId: string) => void;
  availableStatuses?: JiraStatus[];
}
