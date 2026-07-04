import React, { useMemo } from 'react';
import Lozenge from '@atlaskit/lozenge';
import {
  ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { REPORT_DEFS } from './reportDefinitions';
import ReportEmptyState from './ReportEmptyState';
import { passRateStr, sharePercent, cycleDeltaStr, coveragePercent } from './reportCalculations';
import {
  ReportData,
  computeExecutionOverview, computeExecutionSummary,
  computeBurndown, computeBurnup, computeDistribution, computeExecutionHistory,
  computeCaseDistribution, computeCaseUsage,
  computeDefectSummary, computeDefectImpact, computeDefectTrend,
  computeMultiCycleComparison, computeMultiCycleDetail, computeMultiCycleDistribution,
  computeTraceabilitySummary, computeTraceabilityDetail,
} from './reportData';
import { FilterState } from './ReportFilterBar';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { CANONICAL_ROW_TYPOGRAPHY } from '@/lib/catalyst-rules/CatalystRules';
import { ADS_SERIES, ADS_CHART } from '@/lib/charts/adsChartTheme';
import {
  ReportLineChart, ReportBarChart, ReportAreaChart, ReportPieChart,
  ADS_AXIS_TICK, ADS_TOOLTIP_CONTENT_STYLE,
} from '@/components/testhub/reports/charts/ReportChart';

// ── chart colors — ADS tokens only (S1.4) ─────────────────────────────────────

/** Semantic status → ADS chart token. Non-status categories fall back to ADS_SERIES. */
const STATUS_CHART_COLOR: Record<string, string> = {
  passed: ADS_CHART.success,
  failed: ADS_CHART.danger,
  blocked: ADS_CHART.warning,
  in_progress: ADS_CHART.information,
  not_run: ADS_CHART.neutral,
  skipped: ADS_CHART.neutral,
};

function statusChartColor(status: string, i: number): string {
  return STATUS_CHART_COLOR[status] ?? ADS_SERIES[i % ADS_SERIES.length];
}

const STATUS_APPEARANCE: Record<string, 'success' | 'removed' | 'moved' | 'default' | 'inprogress' | 'new'> = {
  passed: 'success',
  failed: 'removed',
  blocked: 'moved',
  not_run: 'default',
  skipped: 'default',
  in_progress: 'inprogress',
  open: 'removed',
  fixed: 'success',
  verified: 'success',
  resolved: 'success',
  reopened: 'removed',
  closed: 'default',
  active: 'inprogress',
  completed: 'success',
  critical: 'removed',
  major: 'moved',
  minor: 'new',
  trivial: 'default',
};

// ── shared primitives ──────────────────────────────────────────────────────────

/** Key-like cell text — CRE Grid H canonical row typography (key). */
function KeyText({ children, color = 'var(--ds-text-brand)' }: { children: React.ReactNode; color?: string }) {
  return (
    <code
      style={{
        fontSize: CANONICAL_ROW_TYPOGRAPHY.key.fontSize,
        lineHeight: CANONICAL_ROW_TYPOGRAPHY.key.lineHeight,
        color,
      }}
    >
      {children}
    </code>
  );
}

/** Title-like cell text — CRE Grid H canonical row typography (title). */
function TitleText({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: CANONICAL_ROW_TYPOGRAPHY.title.fontSize,
        lineHeight: CANONICAL_ROW_TYPOGRAPHY.title.lineHeight,
        color: 'var(--ds-text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {children}
    </span>
  );
}

interface DataTableHeader {
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface DataTableRowShape {
  __id: string;
  cells: React.ReactNode[];
}

/**
 * Canonical tabular surface for report views — JiraTable-backed (S1.3).
 * Headers form the column schema; each row is an array of pre-rendered cells.
 */
function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: DataTableHeader[];
  rows: React.ReactNode[][];
  empty?: string;
}) {
  const data = useMemo<DataTableRowShape[]>(
    () => rows.map((cells, i) => ({ __id: String(i), cells })),
    [rows],
  );
  const columns = useMemo<Column<DataTableRowShape>[]>(
    () =>
      headers.map((h, ci) => ({
        id: `c${ci}`,
        label: h.label,
        width: h.width ? parseFloat(h.width) : undefined,
        align: h.align === 'right' ? 'end' : h.align === 'center' ? 'center' : 'start',
        accessor: (row: DataTableRowShape) => row.cells[ci],
        cell: ({ row }: { row: DataTableRowShape }) => <>{row.cells[ci]}</>,
      })),
    [headers],
  );
  if (rows.length === 0) return <ReportEmptyState message={empty} />;
  return (
    <div style={{ maxHeight: 480, overflowY: 'auto' }}>
      <JiraTable<DataTableRowShape>
        columns={columns}
        data={data}
        getRowId={(r) => r.__id}
        density="compact"
        ariaLabel="Report data table"
      />
    </div>
  );
}

function ChartWrap({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {title && (
        <p style={{ margin: '0 0 10px', fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text-subtle)' }}>
          {title}
        </p>
      )}
      <div role="img" aria-label={title ?? 'Report chart'}>
        {children}
      </div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ds-border)' }}>{children}</div>;
}

function PassRateBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? 'var(--ds-background-success)' : rate >= 50 ? 'var(--ds-background-warning)' : 'var(--ds-background-danger)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: 'var(--ds-background-neutral)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text)', minWidth: 36, textAlign: 'right' }}>
        {rate}%
      </span>
    </div>
  );
}

/** Zero-assumption date cell: unknown date renders a dash, never a fake date. */
function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

// ── report renderers ───────────────────────────────────────────────────────────

function ExecutionOverview({ data }: { data: ReportData }) {
  const { byStatus, total, passed } = useMemo(() => computeExecutionOverview(data), [data]);
  if (total === 0) return <ReportEmptyState message="No test runs recorded" hint="Execute tests in a cycle to populate this report." />;
  const pieData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
  const tableRows = Object.entries(byStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => [
      <Lozenge key={status} appearance={STATUS_APPEARANCE[status] ?? 'default'}>{status.replace(/_/g, ' ')}</Lozenge>,
      count,
      sharePercent(count, total),
    ]);
  tableRows.push([<strong key="t">Total</strong>, total, `${Math.round((passed / total) * 100)}% pass rate`]);

  return (
    <>
      <Section>
        <ChartWrap title="Execution status distribution">
          <ReportPieChart
            data={pieData}
            getColor={(d, i) => statusChartColor(String(d.name), i)}
          />
        </ChartWrap>
      </Section>
      <Section>
        <DataTable
          headers={[{ label: 'Status', width: '40%' }, { label: 'Count', align: 'right' }, { label: 'Share', align: 'right' }]}
          rows={tableRows}
        />
      </Section>
    </>
  );
}

function ExecutionSummary({ data }: { data: ReportData }) {
  const rows = useMemo(() => computeExecutionSummary(data), [data]);
  const chartData = rows.map(r => ({ name: r.cycleName.split(' — ')[0], passed: r.passed, failed: r.failed, blocked: r.blocked }));

  return (
    <>
      <Section>
        <ChartWrap title="Pass / Fail / Blocked per cycle">
          <ReportBarChart
            data={chartData}
            xKey="name"
            series={[
              { dataKey: 'passed', name: 'Passed', color: ADS_CHART.success, stackId: 'a' },
              { dataKey: 'failed', name: 'Failed', color: ADS_CHART.danger, stackId: 'a' },
              { dataKey: 'blocked', name: 'Blocked', color: ADS_CHART.warning, stackId: 'a' },
            ]}
          />
        </ChartWrap>
      </Section>
      <Section>
        <DataTable
          headers={[
            { label: 'Cycle', width: '30%' },
            { label: 'Total', align: 'right' },
            { label: 'Passed', align: 'right' },
            { label: 'Failed', align: 'right' },
            { label: 'Blocked', align: 'right' },
            { label: 'Pass Rate', align: 'right', width: '20%' },
          ]}
          rows={rows.map(r => [
            r.cycleName,
            r.total,
            r.passed,
            r.failed,
            r.blocked,
            <PassRateBar key={r.cycleName} rate={r.passRate} />,
          ])}
        />
      </Section>
    </>
  );
}

function ExecutionBurndown({ data }: { data: ReportData }) {
  const { cycleName, points } = useMemo(() => computeBurndown(data), [data]);
  if (points.length === 0) {
    return <ReportEmptyState message="No dated executions" hint="Burndown needs runs with a recorded execution date." />;
  }
  const hasIdeal = points.some((p) => p.ideal !== null);
  return (
    <>
      <Section>
        <ChartWrap title={cycleName ? `Remaining vs Ideal (${cycleName}) — count-based` : 'Remaining vs Ideal — count-based'}>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke={ADS_CHART.grid} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={ADS_AXIS_TICK} />
                <YAxis tick={ADS_AXIS_TICK} />
                <RechartTooltip labelFormatter={formatDate} contentStyle={ADS_TOOLTIP_CONTENT_STYLE} />
                <Legend />
                {hasIdeal && (
                  <Line type="monotone" dataKey="ideal" stroke={ADS_SERIES[0]} strokeDasharray="6 3" name="Ideal remaining" dot={false} isAnimationActive={false} />
                )}
                <Area type="monotone" dataKey="remaining" fill={ADS_SERIES[0]} fillOpacity={0.2} stroke={ADS_SERIES[0]} name="Actual remaining" isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartWrap>
        {!hasIdeal && (
          <p style={{ margin: '8px 0 0', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', fontStyle: 'italic' }}>
            Ideal line omitted — this cycle has no recorded start/end dates.
          </p>
        )}
      </Section>
      <Section>
        <DataTable
          headers={[{ label: 'Date' }, { label: 'Executed', align: 'right' }, { label: 'Remaining', align: 'right' }, { label: 'Ideal', align: 'right' }]}
          rows={points.map(d => [formatDate(d.date), d.executed, d.remaining, d.ideal ?? '—'])}
        />
      </Section>
    </>
  );
}

function ExecutionBurnup({ data }: { data: ReportData }) {
  const chartData = useMemo(() => computeBurnup(data), [data]);
  return (
    <>
      <Section>
        <ChartWrap title="Cumulative executed and passed over time">
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ADS_CHART.grid} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={ADS_AXIS_TICK} />
                <YAxis tick={ADS_AXIS_TICK} />
                <RechartTooltip labelFormatter={formatDate} contentStyle={ADS_TOOLTIP_CONTENT_STYLE} />
                <Legend />
                <Line type="monotone" dataKey="scope" stroke="var(--ds-border-bold)" strokeDasharray="6 3" name="Total scope" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="cumTotal" fill={ADS_SERIES[0]} fillOpacity={0.2} stroke={ADS_SERIES[0]} name="Cumulative executed" isAnimationActive={false} />
                <Area type="monotone" dataKey="cumPassed" fill={ADS_CHART.success} fillOpacity={0.2} stroke={ADS_CHART.success} name="Cumulative passed" isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartWrap>
      </Section>
      <Section>
        <DataTable
          headers={[{ label: 'Date' }, { label: 'Cum. Executed', align: 'right' }, { label: 'Cum. Passed', align: 'right' }, { label: 'Pass Rate', align: 'right' }]}
          rows={chartData.slice(-14).map(d => [formatDate(d.date), d.cumTotal, d.cumPassed, passRateStr(d.cumPassed, d.cumTotal)])}
        />
      </Section>
    </>
  );
}

function ExecutionDistribution({ data }: { data: ReportData }) {
  const dist = useMemo(() => computeDistribution(data), [data]);
  return (
    <>
      <Section>
        <ChartWrap title="Run count by status">
          <ReportBarChart
            data={dist}
            xKey="status"
            layout="vertical"
            series={[{ dataKey: 'count', name: 'Runs' }]}
            getBarColor={(d, i) => statusChartColor(String(d.status), i)}
            showLegend={false}
          />
        </ChartWrap>
      </Section>
      <Section>
        <DataTable
          headers={[{ label: 'Status' }, { label: 'Count', align: 'right' }, { label: 'Share', align: 'right' }]}
          rows={dist.map(d => [
            <Lozenge key={d.status} appearance={STATUS_APPEARANCE[d.status] ?? 'default'}>{d.status.replace(/_/g, ' ')}</Lozenge>,
            d.count,
            `${d.pct}%`,
          ])}
        />
      </Section>
    </>
  );
}

function ExecutionHistory({ data }: { data: ReportData }) {
  const rows = useMemo(() => computeExecutionHistory(data), [data]);
  return (
    <Section>
      <DataTable
        headers={[
          { label: 'Date', width: '12%' },
          { label: 'Case Key', width: '10%' },
          { label: 'Case Title', width: '32%' },
          { label: 'Executor', width: '16%' },
          { label: 'Cycle', width: '20%' },
          { label: 'Result', width: '10%', align: 'center' },
        ]}
        rows={rows.map(r => [
          <span key={r.date} style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>{formatDate(r.date)}</span>,
          <KeyText key={r.caseKey}>{r.caseKey}</KeyText>,
          <TitleText key={r.caseTitle}>{r.caseTitle}</TitleText>,
          r.executor,
          <span key={r.cycleName} style={{ fontSize: 'var(--ds-font-size-200)' }}>{r.cycleName}</span>,
          <Lozenge key={r.status} appearance={STATUS_APPEARANCE[r.status] ?? 'default'}>{r.status.replace(/_/g, ' ')}</Lozenge>,
        ])}
      />
    </Section>
  );
}

function CaseDistribution({ data }: { data: ReportData }) {
  const { byStatus, byPriority, byType, total } = useMemo(() => computeCaseDistribution(data), [data]);
  const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(byPriority).map(([name, value]) => ({ name, value }));

  return (
    <>
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <ChartWrap title="By status">
            <ReportPieChart
              data={statusData}
              outerRadius={90}
              getColor={(d, i) => statusChartColor(String(d.name), i)}
            />
          </ChartWrap>
          <ChartWrap title="By priority">
            <ReportBarChart
              data={priorityData}
              xKey="name"
              series={[{ dataKey: 'value', name: 'Cases' }]}
              getBarColor={(_, i) => ADS_SERIES[i % ADS_SERIES.length]}
              showLegend={false}
            />
          </ChartWrap>
        </div>
      </Section>
      <Section>
        <DataTable
          headers={[{ label: 'Type' }, { label: 'Count', align: 'right' }, { label: 'Share', align: 'right' }]}
          rows={Object.entries(byType).map(([type, count]) => [type, count, sharePercent(count, total)])}
        />
      </Section>
    </>
  );
}

function CaseUsage({ data }: { data: ReportData }) {
  const rows = useMemo(() => computeCaseUsage(data), [data]);
  return (
    <Section>
      <DataTable
        headers={[
          { label: 'Case Key', width: '10%' },
          { label: 'Title', width: '40%' },
          { label: 'Folder', width: '14%' },
          { label: 'Cycles', align: 'right', width: '10%' },
          { label: 'Last Executed', width: '16%' },
          { label: 'State', width: '10%', align: 'center' },
        ]}
        rows={rows.map(r => [
          <KeyText key={r.caseKey}>{r.caseKey}</KeyText>,
          <TitleText key={r.title}>{r.title}</TitleText>,
          r.folder ?? <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
          r.cycleCount,
          r.lastExecuted ? formatDate(r.lastExecuted) : <span style={{ color: 'var(--ds-text-subtlest)' }}>Never</span>,
          r.isStale
            ? <Lozenge appearance="moved">Stale</Lozenge>
            : r.cycleCount >= 4
            ? <Lozenge appearance="success">High reuse</Lozenge>
            : <Lozenge appearance="default">Normal</Lozenge>,
        ])}
      />
    </Section>
  );
}

function DefectSummary({ data }: { data: ReportData }) {
  const rows = useMemo(() => computeDefectSummary(data), [data]);
  const chartData = rows.map(r => ({ name: r.severity, total: r.total }));

  return (
    <>
      <Section>
        <ChartWrap title="Defects by severity">
          <ReportBarChart
            data={chartData}
            xKey="name"
            series={[{ dataKey: 'total', name: 'Defects' }]}
            getBarColor={(_, i) => ADS_SERIES[i % ADS_SERIES.length]}
            showLegend={false}
          />
        </ChartWrap>
      </Section>
      <Section>
        <DataTable
          headers={[{ label: 'Severity' }, { label: 'Total', align: 'right' }, { label: 'By Status' }, { label: 'Avg Age', align: 'right' }]}
          rows={rows.map(r => [
            <Lozenge key={r.severity} appearance={STATUS_APPEARANCE[r.severity] ?? 'default'}>{r.severity}</Lozenge>,
            r.total,
            Object.entries(r.statuses).map(([s, c]) => `${s}: ${c}`).join(' · '),
            r.agingDays !== null ? `${r.agingDays}d` : '—',
          ])}
        />
      </Section>
    </>
  );
}

function DefectImpact({ data }: { data: ReportData }) {
  const rows = useMemo(() => computeDefectImpact(data), [data]);
  return (
    <Section>
      <DataTable
        headers={[
          { label: 'Key', width: '9%' },
          { label: 'Defect Title', width: '26%' },
          { label: 'Severity', width: '9%' },
          { label: 'Status', width: '9%' },
          { label: 'Impact', align: 'right', width: '7%' },
          { label: 'Age', align: 'right', width: '7%' },
          { label: 'Linked Cases', width: '13%' },
          { label: 'Parent Issue', width: '20%' },
        ]}
        rows={rows.map(r => [
          <KeyText key={r.defectKey}>{r.defectKey}</KeyText>,
          <TitleText key={r.title}>{r.title}</TitleText>,
          r.severity
            ? <Lozenge key="sev" appearance={STATUS_APPEARANCE[r.severity] ?? 'default'}>{r.severity}</Lozenge>
            : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
          r.status
            ? <Lozenge key="st" appearance={STATUS_APPEARANCE[r.status] ?? 'default'}>{r.status}</Lozenge>
            : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
          <strong key="score">{r.impactScore}</strong>,
          r.agingDays !== null ? `${r.agingDays}d` : '—',
          r.linkedCases.join(', ') || '—',
          r.parentKey ? (
            <span key="parent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <KeyText>{r.parentKey}</KeyText>
              {r.parentSummary && (
                <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.parentSummary}
                </span>
              )}
            </span>
          ) : (
            <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>
          ),
        ])}
      />
    </Section>
  );
}

function DefectTrend({ data }: { data: ReportData }) {
  const chartData = useMemo(() => computeDefectTrend(data), [data]);
  return (
    <>
      <Section>
        <ChartWrap title="Defects created per day">
          <ReportAreaChart
            data={chartData}
            xKey="date"
            series={[{ dataKey: 'count', name: 'Created', color: ADS_CHART.danger }]}
            xTickFormatter={formatDate}
            tooltipLabelFormatter={formatDate}
            showLegend={false}
          />
        </ChartWrap>
        <p style={{ margin: '8px 0 0', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', fontStyle: 'italic' }}>
          Created series only — no closure series is shown because no reliable closure date exists in the data.
        </p>
      </Section>
      <Section>
        <DataTable
          headers={[{ label: 'Date' }, { label: 'Created', align: 'right' }]}
          rows={chartData.map(d => [formatDate(d.date), d.count])}
        />
      </Section>
    </>
  );
}

function MultiCycleComparison({ data }: { data: ReportData }) {
  const rows = useMemo(() => computeMultiCycleComparison(data), [data]);
  const chartData = rows.map(r => ({ name: r.cycleName.split(' — ')[0], passRate: r.passRate }));

  return (
    <>
      <Section>
        <ChartWrap title="Pass rate trend across cycles">
          <ReportLineChart
            data={chartData}
            xKey="name"
            series={[{ dataKey: 'passRate', name: 'Pass rate' }]}
            yDomain={[0, 100]}
            yUnit="%"
            tooltipFormatter={(v) => [`${v}%`, 'Pass rate']}
            showLegend={false}
          />
        </ChartWrap>
      </Section>
      <Section>
        <DataTable
          headers={[
            { label: 'Cycle' },
            { label: 'Scope', align: 'right' },
            { label: 'Passed', align: 'right' },
            { label: 'Failed', align: 'right' },
            { label: 'Blocked', align: 'right' },
            { label: 'Pass Rate', align: 'right', width: '18%' },
            { label: 'vs Prev', align: 'right', width: '10%' },
          ]}
          rows={rows.map((r, i) => [
            r.cycleName,
            r.scopeTotal,
            r.passed,
            r.failed,
            r.blocked,
            <PassRateBar key={r.cycleName} rate={r.passRate} />,
            <span key={i} style={{ fontSize: 'var(--ds-font-size-200)', color: r.delta !== null && r.delta >= 0 ? 'var(--ds-text-success)' : 'var(--ds-text-danger)' }}>
              {cycleDeltaStr(r.passRate, r.delta !== null ? r.passRate - r.delta : null)}
            </span>,
          ])}
        />
      </Section>
    </>
  );
}

function MultiCycleSummary({ data }: { data: ReportData }) {
  const rows = useMemo(() => computeMultiCycleComparison(data), [data]);
  return (
    <Section>
      <DataTable
        headers={[
          { label: 'Cycle' },
          { label: 'Status', width: '12%' },
          { label: 'Scope', align: 'right' },
          { label: 'Passed', align: 'right' },
          { label: 'Pass Rate', align: 'right', width: '22%' },
        ]}
        rows={data.cycles.map((cy, i) => {
          const r = rows[i];
          return [
            cy.name,
            cy.status
              ? <Lozenge key="st" appearance={STATUS_APPEARANCE[cy.status] ?? 'default'}>{cy.status}</Lozenge>
              : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
            r.scopeTotal,
            r.passed,
            <PassRateBar key={cy.id} rate={r.passRate} />,
          ];
        })}
      />
    </Section>
  );
}

function MultiCycleDetail({ data }: { data: ReportData }) {
  const { cycles, rows } = useMemo(() => computeMultiCycleDetail(data), [data]);
  if (rows.length === 0) return <ReportEmptyState />;

  return (
    <Section>
      <DataTable
        headers={[
          { label: 'Case', width: '8%' },
          { label: 'Title', width: '32%' },
          { label: 'Folder', width: '10%' },
          ...cycles.map(cy => ({
            label: cy.name.split(' — ')[0],
            align: 'center' as const,
            width: `${40 / cycles.length}%`,
          })),
        ]}
        rows={rows.map(row => [
          <KeyText key={row.caseKey}>{row.caseKey}</KeyText>,
          <TitleText key={row.title}>{row.title}</TitleText>,
          <span key="folder" style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>{row.folder ?? '—'}</span>,
          ...cycles.map(cy => {
            const st = row.statuses[cy.id] ?? null;
            return st ? (
              <Lozenge key={cy.id} appearance={STATUS_APPEARANCE[st] ?? 'default'}>{st.replace(/_/g, ' ')}</Lozenge>
            ) : (
              <span key={cy.id} style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-200)' }}>—</span>
            );
          }),
        ])}
      />
    </Section>
  );
}

function MultiCycleDistribution({ data }: { data: ReportData }) {
  const { rows } = useMemo(() => computeMultiCycleDistribution(data), [data]);

  const chartData = data.cycles.map((cy, ci) => {
    const obj: Record<string, number | string> = { name: cy.name.split(' — ')[0] };
    rows.forEach(r => { obj[r.status] = r.counts[ci]; });
    return obj;
  });

  return (
    <>
      <Section>
        <ChartWrap title="Status distribution by cycle">
          <ReportBarChart
            data={chartData}
            xKey="name"
            series={[
              { dataKey: 'passed', name: 'Passed', color: ADS_CHART.success, stackId: 'a' },
              { dataKey: 'failed', name: 'Failed', color: ADS_CHART.danger, stackId: 'a' },
              { dataKey: 'blocked', name: 'Blocked', color: ADS_CHART.warning, stackId: 'a' },
              { dataKey: 'in_progress', name: 'In Progress', color: ADS_CHART.information, stackId: 'a' },
              { dataKey: 'not_run', name: 'Not Run', color: ADS_CHART.neutral, stackId: 'a' },
            ]}
          />
        </ChartWrap>
      </Section>
      <Section>
        <DataTable
          headers={[
            { label: 'Status' },
            ...data.cycles.map(cy => ({ label: cy.name.split(' — ')[0], align: 'right' as const })),
          ]}
          rows={rows.map(r => [
            <Lozenge key={r.status} appearance={STATUS_APPEARANCE[r.status] ?? 'default'}>{r.status.replace(/_/g, ' ')}</Lozenge>,
            ...r.counts,
          ])}
        />
      </Section>
    </>
  );
}

function TraceabilitySummary({ data }: { data: ReportData }) {
  const rows = useMemo(() => computeTraceabilitySummary(data), [data]);
  const totalCases = data.cases.length;
  const linkedCases = data.cases.filter(c => c.linkedIssueKeys.length > 0).length;

  return (
    <>
      <Section>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '8px 0' }}>
          <div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Coverage</div>
            <div style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 700, color: 'var(--ds-text)' }}>{coveragePercent(linkedCases, totalCases)}</div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>{linkedCases} of {totalCases} cases linked to requirements</div>
          </div>
          <div style={{ flex: 1, maxWidth: 400 }}>
            <ChartWrap title="Pass rate per requirement">
              <ReportBarChart
                data={rows.map(r => ({ name: r.issueKey, passRate: r.passRate }))}
                xKey="name"
                series={[{ dataKey: 'passRate', name: 'Pass rate' }]}
                yDomain={[0, 100]}
                yUnit="%"
                tooltipFormatter={(v) => [`${v}%`, 'Pass rate']}
                showLegend={false}
                height={200}
              />
            </ChartWrap>
          </div>
        </div>
      </Section>
      <Section>
        <DataTable
          headers={[
            { label: 'Issue Key', width: '12%' },
            { label: 'Requirement', width: '36%' },
            { label: 'Cases', align: 'right', width: '10%' },
            { label: 'Coverage', align: 'right', width: '12%' },
            { label: 'Pass Rate', align: 'right', width: '18%' },
          ]}
          rows={rows.map(r => [
            <KeyText key={r.issueKey}>{r.issueKey}</KeyText>,
            r.summary
              ? <TitleText key="s">{r.summary}</TitleText>
              : <span key="s" style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
            r.caseCount,
            `${r.coveragePct}%`,
            <PassRateBar key={r.issueKey} rate={r.passRate} />,
          ])}
        />
      </Section>
    </>
  );
}

function TraceabilityDetail({ data }: { data: ReportData }) {
  const rows = useMemo(() => computeTraceabilityDetail(data), [data]);
  return (
    <Section>
      <DataTable
        headers={[
          { label: 'Issue', width: '10%' },
          { label: 'Requirement', width: '20%' },
          { label: 'Case Key', width: '9%' },
          { label: 'Case Title', width: '25%' },
          { label: 'Owner', width: '11%' },
          { label: 'Last Run', width: '9%', align: 'center' },
          { label: 'Defects', align: 'right', width: '8%' },
          { label: 'Links', align: 'right', width: '8%' },
        ]}
        rows={rows.map(r => [
          <KeyText key={r.issueKey}>{r.issueKey}</KeyText>,
          r.issueSummary
            ? <span key="rs" style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>{r.issueSummary}</span>
            : <span key="rs" style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
          <KeyText key={r.caseKey} color="var(--ds-text)">{r.caseKey}</KeyText>,
          <TitleText key={r.caseTitle}>{r.caseTitle}</TitleText>,
          r.owner ?? <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
          r.lastRunStatus
            ? <Lozenge key="lr" appearance={STATUS_APPEARANCE[r.lastRunStatus] ?? 'default'}>{r.lastRunStatus.replace(/_/g, ' ')}</Lozenge>
            : <span key="lr" style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
          r.defectCount > 0
            ? <Lozenge key="d" appearance="removed">{r.defectCount}</Lozenge>
            : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
          r.relatedLinks > 0
            ? r.relatedLinks
            : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
        ])}
      />
    </Section>
  );
}

// ── router ─────────────────────────────────────────────────────────────────────

interface Props {
  slug: string;
  data: ReportData;
  filters: FilterState;
}

export default function ReportCanvas({ slug, data, filters }: Props) {
  const def = REPORT_DEFS.find(d => d.slug === slug);
  if (!def) return <ReportEmptyState message="Unknown report" hint="Select a report from the navigator." />;

  const renderers: Record<string, React.ComponentType<{ data: ReportData }>> = {
    'execution-overview': ExecutionOverview,
    'execution-summary': ExecutionSummary,
    'execution-burndown': ExecutionBurndown,
    'execution-burnup': ExecutionBurnup,
    'execution-distribution': ExecutionDistribution,
    'execution-history': ExecutionHistory,
    'case-distribution': CaseDistribution,
    'case-usage': CaseUsage,
    'defect-summary': DefectSummary,
    'defect-impact': DefectImpact,
    'defect-trend': DefectTrend,
    'multi-cycle-comparison': MultiCycleComparison,
    'multi-cycle-summary': MultiCycleSummary,
    'multi-cycle-detail': MultiCycleDetail,
    'multi-cycle-distribution': MultiCycleDistribution,
    'traceability-summary': TraceabilitySummary,
    'traceability-detail': TraceabilityDetail,
  };

  const Renderer = renderers[slug];
  if (!Renderer) return <ReportEmptyState message="Renderer not implemented" hint={`${def.label} renderer coming in next slice.`} />;

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {def.gapNote && (
        <div
          style={{
            background: 'var(--ds-background-warning)',
            borderBottom: '1px solid var(--ds-border-warning, var(--ds-border))',
            padding: '8px 20px',
            fontSize: 'var(--ds-font-size-200)',
            color: 'var(--ds-text-warning)',
          }}
        >
          ⚠ {def.gapNote}
        </div>
      )}
      <Renderer data={data} />
    </div>
  );
}
