/**
 * reportData — canonical data shapes + pure selectors for the TestHub Reports hub.
 * Feature: CAT-REPORTS-HUB-20260703-001 (Phase 2 Lane B).
 *
 * These shapes were formerly produced by the seeded demo generator (deleted
 * in Lane B); they are now produced from live Supabase rows by
 * useRealTestReportData. Every selector is pure and
 * zero-assumption: an unknown date/field yields null (rendered as '—'),
 * never a fabricated default. Burndown/burnup are COUNT-based (story points
 * unproven on staging — PHASE0_DATA_CONTRACT_PROOF.md).
 */
import { passRate, impactScore } from './reportCalculations';

// ── shapes ─────────────────────────────────────────────────────────────────────

export interface ReportCase {
  id: string;
  caseKey: string;
  title: string;
  status: string | null;
  priority: string | null;
  type: string | null;
  owner: string | null;
  folder: string | null;
  /** distinct ph_issues.issue_key values from tm_requirement_links */
  linkedIssueKeys: string[];
  createdAt: string | null;
}

export interface ReportCycle {
  id: string;
  name: string;
  status: string | null;
  /** actual_start ?? planned_start — null when neither is recorded */
  startDate: string | null;
  /** actual_end ?? planned_end — null when neither is recorded */
  endDate: string | null;
  /** test_case_ids in tm_cycle_scope for this cycle */
  scope: string[];
  /** caseId → tm_cycle_scope.current_status (null = not recorded) */
  scopeStatus: Record<string, string | null>;
}

export interface ReportRun {
  id: string;
  caseId: string | null;
  cycleId: string | null;
  status: string | null;
  /** completed_at ?? started_at — null when the run has no recorded date */
  executedAt: string | null;
  executedBy: string | null;
}

export interface ReportDefect {
  id: string;
  defectKey: string;
  title: string;
  severity: string | null;
  status: string | null;
  createdAt: string | null;
  /** tm_defects.source_test_case_id (single-element chain when present) */
  linkedCaseIds: string[];
  /** tm_defects.parent_key → ph_issues.issue_key */
  parentKey: string | null;
}

export interface ReportIssue {
  issueKey: string;
  summary: string | null;
}

export interface ReportIssueLink {
  sourceId: string;
  targetId: string;
  linkType: string;
}

export interface ReportData {
  cases: ReportCase[];
  cycles: ReportCycle[];
  runs: ReportRun[];
  defects: ReportDefect[];
  issues: ReportIssue[];
  issueLinks: ReportIssueLink[];
  projectName: string | null;
}

// ── helpers ────────────────────────────────────────────────────────────────────

const UNKNOWN = '—';

function runTime(r: ReportRun): number | null {
  return r.executedAt ? new Date(r.executedAt).getTime() : null;
}

/** Sort runs newest-first; undated runs sink to the end. */
function sortRunsDesc(runs: ReportRun[]): ReportRun[] {
  return [...runs].sort((a, b) => (runTime(b) ?? -Infinity) - (runTime(a) ?? -Infinity));
}

/** Latest recorded run status for a case, or null when no run exists. */
function latestRunStatus(data: ReportData, caseId: string): string | null {
  const runs = sortRunsDesc(data.runs.filter((r) => r.caseId === caseId));
  return runs[0]?.status ?? null;
}

function issueSummaryMap(data: ReportData): Map<string, string | null> {
  return new Map(data.issues.map((i) => [i.issueKey, i.summary]));
}

// ── execution selectors (tm_test_runs) ─────────────────────────────────────────

export function computeExecutionOverview(data: ReportData) {
  const byStatus: Record<string, number> = {};
  for (const r of data.runs) {
    const s = r.status ?? UNKNOWN;
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }
  const total = data.runs.length;
  const passed = byStatus['passed'] ?? 0;
  return { byStatus, total, passed };
}

export function computeExecutionSummary(data: ReportData) {
  return data.cycles.map((cycle) => {
    const cycleRuns = data.runs.filter((r) => r.cycleId === cycle.id);
    const total = cycleRuns.length;
    const passed = cycleRuns.filter((r) => r.status === 'passed').length;
    const failed = cycleRuns.filter((r) => r.status === 'failed').length;
    const blocked = cycleRuns.filter((r) => r.status === 'blocked').length;
    const notRun = cycleRuns.filter((r) => r.status === 'not_run').length;
    return { cycleName: cycle.name, total, passed, failed, blocked, notRun, passRate: passRate(passed, total - notRun) };
  });
}

export interface BurndownPoint {
  date: string;
  remaining: number;
  /** null when the cycle window is unknown — no ideal line is drawn */
  ideal: number | null;
  executed: number;
}

/**
 * Count-based burndown for one cycle (defaults to the last cycle).
 * Remaining = scope count − cumulative dated executions. Ideal line only when
 * both cycle dates are recorded — never a fabricated window.
 */
export function computeBurndown(data: ReportData, cycleId?: string): { cycleName: string | null; points: BurndownPoint[] } {
  const cycle = (cycleId ? data.cycles.find((c) => c.id === cycleId) : undefined) ?? data.cycles[data.cycles.length - 1];
  if (!cycle) return { cycleName: null, points: [] };
  const scopeTotal = cycle.scope.length;
  const durationDays =
    cycle.startDate && cycle.endDate
      ? Math.round((new Date(cycle.endDate).getTime() - new Date(cycle.startDate).getTime()) / 86400000)
      : null;
  const dated = data.runs.filter((r) => r.cycleId === cycle.id && r.executedAt !== null);
  const byDay: Record<string, number> = {};
  for (const r of dated) {
    const day = (r.executedAt as string).slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  }
  let cumExecuted = 0;
  let dayIdx = 0;
  const points = Object.entries(byDay)
    .sort()
    .map(([date, count]) => {
      cumExecuted += count;
      dayIdx++;
      const ideal =
        durationDays && durationDays > 0
          ? Math.max(0, scopeTotal - Math.round((scopeTotal / durationDays) * dayIdx))
          : null;
      return { date, remaining: Math.max(0, scopeTotal - cumExecuted), ideal, executed: count };
    });
  return { cycleName: cycle.name, points };
}

/** Count-based burnup over all dated runs; scope = total case count. */
export function computeBurnup(data: ReportData) {
  const dated = data.runs.filter((r) => r.executedAt !== null);
  const sorted = [...dated].sort((a, b) => (runTime(a) ?? 0) - (runTime(b) ?? 0));
  const byDay: Record<string, { total: number; passed: number }> = {};
  for (const r of sorted) {
    const day = (r.executedAt as string).slice(0, 10);
    if (!byDay[day]) byDay[day] = { total: 0, passed: 0 };
    byDay[day].total++;
    if (r.status === 'passed') byDay[day].passed++;
  }
  let cumPassed = 0;
  let cumTotal = 0;
  const scope = data.cases.length;
  return Object.entries(byDay)
    .sort()
    .map(([date, { total, passed }]) => {
      cumPassed += passed;
      cumTotal += total;
      return { date, cumPassed, cumTotal, scope };
    });
}

export function computeDistribution(data: ReportData) {
  const byStatus: Record<string, number> = {};
  for (const r of data.runs) {
    const s = r.status ?? UNKNOWN;
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }
  const total = data.runs.length;
  return Object.entries(byStatus)
    .map(([status, count]) => ({ status, count, pct: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

export function computeExecutionHistory(data: ReportData) {
  const caseById = new Map(data.cases.map((c) => [c.id, c]));
  const cycleById = new Map(data.cycles.map((c) => [c.id, c]));
  return sortRunsDesc(data.runs)
    .slice(0, 100)
    .map((r) => {
      const tc = r.caseId ? caseById.get(r.caseId) : undefined;
      const cycle = r.cycleId ? cycleById.get(r.cycleId) : undefined;
      return {
        date: r.executedAt,
        caseKey: tc?.caseKey ?? UNKNOWN,
        caseTitle: tc?.title ?? UNKNOWN,
        executor: r.executedBy ?? UNKNOWN,
        status: r.status ?? UNKNOWN,
        cycleName: cycle?.name ?? UNKNOWN,
      };
    });
}

// ── case selectors (tm_test_cases × tm_cycle_scope) ────────────────────────────

export function computeCaseDistribution(data: ReportData) {
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const c of data.cases) {
    const s = c.status ?? UNKNOWN;
    const p = c.priority ?? UNKNOWN;
    const t = c.type ?? UNKNOWN;
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    byPriority[p] = (byPriority[p] ?? 0) + 1;
    byType[t] = (byType[t] ?? 0) + 1;
  }
  return { byStatus, byPriority, byType, total: data.cases.length };
}

export function computeCaseUsage(data: ReportData) {
  const cycleCountMap: Record<string, number> = {};
  const lastRunMap: Record<string, string> = {};
  for (const cycle of data.cycles) {
    for (const cid of cycle.scope) {
      cycleCountMap[cid] = (cycleCountMap[cid] ?? 0) + 1;
    }
  }
  for (const r of sortRunsDesc(data.runs)) {
    if (r.caseId && r.executedAt && !lastRunMap[r.caseId]) lastRunMap[r.caseId] = r.executedAt;
  }
  return data.cases
    .map((c) => ({
      caseKey: c.caseKey,
      title: c.title,
      folder: c.folder,
      cycleCount: cycleCountMap[c.id] ?? 0,
      lastExecuted: lastRunMap[c.id] ?? null,
      isStale: !lastRunMap[c.id],
    }))
    .sort((a, b) => b.cycleCount - a.cycleCount);
}

// ── defect selectors (tm_defects) ──────────────────────────────────────────────

export function computeDefectSummary(data: ReportData) {
  const matrix: Record<string, Record<string, number>> = {};
  for (const d of data.defects) {
    const sev = d.severity ?? UNKNOWN;
    const st = d.status ?? UNKNOWN;
    if (!matrix[sev]) matrix[sev] = {};
    matrix[sev][st] = (matrix[sev][st] ?? 0) + 1;
  }
  return Object.entries(matrix).map(([severity, statuses]) => {
    const dated = data.defects.filter((d) => (d.severity ?? UNKNOWN) === severity && d.createdAt);
    const agingDays: number | null = dated.length
      ? Math.round(
          dated.reduce((sum, d) => sum + (Date.now() - new Date(d.createdAt as string).getTime()) / 86400000, 0) /
            dated.length,
        )
      : null;
    return {
      severity,
      statuses,
      total: Object.values(statuses).reduce((a, b) => a + b, 0),
      agingDays,
    };
  });
}

export function computeDefectImpact(data: ReportData) {
  const caseById = new Map(data.cases.map((c) => [c.id, c]));
  const summaries = issueSummaryMap(data);
  return data.defects
    .map((d) => ({
      defectKey: d.defectKey,
      title: d.title,
      severity: d.severity,
      status: d.status,
      linkedCases: d.linkedCaseIds.map((id) => caseById.get(id)?.caseKey ?? id),
      parentKey: d.parentKey,
      parentSummary: d.parentKey ? summaries.get(d.parentKey) ?? null : null,
      impactScore: impactScore(d.linkedCaseIds.length + (d.parentKey ? 1 : 0), d.severity ?? ''),
      agingDays: d.createdAt ? Math.floor((Date.now() - new Date(d.createdAt).getTime()) / 86400000) : null,
    }))
    .sort((a, b) => b.impactScore - a.impactScore);
}

/** Created-only trend — closure date is unproven on staging, so there is NO closure series. */
export function computeDefectTrend(data: ReportData) {
  const byDay: Record<string, number> = {};
  for (const d of data.defects) {
    if (!d.createdAt) continue;
    const day = d.createdAt.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  }
  return Object.entries(byDay)
    .sort()
    .map(([date, count]) => ({ date, count }));
}

// ── multi-cycle selectors (tm_cycle_scope.current_status per FORMULAS.md) ──────

export function computeMultiCycleComparison(data: ReportData) {
  let prevRate: number | null = null;
  return data.cycles.map((cycle) => {
    const statuses = cycle.scope.map((cid) => cycle.scopeStatus[cid] ?? null);
    const scopeTotal = cycle.scope.length;
    const passed = statuses.filter((s) => s === 'passed').length;
    const failed = statuses.filter((s) => s === 'failed').length;
    const blocked = statuses.filter((s) => s === 'blocked').length;
    const rate = passRate(passed, scopeTotal);
    const delta = prevRate !== null ? rate - prevRate : null;
    prevRate = rate;
    return { cycleName: cycle.name, scopeTotal, passed, failed, blocked, passRate: rate, delta };
  });
}

export function computeMultiCycleDetail(data: ReportData) {
  const inAnyScope = new Set<string>();
  for (const cy of data.cycles) for (const id of cy.scope) inAnyScope.add(id);
  return {
    cycles: data.cycles,
    rows: data.cases
      .filter((c) => inAnyScope.has(c.id))
      .map((c) => ({
        caseKey: c.caseKey,
        title: c.title,
        folder: c.folder,
        statuses: Object.fromEntries(data.cycles.map((cy) => [cy.id, cy.scopeStatus[c.id] ?? null])),
      })),
  };
}

export function computeMultiCycleDistribution(data: ReportData) {
  const statusGroups = ['passed', 'failed', 'blocked', 'in_progress', 'not_run', 'skipped'];
  const rows = statusGroups
    .map((st) => ({
      status: st,
      counts: data.cycles.map(
        (cy) => cy.scope.filter((cid) => (cy.scopeStatus[cid] ?? null) === st).length,
      ),
    }))
    .filter((r) => r.counts.some((c) => c > 0));
  return { cycles: data.cycles, rows };
}

// ── traceability selectors (tm_requirement_links → runs → defects) ────────────

export function computeTraceabilitySummary(data: ReportData) {
  const summaries = issueSummaryMap(data);
  const keys = [...new Set(data.cases.flatMap((c) => c.linkedIssueKeys))].sort();
  const totalCases = data.cases.length;
  return keys.map((issueKey) => {
    const linked = data.cases.filter((c) => c.linkedIssueKeys.includes(issueKey));
    const latestRuns = linked
      .map((c) => latestRunStatus(data, c.id))
      .filter((s): s is string => s !== null);
    const passed = latestRuns.filter((s) => s === 'passed').length;
    return {
      issueKey,
      summary: summaries.get(issueKey) ?? null,
      caseCount: linked.length,
      passRate: passRate(passed, latestRuns.length),
      coveragePct: totalCases ? Math.round((linked.length / totalCases) * 100) : 0,
    };
  });
}

export function computeTraceabilityDetail(data: ReportData) {
  const summaries = issueSummaryMap(data);
  return data.cases
    .filter((c) => c.linkedIssueKeys.length > 0)
    .flatMap((c) =>
      c.linkedIssueKeys.map((issueKey) => ({
        issueKey,
        issueSummary: summaries.get(issueKey) ?? null,
        caseKey: c.caseKey,
        caseTitle: c.title,
        caseStatus: c.status,
        lastRunStatus: latestRunStatus(data, c.id),
        defectCount: data.defects.filter(
          (d) => d.linkedCaseIds.includes(c.id) || (d.parentKey !== null && d.parentKey === issueKey),
        ).length,
        relatedLinks: data.issueLinks.filter((l) => l.sourceId === issueKey || l.targetId === issueKey).length,
        owner: c.owner,
      })),
    );
}
