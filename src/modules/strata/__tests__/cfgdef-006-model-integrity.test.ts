/**
 * CFG-006 — a scorecard model must not be submittable (and must not read as
 * integrity-clean) while a weighted perspective has no measures or measure
 * weights that do not total 100. Reproduces the QA state: B2B Sector Scorecard
 * v2 sat at Pending Approval with two empty perspectives while the band showed
 * a green check.
 */
import { describe, expect, it } from 'vitest';
import {
  computeModelIntegrity,
  coverageState,
  draftSubmitBlockedReason,
  serverCoverageLabel,
} from '../lib/modelIntegrity';

const names = new Map([
  ['p-fin', 'Financial'],
  ['p-cust', 'Customer & Market'],
  ['p-dig', 'Digital & Innovation'],
]);

describe('computeModelIntegrity (CFG-006)', () => {
  it('fails a perspective with zero measures — the exact QA repro', () => {
    // Perspective weights total 100 (the old check passed on this alone)…
    const weights = [
      { perspective_id: 'p-fin', weight: 40 },
      { perspective_id: 'p-cust', weight: 35 },
      { perspective_id: 'p-dig', weight: 25 },
    ];
    // …but only Financial has measures.
    const measures = [
      { perspective_id: 'p-fin', weight: 60 },
      { perspective_id: 'p-fin', weight: 40 },
    ];
    const r = computeModelIntegrity(weights, measures, names);
    expect(r.perspectiveWeightsOk).toBe(true);
    expect(r.ok).toBe(false);
    expect(r.measureIssues).toEqual([
      'Customer & Market has no measures assigned',
      'Digital & Innovation has no measures assigned',
    ]);
    expect(draftSubmitBlockedReason(r)).toBe(
      'Each perspective needs measure weights totalling 100 before submit',
    );
  });

  it('passes only when perspective weights total 100 and every perspective has measure weights totalling 100', () => {
    const weights = [
      { perspective_id: 'p-fin', weight: 60 },
      { perspective_id: 'p-cust', weight: 40 },
    ];
    const measures = [
      { perspective_id: 'p-fin', weight: 100 },
      { perspective_id: 'p-cust', weight: 50 },
      { perspective_id: 'p-cust', weight: 50 },
    ];
    const r = computeModelIntegrity(weights, measures, names);
    expect(r.ok).toBe(true);
    expect(r.measureIssues).toEqual([]);
    expect(draftSubmitBlockedReason(r)).toBeUndefined();
  });

  it('still reports measure-weight mismatch on populated perspectives', () => {
    const weights = [{ perspective_id: 'p-fin', weight: 100 }];
    const measures = [{ perspective_id: 'p-fin', weight: 90 }];
    const r = computeModelIntegrity(weights, measures, names);
    expect(r.ok).toBe(false);
    expect(r.measureIssues).toEqual([
      'Financial measure weights total 90 — assign the remaining 10',
    ]);
  });

  it('keeps the perspective-weight gates first', () => {
    const none = computeModelIntegrity([], [], names);
    expect(none.ok).toBe(false);
    expect(draftSubmitBlockedReason(none)).toBe('Add perspective weights totalling 100 first');

    const short = computeModelIntegrity(
      [{ perspective_id: 'p-fin', weight: 80 }],
      [{ perspective_id: 'p-fin', weight: 100 }],
      names,
    );
    expect(draftSubmitBlockedReason(short)).toBe('Weights total 80 — must total 100');
  });
});

/**
 * SC-GOVAPPROVAL session 002 — the four measure-coverage states are DISTINCT.
 * Screenshot repro: Financial and Network & Infrastructure each hold measures
 * totalling 50, yet the band claimed "has no measures assigned". Underweight,
 * overweight, zero and valid must never collapse into each other.
 */
describe('measure-coverage states (SC-GOVAPPROVAL 002)', () => {
  const twoNames = new Map([
    ['p-fin', 'Financial'],
    ['p-net', 'Network & Infrastructure'],
  ]);

  it('screenshot repro: measures totalling 50 report UNDERWEIGHT with 50 remaining — never "no measures"', () => {
    const weights = [
      { perspective_id: 'p-fin', weight: 50 },
      { perspective_id: 'p-net', weight: 50 },
    ];
    const measures = [
      // Financial: 4 measures totalling 50.
      { perspective_id: 'p-fin', weight: 20 },
      { perspective_id: 'p-fin', weight: 20 },
      { perspective_id: 'p-fin', weight: 5 },
      { perspective_id: 'p-fin', weight: 5 },
      // Network & Infrastructure: 3 measures totalling 50.
      { perspective_id: 'p-net', weight: 10 },
      { perspective_id: 'p-net', weight: 10 },
      { perspective_id: 'p-net', weight: 30 },
    ];
    const r = computeModelIntegrity(weights, measures, twoNames);
    expect(r.perspectiveWeightsOk).toBe(true);
    expect(r.ok).toBe(false);
    expect(r.measureIssues).toEqual([
      'Financial measure weights total 50 — assign the remaining 50',
      'Network & Infrastructure measure weights total 50 — assign the remaining 50',
    ]);
    expect(r.measureIssues.join(' ')).not.toContain('no measures assigned');
    expect(r.perspectiveCoverage).toEqual([
      { perspectiveId: 'p-fin', name: 'Financial', state: 'underweight', measureCount: 4, total: 50, delta: 50 },
      { perspectiveId: 'p-net', name: 'Network & Infrastructure', state: 'underweight', measureCount: 3, total: 50, delta: 50 },
    ]);
  });

  it('overweight totals report the excess to remove — distinct from underweight', () => {
    const weights = [{ perspective_id: 'p-fin', weight: 100 }];
    const measures = [
      { perspective_id: 'p-fin', weight: 80 },
      { perspective_id: 'p-fin', weight: 45 },
    ];
    const r = computeModelIntegrity(weights, measures, twoNames);
    expect(r.ok).toBe(false);
    expect(r.measureIssues).toEqual(['Financial measure weights total 125 — remove 25']);
    expect(r.perspectiveCoverage[0].state).toBe('overweight');
    expect(r.perspectiveCoverage[0].delta).toBe(25);
  });

  it('zero measures stays its own state', () => {
    const r = computeModelIntegrity(
      [{ perspective_id: 'p-fin', weight: 100 }], [], twoNames,
    );
    expect(r.measureIssues).toEqual(['Financial has no measures assigned']);
    expect(r.perspectiveCoverage[0]).toMatchObject({ state: 'no_measures', measureCount: 0, total: 0, delta: 0 });
  });

  it('valid totals within the server tolerance (±0.01) pass — fractional weights never misreport', () => {
    const r = computeModelIntegrity(
      [{ perspective_id: 'p-fin', weight: 100 }],
      [
        { perspective_id: 'p-fin', weight: 33.33 },
        { perspective_id: 'p-fin', weight: 33.33 },
        { perspective_id: 'p-fin', weight: 33.34 },
      ],
      twoNames,
    );
    expect(r.ok).toBe(true);
    expect(r.measureIssues).toEqual([]);
    expect(r.perspectiveCoverage[0].state).toBe('valid');
  });

  it('coverageState classifies all four states with the shared tolerance', () => {
    expect(coverageState(0, 0)).toBe('no_measures');
    expect(coverageState(2, 50)).toBe('underweight');
    expect(coverageState(2, 125)).toBe('overweight');
    expect(coverageState(2, 100)).toBe('valid');
    expect(coverageState(3, 99.995)).toBe('valid');
    expect(coverageState(2, 99.9)).toBe('underweight');
    expect(coverageState(2, 100.1)).toBe('overweight');
  });
});

/** Evidence-gap closure (20-min pass): gap 1 — a weight-0 ASSIGNED measure is underweight, never no_measures. */
describe('gap 1 — zero-weight assigned measure', () => {
  it('counts as assigned: underweight with the full 100 remaining, never "no measures"', () => {
    const r = computeModelIntegrity(
      [{ perspective_id: 'p-fin', weight: 100 }],
      [{ perspective_id: 'p-fin', weight: 0 }],
      new Map([['p-fin', 'Financial']]),
    );
    expect(r.perspectiveCoverage[0]).toMatchObject({ state: 'underweight', measureCount: 1, total: 0, delta: 100 });
    expect(r.measureIssues).toEqual(['Financial measure weights total 0 — assign the remaining 100']);
    expect(coverageState(1, 0)).toBe('underweight');
  });
});

/** P2 — server semantic codes render through the ONE client formatter. */
describe('P2 — authoritative server coverage codes', () => {
  it('renders the corrected messages from codes + params for 0-measures, 50, 125 and 100 totals', () => {
    expect(serverCoverageLabel({ code: 'NO_MEASURES', perspective_id: 'p1', name: 'Financial', total: 0, delta: 0 }))
      .toBe('Financial has no measures assigned');
    expect(serverCoverageLabel({ code: 'MEASURE_WEIGHTS_UNDER_100', perspective_id: 'p1', name: 'Financial', total: 50, delta: 50 }))
      .toBe('Financial measure weights total 50 — assign the remaining 50');
    expect(serverCoverageLabel({ code: 'MEASURE_WEIGHTS_OVER_100', perspective_id: 'p1', name: 'Financial', total: 125, delta: 25 }))
      .toBe('Financial measure weights total 125 — remove 25');
    expect(serverCoverageLabel({ code: 'MEASURE_WEIGHTS_VALID', perspective_id: 'p1', name: 'Financial', total: 100, delta: 0 }))
      .toBeNull();
  });

  it('numeric params arrive as strings from Postgres jsonb — still rendered exactly', () => {
    expect(serverCoverageLabel({ code: 'MEASURE_WEIGHTS_UNDER_100', perspective_id: 'p1', name: 'Financial', total: '50', delta: '50' }))
      .toBe('Financial measure weights total 50 — assign the remaining 50');
  });
});
