/**
 * CATALYST ISSUE VIEW — TypeScript Contracts
 * ════════════════════════════════════════════════════════════════════════════
 * 3-column issue view (Left list | Center content | Right details)
 * Reference: Jira BAU-5394 design spec
 */

// ---------- Shared primitives ----------
export type IssueKey = string;
export type ISODateTime = string;
export type Id = string;

export type LozengeAppearance =
  | "default"
  | "success"
  | "inprogress"
  | "moved"
  | "removed"
  | "new"
  | "warning"
  | "error";

export interface UserRef {
  accountId: string;
  displayName: string;
  avatarUrl?: string;
}

export interface StatusRef {
  id: Id;
  name: string;
  category: "todo" | "inprogress" | "done";
  appearance: LozengeAppearance;
}

export interface PriorityRef {
  id: Id;
  name: string;
  rank?: number;
  iconUrl?: string;
  appearance?: LozengeAppearance;
}

export interface IssueTypeRef {
  id: Id;
  name: string;
  iconUrl?: string;
}

export interface IssueSummary {
  key: IssueKey;
  summary: string;
  issueType: IssueTypeRef;
  status: StatusRef;
  priority?: PriorityRef;
  assignee?: UserRef | null;
  updated?: ISODateTime;
  created?: ISODateTime;
}

// ---------- AllWork tab data model ----------
export interface AllWorkCounts {
  hierarchy: number;
  links: number;
  development: number;
  activity: number;
}

export interface HierarchyBlock {
  parent?: IssueSummary | null;
  children: IssueSummary[];
}

export type IssueLinkDirection = "outward" | "inward";

export interface LinkedIssue {
  linkTypeId: Id;
  linkTypeName: string;
  direction: IssueLinkDirection;
  issue: IssueSummary;
}

export interface LinkGroup {
  linkTypeId: Id;
  linkTypeName: string;
  items: LinkedIssue[];
}

export type DevItemType = "pullRequest" | "commit" | "branch" | "build" | "deployment";

export interface DevelopmentItem {
  id: Id;
  type: DevItemType;
  title: string;
  url: string;
  repoName?: string;
  state?: "open" | "merged" | "declined" | "passed" | "failed" | "in_progress" | "unknown";
  author?: UserRef;
  updated?: ISODateTime;
}

export interface DevelopmentBlock {
  items: DevelopmentItem[];
  countsByType: Record<DevItemType, number>;
}

export type ActivityType = "comment" | "history" | "worklog" | "attachment";

export interface ActivityItemBase {
  id: Id;
  type: ActivityType;
  actor: UserRef;
  created: ISODateTime;
}

export interface CommentActivity extends ActivityItemBase {
  type: "comment";
  bodyAdfOrMarkdown: string;
}

export interface HistoryChange {
  field: string;
  from?: string | null;
  to?: string | null;
}

export interface HistoryActivity extends ActivityItemBase {
  type: "history";
  changes: HistoryChange[];
}

export interface WorklogActivity extends ActivityItemBase {
  type: "worklog";
  timeSpentSeconds: number;
  comment?: string;
}

export interface AttachmentActivity extends ActivityItemBase {
  type: "attachment";
  filename: string;
  fileSizeBytes?: number;
  downloadUrl: string;
}

export type ActivityItem =
  | CommentActivity
  | HistoryActivity
  | WorklogActivity
  | AttachmentActivity;

export interface ActivityBlock {
  items: ActivityItem[];
  hasMore: boolean;
  nextCursor?: string;
}

export type ActivityFilter = "all" | "comments" | "history" | "worklog" | "attachments";

export interface AllWorkData {
  issue: IssueSummary;
  counts: AllWorkCounts;
  hierarchy: HierarchyBlock;
  links: LinkGroup[];
  development: DevelopmentBlock;
  activity: ActivityBlock;
}

// ---------- Permissions / capability flags ----------
export interface AllWorkCapabilities {
  canComment: boolean;
  canLinkIssues: boolean;
  canUnlinkIssues: boolean;
  canChangeParent: boolean;
  canCreateSubtask: boolean;
  canViewDevelopment: boolean;
}

// ---------- AllWork tab props ----------
export interface AllWorkTabProps {
  issueKey: IssueKey;
  data: AllWorkData | null;
  loading: boolean;
  error?: { message: string; retryable?: boolean } | null;
  activityFilter: ActivityFilter;
  onActivityFilterChange: (filter: ActivityFilter) => void;
  collapsed: {
    summary?: boolean;
    hierarchy?: boolean;
    links?: boolean;
    development?: boolean;
    activity?: boolean;
  };
  onToggleSection: (section: keyof AllWorkTabProps["collapsed"]) => void;
  capabilities: AllWorkCapabilities;
  onLinkIssue: () => void;
  onUnlinkIssue: (linkTypeId: Id, linkedIssueKey: IssueKey) => Promise<void>;
  onChangeParent: () => void;
  onCreateSubtask: () => void;
  onAddComment: (bodyAdfOrMarkdown: string) => Promise<void>;
  onLoadMoreActivity: (cursor?: string) => Promise<void>;
  onOpenIssue: (key: IssueKey, openMode: "select" | "newTab") => void;
}

// ---------- Fields tab types ----------
export interface FieldDefinition {
  key: string;
  label: string;
  type: "enum" | "user" | "issueLink" | "number" | "datetime" | "text" | "list" | "object" | "system";
  group: "status" | "people" | "hierarchy" | "dates" | "tracking" | "development";
  editable: boolean;
}

export interface FieldValue {
  key: string;
  value: string | number | null;
  displayValue: string;
}

export interface FieldsTabProps {
  issueKey: IssueKey;
  fields: FieldDefinition[];
  values: Record<string, FieldValue>;
  loading: boolean;
  onFieldChange: (fieldKey: string, newValue: unknown) => Promise<void>;
}

// ---------- 3-column shell contracts ----------
export interface IssueViewShellProps {
  projectKey: string;
  selectedIssueKey?: IssueKey;
  onSearch: (query: string) => void;
  onSelectIssue: (key: IssueKey) => void;
  onSyncUrlSelectedIssue: (key: IssueKey) => void;
  storageKey: string;
}

// ---------- Persisted UI keys (localStorage) ----------
export const STORAGE_KEYS = {
  layoutWidths: "allwork.layoutWidths",
  collapsedSections: (issueKey: string) => `allwork.${issueKey}.collapsed`,
  lastActivityFilter: "allwork.activityFilter",
} as const;

// ---------- Required UI behaviors ----------
export const BEHAVIOR = {
  selectionUpdatesCenterAndRight: true,
  urlHasSelectedIssueParam: true,
  cancelInFlightOnFastSwitch: true,
  refetchOnlyImpactedBlocksAfterMutation: true,
  permissionGatesEditControls: true,
} as const;
