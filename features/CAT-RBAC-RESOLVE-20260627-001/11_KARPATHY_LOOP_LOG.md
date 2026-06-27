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
