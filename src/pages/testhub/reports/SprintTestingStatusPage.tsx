/**
 * Sprint Testing Status — sprint-scoped real-data report (B1 group 3).
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001.
 * Scope resolved from ph_issues.sprint_release JSONB (B2). Shares ReportStatusView with the project report.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import type { ThemeAppearance } from '@atlaskit/lozenge';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useSprintTestingStatus } from './useSprintTestingStatus';
import { ReportStatusView, metricLabel } from './ReportStatusView';

const DEFAULT_SPRINT = 'NDS-Sprint 3.1-29 Jan 25';

interface SprintOption {
  label: string;
  value: string;
  status: string | null;
}

function useSprints() {
  return useQuery({
    queryKey: ['ph-jira-sprints-list'],
    queryFn: async (): Promise<SprintOption[]> => {
      const { data } = await supabase
        .from('ph_jira_sprints')
        .select('name, status, sort_order')
        .order('sort_order', { ascending: true });
      return (data ?? []).map((s: { name: string; status: string | null }) => ({ label: s.name, value: s.name, status: s.status }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

function sprintStatusAppearance(s: string | null): ThemeAppearance {
  switch ((s ?? '').toLowerCase()) {
    case 'active': return 'inprogress';
    case 'released':
    case 'closed': return 'success';
    default: return 'default';
  }
}

export default function SprintTestingStatusPage() {
  const navigate = useNavigate();
  const { data: sprints } = useSprints();
  const [selected, setSelected] = useState<SprintOption | null>(null);

  const activeOption = useMemo<SprintOption | null>(() => {
    if (selected) return selected;
    if (!sprints?.length) return null;
    return sprints.find((s) => s.value === DEFAULT_SPRINT) ?? sprints[0];
  }, [selected, sprints]);

  const { data, isLoading } = useSprintTestingStatus(activeOption?.value);

  const insight = useMemo(() => {
    if (!data) return null;
    if (data.totalStories === 0) return 'No stories found in this sprint — nothing to assess.';
    const parts: string[] = [`Coverage ${data.coveragePct}% (${data.coveredStories}/${data.totalStories} stories).`];
    if (data.coveragePct < 40) parts.push('Coverage is too low to call this sprint test-complete.');
    if (data.mismatches.length) parts.push(`${data.mismatches.length} Done story(ies) have a failing test.`);
    if (data.exec.not_run > 0) parts.push(`${data.exec.not_run} execution(s) still pending.`);
    return parts.join(' ');
  }, [data]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ds-surface)', display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
      <ProjectPageHeader hubType="test" title="Sprint Testing Status" trail={[{ text: 'Reports', href: '/testhub/reports' }, { text: 'Sprint Testing Status' }]} />

      <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '26rem', marginBottom: 'var(--ds-space-250)' }}>
          <div style={metricLabel}>Sprint</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Select<SprintOption>
                inputId="sts-sprint"
                options={sprints ?? []}
                value={activeOption}
                onChange={(opt) => setSelected(opt as SprintOption)}
                isLoading={!sprints}
                spacing="default"
              />
            </div>
            {activeOption && <Lozenge appearance={sprintStatusAppearance(activeOption.status)}>{activeOption.status || 'unknown'}</Lozenge>}
          </div>
        </div>

        {isLoading || !data ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ds-text-subtle)', padding: 24 }}>
            <Spinner size="medium" /> Loading sprint testing status…
          </div>
        ) : (
          <ReportStatusView data={data} insight={insight} onRowOpen={(k) => navigate(`/browse/${k}`)} uncoveredEmpty="Every story in this sprint has a test case." />
        )}
      </div>
    </div>
  );
}
