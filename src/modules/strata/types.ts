/**
 * STRATA domain types — hand-typed mirrors of the strata_* tables
 * (CAT-STRATA-20260705-001). Keep in sync with supabase/migrations/20260705*.
 *
 * Business truth (band keys, stage names, perspective names, weights, formulas)
 * is NEVER encoded here — those arrive as governed config records at runtime.
 * The unions below mirror DB CHECK constraints (system states), not tenant taxonomy.
 */

export type GovernedStatus = 'draft' | 'pending_approval' | 'approved' | 'retired' | 'superseded';
export type DataState = 'live' | 'draft' | 'pending_validation' | 'locked';
export type ValidationStatus = 'pending' | 'validated' | 'rejected' | 'quarantined';

export interface GovernedEnvelope {
  version: number;
  status: GovernedStatus;
  effective_from: string | null;
  effective_to: string | null;
  approved_by: string | null;
  approved_at: string | null;
  change_reason: string | null;
  supersedes_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Config engine ────────────────────────────────────────────────────────────
export interface ThresholdBand {
  key: string;
  label: string;
  min_score: number;
  /** ADS lozenge appearance name, config-owned (e.g. 'success' | 'moved' | 'removed') */
  appearance?: string;
}

export interface StrataPerspective extends GovernedEnvelope {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  order_index: number;
  default_weight: number | null;
  color_token: string | null;
  parent_id: string | null;
}

export interface StrataThresholdScheme extends GovernedEnvelope {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  bands: ThresholdBand[];
  tolerance: number | null;
  confidence_threshold: number | null;
}

export interface StrataValueCategory extends GovernedEnvelope {
  id: string;
  name: string;
  slug: string | null;
  parent_id: string | null;
  measurement_unit: string | null;
  validator_role: string | null;
  realization_cadence: string | null;
}

export interface StrataGateModel extends GovernedEnvelope {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  stages?: StrataGateModelStage[];
}

export interface StrataGateModelStage {
  id: string;
  gate_model_id: string;
  stage_key: string;
  name: string;
  order_index: number;
  criteria: Array<{ key: string; label: string; required?: boolean }>;
  evidence_requirements: unknown[];
  decision_options: string[];
  approval_roles: string[];
}

export interface StrataKpiTypeConfig extends GovernedEnvelope {
  id: string;
  name: string;
  slug: string | null;
  formula_template: string;
  directionality: 'higher_better' | 'lower_better' | 'band' | 'manual';
  allowed_units: string[] | null;
}

export interface StrataUploadTemplate extends GovernedEnvelope {
  id: string;
  name: string;
  slug: string | null;
  target_entity: string;
  column_schema: Array<{ column: string; label: string; type: string; required?: boolean }>;
  validation_rules: unknown[];
}

export interface StrataWorkflowConfig extends GovernedEnvelope {
  id: string;
  name: string;
  slug: string | null;
  entity_type: string;
  states: Array<{ key: string; label: string; category?: string }>;
  transitions: Array<{ from: string; to: string; roles?: string[]; requires_note?: boolean }>;
}

export interface StrataChangeRequest {
  id: string;
  entity_table: string;
  entity_id: string | null;
  change_type: 'create' | 'update' | 'retire' | 'supersede';
  payload: unknown;
  reason: string | null;
  requested_by: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
}

export type StrataRole =
  | 'strata_admin' | 'strategy_office' | 'executive_viewer'
  | 'kpi_owner' | 'vmo_validator' | 'data_steward';

// ── Strategy ─────────────────────────────────────────────────────────────────
export interface StrataCycle {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  starts_on: string;
  ends_on: string;
  period_granularity: 'month' | 'quarter' | 'half' | 'year';
  status: 'draft' | 'active' | 'locked' | 'closed';
}

export interface StrataPeriod {
  id: string;
  cycle_id: string;
  name: string;
  period_type: string;
  starts_on: string;
  ends_on: string;
  close_status: 'open' | 'pending_close' | 'closed';
}

export interface StrataStrategyElement {
  id: string;
  cycle_id: string;
  element_type: string;
  /** Execution Reconciliation §E: explicit scope discriminator — 'theme' = strategy-level, 'project' = owned by a Project Card. Same framework, no second model. */
  context: 'theme' | 'project';
  name: string;
  slug: string | null;
  description: string | null;
  owner_id: string | null;
  parent_id: string | null;
  perspective_id: string | null;
  stage: string;
  status: 'draft' | 'proposed' | 'active' | 'on_hold' | 'retired';
  order_index: number;
  map_position: { x: number; y: number } | null;
}

/**
 * Legacy 'play' rows were consolidated into 'theme' (CAT-STRATA-HIERARCHY-20260706-001)
 * and the DB CHECK constraint (strata_strategy_elements_type_check) blocks new 'play'
 * rows, but pre-migration data or other environments may still hold them. Treat both as
 * Theme-equivalent everywhere Theme-only UI is gated — never gate on a bare
 * `element_type === 'theme'` check.
 */
export const THEME_EQUIVALENT_TYPES = ['theme', 'play'] as const;
export function isThemeElement(elementType: string): boolean {
  return (THEME_EQUIVALENT_TYPES as readonly string[]).includes(elementType);
}

export interface StrataMapEdge {
  id: string;
  cycle_id: string;
  from_element_id: string;
  to_element_id: string;
  relationship_type: string;
  confidence: number | null;
}

export interface StrataThemeCharter {
  id: string;
  element_id: string;
  hypothesis: string | null;
  scope: string | null;
  value_thesis: string | null;
  gate_model_id: string | null;
  owner_id: string | null;
  status: 'draft' | 'complete';
}

// ── Scorecards ───────────────────────────────────────────────────────────────
export interface StrataScorecardModel extends GovernedEnvelope {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  owner_scope_type: string;
  rollup_method: string;
  threshold_scheme_id: string | null;
  period_granularity: string;
}

export interface StrataModelPerspective {
  id: string;
  model_id: string;
  perspective_id: string;
  weight: number;
  order_index: number;
}

export interface StrataScorecardInstance {
  id: string;
  model_id: string;
  model_version: number;
  cycle_id: string;
  period_id: string | null;
  name: string;
  slug: string | null;
  owner_id: string | null;
  status: DataState;
  locked_snapshot_id: string | null;
}

export interface StrataScorecardLine {
  id: string;
  instance_id: string;
  perspective_id: string;
  ref_type: 'kpi' | 'objective' | 'benefit';
  kpi_id: string | null;
  element_id: string | null;
  benefit_id: string | null;
  weight: number;
  order_index: number;
}

/** Shape returned by strata_calc_scorecard_instance (and frozen in snapshots). */
export interface ScorecardCalcResult {
  instance_id: string;
  period_id: string | null;
  score: number;
  has_data: boolean;
  status_key: string | null;
  rollup_method: string;
  model_id: string;
  model_version: number;
  perspectives: Array<{
    perspective_id: string; name: string; weight: number;
    score: number; has_data: boolean; status_key: string | null;
  }>;
  lines: Array<{
    line_id: string; ref_type: string; perspective_id: string; weight: number;
    score: number; has_data: boolean; status_key: string | null; detail: Record<string, unknown>;
  }>;
  calculated_at: string;
}

/** Shape returned by strata_calc_scorecard_plan_variance (read-only rollup of
 *  uncapped plan achievements; 100 = exactly on plan). Locked instances return
 *  has_data=false, reason='locked_snapshot' — variance is never recomputed
 *  against live tables for a frozen basis. */
export interface ScorecardPlanVariance {
  instance_id: string;
  period_id: string | null;
  plan_index: number | null;
  /** plan_index − 100; signed ("−7.2 / +1.9 vs plan"). Null when underivable. */
  variance: number | null;
  has_data: boolean;
  reason?: string;
  covered_lines: number;
  total_lines: number;
  calculated_at: string;
}

// ── KPI / OKR ────────────────────────────────────────────────────────────────
export interface StrataKpi extends GovernedEnvelope {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  business_meaning: string | null;
  kpi_type_id: string | null;
  /** Strategic KPI (vs operational). When true, approval requires >=1 governed
   * strategy association (cycle/theme/objective/perspective). STRATA-E2E-010. */
  is_strategic: boolean;
  unit: string | null;
  direction: 'higher_better' | 'lower_better' | 'band' | 'manual';
  frequency: string;
  entry_method: 'upload' | 'manual' | 'connector';
  accountable_owner_id: string | null;
  data_owner_id: string | null;
  reporter_id: string | null;
  validator_id: string | null;
  escalation_owner_id: string | null;
  data_source_id: string | null;
  threshold_scheme_id: string | null;
}

export interface StrataKpiFormulaVersion {
  id: string;
  kpi_id: string;
  version: number;
  expression: string;
  formula_type: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'superseded';
  effective_from: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface StrataKpiTarget {
  id: string;
  kpi_id: string;
  period_id: string;
  baseline: number | null;
  target: number;
  band_min: number | null;
  band_max: number | null;
  tolerance: number | null;
  target_type: 'point' | 'band' | 'milestone';
  version: number;
  status: 'draft' | 'approved' | 'superseded';
}

export interface StrataKpiActual {
  id: string;
  kpi_id: string;
  period_id: string;
  value: number;
  entry_method: 'upload' | 'manual' | 'connector';
  upload_run_id: string | null;
  staging_row_id: string | null;
  submitted_by: string | null;
  submitted_at: string;
  validation_status: ValidationStatus;
  validated_by: string | null;
  validated_at: string | null;
  validation_note: string | null;
  confidence: number | null;
}

export interface StrataOkr {
  id: string;
  objective_element_id: string | null;
  name: string;
  slug: string | null;
  owner_id: string | null;
  cycle_id: string | null;
  period_id: string | null;
  confidence: number | null;
  status: 'draft' | 'active' | 'closed';
}

export interface StrataKeyResult {
  id: string;
  okr_id: string;
  kpi_id: string | null;
  name: string;
  unit: string | null;
  baseline: number | null;
  target: number | null;
  current_value: number | null;
  direction: string;
  status: string;
}

// ── Execution ────────────────────────────────────────────────────────────────
export interface StrataInitiative {
  id: string;
  cycle_id: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  sponsor_id: string | null;
  owner_id: string | null;
  stage: string;
  status: 'draft' | 'active' | 'on_hold' | 'completed' | 'stopped';
  budget_envelope: number | null;
  value_hypothesis: string | null;
}

export interface StrataProjectCard {
  id: string;
  name: string;
  slug: string | null;
  /** Execution Reconciliation §K: stable business-facing code, auto-generated (PRJ-00001), distinct from slug/source_key. */
  reference_id: string | null;
  source_system: 'jira' | 'manual' | 'upload' | 'api';
  source_key: string | null;
  /** The single Strategic Theme this card belongs to by default. Must reference a strata_strategy_elements row with element_type='theme'. */
  theme_id: string | null;
  /** Linked Strategic Objective (locked rule 5). Theme-context objective; when theme_id is set it must belong to that Theme (DB-validated, REQ-007). */
  objective_element_id: string | null;
  card_type: string;
  pm_id: string | null;
  business_owner_id: string | null;
  lead_business_unit: string | null;
  delivery_team: string | null;
  sector: string | null;
  budget: number | null;
  baseline_start: string | null;
  baseline_end: string | null;
  forecast_end: string | null;
  actual_progress: number | null;
  execution_health: string | null;
  stage: string;
  risk_summary: string | null;
  dependency_summary: string | null;
  last_synced_at: string | null;
  /** Execution Health & Forecast Calculation — milestone-derived project baseline window (rule 1). Never the manual/import baseline_start/baseline_end above. */
  calc_baseline_start: string | null;
  calc_baseline_end: string | null;
  /** Planned % complete today per the milestone-derived baseline window (rule 3). */
  baseline_progress_pct: number | null;
  /** baseline_progress_pct - actual_progress (rule 5). Positive = behind schedule. */
  variance_pct: number | null;
  /** Earned-schedule forecast end (rule 6) — never the crude variance% x duration shortcut. */
  system_forecast_end: string | null;
  /** Later of system_forecast_end and forecast_end (submitted), or whichever exists (rule 8). */
  final_forecast_end: string | null;
  /** final_forecast_end - calc_baseline_end, in days (rule 9). */
  forecast_variance_days: number | null;
  /** Fixed, server-calculated enum — never manually settable. on_hold | not_available | not_started | major_delay | minor_delay | on_track (rule 10). */
  calculated_health: 'on_hold' | 'not_available' | 'not_started' | 'major_delay' | 'minor_delay' | 'on_track' | null;
  health_reason: string | null;
  scope_description: string | null;
  target_outcomes: string | null;
  success_criteria: string | null;
  /** Optional, config-gated — migrated from the deprecated Initiative model. Never shown by default. */
  sponsor_id: string | null;
  business_case: string | null;
  value_hypothesis: string | null;
  /** Bag for admin-config-gated optional fields (strategic_pillar, aop_mapping, strategic_impact, stakeholders, enabling_teams, support_functions, risks). */
  optional_fields: Record<string, unknown>;
  /** Row version — used as an optimistic-concurrency precondition on update so a
   * stale second write is rejected instead of silently clobbering (V6-OPEN-033). */
  updated_at: string;
}

export interface StrataMilestone {
  id: string;
  project_card_id: string;
  name: string;
  owner_id: string | null;
  baseline_start: string | null;
  baseline_end: string | null;
  forecast_date: string | null;
  actual_date: string | null;
  status: 'planned' | 'in_progress' | 'done' | 'missed' | 'descoped';
  progress: number | null;
  weight: number;
  order_index: number;
  source_system: string | null;
  source_reference_key: string | null;
  source_issue_id: string | null;
}

export interface StrataRisk {
  id: string;
  project_card_id: string;
  title: string;
  description: string | null;
  likelihood: 'low' | 'medium' | 'high' | null;
  impact: 'low' | 'medium' | 'high' | null;
  status: 'open' | 'mitigating' | 'accepted' | 'closed';
  owner_id: string | null;
  mitigation: string | null;
  target_resolution_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrataDependency {
  id: string;
  /** Added for the Execution Excel import (D-014) — nullable: NULL on rows created before this column existed. */
  name: string | null;
  requesting_type: 'initiative' | 'project_card';
  requesting_id: string;
  serving_type: 'initiative' | 'project_card' | 'external';
  serving_id: string | null;
  serving_label: string | null;
  dependency_type: string;
  description: string | null;
  owner_id: string | null;
  baseline_start: string | null;
  baseline_end: string | null;
  due_date: string | null;
  status: 'open' | 'at_risk' | 'blocked' | 'resolved' | 'cancelled';
  sla_days: number | null;
  impact: string | null;
  is_blocker: boolean;
  source_system: string | null;
  source_reference_key: string | null;
  source_issue_id: string | null;
}

// ── Project Card configuration engine ───────────────────────────────────────
export interface StrataProjectCardTabConfig {
  id: string;
  card_type: string | null;
  tab_key: string;
  display_name: string;
  is_active: boolean;
  is_required: boolean;
  position: number;
}

export interface StrataProjectCardSectionConfig {
  id: string;
  card_type: string | null;
  tab_key: string;
  section_key: string;
  name: string;
  is_visible: boolean;
  is_required: boolean;
  collapsed_by_default: boolean;
  position: number;
}

export interface StrataProjectCardFieldConfig {
  id: string;
  card_type: string | null;
  tab_key: string;
  section_key: string | null;
  field_key: string;
  display_name: string;
  field_type: string;
  is_visible: boolean;
  is_required: boolean;
  is_readonly: boolean;
  syncs_from_jira: boolean;
  editable_when_synced: boolean;
  validation_rules: Record<string, unknown>;
  position: number;
}

export interface StrataProjectCardPicklist {
  id: string;
  picklist_key: string;
  value: string;
  label: string;
  is_active: boolean;
  position: number;
}

export interface StrataBenefitProjectCard {
  id: string;
  benefit_id: string;
  project_card_id: string;
  attribution_share: number | null;
}

export interface StrataInitiativeProject {
  id: string;
  initiative_id: string;
  project_card_id: string;
  mapping_confidence: number | null;
  mapping_owner_id: string | null;
}

// ── Value / VMO ──────────────────────────────────────────────────────────────
export interface StrataPortfolio {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category_id: string | null;
  owner_id: string | null;
  value_target: number | null;
  status: 'active' | 'archived';
}

export type BenefitLifecycleStage =
  | 'identified' | 'qualified' | 'approved' | 'baselined' | 'in_flight'
  | 'forecast_revised' | 'realized' | 'finance_validated' | 'closed';

export interface StrataBenefit {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category_id: string | null;
  portfolio_id: string | null;
  owner_id: string | null;
  validator_id: string | null;
  unit: string | null;
  lifecycle_stage: BenefitLifecycleStage;
  value_hypothesis: string | null;
  causal_mechanism: string | null;
  confidence: number | null;
}

export interface StrataBenefitValue {
  id: string;
  benefit_id: string;
  period_id: string;
  value_kind: 'baseline' | 'planned' | 'forecast' | 'realized';
  value: number;
  upload_run_id: string | null;
  submitted_by: string | null;
  validation_status: 'pending' | 'validated' | 'rejected';
  validated_by: string | null;
  validated_at: string | null;
}

export interface StrataAssumption {
  id: string;
  benefit_id: string;
  description: string;
  owner_id: string | null;
  confidence: number | null;
  status: 'open' | 'holding' | 'broken' | 'retired';
}

export interface StrataGateInstance {
  id: string;
  gate_model_id: string;
  stage_id: string;
  subject_type: 'initiative' | 'project_card' | 'benefit';
  subject_id: string;
  scheduled_for: string | null;
  status: 'open' | 'in_review' | 'decided' | 'cancelled';
  verdict: string | null;
  verdict_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_id: string | null;
}

// ── Lineage / governance ─────────────────────────────────────────────────────
export interface StrataDataSource {
  id: string;
  name: string;
  slug: string | null;
  system_type: 'excel' | 'jira' | 'manual' | 'api' | 'erp' | 'bi';
  owner_id: string | null;
  refresh_cadence: string | null;
  status: 'registered' | 'active' | 'suspended' | 'retired';
  health: string | null;
}

export interface StrataUploadRun {
  id: string;
  run_key: string;
  data_source_id: string | null;
  template_id: string | null;
  template_version: number | null;
  channel: 'excel' | 'manual' | 'jira' | 'api';
  initiated_by: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_hash: string | null;
  row_count_raw: number;
  row_count_valid: number;
  row_count_rejected: number;
  status: 'uploaded' | 'staging' | 'validating' | 'pending_attestation' | 'writing' | 'calculating' | 'completed' | 'failed' | 'quarantined';
  error_summary: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface StrataStagingRow {
  id: string;
  upload_run_id: string;
  row_number: number;
  raw: Record<string, unknown>;
  target_entity: string | null;
  validation_status: ValidationStatus | 'valid';
}

export interface StrataValidationResult {
  id: string;
  upload_run_id: string;
  staging_row_id: string | null;
  field_name: string | null;
  error_code: string;
  severity: 'error' | 'warning';
  message: string;
  suggested_fix: string | null;
}

export interface StrataCalculatedValue {
  id: string;
  entity_type: string;
  entity_id: string;
  period_id: string | null;
  metric_key: string;
  value: number | null;
  score: number | null;
  status_key: string | null;
  formula_version: string | null;
  inputs: Record<string, unknown> | null;
  source_run_ids: string[] | null;
  config_context: Record<string, unknown> | null;
  confidence: number | null;
  calculated_at: string;
  snapshot_id: string | null;
}

export interface StrataSnapshot {
  id: string;
  snapshot_key: string;
  cycle_id: string | null;
  period_id: string | null;
  name: string;
  scope: Record<string, unknown> | null;
  config_versions: Record<string, unknown> | null;
  data_run_ids: string[] | null;
  created_by: string | null;
  approved_by: string | null;
  locked_at: string;
  status: 'locked' | 'superseded';
  superseded_by_id: string | null;
}

export interface StrataDecision {
  id: string;
  decision_key: string;
  forum: string | null;
  snapshot_id: string | null;
  /** Theme-scoped governance (CAT-STRATA-THEME-DETAIL-20260710-001 Slice 4) — nullable, independent of snapshot_id. */
  element_id: string | null;
  decision_type: 'governance' | 'gate' | 'escalation' | 'action_only';
  title: string;
  description: string | null;
  owner_id: string | null;
  decided_by: string | null;
  decided_at: string | null;
  due_date: string | null;
  status: 'open' | 'decided' | 'closed';
  evidence_refs: Array<{ entity_type: string; entity_id?: string; note?: string }> | null;
}

export interface StrataAction {
  id: string;
  action_key: string;
  decision_id: string | null;
  title: string;
  owner_id: string | null;
  due_date: string | null;
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
  note: string | null;
}

export interface StrataBoardPack {
  id: string;
  snapshot_id: string;
  format: 'pdf' | 'pptx';
  storage_path: string | null;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  generated_at: string | null;
}

// ── Notifications (CAT-STRATA-CLOSEOUT-20260710-001 W3) ──────────────────────
export interface StrataNotification {
  id: string;
  user_id: string;
  event_type: string;
  entity_table: string | null;
  entity_id: string | null;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export interface StrataNotificationRule {
  id: string;
  event_type: string;
  label: string;
  description: string | null;
  audience: string;
  channel: string;
  enabled: boolean;
  status: string;
  change_reason: string | null;
  updated_at: string;
}

export interface StrataAiOutput {
  id: string;
  use_case: string;
  entity_refs: Array<{ entity_type: string; entity_id: string }> | null;
  snapshot_id: string | null;
  uses_live_data: boolean;
  content: string;
  cited_evidence: unknown[] | null;
  confidence: number | null;
  model: string | null;
  generated_at: string;
  human_review_status: 'pending' | 'approved' | 'rejected';
}

// ── Execution manual Excel import (session 007) ─────────────────────────────
export interface ExecutionImportProjectCardRow {
  referenceId: string; name: string; strategicTheme: string; businessOwner: string;
  projectManager: string; leadBusinessUnit: string; deliveryTeam: string; deliveryStatus: string;
  baselineStart: string; baselineEnd: string; scopeDescription: string;
  targetOutcomes: string; successCriteria: string;
}

export interface ExecutionImportMilestoneRow {
  projectReferenceId: string; name: string; owner: string;
  baselineStart: string; baselineEnd: string; forecastEnd: string; actualEnd: string;
  status: string; progress: string; weight: string;
}

export interface ExecutionImportDependencyRow {
  projectReferenceId: string; name: string; description: string;
  requestingProjectOrTeam: string; servingDepartmentOrTeam: string;
  baselineStart: string; baselineEnd: string; status: string; owner: string;
  blocker: string; impactNote: string;
}

export interface ExecutionImportRowResult {
  row_number: number;
  reference_id?: string | null;
  project_reference_id?: string | null;
  name: string | null;
  status: 'valid' | 'error';
  action: 'create' | 'update' | null;
  id?: string;
  errors: string[];
  warnings: string[];
}

export interface ExecutionImportSheetSummary { total: number; created: number; updated: number; rejected: number }

export interface ExecutionImportResult {
  run_id: string | null;
  dry_run: boolean;
  project_cards: ExecutionImportRowResult[];
  milestones: ExecutionImportRowResult[];
  dependencies: ExecutionImportRowResult[];
  summary: {
    project_cards: ExecutionImportSheetSummary;
    milestones: ExecutionImportSheetSummary;
    dependencies: ExecutionImportSheetSummary;
  };
}
