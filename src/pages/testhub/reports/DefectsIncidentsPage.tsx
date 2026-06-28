/**
 * Defects & Incidents — project-scoped hybrid report (B1 group 6).
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001.
 * ph_issues QA Bug/Defect + Production Incident (real volume) + tm_defects (test-linked).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import type { ThemeAppearance } from '@atlaskit/lozenge';
import { Heading } from '@/components/ads';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { supabase } from '@/integrations/supabase/client';
import { useDefectsIncidents, type IssueRow } from './useDefectsIncidents';
import { cardStyle, metricValue, metricLabel, sectionH } from './ReportStatusView';

const SENAEI_BAU_ID = '84f91caf-7511-470a-9a26-3e52e66258bf';
interface ProjectOption { label: string; value: string }

function useTmProjects() {
  return useQuery({
    queryKey: ['tm-projects-list'],
    queryFn: async (): Promise<ProjectOption[]> => {
      const { data } = await supabase.from('tm_projects').select('id, name').order('name', { ascending: true });
      return (data ?? []).map((p: { id: string; name: string }) => ({ label: p.name, value: p.id }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

function catAppearance(c: string): ThemeAppearance {
  switch (c) {
    case 'Done': return 'success';
    case 'In Progress': return 'inprogress';
    default: return 'default';
  }
}

export default function DefectsIncidentsPage() {
  const navigate = useNavigate();
  const { data: projects } = useTmProjects();
  const [selected, setSelected] = useState<ProjectOption | null>(null);

  const activeOption = useMemo<ProjectOption | null>(() => {
    if (selected) return selected;
    if (!projects?.length) return null;
    return projects.find((p) => p.value === SENAEI_BAU_ID) ?? projects[0];
  }, [selected, projects]);

  const { data, isLoading } = useDefectsIncidents(activeOption?.label, activeOption?.value);

  const cols: Column<IssueRow>[] = [
    { id: 'issue_key', label: 'Key', width: 14, sortable: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: 'var(--ds-text)' }}>{row.issue_key}</span> },
    { id: 'summary', label: 'Summary', flex: true, cell: ({ row }) => <span style={{ color: 'var(--ds-text)' }}>{row.summary}</span> },
    { id: 'status', label: 'Status', width: 20, cell: ({ row }) => <Lozenge appearance={catAppearance(row.status_category)}>{row.status || row.status_category}</Lozenge> },
  ];

  const insight = useMemo(() => {
    if (!data) return null;
    const parts = [`${data.defectsOpen} open defects of ${data.defectsTotal}, ${data.incidentsOpen} open incidents of ${data.incidentsTotal}.`];
    if (data.regressionGap > 0) parts.push(`${data.regressionGap} incident(s) have no linked regression test.`);
    if (data.tmDefects > 0) parts.push(`${data.tmDefects} defect(s) linked to a test.`);
    return parts.join(' ');
  }, [data]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ds-surface)', display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
      <ProjectPageHeader hubType="test" title="Defects & Incidents" trail={[{ text: 'Reports', href: '/testhub/reports' }, { text: 'Defects & Incidents' }]} />

      <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '20rem', marginBottom: 'var(--ds-space-250)' }}>
          <div style={metricLabel}>Project</div>
          <Select<ProjectOption> inputId="di-project" options={projects ?? []} value={activeOption} onChange={(o) => setSelected(o as ProjectOption)} isLoading={!projects} spacing="default" />
        </div>

        {isLoading || !data ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ds-text-subtle)', padding: 24 }}>
            <Spinner size="medium" /> Loading defects & incidents…
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={cardStyle}><div style={metricValue}>{data.defectsTotal}</div><div style={metricLabel}>Total defects</div></div>
              <div style={cardStyle}><div style={{ ...metricValue, color: data.defectsOpen ? 'var(--ds-text-danger)' : 'var(--ds-text)' }}>{data.defectsOpen}</div><div style={metricLabel}>Open defects</div></div>
              <div style={cardStyle}><div style={metricValue}>{data.incidentsTotal}</div><div style={metricLabel}>Total incidents</div></div>
              <div style={cardStyle}><div style={{ ...metricValue, color: data.incidentsOpen ? 'var(--ds-text-warning)' : 'var(--ds-text)' }}>{data.incidentsOpen}</div><div style={metricLabel}>Open incidents</div></div>
              <div style={cardStyle}><div style={metricValue}>{data.tmDefects}</div><div style={metricLabel}>Test-linked</div></div>
              <div style={cardStyle}><div style={{ ...metricValue, color: data.regressionGap ? 'var(--ds-text-warning)' : 'var(--ds-text)' }}>{data.regressionGap}</div><div style={metricLabel}>Regression gaps</div></div>
            </div>

            {insight && (
              <div style={{ background: 'var(--ds-background-information)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-border-radius)', padding: 'var(--ds-space-150) var(--ds-space-200)', marginBottom: 'var(--ds-space-300)', color: 'var(--ds-text)' }}>
                <strong style={{ color: 'var(--ds-text-information)' }}>Insight</strong> — {insight}
              </div>
            )}

            <div style={sectionH}><Heading size="small">Open defects ({data.openDefects.length})</Heading></div>
            <div style={{ marginBottom: 'var(--ds-space-300)' }}>
              <JiraTable<IssueRow> columns={cols} data={data.openDefects} getRowId={(r) => r.issue_key} onRowClick={(r) => navigate(`/browse/${r.issue_key}`)} isLoading={false} ariaLabel="Open defects"
                emptyView={<div style={{ padding: 'var(--ds-space-250)', color: 'var(--ds-text-subtle)' }}>No open defects.</div>} />
            </div>

            <div style={sectionH}><Heading size="small">Open production incidents ({data.openIncidents.length})</Heading></div>
            <JiraTable<IssueRow> columns={cols} data={data.openIncidents} getRowId={(r) => r.issue_key} onRowClick={(r) => navigate(`/browse/${r.issue_key}`)} isLoading={false} ariaLabel="Open incidents"
              emptyView={<div style={{ padding: 'var(--ds-space-250)', color: 'var(--ds-text-subtle)' }}>No open incidents.</div>} />
          </>
        )}
      </div>
    </div>
  );
}
