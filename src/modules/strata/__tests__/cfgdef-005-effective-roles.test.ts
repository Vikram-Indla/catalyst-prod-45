/**
 * CFG-005 — the Assignments list must show the signed-in user's effective
 * strata_admin when it is held via the platform-admin bypass (no
 * strata_role_assignments row), clearly labelled as derived, and must never
 * duplicate or fabricate rows.
 */
import { describe, expect, it } from 'vitest';
import { deriveEffectiveAdminRows } from '../lib/effectiveRoles';

const explicit = [
  { user_id: 'u-jk', role: 'strategy_office' },
  { user_id: 'u-jk', role: 'kpi_owner' },
  { user_id: 'u-vk', role: 'strategy_office' },
];

describe('deriveEffectiveAdminRows (CFG-005)', () => {
  it('derives a labelled strata_admin row for a bypass-only admin — the QA repro', () => {
    const rows = deriveEffectiveAdminRows('u-jk', ['strategy_office', 'kpi_owner', 'strata_admin'], explicit);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: 'u-jk',
      role: 'strata_admin',
      scope_type: 'platform',
      granted_at: null,
      granted_by: null,
      derived: true,
    });
  });

  it('does NOT derive when an explicit strata_admin grant already exists', () => {
    const withGrant = [...explicit, { user_id: 'u-jk', role: 'strata_admin' }];
    expect(deriveEffectiveAdminRows('u-jk', ['strata_admin'], withGrant)).toEqual([]);
  });

  it('does NOT derive when the user does not hold strata_admin', () => {
    expect(deriveEffectiveAdminRows('u-vk', ['strategy_office'], explicit)).toEqual([]);
  });

  it('renders nothing while identity or roles are unknown — no assumption', () => {
    expect(deriveEffectiveAdminRows(null, ['strata_admin'], explicit)).toEqual([]);
    expect(deriveEffectiveAdminRows('u-jk', undefined, explicit)).toEqual([]);
  });
});
