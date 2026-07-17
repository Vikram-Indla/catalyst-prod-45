/**
 * STRATA domain services — the ONLY layer that touches Supabase for strata_*.
 * Screens/hooks import from here. UI never computes enterprise scores:
 * every score/RAG/rollup/YTD/VaR number comes from the calc-engine RPCs
 * (strata_calc_*) or from frozen snapshot payloads.
 */
import { supabase, typedQuery, typedRpc } from '@/integrations/supabase/client';
import type {
  ExecutionImportDependencyRow, ExecutionImportMilestoneRow, ExecutionImportProjectCardRow, ExecutionImportResult,
  ScorecardCalcResult, ScorecardPlanVariance, StrataAction, StrataAiOutput, StrataAssumption, StrataBenefit,
  StrataBenefitProjectCard, StrataBenefitValue, StrataBlastRadius, StrataBoardPack, StrataBoardPackQualification,
  StrataCalculatedValue, StrataChangeRequest,
  StrataCycle, StrataDataSource, StrataDecision, StrataDependency, StrataGateInstance,
  StrataQuarantineResolution, StrataReversalEligibility, StrataReview, StrataReviewParticipant,
  StrataReviewReadiness, StrataRunReversal,
  StrataGateModel, StrataGateModelStage, StrataInitiative, StrataInitiativeProject,
  StrataBulkUpdateResult, StrataSavedView, StrataKeyResult, StrataKpi, StrataKpiActual, StrataKpiFormulaVersion, StrataKpiTarget,
  StrataKpiTypeConfig, StrataMapEdge, StrataMappingMemory, StrataMappingSuggestion,
  StrataMilestone, StrataModelPerspective, StrataNotification, StrataNotificationRule, StrataOkr,
  StrataPeriod, StrataPerspective, StrataThemeCharter, StrataPortfolio, StrataProjectCard,
  StrataProjectCardFieldConfig, StrataProjectCardPicklist, StrataProjectCardSectionConfig,
  StrataModelMeasure, StrataNotificationTarget, StrataProjectCardTabConfig, StrataRoleSod, StrataRisk, StrataRole, StrataScorecardInstance, StrataScorecardLine,
  StrataScorecardModel, StrataSnapshot, StrataStagingRow, StrataStrategyElement, StrataThresholdPreview, StrataThresholdScheme,
  StrataUploadRun, StrataUploadTemplate, StrataValidationResult, StrataValueCategory,
  StrataWorkflowConfig, ThresholdBand,
} from '../types';

/** Shape of strata_kpi_dependency_impact (KO-DEF-002). Counts only; no identifiers leak. */
export interface StrataKpiDependencyImpact {
  kpi_id: string;
  lineage_id: string;
  versions_in_lineage: number;
  current: {
    element_links: number; model_measures: number; scorecard_lines: number;
    key_results: number; initiative_links: number;
  };
  historical: {
    element_links: number; model_measures: number;
    scorecard_lines_locked: number; key_results_closed: number;
  };
  active_total: number;
}

/** Maps known Postgres/RPC errors to business-facing copy so schema, table and
 * constraint identifiers never reach the UI (V6-OPEN-024). Every domain call
 * funnels through run(), so this one map covers the whole STRATA module. Unknown
 * errors pass their original message through unchanged. */
function mapStrataError(error: { message: string; code?: string }): string {
  const msg = error.message ?? '';
  if (error.code === '23505') {
    // unique_violation — map the STRATA constraints we own by name.
    if (msg.includes('strata_benefit_values_benefit_id_period_id_value_kind')) {
      return 'A value already exists for this Benefit, Period and value kind. Refresh and edit the existing entry instead.';
    }
    if (msg.includes('uq_strata_milestones_card_name')) {
      return 'A milestone with this name already exists on this project card.';
    }
    // Generic fallback — never expose the raw constraint identifier.
    return 'That value conflicts with an existing record. Refresh and try again.';
  }
  return msg;
}

async function run<T>(q: PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw new Error(mapStrataError(error));
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
  /**
   * Unmet governed prerequisites for a KPI, empty when approvable (KO-DEF-001).
   * The SAME function the submit gate enforces — so the list shown to the user cannot drift
   * from the list the server applies.
   */
  kpiSubmissionBlockers: (kpiId: string): Promise<string[]> =>
    run(typedRpc('strata_kpi_submission_blockers', { p_kpi: kpiId })).then((r) => (r as string[] | null) ?? []),
  submitRecord: (table: string, id: string) =>
    run(typedRpc('strata_submit_record', { p_table: table, p_id: id })),
  approveRecord: (table: string, id: string, note?: string) =>
    run(typedRpc('strata_approve_record', { p_table: table, p_id: id, p_note: note ?? null })),
  retireRecord: (table: string, id: string, reason?: string) =>
    run(typedRpc('strata_retire_record', { p_table: table, p_id: id, p_reason: reason ?? null })),
  approveScorecardModel: (modelId: string, note?: string) =>
    run(typedRpc('strata_approve_scorecard_model', { p_model: modelId, p_note: note ?? null })),
  /**
   * D-2/D-3: the governed way to change an APPROVED model. Clones the complete aggregate into a
   * new draft at version+1 with supersedes_id set, and leaves the predecessor untouched. Approving
   * the draft is what supersedes the predecessor — strata_approve_record already does that.
   * The reason is required by the RPC (a version whose reason is NULL explains nothing).
   * Returns the new draft's id.
   */
  createModelDraftVersion: (modelId: string, reason: string): Promise<string> =>
    run(typedRpc('strata_create_model_draft_version', { p_model: modelId, p_reason: reason })),
  /**
   * D-2's KPI revision RPC (KO-DEF-002). Takes a THIRD argument the other two do not — the
   * revision class — which is why it cannot be expressed through the (id, reason) REVISION_RPC
   * map used by models/threshold schemes and is wired directly from the KPI detail page instead.
   *
   * The server clones definition columns + formula versions only, keeps the source lineage_id,
   * sets version = max+1 and supersedes_id, and leaves the Approved predecessor untouched.
   * Actuals, targets, Key Results, Scorecard lines, element links and model measures are
   * deliberately NOT copied — facts keep the version that produced them.
   */
  createKpiDraftVersion: (
    kpiId: string, reason: string, revisionClass: 'non_material' | 'material',
    effectiveFrom?: string | null,
  ): Promise<string> =>
    run(typedRpc('strata_create_kpi_draft_version', {
      p_kpi: kpiId, p_reason: reason, p_revision_class: revisionClass,
      p_effective_from: effectiveFrom ?? null,
    })),
  /** Dependency impact for a KPI across its lineage (KO-DEF-002). One server definition, shared
   *  by the retirement gate, the retirement modal and the revision modal — no client duplication. */
  kpiDependencyImpact: (kpiId: string): Promise<StrataKpiDependencyImpact> =>
    run(typedRpc('strata_kpi_dependency_impact', { p_kpi: kpiId })) as Promise<StrataKpiDependencyImpact>,
  /** Prospective governed retirement. Server blocks unless the dependency state is safe, or a
   *  replacement/exception is supplied; rejection text is surfaced verbatim in the modal. */
  retireKpi: (input: {
    kpiId: string; reason: string; effectiveTo: string;
    replacementId?: string | null; exception?: string | null;
  }): Promise<unknown> =>
    run(typedRpc('strata_retire_kpi', {
      p_kpi: input.kpiId, p_reason: input.reason, p_effective_to: input.effectiveTo,
      p_replacement: input.replacementId ?? null, p_exception: input.exception ?? null,
    })),
  /**
   * D-2's third revision RPC. Separate from the model one by ruling ("dedicated revision RPCs —
   * NOT one generic polymorphic RPC"), and separate in fact: a threshold scheme has no aggregate
   * children (its bands are jsonb on the row), so the clone is parent-only.
   */
  createThresholdDraftVersion: (schemeId: string, reason: string): Promise<string> =>
    run(typedRpc('strata_create_threshold_draft_version', { p_scheme: schemeId, p_reason: reason })),
  /**
   * R5 — the band editor's write path. There is deliberately NO RPC here: bands are a jsonb column
   * on the scheme row, and RLS is the entire gate. Probed 2026-07-17 on staging
   * (policy strata_threshold_schemes_update):
   *     USING  (status = 'draft' AND (created_by = auth.uid() OR strata_is_admin()))
   *     CHECK  (status = 'draft')
   * — note this is authorship-based, NOT the strategy_office role gate the revision RPC uses. A
   * strategy_office user who did not author the draft is refused. The UI mirrors this exact
   * predicate; it does not mirror the RPC's role gate, because it is not the rule in force here.
   *
   * `.select()` is load-bearing, not decoration. An UPDATE filtered out by RLS matches zero rows
   * and returns NO error — a silent no-op. Without reading the rows back, this would resolve
   * successfully and the UI would report a save that never happened. Zero rows = the server
   * declined; we say so rather than invent a success.
   */
  updateThresholdBands: async (schemeId: string, bands: ThresholdBand[]): Promise<StrataThresholdScheme> => {
    const rows: StrataThresholdScheme[] = await run(
      typedQuery('strata_threshold_schemes').update({ bands }).eq('id', schemeId).select(),
    );
    if (!rows || rows.length === 0) {
      // The server said nothing at all, so there is no server text to surface verbatim. This
      // states the policy that produced the silence — the two readings of zero rows — without
      // claiming which one applied.
      throw new Error(
        'The database applied no change. A threshold scheme’s bands are editable only while it is a draft, '
        + 'and only by the draft’s author or a strata_admin — or this scheme no longer exists. Refresh and check its status.',
      );
    }
    return rows[0];
  },
  /**
   * R5 capability 3 — preview-with-data. Re-bands the scores ALREADY stored for this scheme against
   * CANDIDATE (unsaved) bands and NAMES what moves, never merely counting: a decision needs to know
   * WHICH KPIs move, not how many.
   *
   * ⚠️ THE RESULT IS A COUNTERFACTUAL, NOT A CHANGELOG. Saving these bands would NOT re-rate a
   * single row in `moves`. A rating is written once, at calculation time, so new bands govern FUTURE
   * calculations only, and locked snapshots never re-rate (D-1). Never label these rows as "will
   * change" in the UI — they are values the candidate policy would rate differently.
   *
   * Writes NOTHING — not even an audit event: a preview is a question, not an act. The RPC is
   * STABLE, so Postgres enforces that at runtime rather than trusting the author.
   *
   * The banding rule is NOT re-derived here or in the RPC: both share strata_band_from_bands with
   * the live resolver strata_band_from_score, so a page-local copy cannot drift from the server's.
   *
   * `coverage_note` is a LOWER BOUND on coverage — values with no threshold_scheme_id in their
   * provenance, or no score, are invisible. Render it VERBATIM; absence from `moves` is not evidence.
   */
  previewThresholdScheme: (schemeId: string, bands: ThresholdBand[]): Promise<StrataThresholdPreview> =>
    run(typedRpc('strata_preview_threshold_scheme', { p_scheme: schemeId, p_bands: bands })),
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
  // ── Perspective authoring (V3-OPEN-011 #8) — direct-table writes under RLS ──
  // INSERT requires strata_admin | strategy_office AND status='draft'; UPDATE is
  // draft-only (WITH CHECK status='draft'). Lifecycle transitions (submit/approve/
  // retire) stay on the RPCs above — never set status here. slug is auto-derived
  // by a DB trigger and frozen, so it is never written.
  createPerspective: (input: {
    name: string; description?: string; orderIndex?: number;
    defaultWeight?: number; colorToken?: string; parentId?: string;
  }): Promise<StrataPerspective> =>
    run(typedQuery('strata_perspectives').insert({
      name: input.name,
      description: input.description ?? null,
      order_index: input.orderIndex ?? 0,
      default_weight: input.defaultWeight ?? null,
      color_token: input.colorToken ?? null,
      parent_id: input.parentId ?? null,
      status: 'draft',
    }).select('*').single()),
  updatePerspective: (id: string, patch: {
    name?: string; description?: string; orderIndex?: number;
    defaultWeight?: number; colorToken?: string; parentId?: string;
  }): Promise<StrataPerspective> =>
    run(typedQuery('strata_perspectives').update({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.orderIndex !== undefined ? { order_index: patch.orderIndex } : {}),
      ...(patch.defaultWeight !== undefined ? { default_weight: patch.defaultWeight } : {}),
      ...(patch.colorToken !== undefined ? { color_token: patch.colorToken } : {}),
      ...(patch.parentId !== undefined ? { parent_id: patch.parentId } : {}),
    }).eq('id', id).select('*').single()),
  // Edits the weight (+ optional order) of EXISTING model↔perspective rows only —
  // strategy_office has full write on strata_scorecard_model_perspectives. Does not
  // add/remove perspectives from the model. Errors surface verbatim to the caller.
  //
  // There is no RPC behind this path, so RLS is its only guard (P0-A). RLS now also requires the
  // parent model to be status='draft' — and a row filtered out by RLS makes UPDATE match zero
  // rows WITHOUT raising, so an unchecked call would report success having written nothing.
  // The row count is therefore load-bearing, not a sanity check.
  setModelPerspectiveWeights: async (
    modelId: string,
    rows: Array<{ perspectiveId: string; weight: number; orderIndex?: number }>,
  ): Promise<void> => {
    for (const r of rows) {
      const updated = await run<Array<{ id: string }>>(typedQuery('strata_scorecard_model_perspectives').update({
        weight: r.weight,
        ...(r.orderIndex !== undefined ? { order_index: r.orderIndex } : {}),
      }).eq('model_id', modelId).eq('perspective_id', r.perspectiveId).select('id'));
      if ((updated?.length ?? 0) === 0) {
        throw new Error(
          'Weight update was rejected — no rows changed. Approved definitions are immutable; '
          + 'if this model is approved, create a new draft version to change its weights.',
        );
      }
    }
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
  /**
   * Create a NET-NEW scorecard model at version 1 / status draft (SC-DEF-001).
   * Distinct from `configApi.createModelDraftVersion`, which REVISES an existing model by
   * cloning it (D-2/D-3) and cannot bootstrap a first model. Perspectives and KPI measures
   * are authored afterwards via setModelPerspectiveWeights / setModelMeasures, both of
   * which require the model to be a draft.
   */
  createModel: (input: {
    name: string; ownerScopeType: string; rollupMethod: string; periodGranularity: string;
    description?: string; thresholdSchemeId?: string;
  }): Promise<string> =>
    run(typedRpc('strata_create_scorecard_model', {
      p_name: input.name,
      p_owner_scope_type: input.ownerScopeType,
      p_rollup_method: input.rollupMethod,
      p_period_granularity: input.periodGranularity,
      p_description: input.description ?? null,
      p_threshold_scheme: input.thresholdSchemeId ?? null,
    })),
  modelPerspectives: (modelId: string): Promise<StrataModelPerspective[]> =>
    run(typedQuery('strata_scorecard_model_perspectives').select('*').eq('model_id', modelId).order('order_index')),
  // Every model→perspective link, unfiltered — lets the measurement domain page
  // derive per-perspective usage ("Used by N models") client-side (P5-D2). No
  // migration: same table + RLS as modelPerspectives, just no model_id filter.
  allModelPerspectives: (): Promise<StrataModelPerspective[]> =>
    run(typedQuery('strata_scorecard_model_perspectives').select('*')),
  /** Measure ASSIGNMENTS for one model (M-D0). KPI identity is read separately via kpi_id. */
  modelMeasures: (modelId: string): Promise<StrataModelMeasure[]> =>
    run(typedQuery('strata_scorecard_model_measures').select('*').eq('model_id', modelId).order('order_index')),
  allModelMeasures: (): Promise<StrataModelMeasure[]> =>
    run(typedQuery('strata_scorecard_model_measures').select('*')),
  /** Replace-set the model's measure assignments. Server rejects a perspective not on the model. */
  setModelMeasures: (modelId: string, measures: Array<{
    perspectiveId: string; kpiId: string; weight: number; orderIndex?: number;
    required?: boolean; aggregationMethod?: string; targetPolicy?: string;
  }>): Promise<void> =>
    run(typedRpc('strata_set_model_measures', {
      p_model: modelId,
      p_measures: measures.map((m) => ({
        perspective_id: m.perspectiveId, kpi_id: m.kpiId, weight: m.weight,
        order_index: m.orderIndex ?? 0, required: m.required ?? false,
        aggregation_method: m.aggregationMethod ?? 'weighted_average',
        target_policy: m.targetPolicy ?? 'default',
      })),
    })),
  instances: (cycleId?: string): Promise<StrataScorecardInstance[]> => {
    let q = typedQuery('strata_scorecard_instances').select('*').order('created_at', { ascending: false });
    if (cycleId) q = q.eq('cycle_id', cycleId);
    return run(q);
  },
  /** Dual-mode resolver (D-6, CRE Grid F4): accepts the canonical slug OR a
   *  legacy UUID id, so pre-slug links keep resolving. Callers should replace
   *  a UUID URL with the canonical slug once resolved. */
  instanceBySlug: async (slugOrId: string): Promise<StrataScorecardInstance | null> => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
    return run(
      typedQuery('strata_scorecard_instances').select('*')
        .eq(isUuid ? 'id' : 'slug', slugOrId)
        .maybeSingle(),
    );
  },
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
  /** Read-only plan-variance rollup (task_e44f1ba9): uncapped achievement vs the
   *  per-period targets; 100 = on plan. No provenance writes. */
  planVariance: (instanceId: string): Promise<ScorecardPlanVariance> =>
    run(typedRpc('strata_calc_scorecard_plan_variance', { p_instance: instanceId })),
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
  /**
   * F-9: every version of one logical KPI, oldest first. `id` identifies a VERSION; `lineage_id`
   * identifies the KPI as a continuing business concept, so a trend that reads one `id` shows one
   * version's history and silently restarts at a revision.
   */
  lineageVersions: (lineageId: string): Promise<StrataKpi[]> =>
    run(typedQuery('strata_kpis').select('*').eq('lineage_id', lineageId).order('version')),
  /** Targets across every version of a lineage. Each row keeps its own kpi_id — never repointed. */
  targetsForKpis: (kpiIds: string[]): Promise<StrataKpiTarget[]> =>
    kpiIds.length === 0 ? Promise.resolve([])
      : run(typedQuery('strata_kpi_targets').select('*').in('kpi_id', kpiIds)),
  /** Actuals across every version of a lineage. Each row keeps its own kpi_id — never repointed. */
  actualsForKpis: (kpiIds: string[]): Promise<StrataKpiActual[]> =>
    kpiIds.length === 0 ? Promise.resolve([])
      : run(typedQuery('strata_kpi_actuals').select('*').in('kpi_id', kpiIds).order('submitted_at', { ascending: false })),
  actualsForPeriod: (periodId: string): Promise<StrataKpiActual[]> =>
    run(typedQuery('strata_kpi_actuals').select('*').eq('period_id', periodId)),
  achievement: (kpiId: string, periodId: string) =>
    run(typedRpc('strata_calc_kpi_achievement', { p_kpi: kpiId, p_period: periodId })),
  ytd: (kpiId: string, cycleId: string, method: 'sum' | 'avg' | 'last' = 'avg') =>
    run(typedRpc('strata_calc_ytd', { p_kpi: kpiId, p_cycle: cycleId, p_method: method })),
  attestActual: (actualId: string, verdict: 'validated' | 'rejected' | 'quarantined', note?: string) =>
    run(typedRpc('strata_attest_actual', { p_actual: actualId, p_verdict: verdict, p_note: note ?? null })),
  /**
   * R4c quarantine RESOLUTION (D-5/E-6) — the exit from quarantine. `attestActual` above is the
   * ENTRY; this is the only way out. A reason is mandatory at the DB, so it is mandatory here: the
   * resolution has to be explainable later.
   *
   * The three verdicts are not interchangeable:
   * - `accept_with_exception` — the value COUNTS after Strategy Office authorization. The submitter
   *   may not authorize their own (SoD, enforced by a DB CHECK as well as the RPC).
   * - `correct` — returns the row to `pending`, NOT to validated: a corrected value is a new claim
   *   nobody has checked. Since `pending` no longer counts (E-7 cond.3), a corrected value reads as
   *   Missing until attested. That is correct, not a bug.
   * - `reject` — the value stays out.
   *
   * Never pre-filter the verdicts by guessing the caller's role; let the RPC refuse and surface it.
   */
  resolveQuarantine: (
    actualId: string,
    verdict: 'accept_with_exception' | 'correct' | 'reject',
    reason: string,
    correctedValue?: number,
  ): Promise<StrataQuarantineResolution> =>
    run(typedRpc('strata_resolve_quarantine', {
      p_actual: actualId,
      p_verdict: verdict,
      p_reason: reason,
      p_corrected_value: correctedValue ?? null,
    })),
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
    isStrategic?: boolean;
  }): Promise<string> =>
    run(typedRpc('strata_create_kpi', {
      p_name: input.name, p_unit: input.unit ?? null,
      p_direction: input.direction ?? 'higher_better',
      p_frequency: input.frequency ?? 'quarterly',
      p_entry_method: input.entryMethod ?? 'upload',
      p_is_strategic: input.isStrategic ?? false,
    })),
  updateKpi: (kpiId: string, patch: {
    name?: string; unit?: string; direction?: string; frequency?: string; entryMethod?: string;
    accountableOwnerId?: string; dataOwnerId?: string; reporterId?: string;
    validatorId?: string; escalationOwnerId?: string; dataSourceId?: string;
    thresholdSchemeId?: string; kpiTypeId?: string; isStrategic?: boolean;
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
      p_is_strategic: patch.isStrategic ?? null,
      p_clear_validator: patch.clearValidator ?? false,
      p_clear_data_source: patch.clearDataSource ?? false,
      p_clear_escalation_owner: patch.clearEscalationOwner ?? false,
    })),
  /** Governed bulk owner / threshold-scheme reassignment (loops strata_update_kpi server-side).
   *  Returns per-KPI verdicts — approved KPIs come back ok:false with the server's rejection text. */
  bulkUpdate: (input: {
    kpiIds: string[]; accountableOwnerId?: string; thresholdSchemeId?: string; reason?: string;
  }): Promise<StrataBulkUpdateResult> =>
    run(typedRpc('strata_bulk_update_kpis', {
      p_kpi_ids: input.kpiIds,
      p_accountable_owner: input.accountableOwnerId ?? null,
      p_threshold_scheme: input.thresholdSchemeId ?? null,
      p_reason: input.reason ?? null,
    })) as Promise<StrataBulkUpdateResult>,
  // ── Per-user saved views (strata_saved_views; RLS scopes to auth.uid()) ──
  savedViews: (entity: string): Promise<StrataSavedView[]> =>
    run(typedQuery('strata_saved_views').select('*').eq('entity', entity).order('name')),
  createSavedView: (input: { entity: string; name: string; config: Record<string, unknown> }): Promise<StrataSavedView> =>
    run(typedQuery('strata_saved_views').insert({ entity: input.entity, name: input.name, config: input.config }).select('*').single()),
  deleteSavedView: (id: string): Promise<unknown> =>
    run(typedQuery('strata_saved_views').delete().eq('id', id).select('id')),
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
    /** Optimistic-concurrency token: the updated_at captured when the edit form
     * opened. When present, the RPC rejects the write if the row moved on (V6-OPEN-033). */
    expectedUpdatedAt?: string;
  }) =>
    run(typedRpc('strata_update_project_card', {
      // V6-OPEN-033: concurrency guard active — migration 20260712140000 applied to
      // staging, so the RPC accepts p_expected_updated_at. A stale second save is
      // rejected with a conflict message.
      p_expected_updated_at: patch.expectedUpdatedAt ?? null,
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
    isBlocker?: boolean; status?: string; name?: string;
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
      p_name: input.name ?? null,
    })),
  updateDependency: (dependencyId: string, patch: {
    status?: string; dueDate?: string; slaDays?: number; impact?: string;
    isBlocker?: boolean; servingLabel?: string; name?: string;
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
      p_name: patch.name ?? null,
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
  /**
   * D-4: verdicts are the neutral assurance vocabulary. 'validated' is NO LONGER ACCEPTED by the
   * RPC — it raises. owner_confirmed is the owner standing behind their own number (it COUNTS per
   * F-7, but claims nothing about independence); independently_validated asserts someone else
   * checked it and carries SoD.
   */
  validateBenefitValue: (valueId: string, verdict: 'owner_confirmed' | 'independently_validated' | 'rejected', note?: string) =>
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
  /**
   * R3 downstream blast radius. Read-only; writes nothing. `blocking` names the APPROVED KPIs that
   * make retirement unsafe (named, not counted — a decision needs the names). `historical` is locked
   * snapshots / issued packs: reported so the decision is informed, NEVER a blocker and never
   * "migratable" (D-1 — history is not rewritten). `coverage_note` states what the analysis cannot
   * see: manual actuals carry no run lineage, so absence is not evidence.
   */
  dataSourceBlastRadius: (sourceId: string): Promise<StrataBlastRadius> =>
    run(typedRpc('strata_data_source_blast_radius', { p_source: sourceId })),
  /**
   * R3 lifecycle. Returns the blast radius as computed at the moment of the change, so the audit
   * trail records what was known then. Retirement is gated on `blocking` being empty and requires a
   * reason; suspension is deliberately ungated — suspending is how you stop a bad feed.
   */
  setDataSourceStatus: (sourceId: string, status: StrataDataSource['status'], reason?: string): Promise<StrataBlastRadius> =>
    run(typedRpc('strata_set_data_source_status', { p_source: sourceId, p_status: status, p_reason: reason ?? null })),
  /**
   * R4d · ASK BEFORE OFFERING THE VERB. Read-only. Returns EVERY blocking reason, not the first —
   * a user told "locked snapshot", who clears it and is then told "issued board pack", has been
   * misled twice. Render `blocking_reasons` in full; never show only the first.
   */
  runReversalEligibility: (runId: string): Promise<StrataReversalEligibility> =>
    run(typedRpc('strata_run_reversal_eligibility', { p_run: runId })),
  /**
   * R4d · 24-hour import reversal (D-7/E-5). Atomic by construction. The original run and its
   * actuals are PRESERVED and marked `reversed` — no offsetting, zero or negative measurement is
   * ever written. Re-checks eligibility server-side and raises with all reasons, so a stale client
   * gate cannot force a reversal through.
   *
   * `left_without_effective_value > 0` is NOT a failure: it means no prior validated value existed
   * to restore. Report it; inventing a zero there would be the lie the RPC refuses to tell.
   */
  reverseRun: (runId: string, reason: string): Promise<StrataRunReversal> =>
    run(typedRpc('strata_reverse_run', { p_run: runId, p_reason: reason })),
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

  // ── Mapping memory (capability 11) — R5/N ────────────────────────────────
  /**
   * SUGGEST remembered column mappings for the incoming headers. Never applies them.
   *
   * suggest-not-assume: this is a read (the RPC is STABLE and cannot write). It returns what a human
   * previously confirmed so the wizard can OFFER it; binding a column still requires the human to
   * press confirm, which is what calls `recordMapping`. Do not auto-apply the result.
   *
   * Returns one row per requested key, always — an unremembered key comes back `status: 'none'` with
   * a `null` target so the caller renders nothing rather than guessing.
   *
   * `status: 'conflict'` means MORE THAN ONE target is remembered for that key. `suggested_target` is
   * `null` and `candidates` names them: present the conflict, never pick for the user.
   *
   * Candidates whose target column has left the template schema, whose template is no longer
   * approved, or whose data source is retired are dropped server-side — retired targets are not reused.
   *
   * Requires a registered `dataSourceId`: the wizard's source is optional, and a run with no source
   * has no identity to remember against (NULL is "not recorded", not a match key).
   */
  suggestMapping: (
    dataSourceId: string,
    templateId: string,
    sourceKeys: string[],
  ): Promise<StrataMappingSuggestion[]> =>
    run(typedRpc('strata_suggest_mapping', {
      p_data_source_id: dataSourceId,
      p_template_id: templateId,
      p_source_keys: sourceKeys,
    })),

  /**
   * Append ONE immutable confirmation that `sourceKey` means `targetColumn`.
   *
   * Evidence immutable: the ledger is append-only (no UPDATE/DELETE policy, plus an explicit REVOKE),
   * so this only ever inserts. Re-confirming the same target is not a duplicate — it is another dated
   * piece of evidence and raises `times_confirmed`.
   *
   * Role gate: the RLS insert policy mirrors `strata_runs_insert` exactly —
   * data_steward | kpi_owner | strategy_office (strata_has_role short-circuits on admin). The RPC is
   * SECURITY INVOKER, so the policy is the gate; it throws for a caller without the role.
   *
   * Also refuses a non-approved template, a column outside the template schema, and a retired source.
   */
  recordMapping: (input: {
    dataSourceId: string;
    templateId: string;
    sourceKey: string;
    targetColumn: string;
    uploadRunId?: string | null;
  }): Promise<StrataMappingMemory> =>
    run(typedRpc('strata_record_mapping', {
      p_data_source_id: input.dataSourceId,
      p_template_id: input.templateId,
      p_source_key: input.sourceKey,
      p_target_column: input.targetColumn,
      p_upload_run_id: input.uploadRunId ?? null,
    })),
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
  // ── R2/E1 · reviews (persisted scheduling entity, D-6) ─────────────────────
  /**
   * Authoritative going forward. `origin='migrated'` rows are reconstructed from locked snapshots
   * and their chair/agenda/scheduled_for/participants are NULL = NOT RECORDED, never "none".
   */
  reviews: (): Promise<StrataReview[]> =>
    run(typedQuery('strata_reviews').select('*').order('scheduled_for', { ascending: false, nullsFirst: false })),
  reviewBySlug: (slug: string): Promise<StrataReview | null> =>
    run(typedQuery('strata_reviews').select('*').eq('slug', slug).maybeSingle()),
  reviewParticipants: (reviewId: string): Promise<StrataReviewParticipant[]> =>
    run(typedQuery('strata_review_participants').select('*').eq('review_id', reviewId)),
  /** Derived view — never stored. `is_ready` is snapshot-locked only; `pack_attached` is separate. */
  reviewReadiness: (): Promise<StrataReviewReadiness[]> =>
    run(typedQuery('strata_review_readiness').select('*')),
  /**
   * Cadence is optional: the RPC COALESCEs departmental→monthly, executive→quarterly. Pass it only
   * when the caller genuinely chose one — sending a client-side default would turn the server's
   * documented default into a value the user never picked.
   */
  scheduleReview: (input: {
    name: string;
    reviewType: StrataReview['review_type'];
    periodId?: string | null;
    cycleId?: string | null;
    scheduledFor?: string | null;
    cadence?: StrataReview['cadence'] | null;
    chairId?: string | null;
    scope?: unknown;
  }): Promise<string> =>
    run(typedRpc('strata_schedule_review', {
      p_name: input.name,
      p_review_type: input.reviewType,
      p_period: input.periodId ?? null,
      p_cycle: input.cycleId ?? null,
      p_scheduled_for: input.scheduledFor ?? null,
      p_cadence: input.cadence ?? null,
      p_chair: input.chairId ?? null,
      p_scope: (input.scope ?? null) as never,
    })),
  /**
   * A CLOSED review is refused by the RPC — it records a meeting that already happened. Closing
   * requires a LOCKED snapshot: closing on live numbers would record a decision against figures
   * that can still move. Both refusals surface verbatim.
   */
  updateReview: (
    reviewId: string,
    patch: {
      status?: StrataReview['status'];
      snapshotId?: string | null;
      packId?: string | null;
      agenda?: unknown;
      chairId?: string | null;
      note?: string | null;
    },
  ): Promise<void> =>
    run(typedRpc('strata_update_review', {
      p_review: reviewId,
      p_status: patch.status ?? null,
      p_snapshot: patch.snapshotId ?? null,
      p_pack: patch.packId ?? null,
      p_agenda: (patch.agenda ?? null) as never,
      p_chair: patch.chairId ?? null,
      p_note: patch.note ?? null,
    })),
  // ── R2/F1 · board-pack editorial lifecycle ────────────────────────────────
  /**
   * F-3 qualification, derived from the integrity register. `is_qualified=false` means no exception
   * is ON RECORD — not that integrity is proven (E-4/§3.7). Render `qualification_note` verbatim.
   */
  boardPackQualification: (packId: string): Promise<StrataBoardPackQualification | null> =>
    run(typedQuery('strata_board_pack_qualification').select('*').eq('board_pack_id', packId).maybeSingle()),
  /**
   * The entry verb into `approved` — without it `issueBoardPack` is unreachable, since it refuses
   * anything not already approved. Server-side only by necessity: RLS would let a client UPDATE set
   * `approved_by` to anyone, which would defeat the approver≠issuer SoD check that issuance relies
   * on. The RPC stamps `auth.uid()`. Never write `issue_status`/`approved_by` from the client.
   */
  approveBoardPack: (packId: string, note?: string): Promise<void> =>
    run(typedRpc('strata_approve_board_pack', { p_pack: packId, p_note: note ?? null })),
  /**
   * SoD: the approver may not be the issuer. Issuance STAMPS the qualification into the audit trail,
   * so the pack carries what was true when the board received it. Issued packs are then immutable
   * BY TRIGGER — UPDATE and DELETE are both refused at the DB, not by client convention.
   */
  issueBoardPack: (packId: string, note?: string): Promise<void> =>
    run(typedRpc('strata_issue_board_pack', { p_pack: packId, p_note: note ?? null })),
  /**
   * A correction is a NEW VERSION, never an edit: `snapshot_id` is COPIED to the successor and never
   * re-pointed (that would silently restate what the board was shown). Returns the new pack id.
   */
  supersedeBoardPack: (packId: string, reason: string): Promise<string> =>
    run(typedRpc('strata_supersede_board_pack', { p_pack: packId, p_reason: reason })),
  boardPacks: (snapshotId: string): Promise<StrataBoardPack[]> =>
    run(typedQuery('strata_board_packs').select('*').eq('snapshot_id', snapshotId)),
  /** All board-pack rows across snapshots — thin select feeding the reviews-index pack-stage dot. */
  boardPacksAll: (): Promise<StrataBoardPack[]> =>
    run(typedQuery('strata_board_packs').select('*')),
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
  /**
   * Resolve a notification to its OBJECT + whether its ask is already satisfied
   * (anchor 28 state 3). strata_notifications stores entity_id as a UUID while
   * STRATA routes are slug-only (SLUG CONTRACT), so every entity_table needs its
   * own id→slug hop — there is no generic link column.
   *
   * `key` is null when the object is gone or orphaned (e.g. a decision whose
   * snapshot was removed): callers fall back to the area landing rather than
   * build a broken link. `done` reports that the requested action already
   * happened, so the landing can release the reader instead of dead-ending.
   */
  resolveNotificationTarget: async (n: StrataNotification): Promise<StrataNotificationTarget> => {
    const none: StrataNotificationTarget = { key: null, done: false };
    if (!n.entity_id) return none;
    switch (n.entity_table) {
      case 'strata_kpis': {
        const r = await run<{ slug: string | null; status: string } | null>(
          typedQuery('strata_kpis').select('slug, status').eq('id', n.entity_id).maybeSingle());
        return r ? { key: r.slug, done: r.status === 'approved' } : none;
      }
      case 'strata_benefit_values': {
        const bv = await run<{ benefit_id: string; validated_at: string | null } | null>(
          typedQuery('strata_benefit_values').select('benefit_id, validated_at').eq('id', n.entity_id).maybeSingle());
        if (!bv) return none;
        const b = await run<{ slug: string | null } | null>(
          typedQuery('strata_benefits').select('slug').eq('id', bv.benefit_id).maybeSingle());
        return { key: b?.slug ?? null, done: bv.validated_at != null };
      }
      case 'strata_decisions': {
        const d = await run<{ snapshot_id: string | null; decided_at: string | null } | null>(
          typedQuery('strata_decisions').select('snapshot_id, decided_at').eq('id', n.entity_id).maybeSingle());
        if (!d) return none;
        const done = d.decided_at != null;
        if (!d.snapshot_id) return { key: null, done };
        const s = await run<{ snapshot_key: string | null } | null>(
          typedQuery('strata_snapshots').select('snapshot_key').eq('id', d.snapshot_id).maybeSingle());
        return { key: s?.snapshot_key ?? null, done };
      }
      case 'strata_dependencies': {
        const dep = await run<{ requesting_id: string | null; status: string } | null>(
          typedQuery('strata_dependencies').select('requesting_id, status').eq('id', n.entity_id).maybeSingle());
        if (!dep) return none;
        // A blocker is finished when it is resolved or cancelled; open/blocked/
        // at_risk all still want the reader.
        const done = dep.status === 'resolved' || dep.status === 'cancelled';
        if (!dep.requesting_id) return { key: null, done };
        const c = await run<{ slug: string | null } | null>(
          typedQuery('strata_project_cards').select('slug').eq('id', dep.requesting_id).maybeSingle());
        return { key: c?.slug ?? null, done };
      }
      default:
        return none;
    }
  },
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
  /**
   * SoD verdict per role the person holds (F1a, anchor 27). PROJECTS the four
   * SoD rules the engine already enforces — it invents no policy. 'guarded' =
   * the role is gated by a real rule, so that rule WILL refuse them on their own
   * records; 'clean' = no rule can bite them. `rules` are quoted verbatim from
   * the engine. CONFLICT is deliberately absent (F1-D2 deferred): the server
   * never refuses a role COMBINATION, so claiming one would assert a check that
   * does not exist.
   */
  checkRoleSod: (userId: string): Promise<StrataRoleSod[]> =>
    run(typedRpc('strata_check_role_sod', { p_user: userId })),
  /**
   * Audit that a read-only View-as preview was opened (F2, anchor 27). The actor
   * is taken from auth.uid() server-side and cannot be forged; strata_audit_events
   * has no INSERT policy, so this is the only write path. Records that a preview
   * was OPENED — never a session switch.
   */
  logViewAs: (subjectUserId: string): Promise<void> =>
    run(typedRpc('strata_log_view_as', { p_subject: subjectUserId })),
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
