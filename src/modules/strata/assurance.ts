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

/**
 * PB-DEF-009 — period-close readiness contract for a REALIZED value. This mirrors the server rule
 * in strata_needs_attention (migration 20260718100000): period close requires independent
 * assurance, so a realized value blocks close while it is only `reported` (no assurance) or
 * `owner_confirmed` (owner stands behind it, but not independently validated). Once
 * `independently_validated` or `accepted_with_exception` it is eligible; `rejected` / `reversed`
 * are terminal (they simply do not count and do not block). The server RPC is the enforcement
 * point — this is the client-visible contract of the same rule.
 */
export const blocksPeriodCloseReadiness = (status: BenefitAssuranceStatus): boolean =>
  status === 'reported' || status === 'owner_confirmed';
