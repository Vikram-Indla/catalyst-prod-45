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
