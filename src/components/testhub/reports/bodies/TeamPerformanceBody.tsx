/**
 * TeamPerformanceBody — project-scoped QA team report body (registry: team-performance).
 * Feature: CAT-REPORTS-HUB-20260703-001 (Phase 2 Lane A port from TeamPerformancePage).
 * Team = testers assigned to the project's test cases (D-010). ADS tokens; @atlaskit; JiraTable.
 */
import { useMemo, useState } from 'react';
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
import { useTeamPerformance, type TeamMemberRow } from '@/components/testhub/reports/hooks/useTeamPerformance';
import { cardStyle, metricValue, metricLabel, sectionH } from '@/pages/testhub/reports/ReportStatusView';

interface ProjectOption {
  label: string;
  value: string;
}

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

const num: React.CSSProperties = { color: 'var(--ds-text)' };

export function TeamPerformanceBody() {
  const { data: projects, isLoading: projectsLoading } = useTmProjects();
  const [selected, setSelected] = useState<ProjectOption | null>(null);

  // S1.5: single project → auto-select; else last-used (validated) or none.
  const activeOption = useReportPickerDefault(REPORTS_LAST_PROJECT_KEY, projects, selected);

  const { data, isLoading } = useTeamPerformance(activeOption?.value);

  const columns: Column<TeamMemberRow>[] = [
    { id: 'name', label: 'Tester', flex: true, sortable: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: 'var(--ds-text)' }}>{row.name}</span> },
    { id: 'assigned', label: 'Assigned', width: 12, align: 'center', sortable: true, cell: ({ row }) => <span style={num}>{row.assigned}</span> },
    { id: 'executed', label: 'Executed', width: 12, align: 'center', sortable: true, cell: ({ row }) => <span style={num}>{row.executed}</span> },
    { id: 'passed', label: 'Passed', width: 10, align: 'center', cell: ({ row }) => <span style={{ color: 'var(--ds-text-success)' }}>{row.passed}</span> },
    { id: 'failed', label: 'Failed', width: 10, align: 'center', cell: ({ row }) => <span style={{ color: 'var(--ds-text-danger)' }}>{row.failed}</span> },
    { id: 'blocked', label: 'Blocked', width: 10, align: 'center', cell: ({ row }) => <span style={{ color: 'var(--ds-text-warning)' }}>{row.blocked}</span> },
    { id: 'pending', label: 'Pending', width: 10, align: 'center', cell: ({ row }) => <span style={{ color: 'var(--ds-text-subtlest)' }}>{row.pending}</span> },
    { id: 'defects', label: 'Defects', width: 10, align: 'center', cell: ({ row }) => row.defects > 0 ? <Lozenge appearance="removed">{row.defects}</Lozenge> : <span style={{ color: 'var(--ds-text-subtlest)' }}>0</span> },
  ];

  const passRate = data && data.totals.executed > 0 ? Math.round((data.totals.passed / data.totals.executed) * 1000) / 10 : 0;
  const insight = useMemo(() => {
    if (!data) return null;
    if (data.totals.testers === 0) return 'No testers assigned to this project.';
    return `${data.totals.testers} testers, ${data.totals.assigned} cases assigned, ${data.totals.executed} executed (${passRate}% pass). ${data.totals.failed} failed, ${data.totals.defects} defect(s) raised.`;
  }, [data, passRate]);

  return (
    <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '20rem', marginBottom: 'var(--ds-space-250)' }}>
          <div style={metricLabel}>Project</div>
          <Select<ProjectOption>
            inputId="team-project"
            options={projects ?? []}
            value={activeOption}
            onChange={(opt) => {
              const o = opt as ProjectOption;
              setSelected(o);
              rememberReportPick(REPORTS_LAST_PROJECT_KEY, o.value);
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
            <Spinner size="medium" /> Loading team performance…
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={cardStyle}>
                <div style={metricValue}>{data.totals.testers}</div>
                <div style={metricLabel}>Testers</div>
              </div>
              <div style={cardStyle}>
                <div style={metricValue}>{data.totals.assigned}</div>
                <div style={metricLabel}>Assigned cases</div>
              </div>
              <div style={cardStyle}>
                <div style={metricValue}>{data.totals.executed}</div>
                <div style={metricLabel}>Executed</div>
              </div>
              <div style={cardStyle}>
                <div style={metricValue}>{passRate}%</div>
                <div style={metricLabel}>Pass rate</div>
              </div>
              <div style={cardStyle}>
                <div style={{ ...metricValue, color: data.totals.failed ? 'var(--ds-text-danger)' : 'var(--ds-text)' }}>{data.totals.failed}</div>
                <div style={metricLabel}>Failed</div>
              </div>
            </div>

            {insight && (
              <div style={{ background: 'var(--ds-background-information)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-border-radius)', padding: 'var(--ds-space-150) var(--ds-space-200)', marginBottom: 'var(--ds-space-300)', color: 'var(--ds-text)' }}>
                <strong style={{ color: 'var(--ds-text-information)' }}>Insight</strong> — {insight}
              </div>
            )}

            <div style={sectionH}><Heading size="small">Per-tester breakdown</Heading></div>
            <JiraTable<TeamMemberRow>
              columns={columns}
              data={data.members}
              getRowId={(r) => r.testerId}
              isLoading={false}
              ariaLabel="Team per-tester breakdown"
              emptyView={<div style={{ padding: 'var(--ds-space-250)', color: 'var(--ds-text-subtle)' }}>No testers assigned to this project.</div>}
            />
          </>
        )}
    </div>
  );
}

export default TeamPerformanceBody;
