import type { BenefitAssuranceStatus } from './types';

/**
 * Benefit-value assurance eligibility — the single client-side source of truth for which
 * realized values count toward realization. This MUST mirror the DB rule in
 * strata_calc_benefit_realization (migration 20260717160000_strata_assurance_vocabulary):
 *
 *   independently_validated + owner_confirmed (F-7) + accepted_with_exception (E-6)  → COUNT
 *   reported (no assurance yet) / rejected / reversed(superseded)                    → DO NOT COUNT
 *
 * The retired vocabulary ('pending' / generic 'validated') no longer exists; comparing against it
 * silently reported zero realization, which is why this is centralised and unit-tested.
 */
export const COUNTS_TOWARD_REALIZATION: ReadonlyArray<BenefitAssuranceStatus> = [
  'independently_validated',
  'owner_confirmed',
  'accepted_with_exception',
];

/** True when a realized value in this assurance state is eligible to count toward realization. */
export const countsTowardRealization = (status: BenefitAssuranceStatus): boolean =>
  COUNTS_TOWARD_REALIZATION.includes(status);

/** `reported` = submitted with no assurance yet, i.e. awaiting attestation. rejected/reversed are
 *  terminal and do not "await" anything. */
export const awaitsAssurance = (status: BenefitAssuranceStatus): boolean => status === 'reported';
