import { describe, it, expect } from 'vitest';
import type { BenefitAssuranceStatus } from '../types';
import { countsTowardRealization, awaitsAssurance, COUNTS_TOWARD_REALIZATION } from '../assurance';

// PB-DEF-003 / PB-DEF-009 — the client eligibility rule MUST mirror the DB
// strata_calc_benefit_realization (migration 20260717160000). These assertions are the
// contract; if the DB rule ever changes, this test must change with it.
describe('benefit-value assurance eligibility', () => {
  const ALL: BenefitAssuranceStatus[] = [
    'reported', 'owner_confirmed', 'independently_validated',
    'accepted_with_exception', 'rejected', 'reversed',
  ];

  it('counts owner_confirmed, independently_validated and accepted_with_exception', () => {
    expect(countsTowardRealization('owner_confirmed')).toBe(true);
    expect(countsTowardRealization('independently_validated')).toBe(true);
    expect(countsTowardRealization('accepted_with_exception')).toBe(true);
  });

  it('does NOT count reported, rejected or reversed', () => {
    expect(countsTowardRealization('reported')).toBe(false);
    expect(countsTowardRealization('rejected')).toBe(false);
    expect(countsTowardRealization('reversed')).toBe(false);
  });

  it('counts exactly three of the six states', () => {
    expect(ALL.filter(countsTowardRealization).sort()).toEqual(
      [...COUNTS_TOWARD_REALIZATION].sort(),
    );
    expect(COUNTS_TOWARD_REALIZATION).toHaveLength(3);
  });

  it('treats only `reported` as awaiting assurance', () => {
    expect(awaitsAssurance('reported')).toBe(true);
    for (const s of ALL.filter((x) => x !== 'reported')) {
      expect(awaitsAssurance(s)).toBe(false);
    }
  });
});
