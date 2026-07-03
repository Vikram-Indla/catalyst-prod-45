/**
 * reportExportRows — export-table selectors + compact AI aggregates for the
 * Reports hub (CAT-REPORTS-HUB-20260703-001 Phase 3, Tasks A/B).
 *
 * getExportRows(reportId, data)     → primary table (columns + rows) for CSV/PDF.
 * deriveWiredAggregates(reportId, data) → counts-only object for report-insights.
 *
 * Zero-assumption: unknown values export as '' / null — never a fabricated
 * default. All numbers come from the same pure selectors the canvas renders.
 */
import {
  computeBurndown,
  computeBurnup,
  computeCaseDistribution,
  computeCaseUsage,
  computeDefectImpact,
  computeDefectSummary,
  computeDefectTrend,
  computeDistribution,
  computeExecutionHistory,
  computeExecutionOverview,
  computeExecutionSummary,
  computeMultiCycleComparison,
  computeMultiCycleDetail,
  computeMultiCycleDistribution,
  computeTraceabilityDetail,
  computeTraceabilitySummary,
  type ReportData,
} from '@/pages/testhub/reports/lab/reportData';

export interface ExportColumn {
  key: string;
  header: string;
}

export type ExportRow = Record<string, string | number | null>;

export interface ExportTable {
  columns: ExportColumn[];
  rows: ExportRow[];
}

const col = (key: string, header: string): ExportColumn => ({ key, header });

function distributionTable(data: ReportData): ExportTable {
  return {
    columns: [col('status', 'Status'), col('count', 'Runs'), col('pct', 'Share %')],
    rows: computeDistribution(data).map((r) => ({ status: r.status, count: r.count, pct: r.pct })),
  };
}

/** Primary exportable table per wired (Lab-derived) report. Null = no tabular view. */
export function getExportRows(reportId: string, data: ReportData): ExportTable | null {
  switch (reportId) {
    case 'execution-overview':
    case 'execution-distribution':
      return distributionTable(data);

    case 'execution-summary':
      return {
        columns: [
          col('cycleName', 'Cycle'), col('total', 'Total'), col('passed', 'Passed'),
          col('failed', 'Failed'), col('blocked', 'Blocked'), col('notRun', 'Not run'),
          col('passRate', 'Pass rate %'),
        ],
        rows: computeExecutionSummary(data).map((r) => ({ ...r })),
      };

    case 'execution-burndown': {
      const { points } = computeBurndown(data);
      return {
        columns: [
          col('date', 'Date'), col('remaining', 'Remaining'),
          col('ideal', 'Ideal'), col('executed', 'Executed'),
        ],
        rows: points.map((p) => ({ date: p.date, remaining: p.remaining, ideal: p.ideal, executed: p.executed })),
      };
    }

    case 'execution-burnup':
      return {
        columns: [
          col('date', 'Date'), col('cumTotal', 'Cumulative executed'),
          col('cumPassed', 'Cumulative passed'), col('scope', 'Scope'),
        ],
        rows: computeBurnup(data).map((p) => ({ ...p })),
      };

    case 'execution-history':
      return {
        columns: [
          col('date', 'Date'), col('caseKey', 'Case'), col('caseTitle', 'Title'),
          col('executor', 'Executor'), col('status', 'Status'), col('cycleName', 'Cycle'),
        ],
        rows: computeExecutionHistory(data).map((r) => ({ ...r })),
      };

    case 'case-distribution': {
      const d = computeCaseDistribution(data);
      const rows: ExportRow[] = [];
      const push = (dimension: string, entries: Record<string, number>) => {
        for (const [value, count] of Object.entries(entries)) {
          rows.push({ dimension, value, count, pct: d.total ? Math.round((count / d.total) * 100) : 0 });
        }
      };
      push('Status', d.byStatus);
      push('Priority', d.byPriority);
      push('Type', d.byType);
      return {
        columns: [col('dimension', 'Dimension'), col('value', 'Value'), col('count', 'Cases'), col('pct', 'Share %')],
        rows,
      };
    }

    case 'case-usage':
      return {
        columns: [
          col('caseKey', 'Case'), col('title', 'Title'), col('folder', 'Folder'),
          col('cycleCount', 'Cycles'), col('lastExecuted', 'Last executed'), col('stale', 'Stale'),
        ],
        rows: computeCaseUsage(data).map((r) => ({
          caseKey: r.caseKey, title: r.title, folder: r.folder,
          cycleCount: r.cycleCount, lastExecuted: r.lastExecuted, stale: r.isStale ? 'yes' : 'no',
        })),
      };

    case 'defect-impact':
      return {
        columns: [
          col('defectKey', 'Defect'), col('title', 'Title'), col('severity', 'Severity'),
          col('status', 'Status'), col('linkedCases', 'Linked cases'), col('parentKey', 'Parent'),
          col('impactScore', 'Impact'), col('agingDays', 'Aging (days)'),
        ],
        rows: computeDefectImpact(data).map((r) => ({
          defectKey: r.defectKey, title: r.title, severity: r.severity, status: r.status,
          linkedCases: r.linkedCases.join(', '), parentKey: r.parentKey,
          impactScore: r.impactScore, agingDays: r.agingDays,
        })),
      };

    case 'defect-trend':
      return {
        columns: [col('date', 'Date'), col('count', 'Defects created')],
        rows: computeDefectTrend(data).map((r) => ({ ...r })),
      };

    case 'multi-cycle-comparison':
    case 'multi-cycle-summary':
      return {
        columns: [
          col('cycleName', 'Cycle'), col('scopeTotal', 'Scope'), col('passed', 'Passed'),
          col('failed', 'Failed'), col('blocked', 'Blocked'), col('passRate', 'Pass rate %'),
          col('delta', 'Δ vs previous'),
        ],
        rows: computeMultiCycleComparison(data).map((r) => ({ ...r })),
      };

    case 'multi-cycle-detail': {
      const d = computeMultiCycleDetail(data);
      return {
        columns: [
          col('caseKey', 'Case'), col('title', 'Title'), col('folder', 'Folder'),
          ...d.cycles.map((cy) => col(cy.id, cy.name)),
        ],
        rows: d.rows.map((r) => ({
          caseKey: r.caseKey, title: r.title, folder: r.folder,
          ...Object.fromEntries(d.cycles.map((cy) => [cy.id, r.statuses[cy.id] ?? null])),
        })),
      };
    }

    case 'multi-cycle-distribution': {
      const d = computeMultiCycleDistribution(data);
      return {
        columns: [col('status', 'Status'), ...d.cycles.map((cy) => col(cy.id, cy.name))],
        rows: d.rows.map((r) => ({
          status: r.status,
          ...Object.fromEntries(d.cycles.map((cy, i) => [cy.id, r.counts[i] ?? 0])),
        })),
      };
    }

    case 'traceability-summary':
      return {
        columns: [
          col('issueKey', 'Requirement'), col('summary', 'Summary'), col('caseCount', 'Cases'),
          col('passRate', 'Pass rate %'), col('coveragePct', 'Coverage %'),
        ],
        rows: computeTraceabilitySummary(data).map((r) => ({ ...r })),
      };

    case 'traceability-detail':
      return {
        columns: [
          col('issueKey', 'Requirement'), col('issueSummary', 'Requirement summary'),
          col('caseKey', 'Case'), col('caseTitle', 'Case title'), col('caseStatus', 'Case status'),
          col('lastRunStatus', 'Last run'), col('defectCount', 'Defects'), col('owner', 'Owner'),
        ],
        rows: computeTraceabilityDetail(data).map((r) => ({
          issueKey: r.issueKey, issueSummary: r.issueSummary, caseKey: r.caseKey,
          caseTitle: r.caseTitle, caseStatus: r.caseStatus, lastRunStatus: r.lastRunStatus,
          defectCount: r.defectCount, owner: r.owner,
        })),
      };

    default:
      return null;
  }
}

/**
 * Compact counts-only aggregates for the report-insights edge function.
 * Names already visible in-app (cycle names) are the only non-numeric values.
 */
export function deriveWiredAggregates(reportId: string, data: ReportData): Record<string, unknown> {
  const overview = computeExecutionOverview(data);
  const defectsBySeverity: Record<string, number> = {};
  const defectsByStatus: Record<string, number> = {};
  for (const row of computeDefectSummary(data)) {
    defectsBySeverity[row.severity] = row.total;
    for (const [status, count] of Object.entries(row.statuses)) {
      defectsByStatus[status] = (defectsByStatus[status] ?? 0) + count;
    }
  }
  const linkedRequirements = new Set(data.cases.flatMap((c) => c.linkedIssueKeys)).size;

  return {
    report_id: reportId,
    total_cases: data.cases.length,
    total_cycles: data.cycles.length,
    total_runs: overview.total,
    runs_by_status: overview.byStatus,
    total_defects: data.defects.length,
    defects_by_severity: defectsBySeverity,
    defects_by_status: defectsByStatus,
    linked_requirements: linkedRequirements,
    cycles: computeMultiCycleComparison(data).map((c) => ({
      name: c.cycleName, scope: c.scopeTotal, passed: c.passed,
      failed: c.failed, blocked: c.blocked, pass_rate_pct: c.passRate,
    })),
  };
}
