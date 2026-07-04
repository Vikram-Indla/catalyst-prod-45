# Decisions — CAT-WORKFLOW-STUDIO-20260702-001

Every consequential decision made across P0–P6, with rationale. Autonomous run completed 2026-07-03.

## Architecture
1. **Canonical ph_wf_* engine is the ONLY write path** for workflows; legacy ph_workflow_* frozen conceptually (UI deprecated, DB writes not yet revoked). Council 5/5: "any hour on legacy is negative work."
2. **Drafts are edited in place** (lifecycle='draft' rows) — no shadow diff table. Drafts are invisible to gateTransition(), so inherently safe; a diff table added complexity with zero consumers.
3. **One open draft per entity**, create_draft is idempotent (returns the existing draft instead of forking) — prevents parallel-draft merge hell.
4. **Publish requires a remap for every removed status** before it succeeds; remaps persist to ph_wf_status_remaps and scheme entries re-point atomically.
5. **All writes via SECURITY DEFINER RPCs** (admin-asserted, ph_wf_admin_audit-logged); RLS keeps tables read-only for clients.
6. **Draft-guard trigger is invoker-rights, NOT SECURITY DEFINER** — as definer the body runs as postgres and the guard silently never fires (caught live in testing).
7. **Sprints/product_releases stay date-derived** — no status column added. Council: forcing a status machine onto temporal lifecycle is falsification. Shown read-only ("system-managed") in Studio.

## Type registry (P3)
8. **New tables (ph_work_item_types/ph_hierarchy_levels/ph_hierarchy_parent_rules)** instead of activating the dormant ph_work_types/wh_work_types — both had wrong shapes (4-bucket level CHECK, hex colors vs. token law).
9. **System type identity frozen** (key/name/kind immutable via RPC); presentation + wiring editable; system types cannot be archived.
10. **Curated create-modal catalogue stays in code**; registry custom main types are APPENDED. Task-handoff and type deprecations are product decisions, not data.
11. **ph_issues CHECK dropped defensively** (pg_constraint scan — the constraint was hand-applied drift with unstable names per env). `issue_type` text column kept forever (20+ views filter on literals); new `type_id` FK is the governed link.
12. **Jira-sourced unknown types AUTO-REGISTER; native writes RAISE.** Sync can never break on a renamed/new Jira type (row appears in Studio for styling); native creates get the governance the CHECK used to provide. Resolver is SECURITY DEFINER so the registry insert clears RLS.
13. **Type-key uniqueness scoped to live rows** (partial index) — archiving a custom type frees its key.
14. **ltree deferred** — pairwise parent-rule validation doesn't need path queries; extension stays available for future subtree work.

## AI generation (P4)
15. **AI output is always a DRAFT**; import refuses to overwrite a non-empty human draft; publish stays human. Only defensible "AI wrote my governance" architecture (council).
16. **Server-side structural validation in the edge fn** (initial/terminal/dangling/self-loop) mirrors ph_wf_validate_draft — bad generations are rejected with issue lists, never persisted. First live run proved this (model failed, validator caught it, few-shot example fixed it).
17. **SHA-256 prompt cache** (7-day expiry) — identical prompts don't re-bill.
18. **Preview is lozenges + transition list, not a mini-diagram** — accept lands directly in the real editor, which IS the diagram.

## Hierarchy (P6)
19. **Configurable levels hard-capped at 10** (rank 0..9 CHECK); shipped without a feature flag — additive, nothing reads levels destructively. Challenger's "spec inflation" concern honored by sequencing it last and keeping it cheap.
20. **hi_validate_parent_level trigger rewrite DEFERRED** — hi_work_items appears dormant; parent rules are enforced via registry + UI. Revisit if hi_* revives.

## Sequencing / process
21. **Wiring fixed before any feature** (P0) — empty board was 4 stacked failures: missing column, missing FKs, swallowed errors, and a broken error banner (ads SectionMessage passed action objects raw). The persisted-cache/paused-retry pattern means checks must be `isError || error`.
22. **Error state ≠ empty state** repo rule for all Studio surfaces (skeleton / SectionMessage+Retry / EmptyState+CTA).
23. **Staging (cyij) only** for every migration + edge deploy; prod untouched per your directive. Prod rollout is its own explicitly-gated exercise (prod is also 113 migrations behind, ph_wf_* absent there).
24. **Cherry-pick-to-main flow** for every slice (session branch carries an unrelated jql commit — never swept in). ADS gates enforced per commit (caught off-grid spacing, uppercase labels, raw h2).

## Follow-up sweep (2026-07-03, main 05e0eb5e4)
25. **Reason modals for Defect + Incident wired at the callback layer** — StatusLozengeDropdown already captured the reason; the detail-view callbacks silently dropped the second argument. Two-line fixes beat the adapter refactor.
26. **Release/BR/Milestone/Task reason modals deferred** — their status writes live in table-adapter onUpdate handlers with no modal-capable component in the chain; the reason-required refusal already surfaces as a clear error (not silent). Proper fix = BacklogPage-level modal portal (own slice).
27. **Registry consumers extended surgically** — kanban InlineCreate + both backlog scopes read custom main types (curated system lists stay in code); other allowlists (useProjectListItems, FilterPreviewPage facets) left for the next natural touch.
28. **Types regenerated from staging** — cyij is now the source of TS truth for the DB (dev app points there).
29. **ads-validator adopted into the loop** — workflows tree clean; one hex-in-comment fixed; @atlaskit textarea swapped in for the raw one (canonical-reuse); lozenge/popup/select/renderer BUGGY/WARN findings all have standing repo workarounds (documented in the skill's known-bugs).
30. **Pre-existing token debt in useProjectMetrics.ts NOT swept** — untouched file, ratchet-baselined; surgical-changes rule wins.

## Deferred (not forgotten)
- Legacy ph_workflow_* write revoke — blocked on MapStatuses absorbing board-column grooming (classic builder is today's only column groomer; it now carries a deprecation banner).
- Reason modals + canonical status reads for defect/incident/release/BR/PM/task surfaces (advisory bridges live; UI polish per family).
- Evidence sources for the 12 advisory-only guard types (approval/QA-signoff/deployment tables — separate feature).
- Versions-page extras (migration preview, reason-code toggles, health matrix) not yet folded into Studio; page stays linked as "Engine admin".
- WorkflowVersioningPage's hardcoded ENTITY_WIRING notes are stale (says Task/Sprint NONE; DB has published v1s).
- L7 "Initiative" level left in place on staging (harmless, no types attached) — rename/disable in UI as desired.
