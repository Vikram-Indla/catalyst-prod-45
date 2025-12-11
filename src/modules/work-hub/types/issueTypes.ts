// Jira-compatible Issue Types for All Work View
// Based on jira_research_brief.md and Jira REST API

export type StatusCategoryKey = 'new' | 'indeterminate' | 'done';

export interface StatusCategory {
  key: StatusCategoryKey;
  colorName: string;
}

export interface IssueStatus {
  name: string;
  statusCategory: StatusCategory;
}

export interface IssueType {
  name: string;
  iconUrl?: string;
}

export interface User {
  accountId: string;
  displayName: string;
  avatarUrls?: {
    '16x16'?: string;
    '24x24'?: string;
    '32x32'?: string;
    '48x48'?: string;
  };
}

export interface FixVersion {
  id: string;
  name: string;
  released?: boolean;
  releaseDate?: string;
}

export interface Priority {
  name: string;
  iconUrl?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  size: number;
  mimeType?: string;
  created: string;
  author?: User;
  content?: string;
}

export interface Comment {
  id: string;
  body: string;
  author: User;
  created: string;
  updated: string;
}

export interface IssueLink {
  id: string;
  type: {
    name: string;
    inward: string;
    outward: string;
  };
  inwardIssue?: {
    key: string;
    summary: string;
    status: IssueStatus;
    issuetype: IssueType;
  };
  outwardIssue?: {
    key: string;
    summary: string;
    status: IssueStatus;
    issuetype: IssueType;
  };
}

export interface Subtask {
  id: string;
  key: string;
  summary: string;
  status: IssueStatus;
  issuetype: IssueType;
  assignee?: User;
}

// List view issue (minimal fields for table)
export interface IssueListItem {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: IssueStatus;
    issuetype: IssueType;
    assignee?: User;
    reporter?: User;
    created: string;
    updated: string;
    fixVersions: FixVersion[];
    priority?: Priority;
    labels?: string[];
    parent?: {
      key: string;
      summary: string;
    };
  };
}

// Full issue detail
export interface IssueDetail extends IssueListItem {
  fields: IssueListItem['fields'] & {
    description?: {
      type: 'doc';
      version: number;
      content: any[];
    } | string;
    attachment?: Attachment[];
    comment?: {
      comments: Comment[];
      maxResults: number;
      total: number;
    };
    issuelinks?: IssueLink[];
    subtasks?: Subtask[];
    worklog?: {
      worklogs: any[];
      total: number;
    };
    components?: { id: string; name: string }[];
    duedate?: string;
    resolution?: { name: string } | null;
    resolutiondate?: string | null;
    // Custom fields
    customfield_10050?: string; // Service Now#
  };
}

export interface IssueSearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: IssueListItem[];
}

// Actions menu items as per research brief
export const ISSUE_ACTIONS = [
  { id: 'log-work', label: 'Log work', dividerAfter: false },
  { id: 'add-flag', label: 'Add flag', dividerAfter: false },
  { id: 'convert-subtask', label: 'Convert to Subtask', dividerAfter: true },
  { id: 'clone', label: 'Clone', dividerAfter: false },
  { id: 'move', label: 'Move', dividerAfter: false },
  { id: 'archive', label: 'Archive', dividerAfter: false },
  { id: 'delete', label: 'Delete', dividerAfter: true },
  { id: 'deep-clone', label: 'Deep Clone', dividerAfter: false },
  { id: 'deep-clone-preset', label: 'Deep Clone - Trigger Preset', dividerAfter: false },
  { id: 'sla-actions', label: 'Time to SLA Issue Actions', dividerAfter: true },
  { id: 'connect-slack', label: 'Connect Slack channel', dividerAfter: true },
  { id: 'print', label: 'Print', dividerAfter: false },
  { id: 'export-excel', label: 'Export Excel', dividerAfter: false },
  { id: 'export-word', label: 'Export Word', dividerAfter: false },
  { id: 'export-xml', label: 'Export XML', dividerAfter: false },
] as const;

// Activity tab types
export type ActivityTab = 'all' | 'comments' | 'history' | 'worklog' | 'timepiece' | 'sla-history' | 'approvals';

export const ACTIVITY_TABS: { id: ActivityTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'comments', label: 'Comments' },
  { id: 'history', label: 'History' },
  { id: 'worklog', label: 'Work log' },
  { id: 'timepiece', label: 'Timepiece' },
  { id: 'sla-history', label: 'SLA History' },
  { id: 'approvals', label: 'Approvals' },
];

// Quick comment actions
export const QUICK_COMMENT_ACTIONS = [
  { id: 'status-update', label: 'Status update...' },
  { id: 'thanks', label: 'Thanks...' },
  { id: 'agree', label: 'Agree...' },
];

// Status transition options
export interface StatusTransition {
  id: string;
  name: string;
  to: IssueStatus;
}

// Helper to get status lozenge colors
export function getStatusLozengeStyle(statusCategory: StatusCategoryKey): { bg: string; text: string } {
  switch (statusCategory) {
    case 'new':
      return { bg: 'bg-slate-100', text: 'text-slate-700' };
    case 'indeterminate':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'done':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700' };
  }
}

// Helper to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + ' ' + sizes[i];
}

// Helper to format date
export function formatIssueDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatIssueDateWithTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
