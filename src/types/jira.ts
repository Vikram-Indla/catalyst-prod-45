export type ProjectType = 'scrum' | 'kanban' | 'basic';
export type ProjectStatus = 'active' | 'archived' | 'deleted';
export type MemberRole = 'admin' | 'member' | 'viewer';

export interface JiraUserPreferences {
  id: string;
  user_id: string;
  recent_projects: string[];
  recent_issues: string[];
  sidebar_collapsed: boolean;
  default_project_id: string | null;
  board_density: 'compact' | 'comfortable' | 'spacious';
  created_at: string;
  updated_at: string;
}

export interface ProjectStar {
  id: string;
  user_id: string;
  project_id: string;
  created_at: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  key: string;
  color: string | null;
  project_type: ProjectType;
}

export interface ProjectWithLead {
  id: string;
  name: string;
  key: string;
  description: string | null;
  project_type: ProjectType;
  status: ProjectStatus;
  color: string | null;
  icon: string | null;
  lead_id: string | null;
  default_assignee_id: string | null;
  issue_count: number;
  open_issue_count: number;
  is_archived: boolean;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  lead?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  program?: {
    id: string;
    name: string;
    key: string;
  } | null;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  invited_by: string | null;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email?: string;
  };
}

export interface CreateProjectInput {
  name: string;
  key?: string;
  description?: string;
  type: ProjectType;
  color: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
  lead_id?: string;
  default_assignee_id?: string;
}
