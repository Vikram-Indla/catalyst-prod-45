/**
 * STRATA domain services — the ONLY layer that touches Supabase for strata_*.
 * Screens/hooks import from here. UI never computes enterprise scores:
 * every score/RAG/rollup/YTD/VaR number comes from the calc-engine RPCs
 * (strata_calc_*) or from frozen snapshot payloads.
 */
import { typedQuery, typedRpc } from '@/integrations/supabase/client';
import type {
  ScorecardCalcResult, StrataAction, StrataAiOutput, StrataAssumption, StrataBenefit,
  StrataBenefitValue, StrataBoardPack, StrataCalculatedValue, StrataChangeRequest,
  StrataCycle, StrataDataSource, StrataDecision, StrataDependency, StrataGateInstance,
  StrataGateModel, StrataGateModelStage, StrataInitiative, StrataInitiativeProject,
  StrataKeyResult, StrataKpi, StrataKpiActual, StrataKpiFormulaVersion, StrataKpiTarget,
  StrataKpiTypeConfig, StrataMapEdge, StrataMilestone, StrataModelPerspective, StrataOkr,
  StrataPeriod, StrataPerspective, StrataPlayCharter, StrataPortfolio, StrataProjectCard,
  StrataRole, StrataScorecardInstance, StrataScorecardLine, StrataScorecardModel,
  StrataSnapshot, StrataStagingRow, StrataStrategyElement, StrataThresholdScheme,
  StrataUploadRun, StrataUploadTemplate, StrataValidationResult, StrataValueCategory,
  StrataWorkflowConfig,
} from '../types';

async function run<T>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as T;
}

// ── Config engine ────────────────────────────────────────────────────────────
export const configApi = {
  perspectives: (): Promise<StrataPerspective[]> =>
    run(typedQuery('strata_perspectives').select('*').order('order_index')),
  thresholdSchemes: (): Promise<StrataThresholdScheme[]> =>
    run(typedQuery('strata_threshold_schemes').select('*').order('name')),
  valueCategories: (): Promise<StrataValueCategory[]> =>
    run(typedQuery('strata_value_categories').select('*').order('name')),
  gateModels: async (): Promise<StrataGateModel[]> => {
    const models: StrataGateModel[] = await run(typedQuery('strata_gate_models').select('*').order('name'));
    const stages: StrataGateModelStage[] = await run(
      typedQuery('strata_gate_model_stages').select('*').order('order_index'),
    );
    return models.map((m) => ({ ...m, stages: stages.filter((s) => s.gate_model_id === m.id) }));
  },
  kpiTypes: (): Promise<StrataKpiTypeConfig[]> =>
    run(typedQuery('strata_kpi_type_configs').select('*').order('name')),
  uploadTemplates: (): Promise<StrataUploadTemplate[]> =>
    run(typedQuery('strata_upload_templates').select('*').order('name')),
  workflows: (): Promise<StrataWorkflowConfig[]> =>
    run(typedQuery('strata_workflow_configs').select('*').order('name')),
  changeRequests: (): Promise<StrataChangeRequest[]> =>
    run(typedQuery('strata_config_change_requests').select('*').order('requested_at', { ascending: false })),
  auditEvents: (entityTable?: string, limit = 50) => {
    let q = typedQuery('strata_audit_events').select('*').order('created_at', { ascending: false }).limit(limit);
    if (entityTable) q = q.eq('entity_table', entityTable);
    return run(q);
  },
  /** Governed-record lifecycle — RPC-only transitions (SoD enforced in DB). */
  submitRecord: (table: string, id: string) =>
    run(typedRpc('strata_submit_record', { p_table: table, p_id: id })),
  approveRecord: (table: string, id: string, note?: string) =>
    run(typedRpc('strata_approve_record', { p_table: table, p_id: id, p_note: note ?? null })),
  retireRecord: (table: string, id: string, reason?: string) =>
    run(typedRpc('strata_retire_record', { p_table: table, p_id: id, p_reason: reason ?? null })),
  approveScorecardModel: (modelId: string, note?: string) =>
    run(typedRpc('strata_approve_scorecard_model', { p_model: modelId, p_note: note ?? null })),
  myRoles: async (userId: string): Promise<StrataRole[]> => {
    const rows: Array<{ role: StrataRole }> = await run(
      typedQuery('strata_role_assignments').select('role').eq('user_id', userId),
    );
    return rows.map((r) => r.role);
  },
};

// ── Strategy ─────────────────────────────────────────────────────────────────
export const strategyApi = {
  cycles: (): Promise<StrataCycle[]> =>
    run(typedQuery('strata_cycles').select('*').order('starts_on', { ascending: false })),
  periods: (cycleId: string): Promise<StrataPeriod[]> =>
    run(typedQuery('strata_periods').select('*').eq('cycle_id', cycleId).order('starts_on')),
  elements: (cycleId: string): Promise<StrataStrategyElement[]> =>
    run(typedQuery('strata_strategy_elements').select('*').eq('cycle_id', cycleId).order('order_index')),
  edges: (cycleId: string): Promise<StrataMapEdge[]> =>
    run(typedQuery('strata_map_edges').select('*').eq('cycle_id', cycleId)),
  charters: (): Promise<StrataPlayCharter[]> =>
    run(typedQuery('strata_play_charters').select('*')),
  elementKpis: (): Promise<Array<{ element_id: string; kpi_id: string; weight: number | null }>> =>
    run(typedQuery('strata_element_kpis').select('element_id, kpi_id, weight')),
  updateMapPosition: (elementId: string, pos: { x: number; y: number }) =>
    run(typedQuery('strata_strategy_elements').update({ map_position: pos }).eq('id', elementId).select('id')),
  createEdge: (edge: Pick<StrataMapEdge, 'cycle_id' | 'from_element_id' | 'to_element_id' | 'relationship_type'> & { confidence?: number }) =>
    run(typedQuery('strata_map_edges').insert(edge).select('*').single()),
  promoteElement: (elementId: string) =>
    run(typedRpc('strata_promote_element', { p_element: elementId })),
};

// ── Scorecards ───────────────────────────────────────────────────────────────
export const scorecardApi = {
  models: (): Promise<StrataScorecardModel[]> =>
    run(typedQuery('strata_scorecard_models').select('*').order('name')),
  modelPerspectives: (modelId: string): Promise<StrataModelPerspective[]> =>
    run(typedQuery('strata_scorecard_model_perspectives').select('*').eq('model_id', modelId).order('order_index')),
  instances: (cycleId?: string): Promise<StrataScorecardInstance[]> => {
    let q = typedQuery('strata_scorecard_instances').select('*').order('created_at', { ascending: false });
    if (cycleId) q = q.eq('cycle_id', cycleId);
    return run(q);
  },
  instanceBySlug: async (slug: string): Promise<StrataScorecardInstance | null> =>
    run(typedQuery('strata_scorecard_instances').select('*').eq('slug', slug).maybeSingle()),
  lines: (instanceId: string): Promise<StrataScorecardLine[]> =>
    run(typedQuery('strata_scorecard_lines').select('*').eq('instance_id', instanceId).order('order_index')),
  /**
   * Live instances: run the calc engine (server-side, provenance persisted).
   * Locked instances: NEVER recalc — read the frozen snapshot payload.
   */
  calcResult: async (instance: StrataScorecardInstance): Promise<ScorecardCalcResult | null> => {
    if (instance.status === 'locked' && instance.locked_snapshot_id) {
      const [items, lineItems] = await Promise.all([
        run(
          typedQuery('strata_snapshot_items')
            .select('payload')
            .eq('snapshot_id', instance.locked_snapshot_id)
            .eq('entity_type', 'scorecard_instance')
            .eq('entity_id', instance.id),
        ) as Promise<Array<{ payload: Record<string, unknown> }>>,
        run(
          typedQuery('strata_snapshot_items')
            .select('entity_id, payload')
            .eq('snapshot_id', instance.locked_snapshot_id)
            .eq('entity_type', 'scorecard_line'),
        ) as Promise<Array<{ entity_id: string; payload: Record<string, unknown> }>>,
      ]);
      const frozen = items[0]?.payload as { inputs?: { perspectives?: unknown }; value?: number; status_key?: string } | undefined;
      if (!frozen) return null;
      return {
        instance_id: instance.id,
        period_id: instance.period_id,
        score: (frozen.value as number) ?? 0,
        has_data: frozen.value != null,
        status_key: (frozen.status_key as string) ?? null,
        rollup_method: 'frozen',
        model_id: instance.model_id,
        model_version: instance.model_version,
        perspectives: ((frozen.inputs?.perspectives as ScorecardCalcResult['perspectives']) ?? []),
        // Frozen per-line values: each snapshot line item is a to_jsonb(calculated_values) row
        // whose inputs carry {ref_type, weight, detail} from the calc engine.
        lines: lineItems.map(({ entity_id, payload }) => {
          const inp = (payload.inputs ?? {}) as { ref_type?: string; weight?: number; detail?: Record<string, unknown> };
          return {
            line_id: entity_id,
            ref_type: inp.ref_type ?? '',
            perspective_id: '',
            weight: inp.weight ?? 0,
            score: Number(payload.score ?? payload.value ?? 0),
            has_data: payload.value != null,
            status_key: (payload.status_key as string) ?? null,
            detail: inp.detail ?? {},
          };
        }),
        calculated_at: (frozen as { calculated_at?: string }).calculated_at ?? '',
      };
    }
    return run(typedRpc('strata_calc_scorecard_instance', { p_instance: instance.id }));
  },
};

// ── KPI / OKR ────────────────────────────────────────────────────────────────
export const kpiApi = {
  list: (): Promise<StrataKpi[]> => run(typedQuery('strata_kpis').select('*').order('name')),
  bySlug: (slug: string): Promise<StrataKpi | null> =>
    run(typedQuery('strata_kpis').select('*').eq('slug', slug).maybeSingle()),
  formulaVersions: (kpiId: string): Promise<StrataKpiFormulaVersion[]> =>
    run(typedQuery('strata_kpi_formula_versions').select('*').eq('kpi_id', kpiId).order('version', { ascending: false })),
  targets: (kpiId: string): Promise<StrataKpiTarget[]> =>
    run(typedQuery('strata_kpi_targets').select('*').eq('kpi_id', kpiId)),
  actuals: (kpiId: string): Promise<StrataKpiActual[]> =>
    run(typedQuery('strata_kpi_actuals').select('*').eq('kpi_id', kpiId).order('submitted_at', { ascending: false })),
  actualsForPeriod: (periodId: string): Promise<StrataKpiActual[]> =>
    run(typedQuery('strata_kpi_actuals').select('*').eq('period_id', periodId)),
  achievement: (kpiId: string, periodId: string) =>
    run(typedRpc('strata_calc_kpi_achievement', { p_kpi: kpiId, p_period: periodId })),
  ytd: (kpiId: string, cycleId: string, method: 'sum' | 'avg' | 'last' = 'avg') =>
    run(typedRpc('strata_calc_ytd', { p_kpi: kpiId, p_cycle: cycleId, p_method: method })),
  attestActual: (actualId: string, verdict: 'validated' | 'rejected' | 'quarantined', note?: string) =>
    run(typedRpc('strata_attest_actual', { p_actual: actualId, p_verdict: verdict, p_note: note ?? null })),
  approveKpi: (kpiId: string, note?: string) =>
    run(typedRpc('strata_approve_kpi', { p_kpi: kpiId, p_note: note ?? null })),
  approveFormulaVersion: (formulaId: string, note?: string) =>
    run(typedRpc('strata_approve_formula_version', { p_formula: formulaId, p_note: note ?? null })),
  okrs: (): Promise<StrataOkr[]> => run(typedQuery('strata_okrs').select('*').order('created_at', { ascending: false })),
  keyResults: (okrId: string): Promise<StrataKeyResult[]> =>
    run(typedQuery('strata_key_results').select('*').eq('okr_id', okrId).order('order_index')),
  commentary: (entityType: string, entityId: string) =>
    run(typedQuery('strata_commentary').select('*').eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false })),
};

// ── Execution ────────────────────────────────────────────────────────────────
export const executionApi = {
  initiatives: (): Promise<StrataInitiative[]> =>
    run(typedQuery('strata_initiatives').select('*').order('name')),
  initiativeBySlug: (slug: string): Promise<StrataInitiative | null> =>
    run(typedQuery('strata_initiatives').select('*').eq('slug', slug).maybeSingle()),
  initiativeElements: () => run(typedQuery('strata_initiative_elements').select('*')),
  initiativeKpis: () => run(typedQuery('strata_initiative_kpis').select('*')),
  initiativeProjects: (): Promise<StrataInitiativeProject[]> =>
    run(typedQuery('strata_initiative_projects').select('*')),
  projectCards: (): Promise<StrataProjectCard[]> =>
    run(typedQuery('strata_project_cards').select('*').order('name')),
  milestones: (projectCardId?: string): Promise<StrataMilestone[]> => {
    let q = typedQuery('strata_milestones').select('*').order('order_index');
    if (projectCardId) q = q.eq('project_card_id', projectCardId);
    return run(q);
  },
  dependencies: (): Promise<StrataDependency[]> =>
    run(typedQuery('strata_dependencies').select('*').order('due_date')),
  execProgress: (projectCardId: string, schemeId?: string) =>
    run(typedRpc('strata_calc_execution_progress', { p_project: projectCardId, p_scheme: schemeId ?? null })),
};

// ── Value / VMO ──────────────────────────────────────────────────────────────
export const valueApi = {
  portfolioBySlug: (slug: string): Promise<StrataPortfolio | null> =>
    run(typedQuery('strata_portfolios').select('*').eq('slug', slug).maybeSingle()),
  portfolios: (): Promise<StrataPortfolio[]> =>
    run(typedQuery('strata_portfolios').select('*').order('name')),
  memberships: (portfolioId: string) =>
    run(typedQuery('strata_portfolio_memberships').select('*').eq('portfolio_id', portfolioId).order('priority')),
  benefits: (portfolioId?: string): Promise<StrataBenefit[]> => {
    let q = typedQuery('strata_benefits').select('*').order('name');
    if (portfolioId) q = q.eq('portfolio_id', portfolioId);
    return run(q);
  },
  benefitBySlug: (slug: string): Promise<StrataBenefit | null> =>
    run(typedQuery('strata_benefits').select('*').eq('slug', slug).maybeSingle()),
  benefitValues: (benefitId: string): Promise<StrataBenefitValue[]> =>
    run(typedQuery('strata_benefit_values').select('*').eq('benefit_id', benefitId)),
  assumptions: (benefitId: string): Promise<StrataAssumption[]> =>
    run(typedQuery('strata_assumptions').select('*').eq('benefit_id', benefitId)),
  attributionRules: (benefitId: string) =>
    run(typedQuery('strata_attribution_rules').select('*').eq('benefit_id', benefitId)),
  benefitInitiatives: () => run(typedQuery('strata_benefit_initiatives').select('*')),
  gateInstances: (): Promise<StrataGateInstance[]> =>
    run(typedQuery('strata_gate_instances').select('*').order('scheduled_for')),
  gateEvidence: (gateInstanceId: string) =>
    run(typedQuery('strata_gate_evidence').select('*').eq('gate_instance_id', gateInstanceId)),
  decideGate: (gateId: string, verdict: string, note?: string) =>
    run(typedRpc('strata_decide_gate', { p_gate: gateId, p_verdict: verdict, p_note: note ?? null })),
  validateBenefitValue: (valueId: string, verdict: 'validated' | 'rejected', note?: string) =>
    run(typedRpc('strata_validate_benefit_value', { p_value: valueId, p_verdict: verdict, p_note: note ?? null })),
  benefitRealization: (benefitId: string) =>
    run(typedRpc('strata_calc_benefit_realization', { p_benefit: benefitId })),
  valueAtRisk: (portfolioId: string) =>
    run(typedRpc('strata_calc_value_at_risk', { p_portfolio: portfolioId })),
};

// ── Lineage ──────────────────────────────────────────────────────────────────
export const lineageApi = {
  /** Batched calc-value history for many entities (one .in() query). */
  calcValuesForEntities: (entityType: string, entityIds: string[]): Promise<StrataCalculatedValue[]> =>
    entityIds.length === 0
      ? Promise.resolve([])
      : run(
          typedQuery('strata_calculated_values')
            .select('*')
            .eq('entity_type', entityType)
            .in('entity_id', entityIds)
            .order('calculated_at', { ascending: false })
            .limit(500),
        ),
  dataSources: (): Promise<StrataDataSource[]> =>
    run(typedQuery('strata_data_sources').select('*').order('name')),
  uploadRuns: (): Promise<StrataUploadRun[]> =>
    run(typedQuery('strata_upload_runs').select('*').order('started_at', { ascending: false })),
  runByKey: (runKey: string): Promise<StrataUploadRun | null> =>
    run(typedQuery('strata_upload_runs').select('*').eq('run_key', runKey).maybeSingle()),
  stagingRows: (uploadRunId: string): Promise<StrataStagingRow[]> =>
    run(typedQuery('strata_staging_rows').select('*').eq('upload_run_id', uploadRunId).order('row_number')),
  validationResults: (uploadRunId: string): Promise<StrataValidationResult[]> =>
    run(typedQuery('strata_validation_results').select('*').eq('upload_run_id', uploadRunId)),
  lineageForEntity: (entityTable: string, entityId: string) =>
    run(typedQuery('strata_lineage_records').select('*').eq('entity_table', entityTable).eq('entity_id', entityId)),
  /**
   * Governed ingest adapter (upload wizard). There is NO strata_ingest_* RPC
   * yet — RLS permits the run initiator (data_steward / kpi_owner /
   * strategy_office) to insert runs + staging rows directly, so this is the
   * honest client write path: create run → stage raw rows (validation_status
   * 'pending') → mark the run 'staging'. Validation/attestation/canonical
   * write stay server-side (strata_attest_actual + future validation RPC).
   */
  createUploadRun: (input: {
    data_source_id: string | null;
    template_id: string | null;
    template_version: number | null;
    channel: StrataUploadRun['channel'];
    file_name: string | null;
    file_hash: string | null;
    row_count_raw: number;
  }): Promise<StrataUploadRun> =>
    run(typedQuery('strata_upload_runs').insert(input).select('*').single()),
  insertStagingRows: async (
    uploadRunId: string,
    rows: Array<{ row_number: number; raw: Record<string, unknown>; target_entity: string | null }>,
  ): Promise<number> => {
    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH).map((r) => ({
        upload_run_id: uploadRunId,
        row_number: r.row_number,
        raw: r.raw,
        target_entity: r.target_entity,
        validation_status: 'pending',
      }));
      const out: Array<{ id: string }> = await run(
        typedQuery('strata_staging_rows').insert(batch).select('id'),
      );
      inserted += out.length;
    }
    return inserted;
  },
  markRunStaged: (runId: string, rowCountRaw: number): Promise<StrataUploadRun> =>
    run(
      typedQuery('strata_upload_runs')
        .update({ status: 'staging', row_count_raw: rowCountRaw })
        .eq('id', runId)
        .select('*')
        .single(),
    ),
  /** Latest calculated values (provenance included) for an entity. */
  calcValues: (entityType: string, entityId: string, limit = 20): Promise<StrataCalculatedValue[]> =>
    run(typedQuery('strata_calculated_values').select('*')
      .eq('entity_type', entityType).eq('entity_id', entityId)
      .order('calculated_at', { ascending: false }).limit(limit)),
  latestCalc: async (entityType: string, entityId: string, metricKey: string): Promise<StrataCalculatedValue | null> => {
    const rows: StrataCalculatedValue[] = await run(
      typedQuery('strata_calculated_values').select('*')
        .eq('entity_type', entityType).eq('entity_id', entityId).eq('metric_key', metricKey)
        .order('calculated_at', { ascending: false }).limit(1),
    );
    return rows[0] ?? null;
  },
};

// ── Governance ───────────────────────────────────────────────────────────────
export const governanceApi = {
  snapshots: (): Promise<StrataSnapshot[]> =>
    run(typedQuery('strata_snapshots').select('*').order('locked_at', { ascending: false })),
  snapshotByKey: (snapshotKey: string): Promise<StrataSnapshot | null> =>
    run(typedQuery('strata_snapshots').select('*').eq('snapshot_key', snapshotKey).maybeSingle()),
  snapshotItems: (snapshotId: string) =>
    run(typedQuery('strata_snapshot_items').select('*').eq('snapshot_id', snapshotId)),
  lockSnapshot: (name: string, cycleId: string, periodId: string, instanceIds?: string[]) =>
    run(typedRpc('strata_lock_snapshot', {
      p_name: name, p_cycle: cycleId, p_period: periodId,
      p_instance_ids: instanceIds ?? null, p_scope: null,
    })),
  closePeriod: (periodId: string, override = false, overrideReason?: string) =>
    run(typedRpc('strata_close_period', { p_period: periodId, p_override: override, p_override_reason: overrideReason ?? null })),
  decisions: (): Promise<StrataDecision[]> =>
    run(typedQuery('strata_decisions').select('*').order('created_at', { ascending: false })),
  actions: (): Promise<StrataAction[]> =>
    run(typedQuery('strata_actions').select('*').order('due_date')),
  boardPacks: (snapshotId: string): Promise<StrataBoardPack[]> =>
    run(typedQuery('strata_board_packs').select('*').eq('snapshot_id', snapshotId)),
  aiOutputs: (): Promise<StrataAiOutput[]> =>
    run(typedQuery('strata_ai_outputs').select('*').order('generated_at', { ascending: false })),
};
