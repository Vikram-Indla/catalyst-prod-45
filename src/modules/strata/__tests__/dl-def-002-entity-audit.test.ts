// DL-DEF-002 foundation (CAT-STRATA-DLDEF-20260718-001): governed entity-type
// selection, exact-UUID validation, and owning-module navigation that only links
// where a real id→slug/key mapping exists — '—' otherwise, never a fabricated route.
import { describe, expect, it } from 'vitest';

import {
  ENTITY_AUDIT_TYPES, ENTITY_DISCOVERY, isEntityUuid, owningRouteForEntity,
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

describe('ENTITY_DISCOVERY — name/key discovery + owning-route contract', () => {
  it('every governed audit type except UUID-only KPI actuals has a discovery config', () => {
    for (const t of ENTITY_AUDIT_TYPES.map((o) => o.value)) {
      // UUID-only evidence records (no human-readable key) — audit-only, not discoverable.
      if (t === 'strata_kpi_actuals' || t === 'strata_kr_observations' || t === 'strata_okr_close_snapshots')
        expect(ENTITY_DISCOVERY[t]).toBeUndefined();
      else expect(ENTITY_DISCOVERY[t], t).toBeDefined();
    }
  });

  it('builds owning routes from the row\'s own slug/key — never from display names', () => {
    expect(ENTITY_DISCOVERY.strata_kpis.route({ id: 'x', name: 'Anything', slug: 'b2b-revenue-growth' }))
      .toBe('/strata/kpis/b2b-revenue-growth');
    expect(ENTITY_DISCOVERY.strata_strategy_elements.route({ id: 'x', name: 'N', slug: 'el-1' }))
      .toBe('/strata/strategy/elements/el-1');
    expect(ENTITY_DISCOVERY.strata_project_cards.route({ id: 'x', name: 'N', slug: 'pc-1' }))
      .toBe('/strata/execution/pc-1');
    expect(ENTITY_DISCOVERY.strata_portfolios.route({ id: 'x', name: 'N', slug: 'pf-1' }))
      .toBe('/strata/portfolio/pf-1');
    expect(ENTITY_DISCOVERY.strata_benefits.route({ id: 'x', name: 'N', slug: 'bn-1' }))
      .toBe('/strata/portfolio/benefits/bn-1');
    expect(ENTITY_DISCOVERY.strata_data_sources.route({ id: 'x', name: 'N', slug: 'salam-finance-excel' }))
      .toBe('/strata/data/sources/salam-finance-excel');
    expect(ENTITY_DISCOVERY.strata_upload_runs.route({ id: 'x', run_key: 'RUN-23' }))
      .toBe('/strata/data/runs/RUN-23');
    expect(ENTITY_DISCOVERY.strata_snapshots.route({ id: 'x', name: 'N', snapshot_key: 'SNAP-1' }))
      .toBe('/strata/reviews/SNAP-1');
  });

  it('renders — (null) for types without a routeable surface and for missing slugs', () => {
    expect(ENTITY_DISCOVERY.strata_okrs.route({ id: 'x', name: 'N', slug: 'okr-1' })).toBeNull();
    expect(ENTITY_DISCOVERY.strata_reviews.route({ id: 'x', name: 'N', slug: 'rev-1' })).toBeNull();
    expect(ENTITY_DISCOVERY.strata_decisions.route({ id: 'x', title: 'T' })).toBeNull();
    expect(ENTITY_DISCOVERY.strata_kpis.route({ id: 'x', name: 'N', slug: null })).toBeNull();
  });

  it('matches only real human-readable columns per table', () => {
    expect(ENTITY_DISCOVERY.strata_upload_runs.matchCols).toEqual(['run_key']);
    expect(ENTITY_DISCOVERY.strata_decisions.matchCols).toEqual(['title']);
    expect(ENTITY_DISCOVERY.strata_snapshots.matchCols).toEqual(['name', 'snapshot_key']);
  });
});
