# PLAN LOCK — Phase 3 Slice S3: Admin — scoring model + roles matrix (read views)

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ self-approved (goal directive: complete the module, loop until built) 2026-07-11 · **Timebox**: 2h

## Objective
Replace `AdminPage.tsx`'s pure placeholder with real read views of the two admin surfaces that already have live governed data: the active scoring model + its drivers (`idn_scoring_models`/`idn_scoring_drivers`, seeded S3), and the ideation role-permission matrix (`admin_role_module_permissions` where `module_key='ideation'`, 26 real rows, D11).

## Non-scope (04 §C.9 has 6 sections — this slice builds 2, honestly)
- **Scoring model editing / "Publish v4" GovernedEnvelope flow** — blueprint rates this **L** effort on its own; a real versioned-publish-with-approval flow is its own slice, not bolted onto a read view.
- **Workflow section** — 04 says explicitly "no bespoke status editor," it's a deep-link to Workflow Studio; skip until Workflow Studio's ideation-scoped URL is confirmed to exist (unverified this slice — don't fabricate a link that 404s).
- **Intake channel toggles, AI capability toggles, Retention setting** — **none of these are backed by a real config table today.** Building toggle UI for settings with no persistence layer would be exactly the kind of fabricated control the zero-assumption rule exists to prevent. AI toggles specifically are premature — Phase 4 (AI Copilot) doesn't exist yet, so there is nothing real to toggle.
- **Role matrix editing** — read-only this slice; the existing `AdminAccessPage.tsx` pattern is the canonical place role access gets edited platform-wide, not a per-module fork.

## Design evidence
04 §C.9 ASCII mock, Scoring models + Roles rows only. Admin layout pattern cited: `pages/admin/AdminAccessPage.tsx` (visual conventions only, not reused as a component — that page is a different, larger surface).

## Canonical components
- `JiraTable` — roles matrix (26 real rows: role_code × access_level, proven fit for tabular admin data).
- `StatusLozenge`/plain badges — access_level pill (full/view/hidden).
- `HubPageHeader`, section headers matching `DetailPage.tsx`'s established uppercase-label pattern this feature already uses.
- No non-canonical components needed.

## Files to modify
- `src/hooks/useIdeationAdmin.ts` (new) — read the active scoring model + drivers, read the role-permission rows for `module_key='ideation'`.
- `src/modules/ideation/admin/AdminPage.tsx` — rebuild with the two real sections.

**Files forbidden**: `admin_role_module_permissions` writes (read-only this slice), any migration, any file outside the two above.

## Data rules
- Zero-assumption: if no `approved` scoring model exists, show that honestly (empty state), don't fabricate a default. Access-level badge colors: `full`→success, `view`→information, `hidden`→neutral — real ADS status tokens, not invented ones.
- ADS tokens only.

## Validation
- [ ] `npx tsc --noEmit` clean · `npm run lint:colors` 0 hits on touched files
- [ ] Screenshot: `/admin/ideation` showing the real Default model (2 drivers, weights 0.6/0.4, scale 0–5) and the real 26-row role matrix, light + dark

## Stop conditions
Any DB schema change or write path needed → stop, re-plan (this slice is read-only).

## Drift / rebaseline
None anticipated.
