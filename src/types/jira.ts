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
  project_type: 'scrum' | 'kanban' | 'basic';
}
