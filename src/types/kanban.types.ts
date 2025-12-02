// Kanban Boards Module Type Definitions
// Based on Jira Align Kanban functionality

export type ColumnType = 'Not Started' | 'In Progress' | 'Completed' | 'Accepted';
export type CardType = 'Epic' | 'Feature' | 'Story' | 'Defect' | 'Dependency' | 'Risk' | 'Task';
export type CardStyle = 'Expedite/Hot' | 'Default' | 'Block' | 'Ready To Move';
export type BoardUserRole = 'Admin' | 'Edit Boards' | 'Manage Cards' | 'View Cards';

export interface KanbanBoard {
  id: string;
  title: string;
  description?: string;
  team_id?: string;
  program_id?: string;
  portfolio_id?: string;
  card_types: CardType[];
  settings: BoardSettings;
  allow_overloading: boolean;
  allow_state_mapping: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BoardSettings {
  mapColumnStates: boolean;
  showTags: boolean;
  showTeam: boolean;
  smallCards: boolean;
  macroView: boolean;
  showExitCriteria: boolean;
}

export interface KanbanColumn {
  id: string;
  board_id: string;
  name: string;
  column_type: ColumnType;
  wip_limit?: number;
  exit_criteria?: string;
  sort_order: number;
  state_mappings: StateMapping[];
  parent_column_id?: string;
  created_at: string;
}

export interface StateMapping {
  work_item_type: CardType;
  states: string[];
}

export interface SwimLane {
  id: string;
  board_id: string;
  name: string;
  wip_limit?: number;
  sort_order: number;
  is_collapsed: boolean;
  created_at: string;
}

export interface KanbanCard {
  id: string;
  board_id: string;
  column_id: string;
  swim_lane_id?: string;
  work_item_type: CardType;
  work_item_id: string;
  sort_order: number;
  card_type: CardStyle;
  color?: string;
  is_blocked: boolean;
  added_at: string;
  // Joined data
  work_item?: WorkItem;
}

export interface WorkItem {
  id: string;
  external_id?: string;
  title: string;
  description?: string;
  state: string;
  owner_id?: string;
  owner_name?: string;
  owner_avatar?: string;
  points?: number;
  estimate_points?: number;
  blocked: boolean;
  tags?: string[];
  health?: 'on-track' | 'at-risk' | 'off-track';
  age_days?: number;
  progress_pct?: number;
}

export interface CardHistory {
  id: string;
  card_id: string;
  from_column_id?: string;
  to_column_id?: string;
  moved_by?: string;
  moved_at: string;
  wip_override_reason?: string;
}

export interface BoardUser {
  id: string;
  board_id: string;
  user_id: string;
  role: BoardUserRole;
  created_at: string;
}

export interface CreateBoardInput {
  title: string;
  description?: string;
  team_id?: string;
  program_id?: string;
  portfolio_id?: string;
  card_types?: CardType[];
  settings?: Partial<BoardSettings>;
  allow_overloading?: boolean;
  allow_state_mapping?: boolean;
}

export interface UpdateBoardInput extends Partial<CreateBoardInput> {
  id: string;
}

export interface CreateColumnInput {
  board_id: string;
  name: string;
  column_type: ColumnType;
  wip_limit?: number;
  exit_criteria?: string;
  sort_order: number;
  state_mappings?: StateMapping[];
  parent_column_id?: string;
}

export interface CreateSwimLaneInput {
  board_id: string;
  name: string;
  wip_limit?: number;
  sort_order: number;
}

export interface AddCardInput {
  board_id: string;
  column_id: string;
  swim_lane_id?: string;
  work_item_type: CardType;
  work_item_id: string;
  sort_order?: number;
  card_type?: CardStyle;
  color?: string;
}

export interface MoveCardInput {
  card_id: string;
  to_column_id: string;
  swim_lane_id?: string;
  wip_override_reason?: string;
}

export interface KanbanAnalytics {
  cumulative_flow: CumulativeFlowData[];
  cycle_time: CycleTimeData[];
  throughput: ThroughputData;
  wip_trend: WIPTrendData[];
  lead_time_avg: number;
  cycle_time_avg: number;
}

export interface CumulativeFlowData {
  date: string;
  not_started: number;
  in_progress: number;
  completed: number;
  accepted: number;
}

export interface CycleTimeData {
  card_id: string;
  work_item_title: string;
  cycle_time_days: number;
  completed_at: string;
}

export interface ThroughputData {
  period: string;
  items_completed: number;
  items_per_week: number;
}

export interface WIPTrendData {
  date: string;
  wip_count: number;
  wip_limit: number;
}
