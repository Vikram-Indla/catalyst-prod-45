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
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useProjectTestingStatus } from './useProjectTestingStatus';
import { ReportStatusView, metricLabel } from './ReportStatusView';

const SENAEI_BAU_ID = '84f91caf-7511-470a-9a26-3e52e66258bf';

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

export default function ProjectTestingStatusPage() {
  const navigate = useNavigate();
  const { data: projects } = useTmProjects();
  const [selected, setSelected] = useState<ProjectOption | null>(null);

  const activeOption = useMemo<ProjectOption | null>(() => {
    if (selected) return selected;
    if (!projects?.length) return null;
    return projects.find((p) => p.value === SENAEI_BAU_ID) ?? projects[0];
  }, [selected, projects]);

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
    <div style={{ minHeight: '100vh', background: 'var(--ds-surface)', display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
      <ProjectPageHeader hubType="test" title="Project Testing Status" trail={[{ text: 'Reports', href: '/testhub/reports' }, { text: 'Project Testing Status' }]} />

      <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '20rem', marginBottom: 'var(--ds-space-250)' }}>
          <div style={metricLabel}>Project</div>
          <Select<ProjectOption>
            inputId="pts-project"
            options={projects ?? []}
            value={activeOption}
            onChange={(opt) => setSelected(opt as ProjectOption)}
            isLoading={!projects}
            spacing="default"
          />
        </div>

        {isLoading || !data ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ds-text-subtle)', padding: 24 }}>
            <Spinner size="medium" /> Loading testing status…
          </div>
        ) : (
          <ReportStatusView data={data} insight={insight} onRowOpen={(k) => navigate(`/browse/${k}`)} uncoveredEmpty="Every in-scope story has at least one test case." />
        )}
      </div>
    </div>
  );
}
