/**
 * GovernanceBody — project-scoped contradiction report body (registry: governance).
 * Feature: CAT-REPORTS-HUB-20260703-001 (Phase 2 Lane A port from GovernancePage).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import { Heading } from '@/components/ads';
import { useReportPickerDefault, rememberReportPick, REPORTS_LAST_PROJECT_KEY } from '@/components/testhub/reports/useReportPickerDefault';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { supabase } from '@/integrations/supabase/client';
import { useGovernance, type GovernanceRow } from '@/components/testhub/reports/hooks/useGovernance';
import ReportInsightCard from '@/components/testhub/reports/ReportInsightCard';
import { cardStyle, metricValue, metricLabel, sectionH } from '@/pages/testhub/reports/ReportStatusView';

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

export function GovernanceBody() {
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useTmProjects();
  const [selected, setSelected] = useState<ProjectOption | null>(null);

  // S1.5: single project → auto-select; else last-used (validated) or none.
  const activeOption = useReportPickerDefault(REPORTS_LAST_PROJECT_KEY, projects, selected);

  const { data, isLoading } = useGovernance(activeOption?.label, activeOption?.value);

  const cols: Column<GovernanceRow>[] = [
    { id: 'issue_key', label: 'Story', width: 12, sortable: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: 'var(--ds-text)' }}>{row.issue_key}</span> },
    { id: 'summary', label: 'Summary', flex: true, cell: ({ row }) => <span style={{ color: 'var(--ds-text)' }}>{row.summary}</span> },
    { id: 'status', label: 'Delivery status', width: 16, cell: ({ row }) => <Lozenge appearance="success">{row.status}</Lozenge> },
    { id: 'rule', label: 'Mismatch', width: 18, cell: ({ row }) => <Lozenge appearance="removed">{row.rule}</Lozenge> },
  ];

  const insight = useMemo(() => {
    if (!data) return null;
    if (data.rows.length === 0) return `No governance mismatches across ${data.storiesChecked} stories — delivery and test status agree.`;
    return `${data.rows.length} governance mismatch(es) across ${data.storiesChecked} stories — delivery status contradicts test results. Review before release.`;
  }, [data]);

  // Counts-only aggregates for the Caty narrative.
  const aggregates = useMemo<Record<string, unknown> | null>(() => {
    if (!data) return null;
    return {
      report_id: 'governance',
      mismatches: data.rows.length,
      stories_checked: data.storiesChecked,
    };
  }, [data]);

  return (
    <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '20rem', marginBottom: 'var(--ds-space-250)' }}>
          <div style={metricLabel}>Project</div>
          <Select<ProjectOption>
            inputId="gov-project"
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
            <Spinner size="medium" /> Loading governance report…
          </div>
        ) : (
          <>
            <ReportInsightCard
              reportId="governance"
              reportLabel="Governance & Mismatch"
              projectName={activeOption.label}
              computed={aggregates}
            />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={cardStyle}><div style={{ ...metricValue, color: data.rows.length ? 'var(--ds-text-danger)' : 'var(--ds-text)' }}>{data.rows.length}</div><div style={metricLabel}>Mismatches</div></div>
              <div style={cardStyle}><div style={metricValue}>{data.storiesChecked}</div><div style={metricLabel}>Stories checked</div></div>
            </div>

            {insight && (
              <div style={{ background: 'var(--ds-background-information)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-border-radius)', padding: 'var(--ds-space-150) var(--ds-space-200)', marginBottom: 'var(--ds-space-300)', color: 'var(--ds-text)' }}>
                <strong style={{ color: 'var(--ds-text-information)' }}>Insight</strong> — {insight}
              </div>
            )}

            <div style={sectionH}><Heading size="small">Contradictions</Heading></div>
            <JiraTable<GovernanceRow> columns={cols} data={data.rows} getRowId={(r) => r.issue_key} onRowClick={(r) => navigate(`/browse/${r.issue_key}`)} isLoading={false} ariaLabel="Governance mismatches"
              emptyView={<div style={{ padding: 'var(--ds-space-250)', color: 'var(--ds-text-subtle)' }}>No contradictions — delivery and test status agree.</div>} />
          </>
        )}
    </div>
  );
}

export default GovernanceBody;
