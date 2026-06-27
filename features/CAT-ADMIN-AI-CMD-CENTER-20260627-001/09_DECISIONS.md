# 09 — Decisions

## D001 — Component location convention
**Decision:** Sub-components in `src/components/admin/ai-assistant/`, not a new sub-folder under `src/pages/admin/`.
**Why:** Repo convention is flat page files in `src/pages/admin/`. Components live in `src/components/admin/`. Existing pattern: RBAC components in `src/components/admin/rbac/`.
**Date:** 2026-06-27

## D002 — AiAccessPage.tsx stays as entry point
**Decision:** Keep `src/pages/admin/AiAccessPage.tsx` as the page file. Rewrite its contents rather than renaming the file. Route stays unchanged.
**Why:** Route is `/admin/ai-assistant`. Renaming would require route changes which are explicitly forbidden.
**Date:** 2026-06-27

## D003 — 3-column layout via CSS grid (custom)
**Decision:** Use CSS grid for the 3-column cockpit. No canonical Catalyst 3-column component exists in admin.
**Why:** Proof — no 3-column layout found anywhere in `src/pages/admin/`. Admin pages use 1-col or 2-col only. CSS grid is the correct tool.
**Date:** 2026-06-27

## D004 — Metric cards: adapt SummaryMetricCards pattern
**Decision:** Adapt the pattern from `src/components/releases/cycle-command-center/SummaryMetricCards` (inline, don't import from releases). Wire to useApprovedProfiles + useProductRoles + useAllRolePermissions + useCapacityDepartments for real data.
**Why:** Canonical SummaryMetricCards is tightly coupled to release-cycle data. A local adaptation is simpler and follows the "reuse pattern, not import" guidance.
**Date:** 2026-06-27

## D005 — Fix P0 bugs in edge function in same PR
**Decision:** Fix `role: 'developer'` hardcoding and `assign_product_role` delete-all in the same PR.
**Why:** These are blocking correctness issues for the whole feature. Deferring creates a state where the new UI shows a "Add Product Owner" plan but the backend silently resets roles.
**Date:** 2026-06-27

## D006 — app_role enum does NOT include 'developer'
**Decision:** Edge function bug confirmed — 'developer' is not in `app_role` enum. The correct approach is to use the `product_roles.code` value for the product role, and `app_role` for the system-level role (invite.role). These are DIFFERENT schemas.
**Why:** `user_invitations.role` = `app_role` enum (admin/program_manager/team_lead/user). `user_product_roles.role_id` = FK to `product_roles.id`. They are not the same field.
**Date:** 2026-06-27
