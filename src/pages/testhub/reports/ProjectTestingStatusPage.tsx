/**
 * Project Testing Status — first REAL-data report of the Test Hub reporting revamp.
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001 (B1 group 1).
 *
 * For a selected project: coverage % (stories denominator, D-006), execution
 * distribution, hybrid defects/incidents (D-005), governance mismatches (B5 G-M1),
 * uncovered stories. Shares ReportStatusView with the sprint report.
 * ADS tokens only · @atlaskit components own their color · JiraTable for lists.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useReportPickerDefault, rememberReportPick, REPORTS_LAST_PROJECT_KEY } from '@/components/testhub/reports/useReportPickerDefault';
import { useProjectTestingStatus } from './useProjectTestingStatus';
import { ReportStatusView, metricLabel } from './ReportStatusView';

interface ProjectOption {
  label: string;
  value: string;
}

function useTmProjects() {
  return useQuery({
    queryKey: ['tm-projects-list'],
    queryFn: async (): Promise<ProjectOption[]> => {
      const { data } = await supabase
        .from('tm_projects')
        .select('id, name')
        .order('name', { ascending: true });
      return (data ?? []).map((p: { id: string; name: string }) => ({ label: p.name, value: p.id }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Page content minus page-shell chrome — rendered via the report registry (S1.1). */
export function ProjectTestingStatusBody() {
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useTmProjects();
  const [selected, setSelected] = useState<ProjectOption | null>(null);

  // S1.5: single project → auto-select; else last-used (validated) or none.
  const activeOption = useReportPickerDefault(REPORTS_LAST_PROJECT_KEY, projects, selected);

  const { data, isLoading } = useProjectTestingStatus(activeOption?.value, activeOption?.label);

  const insight = useMemo(() => {
    if (!data) return null;
    if (data.totalStories === 0) return 'No stories in scope for this project — coverage cannot be assessed.';
    const parts: string[] = [`Coverage ${data.coveragePct}% (${data.coveredStories}/${data.totalStories} stories).`];
    if (data.coveragePct < 40) parts.push('Coverage is far too low to assess release readiness.');
    if (data.mismatches.length) parts.push(`${data.mismatches.length} story(ies) marked Done have a failing test — investigate before release.`);
    if (data.exec.total === 0) parts.push('No executions recorded.');
    return parts.join(' ');
  }, [data]);

  return (
    <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '20rem', marginBottom: 'var(--ds-space-250)' }}>
          <div style={metricLabel}>Project</div>
          <Select<ProjectOption>
            inputId="pts-project"
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
            <Spinner size="medium" /> Loading testing status…
          </div>
        ) : (
          <ReportStatusView data={data} insight={insight} onRowOpen={(k) => navigate(`/browse/${k}`)} uncoveredEmpty="Every in-scope story has at least one test case." />
        )}
    </div>
  );
}

export default function ProjectTestingStatusPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ds-surface)', display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
      <ProjectPageHeader hubType="test" title="Project Testing Status" trail={[{ text: 'Reports', href: '/testhub/reports' }]} />
      <ProjectTestingStatusBody />
    </div>
  );
}
