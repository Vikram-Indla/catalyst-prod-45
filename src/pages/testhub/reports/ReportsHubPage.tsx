/**
 * ReportsHubPage — single Reports hub at /testhub/reports (S1.2).
 * Feature: CAT-REPORTS-HUB-20260703-001.
 *
 * Uses the Reports Lab shell as chassis: left ReportNavigator lists the
 * REPORT_REGISTRY grouped by category; selection is the :reportSlug URL param.
 * Wired reports render their real-data Body; demo reports render the Lab
 * canvas behind a seeded-data banner (ReportRenderer owns the banner).
 * The KPI metric ribbon is seeded-demo-driven, so it only shows on demo reports.
 */
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import EmptyState from '@atlaskit/empty-state';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import ReportNavigator from './lab/ReportNavigator';
import ReportMetricRibbon from './lab/ReportMetricRibbon';
import { useSeededTestReportData, computeKpiRibbon } from './lab/useSeededTestReportData';
import {
  REPORT_REGISTRY,
  REPORT_CATEGORY_ORDER,
  DEFAULT_REPORT_ID,
  getReportDefinition,
} from '@/components/testhub/reports/report-registry';
import ReportRenderer from '@/components/testhub/reports/ReportRenderer';
import { Routes } from '@/lib/routes';

export default function ReportsHubPage() {
  const navigate = useNavigate();
  const { reportSlug } = useParams<{ reportSlug: string }>();

  // Seeded data drives the demo-only KPI ribbon (hook must run unconditionally).
  const seeded = useSeededTestReportData();

  if (!reportSlug) {
    return <Navigate to={Routes.testHub.report(DEFAULT_REPORT_ID)} replace />;
  }

  const def = getReportDefinition(reportSlug);
  const kpi = computeKpiRibbon(seeded);

  const kpiMetrics = [
    { label: 'Total Cases', value: kpi.totalCases, highlight: 'neutral' as const },
    { label: 'Total Cycles', value: kpi.totalCycles, highlight: 'neutral' as const },
    { label: 'Total Runs', value: kpi.totalRuns, highlight: 'neutral' as const },
    { label: 'Pass Rate', value: `${kpi.passRate}%`, highlight: (kpi.passRate >= 80 ? 'success' : kpi.passRate >= 60 ? 'warning' : 'danger') as 'success' | 'warning' | 'danger', sub: 'of executed runs' },
    { label: 'Failed', value: kpi.failed, highlight: 'danger' as const },
    { label: 'Blocked', value: kpi.blocked, highlight: 'warning' as const },
    { label: 'Open Defects', value: kpi.defects, highlight: (kpi.defects > 5 ? 'danger' : 'warning') as 'danger' | 'warning' },
    { label: 'Coverage', value: `${kpi.coverage}%`, highlight: (kpi.coverage >= 80 ? 'success' : 'warning') as 'success' | 'warning', sub: 'req. traceability' },
  ];

  return (
    <div
      style={{
        fontFamily: 'var(--ds-font-family-body)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--ds-surface-sunken)',
      }}
    >
      <ProjectPageHeader
        hubType="test"
        title="Reports"
        trail={[
          { text: 'Test Hub', href: '/testhub/dashboard' },
          { text: 'Reports' },
        ]}
      />

      {/* KPI ribbon — seeded-demo-driven, so only shown on demo reports */}
      {def?.status === 'demo' && <ReportMetricRibbon metrics={kpiMetrics} />}

      {/* main body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* left nav — registry entries grouped by category */}
        <ReportNavigator
          selected={reportSlug}
          onSelect={(slug) => navigate(Routes.testHub.report(slug))}
          entries={REPORT_REGISTRY.map((r) => ({
            slug: r.id,
            label: r.label,
            category: r.category,
            demo: r.status === 'demo',
          }))}
          categories={REPORT_CATEGORY_ORDER}
        />

        {/* canvas area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {def ? (
            <>
              {/* canvas header */}
              <div
                style={{
                  padding: 'var(--ds-space-150) var(--ds-space-250)',
                  background: 'var(--ds-surface)',
                  borderBottom: '1px solid var(--ds-border)',
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: 'var(--ds-font-size-500)',
                    fontWeight: 700,
                    color: 'var(--ds-text)',
                    lineHeight: 1.2,
                  }}
                >
                  {def.label}
                </h1>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 'var(--ds-font-size-200)',
                    color: 'var(--ds-text-subtlest)',
                    lineHeight: 1.3,
                  }}
                >
                  {def.description}
                </p>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--ds-surface)' }}>
                <ReportRenderer definition={def} />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ds-surface)' }}>
              <EmptyState
                header="Report not found"
                description={`No report named “${reportSlug}” exists. Pick a report from the list on the left.`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
