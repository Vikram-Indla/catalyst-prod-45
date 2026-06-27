import { useMemo } from 'react';
import { passRate, impactScore } from './reportCalculations';

// ── seed constants ─────────────────────────────────────────────────────────────

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const CASE_TYPES = ['Functional', 'Regression', 'Smoke', 'Integration', 'Performance'];
const STATUSES = ['passed', 'failed', 'blocked', 'not_run', 'skipped'] as const;
const SEVERITIES = ['critical', 'major', 'minor', 'trivial'] as const;
const DEFECT_STATUSES = ['open', 'in_progress', 'fixed', 'verified', 'closed'] as const;
const OWNERS = ['Alice Chen', 'Bob Malik', 'Clara Rojas', 'Dev Sharma', 'Eva Park'];
const FOLDERS = ['Auth', 'Billing', 'Dashboard', 'API', 'Mobile', 'Reports'];
const FEATURES = ['Login Flow', 'Payment Gateway', 'User Management', 'Analytics', 'Notifications'];
type RunStatus = (typeof STATUSES)[number];

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRand(seed) * arr.length)];
}

// ── types ──────────────────────────────────────────────────────────────────────

export interface SeededCase {
  id: string;
  caseKey: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  owner: string;
  folder: string;
  linkedFeature: string | null;
  createdAt: string;
}

export interface SeededCycle {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  scope: string[];
}

export interface SeededRun {
  id: string;
  caseId: string;
  cycleId: string;
  status: RunStatus;
  executedAt: string;
  executedBy: string;
}

export interface SeededDefect {
  id: string;
  defectKey: string;
  title: string;
  severity: string;
  status: string;
  createdAt: string;
  linkedCaseIds: string[];
}

export interface SeededIssue {
  id: string;
  issueKey: string;
  summary: string;
}

export interface SeededData {
  cases: SeededCase[];
  cycles: SeededCycle[];
  runs: SeededRun[];
  defects: SeededDefect[];
  issues: SeededIssue[];
  projectName: string;
  generatedAt: string;
}

// ── data generation ────────────────────────────────────────────────────────────

function generateCases(): SeededCase[] {
  const cases: SeededCase[] = [];
  // High-failure flaky case (TC-007)
  // Stale case scenario (TC-033+)
  for (let i = 1; i <= 50; i++) {
    const s = i * 7;
    const isFlaky = i === 7;
    const isStale = i >= 40;
    cases.push({
      id: `case-${i}`,
      caseKey: `TC-${String(i).padStart(3, '0')}`,
      title: isFlaky
        ? 'Payment confirmation race condition (flaky)'
        : isStale
        ? `Legacy ${pick(CASE_TYPES, s + 1)} test ${i}`
        : `${pick(FEATURES, s + 2)} — ${pick(CASE_TYPES, s + 3)} scenario ${i}`,
      status: pick(['active', 'active', 'active', 'draft', 'deprecated'], s + 4),
      priority: pick(PRIORITIES, s + 5),
      type: pick(CASE_TYPES, s + 6),
      owner: pick(OWNERS, s + 7),
      folder: pick(FOLDERS, s + 8),
      linkedFeature: i <= 35 ? pick(FEATURES, s + 9) : null,
      createdAt: new Date(2026, 0, i % 28 + 1).toISOString(),
    });
  }
  return cases;
}

function generateCycles(caseIds: string[]): SeededCycle[] {
  const cycles: SeededCycle[] = [
    { id: 'cy-1', name: 'Sprint 12 — Regression', status: 'completed', startDate: '2026-04-01', endDate: '2026-04-14', scope: caseIds.slice(0, 30) },
    { id: 'cy-2', name: 'Sprint 13 — Auth Hardening', status: 'completed', startDate: '2026-04-15', endDate: '2026-04-28', scope: caseIds.slice(5, 35) },
    { id: 'cy-3', name: 'Sprint 14 — Payment Module', status: 'completed', startDate: '2026-05-01', endDate: '2026-05-14', scope: caseIds.slice(10, 42) },
    { id: 'cy-4', name: 'Sprint 15 — Dashboard v2', status: 'active', startDate: '2026-05-15', endDate: '2026-05-31', scope: caseIds.slice(0, 40) },
    { id: 'cy-5', name: 'Sprint 16 — Release Candidate', status: 'active', startDate: '2026-06-01', endDate: '2026-06-27', scope: caseIds.slice(2, 50) },
  ];
  return cycles;
}

function generateRuns(cycles: SeededCycle[], cases: SeededCase[]): SeededRun[] {
  const runs: SeededRun[] = [];
  let runIdx = 1;

  const statusWeightsByCycle: RunStatus[][] = [
    ['passed', 'passed', 'passed', 'failed', 'blocked', 'not_run'],          // cy-1: improving
    ['passed', 'passed', 'failed', 'blocked', 'not_run', 'not_run'],         // cy-2: mid
    ['passed', 'passed', 'passed', 'failed', 'failed', 'blocked'],           // cy-3: payment pain
    ['passed', 'passed', 'passed', 'passed', 'failed', 'blocked'],           // cy-4: getting better
    ['passed', 'passed', 'passed', 'passed', 'passed', 'failed', 'blocked'], // cy-5: near-release
  ];

  cycles.forEach((cycle, ci) => {
    const startMs = new Date(cycle.startDate).getTime();
    const endMs = new Date(cycle.endDate).getTime();
    const weights = statusWeightsByCycle[ci];

    cycle.scope.forEach((caseId, si) => {
      const s = ci * 100 + si;
      const tc = cases.find(c => c.id === caseId);
      // Flaky case always fails/passes alternating
      let status: RunStatus;
      if (tc?.caseKey === 'TC-007') {
        status = ci % 2 === 0 ? 'failed' : 'passed';
      } else {
        status = pick(weights, s) as RunStatus;
      }
      const t = startMs + seededRand(s + 3) * (endMs - startMs);
      runs.push({
        id: `run-${runIdx++}`,
        caseId,
        cycleId: cycle.id,
        status,
        executedAt: new Date(t).toISOString(),
        executedBy: pick(OWNERS, s + 4),
      });
    });
  });

  return runs;
}

function generateDefects(cases: SeededCase[]): SeededDefect[] {
  const defects: SeededDefect[] = [];
  const scenarios = [
    // High-risk: critical open defects linked to auth
    { title: 'Token refresh fails on mobile Safari', severity: 'critical', status: 'open', caseIdxs: [0, 1, 2], daysAgo: 18 },
    { title: 'Payment double-charge on network retry', severity: 'critical', status: 'open', caseIdxs: [6, 7], daysAgo: 12 },
    { title: 'Dashboard widget null-pointer on empty org', severity: 'major', status: 'in_progress', caseIdxs: [14, 15], daysAgo: 8 },
    { title: 'Bulk user import silently drops last row', severity: 'major', status: 'open', caseIdxs: [9, 10], daysAgo: 22 },
    { title: 'CSV export omits unicode characters', severity: 'minor', status: 'fixed', caseIdxs: [20], daysAgo: 30 },
    { title: 'Pagination resets on filter change', severity: 'minor', status: 'fixed', caseIdxs: [16, 17], daysAgo: 25 },
    { title: 'Tooltip overlaps CTA on narrow viewport', severity: 'trivial', status: 'closed', caseIdxs: [22], daysAgo: 40 },
    { title: 'Sort order lost after page refresh', severity: 'major', status: 'open', caseIdxs: [18, 19], daysAgo: 5 },
    { title: 'Notification email template missing logo', severity: 'minor', status: 'in_progress', caseIdxs: [24], daysAgo: 3 },
    { title: 'API rate limit not surfaced to user', severity: 'major', status: 'open', caseIdxs: [28, 29], daysAgo: 7 },
    { title: 'Search results stale after entity rename', severity: 'minor', status: 'fixed', caseIdxs: [30], daysAgo: 15 },
    { title: '2FA bypass via direct URL on mobile', severity: 'critical', status: 'in_progress', caseIdxs: [0, 3], daysAgo: 2 },
    { title: 'Report export timeout on large datasets', severity: 'major', status: 'open', caseIdxs: [35, 36], daysAgo: 9 },
    { title: 'Role assignment not reflected immediately', severity: 'minor', status: 'verified', caseIdxs: [11], daysAgo: 20 },
    { title: 'Sprint velocity graph inverted on UTC+12', severity: 'minor', status: 'open', caseIdxs: [40], daysAgo: 6 },
    { title: 'Drag-drop reorder loses position on save', severity: 'major', status: 'open', caseIdxs: [25, 26], daysAgo: 4 },
    { title: 'Attachment preview broken for .heic files', severity: 'minor', status: 'open', caseIdxs: [32], daysAgo: 11 },
    { title: 'Audit log missing for bulk delete', severity: 'major', status: 'in_progress', caseIdxs: [13], daysAgo: 14 },
    { title: 'Graph tooltip flickers on fast hover', severity: 'trivial', status: 'closed', caseIdxs: [38], daysAgo: 45 },
    { title: 'Empty state broken in dark mode', severity: 'minor', status: 'fixed', caseIdxs: [42], daysAgo: 19 },
  ];

  scenarios.forEach((sc, i) => {
    const createdAt = new Date(Date.now() - sc.daysAgo * 86400000).toISOString();
    defects.push({
      id: `def-${i + 1}`,
      defectKey: `BUG-${String(i + 1).padStart(3, '0')}`,
      title: sc.title,
      severity: sc.severity,
      status: sc.status,
      createdAt,
      linkedCaseIds: sc.caseIdxs.map(idx => cases[idx]?.id).filter(Boolean) as string[],
    });
  });

  return defects;
}

function generateIssues(): SeededIssue[] {
  return FEATURES.map((f, i) => ({
    id: `iss-${i + 1}`,
    issueKey: `CAT-${100 + i}`,
    summary: f,
  }));
}

// ── hook ───────────────────────────────────────────────────────────────────────

export function useSeededTestReportData(): SeededData {
  return useMemo(() => {
    const cases = generateCases();
    const cycles = generateCycles(cases.map(c => c.id));
    const runs = generateRuns(cycles, cases);
    const defects = generateDefects(cases);
    const issues = generateIssues();
    return {
      cases,
      cycles,
      runs,
      defects,
      issues,
      projectName: 'Catalyst Platform',
      generatedAt: new Date(2026, 5, 27, 9, 0, 0).toISOString(),
    };
  }, []);
}

// ── derived selectors ──────────────────────────────────────────────────────────

export function computeKpiRibbon(data: SeededData) {
  const { cases, cycles, runs, defects, issues } = data;
  const totalRuns = runs.length;
  const passed = runs.filter(r => r.status === 'passed').length;
  const failed = runs.filter(r => r.status === 'failed').length;
  const blocked = runs.filter(r => r.status === 'blocked').length;
  const openDefects = defects.filter(d => d.status === 'open' || d.status === 'in_progress').length;
  const linkedCases = cases.filter(c => c.linkedFeature !== null).length;
  const coverage = linkedCases > 0 ? Math.round((linkedCases / cases.length) * 100) : 0;
  return {
    totalCases: cases.length,
    totalCycles: cycles.length,
    totalRuns,
    passRate: passRate(passed, totalRuns),
    failed,
    blocked,
    defects: openDefects,
    coverage,
  };
}

export function computeExecutionOverview(data: SeededData) {
  const byStatus: Record<string, number> = {};
  for (const r of data.runs) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  }
  const total = data.runs.length;
  const passed = byStatus['passed'] ?? 0;
  return { byStatus, total, passed };
}

export function computeExecutionSummary(data: SeededData) {
  return data.cycles.map(cycle => {
    const cycleRuns = data.runs.filter(r => r.cycleId === cycle.id);
    const total = cycleRuns.length;
    const passed = cycleRuns.filter(r => r.status === 'passed').length;
    const failed = cycleRuns.filter(r => r.status === 'failed').length;
    const blocked = cycleRuns.filter(r => r.status === 'blocked').length;
    const notRun = cycleRuns.filter(r => r.status === 'not_run').length;
    return { cycleName: cycle.name, total, passed, failed, blocked, notRun, passRate: passRate(passed, total - notRun) };
  });
}

export function computeBurndown(data: SeededData) {
  const cycle = data.cycles.find(c => c.id === 'cy-5') ?? data.cycles[data.cycles.length - 1];
  const scopeTotal = cycle.scope.length;
  const startMs = new Date(cycle.startDate).getTime();
  const endMs = new Date(cycle.endDate).getTime();
  const durationDays = Math.round((endMs - startMs) / 86400000);
  const runsInCycle = data.runs.filter(r => r.cycleId === cycle.id).sort(
    (a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime(),
  );
  const byDay: Record<string, number> = {};
  for (const r of runsInCycle) {
    const day = r.executedAt.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  }
  let cumExecuted = 0;
  let dayIdx = 0;
  return Object.entries(byDay).sort().map(([date, count]) => {
    cumExecuted += count;
    dayIdx++;
    const idealRemaining = Math.max(0, scopeTotal - Math.round((scopeTotal / durationDays) * dayIdx));
    return { date, remaining: scopeTotal - cumExecuted, ideal: idealRemaining, executed: count };
  });
}

export function computeBurnup(data: SeededData) {
  const sorted = [...data.runs].sort(
    (a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime(),
  );
  const byDay: Record<string, { total: number; passed: number }> = {};
  for (const r of sorted) {
    const day = r.executedAt.slice(0, 10);
    if (!byDay[day]) byDay[day] = { total: 0, passed: 0 };
    byDay[day].total++;
    if (r.status === 'passed') byDay[day].passed++;
  }
  let cumPassed = 0;
  let cumTotal = 0;
  const scope = data.cases.length;
  return Object.entries(byDay).sort().map(([date, { total, passed }]) => {
    cumPassed += passed;
    cumTotal += total;
    return { date, cumPassed, cumTotal, scope };
  });
}

export function computeDistribution(data: SeededData) {
  const byStatus: Record<string, number> = {};
  for (const r of data.runs) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  }
  const total = data.runs.length;
  return Object.entries(byStatus)
    .map(([status, count]) => ({ status, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export function computeExecutionHistory(data: SeededData) {
  return [...data.runs]
    .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
    .slice(0, 100)
    .map(r => {
      const tc = data.cases.find(c => c.id === r.caseId);
      const cycle = data.cycles.find(c => c.id === r.cycleId);
      return {
        date: r.executedAt,
        caseKey: tc?.caseKey ?? r.caseId,
        caseTitle: tc?.title ?? '—',
        executor: r.executedBy,
        status: r.status,
        cycleName: cycle?.name ?? '—',
      };
    });
}

export function computeCaseDistribution(data: SeededData) {
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const c of data.cases) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    byPriority[c.priority] = (byPriority[c.priority] ?? 0) + 1;
    byType[c.type] = (byType[c.type] ?? 0) + 1;
  }
  return { byStatus, byPriority, byType, total: data.cases.length };
}

export function computeCaseUsage(data: SeededData) {
  const cycleCountMap: Record<string, number> = {};
  const lastRunMap: Record<string, string> = {};
  for (const cycle of data.cycles) {
    for (const cid of cycle.scope) {
      cycleCountMap[cid] = (cycleCountMap[cid] ?? 0) + 1;
    }
  }
  const sortedRuns = [...data.runs].sort(
    (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime(),
  );
  for (const r of sortedRuns) {
    if (!lastRunMap[r.caseId]) lastRunMap[r.caseId] = r.executedAt;
  }
  return data.cases.map(c => ({
    caseKey: c.caseKey,
    title: c.title,
    folder: c.folder,
    cycleCount: cycleCountMap[c.id] ?? 0,
    lastExecuted: lastRunMap[c.id] ?? null,
    isStale: !lastRunMap[c.id],
  })).sort((a, b) => b.cycleCount - a.cycleCount);
}

export function computeDefectSummary(data: SeededData) {
  const matrix: Record<string, Record<string, number>> = {};
  for (const d of data.defects) {
    if (!matrix[d.severity]) matrix[d.severity] = {};
    matrix[d.severity][d.status] = (matrix[d.severity][d.status] ?? 0) + 1;
  }
  return Object.entries(matrix).map(([severity, statuses]) => ({
    severity,
    statuses,
    total: Object.values(statuses).reduce((a, b) => a + b, 0),
    agingDays: Math.round(
      data.defects
        .filter(d => d.severity === severity)
        .reduce((sum, d) => sum + (Date.now() - new Date(d.createdAt).getTime()) / 86400000, 0) /
        Math.max(1, data.defects.filter(d => d.severity === severity).length),
    ),
  }));
}

export function computeDefectImpact(data: SeededData) {
  return data.defects.map(d => ({
    defectKey: d.defectKey,
    title: d.title,
    severity: d.severity,
    status: d.status,
    linkedCases: d.linkedCaseIds.map(id => data.cases.find(c => c.id === id)?.caseKey ?? id),
    impactScore: impactScore(d.linkedCaseIds.length, d.severity),
    agingDays: Math.floor((Date.now() - new Date(d.createdAt).getTime()) / 86400000),
  })).sort((a, b) => b.impactScore - a.impactScore);
}

export function computeDefectTrend(data: SeededData) {
  const byDay: Record<string, number> = {};
  for (const d of data.defects) {
    const day = d.createdAt.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  }
  return Object.entries(byDay).sort().map(([date, count]) => ({ date, count }));
}

export function computeMultiCycleComparison(data: SeededData) {
  let prevRate: number | null = null;
  return data.cycles.map(cycle => {
    const scopeTotal = cycle.scope.length;
    const cycleRuns = data.runs.filter(r => r.cycleId === cycle.id);
    const passed = cycleRuns.filter(r => r.status === 'passed').length;
    const failed = cycleRuns.filter(r => r.status === 'failed').length;
    const blocked = cycleRuns.filter(r => r.status === 'blocked').length;
    const rate = passRate(passed, scopeTotal);
    const delta = prevRate !== null ? rate - prevRate : null;
    prevRate = rate;
    return { cycleName: cycle.name, scopeTotal, passed, failed, blocked, passRate: rate, delta };
  });
}

export function computeMultiCycleDetail(data: SeededData) {
  const caseMap: Record<string, Record<string, string>> = {};
  for (const r of data.runs) {
    if (!caseMap[r.caseId]) caseMap[r.caseId] = {};
    if (!caseMap[r.caseId][r.cycleId]) {
      caseMap[r.caseId][r.cycleId] = r.status;
    }
  }
  return {
    cycles: data.cycles,
    rows: data.cases.slice(0, 30).map(c => ({
      caseKey: c.caseKey,
      title: c.title,
      folder: c.folder,
      statuses: Object.fromEntries(data.cycles.map(cy => [cy.id, caseMap[c.id]?.[cy.id] ?? null])),
    })),
  };
}

export function computeProjectMetrics(data: SeededData) {
  const totalRuns = data.runs.length;
  const passed = data.runs.filter(r => r.status === 'passed').length;
  const openDefects = data.defects.filter(d => d.status === 'open' || d.status === 'in_progress').length;
  const days = 90;
  return [
    { metric: 'Total Runs', value: String(totalRuns) },
    { metric: 'Passed Runs', value: String(passed) },
    { metric: 'Pass Rate', value: `${passRate(passed, totalRuns)}%` },
    { metric: 'Velocity (runs/day)', value: (totalRuns / days).toFixed(1) },
    { metric: 'Open Defects', value: String(openDefects) },
    { metric: 'Total Defects', value: String(data.defects.length) },
    { metric: 'Defect Rate', value: `${((data.defects.length / totalRuns) * 100).toFixed(1)}%` },
    { metric: 'Avg Cycle Duration', value: '13d' },
  ];
}

export function computeTraceabilitySummary(data: SeededData) {
  return data.issues.map(issue => {
    const linked = data.cases.filter(c => c.linkedFeature === issue.summary);
    const linkedIds = linked.map(c => c.id);
    const latestRuns = linkedIds.map(cid => {
      const runs = data.runs.filter(r => r.caseId === cid).sort(
        (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime(),
      );
      return runs[0]?.status ?? null;
    }).filter(Boolean) as string[];
    const passed = latestRuns.filter(s => s === 'passed').length;
    return {
      issueKey: issue.issueKey,
      summary: issue.summary,
      caseCount: linked.length,
      passRate: passRate(passed, latestRuns.length),
      coveragePct: Math.round((linked.length / data.cases.length) * 100),
    };
  });
}

export function computeTraceabilityDetail(data: SeededData) {
  return data.cases
    .filter(c => c.linkedFeature !== null)
    .map(c => {
      const issue = data.issues.find(i => i.summary === c.linkedFeature);
      const runs = data.runs.filter(r => r.caseId === c.id).sort(
        (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime(),
      );
      const linkedDefects = data.defects.filter(d => d.linkedCaseIds.includes(c.id));
      return {
        issueKey: issue?.issueKey ?? '—',
        issueSummary: issue?.summary ?? '—',
        caseKey: c.caseKey,
        caseTitle: c.title,
        caseStatus: c.status,
        lastRunStatus: runs[0]?.status ?? 'not_run',
        defectCount: linkedDefects.length,
        owner: c.owner,
      };
    });
}
