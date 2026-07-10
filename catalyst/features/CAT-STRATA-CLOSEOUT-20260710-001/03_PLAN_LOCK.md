# PLAN LOCK — CAT-STRATA-CLOSEOUT-20260710-001

**Status:** DRAFT — awaiting Vikram approval. **No code until approved.**
**Branch:** main (single-track model per CAT-STRATA-CONSOLIDATE-20260710-001)
**DB:** staging cyijbdeuehohvhnsywig only; prod untouched. Migration files committed with exact-version ledger rows (MCP apply + manual ledger insert, per established discipline).

## Objective
Close the five last-mile gaps from the closeout critique, in the user's priority
order, under the placement doctrine: **policy/config → `/strata/admin`; runtime
artifacts/actions → area surfaces.**

## Discovery evidence (2026-07-10, verified live)
- `boardPack.ts` fully renders PDF+PPTX client-side; Reviews page calls it; jsPDF/pptxgenjs already in deps. The only stub is persistence: tooltip "Download ships with board-pack generation" (StrataReviewsPage.tsx:1004); rows keep `storage_path` empty.
- Reviews page already renders a working "open" button when `storage_path` is an http URL (line 993) — persistence slots straight in.
- No `strata-board-packs` bucket on staging (19 buckets checked); repo has an established `storage.from()` upload pattern (wikiUpload.ts et al.).
- `strata_board_packs` UPDATE is RLS-restricted to strategy_office (code comment, Reviews:497); INSERT/SELECT policies to be read before W1 build.
- RBAC bug confirmed: `DECISION_AUTHOR_ROLES = ['strategy_office','executive_viewer','vmo_validator','strata_admin']` (StrataReviewsPage.tsx:105); Command Center `ADVISORY_ROLES` also includes executive_viewer (StrataCommandCenterPage.tsx:218) — intent to be verified (advisory may legitimately be read-adjacent).
- Zero notification code exists in src/modules/strata (grep: only profile email field).
- Role model: 6 roles in types.ts:131; `strata_role_assignments` has scope_type/scope_entity_id (unused by UI so far).

## Waves (each ≤2h, one commit per slice)

### W1 — Board-pack persistence + distribution (P0, user's top priority)
- **Migration**: create private bucket `strata-board-packs` + storage.objects RLS
  (SELECT: any holder of a strata role; INSERT/UPDATE: strategy_office, strata_admin).
  Verify/extend `strata_board_packs` INSERT policy so generation can create the row
  when no pending row exists.
- **boardPack.ts**: return the artifact as a Blob (`doc.output('blob')` /
  `pptx.write('blob')`) alongside the existing local download — no behavior removed.
- **Reviews page**: after generation, upload blob to `strata-board-packs/<snapshot_key>/<filename>`,
  set `storage_path` + `status='ready'` (insert row if none pending), keep verbatim-error surfacing.
  Download action uses a signed URL (bucket is private — never a public URL).
- **AC**: generate → row `ready` with storage_path → hard reload → download works;
  second user with a strata role can download; user without role cannot (RLS probe).
  Screenshot of pack list with working download.

### W2 — executive_viewer becomes truly read-only (P0, RBAC correctness)
- Remove `executive_viewer` from `DECISION_AUTHOR_ROLES`; audit `ADVISORY_ROLES`
  usage on Command Center — if it gates writes, remove; if display-only, keep and document.
- Grep migrations for `executive_viewer` in RPC/RLS write paths; if DB allows writes, authored migration tightens it (staging apply).
- New guard test pinning: author-role lists exclude executive_viewer.
- **AC**: guard test green; DOM probe — executive_viewer sees Reviews but no author/transition buttons.

### W3 — Notifications MVP, in-app only (P1) — two slices
- **3a (schema + admin policy)**: migration for `strata_notification_rules`
  (event_type, audience_role, channel='in_app', enabled, governance envelope) +
  `strata_notifications` (user_id, event_type, entity_table/entity_id, title, body,
  read_at). DB triggers emit notifications for: config change → pending_approval;
  decision/action assigned; action overdue (due_date passed, nightly check deferred — trigger on write only this slice); blocker dependency opened; benefit value submitted (validator notified).
  Admin panel gains **Notifications** section (13th) following the governed-section pattern (JiraTable + StrataFormModal + RPC-only mutations).
- **3b (delivery surface)**: unread badge + panel on the STRATA shell (canonical
  Atlaskit components only), mark-read, deep links. No polling loops beyond
  react-query defaults.
- **AC**: creating a pending change request notifies approver-role holders; assigning an action notifies the owner; badge count truthful; empty state canonical.

### W4 — "Needs your attention" inbox on Command Center (P1)
- Panel aggregating: pending approvals (change_requests), my open/overdue actions,
  validations where I'm validator, blockers I own. Read-only, deep links. Reuses W3 queries where possible.
- **AC**: seeded staging data surfaces the regulator blocker + pending validation for the right users; zero-state renders canonically.

### W5 — Period-close readiness checklist (P2, advisory-only this feature)
- Pre-lock checklist on the Reviews lock flow: KPI actuals coverage for the period,
  benefit values submitted, open decisions/actions count. **Warnings only** — hard
  gating becomes an admin-panel policy later (deferred, logged in 09_DECISIONS).
- **AC**: checklist values match SQL ground truth on seeded data; lock still possible with warnings shown.

## Files to modify (expected)
`src/modules/strata/lib/boardPack.ts` · `src/modules/strata/pages/StrataReviewsPage.tsx` ·
`src/modules/strata/pages/StrataCommandCenterPage.tsx` · `src/modules/strata/pages/StrataAdminConfigPage.tsx` ·
`src/modules/strata/hooks/useStrata.tsx` · `src/modules/strata/domain/index.ts` · `src/modules/strata/types.ts` ·
new `src/modules/strata/__tests__/rbac.guard.test.ts` · new migrations under `supabase/migrations/`.

## Forbidden
- No public bucket for packs. No email/Slack senders. No hand-rolled UI (bell/panel/tables use Atlaskit/canonical). No bare colors (`lint:colors:gate` + `audit:ads:gate` must stay at baseline). No `:id` routes. No prod DDL. No changes to okr/objectives legacy paths (deleted; redirects stay). No scope creep into Jira sync or scenarios.

## Micro-interaction ACs
The 8-point list from CAT-STRATA-FOUNDATION 03_PLAN_LOCK applies to every UI slice (hover, focus ring, loading, empty states, ≤200ms transitions, mutation feedback via invalidate+error paths, drilldown continuity, tooltips).

## Validation per wave
`npx tsc --noEmit` · `npx vitest run src/modules/strata` (Node 20.12 needs styleText shim) · `npm run lint:colors:gate` · `npm run audit:ads:gate` · DOM probe on staging data · screenshots for UI acceptance (signoff gate).

## Stop conditions
Regression signal on non-STRATA surfaces → RED FLAG protocol. Ledger/project-ref mismatch → STOP. Context health low → handover per template.
