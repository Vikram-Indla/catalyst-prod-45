/**
 * SprintTestingStatusBody — sprint-scoped real-data report body (registry: sprint-testing-status).
 * Feature: CAT-REPORTS-HUB-20260703-001 (Phase 2 Lane A port from SprintTestingStatusPage).
 * Scope resolved from ph_issues.sprint_release JSONB. Shares ReportStatusView with the project report.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import type { ThemeAppearance } from '@atlaskit/lozenge';
import { Heading } from '@/components/ads';
import { supabase } from '@/integrations/supabase/client';
import { useReportPickerDefault, rememberReportPick, REPORTS_LAST_SPRINT_KEY } from '@/components/testhub/reports/useReportPickerDefault';
import { useSprintTestingStatus } from '@/components/testhub/reports/hooks/useSprintTestingStatus';
import { ReportPieChart } from '@/components/testhub/reports/charts/ReportChart';
import { ADS_CHART, ADS_SERIES } from '@/lib/charts/adsChartTheme';
import { ReportStatusView, metricLabel, sectionH, subtle } from '@/pages/testhub/reports/ReportStatusView';

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

/** ADS token per scope-status slice (component-owned semantics, tokens only). */
const STATUS_SLICE_COLOR: Record<string, string> = {
  done: ADS_CHART.success,
  in_progress: ADS_SERIES[0],
  todo: ADS_CHART.neutral,
};

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

  // Scope status distribution — count-based, real numbers in the labels.
  // Zero-assumption law: all-zero counts → no chart rendered at all.
  const statusSlices = useMemo(() => {
    if (!data) return [];
    const c = data.storyStatusCounts;
    return [
      { key: 'todo', name: `To Do (${c.todo})`, value: c.todo },
      { key: 'in_progress', name: `In Progress (${c.in_progress})`, value: c.in_progress },
      { key: 'done', name: `Done (${c.done})`, value: c.done },
    ].filter((s) => s.value > 0);
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
        <>
          <ReportStatusView data={data} insight={insight} onRowOpen={(k) => navigate(`/browse/${k}`)} uncoveredEmpty="Every story in this sprint has a test case." />

          {statusSlices.length > 0 && (
            <div style={{ marginTop: 'var(--ds-space-300)' }}>
              <div style={sectionH}>
                <Heading size="small">
                  Scope status distribution <span style={subtle}>— {data.totalStories} stories (count-based)</span>
                </Heading>
              </div>
              <ReportPieChart
                data={statusSlices}
                getColor={(d) => STATUS_SLICE_COLOR[(d as { key: string }).key] ?? ADS_CHART.neutral}
                showLegend
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SprintTestingStatusBody;
