// ============================================================
// ITSM SYSTEM INSIGHTS — deterministic, rule-based. NOT AI.
// Same input + same `now` => identical output. No randomness, no Date.now.
// Labelled `source: 'System Insight'`. (AI insights are a separate, later layer
// that only activates when CATY/Gemini is wired — never fake AI here.)
// ============================================================

import type { ItsmIncident, SystemInsight, InsightSeverity } from '../types';
import { itsmStatusCategory } from '../config/itsmConfig';

const SEV_RANK: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 };

function isOpen(i: ItsmIncident): boolean {
  return itsmStatusCategory(i.status) !== 'done';
}

/**
 * Deterministic system insights from a set of incidents.
 * @param incidents current incident set
 * @param nowISO injected clock (caller passes new Date().toISOString())
 */
export function generateSystemInsights(incidents: ItsmIncident[], nowISO: string): SystemInsight[] {
  if (incidents.length === 0) return [];

  const now = new Date(nowISO).getTime();
  const open = incidents.filter(isOpen);
  const out: SystemInsight[] = [];

  const push = (
    id: string,
    severity: InsightSeverity,
    metric: number,
    title: string,
    detail: string,
  ) => {
    if (metric > 0) out.push({ id, severity, metric, title, detail, source: 'System Insight' });
  };

  // R1 — open SEV1 incidents (critical)
  const sev1 = open.filter((i) => i.severity === 'SEV1').length;
  push('open-sev1', 'critical', sev1, `${sev1} SEV1 incident${sev1 === 1 ? '' : 's'} open`,
    'Critical-severity incidents are unresolved.');

  // R2 — resolve-SLA breached (critical)
  const breach = open.filter((i) => i.resolveDueAt != null && now > new Date(i.resolveDueAt).getTime()).length;
  push('resolve-breach', 'critical', breach, `${breach} incident${breach === 1 ? '' : 's'} breached resolve SLA`,
    'Resolution target passed without resolution.');

  // R3 — unassigned open (warning)
  const unassigned = open.filter((i) => i.assigneeId == null).length;
  push('unassigned', 'warning', unassigned, `${unassigned} open incident${unassigned === 1 ? '' : 's'} unassigned`,
    'No owner assigned.');

  // R4 — total open (info)
  push('open-total', 'info', open.length, `${open.length} incident${open.length === 1 ? '' : 's'} open`,
    'Total active incidents.');

  // Deterministic order: severity rank, then id.
  return out.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.id.localeCompare(b.id));
}
