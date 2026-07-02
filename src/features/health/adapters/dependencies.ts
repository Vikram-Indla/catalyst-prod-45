/**
 * Dependencies Health adapter — the one genuinely new rule set in this
 * feature (no existing engine covers graph/chain rules). Built on the
 * canonical dependency normalization already in the codebase
 * (src/components/shared/Timeline/dependencies/normalize.ts) rather than
 * reinventing blocker/dependent direction semantics.
 *
 * Rules:
 *  - Circular: any cycle in the blocks-graph — every node in a cycle flagged Critical.
 *  - Blocker-overdue: a blocker's due_date has passed while the dependent is still open — High.
 *  - Chain depth 3+: an item sits 3+ blockers deep in a blocking chain — Medium.
 *  - Cross-project: a blocker lives in a different project than its dependent — Medium.
 */
import { useMemo } from 'react';
import { buildDependencyIndex, getEntry, type RawDependencyRow, type DependencyIndex } from '@/components/shared/Timeline/dependencies/normalize';
import type { HealthAttentionItem, HealthKPI, HealthResult, HealthSignal } from '../types';

export interface DependencyIssueMeta {
  issue_type?: string | null;
  summary?: string | null;
  status?: string | null;
  status_category?: string | null;
  due_date?: string | null;
  assignee_account_id?: string | null;
  assignee_display_name?: string | null;
  project_key?: string | null;
}

function isOpen(meta: DependencyIssueMeta | undefined): boolean {
  const cat = (meta?.status_category ?? '').toLowerCase();
  return cat !== 'done';
}

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

/** All keys participating in at least one cycle of the blocks-graph. */
function findCycleMembers(index: DependencyIndex): Set<string> {
  const members = new Set<string>();
  for (const key of index.byKey.keys()) {
    // Does a path from key's blocks-successors lead back to key?
    const seen = new Set<string>();
    const stack = [...getEntry(index, key).blocks.map(r => r.key)];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === key) { members.add(key); break; }
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const rel of getEntry(index, cur).blocks) stack.push(rel.key);
    }
  }
  return members;
}

/** Longest blockedBy chain reaching `key`, bounded against cycles via `visiting`. */
function chainDepth(index: DependencyIndex, key: string, visiting: Set<string> = new Set()): number {
  if (visiting.has(key)) return 0;
  visiting.add(key);
  const blockers = getEntry(index, key).blockedBy;
  if (blockers.length === 0) return 0;
  let max = 0;
  for (const b of blockers) {
    const d = 1 + chainDepth(index, b.key, visiting);
    if (d > max) max = d;
  }
  return max;
}

export function useDependenciesHealthAdapter(
  dependencies: RawDependencyRow[] | undefined,
  issueMeta: Record<string, DependencyIssueMeta> | undefined,
) {
  const health: HealthResult = useMemo(() => {
    const rows = dependencies ?? [];
    const meta = issueMeta ?? {};
    const index = buildDependencyIndex(rows);
    const cycleMembers = findCycleMembers(index);

    const items: HealthAttentionItem[] = [];
    let circularCount = 0;
    let overdueCount = 0;
    let crossProjectCount = 0;
    let chainCount = 0;

    for (const key of index.byKey.keys()) {
      const m = meta[key];
      const entry = getEntry(index, key);
      const signals: HealthSignal[] = [];
      let riskBand: HealthAttentionItem['riskBand'] = null;
      let recommendation = '';

      const inCycle = cycleMembers.has(key);
      if (inCycle) {
        signals.push({ label: 'Part of a circular dependency', weight: 100 });
        riskBand = 'Critical';
        recommendation = 'Break the cycle — one of these links must be removed or re-pointed.';
        circularCount++;
      }

      const overdueBlockers = entry.blockedBy.filter(b => isOverdue(meta[b.key]?.due_date) && isOpen(m));
      if (overdueBlockers.length > 0) {
        signals.push({ label: `Blocked by ${overdueBlockers.length} overdue item(s)`, weight: 70 });
        if (!riskBand) riskBand = 'High';
        if (!recommendation) recommendation = `Escalate blocker${overdueBlockers.length > 1 ? 's' : ''}: ${overdueBlockers.map(b => b.key).join(', ')} — due date passed, this item still open.`;
        overdueCount++;
      }

      const depth = inCycle ? 0 : chainDepth(index, key);
      if (depth >= 3) {
        signals.push({ label: `Blocking chain depth ${depth}`, weight: 40 });
        if (!riskBand) riskBand = 'Medium';
        if (!recommendation) recommendation = `Chain ${depth} levels deep — confirm the root blocker is actively being worked.`;
        chainCount++;
      }

      const crossProjectBlockers = entry.blockedBy.filter(b => {
        const bp = meta[b.key]?.project_key;
        return bp && m?.project_key && bp !== m.project_key;
      });
      if (crossProjectBlockers.length > 0) {
        signals.push({ label: `Blocked by item(s) in another project`, weight: 30 });
        if (!riskBand) riskBand = 'Medium';
        if (!recommendation) recommendation = 'Cross-project blocker — confirm the other team is aware and on track.';
        crossProjectCount++;
      }

      if (signals.length === 0) continue;

      items.push({
        id: key,
        kind: 'issue',
        title: m?.summary ?? null,
        itemKey: key,
        type: m?.issue_type ?? null,
        status: m?.status ?? null,
        priority: null,
        assignee: m?.assignee_account_id || m?.assignee_display_name
          ? { id: m?.assignee_account_id ?? null, name: m?.assignee_display_name ?? null }
          : null,
        projectKey: m?.project_key ?? null,
        dueDate: m?.due_date ?? null,
        lastUpdated: null,
        sprintName: null,
        riskBand,
        attentionScore: signals.reduce((s, sig) => s + sig.weight, 0),
        primaryReason: signals[0].label,
        secondaryReasons: signals.slice(1).map(s => s.label),
        recommendation,
        signals,
        daysOverdue: null,
        staleDays: null,
      });
    }

    items.sort((a, b) => b.attentionScore - a.attentionScore);

    return {
      items,
      summary: {
        totalAnalyzed: index.byKey.size,
        attentionCount: items.length,
        criticalCount: circularCount,
        highCount: overdueCount,
        mediumCount: chainCount + crossProjectCount,
        overdueCount,
        flaggedCount: crossProjectCount,
        staleCount: chainCount,
        unassignedHighPriorityCount: 0,
        moduleLevelInsights: [],
        capabilityGaps: rows.length === 0 ? ['No dependency links recorded for this scope.'] : [],
      },
      engineUsed: 'score',
    };
  }, [dependencies, issueMeta]);

  const kpis: HealthKPI[] = [
    { key: 'totalAnalyzed', label: 'Analysed', value: health.summary.totalAnalyzed, tone: 'neutral' },
    { key: 'attentionCount', label: 'Attention', value: health.summary.attentionCount, tone: health.summary.attentionCount > 0 ? 'warning' : 'neutral' },
    { key: 'criticalCount', label: 'Circular', value: health.summary.criticalCount, tone: health.summary.criticalCount > 0 ? 'danger' : 'neutral' },
    { key: 'overdueCount', label: 'Blocker overdue', value: health.summary.overdueCount, tone: health.summary.overdueCount > 0 ? 'danger' : 'neutral' },
    { key: 'flaggedCount', label: 'Cross-project', value: health.summary.flaggedCount, tone: health.summary.flaggedCount > 0 ? 'warning' : 'neutral' },
    { key: 'staleCount', label: 'Chains 3+', value: health.summary.staleCount, tone: health.summary.staleCount > 0 ? 'warning' : 'neutral' },
  ];

  return { health, kpis };
}
