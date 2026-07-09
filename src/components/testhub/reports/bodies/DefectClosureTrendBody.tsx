/**
 * DefectClosureTrendBody — raised vs closed defects over time (registry: defect-closure-trend).
 * Feature: CAT-REPORTS-HUB-20260703-001 gap closure S2.3 (D-004 unlock).
 * Closed dates come from tm_defects.resolved_at (auto-stamped by DB trigger since
 * 2026-07-03); pre-trigger closures are counted but never plotted.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import SectionMessage from '@atlaskit/section-message';
import { Heading } from '@/components/ads';
import { supabase } from '@/integrations/supabase/client';
import { useReportPickerDefault, rememberReportPick, REPORTS_LAST_PROJECT_KEY } from '@/components/testhub/reports/useReportPickerDefault';
import { useDefectClosureTrend } from '@/components/testhub/reports/hooks/useDefectClosureTrend';
import ReportInsightCard from '@/components/testhub/reports/ReportInsightCard';
import ReportExportMenu from '@/components/testhub/reports/ReportExportMenu';
import type { ExportColumn, ExportRow } from '@/components/testhub/reports/reportExportRows';
import { ReportLineChart } from '@/components/testhub/reports/charts/ReportChart';
import { ADS_CHART, ADS_SERIES } from '@/lib/charts/adsChartTheme';
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

export function DefectClosureTrendBody() {
  const { data: projects, isLoading: projectsLoading } = useTmProjects();
  const [selected, setSelected] = useState<ProjectOption | null>(null);
  const activeOption = useReportPickerDefault(REPORTS_LAST_PROJECT_KEY, projects, selected);

  const { data, isLoading } = useDefectClosureTrend(activeOption?.value);

  const exportColumns: ExportColumn[] = [
    { key: 'week', header: 'Week (Mon)' },
    { key: 'raised', header: 'Raised' },
    { key: 'closed', header: 'Closed' },
  ];
  const exportRows = useMemo<ExportRow[]>(
    () => (data ? data.weeks.map((w) => ({ week: w.week, raised: w.raised, closed: w.closed })) : []),
    [data],
  );

  const aggregates = useMemo<Record<string, unknown> | null>(() => {
    if (!data) return null;
    return {
      report_id: 'defect-closure-trend',
      defects_total: data.totalDefects,
      open: data.open,
      closed_with_date: data.closedDated,
      closed_without_date: data.undatedClosed,
      weeks_plotted: data.weeks.length,
    };
  }, [data]);

  return (
    <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '20rem', marginBottom: 'var(--ds-space-250)' }}>
        <div style={metricLabel}>Project</div>
        <Select<ProjectOption>
          inputId="dct-project"
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
          <Spinner size="medium" /> Loading closure trend…
        </div>
      ) : data.totalDefects === 0 ? (
        <EmptyState header="No defects" description="No QA defects recorded for this project." />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--ds-space-100)' }}>
            <ReportExportMenu
              reportId="defect-closure-trend"
              reportLabel="Defect Closure Trend"
              projectName={activeOption.label}
              columns={exportColumns}
              rows={exportRows}
            />
          </div>
          <ReportInsightCard
            reportId="defect-closure-trend"
            reportLabel="Defect Closure Trend"
            projectName={activeOption.label}
            computed={aggregates}
          />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={cardStyle}>
              <div style={metricValue}>{data.totalDefects}</div>
              <div style={metricLabel}>Total defects</div>
            </div>
            <div style={cardStyle}>
              <div style={{ ...metricValue, color: data.open ? 'var(--ds-text-warning)' : 'var(--ds-text)' }}>{data.open}</div>
              <div style={metricLabel}>Open</div>
            </div>
            <div style={cardStyle}>
              <div style={{ ...metricValue, color: 'var(--ds-text-success)' }}>{data.closedDated}</div>
              <div style={metricLabel}>Closed (dated)</div>
            </div>
          </div>

          {data.undatedClosed > 0 && (
            <div style={{ marginBottom: 'var(--ds-space-200)' }}>
              <SectionMessage appearance="information" title="Some closures have no date">
                {data.undatedClosed} defect(s) were closed before closure-date capture was enabled
                (2026-07-03) and cannot be plotted on the trend.
              </SectionMessage>
            </div>
          )}

          {data.weeks.length > 0 ? (
            <>
              <div style={sectionH}><Heading size="small">Raised vs closed per week</Heading></div>
              <ReportLineChart
                data={data.weeks as unknown as Record<string, unknown>[]}
                series={[
                  { dataKey: 'raised', name: 'Raised', color: ADS_SERIES[0] },
                  { dataKey: 'closed', name: 'Closed', color: ADS_CHART.success },
                ]}
                xKey="week"
              />
            </>
          ) : (
            <EmptyState
              header="No dated activity yet"
              description="Closure dates accrue from 2026-07-03 (capture trigger). The trend fills in as defects are raised and resolved."
            />
          )}
        </>
      )}
    </div>
  );
}

export default DefectClosureTrendBody;
