/**
 * WiredReportBody — live-data adapter for Lab-derived registry entries.
 * Feature: CAT-REPORTS-HUB-20260703-001 (Phase 2 Lane B — replaces the deleted
 * seeded LabReportBody).
 *
 * Project picker (tm_projects, shared last-used key — same id space as the
 * other report bodies), then feeds useRealTestReportData into the existing
 * ReportCanvas. Filters (date range / cycle / folder / owner) are applied
 * client-side before the canvas. Loading = ReportSkeleton; query errors are
 * THROWN so ReportRenderer's boundary shows SectionMessage + Retry.
 */
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Select from '@atlaskit/select';
import EmptyState from '@atlaskit/empty-state';
import Spinner from '@atlaskit/spinner';
import ReportCanvas from '@/pages/testhub/reports/lab/ReportCanvas';
import ReportFilterBar, { FilterState } from '@/pages/testhub/reports/lab/ReportFilterBar';
import ReportSkeleton from '@/pages/testhub/reports/lab/ReportSkeleton';
import { REPORT_DEFS } from '@/pages/testhub/reports/lab/reportDefinitions';
import type { ReportData } from '@/pages/testhub/reports/lab/reportData';
import ReportExportMenu from './ReportExportMenu';
import ReportInsightCard from './ReportInsightCard';
import { deriveWiredAggregates, getExportRows } from './reportExportRows';
import {
  useRealTestReportData,
  useTmProjectOptions,
  type ProjectOption,
} from './hooks/useRealTestReportData';
import {
  useReportPickerDefault,
  rememberReportPick,
  REPORTS_LAST_PROJECT_KEY,
} from './useReportPickerDefault';

const DEFAULT_FILTERS: FilterState = {
  dateRange: 'all',
  cycle: 'all',
  folder: 'all',
  owner: 'all',
};

const RANGE_DAYS: Record<FilterState['dateRange'], number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
};

/**
 * Client-side filter pass. Zero-assumption: when a bounded date range is
 * active, undated runs/defects are excluded (their date cannot be proven to
 * fall inside the window).
 */
function applyFilters(data: ReportData, filters: FilterState): ReportData {
  let { cases, cycles, runs, defects } = data;

  if (filters.folder !== 'all') {
    cases = cases.filter((c) => c.folder === filters.folder);
  }
  if (filters.owner !== 'all') {
    cases = cases.filter((c) => c.owner === filters.owner);
  }
  if (filters.folder !== 'all' || filters.owner !== 'all') {
    const kept = new Set(cases.map((c) => c.id));
    runs = runs.filter((r) => r.caseId !== null && kept.has(r.caseId));
    cycles = cycles.map((cy) => ({
      ...cy,
      scope: cy.scope.filter((id) => kept.has(id)),
      scopeStatus: Object.fromEntries(Object.entries(cy.scopeStatus).filter(([id]) => kept.has(id))),
    }));
  }

  if (filters.cycle !== 'all') {
    cycles = cycles.filter((cy) => cy.id === filters.cycle);
    runs = runs.filter((r) => r.cycleId === filters.cycle);
  }

  const days = RANGE_DAYS[filters.dateRange];
  if (days !== null) {
    const cutoff = Date.now() - days * 86400000;
    runs = runs.filter((r) => r.executedAt !== null && new Date(r.executedAt).getTime() >= cutoff);
    defects = defects.filter((d) => d.createdAt !== null && new Date(d.createdAt).getTime() >= cutoff);
  }

  return { ...data, cases, cycles, runs, defects };
}

const VALID_RANGES: ReadonlyArray<FilterState['dateRange']> = ['7d', '30d', '90d', 'all'];

export default function WiredReportBody({ slug }: { slug: string }) {
  const def = REPORT_DEFS.find((d) => d.slug === slug);
  // Saved-view deep link (Task C): ?project=<tm_projects id>&range=<7d|30d|90d|all>
  // is the INITIAL state only; user picks still win and are remembered as before.
  const [searchParams] = useSearchParams();
  const urlProjectId = searchParams.get('project');
  const urlRange = searchParams.get('range');
  const [filters, setFilters] = useState<FilterState>(() =>
    urlRange && (VALID_RANGES as readonly string[]).includes(urlRange)
      ? { ...DEFAULT_FILTERS, dateRange: urlRange as FilterState['dateRange'] }
      : DEFAULT_FILTERS,
  );
  const [selected, setSelected] = useState<ProjectOption | null>(null);

  const { data: projects, isLoading: projectsLoading } = useTmProjectOptions();
  // S1.5: single project → auto-select; else last-used (validated) or none.
  const pickerDefault = useReportPickerDefault(REPORTS_LAST_PROJECT_KEY, projects, selected);
  const urlOption = useMemo(
    () => (urlProjectId ? (projects ?? []).find((p) => p.value === urlProjectId) ?? null : null),
    [urlProjectId, projects],
  );
  // Precedence: in-session pick > URL param (saved view) > localStorage default.
  const activeOption = selected ?? urlOption ?? pickerDefault;

  const query = useRealTestReportData(activeOption?.value, activeOption?.label);

  const filtered = useMemo(
    () => (query.data ? applyFilters(query.data, filters) : null),
    [query.data, filters],
  );
  const folders = useMemo(
    () =>
      [...new Set((query.data?.cases ?? []).map((c) => c.folder).filter((f): f is string => !!f))].sort(),
    [query.data],
  );
  const owners = useMemo(
    () =>
      [...new Set((query.data?.cases ?? []).map((c) => c.owner).filter((o): o is string => !!o))].sort(),
    [query.data],
  );

  // Task B: primary table of the CURRENTLY FILTERED data for CSV/PDF export.
  const exportTable = useMemo(
    () => (filtered ? getExportRows(slug, filtered) : null),
    [slug, filtered],
  );
  // Task A: counts-only aggregates for the Caty Insight narrative.
  const aggregates = useMemo(
    () => (filtered ? deriveWiredAggregates(slug, filtered) : null),
    [slug, filtered],
  );

  // Thrown after all hooks — caught by ReportRenderer's error boundary (Retry refetches on remount).
  if (query.isError) throw query.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-100)',
          padding: 'var(--ds-space-100) var(--ds-space-250)',
          borderBottom: '1px solid var(--ds-border)',
          background: 'var(--ds-surface)',
        }}
      >
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', whiteSpace: 'nowrap' }}>
          Project
        </span>
        <div style={{ minWidth: '16rem' }}>
          <Select<ProjectOption>
            inputId={`wired-report-project-${slug}`}
            options={projects ?? []}
            value={activeOption}
            onChange={(opt) => {
              const o = opt as ProjectOption;
              setSelected(o);
              rememberReportPick(REPORTS_LAST_PROJECT_KEY, o.value);
            }}
            isLoading={projectsLoading}
            spacing="compact"
            placeholder="Select a project…"
          />
        </div>
        <div style={{ flex: 1 }} />
        <ReportExportMenu
          reportId={slug}
          reportLabel={def?.label ?? slug}
          projectName={activeOption?.label ?? null}
          dateLabel={filters.dateRange === 'all' ? null : `Last ${filters.dateRange}`}
          columns={exportTable?.columns ?? []}
          rows={exportTable?.rows ?? []}
        />
      </div>

      {!activeOption ? (
        projectsLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-100)',
              color: 'var(--ds-text-subtle)',
              padding: 'var(--ds-space-300)',
            }}
          >
            <Spinner size="medium" /> Loading projects…
          </div>
        ) : (
          <EmptyState header="Select a project" description="Choose a project to run this report." />
        )
      ) : query.isPending || !filtered ? (
        <ReportSkeleton />
      ) : (
        <>
          <ReportFilterBar
            filters={filters}
            cycles={query.data?.cycles ?? []}
            folders={folders}
            owners={owners}
            onChange={setFilters}
            showDateRange={def?.usesDateRange ?? true}
          />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '0 var(--ds-space-250)' }}>
              <ReportInsightCard
                reportId={slug}
                reportLabel={def?.label ?? slug}
                projectName={activeOption?.label ?? null}
                computed={aggregates}
                dateRange={filters.dateRange === 'all' ? null : `Last ${filters.dateRange}`}
              />
            </div>
            <ReportCanvas slug={slug} data={filtered} filters={filters} />
          </div>
        </>
      )}
    </div>
  );
}
