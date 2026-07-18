/**
 * CFG-004 — downstream blast-radius for governed lifecycle changes.
 *
 * Retire / Create-new-version dialogs must show what references the record
 * BEFORE the verb runs. These helpers compute dependents from data the
 * Configuration page already loads — client-side, read-only, no new RPCs.
 * Zero-assumption rule: a caller that cannot compute dependents passes
 * nothing and the dialog stays silent; an empty array means "checked, none".
 */

interface ModelRef { id: string; name: string; version: number | null; status: string | null }
interface ModelPerspectiveRef { model_id: string; perspective_id: string }
interface MeasureRef { model_id: string; perspective_id: string }
interface KpiRef { name: string; threshold_scheme_id: string | null; status?: string | null }

const label = (name: string, version: number | null, status: string | null): string =>
  `${name}${version != null ? ` v${version}` : ''}${status ? ` · ${status.replace(/_/g, ' ')}` : ''}`;

/** Scorecard models whose weights reference this perspective. */
export function perspectiveDependents(
  perspectiveId: string,
  models: ModelRef[],
  modelPerspectives: ModelPerspectiveRef[],
): string[] {
  const modelIds = new Set(
    modelPerspectives.filter((mp) => mp.perspective_id === perspectiveId).map((mp) => mp.model_id),
  );
  return models
    .filter((m) => modelIds.has(m.id))
    .map((m) => `Scorecard model ${label(m.name, m.version, m.status)}`);
}

/** KPIs rated by this threshold scheme. */
export function thresholdSchemeDependents(schemeId: string, kpis: KpiRef[]): string[] {
  return kpis
    .filter((k) => k.threshold_scheme_id === schemeId)
    .map((k) => `KPI ${label(k.name, null, k.status ?? null)}`);
}

interface CategoryRef { name: string; category_id: string | null; status?: string | null }
interface GateInstanceRef { gate_model_id: string; status: string }

/** Portfolios and benefits classified under this value category. */
export function valueCategoryDependents(
  categoryId: string,
  portfolios: CategoryRef[],
  benefits: CategoryRef[],
): string[] {
  return [
    ...portfolios.filter((p) => p.category_id === categoryId)
      .map((p) => `Portfolio ${label(p.name, null, p.status ?? null)}`),
    ...benefits.filter((b) => b.category_id === categoryId)
      .map((b) => `Benefit ${label(b.name, null, b.status ?? null)}`),
  ];
}

/** Gate instances recorded under this gate model, summarised by status. */
export function gateModelDependents(gateModelId: string, instances: GateInstanceRef[]): string[] {
  const mine = instances.filter((i) => i.gate_model_id === gateModelId);
  if (mine.length === 0) return [];
  const byStatus = new Map<string, number>();
  for (const i of mine) byStatus.set(i.status, (byStatus.get(i.status) ?? 0) + 1);
  const parts = [...byStatus.entries()].map(([s, n]) => `${n} ${s.replace(/_/g, ' ')}`).join(', ');
  return [`${mine.length} gate instance${mine.length === 1 ? '' : 's'} recorded under this model (${parts}) — decided history is preserved`];
}

/**
 * Records governed by a workflow config, per its entity_type. Returns
 * undefined when the entity type has no enumerable client source — the dialog
 * then says nothing rather than inventing a count.
 */
export function workflowEntityDependents(
  entityType: string,
  tally: { label: string; count: number; qualifier?: string } | undefined,
): string[] | undefined {
  if (!tally) return undefined;
  if (tally.count === 0) return [];
  return [`${tally.count} ${tally.label}${tally.count === 1 ? '' : 's'}${tally.qualifier ? ` ${tally.qualifier}` : ''} follow this workflow's transitions`];
}

/** What this scorecard-model version carries — stated as facts, not forecasts. */
export function modelVersionImpact(
  modelId: string,
  modelPerspectives: ModelPerspectiveRef[],
  measures: MeasureRef[],
): string[] {
  const pCount = modelPerspectives.filter((mp) => mp.model_id === modelId).length;
  const mCount = measures.filter((ms) => ms.model_id === modelId).length;
  const out: string[] = [];
  if (pCount > 0) out.push(`${pCount} perspective weight${pCount === 1 ? '' : 's'} defined on this version`);
  if (mCount > 0) out.push(`${mCount} measure assignment${mCount === 1 ? '' : 's'} defined on this version`);
  return out;
}
