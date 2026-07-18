// DL-DEF-001 (CAT-STRATA-DLDEF-20260718-001): the source registry must drill down
// to a stable slug route, and the detail derivations (freshness, contract version,
// dependents, never-run) must come from real runs/KPIs — never invented.
import { describe, expect, it } from 'vitest';

import { Routes } from '@/lib/routes';
import { buildSourceRows } from '@/modules/strata/pages/StrataDataPipelinePage';
import type { StrataDataSource, StrataKpi, StrataUploadRun } from '@/modules/strata/types';

const source: StrataDataSource = {
  id: 'src-1', name: 'Salam Finance Excel', slug: 'salam-finance-excel',
  system_type: 'excel', owner_id: 'owner-uuid', refresh_cadence: 'monthly',
  status: 'active', health: null,
};
const neverRun: StrataDataSource = { ...source, id: 'src-2', name: 'Salam BI Extract', slug: 'salam-bi-extract', status: 'registered' };

const completedRun = {
  id: 'r1', run_key: 'RUN-1001', data_source_id: 'src-1', template_id: 'tpl', template_version: 1,
  channel: 'excel', initiated_by: null, storage_path: null, file_name: 'x.csv', file_hash: 'h',
  row_count_raw: 3, row_count_valid: 3, row_count_rejected: 0, status: 'completed',
  error_summary: null, started_at: '2026-07-03T10:00:00Z', completed_at: '2026-07-03T10:00:05Z',
  run_type: 'import', reverses_run_id: null, reversed_by_run_id: null, reversal_reason: null,
} as StrataUploadRun;

const kpi = { id: 'k1', name: 'B2B Revenue Growth', slug: 'b2b-revenue-growth', data_source_id: 'src-1' } as StrataKpi;

describe('DL-DEF-001 — source detail route + derivations', () => {
  it('builds the slug-based source-detail route (no UUID in URL)', () => {
    expect(Routes.strata.source('salam-finance-excel')).toBe('/strata/data/sources/salam-finance-excel');
  });

  it('derives contract version, last run and dependents from real data', () => {
    const rows = buildSourceRows([source], [completedRun], [kpi]);
    const row = rows.find((r) => r.source.slug === 'salam-finance-excel')!;
    expect(row.contractVersion).toBe(1);
    expect(row.lastRunKey).toBe('RUN-1001');
    expect(row.dependentNames).toEqual(['B2B Revenue Growth']);
  });

  it('renders a never-run source honestly (no invented last run or contract)', () => {
    const rows = buildSourceRows([neverRun], [], []);
    const row = rows.find((r) => r.source.slug === 'salam-bi-extract')!;
    expect(row.lastRunKey).toBeNull();
    expect(row.contractVersion).toBeNull();
    expect(row.dependentNames).toEqual([]);
  });
});
