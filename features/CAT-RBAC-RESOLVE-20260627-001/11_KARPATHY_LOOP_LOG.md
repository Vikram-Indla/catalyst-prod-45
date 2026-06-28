# 11 — Karpathy Loop Log

## Loop 1 — backfill source
- Hypothesis: backfill from legacy user_roles (app_role).
- Experiment: query user_roles distribution (cyij).
- Measure: 2 rows / 61. Dead. profiles.role (text) is the real signal.
- Keep/Discard: DISCARD user_roles source. Pivot to profiles.role. (→ DRIFT-1)

## Loop 2 — mappability
- Hypothesis: profiles.role maps 1:1 to product_roles.code.
- Experiment: list 26 product_roles + 7 distinct profiles.role values.
- Measure: only 3/61 map cleanly; product_roles is a job-title taxonomy, no user/PM/admin tiers.
- Keep/Discard: DISCARD 1:1 assumption. Escalate mapping policy to Vikram.

## Loop 3 — baseline safety
- Hypothesis: mapping unmapped users to `developer` risks over-grant.
- Experiment: count Allow/Deny for developer, super_admin, backend_architect.
- Measure: developer = 32 Deny / 0 Allow. Only super_admin all-Allow.
- Keep/Discard: KEEP developer as safe baseline. Backfill is parity-safe.

## Loop 4 — applied backfill + parity proof
- Hypothesis: backfill preserves effective permissions.
- Experiment: apply mapping; count users holding any Allow-bearing role.
- Measure: after_unmapped=0; users_with_any_allow=1 (the admin only).
- Keep/Discard: KEEP. Phase 0 complete, parity proven.

## Loop 5 — onboarding write-path (Phase 1)
- Hypothesis: invite-accept/user-update can write user_product_roles + propagate department.
- Experiment: edit functions, deploy to cyij, run real invite→accept.
- Measure: profiles(role+dept+APPROVED), user_roles, user_product_roles all written. Also found
  handle_new_user seeds profiles only (old user_roles.update was a no-op) + department_id is real.
- Keep/Discard: KEEP. Phase 1 complete.

## Loop 6 — RPC cutover scope (Phase 2)
- Hypothesis: rewrite check_permission to read product_role_permissions granular Allow/Deny.
- Experiment: inspect product_role_permissions columns + usePermission call sites.
- Measure: matrix keyed by free-text permission_group; callers pass (entity_type, action). No
  mapping between the vocabularies. Granular cutover BLOCKED (needs product-owned mapping).
- Keep/Discard: DISCARD granular wiring. Pivot to the safe, real subset: source full-access from
  super_admin product role + legacy fallback.

## Loop 7 — super_admin-sourced gate (Phase 2 delivered)
- Hypothesis: sourcing admin determination from super_admin preserves parity.
- Experiment: apply RPC; grant/revoke super_admin to a non-admin; count true across 61 users.
- Measure: product path proven (false→true→false); can_users = 1/61 = the admin. Parity exact.
- Keep/Discard: KEEP. Phase 2 complete; Phase 3 (granular) raised as blocked.
