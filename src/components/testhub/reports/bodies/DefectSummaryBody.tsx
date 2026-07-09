/**
 * DefectSummaryBody — project-scoped hybrid defect report body (registry: defect-summary).
 * Feature: CAT-REPORTS-HUB-20260703-001 (Phase 2 Lane A port from DefectsIncidentsPage,
 * merge per disposition matrix #9).
 * Source: tm_defects (the only defect source — ph_issues carries no QA
 * Bug/Defect rows). Open = tm_defect_status 'open' only (D052).
 *
 * Phase 2 Lane C (CAT-REPORTS-HUB-20260703-001): the incident half (metric cards,
 * open-incidents table, regression gap) moved to /incident-hub/reports. This body
 * is defects-only; the registry label ("Defect Summary") is fixed separately.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import SectionMessage, { SectionMessageAction } from '@atlaskit/section-message';
import type { ThemeAppearance } from '@atlaskit/lozenge';
import { Heading } from '@/components/ads';
import { useReportPickerDefault, rememberReportPick, REPORTS_LAST_PROJECT_KEY } from '@/components/testhub/reports/useReportPickerDefault';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { supabase } from '@/integrations/supabase/client';
import { useDefectsIncidents, type IssueRow } from '@/components/testhub/reports/hooks/useDefectsIncidents';
import ReportExportMenu from '@/components/testhub/reports/ReportExportMenu';
import ReportInsightCard from '@/components/testhub/reports/ReportInsightCard';
import type { ExportColumn, ExportRow } from '@/components/testhub/reports/reportExportRows';
import { ReportBarChart } from '@/components/testhub/reports/charts/ReportChart';
import { ADS_CHART } from '@/lib/charts/adsChartTheme';
import { Routes } from '@/lib/routes';
import { cardStyle, metricValue, metricLabel, sectionH, subtle } from '@/pages/testhub/reports/ReportStatusView';

interface ProjectOption { label: string; value: string }

function useTmProjects() {
  return useQuery({
    queryKey: ['tm-projects-list'],
    queryFn: async (): Promise<ProjectOption[]> => {
      const { data } = await supabase.from('tm_projects').select('id, name').order('name', { ascending: true });
      // DEF-007: dedupe stale duplicate project rows sharing a name.
      const seenNames = new Set<string>();
      return (data ?? [])
        .filter((p: { id: string; name: string }) => !seenNames.has(p.name) && seenNames.add(p.name))
        .map((p: { id: string; name: string }) => ({ label: p.name, value: p.id }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

function catAppearance(c: string): ThemeAppearance {
  switch (c) {
    case 'Done': return 'success';
    case 'In Progress': return 'inprogress';
    case 'To Do': return 'new';
    default: return 'default';
  }
}

export function DefectSummaryBody() {
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useTmProjects();
  const [selected, setSelected] = useState<ProjectOption | null>(null);

  // S1.5: single project → auto-select; else last-used (validated) or none.
  const activeOption = useReportPickerDefault(REPORTS_LAST_PROJECT_KEY, projects, selected);

  const { data, isLoading } = useDefectsIncidents(activeOption?.label, activeOption?.value);

  const cols: Column<IssueRow>[] = [
    { id: 'issue_key', label: 'Key', width: 14, sortable: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: 'var(--ds-text)' }}>{row.issue_key}</span> },
    { id: 'summary', label: 'Summary', flex: true, cell: ({ row }) => <span style={{ color: 'var(--ds-text)' }}>{row.summary}</span> },
    { id: 'status', label: 'Status', width: 20, cell: ({ row }) => <Lozenge appearance={catAppearance(row.status_category)}>{row.status || row.status_category}</Lozenge> },
  ];

  const insight = useMemo(() => {
    if (!data) return null;
    const parts = [
      `${data.defectsOpen} open, ${data.defectsInProgress} in progress, ` +
        `${data.defectsResolved} resolved, ${data.defectsClosed} closed ` +
        `of ${data.defectsTotal} total.`,
    ];
    return parts.join(' ');
  }, [data]);

  // Task B export: open-defects table (the report's primary table).
  const exportColumns: ExportColumn[] = [
    { key: 'issue_key', header: 'Key' },
    { key: 'summary', header: 'Summary' },
    { key: 'status', header: 'Status' },
    { key: 'status_category', header: 'Status category' },
  ];
  const exportRows = useMemo<ExportRow[]>(
    () => (data ? data.openDefects.map((d) => ({ ...d })) : []),
    [data],
  );

  // Task A insight: counts-only aggregates for the Caty narrative.
  const aggregates = useMemo<Record<string, unknown> | null>(() => {
    if (!data) return null;
    return {
      report_id: 'defect-summary',
      defects_total: data.defectsTotal,
      defects_open: data.defectsOpen,
      defects_in_progress: data.defectsInProgress,
      defects_resolved: data.defectsResolved,
      defects_closed: data.defectsClosed,
      open_defects_listed: data.openDefects.length,
    };
  }, [data]);

  // Defects-by-status — one bar per tm_defect_status bucket (open, in
  // progress, resolved, closed). Open counts ONLY status='open' — closed and
  // resolved are their own terminal bars, never folded into open (D052).
  // Zero-assumption law: no defects at all → no chart rendered.
  const defectBars = useMemo(() => {
    if (!data || data.defectsTotal === 0) return [];
    return [
      { status: `Open (${data.defectsOpen})`, key: 'open', count: data.defectsOpen },
      { status: `In progress (${data.defectsInProgress})`, key: 'in_progress', count: data.defectsInProgress },
      { status: `Resolved (${data.defectsResolved})`, key: 'resolved', count: data.defectsResolved },
      { status: `Closed (${data.defectsClosed})`, key: 'closed', count: data.defectsClosed },
    ].filter((b) => b.count > 0);
  }, [data]);

  const barColor = (key: string): string => {
    switch (key) {
      case 'open': return ADS_CHART.danger;
      case 'in_progress': return ADS_CHART.warning;
      case 'resolved': return ADS_CHART.success;
      case 'closed': return ADS_CHART.neutral;
      default: return ADS_CHART.neutral;
    }
  };

  return (
    <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '20rem', marginBottom: 'var(--ds-space-250)' }}>
          <div style={metricLabel}>Project</div>
          <Select<ProjectOption>
            inputId="di-project"
            options={projects ?? []}
            value={activeOption}
            onChange={(o) => {
              const opt = o as ProjectOption;
              setSelected(opt);
              rememberReportPick(REPORTS_LAST_PROJECT_KEY, opt.value);
            }}
            isLoading={!projects}
            spacing="default"
          />
        </div>

        {!activeOption ? (
          projectsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-text-subtle)', padding: 24 }}>
              <Spinner size="medium" /> Loading projects…
            </div>
          ) : (
            <EmptyState header="Select a project" description="Choose a project to run this report." />
          )
        ) : isLoading || !data ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-text-subtle)', padding: 24 }}>
            <Spinner size="medium" /> Loading defects…
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--ds-space-100)' }}>
              <ReportExportMenu
                reportId="defect-summary"
                reportLabel="Defect Summary"
                projectName={activeOption.label}
                columns={exportColumns}
                rows={exportRows}
              />
            </div>
            <ReportInsightCard
              reportId="defect-summary"
              reportLabel="Defect Summary"
              projectName={activeOption.label}
              computed={aggregates}
            />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={cardStyle}><div style={metricValue}>{data.defectsTotal}</div><div style={metricLabel}>Total defects</div></div>
              <div style={cardStyle}><div style={{ ...metricValue, color: data.defectsOpen ? 'var(--ds-text-danger)' : 'var(--ds-text)' }}>{data.defectsOpen}</div><div style={metricLabel}>Open</div></div>
              <div style={cardStyle}><div style={{ ...metricValue, color: data.defectsInProgress ? 'var(--ds-text-warning)' : 'var(--ds-text)' }}>{data.defectsInProgress}</div><div style={metricLabel}>In progress</div></div>
              <div style={cardStyle}><div style={{ ...metricValue, color: data.defectsResolved ? 'var(--ds-text-success)' : 'var(--ds-text)' }}>{data.defectsResolved}</div><div style={metricLabel}>Resolved</div></div>
              <div style={cardStyle}><div style={metricValue}>{data.defectsClosed}</div><div style={metricLabel}>Closed</div></div>
            </div>

            {insight && (
              <div style={{ background: 'var(--ds-background-information)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-border-radius)', padding: 'var(--ds-space-150) var(--ds-space-200)', marginBottom: 'var(--ds-space-300)', color: 'var(--ds-text)' }}>
                <strong style={{ color: 'var(--ds-text-information)' }}>Insight</strong> — {insight}
              </div>
            )}

            {defectBars.length > 0 && (
              <div style={{ marginBottom: 'var(--ds-space-300)' }}>
                <div style={sectionH}>
                  <Heading size="small">
                    Defects by status <span style={subtle}>— {data.defectsTotal} total</span>
                  </Heading>
                </div>
                <ReportBarChart
                  data={defectBars}
                  series={[{ dataKey: 'count', name: 'Defects' }]}
                  xKey="status"
                  showLegend={false}
                  getBarColor={(d) => barColor((d as { key: string }).key)}
                />
              </div>
            )}

            <div style={sectionH}><Heading size="small">Open defects ({data.openDefects.length})</Heading></div>
            <div style={{ marginBottom: 'var(--ds-space-300)' }}>
              <JiraTable<IssueRow> columns={cols} data={data.openDefects} getRowId={(r) => r.issue_key} onRowClick={(r) => { if (r.issue_key && r.issue_key !== '—') navigate(Routes.testHub.defect(r.issue_key)); }} isLoading={false} ariaLabel="Open defects"
                emptyView={<div style={{ padding: 'var(--ds-space-250)', color: 'var(--ds-text-subtle)' }}>No open defects.</div>} />
            </div>

            <SectionMessage
              appearance="information"
              actions={<SectionMessageAction href={Routes.incidentHub.reports()}>Incident Hub → Reports</SectionMessageAction>}
            >
              Production incident reporting has moved to Incident Hub → Reports.
            </SectionMessage>
          </>
        )}
    </div>
  );
}

export default DefectSummaryBody;
