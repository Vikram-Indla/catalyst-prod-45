/**
 * Feature Types for Catalyst — Slim Framework
 * 
 * Feature is a lightweight intermediate delivery layer between Epic and Story.
 * It is NOT a SAFe Feature. It is NOT PI-based. It is NOT WSJF-scored.
 * 
 * ACTIVE FIELDS: Identity, Hierarchy, Execution, Dates
 * LEGACY FIELDS: WSJF, PI, Iteration, Financial, Program Board (kept for data integrity)
 */

export interface Feature {
  // ========================================
  // ACTIVE FIELDS — Core Feature Model
  // ========================================
  
  // Identity
  id: string;
  name: string;
  description?: string | null;
  display_id?: string | null;

  // Hierarchy (Feature lives in Project layer)
  project_id: string; // Required - Feature belongs to a Project
  epic_id?: string | null; // Optional parent Epic (0..1)

  // Execution
  status?: FeatureStatus | null;
  owner_id?: string | null;
  blocked?: boolean | null;
  blocked_reason?: string | null;
  health?: FeatureHealth | null;

  // Dates (lightweight, optional)
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;

  // Timestamps
  created_at?: string | null;
  updated_at?: string | null;

  // ========================================
  // LEGACY FIELDS — Kept for data integrity
  // DO NOT use in new UI flows
  // ========================================
  
  /** @deprecated Legacy - not used in Slim Feature model */
  capability_id?: string | null;
  /** @deprecated Legacy SAFe - Features are not team-assigned */
  team_id?: string | null;
  /** @deprecated Legacy SAFe - no PI planning for Features */
  pi_id?: string | null;
  /** @deprecated Legacy SAFe - no iteration planning for Features */
  iteration_id?: string | null;
  /** @deprecated Legacy SAFe */
  team_target_completion_sprint_id?: string | null;
  /** @deprecated Legacy - progress is story-driven */
  estimate_points?: number | null;
  /** @deprecated Legacy */
  estimation_method?: string | null;
  /** @deprecated Legacy - progress derived from stories */
  progress_pct?: number | null;
  /** @deprecated Legacy */
  rank_within_epic?: number | null;
  /** @deprecated Legacy */
  mmf?: boolean | null;
  /** @deprecated Legacy WSJF - not used */
  business_value?: number | null;
  /** @deprecated Legacy WSJF - not used */
  time_criticality?: number | null;
  /** @deprecated Legacy WSJF - not used */
  risk_reduction?: number | null;
  /** @deprecated Legacy WSJF - not used */
  job_size?: number | null;
  /** @deprecated Legacy WSJF - not used */
  wsjf_score?: number | null;
  /** @deprecated Legacy */
  acceptance_criteria?: string | null;
  /** @deprecated Legacy */
  notes?: string | null;
  /** @deprecated Legacy Financial - not used */
  budget?: number | null;
  /** @deprecated Legacy Financial - not used */
  work_code?: string | null;
  /** @deprecated Legacy Financial - not used */
  capitalized?: boolean | null;
  /** @deprecated Legacy Financial - not used */
  expected_revenue_growth?: number | null;
  /** @deprecated Legacy Financial - not used */
  expected_cost_savings?: number | null;
  /** @deprecated Legacy Program Board - not used */
  is_orphan_on_board?: boolean | null;
  /** @deprecated Legacy Program Board - not used */
  orphan_board_teams?: string[] | null;
  /** @deprecated Legacy */
  program_epic_inherited?: boolean | null;
}

/**
 * Feature Status — Simplified lifecycle
 * 
 * funnel      → Draft / not ready
 * analyzing   → Being shaped (stories being defined)
 * backlog     → Approved, ready for implementation
 * implementing → At least one story in progress
 * done        → All stories completed
 */
export type FeatureStatus = 'funnel' | 'analyzing' | 'backlog' | 'implementing' | 'done';

/**
 * Feature Health — RAG status
 */
export type FeatureHealth = 'green' | 'yellow' | 'red';

/**
 * Feature Progress — Story-driven (derived, not manual)
 * 
 * Progress is calculated from child stories:
 * - completionPercent = completedStories / totalStories * 100
 * - If no stories, progress = 0
 */
export interface FeatureProgress {
  totalStories: number;
  completedStories: number;
  inProgressStories: number;
  notStartedStories: number;
  completionPercent: number;
}

/**
 * Slim Feature for list views — only essential fields
 */
export interface FeatureSlim {
  id: string;
  display_id?: string | null;
  name: string;
  epic_id?: string | null;
  project_id: string;
  status?: FeatureStatus | null;
  health?: FeatureHealth | null;
  blocked?: boolean | null;
  owner_id?: string | null;
  // Derived fields (joined)
  epicName?: string | null;
  ownerName?: string | null;
  // Story-driven progress (computed)
  progress?: FeatureProgress;
}
