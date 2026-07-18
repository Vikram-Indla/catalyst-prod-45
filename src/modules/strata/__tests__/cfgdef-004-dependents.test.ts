/**
 * CFG-004 — retirement/version dialogs must show downstream blast radius.
 * These helpers compute the dependents lists from already-loaded page data;
 * undefined (caller can't compute) renders nothing, [] renders "checked, none".
 */
import { describe, expect, it } from 'vitest';
import {
  gateModelDependents,
  modelVersionImpact,
  perspectiveDependents,
  thresholdSchemeDependents,
  valueCategoryDependents,
  workflowEntityDependents,
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

describe('valueCategoryDependents (CFG-004 C6)', () => {
  const portfolios = [
    { name: 'Growth Portfolio', category_id: 'cat-1', status: 'active' },
    { name: 'Run Portfolio', category_id: 'cat-2', status: 'active' },
  ];
  const benefits = [
    { name: 'Churn Reduction', category_id: 'cat-1', status: 'planned' },
    { name: 'Unclassified Benefit', category_id: null },
  ];

  it('names portfolios and benefits classified under the category', () => {
    expect(valueCategoryDependents('cat-1', portfolios, benefits)).toEqual([
      'Portfolio Growth Portfolio · active',
      'Benefit Churn Reduction · planned',
    ]);
  });

  it('returns [] (checked, none) for an unused category — null category_id never matches', () => {
    expect(valueCategoryDependents('cat-9', portfolios, benefits)).toEqual([]);
  });
});

describe('gateModelDependents (CFG-004 C6)', () => {
  it('summarises instances by status and preserves decided history wording', () => {
    const instances = [
      { gate_model_id: 'g1', status: 'open' },
      { gate_model_id: 'g1', status: 'decided' },
      { gate_model_id: 'g1', status: 'decided' },
      { gate_model_id: 'g2', status: 'open' },
    ];
    expect(gateModelDependents('g1', instances)).toEqual([
      '3 gate instances recorded under this model (1 open, 2 decided) — decided history is preserved',
    ]);
    expect(gateModelDependents('g9', instances)).toEqual([]);
  });
});

describe('workflowEntityDependents (CFG-004 C6)', () => {
  it('counts enumerable entity types with qualifier', () => {
    expect(workflowEntityDependents('strategy_element', { label: 'strategy element', count: 4, qualifier: 'in FY2026' }))
      .toEqual(["4 strategy elements in FY2026 follow this workflow's transitions"]);
  });

  it('zero records is an explicit checked-none, not silence', () => {
    expect(workflowEntityDependents('kpi', { label: 'KPI', count: 0 })).toEqual([]);
  });

  it('an unmapped entity type yields undefined — the dialog claims nothing', () => {
    expect(workflowEntityDependents('mystery_type', undefined)).toBeUndefined();
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
