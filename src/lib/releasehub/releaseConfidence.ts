/**
 * resolveReleaseConfidence — pure, deterministic production-confidence verdict
 * for a release, derived from real release-hub signals. No invented index.
 *
 * Ladder (locked 2026-06-19):
 *   released — terminal status (shipped / cancelled / archived)
 *   draft    — draft status or no go-live date set
 *   low      — readiness < 40, OR any open production incident in scope,
 *              OR no sign-offs cleared while sign-offs are required,
 *              OR scope items due after go-live (date breach)
 *   high     — readiness ≥ 90 AND all sign-offs cleared AND dates aligned
 *              AND zero open defects/incidents AND health not at-risk
 *   medium   — everything else (open defects, partial sign-offs, at-risk health…)
 *
 * Rationale: an open INCIDENT is a live production problem → caps to low. Open
 * DEFECTS are quality risk → cap to medium (blocks high, not an auto-low).
 * at_risk health can never read as high.
 */
export type ReleaseConfidence = 'high' | 'medium' | 'low' | 'released' | 'draft';

export interface ReleaseConfidenceInput {
  status: string;
  health: string | null;
  readinessPct: number | null;
  goLiveDate: string | null;
  signoffDone: number;
  signoffTotal: number;
  itemsAfterGoLive: number;
  openDefects: number;
  openIncidents: number;
}

const TERMINAL_STATUS = ['completed', 'released', 'done', 'rolled_back', 'cancelled', 'archived'];

export function resolveReleaseConfidence(r: ReleaseConfidenceInput): ReleaseConfidence {
  if (TERMINAL_STATUS.includes(r.status)) return 'released';
  if (r.status === 'draft' || !r.goLiveDate) return 'draft';

  const readiness = r.readinessPct ?? 0;
  const datesAligned = r.itemsAfterGoLive === 0;
  const signoffsRequired = r.signoffTotal > 0;
  const signoffsComplete = signoffsRequired && r.signoffDone >= r.signoffTotal;
  const noQualityRisk = r.openDefects === 0 && r.openIncidents === 0;

  // Low — severe / blocking signals
  if (readiness < 40) return 'low';
  if (r.openIncidents > 0) return 'low';
  if (signoffsRequired && r.signoffDone === 0) return 'low';
  if (!datesAligned) return 'low';

  // High — fully clean
  if (readiness >= 90 && signoffsComplete && datesAligned && noQualityRisk && r.health !== 'at_risk') {
    return 'high';
  }

  // Medium — open defects, partial sign-offs, at-risk health, mid readiness
  return 'medium';
}

export const CONFIDENCE_LABEL: Record<ReleaseConfidence, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  released: 'Released',
  draft: 'Draft',
};
