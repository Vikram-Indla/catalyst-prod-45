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

export interface StrataMapEdge {
  id: string;
  cycle_id: string;
  from_element_id: string;
  to_element_id: string;
  relationship_type: string;
  confidence: number | null;
}

export interface StrataPlayCharter {
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

// ── KPI / OKR ────────────────────────────────────────────────────────────────
export interface StrataKpi extends GovernedEnvelope {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  business_meaning: string | null;
  kpi_type_id: string | null;
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
  source_system: 'jira' | 'manual' | 'upload' | 'api';
  source_key: string | null;
  pm_id: string | null;
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
}

export interface StrataDependency {
  id: string;
  requesting_type: 'initiative' | 'project_card';
  requesting_id: string;
  serving_type: 'initiative' | 'project_card' | 'external';
  serving_id: string | null;
  serving_label: string | null;
  dependency_type: string;
  due_date: string | null;
  status: 'open' | 'at_risk' | 'blocked' | 'resolved' | 'cancelled';
  sla_days: number | null;
  impact: string | null;
  is_blocker: boolean;
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
