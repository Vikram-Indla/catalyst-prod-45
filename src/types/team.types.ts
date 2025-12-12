// Team types based on Catalyst specification

export type TeamType =
  | 'AGILE'
  | 'KANBAN'
  | 'COP'
  | 'PROGRAM'
  | 'PORTFOLIO'
  | 'SOLUTION'
  | 'PROCESS_FLOW';

export type TrackByType = 'POINTS' | 'HOURS';

export interface Team {
  id: string;
  name: string;
  short_name: string;
  team_type: TeamType;
  sprint_prefix?: string;
  description?: string;
  project_id?: string;
  parent_program_id?: string;
  parent_project_id?: string;
  parent_solution_id?: string;
  region_id?: string;
  track_by?: TrackByType;
  burn_hours?: number;
  allow_task_deletion?: boolean;
  is_active: boolean;
  
  // Kanban-specific fields
  kanban_throughput?: number;
  kanban_auto_populate_estimate?: boolean;
  kanban_wip_limit?: number;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Joined relations
  projects?: {
    id: string;
    name: string;
  } | null;
  programs?: {
    id: string;
    name: string;
  } | null;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  allocation_percentage: number;
  created_at: string;
  updated_at: string;
  
  // Joined user profile
  profiles?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface TeamSubscription {
  id: string;
  team_id: string;
  user_id: string;
  created_at: string;
}

export interface TeamMetric {
  id: string;
  team_id: string;
  iteration_id?: string;
  metric_date: string;
  
  // Sprint metrics
  planned_velocity?: number;
  actual_velocity?: number;
  story_points_committed?: number;
  story_points_completed?: number;
  
  // Kanban metrics
  throughput?: number;
  cycle_time_avg?: number;
  wip_count?: number;
  
  created_at: string;
  updated_at: string;
}

export interface TeamFilters {
  programIds?: string[];
  teamTypes?: TeamType[];
  status?: 'active' | 'inactive';
  regionIds?: string[];
  search?: string;
}

export interface CreateTeamInput {
  name: string;
  short_name: string;
  team_type: TeamType;
  sprint_prefix?: string;
  description?: string;
  project_id?: string;
  parent_program_id?: string;
  parent_project_id?: string;
  parent_solution_id?: string;
  region_id?: string;
  track_by?: TrackByType;
  burn_hours?: number;
  allow_task_deletion?: boolean;
  is_active?: boolean;
  kanban_throughput?: number;
  kanban_auto_populate_estimate?: boolean;
  kanban_wip_limit?: number;
}

export interface UpdateTeamInput extends Partial<CreateTeamInput> {
  id: string;
}
