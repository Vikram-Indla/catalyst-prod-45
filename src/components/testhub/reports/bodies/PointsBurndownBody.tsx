/**
 * PointsBurndownBody — sprint burndown (registry: points-burndown).
 * Feature: CAT-REPORTS-HUB-20260703-001 gap closure S2.3 (D-004 unlock).
 * Points mode when scoped issues carry story_points; count-based otherwise
 * (PHASE0: story_points populated on 0 staging rows — label honestly).
 * Completion dates from ph_issue_status_history; pre-capture completions are
 * disclosed, never plotted.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import SectionMessage from '@atlaskit/section-message';
import { Heading } from '@/components/ads';
import { supabase } from '@/integrations/supabase/client';
import { useReportPickerDefault, rememberReportPick, REPORTS_LAST_SPRINT_KEY } from '@/components/testhub/reports/useReportPickerDefault';
import { usePointsBurndown, fetchAllSprintReleaseRows } from '@/components/testhub/reports/hooks/usePointsBurndown';
import ReportInsightCard from '@/components/testhub/reports/ReportInsightCard';
import ReportExportMenu from '@/components/testhub/reports/ReportExportMenu';
import type { ExportColumn, ExportRow } from '@/components/testhub/reports/reportExportRows';
import { ReportLineChart } from '@/components/testhub/reports/charts/ReportChart';
import { ADS_CHART, ADS_SERIES } from '@/lib/charts/adsChartTheme';
import { cardStyle, metricValue, metricLabel, sectionH, subtle } from '@/pages/testhub/reports/ReportStatusView';

interface SprintOption { label: string; value: string }

/**
 * Sprints that actually have work items. ph_jira_sprints alone is wrong for this
 * report: staging carries archived/duplicate sprint rows (e.g. "…06 Jul 26-2")
 * that no ph_issues.sprint_release entry references, so a picker built from that
 * table defaults to a scope-less sprint and the report dead-ends on an empty
 * state. Scope truth lives in the sprint_release JSONB — derive options from it.
 */
function useSprints() {
  return useQuery({
    queryKey: ['ph-sprints-with-scope'],
    queryFn: async (): Promise<SprintOption[]> => {
      const [issues, { data: sprints }] = await Promise.all([
        fetchAllSprintReleaseRows<{ sprint_release: unknown }>('sprint_release'),
        supabase.from('ph_jira_sprints').select('name, sort_order').order('sort_order', { ascending: true }),
      ]);
      const counts = new Map<string, number>();
      for (const row of issues) {
        if (!Array.isArray(row.sprint_release)) continue;
        for (const entry of row.sprint_release as { name?: string }[]) {
          if (entry?.name) counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1);
        }
      }
      const order = new Map(
        ((sprints ?? []) as { name: string; sort_order: number | null }[]).map((s, i) => [s.name, s.sort_order ?? i]),
      );
      return [...counts.entries()]
        .map(([name, count]) => ({ label: `${name} (${count} items)`, value: name }))
        .sort((a, b) => {
          const ao = order.get(a.value);
          const bo = order.get(b.value);
          if (ao !== undefined && bo !== undefined) return bo - ao; // recent sprints first
          if (ao !== undefined) return -1;
          if (bo !== undefined) return 1;
          return b.value.localeCompare(a.value);
        });
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function PointsBurndownBody() {
  const { data: sprints, isLoading: sprintsLoading } = useSprints();
  const [selected, setSelected] = useState<SprintOption | null>(null);
  const activeOption = useReportPickerDefault(REPORTS_LAST_SPRINT_KEY, sprints, selected);

  const { data, isLoading } = usePointsBurndown(activeOption?.value);

  const aggregates = useMemo<Record<string, unknown> | null>(() => {
    if (!data) return null;
    return {
      report_id: 'points-burndown',
      mode: data.mode,
      total_scope: data.totalScope,
      done_scope: data.doneScope,
      total_issues: data.totalIssues,
      pointed_issues: data.pointedIssues,
      unplotted_done: data.unplottedDone,
      days_plotted: data.series.length,
    };
  }, [data]);

  const unit = data?.mode === 'points' ? 'points' : 'items';

  const exportColumns: ExportColumn[] = [
    { key: 'date', header: 'Date' },
    { key: 'remaining', header: `Remaining (${unit})` },
    { key: 'ideal', header: `Ideal (${unit})` },
  ];
  const exportRows = useMemo<ExportRow[]>(
    () => (data ? data.series.map((p) => ({ date: p.date, remaining: p.remaining, ideal: p.ideal })) : []),
    [data],
  );

  return (
    <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '20rem', marginBottom: 'var(--ds-space-250)' }}>
        <div style={metricLabel}>Sprint</div>
        <Select<SprintOption>
          inputId="pb-sprint"
          options={sprints ?? []}
          value={activeOption}
          onChange={(o) => {
            const opt = o as SprintOption;
            setSelected(opt);
            rememberReportPick(REPORTS_LAST_SPRINT_KEY, opt.value);
          }}
          isLoading={!sprints}
          spacing="default"
        />
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
          <Spinner size="medium" /> Loading burndown…
        </div>
      ) : data.totalIssues === 0 ? (
        <EmptyState header="Nothing in this sprint" description="No work items reference this sprint." />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--ds-space-100)' }}>
            <ReportExportMenu
              reportId="points-burndown"
              reportLabel="Points Burndown"
              projectName={activeOption.label}
              columns={exportColumns}
              rows={exportRows}
            />
          </div>
          <ReportInsightCard
            reportId="points-burndown"
            reportLabel="Points Burndown"
            projectName={activeOption.label}
            computed={aggregates}
          />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={cardStyle}>
              <div style={metricValue}>{data.totalScope}</div>
              <div style={metricLabel}>Total scope ({unit})</div>
            </div>
            <div style={cardStyle}>
              <div style={{ ...metricValue, color: 'var(--ds-text-success)' }}>{data.doneScope}</div>
              <div style={metricLabel}>Done ({unit})</div>
            </div>
            <div style={cardStyle}>
              <div style={metricValue}>{data.totalScope - data.doneScope}</div>
              <div style={metricLabel}>Remaining ({unit})</div>
            </div>
          </div>

          {data.mode === 'count' && (
            <div style={{ marginBottom: 'var(--ds-space-200)' }}>
              <SectionMessage appearance="information" title="Count-based burndown">
                No story points are recorded on this sprint's work items, so the burndown counts
                items instead of points.
              </SectionMessage>
            </div>
          )}
          {data.unplottedDone > 0 && (
            <div style={{ marginBottom: 'var(--ds-space-200)' }}>
              <SectionMessage appearance="information" title="Some completions predate capture">
                {data.unplottedDone} done item(s) have no captured completion date (status-transition
                capture began 2026-07-03) and are not plotted on the timeline.
              </SectionMessage>
            </div>
          )}

          {data.series.length > 0 ? (
            <>
              <div style={sectionH}>
                <Heading size="small">
                  Burndown <span style={subtle}>— {data.startDate ?? '?'} → {data.endDate ?? '?'}</span>
                </Heading>
              </div>
              <ReportLineChart
                data={data.series as unknown as Record<string, unknown>[]}
                series={[
                  { dataKey: 'remaining', name: 'Remaining', color: ADS_SERIES[0] },
                  { dataKey: 'ideal', name: 'Ideal', color: ADS_CHART.neutral },
                ]}
                xKey="date"
              />
            </>
          ) : (
            <EmptyState
              header="No timeline to plot"
              description={data.startDate
                ? 'No captured completion dates fall inside this sprint window yet.'
                : 'This sprint has no start/end dates, so a day-by-day burndown cannot be drawn.'}
            />
          )}
        </>
      )}
    </div>
  );
}

export default PointsBurndownBody;
