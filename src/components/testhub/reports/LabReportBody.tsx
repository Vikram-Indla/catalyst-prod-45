/**
 * LabReportBody — demo-data adapter for Lab-derived registry entries (S1.1).
 * Feature: CAT-REPORTS-HUB-20260703-001.
 *
 * Renders the existing Reports Lab ReportCanvas for one report slug using
 * useSeededTestReportData — unchanged behavior, now behind the registry.
 * The DEMO banner is owned by ReportRenderer, not this adapter.
 */
import React, { useState } from 'react';
import ReportCanvas from '@/pages/testhub/reports/lab/ReportCanvas';
import ReportFilterBar, { FilterState } from '@/pages/testhub/reports/lab/ReportFilterBar';
import { REPORT_DEFS } from '@/pages/testhub/reports/lab/reportDefinitions';
import { useSeededTestReportData } from '@/pages/testhub/reports/lab/useSeededTestReportData';

const DEFAULT_FILTERS: FilterState = {
  dateRange: '30d',
  cycle: 'all',
  folder: 'all',
  owner: 'all',
};

export default function LabReportBody({ slug }: { slug: string }) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const data = useSeededTestReportData();
  const def = REPORT_DEFS.find(d => d.slug === slug);
  const folders = [...new Set(data.cases.map(c => c.folder))].sort();
  const owners = [...new Set(data.cases.map(c => c.owner))].sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <ReportFilterBar
        filters={filters}
        cycles={data.cycles}
        folders={folders}
        owners={owners}
        onChange={setFilters}
        showDateRange={def?.usesDateRange ?? true}
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ReportCanvas slug={slug} data={data} filters={filters} />
      </div>
    </div>
  );
}
