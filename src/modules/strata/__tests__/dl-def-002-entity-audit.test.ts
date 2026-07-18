// DL-DEF-002 foundation (CAT-STRATA-DLDEF-20260718-001): governed entity-type
// selection, exact-UUID validation, and owning-module navigation that only links
// where a real id→slug/key mapping exists — '—' otherwise, never a fabricated route.
import { describe, expect, it } from 'vitest';

import {
  ENTITY_AUDIT_TYPES, isEntityUuid, owningRouteForEntity,
} from '@/modules/strata/pages/StrataDataPipelinePage';

describe('isEntityUuid — exact UUID input validation', () => {
  it('accepts a full canonical UUID (any case, surrounding whitespace)', () => {
    expect(isEntityUuid('4470832a-d05d-4f9a-afe1-b5cda7a4f2dc')).toBe(true);
    expect(isEntityUuid('  AC5F085F-7DDB-401C-9CDA-EC031185A6CC  ')).toBe(true);
  });

  it('rejects partials, non-UUIDs and empty input — no fuzzy lookup', () => {
    expect(isEntityUuid('4470832a')).toBe(false);
    expect(isEntityUuid('RUN-23')).toBe(false);
    expect(isEntityUuid('')).toBe(false);
    expect(isEntityUuid('4470832a-d05d-4f9a-afe1-b5cda7a4f2dz')).toBe(false);
  });
});

describe('ENTITY_AUDIT_TYPES — governed chain coverage', () => {
  it('covers the module-7 cross-module entities and only real audit tables', () => {
    const values = ENTITY_AUDIT_TYPES.map((t) => t.value);
    for (const required of [
      'strata_strategy_elements', 'strata_kpis', 'strata_kpi_actuals', 'strata_okrs',
      'strata_scorecard_models', 'strata_snapshots', 'strata_project_cards',
      'strata_benefits', 'strata_portfolios', 'strata_reviews', 'strata_decisions',
      'strata_data_sources', 'strata_upload_runs',
    ]) expect(values).toContain(required);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('owningRouteForEntity — navigation only where a mapping exists', () => {
  const kpiSlugById = new Map([['kpi-1', 'b2b-revenue-growth']]);
  const runKeyById = new Map([['4470832a-d05d-4f9a-afe1-b5cda7a4f2dc', 'RUN-23']]);

  it('routes a KPI through its owning-module slug route', () => {
    expect(owningRouteForEntity('strata_kpis', 'kpi-1', kpiSlugById, runKeyById))
      .toBe('/strata/kpis/b2b-revenue-growth');
  });

  it('routes an upload run through its display key', () => {
    expect(owningRouteForEntity('strata_upload_runs', '4470832a-d05d-4f9a-afe1-b5cda7a4f2dc', kpiSlugById, runKeyById))
      .toBe('/strata/data/runs/RUN-23');
  });

  it('returns null (renders as —) when no mapping is loaded or the table has no route', () => {
    expect(owningRouteForEntity('strata_kpis', 'unknown-kpi', kpiSlugById, runKeyById)).toBeNull();
    expect(owningRouteForEntity('strata_benefits', 'benefit-1', kpiSlugById, runKeyById)).toBeNull();
  });
});
