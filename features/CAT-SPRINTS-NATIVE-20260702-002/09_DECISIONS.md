# CAT-SPRINTS-NATIVE-20260702-002 — Decisions

> All explicit decisions made during this feature. Permanent record.
> Append — never delete.

---

## Decisions

### D-001 — Terminology: "Owner", never "Driver" (2026-07-02, JK)
Jira's create modal uses "Driver"; Catalyst uses **Owner** (aligns with existing `owner_user_id` on ph_releases). Jira DOM probes inform ADS structure/CSS/typography ONLY — vocabulary comes from JK's requirements and existing Catalyst schema. Applies to all fields, labels, docs in this feature.

### D-002 — Membership = sprint_id FK only (2026-07-02, council unanimous)
All work-item↔sprint reads/writes move to the `sprint_id` FK. JSONB `sprint_release` name-match and `sprint_name` text are read-legacy only during migration, then dead for sprints. Reason: auto-naming makes rename first-class; name-based links are silent data loss (710→2 row Jira-sync revert evidenced).

### D-003 — Auto-name format (2026-07-02)
`<KEY>-Sprint <M>.<W> - <DD Mon YY>`; M = start month, W = ceil(startDay/7), end date = start+4d (1w) / start+11d (2w), Sun→Thu. JK's sample corrected: Thursday end for a 04 Jan 26 start is 08 Jan 26 (07 Jan is a Wednesday). Name recomputes read-only in Auto mode; Custom mode frees it; uniqueness (project_id, name) + dedupe trigger; slug frozen.

### D-004 — DoD satisfaction → awaiting_approval, never auto-complete (2026-07-02, council)
Sprint auto-transitions active → awaiting_approval when all items reach their per-type DoD. Completion always requires approval policy satisfaction (or explicit confirm when zero approvers). Prevents silent sprint closure.

### D-005 — Status vocabulary replaces release vocabulary (2026-07-02)
planning / active / awaiting_approval / completed / canceled / archived. Migration maps in_progress→active, released→completed. Aligns with the dormant ph_wf Sprint SDLC catalog (its first read surface). "Unreleased"/"released" die on sprint surfaces.

### D-006 — Common-status injection split out (2026-07-02, council unanimous)
In QA/In UAT/In Beta/In Production across all work-item types is a separate Feature Work ID — statuses are hardcoded in ~6 TS files; global regression surface. Sprint DoD v1 reads each type's existing status catalog.

### D-007 — Analytics gated on three proofs (2026-07-02, Q4 renegotiation)
Time-in-status, efficiency, scope history, health ship only after: (1) changelog backfill validated for one project (partially met: 2,085 transition rows on staging), (2) native status changes write transition rows (FAILS today: 0 native rows → new required slice), (3) FK is sole membership read path. Until then: disabled UI with tooltip, zero-assumption.

### D-008 — Efficiency formula (2026-07-02)
`40%·completion + 25%·flow-efficiency + 20%·scope-stability + 15%·approval-timeliness`, all ratios → comparable across 1w/2w lengths. Not shown until D-007 gates pass.

### D-009 — 1W/2W indicator is a Lozenge, not a ribbon (2026-07-02)
Corner ribbons are not an ADS pattern. Length shows as an @atlaskit/lozenge next to the sprint name (list + detail) and in the create modal header area. (Pending A3 critic confirmation.)

### D-010 — Feature folder consolidation (2026-07-02)
Council verdict originally at features/CAT-SPRINTS-NATIVE-20260702-001/ merged into this folder as 13_COUNCIL_VERDICT.md; 001 folder removed. This feature's canonical ID is CAT-SPRINTS-NATIVE-20260702-002.

---

### D-011 — Native/Jira-sync discriminator: `jira_sprint_id IS NULL` (2026-07-03, ratified as-built)
Council V2 flagged this as an implicit decision answered silently by code. Verified in `20260703200000_sprint_dead_data_purge.sql:2-4`: the purge migration itself uses `jira_sprint_id IS NOT NULL` to identify the 25 legacy Jira-import rows vs. the 26th native/Catalyst-created row (`jira_sprint_id IS NULL`). Ratified as the standing discriminator — not `created_by IS NOT NULL` as originally proposed in `03_PLAN_LOCK.md`'s open-decisions list.

### D-012 — `draft` status dropped from vocabulary (2026-07-03, ratified as-built)
Council V2 flagged this as open. Verified in `20260703190000_sprint_status_vocabulary.sql:21-23`: the live CHECK constraint on `ph_jira_sprints.status` is exactly `planning | active | awaiting_approval | completed | canceled | archived` — no `draft`. Ratified: `draft` is not part of the native sprint lifecycle.

### D-013 — Prod strategy: explicitly deferred, staging-stabilization is the priority (2026-07-03, Vikram)
Re-verified live via Supabase MCP `list_projects` + `list_tables`: prod (`lmqwtldpfacrrlvdnmld`) still has no `ph_jira_sprints` table at all. None of this session's commits touch prod. Originally flagged as an open Plan Lock decision needing a choice among (a) staging-canonical + idempotent migrations, (b) prod catch-up first, (c) retire prod. **Explicit direction from Vikram (2026-07-03): don't worry about prod, it's a long way off — stabilize staging first.** This resolves the urgency (no need to pick a./b./c. now) without picking one — prod strategy stays formally undecided but is no longer a blocking concern for this feature's forward progress. Staging stabilization (the migration-ledger drift flagged repeatedly — Council V2, the concurrent session's `CLAUDE.md` "CONCURRENT SESSIONS & DB TARGETING" section, `supabase db push` failing) is now the standing priority ahead of any prod work.

### D-014 — Business Request exclusion from sprints: VERIFIED STRUCTURALLY SATISFIED, no code needed (2026-07-03, revised)
Originally flagged as "not implemented" (initial grep of `SprintsPage.tsx`/`sprints/*.tsx` found no filter). Traced fully before building anything: `business_requests` is its own table (`supabase/migrations/20260516120000_bootstrap_full_schema.sql:26248`), structurally separate from `ph_issues` — no `sprint_id` column, no `project_id` FK (belongs to Product Hub via `product_id`, not Project Hub). The sprint work-item picker (`src/components/releases/detail/AddWorkItemsModal.tsx`) only ever queries `ph_projects`/`ph_issues`, never `business_requests`. **There is no code path by which a Business Request can be added to a native sprint — the exclusion holds by construction, not by a filter.** No build slice needed; closing this as verified rather than open.

Side finding: the Catalyst Rules Engine (`src/lib/catalyst-rules/CatalystRules.ts`, canonical module-ownership source of truth) places "Business Request" under the **PRODUCT** module, not "ENTERPRISE" (which owns Theme/Objective/Snapshot) — the original brief's "ENTERPRISE (business request)" shorthand was imprecise about module naming, though the underlying intent (BRs never reach sprints) already held regardless.

### D-015 — Approval/lifecycle mutations are UI-enforced only, not DB-enforced (2026-07-03, RED FLAG — RESOLVED same session, see D-016)
Verification-gate code review (`06_VALIDATION_EVIDENCE.md` VG-001) found the "first-person only" approve/reject restriction (S2.2b) and the dropdown's block on manually setting `awaiting_approval`/`completed` (S2.2c) are both enforced only in client code (`ReleaseSidePanel.tsx`). The underlying `ph_sprint_approvers` UPDATE and the sprint status UPDATE have no `user_id` filter, RLS policy, or DB constraint preventing a determined authenticated user from bypassing either restriction via a direct client call. This is the same class of risk A5 already flagged (anon-writable transitions/approvers RLS) and Council V2's condition 4 ("RLS tightening not deferred past session S-C").

### D-016 — RLS hardening scope, D-015 fix (2026-07-03, JK/Vikram go-ahead)
User explicitly approved all three scope questions for the D-015 fix: (1) approver decision-note edits become self-only (was: any authenticated user), accepted as a side effect since RLS can't cleanly split by column; (2) DELETE on `ph_sprint_approvers` tightened to `auth.uid() = user_id OR auth.uid() = added_by` (was: any authenticated user); (3) identical tightening extended to `ph_release_approvers` for parity, explicitly going beyond this feature's stated boundary (release-approvers is shared, pre-existing infra) — approved rather than assumed. Implemented in `supabase/migrations/20260703260000_sprint_approval_rls_hardening.sql`, applied directly to staging via `supabase db query --linked -f <file>` (not `db push`, which is blocked by a pre-existing, unrelated migration-ledger drift — see note below). Verified live via `pg_policies` + `pg_proc`/`pg_class` catalog queries: new policies match design exactly; both trigger functions (`fn_sprint_check_dod`, `fn_sprint_check_approval`) and both tables are owned by `postgres` with `rolbypassrls=true`, confirming the DoD/approval automation is unaffected by the client-facing tightening (standard Postgres RLS owner-bypass). Live-DOM re-confirmation not done this pass — Chrome MCP extension disconnected transiently at that point in the session; catalog-level verification stands in for it (backend-only change, no UI code touched).

**Also surfaced, not fixed:** `supabase db push --linked` fails with "Remote migration versions not found in local migrations directory" — a pre-existing migration-ledger drift unrelated to this session's changes (CLI suggests `supabase migration repair --status reverted 20260702130000 20260702140000 20260702200000 20260702200001 20260702230000 20260702230001`). This is exactly the systemic issue Council V2 already flagged and recommended a dedicated CI schema-drift ratchet gate for (own Feature Work ID candidate) — not touched here, since repairing the ledger is a separate, broader concern than the narrow RLS fix asked for this session.

### D-017 — Migration file renamed to resolve a timestamp collision on merge (2026-07-03)
Fetching `origin/main` before merging surfaced a hard `CLAUDE.md` addition ("CONCURRENT SESSIONS & DB TARGETING — HARD STOP", commit `dae4abad3`) written by a concurrent session after a real incident: a deleted worktree silently retargeted prod DDL onto staging, and a session's commit nearly landed on another session's branch — the same incident class as this feature's own DRIFT-002. Origin/main also added `supabase/migrations/20260703220000_restore_wrongly_deleted_bau_issues.sql` (a reconstructed placeholder for a migration applied to staging but never committed) — colliding on the same version-prefix as this feature's own `20260703220000_sprint_release_link.sql`. Per the new hard-stop rule ("duplicate version prefix = broken ledger"), renamed the local file to `20260703270000_sprint_release_link.sql` (unpushed, so safe to rename) before merging. Historical narrative entries in `04_EXECUTION_LOG.md`, `06_VALIDATION_EVIDENCE.md`, and `07_HANDOVER.md` still reference the old filename — left as-is (accurate to what happened at the time) rather than rewritten; this entry is the pointer for anyone following those references.

**Note:** `D-018` is referenced in `WorkItemsSection.tsx` code comments ("the membership changelog row is written by a DB trigger on sprint_id UPDATE (D-018)") but was never actually logged in this file — a pre-existing documentation gap from an earlier session, not created or fixed here. Left as-is (not this session's scope); new entries below start at D-020 to avoid colliding with that forward-reference.

### D-020 — Phase 3 Slice 1: sprint health FK fix (2026-07-03)
`useEntityHealthAdapter` (`src/features/health/adapters/entity.ts`) matched sprint work-item membership via the dead `sprint_release` JSONB name-match for every entity kind, ignoring `SPRINT_CONFIG.matchIssueByFk = 'sprint_id'` (dead for sprints since D-002/S0.2b) — any sprint health score was silently wrong. Fixed: the adapter now branches on `config.matchIssueByFk`; sprint configs query `.eq(fk, entityId)` directly (mirrors the proven `WorkItemsSection.tsx:239-251` pattern); release path (JSONB contains + fallback scan) unchanged. Shipped in commit `9481249`. Full detail: `03_PLAN_LOCK.md` (Phase 3 Slice 1), `06_VALIDATION_EVIDENCE.md` VG-002/VG-003.

### D-021 — Phase 3 "Slice 2" (health UI wiring) is unnecessary — already live, no code needed (2026-07-03, revised)

`07_HANDOVER.md`'s Phase 3 slice order proposed Slice 2 as "wire sprint health into the side panel... has zero references in `ReleaseSidePanel.tsx`." That premise is only literally true — `ReleaseSidePanel.tsx` itself has no health code — but the health UI lives one level up, in `ReleaseDetailPage.tsx` (the shared page both `/release-hub/releases-management/:id` and `/project-hub/:key/sprints/:sprintSlug` mount): a header toggle button (`aria-label="View ${config.label.lowerSingular} health"`, `ReleaseDetailPage.tsx:414-431`) gated only on `config.kind !== 'milestone'` — **already true for sprints** — swaps the entire right rail from `ReleaseSidePanel` to `HealthPanel` (`ReleaseDetailPage.tsx:558-577`), with `scope: { moduleKey: 'sprint', sprintId: release.id }` already wired for the sprint case.

This was verified live (not just by reading code), via an authenticated Chrome MCP session against `localhost:8080` — see `06_VALIDATION_EVIDENCE.md` VG-003: clicking the toggle on an empty sprint showed "0 Analysed / Looks healthy"; on a 7-item sprint it showed "7 Analysed", matching the visible work-items count exactly. This is the Slice 1 FK fix (D-020) confirmed working end-to-end through the real UI, and it closes Slice 2 as **no build needed** — same resolution pattern as D-014 (verified structurally satisfied, not built). Phase 3's remaining slices renumber: former Slice 3 (AI summary + cache) is next, then former Slice 4 (time-in-status/efficiency), Slice 5 (scope-change history), Slice 6 (dependencies) — unchanged in content, just one slot earlier.

### D-022 — Phase 3 Slice 3: AI summary + cache for sprints, plus a second FK bug fix (2026-07-03)

Discovery for Slice 3 (AI summary caching) found `summarize-release`'s `fetchReleaseContext` (`supabase/functions/summarize-release/index.ts`) still matched sprint work items via the dead `sprint_release` JSONB name-match — the same bug class D-020 fixed in the health adapter, but never applied here. Raised as a RED FLAG; user chose to fold the fix into this slice rather than defer it. Fixed: sprint branch now queries `ph_issues.eq('sprint_id', releaseId)` directly; release branch (JSONB contains + fallback) untouched.

Second decision, also user-confirmed before implementation: `sprint_insight_cache` (new table, `20260703280000_sprint_insight_cache.sql`) is a **team-shared** cache — no `user_id` column, RLS open to any `authenticated` role — deliberately diverging from `board_insight_cache`'s per-user model, since a sprint's AI summary is deterministic for a given structural hash regardless of viewer (one teammate's request caches it for everyone).

Implementation: `useReleaseSummaryStream.ts` computes a SHA-256 hash (new helper, `sprintInsightHash.ts`) over every field `buildPrompt` consumes (sprint row + `sprint_id`-FK-linked items — including `status_category`, which drives the done/in-progress/to-do counts, caught on a second pass through `countProgress`) before invoking the edge function for `entityKind === 'sprint'`; a cache hit calls the store's existing `complete()` directly, skipping the network call entirely. Release summaries are untouched — the whole cache path is gated on `entityKind === 'sprint'`.

Live-verified on staging (`06_VALIDATION_EVIDENCE.md` VG-004): FK-corrected summary matches the true item set (50% = 1 of 2 done); a same-data reopen renders the byte-identical cached text near-instantly with no new DB row; mutating a hashed field (`assignee_display_name`) busts the cache (new hash, new row, fresh stream observed mid-generation); a release's summary never caches (always shows the fetching state) and never writes to `sprint_insight_cache` (row count unchanged across the release test). Shipped in the edge-function redeploy + migration applied this session; commit pending.

### D-023 — S0.1b (native transition trigger) ratified as-built; D-007 all three gates now confirmed satisfied (2026-07-03)

While starting discovery for Slice 4 (time-in-status/efficiency), found `supabase/migrations/20260703093000_native_transition_trigger.sql` already live on staging — `trg_record_native_work_item_transition` (`AFTER UPDATE OF status ON ph_issues`) records a `work_item_transitions` row on every Catalyst-native status change, chaining dwell time off the most recent prior transition (native or Jira-backfilled). This is slice **S0.1b** from the feature's original master slice list (`03_PLAN_LOCK.md`'s archived S0.1a section: "S0.1a → S0.1b native-transition trigger → S0.2a..."), shipped in commit `47fe25223` (2026-07-02, same DRIFT-001 episode — implemented and validated live at the time, but never given its own ratifying entry in this file, the same class of gap D-011/D-012 already closed for other silent decisions). Ratifying it now rather than opening a new DRIFT entry, since DRIFT-001 already covers "shipped without a decision record" as the root issue.

This closes out D-007's three-gate analytics block:
1. **Changelog backfill validated for one project** — previously accepted as partially met (2,085 Jira-origin `work_item_transitions` rows on staging).
2. **Native status changes write transition rows** — previously FAILING per the last check (0 native rows). Re-verified live this session: 10 native rows exist (`jira_changelog_id IS NULL`), dated 2026-07-02 (before this session), with real actors, realistic status flows, and correct dwell times. 8 of the 10 belong to `BAU-6112`/`BAU-6114` — real items in a real sprint (`BAU-Sprint 7.1 - 06 Jul 26`) — confirming the trigger works for FK-linked sprint items, not just in isolation.
3. **FK is sole membership read path** — re-audited fresh (not just assumed from D-002/S0.2b): `SPRINT_CONFIG.matchIssueByFk = 'sprint_id'` is the only sprint-kind membership path across `src/` and `supabase/functions/`; every other `sprint_release`/`sprint_name` hit is either release-kind (correctly untouched, releases have no FK) or a non-authoritative display/filter/search field, not a membership read or write.

**All three gates now hold.** Phase 3 Slice 4 (time-in-status/efficiency, D-008's formula) is no longer blocked on missing data — it can be Plan-Locked and built.

### D-024 — Slice 4 split into 4a/4b; 4a (sprint-status transition trigger) shipped, DoD-cascade edge case resolved favorably (2026-07-03)

Slice 4 (time-in-status/efficiency) was split into **4a** (a new `ph_sprint_status_transitions` table + trigger — the missing approval-timeliness prerequisite) and **4b** (the formula + `SprintEfficiencyCard` UI), since the combined scope exceeded the standing 2-hour slice rule. User approved building the full formula plus this new trigger (over the alternative of shipping only 2-of-4 components and deferring the rest).

Slice 4a shipped: `ph_sprint_status_transitions` + `trg_record_sprint_status_transition` (`supabase/migrations/20260703320000_sprint_status_transition_trigger.sql`), mirroring `record_native_work_item_transition()` (S0.1b) — records every `ph_jira_sprints.status` change by an authenticated user.

**The Plan Lock's flagged uncertainty resolved in the better direction**: it was unclear whether the DoD-satisfaction auto-transition (`active → awaiting_approval`, fired from `fn_sprint_check_dod`'s trigger cascade rather than a direct user action on the sprint row) would have `auth.uid()` set, since S0.1b's own equivalent skip-condition existed for a reason. Live-tested via a fresh sprint (`06_VALIDATION_EVIDENCE.md` VG-005): drove a real work item through its full workflow to Done, satisfying DoD, and the resulting `active → awaiting_approval` cascade **was** captured with a real actor. `auth.uid()` persists through the whole cascade within one authenticated Supabase request/transaction, regardless of how many nested triggers fire. This means Slice 4b's approval-timeliness component will have real start-timestamps for sprints going through their natural DoD-driven lifecycle — not only sprints where someone manually overrides the status dropdown.

Slice 4b (formula + `SprintEfficiencyCard`, per discovery: extend `ReleaseSidePanel.tsx` next to `DefinitionOfDoneCard` using the ADS `ProgressBar`, reading `work_item_transitions` for flow-efficiency — not `catalyst_status_history` or `ph_issue_status_history`, two unrelated tables serving different features) still needs its own Plan Lock before any code.

### D-025 — Phase 3 Slice 4b: efficiency formula shipped, live-verified in both zero-assumption states (2026-07-03)

Shipped `compute_sprint_efficiency` (SQL RPC, `supabase/migrations/20260703400000_sprint_efficiency_rpc.sql`), `useSprintEfficiency` hook, and `SprintEfficiencyCard` (mounted in `ReleaseSidePanel.tsx` next to `DefinitionOfDoneCard`, same `config.kind === 'sprint'` gate). Concrete formulas (not fully specified by D-008, which only names the weights):

- Completion: `done_count / total_count` over current FK-linked items.
- Flow-efficiency: `in_progress` dwell time / total dwell time, from `work_item_transitions`.
- Scope-stability: `1 - (removed_count / total_ever_added)`, from `work_item_changelogs` (`field_name='sprint'`).
- Approval-timeliness: elapsed time from the most recent `awaiting_approval` transition (`ph_sprint_status_transitions`, Slice 4a) to the latest approver `decided_at`, scored 100 at ≤24h down to 0 at one sprint-length; simplified to not model `any`/`all`/`quorum` policy nuance precisely (no `quorum_count` column exists).
- Overall: the D-008 weighted sum, **only when all four components are non-null** — zero-assumption is structural (every component defaults to `null`, never a guessed value).

Migration timestamp `20260703330000` collided with the concurrent session's already-applied `senaei_bau_dedup_and_signoff_seed` (same class as DRIFT-004) — renamed to `20260703400000` before it caused a ledger conflict.

Live-verified both states end-to-end (`06_VALIDATION_EVIDENCE.md` VG-006): the Slice 4a test sprint showed *"Not enough data yet — missing Approval timeliness"* before an approver existed; after adding and approving a real approver through the actual UI, the card rendered a 91% score with all four sub-percentages, exactly matching the RPC's own output. This is the first time D-008's formula has rendered on this feature.
