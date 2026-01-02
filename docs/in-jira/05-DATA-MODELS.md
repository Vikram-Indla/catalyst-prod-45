# 5. Data Models & Types

## 5.1 TypeScript Type Definitions

### 5.1.1 Core Issue Types

```typescript
// File: src/modules/in-jira/types/index.ts

/**
 * Issue type enumeration
 * Matches Jira standard issue types
 */
export type IssueType = 
  | 'epic'
  | 'story'
  | 'task'
  | 'subtask'
  | 'bug'
  | 'feature'
  | 'spike'
  | 'improvement';

/**
 * Issue priority levels
 * Matches Jira priority scheme
 */
export type IssuePriority = 
  | 'highest'
  | 'high'
  | 'medium'
  | 'low'
  | 'lowest';

/**
 * Status category for workflow categorization
 */
export type StatusCategory = 
  | 'new'        // To Do category
  | 'indeterminate'  // In Progress category
  | 'done';      // Done category

/**
 * Sprint state enumeration
 */
export type SprintState = 
  | 'future'
  | 'active'
  | 'closed';

/**
 * Core Issue interface
 */
export interface Issue {
  id: string;
  tenantId: string;
  projectId: string;
  
  // Identification
  key: string;
  issueNumber: number;
  
  // Core fields
  summary: string;
  description?: string;
  issueType: IssueType;
  statusId: string;
  status: string;
  statusCategory: StatusCategory;
  priority: IssuePriority;
  resolution?: string;
  
  // Assignment
  assigneeId?: string;
  assignee?: User;
  reporterId?: string;
  reporter?: User;
  
  // Hierarchy
  parentId?: string;
  parent?: Issue;
  epicId?: string;
  epic?: Issue;
  children?: Issue[];
  
  // Agile
  storyPoints?: number;
  sprintId?: string;
  sprint?: Sprint;
  rank: string;
  
  // Version tracking
  fixVersionId?: string;
  fixVersion?: Version;
  affectedVersionId?: string;
  affectedVersion?: Version;
  
  // Dates
  dueDate?: string;
  startDate?: string;
  
  // Labels and components
  labels: string[];
  components: string[];
  
  // Import tracking
  externalId?: string;
  externalSource?: string;
  
  // AI features
  aiSuggestionsPending: boolean;
  
  // Custom fields
  customFields: Record<string, unknown>;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

/**
 * Issue creation payload
 */
export interface CreateIssuePayload {
  projectId: string;
  summary: string;
  description?: string;
  issueType: IssueType;
  priority?: IssuePriority;
  assigneeId?: string;
  parentId?: string;
  epicId?: string;
  sprintId?: string;
  storyPoints?: number;
  labels?: string[];
  dueDate?: string;
  customFields?: Record<string, unknown>;
}

/**
 * Issue update payload
 */
export interface UpdateIssuePayload {
  summary?: string;
  description?: string;
  priority?: IssuePriority;
  assigneeId?: string | null;
  parentId?: string | null;
  epicId?: string | null;
  sprintId?: string | null;
  storyPoints?: number | null;
  fixVersionId?: string | null;
  labels?: string[];
  dueDate?: string | null;
  customFields?: Record<string, unknown>;
}
```

### 5.1.2 Workflow Types

```typescript
/**
 * Workflow status definition
 */
export interface Status {
  id: string;
  tenantId: string;
  projectId?: string;
  name: string;
  description?: string;
  statusCategory: StatusCategory;
  color: string;
  icon?: string;
  sortOrder: number;
  isInitial: boolean;
  isFinal: boolean;
}

/**
 * Workflow transition definition
 */
export interface Transition {
  id: string;
  tenantId: string;
  workflowId: string;
  name: string;
  description?: string;
  fromStatusId?: string;  // null = global transition
  toStatusId: string;
  conditions: TransitionCondition[];
  validators: TransitionValidator[];
  postFunctions: PostFunction[];
  screenId?: string;
  sortOrder: number;
}

/**
 * Transition condition
 */
export interface TransitionCondition {
  type: 'permission' | 'field' | 'expression' | 'custom';
  config: {
    permission?: string;
    field?: string;
    operator?: string;
    value?: unknown;
    expression?: string;
    customClass?: string;
  };
}

/**
 * Transition validator
 */
export interface TransitionValidator {
  type: 'required_field' | 'regex' | 'custom';
  config: {
    field?: string;
    pattern?: string;
    message?: string;
    customClass?: string;
  };
}

/**
 * Post-function for transitions
 */
export interface PostFunction {
  type: 'update_field' | 'notify' | 'webhook' | 'custom';
  config: {
    field?: string;
    value?: unknown;
    recipients?: string[];
    webhookUrl?: string;
    customClass?: string;
  };
}

/**
 * Complete workflow definition
 */
export interface Workflow {
  id: string;
  tenantId: string;
  projectId?: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  issueTypes?: IssueType[];
  statuses: Status[];
  transitions: Transition[];
}
```

### 5.1.3 Board Types

```typescript
/**
 * Board type enumeration
 */
export type BoardType = 'kanban' | 'scrum' | 'simple';

/**
 * Board definition
 */
export interface Board {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  boardType: BoardType;
  filterJql?: string;
  isDefault: boolean;
  config: BoardConfig;
  columns: BoardColumn[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Board configuration
 */
export interface BoardConfig {
  swimlanes?: {
    type: 'none' | 'assignee' | 'epic' | 'priority' | 'custom';
    field?: string;
  };
  cardFields?: string[];
  quickFilters?: QuickFilter[];
  estimation?: {
    field: 'storyPoints' | 'timeOriginalEstimate';
    tracking: boolean;
  };
}

/**
 * Board column definition
 */
export interface BoardColumn {
  id: string;
  tenantId: string;
  boardId: string;
  name: string;
  statusIds: string[];
  minIssues?: number;
  maxIssues?: number;
  sortOrder: number;
}

/**
 * Quick filter definition
 */
export interface QuickFilter {
  id: string;
  name: string;
  jql: string;
  description?: string;
}

/**
 * Board issue for rendering
 */
export interface BoardIssue extends Issue {
  columnId: string;
  swimlaneId?: string;
}
```

### 5.1.4 Sprint Types

```typescript
/**
 * Sprint definition
 */
export interface Sprint {
  id: string;
  tenantId: string;
  projectId: string;
  boardId?: string;
  name: string;
  goal?: string;
  state: SprintState;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  committedPoints?: number;
  completedPoints?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sprint creation payload
 */
export interface CreateSprintPayload {
  projectId: string;
  boardId?: string;
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Sprint report data
 */
export interface SprintReport {
  sprintId: string;
  sprint: Sprint;
  completedIssues: Issue[];
  incompleteIssues: Issue[];
  addedDuringSprint: Issue[];
  removedFromSprint: Issue[];
  velocity: {
    committed: number;
    completed: number;
    percentage: number;
  };
  burndown: BurndownPoint[];
}

/**
 * Burndown chart data point
 */
export interface BurndownPoint {
  date: string;
  remaining: number;
  ideal: number;
  guideline: number;
}
```

### 5.1.5 Version Types

```typescript
/**
 * Version/Release definition
 */
export interface Version {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  released: boolean;
  archived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Version progress calculation
 */
export interface VersionProgress {
  versionId: string;
  version: Version;
  totalIssues: number;
  completedIssues: number;
  percentComplete: number;
  issuesByStatus: Record<string, number>;
}

/**
 * Version creation payload
 */
export interface CreateVersionPayload {
  projectId: string;
  name: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
}
```

### 5.1.6 Comment Types

```typescript
/**
 * Comment definition
 */
export interface Comment {
  id: string;
  tenantId: string;
  issueId: string;
  authorId: string;
  author?: User;
  body: string;
  bodyAdf?: AtlassianDocumentFormat;
  isInternal: boolean;
  visibilityType?: 'role' | 'group';
  visibilityValue?: string;
  editedAt?: string;
  editedBy?: string;
  externalId?: string;
  externalSource?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Atlassian Document Format for rich text
 */
export interface AtlassianDocumentFormat {
  type: 'doc';
  version: 1;
  content: AdfNode[];
}

/**
 * ADF node structure
 */
export interface AdfNode {
  type: string;
  content?: AdfNode[];
  text?: string;
  marks?: AdfMark[];
  attrs?: Record<string, unknown>;
}

/**
 * ADF mark for text styling
 */
export interface AdfMark {
  type: 'strong' | 'em' | 'code' | 'strike' | 'underline' | 'link';
  attrs?: Record<string, unknown>;
}
```

### 5.1.7 Audit Types

```typescript
/**
 * Audit log entry
 */
export interface AuditEntry {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  action: AuditAction;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Audit action types
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'transition'
  | 'assign'
  | 'comment'
  | 'attach'
  | 'link'
  | 'sprint_move'
  | 'rank_change';

/**
 * Change history item for UI display
 */
export interface HistoryItem {
  id: string;
  field: string;
  fromValue?: string;
  toValue?: string;
  actorId?: string;
  actorName: string;
  actorAvatar?: string;
  changedAt: string;
}
```

### 5.1.8 Import Types

```typescript
/**
 * Import job status
 */
export type ImportStatus =
  | 'pending'
  | 'analyzing'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Import job definition
 */
export interface ImportJob {
  id: string;
  tenantId: string;
  projectId?: string;
  sourceType: 'jira_cloud' | 'jira_server' | 'csv';
  sourceProjectKey?: string;
  status: ImportStatus;
  config: ImportConfig;
  totalItems: number;
  importedItems: number;
  failedItems: number;
  progressPercent: number;
  errorLog: ImportError[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  createdBy?: string;
}

/**
 * Import configuration
 */
export interface ImportConfig {
  manifest?: JiraManifest;
  userMapping?: Record<string, string>;
  statusMapping?: Record<string, string>;
  fieldMapping?: Record<string, string>;
  options?: {
    importComments: boolean;
    importAttachments: boolean;
    importHistory: boolean;
    dryRun: boolean;
  };
}

/**
 * Import error entry
 */
export interface ImportError {
  itemId: string;
  itemKey: string;
  error: string;
  timestamp: string;
}

/**
 * Jira export manifest structure
 */
export interface JiraManifest {
  projects?: JiraProject[];
  issues?: JiraIssue[];
  users?: JiraUser[];
  statuses?: JiraStatus[];
  issueTypes?: JiraIssueType[];
  customFields?: JiraCustomField[];
}

/**
 * Import diff report
 */
export interface ImportDiffReport {
  id: string;
  importJobId: string;
  reportData: {
    matchedIssues: MatchedIssue[];
    missingInTarget: string[];
    missingInSource: string[];
    fieldConflicts: FieldConflict[];
  };
  aiAnalysis?: string;
  totalSourceIssues: number;
  matchedIssues: number;
  missingInTarget: number;
  missingInSource: number;
  fieldConflicts: number;
  createdAt: string;
}

/**
 * Matched issue in diff report
 */
export interface MatchedIssue {
  sourceKey: string;
  targetId: string;
  targetKey: string;
}

/**
 * Field conflict in diff report
 */
export interface FieldConflict {
  issueKey: string;
  field: string;
  sourceValue: unknown;
  targetValue: unknown;
}
```

### 5.1.9 AI Types

```typescript
/**
 * AI suggestion types
 */
export type AISuggestionType =
  | 'priority'
  | 'assignee'
  | 'component'
  | 'label'
  | 'epic'
  | 'duplicate';

/**
 * AI suggestion definition
 */
export interface AISuggestion {
  id: string;
  tenantId: string;
  issueId: string;
  importJobId?: string;
  suggestionType: AISuggestionType;
  suggestionData: {
    value?: string;
    category?: string;
    confidence: number;
    reasoning: string;
    alternatives?: Array<{
      value: string;
      confidence: number;
    }>;
  };
  confidenceScore: number;
  isAccepted?: boolean;
  acceptedAt?: string;
  acceptedBy?: string;
  createdAt: string;
}
```

## 5.2 Zod Validation Schemas

```typescript
import { z } from 'zod';

/**
 * Issue creation schema
 */
export const createIssueSchema = z.object({
  projectId: z.string().uuid(),
  summary: z.string().min(1).max(500),
  description: z.string().optional(),
  issueType: z.enum(['epic', 'story', 'task', 'subtask', 'bug', 'feature', 'spike', 'improvement']),
  priority: z.enum(['highest', 'high', 'medium', 'low', 'lowest']).optional(),
  assigneeId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  epicId: z.string().uuid().optional(),
  sprintId: z.string().uuid().optional(),
  storyPoints: z.number().min(0).max(100).optional(),
  labels: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

/**
 * Sprint creation schema
 */
export const createSprintSchema = z.object({
  projectId: z.string().uuid(),
  boardId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  goal: z.string().max(500).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  },
  { message: 'End date must be after start date' }
);

/**
 * Version creation schema
 */
export const createVersionSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  startDate: z.string().optional(),
  releaseDate: z.string().optional(),
});

/**
 * Comment creation schema
 */
export const createCommentSchema = z.object({
  issueId: z.string().uuid(),
  body: z.string().min(1),
  isInternal: z.boolean().optional(),
});

/**
 * Transition schema
 */
export const transitionSchema = z.object({
  issueId: z.string().uuid(),
  transitionId: z.string().uuid(),
  toStatusId: z.string().uuid(),
  resolution: z.string().optional(),
  comment: z.string().optional(),
});
```

## 5.3 Database to TypeScript Mapping

| Database Column | TypeScript Property | Transformation |
|-----------------|---------------------|----------------|
| tenant_id | tenantId | Direct |
| project_id | projectId | Direct |
| issue_type | issueType | Direct |
| status_id | statusId | Direct |
| assignee_id | assigneeId | Direct |
| story_points | storyPoints | Direct |
| sprint_id | sprintId | Direct |
| fix_version_id | fixVersionId | Direct |
| due_date | dueDate | ISO string |
| created_at | createdAt | ISO string |
| updated_at | updatedAt | ISO string |
| custom_fields | customFields | JSONB parse |
