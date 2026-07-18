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
