# Execution log — CAT-STRATA-SC-GOVAPPROVAL-20260718-001 (2026-07-18)

## Slices delivered
1. **Migration** `supabase/migrations/20260718200000_strata_scorecard_governed_approval.sql` — states (`changes_requested`, `rejected`), submission/assignment metadata, `strata_scorecard_approval_tasks` (one-open partial unique index), status-guard trigger (GUC handshake), RLS widened to draft+changes_requested, shared validator, candidates+eligibility fns, submit/withdraw/request-changes/reject/approve/assign RPCs, generic-verb redirect, draft-version RPC hardening (approved-source only, monotonic version numbers), notification rules ×6, SoD registry update. Applied to staging `cyijbdeuehohvhnsywig`; ledger row `20260718200000` 1:1 with the file.
2. **API/types/hooks** — `configApi` verbs + candidates/validation/tasks readers; add/remove model perspective (RLS-gated table writes with zero-rows guard); widened `GovernedStatus`; new types; 3 read hooks.
3. **UI** (`ScorecardModelsSection` + `ScorecardLifecycleActions`) — submit/resubmit dialog (server checklist, approver chooser scoped to eligible candidates, resolved-approver line, note, concurrency token), pending banner with contract-mandated copy + attempt/assignee metadata, decision verbs for the assigned approver only, withdraw (submitter/admin), admin assign/reassign, changes-requested and rejected banners, add/remove perspectives in the weights editor, lazy approval-history panel (StrataAuditHistory), bell routing for `strata_scorecard_models`, KPI-library lozenge coverage for new states.
4. **Tests** — `scgov-approval-migration.guard.test.ts` (26 asserts on latest RPC bodies), `scgov-lifecycle-ui.test.tsx` (17 role/state UI tests); 4 existing suites' mocks extended (additive only); phase5 pending fixture now models the assigned approver (original intent preserved).

## DB proof suites (all rolled back; staging data untouched)
- PROOF-1 (9/9): generic submit/approve redirect; legacy pending not decidable without assignee; validation blocks submit; self/ineligible approver refused; superuser direct status UPDATE blocked by trigger; validator blockers on B2B v2; candidates exclude self+creator.
- PROOF-2 (12/12): assign → request-changes (empty comment refused) → same-version edit via RPC → resubmit (attempt 2, stale token refused, one open task) → submitter/unrelated approve refused → stale token at approve refused → approve = atomic activate + supersede + task completion → duplicate approval refused → 4 audit rows, notifications correct.
- PROOF-3 (10/10): non-submitter withdraw refused; admin withdraw cancels task → draft; resubmit; empty reject reason refused; reject terminal (no resubmit/edit/clone); post-rejection revision numbered v3; predecessor stayed active.

## Browser journeys (localhost:8080 served from THIS checkout; user = Vikram Indla; second identity Jahanara Khan via server-side impersonated RPCs)
- E2E model (SC GovApproval E2E, author Jahanara → approver Vikram): approver saw 3 verbs; Request changes (comment mandatory) → changes-requested banner + same version + editable; weights edited 65/35 in changes_requested; resubmit dialog as non-author showed "No eligible approver available" with confirm disabled; author resubmitted (attempt 2); Approve dialog (checklist all ✓, activation summary) → APPROVED; retired at cleanup.
- B2B Sector Scorecard v2 (the defect-pack subject): withdrew in browser → draft; added measures to both empty perspectives via Edit measures; resubmitted via dialog (8-item checklist all green, chooser listed only Jahanara, "Approval will be assigned to Jahanara Khan"); author-pending view = Withdraw + Reassign, NO decision verbs; Jahanara approved (server) → **v2 APPROVED / v1 SUPERSEDED** — the screenshot defect closed on real data.
- CEO Enterprise Scorecard v2 (legacy pending, no assignee): "Awaiting approver assignment" + admin-must-assign copy; admin Assign dialog → Jahanara; Jahanara rejected (reason) → REJECTED banner, terminal copy, v1 still active.
- Forbidden direct API (real browser token): approve-non-pending 400; edit-rejected-measures 400 (immutable); generic submit bypass 400 (redirect); direct PATCH status = RLS zero rows, row unchanged.
- Approval history panel: 10 append-only events with actor/timestamps/before-after/comments. Notification bell: 6 event types delivered to correct parties.
- Console: only pre-existing Atlaskit dev warnings (legacy context API/defaultProps); zero app errors. Keyboard: focus-visible traversal OK (plus AC-6 keyboard suites green).

## Known environmental notes
- ads-audit-gate (+9 tokens) and ads-color-strict-gate (+1 named) fail on a PRISTINE main checkout — pre-existing debt from hook-bypassing merge commits; my changed files are clean (changed-files gate ✅, both failures reproduced with all my changes stashed). Follow-up task chip spawned.
- 6 vitest failures (ac6-keyboard-decision-verbs ×2, rd-cycle4-fixes ×4) are pre-existing on pristine main; identical before/after across 3 consecutive runs.
- Chrome MCP window manager refused a true 1024×768 resize (min-width); no horizontal overflow at any tested width; dialogs are 600px.

---

# Session 002 — integrity states + incomplete-draft save (2026-07-18/19)

## Defect (user contract + screenshot)
Model Integrity reported "Financial has no measures assigned / Network & Infrastructure has no
measures assigned" while the measures editor held rows totalling 50/50, and Save was hard-blocked
("must total 100 before saving") so the incomplete draft could never persist.

## Root cause
1. The section computed `computeModelIntegrity` from PERSISTED rows only; the editor draft
   (local to `MeasureGroups`) was invisible → stale persisted validation mixed with live form rows.
2. Client-only save gate on per-group totals ≠ 100 (server RPC `strata_set_model_measures`
   deliberately has no totals gate — verified).

## Changes
- `src/modules/strata/lib/modelIntegrity.ts` — four DISTINCT coverage states
  (`no_measures` / `underweight` / `overweight` / `valid`) as structured
  `perspectiveCoverage`, ±0.01 tolerance mirroring the server, shared wording helper.
- `src/modules/strata/pages/StrataAdminConfigPage.tsx` —
  * `MeasureGroups` reports its live draft (rows + exact dirty flag) upward via a
    ref-guarded effect (deps = child-owned [editing, draft] ONLY — parent-render
    identities in deps caused an infinite render loop, caught by the component suite);
  * section holds `liveMeasures` per model: band validates LIVE rows while editing
    (labeled "△ Live — includes unsaved measure edits"), persisted rows otherwise;
  * submit blocked with "Unsaved measure edits — save or cancel…" while dirty;
    otherwise gated on PERSISTED integrity (server revalidates at submit/approve);
  * Save never blocked on totals; informational note "…incomplete — the draft can be
    saved, but submission stays blocked until every perspective totals 100";
  * group headers name the state: no measures / total N — assign the remaining R /
    total N — remove E / ✓ total 100.
- `supabase/migrations/20260718210000_strata_scorecard_measure_coverage_states.sql` —
  validator splits underweight ("assign the remaining N") from overweight ("remove N")
  for BOTH perspective totals and per-perspective measure totals; zero-measures message
  unchanged; wording byte-identical to the client. Applied to staging
  `cyijbdeuehohvhnsywig`; ledger row aligned to `20260718210000` (1:1 with file).
- Tests: `cfgdef-006` +5 (four states, screenshot repro 50/50, tolerance);
  `scgov-approval-migration.guard` validator assert now demands all four states AND
  that `strata_set_model_measures` has NO totals gate; NEW `scgov-live-integrity.test.tsx`
  (7 tests: persisted 4-state rendering, live revalidation labeled unsaved, cancel
  restore, save-incomplete enabled + RPC called + submit stays gated).

## DB proofs (staging, all rolled back)
- 4-state matrix probe on a scratch model: zero → "has no measures assigned";
  50 → "total 50 — assign the remaining 50"; 125 → "total 125 — remove 25";
  100 → passed "measure weights total 100". 
- Live model `efe4edd6-c518-4ce8-9539-a178592e5e15` ("wholesate 2026 score card", draft v1)
  after browser save of 50/50: validator blockers = the two underweight messages (client/server
  byte-identical); impersonated `strata_submit_scorecard_model` REFUSED with
  "submission blocked — 2 issue(s): …assign the remaining 50; …assign the remaining 50".

## Browser journey (localhost:8080 served from this checkout, user Vikram)
Screenshot-repro on the real defect model: added 2+2 measures totalling 50/50 in the editor —
band flipped LIVE per keystroke (0→"remaining 100", 20→"remaining 80", 25→"remaining 75"),
never "no measures assigned" once rows existed; Save ENABLED and persisted the incomplete
draft; after save the authoritative band shows the same two underweight blockers and submit
stays disabled ("Each perspective needs measure weights totalling 100 before submit");
overweight probed live (130 → "total 150 — remove 50") then cancelled — cancel restored
persisted validation, no Live label. Console: only the pre-existing Atlaskit legacy-context
dev warning; zero app errors.
