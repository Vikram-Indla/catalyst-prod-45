/**
 * CFG-005 — effective roles vs explicit grants.
 *
 * The Assignments list reads strata_role_assignments (explicit grants). A user
 * can also hold strata_admin through the platform-admin bypass
 * (strata_is_admin() → public.user_roles.role = 'admin'): real and
 * server-enforced, but with no row in the table the list queries — so the page
 * said "You are strata_admin" while showing no such assignment.
 *
 * This derives a clearly-labelled display row for that case. It never writes
 * anything and is only computable for the signed-in user (the roles hook is
 * self-scoped); other bypass-holding users are out of client reach without a
 * new RPC, which is documented as a follow-up, not faked here.
 */

export interface EffectiveRoleRow {
  id: string;
  user_id: string;
  role: string;
  scope_type: string;
  scope_entity_id: null;
  granted_by: null;
  /** null — a derived role has no grant event to date-stamp. */
  granted_at: null;
  /** Marks the row as derived from the platform-admin bypass, not a grant. */
  derived: true;
}

export function deriveEffectiveAdminRows(
  myUserId: string | null | undefined,
  myRoles: string[] | undefined,
  explicit: { user_id: string; role: string }[],
): EffectiveRoleRow[] {
  if (!myUserId || !myRoles?.includes('strata_admin')) return [];
  const hasExplicit = explicit.some((a) => a.user_id === myUserId && a.role === 'strata_admin');
  if (hasExplicit) return [];
  return [{
    id: `derived-strata-admin-${myUserId}`,
    user_id: myUserId,
    role: 'strata_admin',
    scope_type: 'platform',
    scope_entity_id: null,
    granted_by: null,
    granted_at: null,
    derived: true,
  }];
}
