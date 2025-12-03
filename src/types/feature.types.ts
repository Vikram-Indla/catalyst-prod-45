// Feature types for Catalyst - aligned with Catalyst specification
export interface Feature {
  id: string;
  name: string;
  description?: string | null;
  display_id?: string | null;

  // Status and workflow
  status?: string | null;
  blocked?: boolean | null;
  blocked_reason?: string | null;
  health?: string | null;

  // Hierarchy relationships
  epic_id: string;
  capability_id?: string | null;
  program_id: string;
  team_id?: string | null;

  // Planning
  pi_id?: string | null;
  iteration_id?: string | null;
  team_target_completion_sprint_id?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;

  // Estimation
  estimate_points?: number | null;
  estimation_method?: string | null;
  progress_pct?: number | null;
  rank_within_epic?: number | null;
  mmf?: boolean | null; // Minimum Marketable Feature flag

  // WSJF scoring
  business_value?: number | null;
  time_criticality?: number | null;
  risk_reduction?: number | null;
  job_size?: number | null;
  wsjf_score?: number | null;

  // Owner and metadata
  owner_id?: string | null;
  acceptance_criteria?: string | null;
  notes?: string | null;

  // Financial fields
  budget?: number | null;
  work_code?: string | null;
  capitalized?: boolean | null;
  expected_revenue_growth?: number | null;
  expected_cost_savings?: number | null;

  // Program Board specific
  is_orphan_on_board?: boolean | null;
  orphan_board_teams?: string[] | null;

  // Timestamps
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FeatureProgress {
  totalStories: number;
  accepted: number;
  inProgress: number;
  notStarted: number;
}
