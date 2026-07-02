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
import EmptyState from '@atlaskit/empty-state';
import type { ThemeAppearance } from '@atlaskit/lozenge';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useReportPickerDefault, rememberReportPick, REPORTS_LAST_SPRINT_KEY } from '@/components/testhub/reports/useReportPickerDefault';
import { useSprintTestingStatus } from './useSprintTestingStatus';
import { ReportStatusView, metricLabel } from './ReportStatusView';

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

/** Page content minus page-shell chrome — rendered via the report registry (S1.1). */
export function SprintTestingStatusBody() {
  const navigate = useNavigate();
  const { data: sprints, isLoading: sprintsLoading } = useSprints();
  const [selected, setSelected] = useState<SprintOption | null>(null);

  // S1.5: single sprint → auto-select; else last-used (validated) or none.
  const activeOption = useReportPickerDefault(REPORTS_LAST_SPRINT_KEY, sprints, selected);

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
    <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '26rem', marginBottom: 'var(--ds-space-250)' }}>
          <div style={metricLabel}>Sprint</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Select<SprintOption>
                inputId="sts-sprint"
                options={sprints ?? []}
                value={activeOption}
                onChange={(opt) => {
                  const o = opt as SprintOption;
                  setSelected(o);
                  rememberReportPick(REPORTS_LAST_SPRINT_KEY, o.value);
                }}
                isLoading={!sprints}
                spacing="default"
              />
            </div>
            {activeOption && <Lozenge appearance={sprintStatusAppearance(activeOption.status)}>{activeOption.status || 'unknown'}</Lozenge>}
          </div>
        </div>

      {!activeOption ? (
        sprintsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-text-subtle)', padding: 24 }}>
            <Spinner size="medium" /> Loading sprints…
          </div>
        ) : (
          <EmptyState header="Select a sprint" description="Choose a sprint to run this report." />
        )
      ) : isLoading || !data ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-text-subtle)', padding: 24 }}>
          <Spinner size="medium" /> Loading sprint testing status…
        </div>
      ) : (
        <ReportStatusView data={data} insight={insight} onRowOpen={(k) => navigate(`/browse/${k}`)} uncoveredEmpty="Every story in this sprint has a test case." />
      )}
    </div>
  );
}

export default function SprintTestingStatusPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ds-surface)', display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
      <ProjectPageHeader hubType="test" title="Sprint Testing Status" trail={[{ text: 'Reports', href: '/testhub/reports' }]} />
      <SprintTestingStatusBody />
    </div>
  );
}
