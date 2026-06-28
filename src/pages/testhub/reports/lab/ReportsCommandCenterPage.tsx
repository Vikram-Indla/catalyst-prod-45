import React, { useState, useCallback } from 'react';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import ReportNavigator from './ReportNavigator';
import ReportMetricRibbon from './ReportMetricRibbon';
import ReportFilterBar, { FilterState } from './ReportFilterBar';
import ReportCanvas from './ReportCanvas';
import ReportInsightPanel from './ReportInsightPanel';
import ReportFormulaDrawer from './ReportFormulaDrawer';
import ReportExportMenu from './ReportExportMenu';
import { REPORT_DEFS } from './reportDefinitions';
import { useSeededTestReportData, computeKpiRibbon } from './useSeededTestReportData';

const DEFAULT_REPORT = 'execution-overview';

const DEFAULT_FILTERS: FilterState = {
  dateRange: '30d',
  cycle: 'all',
  folder: 'all',
  owner: 'all',
};

export default function ReportsCommandCenterPage() {
  const [selectedReport, setSelectedReport] = useState(DEFAULT_REPORT);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);

  const data = useSeededTestReportData();
  const kpi = computeKpiRibbon(data);

  const def = REPORT_DEFS.find(d => d.slug === selectedReport);
  const folders = [...new Set(data.cases.map(c => c.folder))].sort();
  const owners = [...new Set(data.cases.map(c => c.owner))].sort();

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

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

  const generatedAt = new Date(data.generatedAt).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const headerActions = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span
        style={{
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 4,
          background: 'var(--ds-background-warning)',
          color: 'var(--ds-text-warning)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        Staging UI Lab · Seeded Data
      </span>
      <button
        type="button"
        onClick={handleRefresh}
        style={{
          fontSize: 'var(--ds-font-size-200)',
          padding: '5px 10px',
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border)',
          borderRadius: 4,
          cursor: 'pointer',
          color: 'var(--ds-text-subtle)',
        }}
      >
        ↻ Refresh
      </button>
      <ReportExportMenu />
    </div>
  );

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
        title="Test Reporting Command Center"
        trail={[
          { text: 'Test Hub', href: '/testhub/dashboard' },
          { text: 'Reports', href: '/testhub/reports' },
          { text: 'Command Center' },
        ]}
        actions={headerActions}
      />

      {/* KPI ribbon */}
      <ReportMetricRibbon metrics={kpiMetrics} />

      {/* main body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* left nav */}
        <ReportNavigator selected={selectedReport} onSelect={setSelectedReport} />

        {/* canvas area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* canvas header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              background: 'var(--ds-surface)',
              borderBottom: '1px solid var(--ds-border)',
              gap: 12,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 'var(--ds-font-size-500)',
                  fontWeight: 700,
                  color: 'var(--ds-text)',
                  lineHeight: 1.2,
                }}
              >
                {def?.label ?? selectedReport}
              </h1>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: 'var(--ds-font-size-200)',
                  color: 'var(--ds-text-subtlest)',
                  lineHeight: 1.3,
                }}
              >
                {def?.description} · Generated {generatedAt} · Seeded data
              </p>
            </div>
            <ReportFormulaDrawer reportSlug={selectedReport} />
          </div>

          {/* filter bar */}
          <ReportFilterBar
            filters={filters}
            cycles={data.cycles}
            folders={folders}
            owners={owners}
            onChange={setFilters}
            showDateRange={def?.usesDateRange ?? true}
          />

          {/* report canvas + insight panel */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto' }} key={`${selectedReport}-${refreshKey}`}>
              <ReportCanvas slug={selectedReport} data={data} filters={filters} />
            </div>
            <ReportInsightPanel reportSlug={selectedReport} data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
