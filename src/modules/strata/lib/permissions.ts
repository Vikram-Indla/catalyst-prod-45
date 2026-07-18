/**
 * CFG-005 (final pack) — ONE canonical effective-permission decision for
 * Configuration surfaces.
 *
 * useStrataRoles() already returns the user's effective roles including
 * derived strata_admin (platform-admin bypass). The defect was downstream:
 * pages collapsed "roles unknown" (query loading/errored) into "no roles" and
 * asserted "Read-only for your role" as a definitive verdict. Tri-state fixes
 * that: null = unknown (claim nothing), false = genuinely read-only,
 * true = governance allowed. The UI is the explanation — RLS/RPC remain the
 * boundary either way.
 */

export type GovernanceVerdict = true | false | null;

/** Roles that govern config-engine records (perspectives, models, …). */
export const CONFIG_GOVERNANCE_ROLES = ['strata_admin', 'strategy_office'] as const;

/** Data-source governance additionally admits the Data Steward persona. */
export const DATA_GOVERNANCE_ROLES = ['strata_admin', 'strategy_office', 'data_steward'] as const;

interface RolesQueryLike {
  data?: string[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

function verdict(q: RolesQueryLike, allowed: readonly string[]): GovernanceVerdict {
  if (q.isLoading || q.isError || q.data === undefined) return null;
  return q.data.some((r) => allowed.includes(r));
}

export const canGovernConfig = (q: RolesQueryLike): GovernanceVerdict => verdict(q, CONFIG_GOVERNANCE_ROLES);
export const canGovernData = (q: RolesQueryLike): GovernanceVerdict => verdict(q, DATA_GOVERNANCE_ROLES);
