import React, { useMemo } from 'react';
import Lozenge from '@atlaskit/lozenge';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { REPORT_DEFS } from './reportDefinitions';
import ReportEmptyState from './ReportEmptyState';
import { passRateStr, sharePercent, cycleDeltaStr, coveragePercent } from './reportCalculations';
import {
  SeededData,
  computeExecutionOverview, computeExecutionSummary,
  computeBurndown, computeBurnup, computeDistribution, computeExecutionHistory,
  computeCaseDistribution, computeCaseUsage,
  computeDefectSummary, computeDefectImpact, computeDefectTrend,
  computeMultiCycleComparison, computeMultiCycleDetail,
  computeProjectMetrics, computeTraceabilitySummary, computeTraceabilityDetail,
} from './useSeededTestReportData';
import { FilterState } from './ReportFilterBar';

// ── tokens ─────────────────────────────────────────────────────────────────────

const C = {
  passed: 'var(--ds-text-success)',
  failed: 'var(--ds-text-danger)',
  blocked: 'var(--ds-text-warning)',
  not_run: 'var(--ds-text-subtlest)',
  skipped: 'var(--ds-text-subtlest)',
  brand: 'var(--ds-background-brand-bold)',
  info: 'var(--ds-text-information)',
};

// recharts SVG fill/stroke cannot accept CSS variables — SVG engine resolves
// attributes before the cascade. All hex values below are the canonical
// Atlassian brand palette. ads-scanner:ignore-next-line
// prettier-ignore
const P = { blue:'#0052CC', green:'#36B37E', red:'#FF5630', yellow:'#FFAB00', purple:'#6554C0', teal:'#00B8D9', grey:'#97A0AF', greenFill:'#E3FCEF', blueFill:'#E9F2FE', redFill:'#FFEBE6' }; // ads-scanner:ignore-line
const CHART_COLORS = [P.blue, P.green, P.red, P.yellow, P.purple, P.teal];

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
  closed: 'default',
  active: 'inprogress',
  completed: 'success',
  critical: 'removed',
  major: 'moved',
  minor: 'new',
  trivial: 'default',
};

// ── shared primitives ──────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: '9px 14px',
  fontSize: 'var(--ds-font-size-100)',
  fontWeight: 700,
  color: 'var(--ds-text-subtlest)',
  textAlign: 'left',
  borderBottom: '2px solid var(--ds-border)',
  whiteSpace: 'nowrap',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  background: 'var(--ds-surface-sunken)',
  position: 'sticky',
  top: 0,
};

const TD: React.CSSProperties = {
  padding: '9px 14px',
  fontSize: 'var(--ds-font-size-300)',
  color: 'var(--ds-text)',
  borderBottom: '1px solid var(--ds-border)',
  verticalAlign: 'middle',
};

const TD_R: React.CSSProperties = { ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const TD_C: React.CSSProperties = { ...TD, textAlign: 'center' };

function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: { label: string; align?: 'left' | 'right' | 'center'; width?: string }[];
  rows: React.ReactNode[][];
  empty?: string;
}) {
  if (rows.length === 0) return <ReportEmptyState message={empty} />;
  return (
    <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ ...TH, textAlign: h.align ?? 'left', width: h.width }}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'var(--ds-background-neutral-subtle)')}
              onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = '')}
            >
              {row.map((cell, ci) => {
                const align = headers[ci]?.align ?? 'left';
                const style = align === 'right' ? TD_R : align === 'center' ? TD_C : TD;
                return <td key={ci} style={style}>{cell}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartWrap({ title, children, height = 260 }: { title?: string; children: React.ReactNode; height?: number }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {title && (
        <p style={{ margin: '0 0 10px', fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text-subtle)' }}>
          {title}
        </p>
      )}
      <div style={{ height }} role="img" aria-label={title ?? 'Report chart'}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--ds-border)' }}>{children}</div>;
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

// ── report renderers ───────────────────────────────────────────────────────────

function ExecutionOverview({ data }: { data: SeededData }) {
  const { byStatus, total, passed } = useMemo(() => computeExecutionOverview(data), [data]);
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
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>
              {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <RechartTooltip />
          </PieChart>
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

function ExecutionSummary({ data }: { data: SeededData }) {
  const rows = useMemo(() => computeExecutionSummary(data), [data]);
  const chartData = rows.map(r => ({ name: r.cycleName.split(' — ')[0], passed: r.passed, failed: r.failed, blocked: r.blocked }));

  return (
    <>
      <Section>
        <ChartWrap title="Pass / Fail / Blocked per cycle">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <YAxis tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <RechartTooltip />
            <Legend />
            <Bar dataKey="passed" stackId="a" fill={P.green} name="Passed" />
            <Bar dataKey="failed" stackId="a" fill={P.red} name="Failed" />
            <Bar dataKey="blocked" stackId="a" fill={P.yellow} name="Blocked" />
          </BarChart>
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

function ExecutionBurndown({ data }: { data: SeededData }) {
  const chartData = useMemo(() => computeBurndown(data), [data]);
  return (
    <>
      <Section>
        <ChartWrap title="Remaining vs Ideal (Sprint 16 — Release Candidate)">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <YAxis tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <RechartTooltip labelFormatter={formatDate} />
            <Legend />
            <Line type="monotone" dataKey="ideal" stroke={P.blue} strokeDasharray="6 3" name="Ideal remaining" dot={false} />
            <Area type="monotone" dataKey="remaining" fill={P.blueFill} stroke={P.blue} name="Actual remaining" />
          </ComposedChart>
        </ChartWrap>
      </Section>
      <Section>
        <DataTable
          headers={[{ label: 'Date' }, { label: 'Executed', align: 'right' }, { label: 'Remaining', align: 'right' }, { label: 'Ideal', align: 'right' }]}
          rows={chartData.map(d => [formatDate(d.date), d.executed, d.remaining, d.ideal])}
        />
      </Section>
    </>
  );
}

function ExecutionBurnup({ data }: { data: SeededData }) {
  const chartData = useMemo(() => computeBurnup(data), [data]);
  return (
    <>
      <Section>
        <ChartWrap title="Cumulative executed and passed over time">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <YAxis tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <RechartTooltip labelFormatter={formatDate} />
            <Legend />
            <Line type="monotone" dataKey="scope" stroke="var(--ds-border-bold)" strokeDasharray="6 3" name="Total scope" dot={false} />
            <Area type="monotone" dataKey="cumTotal" fill={P.blueFill} stroke={P.blue} name="Cumulative executed" />
            <Area type="monotone" dataKey="cumPassed" fill={P.greenFill} stroke={P.green} name="Cumulative passed" />
          </ComposedChart>
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

function ExecutionDistribution({ data }: { data: SeededData }) {
  const dist = useMemo(() => computeDistribution(data), [data]);
  return (
    <>
      <Section>
        <ChartWrap title="Run count by status">
          <BarChart data={dist} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
            <XAxis type="number" tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <YAxis dataKey="status" type="category" tick={{ fontSize: 'var(--ds-font-size-100)' }} width={80} />
            <RechartTooltip />
            <Bar dataKey="count" name="Runs">
              {dist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
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

function ExecutionHistory({ data }: { data: SeededData }) {
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
          <code key={r.caseKey} style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-brand)' }}>{r.caseKey}</code>,
          r.caseTitle,
          r.executor,
          <span key={r.cycleName} style={{ fontSize: 'var(--ds-font-size-200)' }}>{r.cycleName}</span>,
          <Lozenge key={r.status} appearance={STATUS_APPEARANCE[r.status] ?? 'default'}>{r.status.replace(/_/g, ' ')}</Lozenge>,
        ])}
      />
    </Section>
  );
}

function CaseDistribution({ data }: { data: SeededData }) {
  const { byStatus, byPriority, byType, total } = useMemo(() => computeCaseDistribution(data), [data]);
  const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(byPriority).map(([name, value]) => ({ name, value }));

  return (
    <>
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <ChartWrap title="By status">
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>
                {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <RechartTooltip />
            </PieChart>
          </ChartWrap>
          <ChartWrap title="By priority">
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 'var(--ds-font-size-100)' }} />
              <YAxis tick={{ fontSize: 'var(--ds-font-size-100)' }} />
              <RechartTooltip />
              <Bar dataKey="value" name="Cases">
                {priorityData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
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

function CaseUsage({ data }: { data: SeededData }) {
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
          <code key={r.caseKey} style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-brand)' }}>{r.caseKey}</code>,
          r.title,
          r.folder,
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

function DefectSummary({ data }: { data: SeededData }) {
  const rows = useMemo(() => computeDefectSummary(data), [data]);
  const chartData = rows.map(r => ({ name: r.severity, total: r.total }));

  return (
    <>
      <Section>
        <ChartWrap title="Defects by severity">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <YAxis tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <RechartTooltip />
            <Bar dataKey="total" name="Defects">
              {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ChartWrap>
      </Section>
      <Section>
        <DataTable
          headers={[{ label: 'Severity' }, { label: 'Total', align: 'right' }, { label: 'By Status' }, { label: 'Avg Age', align: 'right' }]}
          rows={rows.map(r => [
            <Lozenge key={r.severity} appearance={STATUS_APPEARANCE[r.severity] ?? 'default'}>{r.severity}</Lozenge>,
            r.total,
            Object.entries(r.statuses).map(([s, c]) => `${s}: ${c}`).join(' · '),
            `${r.agingDays}d`,
          ])}
        />
      </Section>
    </>
  );
}

function DefectImpact({ data }: { data: SeededData }) {
  const rows = useMemo(() => computeDefectImpact(data), [data]);
  return (
    <Section>
      <DataTable
        headers={[
          { label: 'Key', width: '10%' },
          { label: 'Defect Title', width: '35%' },
          { label: 'Severity', width: '10%' },
          { label: 'Status', width: '10%' },
          { label: 'Impact', align: 'right', width: '8%' },
          { label: 'Age', align: 'right', width: '8%' },
          { label: 'Linked Cases', width: '19%' },
        ]}
        rows={rows.map(r => [
          <code key={r.defectKey} style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-brand)' }}>{r.defectKey}</code>,
          r.title,
          <Lozenge key={r.severity} appearance={STATUS_APPEARANCE[r.severity] ?? 'default'}>{r.severity}</Lozenge>,
          <Lozenge key={r.status} appearance={STATUS_APPEARANCE[r.status] ?? 'default'}>{r.status}</Lozenge>,
          <strong key="score">{r.impactScore}</strong>,
          `${r.agingDays}d`,
          r.linkedCases.join(', ') || '—',
        ])}
      />
    </Section>
  );
}

function DefectTrend({ data }: { data: SeededData }) {
  const chartData = useMemo(() => computeDefectTrend(data), [data]);
  return (
    <>
      <Section>
        <ChartWrap title="Defects created per day">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <YAxis tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <RechartTooltip labelFormatter={formatDate} />
            <Area type="monotone" dataKey="count" fill={P.redFill} stroke={P.red} name="Created" />
          </AreaChart>
        </ChartWrap>
        <p style={{ margin: '8px 0 0', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', fontStyle: 'italic' }}>
          Closure trend available after resolved_at field confirmation (Phase 8).
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

function MultiCycleComparison({ data }: { data: SeededData }) {
  const rows = useMemo(() => computeMultiCycleComparison(data), [data]);
  const chartData = rows.map(r => ({ name: r.cycleName.split(' — ')[0], passRate: r.passRate }));

  return (
    <>
      <Section>
        <ChartWrap title="Pass rate trend across cycles">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 'var(--ds-font-size-100)' }} unit="%" />
            <RechartTooltip formatter={(v) => [`${v}%`, 'Pass rate']} />
            <Line type="monotone" dataKey="passRate" stroke={P.blue} strokeWidth={2} dot={{ r: 4 }} name="Pass rate" />
          </LineChart>
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

function MultiCycleSummary({ data }: { data: SeededData }) {
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
            <Lozenge key={cy.status} appearance={STATUS_APPEARANCE[cy.status] ?? 'default'}>{cy.status}</Lozenge>,
            r.scopeTotal,
            r.passed,
            <PassRateBar key={cy.id} rate={r.passRate} />,
          ];
        })}
      />
    </Section>
  );
}

function MultiCycleDetail({ data }: { data: SeededData }) {
  const { cycles, rows } = useMemo(() => computeMultiCycleDetail(data), [data]);
  if (rows.length === 0) return <ReportEmptyState />;

  return (
    <Section>
      <div style={{ overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: '8%' }}>Case</th>
              <th style={{ ...TH, width: '32%' }}>Title</th>
              <th style={{ ...TH, width: '10%' }}>Folder</th>
              {cycles.map(cy => (
                <th key={cy.id} style={{ ...TH, textAlign: 'center', width: `${40 / cycles.length}%` }}>
                  {cy.name.split(' — ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.caseKey}
                onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'var(--ds-background-neutral-subtle)')}
                onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = '')}
              >
                <td style={{ ...TD, fontSize: 'var(--ds-font-size-200)' }}>
                  <code style={{ color: 'var(--ds-text-brand)' }}>{row.caseKey}</code>
                </td>
                <td style={TD}>{row.title}</td>
                <td style={{ ...TD, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>{row.folder}</td>
                {cycles.map(cy => {
                  const st = row.statuses[cy.id] ?? null;
                  return (
                    <td key={cy.id} style={{ ...TD_C }}>
                      {st ? (
                        <Lozenge appearance={STATUS_APPEARANCE[st] ?? 'default'}>{st.replace(/_/g, ' ')}</Lozenge>
                      ) : (
                        <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-200)' }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function MultiCycleDistribution({ data }: { data: SeededData }) {
  const statusGroups = ['passed', 'failed', 'blocked', 'not_run', 'skipped'];
  const rows = statusGroups.map(st => {
    const cycleCounts = data.cycles.map(cy => {
      const cycleRuns = data.runs.filter(r => r.cycleId === cy.id);
      return cycleRuns.filter(r => r.status === st).length;
    });
    return { status: st, counts: cycleCounts };
  }).filter(r => r.counts.some(c => c > 0));

  const chartData = data.cycles.map((cy, ci) => {
    const obj: Record<string, number | string> = { name: cy.name.split(' — ')[0] };
    rows.forEach(r => { obj[r.status] = r.counts[ci]; });
    return obj;
  });

  return (
    <>
      <Section>
        <ChartWrap title="Status distribution by cycle">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <YAxis tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <RechartTooltip />
            <Legend />
            <Bar dataKey="passed" stackId="a" fill={P.green} name="Passed" />
            <Bar dataKey="failed" stackId="a" fill={P.red} name="Failed" />
            <Bar dataKey="blocked" stackId="a" fill={P.yellow} name="Blocked" />
            <Bar dataKey="not_run" stackId="a" fill={P.grey} name="Not Run" />
          </BarChart>
        </ChartWrap>
      </Section>
      <Section>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Status</th>
                {data.cycles.map(cy => <th key={cy.id} style={{ ...TH, textAlign: 'right' }}>{cy.name.split(' — ')[0]}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.status}>
                  <td style={TD}>
                    <Lozenge appearance={STATUS_APPEARANCE[r.status] ?? 'default'}>{r.status.replace(/_/g, ' ')}</Lozenge>
                  </td>
                  {r.counts.map((c, i) => <td key={i} style={TD_R}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function ProjectOverview({ data }: { data: SeededData }) {
  const totalRuns = data.runs.length;
  const passed = data.runs.filter(r => r.status === 'passed').length;
  const failed = data.runs.filter(r => r.status === 'failed').length;
  const blocked = data.runs.filter(r => r.status === 'blocked').length;
  const activeCycles = data.cycles.filter(c => c.status === 'active').length;
  const linkedCases = data.cases.filter(c => c.linkedFeature !== null).length;

  const metrics = [
    { label: 'Total Test Cases', value: data.cases.length },
    { label: 'Active Cycles', value: activeCycles },
    { label: 'Total Cycles', value: data.cycles.length },
    { label: 'Total Runs', value: totalRuns },
    { label: 'Passed', value: passed },
    { label: 'Failed', value: failed },
    { label: 'Blocked', value: blocked },
    { label: 'Pass Rate', value: `${Math.round((passed / totalRuns) * 100)}%` },
    { label: 'Coverage', value: `${Math.round((linkedCases / data.cases.length) * 100)}%` },
    { label: 'Open Defects', value: data.defects.filter(d => d.status === 'open').length },
  ];

  return (
    <Section>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background: 'var(--ds-surface-raised)', border: '1px solid var(--ds-border)', borderRadius: 6, padding: '14px 16px' }}>
            <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 700, color: 'var(--ds-text)', fontVariantNumeric: 'tabular-nums' }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ProjectMetrics({ data }: { data: SeededData }) {
  const metrics = useMemo(() => computeProjectMetrics(data), [data]);
  const trendData = data.cycles.map((cy, i) => {
    const runs = data.runs.filter(r => r.cycleId === cy.id);
    const passed = runs.filter(r => r.status === 'passed').length;
    return { name: cy.name.split(' — ')[0], passRate: Math.round((passed / Math.max(1, runs.length)) * 100) };
  });

  return (
    <>
      <Section>
        <ChartWrap title="Pass rate trend by cycle">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 'var(--ds-font-size-100)' }} />
            <RechartTooltip formatter={(v) => [`${v}%`, 'Pass rate']} />
            <Line type="monotone" dataKey="passRate" stroke={P.green} strokeWidth={2} dot={{ r: 5 }} name="Pass rate" />
          </LineChart>
        </ChartWrap>
      </Section>
      <Section>
        <DataTable
          headers={[{ label: 'Metric', width: '60%' }, { label: 'Value', align: 'right', width: '40%' }]}
          rows={metrics.map(m => [m.metric, <strong key={m.metric} style={{ fontSize: 'var(--ds-font-size-400)' }}>{m.value}</strong>])}
        />
      </Section>
    </>
  );
}

function ProjectActivity({ data }: { data: SeededData }) {
  const rows = data.runs
    .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
    .slice(0, 80)
    .map(r => {
      const tc = data.cases.find(c => c.id === r.caseId);
      const cy = data.cycles.find(c => c.id === r.cycleId);
      return { date: r.executedAt, action: `Run ${r.status}`, user: r.executedBy, entity: tc?.caseKey ?? '—', cycle: cy?.name ?? '—' };
    });

  return (
    <Section>
      <DataTable
        headers={[
          { label: 'Date', width: '12%' },
          { label: 'Action', width: '14%' },
          { label: 'User', width: '16%' },
          { label: 'Entity', width: '10%' },
          { label: 'Cycle', width: '48%' },
        ]}
        rows={rows.map(r => [
          <span key={r.date} style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>{formatDate(r.date)}</span>,
          <Lozenge key={r.action} appearance={STATUS_APPEARANCE[r.action.split(' ')[1]] ?? 'default'}>{r.action}</Lozenge>,
          r.user,
          <code key={r.entity} style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-brand)' }}>{r.entity}</code>,
          <span key={r.cycle} style={{ fontSize: 'var(--ds-font-size-200)' }}>{r.cycle}</span>,
        ])}
      />
    </Section>
  );
}

function TraceabilitySummary({ data }: { data: SeededData }) {
  const rows = useMemo(() => computeTraceabilitySummary(data), [data]);
  const totalCases = data.cases.length;
  const linkedCases = data.cases.filter(c => c.linkedFeature !== null).length;

  return (
    <>
      <Section>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '8px 0' }}>
          <div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Coverage</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ds-text)' }}>{coveragePercent(linkedCases, totalCases)}</div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>{linkedCases} of {totalCases} cases linked to requirements</div>
          </div>
          <div style={{ flex: 1, maxWidth: 400 }}>
            <ChartWrap title="Pass rate per requirement" height={200}>
              <BarChart data={rows.map(r => ({ name: r.issueKey, passRate: r.passRate }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 'var(--ds-font-size-100)' }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 'var(--ds-font-size-100)' }} />
                <RechartTooltip formatter={(v) => [`${v}%`, 'Pass rate']} />
                <Bar dataKey="passRate" fill={P.blue} name="Pass rate" />
              </BarChart>
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
            <code key={r.issueKey} style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-brand)' }}>{r.issueKey}</code>,
            r.summary,
            r.caseCount,
            `${r.coveragePct}%`,
            <PassRateBar key={r.issueKey} rate={r.passRate} />,
          ])}
        />
      </Section>
    </>
  );
}

function TraceabilityDetail({ data }: { data: SeededData }) {
  const rows = useMemo(() => computeTraceabilityDetail(data), [data]);
  return (
    <Section>
      <DataTable
        headers={[
          { label: 'Issue', width: '10%' },
          { label: 'Requirement', width: '22%' },
          { label: 'Case Key', width: '9%' },
          { label: 'Case Title', width: '28%' },
          { label: 'Owner', width: '12%' },
          { label: 'Last Run', width: '10%', align: 'center' },
          { label: 'Defects', align: 'right', width: '9%' },
        ]}
        rows={rows.map(r => [
          <code key={r.issueKey} style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-brand)' }}>{r.issueKey}</code>,
          <span key={r.issueSummary} style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>{r.issueSummary}</span>,
          <code key={r.caseKey} style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)' }}>{r.caseKey}</code>,
          r.caseTitle,
          r.owner,
          <Lozenge key={r.lastRunStatus} appearance={STATUS_APPEARANCE[r.lastRunStatus] ?? 'default'}>{r.lastRunStatus.replace(/_/g, ' ')}</Lozenge>,
          r.defectCount > 0
            ? <Lozenge key="d" appearance="removed">{r.defectCount}</Lozenge>
            : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
        ])}
      />
    </Section>
  );
}

// ── router ─────────────────────────────────────────────────────────────────────

interface Props {
  slug: string;
  data: SeededData;
  filters: FilterState;
}

export default function ReportCanvas({ slug, data, filters }: Props) {
  const def = REPORT_DEFS.find(d => d.slug === slug);
  if (!def) return <ReportEmptyState message="Unknown report" hint="Select a report from the navigator." />;

  const renderers: Record<string, React.ComponentType<{ data: SeededData }>> = {
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
    'project-overview': ProjectOverview,
    'project-metrics': ProjectMetrics,
    'project-activity': ProjectActivity,
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
