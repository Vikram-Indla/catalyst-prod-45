/**
 * STRATA domain services — the ONLY layer that touches Supabase for strata_*.
 * Screens/hooks import from here. UI never computes enterprise scores:
 * every score/RAG/rollup/YTD/VaR number comes from the calc-engine RPCs
 * (strata_calc_*) or from frozen snapshot payloads.
 */
import { supabase, typedQuery, typedRpc } from '@/integrations/supabase/client';
import type {
  ExecutionImportDependencyRow, ExecutionImportMilestoneRow, ExecutionImportProjectCardRow, ExecutionImportResult,
  ScorecardCalcResult, StrataAction, StrataAiOutput, StrataAssumption, StrataBenefit,
  StrataBenefitProjectCard, StrataBenefitValue, StrataBoardPack, StrataCalculatedValue, StrataChangeRequest,
  StrataCycle, StrataDataSource, StrataDecision, StrataDependency, StrataGateInstance,
  StrataGateModel, StrataGateModelStage, StrataInitiative, StrataInitiativeProject,
  StrataKeyResult, StrataKpi, StrataKpiActual, StrataKpiFormulaVersion, StrataKpiTarget,
  StrataKpiTypeConfig, StrataMapEdge, StrataMilestone, StrataModelPerspective, StrataNotification, StrataNotificationRule, StrataOkr,
  StrataPeriod, StrataPerspective, StrataThemeCharter, StrataPortfolio, StrataProjectCard,
  StrataProjectCardFieldConfig, StrataProjectCardPicklist, StrataProjectCardSectionConfig,
  StrataProjectCardTabConfig, StrataRisk, StrataRole, StrataScorecardInstance, StrataScorecardLine,
  StrataScorecardModel, StrataSnapshot, StrataStagingRow, StrataStrategyElement, StrataThresholdScheme,
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
  // ── Project Card configuration engine (Execution Reconciliation §G) ──────
  // Direct table access under RLS (strategy_office | strata_admin write) —
  // same lightweight pattern as the Demand module's tab/section configs this
  // was modeled on, no governed-envelope workflow needed for UI layout config.
  projectCardTabConfigs: (cardType?: string): Promise<StrataProjectCardTabConfig[]> => {
    let q = typedQuery('strata_project_card_tab_configs').select('*').order('position');
    if (cardType !== undefined) q = q.or(`card_type.eq.${cardType},card_type.is.null`);
    return run(q);
  },
  projectCardSectionConfigs: (cardType?: string): Promise<StrataProjectCardSectionConfig[]> => {
    let q = typedQuery('strata_project_card_section_configs').select('*').order('position');
    if (cardType !== undefined) q = q.or(`card_type.eq.${cardType},card_type.is.null`);
    return run(q);
  },
  projectCardFieldConfigs: (cardType?: string): Promise<StrataProjectCardFieldConfig[]> => {
    let q = typedQuery('strata_project_card_field_configs').select('*').order('position');
    if (cardType !== undefined) q = q.or(`card_type.eq.${cardType},card_type.is.null`);
    return run(q);
  },
  projectCardPicklists: (picklistKey?: string): Promise<StrataProjectCardPicklist[]> => {
    let q = typedQuery('strata_project_card_picklists').select('*').eq('is_active', true).order('position');
    if (picklistKey) q = q.eq('picklist_key', picklistKey);
    return run(q);
  },
  upsertTabConfig: (tab: Partial<StrataProjectCardTabConfig> & { tab_key: string }) =>
    run(typedQuery('strata_project_card_tab_configs').upsert(tab, { onConflict: 'card_type,tab_key' }).select('*').single()),
  upsertSectionConfig: (section: Partial<StrataProjectCardSectionConfig> & { tab_key: string; section_key: string }) =>
    run(typedQuery('strata_project_card_section_configs').upsert(section, { onConflict: 'card_type,tab_key,section_key' }).select('*').single()),
  upsertFieldConfig: (field: Partial<StrataProjectCardFieldConfig> & { field_key: string; tab_key: string }) =>
    run(typedQuery('strata_project_card_field_configs').upsert(field, { onConflict: 'card_type,field_key' }).select('*').single()),
  upsertPicklistValue: (entry: Partial<StrataProjectCardPicklist> & { picklist_key: string; value: string; label: string }) =>
    run(typedQuery('strata_project_card_picklists').upsert(entry, { onConflict: 'picklist_key,value' }).select('*').single()),
  deletePicklistValue: (id: string) => run(typedQuery('strata_project_card_picklists').delete().eq('id', id).select('id')),
};

// ── Strategy ─────────────────────────────────────────────────────────────────
export const strategyApi = {
  cycles: (): Promise<StrataCycle[]> =>
    run(typedQuery('strata_cycles').select('*').order('starts_on', { ascending: false })),
  periods: (cycleId: string): Promise<StrataPeriod[]> =>
    run(typedQuery('strata_periods').select('*').eq('cycle_id', cycleId).order('starts_on')),
  elements: (cycleId: string): Promise<StrataStrategyElement[]> =>
    run(typedQuery('strata_strategy_elements').select('*').eq('cycle_id', cycleId).order('order_index')),
  elementBySlug: (slug: string): Promise<StrataStrategyElement | null> =>
    run(typedQuery('strata_strategy_elements').select('*').eq('slug', slug).maybeSingle()),
  edges: (cycleId: string): Promise<StrataMapEdge[]> =>
    run(typedQuery('strata_map_edges').select('*').eq('cycle_id', cycleId)),
  charters: (): Promise<StrataThemeCharter[]> =>
    run(typedQuery('strata_theme_charters').select('*')),
  elementKpis: (): Promise<Array<{ element_id: string; kpi_id: string; weight: number | null }>> =>
    run(typedQuery('strata_element_kpis').select('element_id, kpi_id, weight')),
  updateMapPosition: (elementId: string, pos: { x: number; y: number }) =>
    run(typedQuery('strata_strategy_elements').update({ map_position: pos }).eq('id', elementId).select('id')),
  createEdge: (edge: Pick<StrataMapEdge, 'cycle_id' | 'from_element_id' | 'to_element_id' | 'relationship_type'> & { confidence?: number }) =>
    run(typedQuery('strata_map_edges').insert(edge).select('*').single()),
  promoteElement: (elementId: string) =>
    run(typedRpc('strata_promote_element', { p_element: elementId })),
  // ── Authoring write paths (Recovery: Lane A) — all server-validated RPCs ──
  createCycle: (input: {
    name: string; startsOn: string; endsOn: string;
    granularity?: string; description?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_cycle', {
      p_name: input.name, p_starts_on: input.startsOn, p_ends_on: input.endsOn,
      p_granularity: input.granularity ?? 'quarter', p_description: input.description ?? null,
    })),
  updateCycle: (cycleId: string, patch: {
    name?: string; description?: string; startsOn?: string; endsOn?: string;
    granularity?: string; status?: string;
  }) =>
    run(typedRpc('strata_update_cycle', {
      p_cycle: cycleId, p_name: patch.name ?? null, p_description: patch.description ?? null,
      p_starts_on: patch.startsOn ?? null, p_ends_on: patch.endsOn ?? null,
      p_granularity: patch.granularity ?? null, p_status: patch.status ?? null,
    })),
  createPeriod: (input: {
    cycleId: string; name: string; periodType: string; startsOn: string; endsOn: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_period', {
      p_cycle: input.cycleId, p_name: input.name, p_period_type: input.periodType,
      p_starts_on: input.startsOn, p_ends_on: input.endsOn,
    })),
  generatePeriods: (cycleId: string): Promise<number> =>
    run(typedRpc('strata_generate_periods', { p_cycle: cycleId })),
  createElement: (input: {
    cycleId: string; elementType: string; name: string;
    parentId?: string; perspectiveId?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_strategy_element', {
      p_cycle: input.cycleId, p_element_type: input.elementType, p_name: input.name,
      p_parent: input.parentId ?? null, p_perspective: input.perspectiveId ?? null,
    })),
  updateElement: (elementId: string, patch: {
    name?: string; description?: string; ownerId?: string; perspectiveId?: string;
    parentId?: string; stage?: string; orderIndex?: number;
    clearParent?: boolean; clearOwner?: boolean;
  }) =>
    run(typedRpc('strata_update_element', {
      p_element: elementId, p_name: patch.name ?? null, p_description: patch.description ?? null,
      p_owner: patch.ownerId ?? null, p_perspective: patch.perspectiveId ?? null,
      p_parent: patch.parentId ?? null, p_stage: patch.stage ?? null,
      p_order_index: patch.orderIndex ?? null,
      p_clear_parent: patch.clearParent ?? false, p_clear_owner: patch.clearOwner ?? false,
    })),
  retireElement: (elementId: string, reason?: string) =>
    run(typedRpc('strata_retire_element', { p_element: elementId, p_reason: reason ?? null })),
  upsertCharter: (input: {
    elementId: string; hypothesis?: string; scope?: string; valueThesis?: string;
    gateModelId?: string; ownerId?: string;
  }): Promise<string> =>
    run(typedRpc('strata_upsert_theme_charter', {
      p_element: input.elementId, p_hypothesis: input.hypothesis ?? null,
      p_scope: input.scope ?? null, p_value_thesis: input.valueThesis ?? null,
      p_gate_model: input.gateModelId ?? null, p_owner: input.ownerId ?? null,
    })),
  linkElementKpi: (elementId: string, kpiId: string, weight?: number, contribution?: 'direct' | 'supporting') =>
    run(typedRpc('strata_link_element_kpi', {
      p_element: elementId, p_kpi: kpiId, p_weight: weight ?? null,
      p_contribution: contribution ?? 'direct',
    })),
  unlinkElementKpi: (elementId: string, kpiId: string) =>
    run(typedRpc('strata_unlink_element_kpi', { p_element: elementId, p_kpi: kpiId })),
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
  // ── Authoring write paths (Recovery: Lane B) ──────────────────────────────
  createKpi: (input: {
    name: string; unit?: string; direction?: string; frequency?: string; entryMethod?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_kpi', {
      p_name: input.name, p_unit: input.unit ?? null,
      p_direction: input.direction ?? 'higher_better',
      p_frequency: input.frequency ?? 'quarterly',
      p_entry_method: input.entryMethod ?? 'upload',
    })),
  updateKpi: (kpiId: string, patch: {
    name?: string; unit?: string; direction?: string; frequency?: string; entryMethod?: string;
    accountableOwnerId?: string; dataOwnerId?: string; reporterId?: string;
    validatorId?: string; escalationOwnerId?: string; dataSourceId?: string;
    thresholdSchemeId?: string; kpiTypeId?: string;
    clearValidator?: boolean; clearDataSource?: boolean; clearEscalationOwner?: boolean;
  }) =>
    run(typedRpc('strata_update_kpi', {
      p_kpi: kpiId, p_name: patch.name ?? null, p_unit: patch.unit ?? null,
      p_direction: patch.direction ?? null, p_frequency: patch.frequency ?? null,
      p_entry_method: patch.entryMethod ?? null,
      p_accountable_owner: patch.accountableOwnerId ?? null,
      p_data_owner: patch.dataOwnerId ?? null, p_reporter: patch.reporterId ?? null,
      p_validator: patch.validatorId ?? null, p_escalation_owner: patch.escalationOwnerId ?? null,
      p_data_source: patch.dataSourceId ?? null, p_threshold_scheme: patch.thresholdSchemeId ?? null,
      p_kpi_type: patch.kpiTypeId ?? null,
      p_clear_validator: patch.clearValidator ?? false,
      p_clear_data_source: patch.clearDataSource ?? false,
      p_clear_escalation_owner: patch.clearEscalationOwner ?? false,
    })),
  createFormulaVersion: (input: {
    kpiId: string; expression: string; variables?: Record<string, unknown>;
    formulaType?: string; changeReason?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_formula_version', {
      p_kpi: input.kpiId, p_expression: input.expression,
      p_variables: input.variables ?? {}, p_formula_type: input.formulaType ?? 'ratio_to_target',
      p_change_reason: input.changeReason ?? null,
    })),
  createTarget: (input: {
    kpiId: string; periodId: string; target: number; baseline?: number;
    bandMin?: number; bandMax?: number; tolerance?: number; targetType?: 'point' | 'band' | 'milestone';
  }): Promise<string> =>
    run(typedRpc('strata_create_kpi_target', {
      p_kpi: input.kpiId, p_period: input.periodId, p_target: input.target,
      p_baseline: input.baseline ?? null, p_band_min: input.bandMin ?? null,
      p_band_max: input.bandMax ?? null, p_tolerance: input.tolerance ?? null,
      p_target_type: input.targetType ?? 'point',
    })),
  submitActual: (input: {
    kpiId: string; periodId: string; value: number; note?: string;
    confidence?: number; evidence?: Record<string, unknown>;
  }): Promise<string> =>
    run(typedRpc('strata_submit_kpi_actual', {
      p_kpi: input.kpiId, p_period: input.periodId, p_value: input.value,
      p_note: input.note ?? null, p_confidence: input.confidence ?? null,
      p_evidence: input.evidence ?? null,
    })),
  createOkr: (input: {
    name: string; cycleId?: string; objectiveElementId?: string; periodId?: string; ownerId?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_okr', {
      p_name: input.name, p_cycle: input.cycleId ?? null,
      p_objective_element: input.objectiveElementId ?? null,
      p_period: input.periodId ?? null, p_owner: input.ownerId ?? null,
    })),
  createKeyResult: (input: {
    okrId: string; name: string; kpiId?: string; unit?: string;
    baseline?: number; target?: number; currentValue?: number; direction?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_key_result', {
      p_okr: input.okrId, p_name: input.name, p_kpi: input.kpiId ?? null,
      p_unit: input.unit ?? null, p_baseline: input.baseline ?? null,
      p_target: input.target ?? null, p_current_value: input.currentValue ?? null,
      p_direction: input.direction ?? 'higher_better',
    })),
  updateKeyResult: (krId: string, patch: {
    currentValue?: number; name?: string; target?: number; status?: string; kpiId?: string;
  }) =>
    run(typedRpc('strata_update_key_result', {
      p_kr: krId, p_current_value: patch.currentValue ?? null, p_name: patch.name ?? null,
      p_target: patch.target ?? null, p_status: patch.status ?? null, p_kpi: patch.kpiId ?? null,
    })),
  /** Full evidence chain for one KPI+period (F-REP-005). Honest nulls. */
  evidenceChain: (kpiId: string, periodId: string): Promise<Record<string, unknown>> =>
    run(typedRpc('strata_kpi_evidence_chain', { p_kpi: kpiId, p_period: periodId })),
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
  projectCardBySlug: (slug: string): Promise<StrataProjectCard | null> =>
    run(typedQuery('strata_project_cards').select('*').eq('slug', slug).maybeSingle()),
  milestones: (projectCardId?: string): Promise<StrataMilestone[]> => {
    let q = typedQuery('strata_milestones').select('*').order('order_index');
    if (projectCardId) q = q.eq('project_card_id', projectCardId);
    return run(q);
  },
  dependencies: (): Promise<StrataDependency[]> =>
    run(typedQuery('strata_dependencies').select('*').order('due_date')),
  execProgress: (projectCardId: string, schemeId?: string) =>
    run(typedRpc('strata_calc_execution_progress', { p_project: projectCardId, p_scheme: schemeId ?? null })),
  executionLinks: () => run(typedQuery('strata_execution_links').select('*')),
  /** Jira connector (F-GOV-010): ph_jira mirror → source-agnostic cards + milestones, with run log + lineage. */
  syncJira: (): Promise<{ run_id: string; cards_created: number; cards_updated: number; milestones_synced: number }> =>
    run(typedRpc('strata_sync_jira', {})),
  // ── Authoring write paths (Recovery: Lanes C + D) ─────────────────────────
  createInitiative: (input: {
    name: string; cycleId?: string; description?: string; sponsorId?: string; ownerId?: string;
    stage?: string; budgetEnvelope?: number; businessCase?: string; valueHypothesis?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_initiative', {
      p_name: input.name, p_cycle: input.cycleId ?? null, p_description: input.description ?? null,
      p_sponsor: input.sponsorId ?? null, p_owner: input.ownerId ?? null,
      p_stage: input.stage ?? 'proposed', p_budget_envelope: input.budgetEnvelope ?? null,
      p_business_case: input.businessCase ?? null, p_value_hypothesis: input.valueHypothesis ?? null,
    })),
  updateInitiative: (initiativeId: string, patch: {
    name?: string; description?: string; sponsorId?: string; ownerId?: string;
    stage?: string; status?: string; budgetEnvelope?: number;
    businessCase?: string; valueHypothesis?: string;
    clearSponsor?: boolean; clearOwner?: boolean;
  }) =>
    run(typedRpc('strata_update_initiative', {
      p_initiative: initiativeId, p_name: patch.name ?? null, p_description: patch.description ?? null,
      p_sponsor: patch.sponsorId ?? null, p_owner: patch.ownerId ?? null,
      p_stage: patch.stage ?? null, p_status: patch.status ?? null,
      p_budget_envelope: patch.budgetEnvelope ?? null,
      p_business_case: patch.businessCase ?? null, p_value_hypothesis: patch.valueHypothesis ?? null,
      p_clear_sponsor: patch.clearSponsor ?? false, p_clear_owner: patch.clearOwner ?? false,
    })),
  archiveInitiative: (initiativeId: string, reason: string) =>
    run(typedRpc('strata_archive_initiative', { p_initiative: initiativeId, p_reason: reason })),
  linkInitiativeElement: (initiativeId: string, elementId: string, weight?: number) =>
    run(typedRpc('strata_link_initiative_element', {
      p_initiative: initiativeId, p_element: elementId, p_weight: weight ?? null,
    })),
  unlinkInitiativeElement: (initiativeId: string, elementId: string) =>
    run(typedRpc('strata_unlink_initiative_element', { p_initiative: initiativeId, p_element: elementId })),
  linkInitiativeKpi: (initiativeId: string, kpiId: string) =>
    run(typedRpc('strata_link_initiative_kpi', { p_initiative: initiativeId, p_kpi: kpiId })),
  unlinkInitiativeKpi: (initiativeId: string, kpiId: string) =>
    run(typedRpc('strata_unlink_initiative_kpi', { p_initiative: initiativeId, p_kpi: kpiId })),
  linkInitiativeProject: (initiativeId: string, projectId: string, confidence?: number) =>
    run(typedRpc('strata_link_initiative_project', {
      p_initiative: initiativeId, p_project: projectId, p_confidence: confidence ?? null,
      p_mapping_owner: null,
    })),
  unlinkInitiativeProject: (initiativeId: string, projectId: string) =>
    run(typedRpc('strata_unlink_initiative_project', { p_initiative: initiativeId, p_project: projectId })),
  createProjectCard: (input: {
    name: string; sourceSystem?: 'manual' | 'upload' | 'api' | 'jira'; sourceKey?: string;
    pmId?: string; sector?: string; budget?: number; baselineStart?: string;
    baselineEnd?: string; forecastEnd?: string; stage?: string; executionHealth?: string;
    themeId?: string; cardType?: string; businessOwnerId?: string;
    leadBusinessUnit?: string; deliveryTeam?: string; scopeDescription?: string;
    targetOutcomes?: string; successCriteria?: string;
    sponsorId?: string; businessCase?: string; valueHypothesis?: string;
    optionalFields?: Record<string, unknown>;
  }): Promise<string> =>
    run(typedRpc('strata_create_project_card', {
      p_name: input.name, p_source_system: input.sourceSystem ?? 'manual',
      p_source_key: input.sourceKey ?? null, p_pm: input.pmId ?? null,
      p_sector: input.sector ?? null, p_budget: input.budget ?? null,
      p_baseline_start: input.baselineStart ?? null, p_baseline_end: input.baselineEnd ?? null,
      p_forecast_end: input.forecastEnd ?? null, p_stage: input.stage ?? 'planning',
      p_execution_health: input.executionHealth ?? null, p_sync_metadata: null,
      p_theme: input.themeId ?? null, p_card_type: input.cardType ?? 'standard',
      p_business_owner: input.businessOwnerId ?? null,
      p_lead_business_unit: input.leadBusinessUnit ?? null, p_delivery_team: input.deliveryTeam ?? null,
      p_scope_description: input.scopeDescription ?? null, p_target_outcomes: input.targetOutcomes ?? null,
      p_success_criteria: input.successCriteria ?? null,
      p_sponsor: input.sponsorId ?? null, p_business_case: input.businessCase ?? null,
      p_value_hypothesis: input.valueHypothesis ?? null, p_optional_fields: input.optionalFields ?? null,
    })),
  updateProjectCard: (projectId: string, patch: {
    name?: string; pmId?: string; sector?: string; budget?: number;
    baselineStart?: string; baselineEnd?: string; forecastEnd?: string;
    stage?: string; executionHealth?: string; riskSummary?: string; dependencySummary?: string;
    clearPm?: boolean; clearExecutionHealth?: boolean;
    themeId?: string; cardType?: string; businessOwnerId?: string;
    leadBusinessUnit?: string; deliveryTeam?: string; scopeDescription?: string;
    targetOutcomes?: string; successCriteria?: string;
    sponsorId?: string; businessCase?: string; valueHypothesis?: string;
    optionalFields?: Record<string, unknown>;
    clearTheme?: boolean; clearSponsor?: boolean; clearBusinessOwner?: boolean;
  }) =>
    run(typedRpc('strata_update_project_card', {
      p_project: projectId, p_name: patch.name ?? null, p_pm: patch.pmId ?? null,
      p_sector: patch.sector ?? null, p_budget: patch.budget ?? null,
      p_baseline_start: patch.baselineStart ?? null, p_baseline_end: patch.baselineEnd ?? null,
      p_forecast_end: patch.forecastEnd ?? null, p_stage: patch.stage ?? null,
      p_execution_health: patch.executionHealth ?? null,
      p_risk_summary: patch.riskSummary ?? null, p_dependency_summary: patch.dependencySummary ?? null,
      p_clear_pm: patch.clearPm ?? false, p_clear_execution_health: patch.clearExecutionHealth ?? false,
      p_theme: patch.themeId ?? null, p_card_type: patch.cardType ?? null,
      p_business_owner: patch.businessOwnerId ?? null,
      p_lead_business_unit: patch.leadBusinessUnit ?? null, p_delivery_team: patch.deliveryTeam ?? null,
      p_scope_description: patch.scopeDescription ?? null, p_target_outcomes: patch.targetOutcomes ?? null,
      p_success_criteria: patch.successCriteria ?? null,
      p_sponsor: patch.sponsorId ?? null, p_business_case: patch.businessCase ?? null,
      p_value_hypothesis: patch.valueHypothesis ?? null, p_optional_fields: patch.optionalFields ?? null,
      p_clear_theme: patch.clearTheme ?? false, p_clear_sponsor: patch.clearSponsor ?? false,
      p_clear_business_owner: patch.clearBusinessOwner ?? false,
    })),
  archiveProjectCard: (projectId: string, reason: string) =>
    run(typedRpc('strata_archive_project_card', { p_project: projectId, p_reason: reason })),
  /** Project Objectives (Execution Reconciliation §K rule 7) — same strata_strategy_elements
   * framework as Theme Objectives (context='project'), linked to the card via strata_execution_links. */
  createProjectObjective: (input: {
    projectId: string; name: string; description?: string; parentThemeObjectiveId?: string; ownerId?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_project_objective', {
      p_project: input.projectId, p_name: input.name, p_description: input.description ?? null,
      p_parent_theme_objective: input.parentThemeObjectiveId ?? null, p_owner: input.ownerId ?? null,
    })),
  projectObjectives: async (projectId: string): Promise<StrataStrategyElement[]> => {
    const links: Array<{ to_id: string }> = await run(
      typedQuery('strata_execution_links').select('to_id')
        .eq('from_type', 'project_card').eq('from_id', projectId)
        .eq('to_type', 'element').eq('relationship_type', 'has_objective'),
    );
    if (links.length === 0) return [];
    return run(typedQuery('strata_strategy_elements').select('*').in('id', links.map((l) => l.to_id)));
  },
  /** Project KPIs / Measures (Execution Reconciliation §K rule 8) — same strata_kpis
   * framework as Theme KPIs, linked to the card + optionally rolled up to a Theme KPI. */
  createProjectKpi: (input: {
    projectId: string; name: string; unit?: string; direction?: string; frequency?: string;
    entryMethod?: string; parentThemeKpiId?: string; accountableOwnerId?: string; validatorId?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_project_kpi', {
      p_project: input.projectId, p_name: input.name, p_unit: input.unit ?? null,
      p_direction: input.direction ?? 'higher_better', p_frequency: input.frequency ?? 'quarterly',
      p_entry_method: input.entryMethod ?? 'manual', p_parent_theme_kpi: input.parentThemeKpiId ?? null,
      p_accountable_owner: input.accountableOwnerId ?? null, p_validator: input.validatorId ?? null,
    })),
  projectKpis: async (projectId: string): Promise<StrataKpi[]> => {
    const links: Array<{ to_id: string }> = await run(
      typedQuery('strata_execution_links').select('to_id')
        .eq('from_type', 'project_card').eq('from_id', projectId)
        .eq('to_type', 'kpi').eq('relationship_type', 'measures'),
    );
    if (links.length === 0) return [];
    return run(typedQuery('strata_kpis').select('*').in('id', links.map((l) => l.to_id)));
  },
  /** Theme KPI this Project KPI rolls up to, if any. */
  parentThemeKpi: async (projectKpiId: string): Promise<string | null> => {
    const links: Array<{ to_id: string }> = await run(
      typedQuery('strata_execution_links').select('to_id')
        .eq('from_type', 'kpi').eq('from_id', projectKpiId)
        .eq('to_type', 'kpi').eq('relationship_type', 'rolls_up_to'),
    );
    return links[0]?.to_id ?? null;
  },
  linkExecution: (input: {
    fromType: string; fromId: string; toType: string; toId: string;
    relationship?: string; confidence?: number;
  }) =>
    run(typedRpc('strata_link_execution', {
      p_from_type: input.fromType, p_from_id: input.fromId,
      p_to_type: input.toType, p_to_id: input.toId,
      p_relationship: input.relationship ?? 'contributes_to',
      p_confidence: input.confidence ?? null, p_metadata: null,
    })),
  unlinkExecution: (linkId: string) =>
    run(typedRpc('strata_unlink_execution', { p_link: linkId })),
  createMilestone: (input: {
    projectId: string; name: string; ownerId?: string; baselineStart?: string;
    baselineEnd?: string; forecastDate?: string; actualDate?: string;
    status?: string; progress?: number; weight?: number;
    sourceSystem?: string; sourceReferenceKey?: string; sourceIssueId?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_milestone', {
      p_project: input.projectId, p_name: input.name, p_owner: input.ownerId ?? null,
      p_baseline_start: input.baselineStart ?? null, p_baseline_end: input.baselineEnd ?? null,
      p_forecast_date: input.forecastDate ?? null, p_actual_date: input.actualDate ?? null,
      p_status: input.status ?? 'planned', p_progress: input.progress ?? 0,
      p_weight: input.weight ?? 1,
      p_source_system: input.sourceSystem ?? null, p_source_reference_key: input.sourceReferenceKey ?? null,
      p_source_issue_id: input.sourceIssueId ?? null,
    })),
  updateMilestone: (milestoneId: string, patch: {
    name?: string; ownerId?: string; baselineStart?: string; baselineEnd?: string;
    forecastDate?: string; actualDate?: string; status?: string; progress?: number; weight?: number;
    sourceSystem?: string; sourceReferenceKey?: string; sourceIssueId?: string;
  }) =>
    run(typedRpc('strata_update_milestone', {
      p_milestone: milestoneId, p_name: patch.name ?? null, p_owner: patch.ownerId ?? null,
      p_baseline_start: patch.baselineStart ?? null, p_baseline_end: patch.baselineEnd ?? null,
      p_forecast_date: patch.forecastDate ?? null, p_actual_date: patch.actualDate ?? null,
      p_status: patch.status ?? null, p_progress: patch.progress ?? null,
      p_weight: patch.weight ?? null,
      p_source_system: patch.sourceSystem ?? null, p_source_reference_key: patch.sourceReferenceKey ?? null,
      p_source_issue_id: patch.sourceIssueId ?? null,
    })),
  createDependency: (input: {
    requestingType: 'initiative' | 'project_card'; requestingId: string;
    servingType: 'initiative' | 'project_card' | 'external'; servingId?: string; servingLabel?: string;
    dependencyType?: string; dueDate?: string; slaDays?: number; impact?: string;
    isBlocker?: boolean; status?: string;
    description?: string; ownerId?: string; baselineStart?: string; baselineEnd?: string;
    sourceSystem?: string; sourceReferenceKey?: string; sourceIssueId?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_dependency', {
      p_requesting_type: input.requestingType, p_requesting_id: input.requestingId,
      p_serving_type: input.servingType, p_serving_id: input.servingId ?? null,
      p_serving_label: input.servingLabel ?? null,
      p_dependency_type: input.dependencyType ?? 'delivery',
      p_due_date: input.dueDate ?? null, p_sla_days: input.slaDays ?? null,
      p_impact: input.impact ?? null, p_is_blocker: input.isBlocker ?? false,
      p_status: input.status ?? 'open',
      p_description: input.description ?? null, p_owner: input.ownerId ?? null,
      p_baseline_start: input.baselineStart ?? null, p_baseline_end: input.baselineEnd ?? null,
      p_source_system: input.sourceSystem ?? null, p_source_reference_key: input.sourceReferenceKey ?? null,
      p_source_issue_id: input.sourceIssueId ?? null,
    })),
  updateDependency: (dependencyId: string, patch: {
    status?: string; dueDate?: string; slaDays?: number; impact?: string;
    isBlocker?: boolean; servingLabel?: string;
    description?: string; ownerId?: string; baselineStart?: string; baselineEnd?: string;
    sourceSystem?: string; sourceReferenceKey?: string; sourceIssueId?: string; clearOwner?: boolean;
  }) =>
    run(typedRpc('strata_update_dependency', {
      p_dependency: dependencyId, p_status: patch.status ?? null,
      p_due_date: patch.dueDate ?? null, p_sla_days: patch.slaDays ?? null,
      p_impact: patch.impact ?? null, p_is_blocker: patch.isBlocker ?? null,
      p_serving_label: patch.servingLabel ?? null,
      p_description: patch.description ?? null, p_owner: patch.ownerId ?? null,
      p_baseline_start: patch.baselineStart ?? null, p_baseline_end: patch.baselineEnd ?? null,
      p_source_system: patch.sourceSystem ?? null, p_source_reference_key: patch.sourceReferenceKey ?? null,
      p_source_issue_id: patch.sourceIssueId ?? null, p_clear_owner: patch.clearOwner ?? false,
    })),
  // ── Risks (STRATA-E2E-006) ────────────────────────────────────────────────
  risks: (projectCardId?: string): Promise<StrataRisk[]> => {
    let q = typedQuery('strata_risks').select('*').order('created_at', { ascending: false });
    if (projectCardId) q = q.eq('project_card_id', projectCardId);
    return run(q);
  },
  createRisk: (input: {
    projectId: string; title: string; description?: string;
    likelihood?: string; impact?: string; status?: string;
    ownerId?: string; mitigation?: string; targetDate?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_risk', {
      p_project: input.projectId, p_title: input.title, p_description: input.description ?? null,
      p_likelihood: input.likelihood ?? null, p_impact: input.impact ?? null,
      p_status: input.status ?? 'open', p_owner: input.ownerId ?? null,
      p_mitigation: input.mitigation ?? null, p_target_date: input.targetDate ?? null,
    })),
  updateRisk: (riskId: string, patch: {
    title?: string; description?: string; likelihood?: string; impact?: string;
    status?: string; ownerId?: string; mitigation?: string; targetDate?: string; clearOwner?: boolean;
  }) =>
    run(typedRpc('strata_update_risk', {
      p_risk: riskId, p_title: patch.title ?? null, p_description: patch.description ?? null,
      p_likelihood: patch.likelihood ?? null, p_impact: patch.impact ?? null,
      p_status: patch.status ?? null, p_owner: patch.ownerId ?? null,
      p_mitigation: patch.mitigation ?? null, p_target_date: patch.targetDate ?? null,
      p_clear_owner: patch.clearOwner ?? false,
    })),
  deleteRisk: (riskId: string) => run(typedRpc('strata_delete_risk', { p_risk: riskId })),
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
  /** Benefit ↔ Project Card attribution (Execution Reconciliation §K rule 19) — the
   * primary attribution path going forward; Theme-level rollup derives via project_card.theme_id. */
  benefitProjectCards: (): Promise<StrataBenefitProjectCard[]> =>
    run(typedQuery('strata_benefit_project_cards').select('*')),
  linkBenefitProjectCard: (benefitId: string, projectCardId: string, attributionShare?: number): Promise<StrataBenefitProjectCard> =>
    run(typedQuery('strata_benefit_project_cards').insert({
      benefit_id: benefitId, project_card_id: projectCardId, attribution_share: attributionShare ?? null,
    }).select('*').single()),
  unlinkBenefitProjectCard: (benefitId: string, projectCardId: string) =>
    run(typedQuery('strata_benefit_project_cards').delete()
      .eq('benefit_id', benefitId).eq('project_card_id', projectCardId).select('id')),
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
  // ── Authoring write paths (Recovery: Lane E) ──────────────────────────────
  createPortfolio: (input: {
    name: string; description?: string; categoryId?: string; ownerId?: string; valueTarget?: number;
  }): Promise<string> =>
    run(typedRpc('strata_create_portfolio', {
      p_name: input.name, p_description: input.description ?? null,
      p_category: input.categoryId ?? null, p_owner: input.ownerId ?? null,
      p_value_target: input.valueTarget ?? null,
    })),
  updatePortfolio: (portfolioId: string, patch: {
    name?: string; description?: string; categoryId?: string; ownerId?: string;
    valueTarget?: number; status?: 'active' | 'archived';
    clearOwner?: boolean; clearCategory?: boolean;
  }) =>
    run(typedRpc('strata_update_portfolio', {
      p_portfolio: portfolioId, p_name: patch.name ?? null, p_description: patch.description ?? null,
      p_category: patch.categoryId ?? null, p_owner: patch.ownerId ?? null,
      p_value_target: patch.valueTarget ?? null, p_status: patch.status ?? null,
      p_clear_owner: patch.clearOwner ?? false, p_clear_category: patch.clearCategory ?? false,
    })),
  addPortfolioMember: (portfolioId: string, memberType: 'initiative' | 'project_card', memberId: string, allocationPct?: number, priority?: number) =>
    run(typedRpc('strata_add_portfolio_member', {
      p_portfolio: portfolioId, p_member_type: memberType, p_member_id: memberId,
      p_allocation_pct: allocationPct ?? null, p_priority: priority ?? null,
    })),
  removePortfolioMember: (portfolioId: string, memberType: 'initiative' | 'project_card', memberId: string) =>
    run(typedRpc('strata_remove_portfolio_member', {
      p_portfolio: portfolioId, p_member_type: memberType, p_member_id: memberId,
    })),
  createBenefit: (input: { name: string; portfolioId?: string; categoryId?: string }): Promise<string> =>
    run(typedRpc('strata_create_benefit', {
      p_portfolio: input.portfolioId ?? null, p_name: input.name, p_category: input.categoryId ?? null,
    })),
  updateBenefit: (benefitId: string, patch: {
    name?: string; description?: string; ownerId?: string; validatorId?: string;
    unit?: string; categoryId?: string; portfolioId?: string; valueHypothesis?: string;
    causalMechanism?: string; confidence?: number; lifecycleStage?: string;
    clearOwner?: boolean; clearValidator?: boolean;
  }) =>
    run(typedRpc('strata_update_benefit', {
      p_benefit: benefitId, p_name: patch.name ?? null, p_description: patch.description ?? null,
      p_owner: patch.ownerId ?? null, p_validator: patch.validatorId ?? null,
      p_unit: patch.unit ?? null, p_category: patch.categoryId ?? null,
      p_portfolio: patch.portfolioId ?? null, p_value_hypothesis: patch.valueHypothesis ?? null,
      p_causal_mechanism: patch.causalMechanism ?? null, p_confidence: patch.confidence ?? null,
      p_lifecycle_stage: patch.lifecycleStage ?? null,
      p_clear_owner: patch.clearOwner ?? false, p_clear_validator: patch.clearValidator ?? false,
    })),
  createBenefitValue: (input: {
    benefitId: string; periodId: string; valueKind: 'baseline' | 'planned' | 'forecast' | 'realized'; value: number;
  }): Promise<string> =>
    run(typedRpc('strata_create_benefit_value', {
      p_benefit: input.benefitId, p_period: input.periodId,
      p_value_kind: input.valueKind, p_value: input.value,
    })),
  linkBenefitInitiative: (benefitId: string, initiativeId: string, attributionShare?: number) =>
    run(typedRpc('strata_link_benefit_initiative', {
      p_benefit: benefitId, p_initiative: initiativeId,
      p_attribution_share: attributionShare ?? null,
    })),
  unlinkBenefitInitiative: (benefitId: string, initiativeId: string) =>
    run(typedRpc('strata_unlink_benefit_initiative', { p_benefit: benefitId, p_initiative: initiativeId })),
  createAssumption: (input: {
    benefitId: string; description: string; ownerId?: string; confidence?: number; status?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_assumption', {
      p_benefit: input.benefitId, p_description: input.description,
      p_owner: input.ownerId ?? null, p_confidence: input.confidence ?? null,
      p_status: input.status ?? 'open',
    })),
  updateAssumption: (assumptionId: string, patch: {
    description?: string; ownerId?: string; confidence?: number; status?: string;
    clearOwner?: boolean;
  }) =>
    run(typedRpc('strata_update_assumption', {
      p_assumption: assumptionId, p_description: patch.description ?? null,
      p_owner: patch.ownerId ?? null, p_confidence: patch.confidence ?? null,
      p_status: patch.status ?? null, p_clear_owner: patch.clearOwner ?? false,
    })),
  createAttributionRule: (benefitId: string, ruleType: 'shared_benefit' | 'counterfactual' | 'double_counting', definition: Record<string, unknown>): Promise<string> =>
    run(typedRpc('strata_create_attribution_rule', {
      p_benefit: benefitId, p_rule_type: ruleType, p_definition: definition,
    })),
  scheduleGate: (input: {
    gateModelId: string; stageId: string;
    subjectType: 'initiative' | 'project_card' | 'benefit' | 'element'; subjectId: string;
    scheduledFor?: string;
  }): Promise<string> =>
    run(typedRpc('strata_schedule_gate', {
      p_gate_model: input.gateModelId, p_stage: input.stageId,
      p_subject_type: input.subjectType, p_subject_id: input.subjectId,
      p_scheduled_for: input.scheduledFor ?? null,
    })),
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
  // ── Pipeline actions (Recovery: F-KPI-005) — server-side validate/promote ─
  /** Validate a staged run against its template; writes row-level results. */
  validateRun: (runId: string): Promise<{ run_id: string; status: string; row_count_valid: number; row_count_rejected: number }> =>
    run(typedRpc('strata_validate_run', { p_run: runId })),
  /** Promote VALID rows of a completed run into canonical KPI actuals + lineage. */
  promoteRun: (runId: string): Promise<{ run_id: string; promoted: number; skipped: number }> =>
    run(typedRpc('strata_promote_run', { p_run: runId })),
};

// ── Execution manual Excel import (session 007) ─────────────────────────────
export const importApi = {
  /**
   * One RPC, two modes: p_dry_run=true previews validation with zero writes;
   * p_dry_run=false commits via the existing single-row create/update RPCs and
   * writes strata_upload_runs/strata_lineage_records/strata_audit_events.
   */
  importExecutionBatch: (input: {
    projectCards: ExecutionImportProjectCardRow[];
    milestones: ExecutionImportMilestoneRow[];
    dependencies: ExecutionImportDependencyRow[];
    dryRun: boolean;
    fileName: string | null;
  }): Promise<ExecutionImportResult> =>
    run(typedRpc('strata_import_execution_batch', {
      p_project_cards: input.projectCards,
      p_milestones: input.milestones,
      p_dependencies: input.dependencies,
      p_dry_run: input.dryRun,
      p_file_name: input.fileName,
    })),
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
  /**
   * Reconcile a pending pack row after client-side generation. RLS
   * (strata_board_packs_write, 20260705100400) permits this UPDATE only for
   * strategy_office — callers must gate on the role and never fake on failure.
   */
  markBoardPackReady: (packId: string): Promise<StrataBoardPack> =>
    run(
      typedQuery('strata_board_packs')
        .update({ status: 'ready', generated_at: new Date().toISOString() })
        .eq('id', packId)
        .select('*')
        .single(),
    ),
  // ── Board-pack persistence (CAT-STRATA-CLOSEOUT-20260710-001 W1) ──────────
  /**
   * Persist a generated pack binary to the private strata-board-packs bucket.
   * Storage RLS (20260710130000) permits writes only for strategy_office
   * (strata_is_admin bypass included) — callers surface failures verbatim.
   * Upsert: regenerating a snapshot's pack overwrites the same object path.
   */
  uploadBoardPackBinary: async (path: string, blob: Blob, contentType: string): Promise<string> => {
    const { error } = await supabase.storage
      .from('strata-board-packs')
      .upload(path, blob, { contentType, upsert: true });
    if (error) throw new Error(`Pack storage upload failed: ${error.message}`);
    return path;
  },
  /** Point an existing (pending) pack row at its stored binary and mark it ready. */
  markBoardPackStored: (packId: string, storagePath: string): Promise<StrataBoardPack> =>
    run(
      typedQuery('strata_board_packs')
        .update({ storage_path: storagePath, status: 'ready', generated_at: new Date().toISOString() })
        .eq('id', packId)
        .select('*')
        .single(),
    ),
  /** Create a ready pack row for a freshly stored binary (no pending row existed). */
  createBoardPackRecord: (snapshotId: string, format: 'pdf' | 'pptx', storagePath: string): Promise<StrataBoardPack> =>
    run(
      typedQuery('strata_board_packs')
        .insert({ snapshot_id: snapshotId, format, storage_path: storagePath, status: 'ready', generated_at: new Date().toISOString() })
        .select('*')
        .single(),
    ),
  /**
   * Short-lived signed URL for a stored pack (bucket is private — packs are
   * governance artifacts and must never be publicly addressable).
   */
  boardPackSignedUrl: async (storagePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('strata-board-packs')
      .createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) throw new Error(`Could not sign pack download: ${error?.message ?? 'no URL returned'}`);
    return data.signedUrl;
  },
  // ── Notifications (CAT-STRATA-CLOSEOUT-20260710-001 W3) ────────────────────
  notifications: (): Promise<StrataNotification[]> =>
    run(typedQuery('strata_notifications').select('*').order('created_at', { ascending: false }).limit(50)),
  markNotificationRead: (id: string): Promise<void> =>
    run(typedRpc('strata_mark_notification_read', { p_id: id })),
  markAllNotificationsRead: (): Promise<void> =>
    run(typedRpc('strata_mark_all_notifications_read', {})),
  notificationRules: (): Promise<StrataNotificationRule[]> =>
    run(typedQuery('strata_notification_rules').select('*').order('label')),
  setNotificationRule: (eventType: string, enabled: boolean, reason?: string): Promise<void> =>
    run(typedRpc('strata_set_notification_rule', { p_event_type: eventType, p_enabled: enabled, p_reason: reason ?? null })),
  aiOutputs: (): Promise<StrataAiOutput[]> =>
    run(typedQuery('strata_ai_outputs').select('*').order('generated_at', { ascending: false })),
  // ── Authoring write paths (Recovery: Lane G) ──────────────────────────────
  createDecision: (input: {
    title: string; decisionType?: 'governance' | 'gate' | 'escalation' | 'action_only';
    forum?: string; description?: string; ownerId?: string; dueDate?: string;
    snapshotId?: string; evidenceRefs?: Record<string, unknown>; elementId?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_decision', {
      p_title: input.title, p_decision_type: input.decisionType ?? 'governance',
      p_forum: input.forum ?? null, p_description: input.description ?? null,
      p_owner: input.ownerId ?? null, p_due_date: input.dueDate ?? null,
      p_snapshot: input.snapshotId ?? null, p_evidence_refs: input.evidenceRefs ?? null,
      p_element: input.elementId ?? null,
    })),
  updateDecision: (decisionId: string, patch: {
    status?: 'open' | 'decided' | 'closed'; description?: string; ownerId?: string; dueDate?: string;
  }) =>
    run(typedRpc('strata_update_decision', {
      p_decision: decisionId, p_status: patch.status ?? null,
      p_description: patch.description ?? null, p_owner: patch.ownerId ?? null,
      p_due_date: patch.dueDate ?? null,
    })),
  createAction: (input: {
    decisionId: string; title: string; ownerId?: string; dueDate?: string; note?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_action', {
      p_decision: input.decisionId, p_title: input.title,
      p_owner: input.ownerId ?? null, p_due_date: input.dueDate ?? null,
      p_note: input.note ?? null,
    })),
  updateAction: (actionId: string, patch: {
    status?: 'open' | 'in_progress' | 'done' | 'cancelled'; note?: string; ownerId?: string; dueDate?: string;
  }) =>
    run(typedRpc('strata_update_action', {
      p_action: actionId, p_status: patch.status ?? null, p_note: patch.note ?? null,
      p_owner: patch.ownerId ?? null, p_due_date: patch.dueDate ?? null,
    })),
  roleAssignments: () =>
    run(typedQuery('strata_role_assignments').select('*').order('granted_at', { ascending: false })),
  assignRole: (userId: string, role: StrataRole, scopeType = 'global', scopeEntityId?: string): Promise<string> =>
    run(typedRpc('strata_assign_role', {
      p_user: userId, p_role: role, p_scope_type: scopeType,
      p_scope_entity: scopeEntityId ?? null,
    })),
  revokeRole: (assignmentId: string) =>
    run(typedRpc('strata_revoke_role', { p_assignment: assignmentId })),
  /** AI advisory draft (F-GOV-009): edge function writes strata_ai_outputs pending human review. */
  generateAdvisory: async (periodId: string): Promise<{ id: string; confidence: number; review_status: string }> => {
    const { data, error } = await supabase.functions.invoke('strata-advisory', {
      body: { period_id: periodId },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(String(data.error));
    return data;
  },
  /** Human review of an advisory (reviewer ≠ author enforced by DB CHECK). */
  reviewAdvisory: async (advisoryId: string, verdict: 'approved' | 'rejected') => {
    const { data: auth } = await supabase.auth.getUser();
    return run(
      typedQuery('strata_ai_outputs')
        .update({ human_review_status: verdict, reviewed_by: auth.user?.id ?? null, reviewed_at: new Date().toISOString() })
        .eq('id', advisoryId)
        .select('id')
        .single(),
    );
  },
  /** Rule-driven Needs Attention feed (F-REP-004) — no seed rows. */
  needsAttention: (periodId?: string): Promise<Array<{
    item_type: string; severity: string; entity_type: string; entity_id: string;
    entity_name: string | null; detail: string; due_date: string | null;
    // CLOSEOUT W4: owner of the item (null where no single personal owner) — drives the "Mine" filter.
    owner_id: string | null;
  }>> =>
    run(typedRpc('strata_needs_attention', { p_period: periodId ?? null })),
};
