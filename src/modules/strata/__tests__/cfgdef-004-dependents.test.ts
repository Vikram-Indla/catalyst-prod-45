/**
 * CFG-004 — retirement/version dialogs must show downstream blast radius.
 * These helpers compute the dependents lists from already-loaded page data;
 * undefined (caller can't compute) renders nothing, [] renders "checked, none".
 */
import { describe, expect, it } from 'vitest';
import {
  modelVersionImpact,
  perspectiveDependents,
  thresholdSchemeDependents,
} from '../lib/dependents';

const models = [
  { id: 'm1', name: 'B2B Sector Scorecard', version: 1, status: 'approved' },
  { id: 'm2', name: 'B2B Sector Scorecard', version: 2, status: 'pending_approval' },
  { id: 'm3', name: 'CEO Enterprise Scorecard', version: 1, status: 'approved' },
];
const mps = [
  { model_id: 'm1', perspective_id: 'p-fin' },
  { model_id: 'm2', perspective_id: 'p-fin' },
  { model_id: 'm3', perspective_id: 'p-people' },
];

describe('perspectiveDependents (CFG-004)', () => {
  it('names every model version that weights the perspective, with status', () => {
    expect(perspectiveDependents('p-fin', models, mps)).toEqual([
      'Scorecard model B2B Sector Scorecard v1 · approved',
      'Scorecard model B2B Sector Scorecard v2 · pending approval',
    ]);
  });

  it('returns [] (checked, none) for an unreferenced perspective', () => {
    expect(perspectiveDependents('p-esg', models, mps)).toEqual([]);
  });
});

describe('thresholdSchemeDependents (CFG-004)', () => {
  it('names KPIs rated by the scheme and ignores others', () => {
    const kpis = [
      { name: 'Churn Rate', threshold_scheme_id: 's1', status: 'approved' },
      { name: 'B2B Revenue Growth', threshold_scheme_id: 's2', status: 'approved' },
      { name: 'NPS', threshold_scheme_id: null },
    ];
    expect(thresholdSchemeDependents('s1', kpis)).toEqual(['KPI Churn Rate · approved']);
    expect(thresholdSchemeDependents('s9', kpis)).toEqual([]);
  });
});

describe('modelVersionImpact (CFG-004)', () => {
  it('states weight and measure counts as facts', () => {
    const measures = [
      { model_id: 'm1', perspective_id: 'p-fin' },
      { model_id: 'm1', perspective_id: 'p-fin' },
      { model_id: 'm2', perspective_id: 'p-fin' },
    ];
    expect(modelVersionImpact('m1', mps, measures)).toEqual([
      '1 perspective weight defined on this version',
      '2 measure assignments defined on this version',
    ]);
  });

  it('an empty model yields an empty list, not fabricated counts', () => {
    expect(modelVersionImpact('m9', mps, [])).toEqual([]);
  });
});
