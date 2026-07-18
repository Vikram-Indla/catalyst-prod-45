/**
 * CFG-006 — scorecard model integrity, computed in ONE place.
 *
 * The governed rule (stated on the builder itself): perspective weights must
 * total 100 AND each weighted perspective's measure weights must total 100
 * before a model can be submitted for approval. The previous inline
 * computation skipped perspectives with zero measures, so a model could reach
 * Pending Approval while failing the rule it displays. This helper closes that
 * gap and is unit-tested; the page renders whatever it returns.
 *
 * Display-only: server-side lifecycle enforcement is unchanged. Nothing here
 * mutates or reinterprets existing governed records.
 */

export interface PerspectiveWeightRow {
  perspective_id: string;
  weight: number;
}

export interface MeasureRow {
  perspective_id: string;
  weight: number | string | null;
}

export interface ModelIntegrity {
  /** Sum of perspective weights on the model. */
  weightSum: number;
  /** Number of perspective-weight rows on the model. */
  weightCount: number;
  /** Perspective weights exist and total exactly 100. */
  perspectiveWeightsOk: boolean;
  /** Named per-perspective failures (no measures, or measure weights ≠ 100). */
  measureIssues: string[];
  /** Full integrity: perspective weights ok AND no measure issues. */
  ok: boolean;
}

export function computeModelIntegrity(
  perspectiveWeights: PerspectiveWeightRow[],
  measures: MeasureRow[],
  perspectiveNameById: Map<string, string>,
): ModelIntegrity {
  const weightSum = perspectiveWeights.reduce((a, r) => a + Number(r.weight ?? 0), 0);
  const weightCount = perspectiveWeights.length;
  const perspectiveWeightsOk = weightCount > 0 && weightSum === 100;

  const measureIssues: string[] = [];
  for (const g of perspectiveWeights) {
    const rows = measures.filter((x) => x.perspective_id === g.perspective_id);
    const pn = perspectiveNameById.get(g.perspective_id) ?? 'perspective';
    if (rows.length === 0) {
      // Zero measures fails "measure weights total 100" — was silently skipped.
      measureIssues.push(`${pn} has no measures assigned`);
      continue;
    }
    const t = rows.reduce((a, x) => a + Number(x.weight ?? 0), 0);
    if (t !== 100) {
      measureIssues.push(t < 100
        ? `${pn} measure weights total ${t} — assign the remaining ${100 - t}`
        : `${pn} measure weights total ${t} — remove ${t - 100}`);
    }
  }

  return {
    weightSum,
    weightCount,
    perspectiveWeightsOk,
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
