// =====================================================
// PROJECT TYPES - BUILD_UNIT_2.1 SPEC COMPLIANT
// =====================================================

export type ProjectType = 'scrum' | 'kanban' | 'basic';

export interface ProjectLead {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface ProjectProgram {
  id: string;
  name: string;
  key: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  program_id: string;
  lead_id: string | null;
  default_assignee_id: string | null;
  project_type: ProjectType;
  category: string | null;
  avatar_url: string | null;
  color: string | null;
  is_private: boolean;
  is_archived: boolean;
  is_default: boolean;
  issue_sequence: number;
  status: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  wip_limits: Record<string, number> | null;
  // Joined relations
  lead?: ProjectLead | null;
  program?: ProjectProgram | null;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  joined_at: string;
  // Joined relations
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface CreateProjectInput {
  name: string;
  key: string;
  description?: string;
  program_id: string;
  project_type?: ProjectType;
  category?: string;
  is_private?: boolean;
  lead_id?: string;
  color?: string;
}

export interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string;
  project_type?: ProjectType;
  category?: string;
  is_private?: boolean;
  is_archived?: boolean;
  lead_id?: string | null;
  default_assignee_id?: string | null;
  color?: string;
  avatar_url?: string;
}

export interface ProjectFilters {
  search?: string;
  program_id?: string;
  project_type?: ProjectType;
  is_archived?: boolean;
  is_private?: boolean;
}

// Project type display config
export const PROJECT_TYPE_CONFIG: Record<ProjectType, { label: string; description: string; icon: string }> = {
  scrum: {
    label: 'Scrum',
    description: 'Sprint-based development with backlog and iterations',
    icon: '🏃',
  },
  kanban: {
    label: 'Kanban',
    description: 'Continuous flow with WIP limits',
    icon: '📊',
  },
  basic: {
    label: 'Basic',
    description: 'Simple task tracking without methodology',
    icon: '📋',
  },
};

// Default colors for project avatars
export const PROJECT_COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#ca8a04', // yellow
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#be185d', // pink
] as const;
