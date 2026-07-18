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
  draftSubmitBlockedReason,
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
