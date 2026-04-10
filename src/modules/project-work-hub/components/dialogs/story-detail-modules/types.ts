/**
 * StoryDetailModal — Shared TypeScript interfaces and type definitions
 * Extracted from StoryDetailModal.tsx for modularity
 */

export interface PhIssue {
  id: string;
  issue_key: string;
  summary: string;
  description_adf: any | null;
  description_text: string | null;
  status: string;
  status_category: string;
  priority: string | null;
  issue_type: string;
  parent_key: string | null;
  parent_summary: string | null;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
  reporter_account_id: string | null;
  reporter_display_name: string | null;
  project_key: string;
  fix_versions: any | null;
  labels: string[] | null;
  jira_created_at: string | null;
  jira_updated_at: string | null;
  deleted_at: string | null;
  acceptance_criteria?: string | null;
  position?: number | null;
}

export interface FixVersion {
  id: string;
  name: string;
  released: boolean;
  releaseDate?: string;
}

export interface PhComment {
  id: string;
  work_item_id: string;
  body: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface PhActivityLog {
  id: string;
  work_item_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  user_id: string;
  metadata: any | null;
  created_at: string;
  actor?: Profile;
}

export interface PhIssueLink {
  id: string;
  source_id: string;
  target_id: string;
  link_type: string;
  created_by: string;
  created_at: string;
  target_issue?: PhIssue;
}

export interface PhAttachment {
  id: string;
  work_item_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  uploader?: Profile;
}

export interface TmTestCase {
  id: string;
  case_key: string;
  title: string;
  type?: string;
  status: string;
  assigned_to?: string | null;
  created_at: string;
  assignee?: Profile;
  assignee_display_name?: string | null;
  updated_at?: string;
}

export interface TmTestCaseLink {
  test_case_id: string;
  linked_item_id: string;
  linked_item_type: string;
  linked_at: string;
  test_case?: TmTestCase;
}

export interface ThTestExecution {
  id?: string;
  test_case_id: string;
  cycle_scope_id?: string | null;
  test_cycle_id: string;
  execution_number?: number;
  result: string;
  executed_by: string;
  executed_at: string;
  cycle_name?: string;
  case_key?: string;
  case_title?: string;
}

export interface RhRelease {
  id: string;
  name: string;
  key: string;
  status: string;
  target_date: string | null;
  project_id: string;
}

export interface RhChange {
  id: string;
  chg_number: string;
  title: string;
  status: string;
  release_id: string | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export interface ProjectMember {
  user_id: string;
  role: string;
  full_name: string;
  avatar_url: string | null;
}

export type StatusCategory = 'todo' | 'in_progress' | 'done';
export type PriorityLevel = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
export type TestResult = 'passed' | 'failed' | 'blocked' | 'skipped' | 'not_run';

export interface PhIssueRow {
  id: string;
  issue_key: string;
  summary: string;
  status: string;
  status_category: StatusCategory;
  issue_type: string;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
  priority: string;
  position: number;
  jira_created_at: string | null;
  jira_updated_at: string | null;
  deleted_at: string | null;
}

export interface ColumnConfig {
  status: boolean;
  assignee: boolean;
  priority: boolean;
  created: boolean;
  updated: boolean;
}

export type ChildIssueType = 'task' | 'bug' | 'Sub-task';

export interface ParentIssue {
  id: string;
  issue_key: string;
  summary: string;
  issue_type: string;
  status: string;
  status_category: 'todo' | 'in_progress' | 'done';
}

export type AIImproveType =
  | 'improve_clarify'
  | 'expand_detail'
  | 'add_acceptance_criteria'
  | 'convert_user_story'
  | 'shorten_focus'
  | 'add_edge_cases';

export interface AIOutput {
  description: string;
  acceptance_criteria: string;
}

export type ActivityTab = 'comments' | 'history';

export interface StoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  projectId: string;
  projectKey: string;
  onOpenItem?: (itemId: string) => void;
  /** Panel mode — renders as side panel instead of centered modal */
  panelMode?: boolean;
  onTogglePanelMode?: () => void;
  /** Navigation items for prev/next in panel mode */
  navigationItems?: { id: string; summary: string; issue_key?: string }[];
  onNavigate?: (itemId: string) => void;
}
