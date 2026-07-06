# Release Operations — Admin Manual

For administrators and engineers operating, troubleshooting, and extending Release Ops.

## 1. Data model overview
16 `rh_*` tables. Core: `rh_releases`, `rh_changes`, `rh_change_release_links` (m2m, forward source of truth; legacy `rh_changes.release_id` kept), `rh_sop_templates` + `rh_sop_template_steps`, `rh_sop_steps` (execution), `rh_change_signoffs` + `rh_release_signoffs`, `rh_emergency_overrides`, `rh_freeze_windows`, `rh_production_events` (JSONB snapshots), scope links (`rh_release_brs`/`_sprints`/`_work_items`), `rh_readiness_checks`, `rh_notify_subscribers`. Issue lineage on `incidents`/`tm_defects`: `source_release_id`, `source_change_id`, `source_sop_step_id`, `source_production_event_id`, `raised_during_change_execution`.

## 2. Release ↔ change relationship
Many-to-many via `rh_change_release_links` (unlink is soft via `unlinked_at`). Reads union the m2m links with the legacy `release_id`. A change may exist with no release; a production change with none must carry `prod_no_release_justification`.

## 3. SOP template administration
`/release-hub/sop-templates`. Templates carry ordered steps with type, default role, offset/duration, and commit/evidence/mandatory/rollback flags. Technical step types default commit-required. An **active** template needs ≥1 step. Applying a template to a change copies steps into `rh_sop_steps` with computed planned times (append or replace-not-started; executed steps preserved).

## 4. Sign-off configuration
Gates live in `rh_change_signoffs` / `rh_release_signoffs` (role, assignee, status, due, comment, `emergency_override_id`, `depends_on_signoff_id`). Requested via `useRequestSignoff` (duplicate-pending guard). Approve/reject via `useSignoffAction` — reject requires a comment; approver identity is the authenticated user.

## 5. Emergency override governance
`rh_emergency_overrides` (scope, change/release/signoff ref, bypassed_gate, reason, status, requested_by/approved_by/rejected_by, audit_payload). RM/CM request; PO/Admin decide with a mandatory comment. Approval flags `rh_changes.is_emergency_override`. The original gate is never deleted.

## 6. Freeze-window governance
`rh_freeze_windows` (env, start/end, scope, reason, status). Conflict is evaluated client-side against the change/event window + env match; blocks scheduling unless an approved override exists. `lib/release-ops/lifecycle.ts` enforces the freeze + approval gates on transitions.

## 7. Production event generation
Release→completed auto-inserts an event (`useUpdateReleaseStatus`). Change-level events are generated/refreshed **manually and safely** via the Change Detail **Generate/Refresh prod event** button (`useGenerateProductionEvent`) — one event per change (keyed on `change_id`), so no duplicates; it rebuilds commit/evidence/approver JSONB snapshots from current data.

## 8. Replay audit model
`useProductionEventReplay(eventKey)` reconstructs the deployment read-only (never mutates history): context, scope (stored snapshot preferred, else reconstructed + labelled), SOP timeline, commit/evidence ledgers with audit-gap warnings, sign-off/override/freeze trails, issue trail, deterministic executive summary (explicitly "not AI"), and closure. Route `/release-hub/production-events/:eventKey` (event_key → id fallback).

## 9. Incident/defect lineage
Contextual raise reuses the global create flows (`CreateIncidentModal` + `useCreateIncident`; `CreateStoryModal` `defaultWorkType='QA Bug'` → `tm_defects`) and writes `source_*` lineage after creation. `tm_defects.project_id` FKs `tm_projects` (not `projects`).

## 10. User/role assumptions
Actionability is gated by `useReleaseOpsPermissions().canManage` (admin OR program_manager OR team_lead OR product_owner). Non-managers get read-only views with actions hidden/disabled. Strict per-approver-per-gate authorization is **not** enforced (deferred).

## 11. RLS/auth limitations
`rh_*` reads are authenticated-all; writes are manager/owner via `rh_is_manager()`/`rh_is_approver()`. `rh_sop_steps` has RLS effectively open for reads on staging. Verify RLS before production.

## 12. Environment/staging caveats
All work targets staging **cyij** (`cyijbdeuehohvhnsywig`). Prod (`lmqw…`) only on explicit instruction. The live app connects to cyij.

## 13. Demo seed data (staging only, not committed)
CHG8841 (rich: 9 SOP steps, sign-off gates all states, approved override, PE-8841); CAT-CHG-21 (unlinked prod, freeze block, requested override); CAT-CHG-19 (clean). Releases: 8 July, Q3 Platform. Template `cccc0000-…-01`. Issues INC-154 + DEF-RO-8841. IDs prefixed `dddd0000`/`eeee0000`. Re-runnable via the SQL in the phase proof docs.

## 14. Known deferred items
Change-level auto-generation trigger; release-level roll-up; point-in-time stored snapshots; Incident/Defect detail context panel; For-You per-card issue badge; PDF export; per-approver authorization. (See final acceptance report §12.)

## 15. Operational support checklist
Verify: sidebar renders all Release-Ops nav; change list flags; a change cockpit loads with markers/timer; SOP runbook actions work; sign-off queue graph loads; timeline/calendar/board render; a production event opens replay. Run gates: `npx tsc --noEmit`, `npm run build`, `npm run lint:colors:gate`, `npm run audit:ads:gate`.

## 16. Post-deploy verification
Open a seeded change (`/release-hub/changes/chg8841`), confirm cockpit + SOP + sign-off + issues render; open PE-8841 replay; confirm no drawers open on any row/card click.

## 17. Troubleshoot empty For You
For You is `ForYouPage.atlaskit.tsx` (NOT the dead `ForYouPage.tsx`). The Change-execution section only renders when the logged-in user owns SOP steps (`rh_sop_steps.owner_id = auth.uid`) or manages a change. Assign a step to the user to see it.

## 18. Troubleshoot missing replay data
If replay shows "Reconstructed" scope or audit gaps, the stored JSONB snapshot is thin — click **Refresh prod event** on the change to rebuild snapshots. If the event is not found, check `event_key` (the route falls back to `id`).

## 19. Troubleshoot gate failures
The ADS `tokens` category is noisy (over-counts legitimate `var(--ds-*)`); it may be ratcheted. `typography`/`spacing`/`fontImports` increases need Vikram approval — fix rather than bump: sentence-case labels (no `textTransform:uppercase`), and use `<div role="heading" aria-level>` instead of `<h1>` when the font-size is a `var()` token (the px-based enforcer rejects token headings). Never run `scripts/codemod-fix-spacing.cjs` — it rewrites the whole `src` tree.

## 20. Safely extend Release Ops later
Reuse the existing hooks (`useChangeCockpit`, `useSopRunbook`, `useSignoffGraph`, `useMyExecutionWork`, `useProductionEventReplay`) and the shared `['release-hub']` query-key invalidation so every surface stays consistent. Additive migrations only, staging-first, slug contract for new URL-navigated tables, ADS tokens only, no drawers, no Folio/wiki.
