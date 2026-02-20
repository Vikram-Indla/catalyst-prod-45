// ============================================================
// ProjectHub Types — All Projects Page
// Source of truth for project data types
// ============================================================

// === Database Enums ===
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived';
export type ProjectHealth = 'on_track' | 'at_risk' | 'off_track';
export type ProjectStatusCategory = 'todo' | 'in_progress' | 'done';

// === Display Label Maps ===
export const PROJECT_STATUS_DISPLAY: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

export const PROJECT_HEALTH_DISPLAY: Record<string, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  off_track: 'Off Track',
};

export const STATUS_CATEGORY_DISPLAY: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

// === Role Category System (for Team tab grouping) ===
export const ROLE_CATEGORIES: Record<string, string[]> = {
  'Leadership': [
    'Project Director', 'Program Manager', 'Product Owner',
    'Scrum Master', 'Portfolio Manager', 'Director', 'VP',
    'Technical PO', 'Head of Department'
  ],
  'Architecture & Design': [
    'Solution Architect', 'Cloud Architect', 'UX Designer',
    'UI Designer', 'Backend Architect', 'Enterprise Architect',
    'System Architect', 'Design Lead'
  ],
  'Engineering': [
    'Lead Engineer', 'Technical Lead', 'Full Stack Developer',
    'Frontend Developer', 'Backend Developer', 'AI/ML Engineer',
    'Mobile Developer', 'Software Engineer', 'Senior Developer',
    'Staff Engineer', 'Principal Engineer'
  ],
  'Data & Infrastructure': [
    'Data Engineer', 'Database Administrator', 'Systems Engineer',
    'DevOps Engineer', 'Platform Engineer', 'Site Reliability Engineer',
    'Network Engineer', 'Infrastructure Engineer', 'DBA'
  ],
  'Quality & Security': [
    'QA Lead', 'Security Analyst', 'QA Engineer', 'SDET',
    'Test Engineer', 'Penetration Tester', 'Security Engineer',
    'Quality Manager'
  ],
  'Business & Operations': [
    'Business Analyst', 'Release Manager', 'System Administrator',
    'Operations Manager', 'Change Manager', 'Service Manager',
    'Delivery Manager', 'Agile Coach'
  ],
};

export const ROLE_CATEGORY_ORDER = [
  'Leadership',
  'Architecture & Design',
  'Engineering',
  'Data & Infrastructure',
  'Quality & Security',
  'Business & Operations',
  'Other',
];

export function getRoleCategory(jobRole: string | null | undefined): string {
  if (!jobRole) return 'Other';
  for (const [category, roles] of Object.entries(ROLE_CATEGORIES)) {
    if (roles.some(r => jobRole.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(jobRole.toLowerCase()))) {
      return category;
    }
  }
  return 'Other';
}

// === Database Row Types ===
export interface ProjectListItem {
  id: string;
  project_key: string;
  name: string;
  department: string | null;
  description: string | null;
  status: ProjectStatus;
  health_status: ProjectHealth;
  status_category: ProjectStatusCategory;
  total_epics: number;
  total_stories: number;
  total_tasks: number;
  work_items_todo: number;
  work_items_in_progress: number;
  work_items_done: number;
  completion_percentage: number;
  updated_at: string;
  created_at: string;
  owner_id: string;
  priority: string | null;
  tags: string[] | null;
  member_count: number;
  member_ids: string[] | null;
}

export interface ProjectTeamMember {
  user_id: string;
  full_name: string;
  email: string;
  job_role: string | null;
  department_name: string;
  avatar_url: string | null;
  country: string | null;
  location: string | null;
  project_role: string;
}

// === UI State Types ===
export type ViewMode = 'list' | 'card';
export type SortColumn = 'name' | 'department' | 'status' | 'health_status' | 'total_epics' | 'total_stories' | 'total_tasks';
export type SortDirection = 'asc' | 'desc';

export interface ProjectFilters {
  search: string;
  statusChip: string;
  departments: string[];
  statuses: string[];
  healths: string[];
  categories: string[];
}

export const DEFAULT_FILTERS: ProjectFilters = {
  search: '',
  statusChip: 'All',
  departments: [],
  statuses: [],
  healths: [],
  categories: [],
};

// === Form Types ===
export interface CreateProjectInput {
  name: string;
  project_key: string;
  department?: string;
  status?: ProjectStatus;
  description?: string;
}
