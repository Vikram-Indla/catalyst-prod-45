/**
 * Incident SLA breach computation — client-side mirror of the authoritative
 * `incident_sla_live_status` DB view.
 *
 * The raw `sla_records.response_breached` / `resolution_breached` boolean
 * columns are NOT reliable: they default to `false` on insert and are only
 * meaningful once the corresponding `*_met_at` is stamped. Reading them
 * directly under-reports live breaches (an incident past its due date but not
 * yet met still reads `false`).
 *
 * The view resolves this by checking `*_met_at` first, then falling back to
 * "is it past due right now" — and only for incidents that are still open.
 * This util reproduces that exact logic from the timestamps already present on
 * the SlaRecord, so no extra query/view fetch is needed.
 *
 * View definition it mirrors:
 *   response_breaching  = CASE WHEN response_met_at IS NOT NULL
 *                              THEN response_breached
 *                              ELSE now() > response_due_at END
 *   (same for resolution), scoped to status NOT IN ('closed','converted').
 */

import type { SlaRecord, IncidentStatus } from '@/types/incident';

/**
 * Minimal SLA shape this module reads — the six timestamp/flag fields the view
 * uses. A full SlaRecord satisfies it structurally, and callers that select
 * only these columns (e.g. dashboard aggregates) can pass a partial row.
 */
export type SlaBreachInput = Pick<
  SlaRecord,
  | 'response_due_at'
  | 'response_met_at'
  | 'response_breached'
  | 'resolution_due_at'
  | 'resolution_met_at'
  | 'resolution_breached'
>;

/** Statuses for which SLA breach is no longer live (mirrors the view's filter). */
const TERMINAL_STATUSES: ReadonlySet<IncidentStatus> = new Set<IncidentStatus>([
  'closed',
  'converted',
]);

function legIsBreaching(
  dueAt: string | null | undefined,
  metAt: string | null | undefined,
  recordedBreached: boolean,
): boolean {
  // Met → trust the recorded outcome (breached iff it was met late).
  if (metAt != null) return recordedBreached;
  // Not met → breaching only once the due date has passed.
  if (!dueAt) return false;
  return Date.now() > new Date(dueAt).getTime();
}

export interface SlaBreachState {
  responseBreaching: boolean;
  resolutionBreaching: boolean;
  /** True if either leg is breaching. */
  anyBreaching: boolean;
}

/**
 * Compute live SLA breach state for an incident from its SlaRecord, matching
 * `incident_sla_live_status`. Returns null when there is no SLA record or the
 * incident is in a terminal status (breach is no longer live) — callers should
 * render nothing in that case (zero-assumption: no SLA signal → no badge).
 */
export function computeSlaBreachState(
  sla: SlaBreachInput | null | undefined,
  status: IncidentStatus | null | undefined,
): SlaBreachState | null {
  if (!sla) return null;
  if (status != null && TERMINAL_STATUSES.has(status)) return null;

  const responseBreaching = legIsBreaching(
    sla.response_due_at,
    sla.response_met_at,
    sla.response_breached,
  );
  const resolutionBreaching = legIsBreaching(
    sla.resolution_due_at,
    sla.resolution_met_at,
    sla.resolution_breached,
  );

  return {
    responseBreaching,
    resolutionBreaching,
    anyBreaching: responseBreaching || resolutionBreaching,
  };
}

export type SlaBadgeStatus = 'on_track' | 'breached';

/**
 * Map an incident's SLA record to the SlaBadge status. Returns null when there
 * is no live SLA signal (no record, or terminal incident) so the caller can
 * render a dash / nothing rather than a misleading "on track".
 */
export function getIncidentSlaBadgeStatus(
  sla: SlaBreachInput | null | undefined,
  status: IncidentStatus | null | undefined,
): SlaBadgeStatus | null {
  const state = computeSlaBreachState(sla, status);
  if (!state) return null;
  return state.anyBreaching ? 'breached' : 'on_track';
}
