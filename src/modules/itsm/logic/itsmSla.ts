// ============================================================
// ITSM SLA LOGIC — pure, deterministic, time injected (no Date.now)
// ============================================================

import type { ItsmSlaPolicy, SlaTargets, SlaState } from '../types';
import { ITSM_SLA_AT_RISK_FRACTION } from '../config/itsmConfig';

/**
 * Pure: created time + policy minutes -> response/resolve due ISO strings.
 */
export function computeSlaTargets(createdAtISO: string, policy: ItsmSlaPolicy): SlaTargets {
  const created = new Date(createdAtISO).getTime();
  const resp = new Date(created + policy.responseMinutes * 60_000).toISOString();
  const resolve = new Date(created + policy.resolveMinutes * 60_000).toISOString();
  return { responseDueAt: resp, resolveDueAt: resolve };
}

/**
 * Pure SLA state. `satisfiedAtISO` = when the target was met (ack time for
 * response, resolve time for resolution); null if not yet satisfied.
 * `now`, `startISO`, `dueISO` all injected for deterministic testing.
 */
export function slaState(
  nowISO: string,
  startISO: string,
  dueISO: string,
  satisfiedAtISO: string | null,
  atRiskFraction: number = ITSM_SLA_AT_RISK_FRACTION,
): SlaState {
  const now = new Date(nowISO).getTime();
  const start = new Date(startISO).getTime();
  const due = new Date(dueISO).getTime();

  if (satisfiedAtISO) {
    return new Date(satisfiedAtISO).getTime() <= due ? 'met' : 'breached';
  }
  if (now > due) return 'breached';

  const window = due - start;
  if (window > 0 && now - start >= window * atRiskFraction) return 'at_risk';
  return 'ok';
}
