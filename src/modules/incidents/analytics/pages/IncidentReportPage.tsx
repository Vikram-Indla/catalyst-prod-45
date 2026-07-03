/**
 * IncidentReportPage — Production Incident report at /incident-hub/reports.
 * Feature: CAT-REPORTS-HUB-20260703-001, Phase 2 Lane C (CRE Grid A:
 * Production Incident → INCIDENT module; incident half split out of the
 * TestHub defects-incidents report).
 *
 * Shell: CRE Grid E — L1 global hub page = CatalystListPageLayout with
 * chromeBand={<ProjectPageHeader hubType="incident" />} (E1 + E4, projectKey
 * omitted on global hubs).
 *
 * Data contract: ph_issues WHERE issue_type='Production Incident' (native
 * incidents table = 0 rows). Incident resolved date = MISSING → NO MTTR,
 * NO resolved-trend (zero-assumption law).
 */
import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import SectionMessage, { SectionMessageAction } from '@atlaskit/section-message';
import type { ThemeAppearance } from '@atlaskit/lozenge';
import { Heading } from '@/components/ads';
import { CatalystListPageLayout } from '@/components/shared/CatalystListPage';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { ReportBarChart } from '@/components/testhub/reports/charts/ReportChart';
import { CANONICAL_ROW_TYPOGRAPHY } from '@/lib/catalyst-rules/CatalystRules';
import { Routes } from '@/lib/routes';
import {
  useIncidentReport,
  useIncidentProjectOptions,
  type IncidentReportRow,
  type IncidentProjectOption,
} from '../hooks/useIncidentReport';

// Report metric-card styles — same ADS-token recipe as the TestHub report
// chassis (ReportStatusView), defined locally to keep the module boundary.
const cardStyle: CSSProperties = {
  background: 'var(--ds-surface-raised)', border: '1px solid var(--ds-border)',
  borderRadius: 'var(--ds-border-radius)', padding: 'var(--ds-space-200)', flex: '1 1 14rem',
};
const metricValue: CSSProperties = { fontSize: 'var(--ds-font-size-800)', fontWeight: 600, color: 'var(--ds-text)' };
// No textTransform: uppercase — typography enforcer requires sentence-case labels.
const metricLabel: CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', marginTop: 'var(--ds-space-050)' };
const sectionH: CSSProperties = { margin: 'var(--ds-space-100) 0' };
const subtle: CSSProperties = { color: 'var(--ds-text-subtlest)', fontWeight: 400 };

function catAppearance(c: string): ThemeAppearance {
  switch (c) {
    case 'Done': return 'success';
    case 'In Progress': return 'inprogress';
    default: return 'default';
  }
}

const ALL_PROJECTS: IncidentProjectOption = { value: '', label: 'All projects' };

export default function IncidentReportPage() {
  const navigate = useNavigate();
  const { data: projectOptions } = useIncidentProjectOptions();
  const [selected, setSelected] = useState<IncidentProjectOption>(ALL_PROJECTS);

  const report = useIncidentReport(selected.value || undefined);
  const { data, isPending, isError, error, refetch } = report;

  const cols: Column<IncidentReportRow>[] = [
    { id: 'issue_key', label: 'Key', width: 14, sortable: true, cell: ({ row }) => <span style={{ ...CANONICAL_ROW_TYPOGRAPHY.key, fontWeight: 600, color: 'var(--ds-text)' }}>{row.issue_key}</span> },
    { id: 'summary', label: 'Summary', flex: true, cell: ({ row }) => <span style={{ ...CANONICAL_ROW_TYPOGRAPHY.title, color: 'var(--ds-text)' }}>{row.summary}</span> },
    { id: 'status', label: 'Status', width: 20, cell: ({ row }) => <Lozenge appearance={catAppearance(row.status_category)}>{row.status || row.status_category}</Lozenge> },
    { id: 'priority', label: 'Priority', width: 14, cell: ({ row }) => <span style={{ color: 'var(--ds-text-subtle)' }}>{row.priority ?? '—'}</span> },
  ];

  // Incidents by priority — real counts only; no chart when there are none.
  const priorityBars = useMemo(() => {
    if (!data || data.total === 0) return [];
    return data.byPriority.map((p) => ({ priority: p.priority, count: p.count }));
  }, [data]);

  const selectOptions = useMemo(
    () => [ALL_PROJECTS, ...(projectOptions ?? [])],
    [projectOptions],
  );

  return (
    <CatalystListPageLayout chromeBand={<ProjectPageHeader hubType="incident" />}>
      <div style={{ padding: 'var(--ds-space-100) var(--ds-space-100) var(--ds-space-400)' }}>
        <div style={sectionH}>
          <Heading size="medium">Production incident report</Heading>
        </div>
        <p style={{ margin: '0 0 var(--ds-space-200)', color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-200)' }}>
          Open volume, priority mix and regression-test coverage of production incidents.{' '}
          <a href={Routes.testHub.report('defect-summary')} style={{ color: 'var(--ds-link)' }}>
            QA defect reports live in TestHub → Reports
          </a>
        </p>

        <div style={{ maxWidth: '20rem', marginBottom: 'var(--ds-space-250)' }}>
          <div style={metricLabel}>Project</div>
          <Select<IncidentProjectOption>
            inputId="incident-report-project"
            options={selectOptions}
            value={selected}
            onChange={(o) => setSelected((o as IncidentProjectOption) ?? ALL_PROJECTS)}
            isLoading={!projectOptions}
            spacing="default"
          />
        </div>

        {isError ? (
          <SectionMessage
            appearance="error"
            title="Couldn't load the incident report"
            actions={<SectionMessageAction onClick={() => refetch()}>Retry</SectionMessageAction>}
          >
            {error instanceof Error ? error.message : 'The report query failed.'}
          </SectionMessage>
        ) : isPending || !data ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-text-subtle)', padding: 24 }}>
            <Spinner size="medium" /> Loading incidents…
          </div>
        ) : data.total === 0 ? (
          <EmptyState
            header="No production incidents"
            description={selected.value
              ? 'No production incidents recorded for this project.'
              : 'No production incidents recorded.'}
          />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={cardStyle}>
                <div style={metricValue}>{data.total}</div>
                <div style={metricLabel}>Total incidents</div>
              </div>
              <div style={cardStyle}>
                <div style={{ ...metricValue, color: data.open ? 'var(--ds-text-warning)' : 'var(--ds-text)' }}>{data.open}</div>
                <div style={metricLabel}>Open incidents</div>
              </div>
              <div style={cardStyle}>
                <div style={{ ...metricValue, color: data.regressionGap ? 'var(--ds-text-warning)' : 'var(--ds-text)' }}>{data.regressionGap}</div>
                <div style={metricLabel}>Regression gaps</div>
              </div>
              <div style={cardStyle}>
                <div style={metricLabel}>By priority</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-050)', marginTop: 'var(--ds-space-050)' }}>
                  {data.byPriority.map((p) => (
                    <div key={p.priority} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--ds-font-size-200)' }}>
                      <span style={{ color: 'var(--ds-text-subtle)' }}>{p.priority}</span>
                      <span style={{ color: 'var(--ds-text)', fontWeight: 600 }}>{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {priorityBars.length > 0 && (
              <div style={{ marginBottom: 'var(--ds-space-300)' }}>
                <div style={sectionH}>
                  <Heading size="small">
                    Incidents by priority <span style={subtle}>— {data.total} total</span>
                  </Heading>
                </div>
                <ReportBarChart
                  data={priorityBars}
                  series={[{ dataKey: 'count', name: 'Incidents' }]}
                  xKey="priority"
                  showLegend={false}
                />
              </div>
            )}

            <div style={sectionH}><Heading size="small">Open incidents ({data.openIncidents.length})</Heading></div>
            <JiraTable<IncidentReportRow>
              columns={cols}
              data={data.openIncidents}
              getRowId={(r) => r.issue_key}
              onRowClick={(r) => navigate(`/browse/${r.issue_key}`)}
              isLoading={false}
              ariaLabel="Open production incidents"
              emptyView={<div style={{ padding: 'var(--ds-space-250)', color: 'var(--ds-text-subtle)' }}>No open incidents.</div>}
            />
          </>
        )}
      </div>
    </CatalystListPageLayout>
  );
}
