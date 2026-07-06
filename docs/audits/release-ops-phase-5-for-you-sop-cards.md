# Release Ops — Phase 5: For You SOP Execution Cards + Notifications

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 5
**Date:** 2026-07-06 · **DB:** staging cyij · **Build:** `tsc` clean · `npm run build` PASS. No drawers.
**Scope:** personal Release-Ops execution feed on For You. Reuses Phase 4 execution hooks; no migration.

## Files delivered
- `src/hooks/useMyExecutionWork.ts` (new) — personal feed aggregate: assigned SOP steps (`rh_sop_steps.owner_id = auth.uid`), managed changes (`change_manager_id`/`release_manager_id = me`), change/release/freeze context, day-of-change set, and derived execution **prompts** (the notification event model). SOP steps are the source of truth — never mirrored into work items.
- `src/components/releasehub/foryou/ReleaseOpsForYouSection.tsx` (new) — "Change execution" section: prompts (SectionMessage), day-of-change hero cards, assigned SOP step cards (markers + data-driven timer + capture + actions), and a manager "Changes you manage" overview. Actions reuse `useSopStepAction` so For You ↔ Change Detail stay in sync.
- `src/pages/ForYouPage.atlaskit.tsx` — mounts the section under the "For you" heading. (Note: the **live** For You page is `ForYouPage.atlaskit.tsx`; `ForYouPage.tsx` is dead/legacy.)

## Section behaviour (§2, §9)
Renders only when the user has execution involvement (assigned steps or managed changes) or active prompts — keeps For You uncluttered for everyone else. **Assignee view:** assigned SOP step cards + personal timers + direct actions. **Manager view** (change/release manager): a "Changes you manage" list with SOP progress + running step + markers, plus day-of-change. Role detected from direct ownership fields (`owner_id`, `change_manager_id`, `release_manager_id`).

## SOP step card (§3)
Change number (→ detail), title, linked release(s) / "no release", target env, step #+title, type, assigned role, planned/actual window, status, risk/emergency/unlinked/freeze markers, missing-commit/missing-evidence chips, blocker reason. Card left-border colour = timer state. States rendered: Upcoming / Ready / Running / Overdue / Blocked / Failed / Done / Skipped (+ emergency/freeze markers).

## Timer (§4)
Data-driven, same formula as the Change Detail runbook: countdown before planned start ("Starts in 35m"), elapsed/remaining while running ("15m left"), overrun ("Overdue 30m"), actual duration when done, time-before-block/fail. Multiple-running → prompt warning. Never faked.

## Actions (§5) + commit/evidence (§6)
Per state: Upcoming/Ready → Start / Block / Skip; Running → Mark done / Block / Fail + inline capture (commit for the step's technical type, evidence URL, actual result, Save); Blocked → Resume / Fail. All call `useSopStepAction` — start stamps actual start, done/fail stamp actual end, block/fail/mandatory-skip require a reason, done requires commit (commit-required) / evidence (evidence-required) / actual result (validation). Verified live: "Mark done" on a running step missing its commit was blocked with "This step requires a commit ID before it can be marked done."

## Notifications / prompts (§7)
Derived in-app prompt model (functional event model) — computed from step + change state, deduped (step-level keyed on step; change-level emergency/freeze/multiple-running keyed on change), capped to the top 4, each linking to the change. Kinds: due-soon, overdue, next-up, missing-capture (near planned end), blocked-upstream, emergency, freeze, multiple-running. Persisted/push delivery deferred (documented) — the event model + visible prompts satisfy the Phase 5 requirement.

## Day-of-change (§8)
Prominent card(s) for changes today the user owns a step in, manages, or that are running — showing number/title, release(s), env, planned window, SOP progress %, running step, role marker, and risk/emergency/freeze markers.

## Risk markers (§10)
Production, high/critical risk, emergency override, unlinked production, freeze (block vs override-approved), missing commit/evidence — consistent with Change Detail. Emergency and unlinked-production never look normal.

## Empty/broken states (§11)
No assigned steps → clean explanatory state (assignees only). No planned time → "No planned time". Unlinked production → "no release". Missing commit/evidence → chips before the user attempts done. Multiple running → prompt. All states explain what/why/next; no blank panels.

## Change Detail sync (§12)
Actions mutate the same `rh_sop_steps` record via `useSopStepAction`, which invalidates the shared query keys (`sop-runbook`, `sop-steps`, `changes`, `my-execution`) — For You and Change Detail never disagree; a step started in For You shows running in the runbook and vice versa.

## Deferred to Phase 6+
Persisted/push notification delivery, execution calendar, timeline/board redesign, sign-off dependency graph, incident creation modal (link/marker only now), production event replay, training manual.

## ADS compliance
Canonical only (ads/SectionMessage, CatalystAvatar-style, @atlaskit textfield, catalystToast). Zero bare colors (grep clean). No drawers — all inline cards + toasts.
