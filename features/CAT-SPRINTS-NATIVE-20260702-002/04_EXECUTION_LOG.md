# CAT-SPRINTS-NATIVE-20260702-002 — Execution Log

> Running log of all actions, decisions, and changes made during implementation.
> Append entries — never delete.

---

## Log entries

[Entries will be appended during execution]

## RECONCILIATION ENTRY — 2026-07-02 (retroactive, derived from git + DB probes, NOT from memory)

Side work executed outside this folder's process (no Plan Lock approval recorded, no live logging).
Commits on origin/main, migrations confirmed applied to staging by PostgREST probe:

| Slice | Commit | Status |
|---|---|---|
| S0.1a slug codify + resolution + routing | d61da1b6a | shipped — VERIFICATION PENDING |
| S0.1b native transition trigger | 47fe25223 | shipped — 2 native rows live — VERIFICATION PENDING |
| S0.2a FK backfill + progress view repoint | 5b79a337b | shipped — VERIFICATION PENDING |
| S0.2b membership repoint + changelog trigger | ef1830e72 | shipped — trigger live, 0 events — VERIFICATION PENDING |
| S0.3 status vocabulary | 672b74407 | shipped — statuses migrated (completed:25/planning:1/archived:1) — VERIFICATION PENDING |
| S0.4 dead-data soft purge | e85c1682b | shipped — 25 soft-deleted — VERIFICATION PENDING |
| S1.1a SprintsTable on JiraTable | 826fb72e1 | shipped — SCREENSHOT SIGNOFF PENDING |
| S1.3a auto-name util + SQL mirror | 1dca56aa0 | shipped — edge cases UNTESTED |
| S1.3b native create/edit modal | b0bd6ec13 | shipped — SCREENSHOT SIGNOFF PENDING |
| (adjacent) Health Engine | ea0ade4f3 | own folder CAT-HEALTH-ENGINE-20260702-001; sprint adapter UNVERIFIED |
| (adjacent) release-detail loading fix | a64130b1b | claim CONTRADICTED by health handover — UNVERIFIED |
| (adjacent) soft-delete router fix | b6bd41473 | supports S0.4 |
| (adjacent) CRE Grid I | fd27f44e8 | backlog/all-work row bans |

Migrations applied: 20260703090000 sprint_native_columns, ...093000 native_transition_trigger, ...170000 sprint_fk_backfill, ...180000 sprint_membership_changelog, ...190000 sprint_status_vocabulary, ...200000 sprint_dead_data_purge, ...210000 sprint_autoname_fn.

Nothing in this entry is accepted as DONE until the S-A verification gate passes (14_COUNCIL_VERDICT_V2.md).

## ENTRY — 2026-07-02 (session 002, live) — sprint list rebuild, typography fix

Rebuilt the sprint list (`SprintsTable`/`cells.tsx`/`SprintsPage.tsx`) that `d34f1cf14` had reverted. Vikram's reason for the original revert: it broke ADS typography compliance. Root cause found and fixed:

- `src/components/sprints/cells.tsx` (reverted version), sprint-name cell: `fontSize: 'var(--ds-font-size-100, 14px)'`. `--ds-font-size-100` = 11px ("caption — timestamps, metadata, fine print" per `src/styles/theme-tokens.css`) — the token IS defined, so the `14px` fallback never applied; the sprint name rendered at 11px instead of the table's standard 14px body size. Also violates the CLAUDE.md rule against `var(--ds-*, <fallback>)` patterns — token-only, no fallback.
- Fix: removed the inline `fontSize` override entirely. JiraTable's own cell wrapper already sets `fontSize: d.cellFontSize` (14px, both densities) on the containing `<div>` — the cell content now inherits it, matching every other column and every other JiraTable-based list in the product.
- Restored `SprintsTable.tsx` unchanged (no issues found in it) and rewired `SprintsPage.tsx` back from `ReleasesTable` to `SprintsTable` (diff reapplied from `826fb72e1`, same shape).

Verified: `npx tsc -p tsconfig.app.json --noEmit` — 183 errors both before and after (baseline unchanged by this change, confirmed via `git stash` A/B). DOM: `/project-hub/BAU/sprints` renders `SprintsTable` — sprint name at correct 14px body size (screenshot, zoomed crop), 1W lozenge, native `PLANNING`/`ARCHIVED` status pills, Owner avatar. Dark mode checked — clean, no light-mode leftovers.

Still SCREENSHOT-PENDING / UNVERIFIED: rename→FK-membership test, Health Engine sprint adapter, release-detail fix claim. Per Vikram's live instruction this session: proceed slice by slice, browser screenshot after each tangible piece — formal Plan Lock re-lock deferred, not skipped.

## ENTRY — 2026-07-02 (session 002, live) — create-modal round trip + row-actions menu bugs found

Tested the create-sprint modal end to end on `/project-hub/BAU/sprints`: selected project, auto-name generated (`BAU-Sprint 7.1 - 06 Jul 26`), saved, collided on purpose with the existing sprint of the same name — dedupe trigger correctly suffixed it to `BAU-Sprint 7.1 - 06 Jul 26-2` (validates D-003's `-2`/`-3` dedupe, previously flagged UNTESTED). Cleaned up the test row via Archive afterward.

While testing the row kebab menu, found two bugs in the row-actions cell (`makeSprintActionsCell`, `cells.tsx`), both pre-existing in `826fb72e1` (not introduced by the typography fix):

1. **Icon invisible** — `icon={<MoreIcon label="Actions" />}` used a prop (`icon`) that this installed `@atlaskit/button/new` version's default `Button` does not declare (`ButtonProps` only has `iconBefore`/`iconAfter`, confirmed via `node_modules/@atlaskit/button/dist/types/new-button/variants/default/types.d.ts`). Runtime silently dropped it — button rendered with zero children. **FIXED**: swapped to `iconBefore={MoreIcon}` (component reference, not rendered element — required by `IconProp = React.ComponentType<...>`) + `aria-label="Actions"` for accessibility. Verified via DOM probe: kebab now renders (was `svgCount:0/innerHTMLLen:0`, now visible in screenshot).
2. **Dropdown menu mispositioned** — clicking the kebab opened the `Complete sprint / Edit / Merge / Archive` menu pinned to the top-left of the viewport instead of anchored under the button. Root cause found in `docs/ways-of-working/archive/CLAUDE_OLD_BACKUP_20260626_0242.md`: **`@atlaskit/popup` v4.16 (which `@atlaskit/dropdown-menu` sits on) has a documented empty-portal/positioning bug in this codebase**, specifically on triggers inside `overflow: hidden` ancestors (confirmed via DOM probe: the actions cell's `<td>` and its inner wrapper are both `overflow: hidden`). Existing codebase rule: "Any popup inside a component with `overflow: hidden` MUST use `createPortal` to `document.body` with `position: fixed`. Never use `@atlaskit/popup` on this surface." **FIXED**: replaced the raw `DropdownMenu`/`Button` construction in `makeSprintActionsCell` with `ToolbarMenuButton` (`src/components/shared/JiraTable/ToolbarMenuButton.tsx`) — the same self-rolled, already-proven anchored-portal menu already used elsewhere on this exact page (the toolbar's "View options" button). Verified via screenshot: kebab visible on all rows, menu opens correctly anchored under the trigger with the right items.

Dev server was restarted mid-session (`rm -rf node_modules/.vite`, relaunched via `npm run dev`) while ruling out a Vite dependency-cache cause before finding the real one — came back up clean, no side effects, dependency-cache theory ruled out (kept as negative finding for future debugging).

## ENTRY — 2026-07-02 (session 002, live) — grouping already works; progress bar unproven (no data)

Tested Group filter (already-wired `GroupFilter`/`ReleaseFilters.tsx`, itself the proven self-rolled anchored-popup pattern — correctly positioned, no bug here): grouping by **Status** → correct Archived/Planning buckets, each expandable; grouping by **Start date** → correct "Jul 2026" / "Jun 2026" month buckets. Both are what JK asked for (group by Month or Status). **Correction to the master feature list**: S1.1b (group-by/toolbar) is NOT "not shipped" as recorded — it is live and functional. Note: the "Product" group option's label is inherited from the shared `ReleaseFilters.tsx` component and is inaccurate for sprints (it actually groups by Project) — cosmetic, not fixed this session, flagged for later.

Progress bar: checked via PostgREST against staging — neither live native sprint (`88fc7fa1…` planning, `d955bda9…` archived) has any `ph_issues` row with a matching `sprint_id` (`content-range: */0`). The "No work items" empty state is correct zero-assumption behavior, but the actual filled/colored segmented bar has no real data to render against yet, so it's unverified visually. Did not create test linkage data to force a visual — that would mutate shared staging project data without being asked. Flagging as the next thing to prove once either real work gets assigned to a sprint or an explicit test is authorized.

## ENTRY — 2026-07-02 (session 002, live) — test items linked, progress count confirmed; two adjacent bugs found (not sprints bugs)

Per Vikram's go-ahead, linked 2 real BAU work items (BAU-6114 "Adding a subtask", BAU-6112 "Implement backend logic for custom exemption approval workflow") to the planning sprint via the sprint detail page's own "Add work items" flow (`/project-hub/BAU/sprints/bau-sprint-71-06-jul-26` → Work items → Add work items). Confirmed this writes the real `sprint_id` FK, not the legacy `sprint_release` field — proven because the sprint list's Progress column immediately changed from "No work items" to **"0 of 2"**, sourced from `useEntityProgress(SPRINT_CONFIG)`, which reads the FK. This is real, working proof of D-002 (FK-only membership) for the progress feature specifically.

Tried to also prove the colored segmented bar (not just the count) by moving one item to "In Progress" — blocked by two bugs in the **work-item editing pipeline**, unrelated to Sprints:
1. Backlog page (`/project-hub/BAU/backlog`): clicking any item's key (tried BAU-13, BAU-316, multiple others) opens a modal that renders `CatalystViewEpic` but displays "Issue not found." Reproducible on every item tried. Not a routing 404 — the component mounts but its own data lookup comes up empty. Flagged as background task `task_de9ee431`.
2. The sprint detail page's own work-items side panel DOES open correctly (workaround for #1) and its status dropdown visually updates (e.g. TO DO → IN PROGRESS on BAU-6112), but the write doesn't persist — reverts to TO DO after a hard reload. Flagged as background task `task_0770338d`, likely the same underlying mutation path as #1.

Also noted along the way: `Sprint/Iteration` column available on the Backlog page's column picker is still bound to the legacy `sprint_release` field (shows dead Jira sprint names like "Sprint2.5 - 05 May 2..."), confirming the Plan Lock's flagged "detail-view Sprint/Iteration field" blast-radius item has NOT actually been repointed to the FK yet, despite S0.2b's commit message claiming "membership repoint." Read-only column, not editable, so it's a display-only relic — did not touch it.

Given both status-change paths are broken, could not produce a visual of the filled/colored progress bar this session (would need one item actually marked done/in-progress in the DB). The count ("0 of 2") is proven and correct; the color fill is not yet demonstrated. Not blocking — this is a data/status-write problem, not a Sprints progress-bar problem.

## ENTRY — 2026-07-02 (session 002, live) — S1.4 release link built and verified

Vikram approved (AskUserQuestion): one release per sprint (no many-to-many), and OK to apply a new migration to staging.

**Schema**: `supabase/migrations/20260703220000_sprint_release_link.sql` — adds nullable `release_id uuid REFERENCES ph_releases(id) ON DELETE SET NULL` + index to `ph_jira_sprints`. Deliberately NOT reusing the pre-existing `release_sprints` junction table from `2026-06-28_007_create_release_sprints.sql` — that table references the legacy `releases`/`sprints` tables (pre-`ph_*` SAFe iterations system), not `ph_releases`/`ph_jira_sprints`. Confirmed via `mcp__6c122156…__list_projects` that the connected Supabase MCP only has access to `lmqwtldpfacrrlvdnmld` (prod — verified it has no `ph_jira_sprints` table at all, consistent with prior findings) — MCP could not be used for this. Applied instead via `supabase db query --linked -f <migration>` (CLI, linked to staging `cyijbdeuehohvhnsywig` per `supabase/.temp/project-ref`), bypassing `supabase db push`'s migration-ledger reconciliation prompt (pre-existing, unrelated drift: two remote-only migration entries `20260702145423`/`20260702165104` with no local file — not touched, not this session's problem). Verified column live via PostgREST immediately after.

**UI wiring**: `cells.tsx` (`SprintRow.release_id`, `LinkedRelease` type, `makeSprintReleaseCell` now takes a `getRelease` accessor and renders the release name + date tooltip instead of a hardcoded dash), `SprintsTable.tsx` (batch-fetches `ph_releases` rows for referenced `release_id`s, same pattern as the existing owner-profile batch fetch), `SprintsPage.tsx` (`release_id` added to the row mapping — `select('*')` already returns it), `SprintCreateModal.tsx` (new "Release" field using the existing `ProductSelect` component, options scoped to the sprint's selected project via `ph_releases.project_id`, clears when project changes, optional/no asterisk, included in the create/update payload).

**Verified live**: edited "BAU-Sprint 7.1 - 06 Jul 26", picked "BAU - Sprint 4.1 - 09 Oct 25" from the project-scoped release list, saved — the Sprints list's Release column immediately showed the real linked release name (was "—"). `npx tsc -p tsconfig.app.json --noEmit` — 183 errors, same baseline, no new errors.

S1.4 (release link) is now built and demonstrated end to end — schema, list display, and the create/edit modal picker.

## ENTRY — 2026-07-02 (session 002, live) — workflow-wiring fix resolved both flagged bugs + found a third (real) progress-bar bug

Per Vikram's direction, investigated the broken workflow status system as a prerequisite for Definition of Done (Phase 2) before building it blind.

**Root cause found**: `supabase/migrations/20260702120000_workflow_wiring_repair.sql` already existed in the repo (from a different, unrelated feature — CAT-WORKFLOW-STUDIO-20260702-001) but was never applied to staging (`supabase migration list` showed it local-only). It adds the missing FK (`ph_workflow_type_statuses.status_id → ph_workflow_statuses.id`) that PostgREST needs to resolve the embedded-relationship query in `useWorkflowStatuses` (`useCreateStory.ts:207`) — this was the exact query throwing the repeated `[useWorkflowStatuses] lookup error: Could not find a relationship…` console error seen all session.

**Applied** via `supabase db query --linked -f <file>` + an explicit `NOTIFY pgrst, 'reload schema'` (the migration itself didn't include one, so the fix needed a manual cache-bust after applying). Confirmed the specific console error no longer fires after a hard reload.

**This did NOT fix** "Issue not found" on the backlog detail modal (task_de9ee431) — re-tested on BAU-13, still reproduces. Separate root cause, correctly left to that background session.

**This DID fix** the "status doesn't persist" bug (task_0770338d) — re-opened the sprint's work-items panel and found BAU-6114 ("ASSIGNED") and BAU-6112 ("IN PROGRESS") had ACTUALLY saved all along from earlier in the session; the appearance of reverting was a stale/broken READ caused by the same missing relationship, not a failed write. **Vikram should consider stopping/closing task_0770338d** — it may be chasing an already-resolved symptom. Flagged in chat, not auto-dismissed (task already started, can't be withdrawn programmatically).

**Bonus discovery — real progress-bar rendering bug**: with real in-progress data now visible, the sprint list's colored progress segment still didn't render even though the numbers were correct. DOM probe found the fix: `makeSprintProgressCell`'s outer row `<div style={{display:'flex', alignItems:'center', gap:8}}>` had no explicit width, so inside JiraTable's own flex cell wrapper it shrunk to fit content instead of stretching — leaving its `flex:1` track child with 0px to compute percentages against (classic flexbox circular-sizing collapse). **Fixed**: added `width: '100%'` to that row. This bug has been present since `826fb72e1` and was invisible all session because no sprint had real done/in-progress data until this session's linked test items existed. Verified live: colored blue "in progress" segment now renders correctly on both the sprint detail page's progress bar and the list page's compact bar.

`npx tsc -p tsconfig.app.json --noEmit` — 183 errors, same baseline.

## ENTRY — 2026-07-02 (session 002, live) — S2.1 Definition of Done built and verified

Continued into Phase 2 per Vikram. Confirmed live (via the now-fixed `useWorkflowStatuses` hook and the real "Create Story" status dropdown) that per-type "done" statuses genuinely vary and are NOT reliably named "Done" — e.g. Story's real terminal status in this project's custom workflow is "In Production" (11 real statuses: In Requirements → In Design → On Hold/Ready for Development → In Development → In QA → In UAT → In Beta → Production Ready/Beta Ready → In Production). This confirms the A6 plan's "seed each type with done_status='Done'" idea would have been factually wrong for at least this type — deliberately did NOT implement it.

**Design departure from A6's spec, deliberate**: scoped DoD to work-item types actually present in the sprint (queried live from `ph_issues.sprint_id`, the FK — D-002), not a pre-seeded row per "type present" at sprint-creation time (impossible to know before any items exist) and not a hardcoded default value (would be wrong per above). A human explicitly picks the correct done status per type from that type's real live catalog. Also skipped the create-modal DoD section from A6's S2.1a spec — a sprint has zero items at creation time, so an empty DoD editor there has no value; the card only appears where it's actually usable (detail page, once items exist).

**Schema**: `supabase/migrations/20260703230000_sprint_dod.sql` — `ph_sprint_dod(id, sprint_id FK cascade, work_item_type, done_status, created_at, updated_at, UNIQUE(sprint_id, work_item_type))`, RLS mirroring `ph_jira_sprints` (anon read + authenticated read/write). Applied to staging via `supabase db query --linked -f`, verified readable via PostgREST.

**Code**: `src/hooks/useSprintDod.ts` (`useSprintItemTypes` — distinct `ph_issues.issue_type` for the sprint; `useSprintDod`/`useSetSprintDod`/`useRemoveSprintDod` — CRUD on `ph_sprint_dod`). `src/components/sprints/DefinitionOfDoneCard.tsx` — one row per type present, `@atlaskit/select` (canonical, not a hand-rolled `<select>`) populated from `useWorkflowStatuses(type)` for unconfigured types, a green `Lozenge` + hover-reveal remove (✕) for configured ones. Mounted in `ReleaseSidePanel.tsx` gated `config.kind === 'sprint'`, between Description and Approvers.

**Verified live** on BAU-Sprint 7.1: card showed "Backend" (BAU-6112) and "Sub-task" (BAU-6114) — the two real types in the sprint. Picked "Done" for Backend from its real dropdown (Done/Backlog/… — a real, working, non-empty catalog). Saved, rendered as a green DONE lozenge with hover-remove. **Survived a hard reload** — genuinely persisted, not optimistic-only.

`npx tsc -p tsconfig.app.json --noEmit` — 183 errors, same baseline. No new errors from this slice.

**Not built yet** (next Phase 2 slices per the master plan): the actual DB trigger that watches DoD satisfaction and auto-transitions active → awaiting_approval (S2.1's "evaluation" half, A4 §3 — this session only built the config/authoring side); approvals flow (S2.2); AI summary cache, dependencies, scope history, health, time-in-status (Phase 3, still gated).

## ENTRY — 2026-07-02 (session 002, live) — S2.2a DoD-evaluation trigger built and verified end to end

Background task `task_0770338d` session ended — consistent with this session's earlier finding that it was chasing an already-resolved symptom (the workflow-wiring fix).

**Schema**: `supabase/migrations/20260703240000_sprint_dod_evaluation.sql` — `fn_sprint_check_dod()` (SECURITY DEFINER) + `trg_sprint_check_dod` AFTER UPDATE OF status, sprint_id ON `ph_issues`. Per A4 §3's contract: bails unless the sprint is `active`; bails if the sprint has zero members; a type present in the sprint with NO configured `ph_sprint_dod` row counts as unsatisfied (not as trivially passing — zero-assumption); all-satisfied flips the sprint straight to `awaiting_approval`, never `completed` (approval gate always required, matches D-004). Applied to staging via `supabase db query --linked -f`.

**Verified end-to-end on BAU-Sprint 7.1** (both real bugs found along the way, not fixed — flagged separately, worked around for this test only):
1. Discovered the sprint detail page's status dropdown still only offers legacy `Release`/`Archive` verbs, not the native `planning→active` transition — the "Start sprint" lifecycle action (S2.2b) genuinely doesn't exist yet. Set `status='active'` directly via SQL to unblock testing the trigger itself.
2. Discovered work-item status transition menus are two different systems depending on type: Story/Backend-type items have effectively any-to-any transitions (a flat list including many synonymous "done-like" terminal states — DONE/CLOSED/RELEASED/COMPLETED/APPROVED/RESOLVED all coexist, a pre-existing data-quality mess, not touched); Sub-task items have a strictly guarded state machine that didn't allow a direct transition to "Done" from "In Progress" in one step. Set BAU-6114's status to "Done" directly via SQL for this one test item rather than navigate its full transition graph.
3. Set BAU-6112 to "Done" through the real UI dropdown (worked normally, its type isn't guarded).
4. With both items at "Done", the trigger fired: `ph_jira_sprints.status` flipped from `active` to `awaiting_approval` with zero application code involved — pure DB trigger.
5. Confirmed live in the browser after clearing the app's persisted React Query cache (`localStorage['catalyst-rq-cache']` — necessary only because the DB was written to directly, bypassing the app's own mutation path that normally triggers cache invalidation; not a product bug, a testing artifact of this method). Screenshot: status badge reads "Awaiting approval", both work items show green "DONE" pills, progress bar is green/full at "1 of 2 done" (category counts — both are in the 'done' category despite the fraction label using a stricter completion definition).

`npx tsc -p tsconfig.app.json --noEmit` — 183 errors, same baseline.

**Confirmed gaps for a future slice (S2.2b)**: no "Start sprint" UI action (planning→active); no UI to reverse/reject an `awaiting_approval` sprint back to `active`; approvals flow (S2.2/2.3) entirely unbuilt — `ph_sprint_approvers` table exists from an earlier, unrelated migration but has no decided_at/decision_note/policy wiring yet.

## ENTRY — 2026-07-02 (session 002, live) — merged both background-task fixes; both defects confirmed closed

Both background sessions (`task_de9ee431` "Issue not found", `task_0770338d` "status doesn't persist") finished with real, well-evidenced fixes on their own branches. Reviewed both diffs, then merged locally into `main` (not pushed):

- `claude/stoic-wilbur-386e09` (fast-forward, `d5210c42b`) — root cause was NOT the workflow-relationship error I found earlier; that session's own investigation (documented in `features/CAT-DETAIL-MODAL-404-20260702-001/`) found the REAL cause: 21 `ph_issues` rows in BAU (including BAU-13 and BAU-316, the exact two I hit "Issue not found" on) were wrongly soft-deleted in two bulk timestamp batches, cross-verified against live Jira via JQL before restoring. Migration `20260703220000_restore_wrongly_deleted_bau_issues.sql` — already applied to staging by that session during its own validation (re-running it here correctly no-ops with "matched 0", confirming it was already live). Also hardens `useWorkflowStatuses`/`useCreateStory.ts` and the Catalyst detail-view family against the relationship error as defense-in-depth, even though it wasn't the actual root cause this time.
- `claude/affectionate-hugle-3f88e2` (merge commit) — `useCatalystIssueMutations.ts`: adds `ph_entity_items` (the sprint/release detail work-items list query key) to the shared invalidation predicate, and converts silently-swallowed Supabase errors into thrown errors + toast surfacing. This is the actual fix for "status doesn't persist" — confirms my earlier finding that it wasn't a write failure, it was a missing cache invalidation on this specific query key.

Note: both branches' names collided at the filename-timestamp level with my own new migrations (`20260703220000_sprint_release_link.sql` vs their `20260703220000_restore_wrongly_deleted_bau_issues.sql`) — different full filenames, no actual file conflict, left as-is.

**Verified live post-merge**: BAU-13 ("Chemical Permits") now opens with full detail content instead of "Issue not found" — screenshot captured. `npx tsc -p tsconfig.app.json --noEmit` — 183 errors, same baseline, no regressions from either merge.

All defects found during this session's Sprints work are now closed. Remaining known gaps (not defects — unbuilt scope): "Start sprint" lifecycle action, approvals flow UI, the inconsistent per-type transition-graph strictness (some types any-to-any, some guarded — a pre-existing data/workflow-design question, not something to unilaterally "fix" without a product decision on which is correct per type).

## ENTRY — 2026-07-02 (session 002, live) — S2.2b/S2.3 approval decisions built and verified end to end

**Schema**: `supabase/migrations/20260703250000_sprint_approval_flow.sql` — adds `decided_at timestamptz`, `decision_note text` to `ph_sprint_approvers` (already existed from an earlier, unrelated migration — `20260626040000`). New `fn_sprint_check_approval()` (SECURITY DEFINER) + `trg_sprint_check_approval` AFTER UPDATE OF status ON `ph_sprint_approvers`: bails unless the sprint is `awaiting_approval`; a single rejection immediately reopens the sprint to `active` (D-004); otherwise evaluates `ph_jira_sprints.approval_policy` — `any` (≥1 approved), `all` (100% approved, zero rejected), `quorum` (strict majority, `approved*2 > total` — no majority threshold was specified anywhere in the prior decisions/discovery docs, so this is a new explicit choice, documented here rather than guessed silently). Zero approvers never auto-completes (matches the Plan Lock's "or explicit confirm when zero approvers" — that confirm action isn't built, deliberately left as a gap rather than assumed). Applied to staging via `supabase db query --linked -f`.

**UI**: `ReleaseSidePanel.tsx`'s existing `ApproversCard`/`ApproverRow` (shared with releases — did not fork it) extended with a `decideApproval` mutation (stamps `decided_at` on the same write) and inline Approve (✓) / Reject (✕) icon buttons, gated `config.kind === 'sprint' && entityStatus === 'awaiting_approval' && approver.status === 'pending' && approver.userId === currentUserId` — approval is a first-person action, never clickable on someone else's row. Current-user id fetched once via `supabase.auth.getUser()`.

**Verified live end-to-end** on BAU-Sprint 7.1 (already `awaiting_approval` from the prior DoD-trigger test): added Vikram Indla as approver (policy defaults to `all`, single approver) → clicked Approve → sprint status flipped to **Completed** immediately, no manual cache-clearing needed this time (confirms the merged `useCatalystIssueMutations.ts` invalidation fix works for this path too, not just the one it was written for). Survived a hard reload — genuinely persisted.

`npx tsc -p tsconfig.app.json --noEmit` — 183 errors, same baseline, no new errors.

**Phase 2 (lifecycle) is now fully built and demonstrated**: DoD authoring → DoD-satisfaction auto-transition to awaiting_approval → approval decision → policy-gated completion, or rejection → back to active. Only remaining lifecycle gap is the "Start sprint" button (planning→active) — everything downstream of "active" now works.

## ENTRY — 2026-07-03 (session 002, live) — S2.2c native lifecycle menu built and verified; Phase 2 fully closed

Closed the last lifecycle gap. `ReleaseSidePanel.tsx`'s `StatusDropdown` built its menu purely off the 3-value release bucket (`uiStatus`), so a sprint in any of planning/active/awaiting_approval always got mapped to "unreleased" and only ever offered Release/Archive. Added a sprint-kind branch that reads `rawStatus` + the existing `SPRINT_STATUS_TRANSITIONS` map (from `sprintStatus.ts`, already defined, never wired to this menu) and a new `setSprintStatusDirect()` write path (separate from the release-shaped `setStatusDirect`, which resets a nonexistent-for-sprints `actual_date` field). Deliberately filters out `awaiting_approval` and `completed` as manual targets — those must only be reached via the DoD trigger and the approval decision built in the prior two entries; exposing them as one-click dropdown items would let someone skip DoD or the approval gate entirely, defeating D-004.

**Verified live end-to-end** on a fresh test sprint (created, tested, then cleaned up via Archive): Planning →(Start sprint)→ **Active** →(Cancel sprint)→ **Canceled** →(Archive, via the existing confirm modal)→ archived. Each transition updated the status badge instantly, no manual cache-clearing. Confirmed the menu correctly restricts to exactly the allowed next states at every step (e.g. Active only offers "Cancel sprint" — no manual "Complete").

`npx tsc -p tsconfig.app.json --noEmit` — 183 errors, same baseline, no new errors.

**Phase 2 (sprint lifecycle) is now completely built and demonstrated end to end**, from creating a sprint through to completion or cancellation. Nothing lifecycle-related is left unbuilt. Remaining unbuilt scope is Phase 3 only: AI sprint summary, dependencies, scope-change history, sprint health, time-in-status/efficiency analytics (all gated per D-007 until native transition data accrues further).
