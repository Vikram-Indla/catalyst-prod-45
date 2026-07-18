/**
 * CFG-006 / SC-GOVAPPROVAL — scorecard model integrity, computed in ONE place.
 *
 * The governed rule (stated on the builder itself): perspective weights must
 * total 100 AND each weighted perspective's measure weights must total 100
 * before a model can be submitted for approval. Zero assigned measures,
 * underweight totals (< 100), overweight totals (> 100) and valid totals
 * (= 100) are FOUR distinct states — an underweight perspective must never be
 * reported as "no measures assigned", and an empty one must never look healthy.
 *
 * Totals use the same ±0.01 tolerance as the server validator
 * (strata_validate_scorecard_model) so client and server never disagree on a
 * fractional-weight model.
 *
 * Display-only: server-side lifecycle enforcement is unchanged. Nothing here
 * mutates or reinterprets existing governed records. Incomplete drafts may be
 * SAVED — only submit/approve are gated on these results.
 */

export interface PerspectiveWeightRow {
  perspective_id: string;
  weight: number;
}

export interface MeasureRow {
  perspective_id: string;
  weight: number | string | null;
}

export type MeasureCoverageState = 'no_measures' | 'underweight' | 'overweight' | 'valid';

export interface PerspectiveCoverage {
  perspectiveId: string;
  name: string;
  state: MeasureCoverageState;
  /** Number of measures assigned to the perspective. */
  measureCount: number;
  /** Measure-weight total, rounded to 2 decimals. */
  total: number;
  /** Remaining to reach 100 (underweight) or excess above 100 (overweight); 0 otherwise. */
  delta: number;
}

export interface ModelIntegrity {
  /** Sum of perspective weights on the model (rounded to 2 decimals). */
  weightSum: number;
  /** Number of perspective-weight rows on the model. */
  weightCount: number;
  /** Perspective weights exist and total exactly 100 (±0.01). */
  perspectiveWeightsOk: boolean;
  /** Per-perspective measure coverage, one entry per weighted perspective. */
  perspectiveCoverage: PerspectiveCoverage[];
  /** Named per-perspective failures (no measures, underweight, or overweight). */
  measureIssues: string[];
  /** Full integrity: perspective weights ok AND no measure issues. */
  ok: boolean;
}

/** Mirror of the server validator's tolerance: abs(total − 100) > 0.01 fails. */
const TOTAL_TOLERANCE = 0.01;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const totals100 = (n: number): boolean => Math.abs(n - 100) <= TOTAL_TOLERANCE;

/** Classify one perspective's measure-weight total into its coverage state. */
export function coverageState(measureCount: number, total: number): MeasureCoverageState {
  if (measureCount === 0) return 'no_measures';
  if (totals100(total)) return 'valid';
  return total < 100 ? 'underweight' : 'overweight';
}

/** The ONE wording for a coverage failure — shared by the integrity band and the editor. */
export function coverageIssueLabel(c: Pick<PerspectiveCoverage, 'name' | 'state' | 'total' | 'delta'>): string | null {
  switch (c.state) {
    case 'no_measures': return `${c.name} has no measures assigned`;
    case 'underweight': return `${c.name} measure weights total ${c.total} — assign the remaining ${c.delta}`;
    case 'overweight': return `${c.name} measure weights total ${c.total} — remove ${c.delta}`;
    default: return null;
  }
}

/** Server validator coverage entry — the AUTHORITATIVE codes + numeric params. */
export interface ServerCoverageEntry {
  code: 'NO_MEASURES' | 'MEASURE_WEIGHTS_UNDER_100' | 'MEASURE_WEIGHTS_OVER_100' | 'MEASURE_WEIGHTS_VALID';
  perspective_id: string;
  name: string;
  total: number | string;
  delta: number | string;
}

const SERVER_CODE_TO_STATE: Record<ServerCoverageEntry['code'], MeasureCoverageState> = {
  NO_MEASURES: 'no_measures',
  MEASURE_WEIGHTS_UNDER_100: 'underweight',
  MEASURE_WEIGHTS_OVER_100: 'overweight',
  MEASURE_WEIGHTS_VALID: 'valid',
};

/**
 * Render a PERSISTED (server-authoritative) coverage entry through the ONE
 * client formatter — wording is derived from code + params, never re-classified
 * client-side. Returns null for a valid entry (nothing to flag).
 */
export function serverCoverageLabel(e: ServerCoverageEntry): string | null {
  return coverageIssueLabel({
    name: e.name,
    state: SERVER_CODE_TO_STATE[e.code],
    total: Number(e.total),
    delta: Number(e.delta),
  });
}

export function computeModelIntegrity(
  perspectiveWeights: PerspectiveWeightRow[],
  measures: MeasureRow[],
  perspectiveNameById: Map<string, string>,
): ModelIntegrity {
  const weightSum = round2(perspectiveWeights.reduce((a, r) => a + Number(r.weight ?? 0), 0));
  const weightCount = perspectiveWeights.length;
  const perspectiveWeightsOk = weightCount > 0 && totals100(weightSum);

  const perspectiveCoverage: PerspectiveCoverage[] = perspectiveWeights.map((g) => {
    const rows = measures.filter((x) => x.perspective_id === g.perspective_id);
    const name = perspectiveNameById.get(g.perspective_id) ?? 'perspective';
    const total = round2(rows.reduce((a, x) => a + Number(x.weight ?? 0), 0));
    const state = coverageState(rows.length, total);
    const delta = state === 'underweight' ? round2(100 - total)
      : state === 'overweight' ? round2(total - 100)
        : 0;
    return { perspectiveId: g.perspective_id, name, state, measureCount: rows.length, total, delta };
  });

  const measureIssues = perspectiveCoverage
    .map(coverageIssueLabel)
    .filter((s): s is string => s !== null);

  return {
    weightSum,
    weightCount,
    perspectiveWeightsOk,
    perspectiveCoverage,
    measureIssues,
    ok: perspectiveWeightsOk && measureIssues.length === 0,
  };
}

/** Submit-gate reason for a DRAFT model, or undefined if submit may proceed. */
export function draftSubmitBlockedReason(integrity: ModelIntegrity): string | undefined {
  if (integrity.weightCount === 0) return 'Add perspective weights totalling 100 first';
  if (!integrity.perspectiveWeightsOk) return `Weights total ${integrity.weightSum} — must total 100`;
  if (integrity.measureIssues.length > 0) {
    return 'Each perspective needs measure weights totalling 100 before submit';
  }
  return undefined;
}
