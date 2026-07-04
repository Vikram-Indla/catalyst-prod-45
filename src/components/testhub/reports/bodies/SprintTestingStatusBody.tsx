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
import { fetchAllSprintReleaseRows } from '@/components/testhub/reports/hooks/usePointsBurndown';
import ReportExportMenu from '@/components/testhub/reports/ReportExportMenu';
import ReportInsightCard from '@/components/testhub/reports/ReportInsightCard';
import type { ExportColumn, ExportRow } from '@/components/testhub/reports/reportExportRows';
import { ReportPieChart } from '@/components/testhub/reports/charts/ReportChart';
import { ADS_CHART, ADS_SERIES } from '@/lib/charts/adsChartTheme';
import { ReportStatusView, metricLabel, sectionH, subtle } from '@/pages/testhub/reports/ReportStatusView';

interface SprintOption {
  label: string;
  value: string;
  status: string | null;
}

/**
 * Sprints that actually have work items (same rationale as PointsBurndownBody:
 * ph_jira_sprints carries archived duplicates no issue references — a picker
 * built from it can default to a scope-less sprint). Scope truth = the
 * sprint_release JSONB; ph_jira_sprints only enriches status/order.
 */
function useSprints() {
  return useQuery({
    queryKey: ['ph-sprints-with-scope-status'],
    queryFn: async (): Promise<SprintOption[]> => {
      const [issues, { data: sprints }] = await Promise.all([
        fetchAllSprintReleaseRows<{ sprint_release: unknown }>('sprint_release'),
        supabase.from('ph_jira_sprints').select('name, status, sort_order').order('sort_order', { ascending: true }),
      ]);
      const counts = new Map<string, number>();
      for (const row of issues) {
        if (!Array.isArray(row.sprint_release)) continue;
        for (const entry of row.sprint_release as { name?: string }[]) {
          if (entry?.name) counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1);
        }
      }
      const meta = new Map(
        ((sprints ?? []) as { name: string; status: string | null; sort_order: number | null }[])
          .map((s, i) => [s.name, { status: s.status, order: s.sort_order ?? i }]),
      );
      return [...counts.entries()]
        .map(([name, count]) => ({
          label: `${name} (${count} items)`,
          value: name,
          status: meta.get(name)?.status ?? null,
        }))
        .sort((a, b) => {
          const ao = meta.get(a.value)?.order;
          const bo = meta.get(b.value)?.order;
          if (ao !== undefined && bo !== undefined) return bo - ao; // recent sprints first
          if (ao !== undefined) return -1;
          if (bo !== undefined) return 1;
          return b.value.localeCompare(a.value);
        });
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

  // Task B export: mismatches + uncovered stories as one sectioned table.
  const exportColumns: ExportColumn[] = [
    { key: 'section', header: 'Section' },
    { key: 'issue_key', header: 'Story' },
    { key: 'summary', header: 'Summary' },
    { key: 'status', header: 'Status' },
    { key: 'case_key', header: 'Test case' },
    { key: 'test_status', header: 'Test status' },
  ];
  const exportRows = useMemo<ExportRow[]>(() => {
    if (!data) return [];
    return [
      ...data.mismatches.map((m) => ({
        section: 'Governance mismatch', issue_key: m.issue_key, summary: m.summary,
        status: m.status, case_key: m.case_key, test_status: m.test_status,
      })),
      ...data.uncovered.map((s) => ({
        section: 'Uncovered story', issue_key: s.issue_key, summary: s.summary,
        status: s.status, case_key: null, test_status: null,
      })),
    ];
  }, [data]);

  // Task A insight: counts-only aggregates for the Caty narrative.
  const aggregates = useMemo<Record<string, unknown> | null>(() => {
    if (!data) return null;
    return {
      report_id: 'sprint-testing-status',
      total_stories: data.totalStories,
      covered_stories: data.coveredStories,
      coverage_pct: data.coveragePct,
      execution: data.exec,
      defects: data.defects,
      governance_mismatches: data.mismatches.length,
      uncovered_stories: data.uncovered.length,
      story_status_counts: data.storyStatusCounts,
    };
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--ds-space-100)' }}>
            <ReportExportMenu
              reportId="sprint-testing-status"
              reportLabel="Sprint Testing Status"
              projectName={activeOption.label}
              columns={exportColumns}
              rows={exportRows}
            />
          </div>
          <ReportInsightCard
            reportId="sprint-testing-status"
            reportLabel="Sprint Testing Status"
            projectName={activeOption.label}
            computed={aggregates}
          />
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
