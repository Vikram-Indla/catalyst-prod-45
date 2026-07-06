# Release Ops — Phase 4: SOP Templates + Execution Runbook

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 4
**Date:** 2026-07-06 · **DB:** staging cyij · **Build:** `tsc` clean · `npm run build` PASS. No drawers.
**Scope:** SOP Template list + create/edit + Change-level SOP Execution runbook. Builds on Phase 2 schema; no migration.

## Files delivered
- `src/hooks/useSopRunbook.ts` (new) — execution/template hooks: `useSopRunbook` (read + assignee names), `useSopStepAction` (validation-aware lifecycle), `useAssignSopStep`, `useReorderSopStep`, `previewTemplateSteps` + `useApplyTemplateWithTiming` (replace/append + computed timing), `useSopTemplatesFull` (rich counts), `useTemplateDetail`, `useUpsertSopTemplate`, `useSetTemplateActive`. Audit → `rh_change_activity_log` (best-effort).
- `src/components/releasehub/detail/SopRunbook.tsx` (new) — runbook summary + expandable steps + actions + capture + assignment + step timer + reorder + empty states.
- `src/components/releasehub/detail/ApplySopTemplateModal.tsx` (new) — select active template, timing preview, replace-not-started / append / cancel.
- `src/pages/releasehub/SopTemplatesPage.tsx` — rich list (step/mandatory/technical/evidence/rollback counts, est. duration, active state, activate/deactivate + edit, search + env/category/state filters, educational empty state).
- `src/components/releasehub/CreateSopTemplateModal.tsx` — create **and edit**; template fields (category/env/est-duration/risk/active) + full step editor (type, role, offset, duration, commit/evidence/mandatory/rollback flags) with up/down reorder; technical type auto-defaults commit-required; active template must have ≥1 step.
- `src/pages/releasehub/ChangeDetailPage.tsx` — SOP tab renders the runbook (`SopRunbook`).
- Deleted dead `SopExecutionTab.tsx` (superseded).

## Template list (§2)
Search + Environment/Category/State filters. Columns: name (+inactive badge), category, env, est. duration, **steps breakdown** (`N · mand · tech · ev · rb`), updated, actions (Edit, Activate/Deactivate). Row-click → edit. Educational empty state.

## Template create/edit (§3–4)
Template-level: name*, description, category, env, estimated duration, risk applicability, active. Steps: title, type (10 types), default role, offset, duration, commit-required, evidence-required, mandatory, rollback — with **up/down reorder** (sequence recomputed on save). Rules: name required; active template needs ≥1 step; technical type auto-sets commit-required; rollback steps visually marked (amber). Edit loads existing template + steps; save replaces template steps (executed change-steps already copied the fields, so safe). Deactivate keeps the template + history.

## Apply template to change (§5)
From runbook "Apply SOP template": select an **active** template (≥1 step), preview generated steps + computed planned times (from change planned start + step offset/duration), warn if no planned window or missing owners, choose **Append** or **Replace not-started** (executed steps preserved), confirm → generates executable `rh_sop_steps` copying all fields (type/role/repo/branch/command/expected/commit-required/evidence-required/mandatory + timing). Change Detail SOP summary updates immediately (shared query keys invalidated).

## Execution runbook (§6)
Summary: steps, done, mandatory, technical, blocked, failed, **missing-commit**, **missing-evidence**, **unassigned** counts; running/next step; **multiple-in-progress data-quality warning**. Each step row: seq, title, type, indicators (Commit/Evidence/Optional/Rollback/Issue), assignee avatar (or "Unassigned"), planned time, **step-level timer**, status. Expanded: description, repo/branch/script/command/expected, planned vs actual window, all commit fields, actual result, blocker; assignee picker; in-progress capture inputs; reason field; state-appropriate actions; reorder ↑↓. Rollback steps rendered amber.

## Status actions + validation (§7–8)
Pending/Ready → Start / Block / Skip. In-progress → Mark done / Block / Fail (+ Save capture). Blocked → Resume / Fail. Done/Skipped → Reopen (reason required). Start stamps `actual_start_at`+`started_at`+timer running; done/failed/skipped stamp `actual_end_at`+`completed_at`. **Validation (throws → toast):** block/fail need a reason; mandatory-skip needs a reason; done needs the required commit (commit-required), evidence (evidence-required), and actual result (validation steps). Commit captured per step type (frontend/backend/integration/database/configuration).

## Assignment (§9)
Per-step assignee picker (profiles); avatar+role shown; unassigned mandatory/technical counted in summary; template default owner pre-populates on apply. Data ready for Phase 5 For You (`rh_sop_steps.owner_id`).

## Timer (§10)
Step-level: countdown before planned start, elapsed + overrun while running, actual duration when done. Feeds the Change Detail summary timer (running step passed in). Multiple-in-progress → data-quality warning.

## Rollback (§12)
Rollback steps marked (amber + Rollback indicator), remain pending until needed; a failed step shows "Rollback step available below — start it to recover"; rollback executes like any step (captures result/evidence) for later production-event inclusion.

## Change Detail integration (§13)
SOP summary card already reads live runbook (`useChangeCockpit`); "Open execution →" jumps to the SOP tab; ExecutionTimer uses the running SOP step; missing-commit/evidence + blocked/failed surface in summary; applying a template updates immediately.

## Empty/broken states (§14)
No SOP (+ technical-production blocker), no planned times ("plan —"), unassigned, missing-commit/evidence counts, blocked/failed reason enforced, rollback visible, multiple-in-progress warning. No blank cards.

## Audit (§15)
Every step lifecycle change, assignment, reorder, commit/evidence update, and template apply writes an `rh_change_activity_log` line (actor + detail), visible in the Change Detail Activity tab and available for Production Event Replay later.

## Deferred to Phase 5+
For You SOP cards (uses this assignment data), execution calendar, production-event replay, sign-off dependency graph, notification center, incident **creation** modal (link/indicator only for now), drag-and-drop template reorder (up/down shipped), board/timeline redesign.

## ADS compliance
Canonical only (JiraTable, ads/Modal, ads/SectionMessage, CatalystAvatar, @atlaskit select/textfield/textarea/toggle/button). Zero bare colors (grep clean). No drawers.
