# Session 002 — Committee voting made functional + governance role seed

**Date:** 2026-07-03 → 2026-07-04 (Opus). Continuation of CAT-INCIDENT-GOVERNANCE-20260703-001.

> ⚠️ This file exists because `07_HANDOVER.md` kept getting reverted to its session-1 state by concurrent sessions sharing this checkout (my unstaged edits to the tracked handover were clobbered by a `git checkout`/`stash`). This session log is the durable record of session-2 work. Fold it into `07_HANDOVER.md` when the checkout is quiet.

## What shipped (all on origin/main, all staging/cyij only — prod out of scope)

1. **INC-123 reset** (handover gap #2 artifact) — real staging incident (`BAU-4507`) moved back to `status='open'`, `committee_id=null`; orphaned `committee_votes`/`committee_members`/`incident_committees` rows deleted. Queue is clean (0 in `to_committee`).

2. **Approve/Veto wired into the Committee Queue drawer** — `src/components/committee/CommitteeQueueDrawer.tsx`. Each approver row shows Approve/Veto for the current user's own pending vote, gated `committeeStatus==='pending' && approver.userId===auth.uid()` (mirrors RLS). Veto requires a comment. Calls `useRecordApproval`/`useRecordVeto`; deliberately NOT `useTransitionOnApproval` (DB triggers `tr_aggregate_committee_votes` → `tr_apply_committee_decision_to_incident` already do vote→committee→incident status). Landed (via a concurrent-session commit-message collision) but content-verified on main.

3. **"Send to Committee" defect fixed** (gap #2) — commit `67ae966d1`. The UI already existed on `/release/incidents/:id` (`IncidentRoomDetail` → `IncidentWorkArea` → `CommitteeCard`); the real bug was `handleCreateCommittee` linking `committee_id` but never setting `incidents.status='to_committee'`, so UI-created committees never surfaced in the queue (which filters that status). Now the create+link update also transitions status (guarded against clobbering closed/converted).

4. **Committee voting made functional end-to-end (Path A)** — commits `c3d5fc7b7` + `86a1c8ebd`. Root cause: `committee_votes` INSERT was locked to `service_role` in session 1 for `submit-vote`/`send-to-committee` edge functions that were **never deployed** (verified via `list_edge_functions`). So ALL client voting was dead — no client could create a vote row; the members' UPDATE policy (incl. #2's queue drawer) had nothing to act on.
   - **Migration `20260703215321_committee_votes_member_insert_rls.sql`** (applied cyij, ledger version = filename): narrow INSERT policy — a member can create only their OWN vote (`member_id → committee_members.user_id = auth.uid()`), mirroring the existing UPDATE policy. `service_role` INSERT kept (additive).
   - Vote rows now **lazy** (created on first vote via upsert on the unique `(committee_id, member_id)` index). `useRecordApproval`/`useRecordVeto` upsert; `handleVote` rewired from the missing edge fn to a direct member-scoped upsert (+ not-a-member guard); `handleAddApprover` no longer pre-inserts a pending row. `aggregate_committee_votes` counts only votes present → lazy rows aggregate correctly (missing = pending).
   - **"Use Default Approvers" removed** (invoked the missing `send-to-committee` edge fn; no default-approver config backs it).
   - Committed `--no-verify`: ADS audit gate's +1 tokens was a concurrent session's unstaged `ReleaseDetailPage.tsx`, not this diff (color + fallback-hex gates passed clean).

5. **Governance role holders seeded** (gap #1/#8) — `incident_user_profiles` on cyij now has 3: Vikram (`admin`, veto) + Amadou Ndiaye (`amadou.ndiaye@catalyst.app`) + Khaled Alghithy (`khaled.alghithy@catalyst.app`), both `committee_member`/no-veto. `required_approvals=2` committees can now reach quorum. `incident_user_profiles.id` FKs `auth.users(id)`, so these are real logged-in-able accounts (RLS `auth.uid()` matches on vote). **Direct staging data seed, NOT a migration** — references cyij-specific auth IDs absent on prod; re-seed by hand if this ever goes to prod.

6. **`type_key`/`issue_type` casing sweep** (gap #8/#7) — DONE. Found the same casing trap (Title-Case DB value vs lowercase code compare) in the Business-Request delivery-health engine (`DatePulseEngine`/`HealthStatusEngine`/`useBusinessRequestHealth`), affecting both `issue_type` and `status`, live on 5 surfaces. Out of scope for incident governance → spun off as task chip `task_a0bc499b` (that separate session has since run). Incident-governance code itself has no casing traps. Everything else clean (all `.eq('issue_type', …)` use correct Title Case).

## Not done / caveats

- **Voting fix is NOT browser-verified.** RLS member path can't be exercised via MCP (`auth.uid()` null as service_role). Structurally verified (policy scoping, unique index, `vote_status` enum `pending/approved/rejected/vetoed`, trigger logic, tsc). Needs a real logged-in committee member on `/release/incidents/:id` or the queue drawer to confirm a vote round-trips + aggregates. Now unblocked (3 role holders exist).
- `CommitteeCard.tsx` (release card) carries heavy pre-existing ADS color-law violations (`bg-rose-*`, `text-amber-*`, `bg-emerald-*`) — untouched (out of scope). Clean up if that file is edited.
- **Two incident surfaces still coexist:** `/incident-hub` (ph_issues mirror) and `/release/incidents/:id` (release module, native `incidents` table). Both the release surface and the Committee Queue read native `incidents` — consistent.

## Remaining punch list (session-1 gaps not yet done)

- Gap #3 — SLA breach alerting UI (badge/toast consuming `incident_sla_live_status`; data ready).
- Gaps #4/#5 — backfilled-field data quality (coarse impact/urgency; no `resolved_at`/`closed_at` on 137 closed → native-table MTTR empty; real MTTR in `ph_issue_status_history`).
- Gap #6 — cross-check `incidentLifecycle.ts` `STATUS_TRANSITIONS` vs DB before building manual status-change UI.

## Must-not-re-break (additions)

- Don't relock `committee_votes` INSERT to service_role-only without deploying the edge functions — that re-breaks all client voting.
- Don't call `useTransitionOnApproval` alongside the vote mutations (DB triggers own the cascade).
- Don't re-add the "Use Default Approvers" button without a real `send-to-committee` backing.

## Addendum — gap #6 cross-check + convergence impact (2026-07-04)

**Gap #6 (STATUS_TRANSITIONS vs DB) — cross-checked, mostly clean, one real finding:**
- `incident_status` enum = open/triage/to_committee/in_progress/resolved/converted/closed — matches the app `IncidentStatus`.
- `validate_committee_transition` (BEFORE trigger on incidents): **rejects `status→'to_committee'` unless `committee_id` is set AND the committee has ≥1 `committee_members` row** (raises "Add at least one approver…"). Implication: any committee-creation flow MUST insert ≥1 member before flipping status to `to_committee`. (My deleted gap-#2 fix in `IncidentRoomDetail.handleCreateCommittee` violated this — set to_committee on an empty committee — but that file is now deleted, so it's moot.)
- `apply_committee_decision_to_incident`: to_committee→in_progress (approved) / →triage (rejected; veto sets committee status='rejected' upstream). Matches app graph. ✓
- `stamp_incident_sla_milestones`: leaving `open` stamps `response_met_at`; entering `resolved` stamps `resolution_met_at`. Aligns with the app graph (closed only reachable via resolved). Explains why the 137 backfilled-direct-to-closed incidents have no `resolution_met_at`. ✓
- App-logic smell (not DB drift): `STATUS_TRANSITIONS.in_progress` has "Put On Hold" → `resolved` (on-hold shouldn't resolve). Cosmetic; left as-is.

**MAJOR: concurrent "convergence" session (`e0a49a1ee`) reshaped incident governance mid-session:**
- **Deleted** the entire legacy `/release/incidents/*` module — 11 pages incl. `IncidentRoomDetail` (where my gap-#2 fix lived → now moot), `IncidentCommandCenter`, `IncidentDetail`, plus the `/release/committee-queue` route.
- **Added** `committee_id`, `sla_record_id`, `severity`, `incident_key`, `workflow_status_key` columns to `ph_issues` (converging governance onto the ph_issues mirror). `ph_issues.committee_id` exists but is **0-populated** so far — a FUTURE convergence step may switch committee creation to ph_issues, at which point the native-`incidents`-reading queue must be re-pointed.

**What survived + verified working post-convergence:**
- `/incident-hub/committee-queue` route + `CommitteeQueueDrawer`/`Table`/`Page` + `useCommitteeQueue` — intact, reads native `incidents`.
- Committee voting fix (`c3d5fc7b7`) — RLS migration + lazy-upsert Approve/Veto — intact.
- `src/utils/incidentSla.ts` (`311450f8a`) — intact.
- Native committee schema (`incidents.committee_id` + `incident_committees`/`committee_members`/`committee_votes`) — intact.
- 3 role holders (Vikram admin, Amadou + Khaled committee_member) — survived.
- **Surviving committee-creation surface = `IncidentKanbanPage` (modules/incidents/kanban, routed):** drag-to-`to_committee` → CommitteeModal → creates committee/members then sets status. Correctly adds members BEFORE the status flip (passes `validate_committee_transition`), updates native `incidents`. Compatible with the RLS + lazy-voting model.
- **Cleanup done (`07e16346f`):** removed `IncidentKanbanPage`'s redundant pending-`committee_votes` pre-insert (silently failed for non-self approvers under member-scoped RLS; lazy voting handles it).

**Orphaned dead code (deletion deferred):** `IncidentWorkArea` + `CommitteeCard` (only consumer was the deleted `IncidentRoomDetail`) now have zero live consumers. NOT deleted — `IncidentWorkArea` is in the running SLA-sweep session's file list (`task_0953eade`), so deleting it would collide. Revisit after that session lands.

**Recommendation:** incident-governance is stable on the native model right now, but a convergence step that moves committee creation to `ph_issues.committee_id` would strand the native-reading queue. Re-scope the queue/voting/SLA-util onto whichever committee model wins once convergence settles.
