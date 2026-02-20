/**
 * TypeScript interfaces for ProjectHub Work Items
 * Maps to ph_work_items and related tables
 */

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Resolution = 'done' | 'wont_do' | 'duplicate' | 'cannot_reproduce';
export type LinkType = 'blocks' | 'is_blocked_by' | 'relates_to' | 'duplicates' | 'is_duplicated_by' | 'clones';
export type StatusCategory = 'todo' | 'in_progress' | 'done' | 'terminal';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
}

export interface WorkType {
  id: string;
  project_id: string;
  name: string;
  icon: string;
  color: string;
  level: 'top' | 'mid' | 'work' | 'child';
  is_enabled: boolean;
  position: number;
}

export interface WorkflowStatus {
  id: string;
  project_id: string;
  name: string;
  color: string;
  category: StatusCategory;
  position: number;
  is_default: boolean;
}

export interface WorkItem {
  id: string;
  project_id: string;
  parent_id: string | null;
  type_id: string;
  status_id: string;
  item_key: string;
  sequence_num: number;
  title: string;
  description: Record<string, any>;
  assignee_id: string | null;
  reporter_id: string | null;
  priority: Priority;
  story_points: number | null;
  time_estimate: number | null;
  time_spent: number;
  start_date: string | null;
  due_date: string | null;
  resolution: Resolution | null;
  is_flagged: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  // Joined fields
  work_type?: WorkType;
  status?: WorkflowStatus;
  assignee?: Profile;
  reporter?: Profile;
  labels?: Label[];
  children?: WorkItem[];
  parent?: WorkItem;
}

export interface Label {
  id: string;
  project_id: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  work_item_id: string;
  author_id: string;
  body: Record<string, any>;
  created_at: string;
  updated_at: string;
  author?: Profile;
  reactions?: CommentReaction[];
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
}

export interface ActivityLog {
  id: string;
  work_item_id: string;
  user_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, any>;
  created_at: string;
  user?: Profile;
}

export interface IssueLink {
  id: string;
  source_id: string;
  target_id: string;
  link_type: LinkType;
  created_by: string;
  created_at: string;
  source?: WorkItem;
  target?: WorkItem;
}

export interface Attachment {
  id: string;
  work_item_id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
}

export interface AcceptanceCriterion {
  id: string;
  work_item_id: string;
  title: string;
  is_checked: boolean;
  sort_order: number;
}

export interface ListViewConfig {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  columns: string[];
  sort_by: string;
  sort_dir: 'asc' | 'desc';
  group_by: string | null;
  filters: Record<string, any>;
  is_default: boolean;
}
