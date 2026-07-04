# HANDOVER — CAT-INCIDENT-GOVERNANCE-20260703-001

**Date:** 2026-07-03
**Status:** DEV-COMPLETE on staging (cyij). Not deployed to prod. No Plan Lock was written before implementation — this session started as discovery-only + council, then escalated into live building on explicit "go" instructions from Vikram, turn by turn. Recording that process gap here rather than hiding it; see `09_DECISIONS.md` for the decision trail in place of a normal Plan Lock.

---

## 1. What this feature is

Incident Hub had two parallel systems: a read-only Jira mirror (`ph_issues`, issue_type='Production Incident', 152 real rows) and a fully-schemed but completely dormant native `incidents` table (severity/SLA/committee/veto governance, 0 rows, RLS wide open). Council verdict: don't replace the mirror (it's load-bearing across ~180 files of shared work-item infrastructure — JQL, filters, kanban, notifications, dependencies, Caty, workflow engine). Instead, make `incidents` a **governance extension**, FK'd 1:1 to `ph_issues` via `ph_issue_id`, carrying only what Jira can't: severity, SLA due/breach tracking, committee approval + veto workflow.

## 2. What's live on staging (cyij) right now

**Schema / migrations applied (in order):**
1. `lock_down_incidents_rls` — closed wide-open RLS (`qual=true`) on `incidents`, `committee_members`, `committee_votes`, `incident_committees`, `sla_records`, `incident_history`. Now gated on `incident_user_profiles.incident_role` (admin/committee_member) or self-service (assignee/reporter). System-only writes (votes, SLA, audit history) moved to `service_role`.
2. `incident_calculation_model` — trigger layer: `is_major_incident` auto-flag (was a dead column, defaulted false forever, never had a trigger), SLA recalc on severity change, committee-vote aggregation (veto = absolute override, else majority vs `required_approvals`), auto-transition of `incidents.status` on committee decision (`to_committee → in_progress` on approve, `→ triage` on reject/veto).
3. `incidents_extend_ph_issues` + `fix_incident_extension_issue_type_match` + `fix_incident_status_from_real_jira_status` — added `ph_issue_id` FK column + unique index, backfilled all 152 real Production Incidents into `incidents` (severity derived from Jira priority, status derived from real `status_category`: 137 `done`→`closed`, 15 `todo`→`open`), auto-extend trigger for future ph_issues rows.
4. `incident_sla_breach_detection` + `incident_sla_live_status_security_invoker` + `fix_incident_sla_live_status_default_breach_bug` — `response_met_at`/`resolution_met_at` auto-stamp on real status transitions; `incident_sla_live_status` view for real-time "currently breaching" on still-open incidents (fixed a bug where the view trusted a column that defaults to `false` on insert, masking all breaches — now correctly checks met_at first).

**Data state on staging right now:**
- `incident_user_profiles`: 1 row — `vikramataol@gmail.com`, `incident_role='admin'`, `has_veto_power=true`. Nobody else has a role. This is the single point of failure for the whole governance layer — see gaps below.
- `incidents`: 153 rows (152 backfilled + 1 pre-existing test artifact, see below). 15 open, 137 closed, 1 currently `to_committee` (INC-123, real incident, moved there for UI verification — not reverted, see below).
- `incident_sla_live_status`: 15 rows currently breaching (the 15 real open incidents — correct, they're old and unactioned).

**Code changed:**
- `src/utils/incidentLifecycle.ts` — removed dead/wrong `calculatePriority`/`getPriorityBreakdown`/`SLA_TARGETS` (unused everywhere, and didn't match the real DB formula). Kept `getAllowedTransitions`/`canConvertIncident` (both actually used, both verified correct).
- `src/hooks/useIncidentHub.ts` — `useIncidentListView` now enriches Jira rows with real severity/priority/is_major_incident/SLA-breach from the `incidents` extension table (falls back to old Jira-priority heuristic if no extension row exists yet). `useCommitteeQueueView` now queries real `incident_committees`/`committee_votes` instead of a hardcoded `return []` stub.
- `src/pages/incidenthub/CommitteeQueuePage.tsx` — rewritten. Was a hand-rolled duplicate table wired to the broken stub above; now thin wrapper around the pre-existing (and correct) `useCommitteeQueue()` hook + `CommitteeQueueTable` + `CommitteeQueueDrawer` components, which already had proper veto/majority logic and just weren't connected to anything live.
- `src/components/committee/CommitteeQueueTable.tsx`, `src/components/committee/CommitteeQueueDrawer.tsx` — fixed ADS color-law violations (Tailwind color utilities `bg-amber-100` etc., and legacy alias tokens like `var(--status-success)` that themselves resolve to hex-fallback chains) → direct `var(--ds-*)` tokens per the CLAUDE.md table.
- `src/routes/FullAppRoutes.tsx` — revived `/incident-hub/committee-queue`. **This route had been deliberately deprecated same-day** (comment: "route removed... /incident-hub/reports is the Production Incident report"). Flagged to Vikram before touching it; he confirmed reviving it. Worth knowing if another session/person re-deprecates it without context.

**Verified:**
- Full trigger chain tested via SQL (major-incident flag, SLA recalc, veto override, quorum approval, auto-transition) — all correct, rolled back test transactions except the two below.
- `tsc --noEmit` clean across the whole repo after every change.
- Color-law grep clean on all touched files.
- Live in browser: `/incident-hub/committee-queue` renders real data, no console errors, drawer opens with correct decision snapshot/approvers/timeline.

## 3. Known gaps / what's NOT done

1. **Ownership is a single point of failure.** Only Vikram holds `incident_role='admin'`. If anyone else needs to act on committees, they need a row in `incident_user_profiles` with an appropriate role — nobody else currently can.
2. **INC-123 is real, not reverted.** I moved a real staging incident (`BAU-4507`) into `to_committee` with Vikram as sole approver, to verify the UI end-to-end. It's sitting there now with 0/1 (needs 2) approvals. Either resolve it for real, or reset it: `update incidents set status='open', committee_id=null where incident_key='INC-123'` (and optionally delete the orphaned `incident_committees`/`committee_members` rows).
3. **`ph_issue_id`-linked governance defaults are coarse.** All 152 backfilled incidents got `impact='medium'`, `urgency='medium'`, `support_level='L1'` uniformly (no real signal existed for these in Jira) — so `priority` is P3 for all of them by construction, not a real signal yet. Severity is real (derived from Jira priority). Don't treat backfilled priority as meaningful until someone reviews/adjusts real impact/urgency per incident.
4. **No SLA breach *alerting*.** The DB now correctly computes "is this breaching right now" (`incident_sla_live_status`), but nothing surfaces it to a user yet — no toast, badge, or notification wired. That data is ready to consume; UI isn't built.
5. **Committee Queue page is functional but minimal.** No "Approve"/"Veto" buttons wired in the drawer yet (the mutations exist: `useRecordApproval`, `useRecordVeto`, `useTransitionOnApproval` in `src/hooks/useCommitteeQueue.ts` — page just doesn't call them). No "Send to Committee" action from the incident detail view either — the only way to get an incident into `to_committee` right now is direct SQL (as done for INC-123).
6. **Historical MTTR / migration path.** 137 "closed" backfilled incidents have no `resolved_at`/`closed_at` timestamps set (only `status`), so any MTTR calc against the native table for historical incidents will be wrong/empty. Real MTTR data lives in `ph_issue_status_history` (Reports Hub work, separate feature) — don't conflate the two.
7. **`incidentLifecycle.ts`'s `STATUS_TRANSITIONS` may not fully match the DB.** I verified `derive_incident_priority()` and SLA numbers against the DB and fixed the drift; I did NOT cross-check every status transition rule against DB triggers/constraints beyond what was needed for the committee auto-transition. Worth a pass if status-transition UI (buttons) gets built next.
8. **`type_key` mismatch class of bug likely elsewhere.** The bug that cost real time this session — filtering on `issue_type='production_incident'` (the `type_key`) instead of `'Production Incident'` (the actual stored `issue_type` string) — is an easy trap. If other features filter `ph_issues.issue_type` by type_key instead of display name, they'll silently match zero rows. Worth a grep sweep if anyone hits a similar "why is this empty" bug.

## 4. Immediate next steps, in priority order

1. Decide INC-123 — resolve for real or reset (see #2 above).
2. Wire Approve/Veto buttons in `CommitteeQueueDrawer` to the existing mutations.
3. Add "Send to Committee" action somewhere in the incident detail view (currently only reachable via SQL).
4. Name additional `incident_role` holders if more than one person needs governance access.
5. SLA breach alerting UI (badge/toast) consuming `incident_sla_live_status` — data's ready, no UI yet.

## 5. What must not be re-broken

- Don't re-flatten `incidents.status` defaults back to a blanket `'open'` on any future backfill — use real `ph_issues.status_category` (see gap #3 fix, `derive_incident_status_from_ph_issue()`).
- Don't trust `sla_records.response_breached`/`resolution_breached` columns directly — they default to `false` on insert and are only meaningful once `*_met_at` is stamped. Always read through `incident_sla_live_status` for "is this breaching right now."
- Don't reintroduce `calculatePriority`/`SLA_TARGETS` in `incidentLifecycle.ts` — real formulas live in the DB (`derive_incident_priority()`, `sla_configs` table).
- `/incident-hub/committee-queue` is live again — if someone proposes deprecating it a second time, that's a real product decision, not an accident; ask before removing.
