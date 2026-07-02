# CAT-SPRINTS-NATIVE-20260702-002 — Handover

> State handover for the next session. Supersedes all prior versions. Written 2026-07-03 after
> a single long live session that rebuilt the list, verified/fixed Phase 0, and built Phase 1 + 2
> end to end with browser screenshots at every step (not just claimed — actually clicked through).

## Feature Work ID
CAT-SPRINTS-NATIVE-20260702-002

## Status
**Phase 0 (foundations), Phase 1 (list + create), and Phase 2 (lifecycle: DoD → awaiting_approval → approval → completion) are DONE and verified live in the browser.** Phase 3 (insights/analytics) is NOT started. This is a real status, not a claim pending verification — every item below was clicked through in Chrome MCP this session with a screenshot, most more than once (including after a hard reload, to rule out optimistic-UI-only illusions).

## Branch / HEAD
`main` @ `8e2a61139` (a merge of two background-task fix branches, `claude/stoic-wilbur-386e09` and `claude/affectionate-hugle-3f88e2`, done locally this session — not pushed).

**Nothing from this session has been committed yet.** All of the following are uncommitted in the working tree and need explicit review + commit approval before anything is pushed:
- Modified: `src/components/releases/detail/ReleaseSidePanel.tsx`, `src/components/sprints/SprintCreateModal.tsx`, `src/pages/project-hub/SprintsPage.tsx`
- New: `src/components/sprints/cells.tsx`, `src/components/sprints/SprintsTable.tsx`, `src/components/sprints/DefinitionOfDoneCard.tsx`, `src/hooks/useSprintDod.ts`
- New migrations (already applied to staging `cyijbdeuehohvhnsywig`, but not yet committed as files): `20260703220000_sprint_release_link.sql`, `20260703230000_sprint_dod.sql`, `20260703240000_sprint_dod_evaluation.sql`, `20260703250000_sprint_approval_flow.sql`
- This folder's own docs (`04_EXECUTION_LOG.md`, `07_HANDOVER.md`, `08_DRIFT_LOG.md`, `14_COUNCIL_VERDICT_V2.md`, `sessions/002_continue_feature.md`)

**Full narrative of every decision, bug found, and fix is in `04_EXECUTION_LOG.md` — read that before touching anything, it's the source of truth for *why*, not just *what*.**

## Plan Lock status
Still formally DRAFT / never re-locked as-built. Given how much shipped this session with live verification at every step, re-locking is process debt, not a functional risk — but do it before the next slice starts, per the standing drift rule.

## What is DONE (verified live this session, screenshots taken)
- **List page**: rebuilt on `SprintsTable`/`JiraTable` (was reverted mid-flight by a prior session, then correctly rebuilt — see 04_EXECUTION_LOG for the full font/typography bug chain). Correct 14px body text, 1W/2W lozenge, native status pills, Owner avatar, working row-actions kebab (was invisible + mispositioned, both fixed).
- **Create/edit sprint modal**: auto-naming with real `-2`/`-3` dedupe (tested live), Owner field, project-scoped Release picker.
- **Grouping**: by Status and by Month (Start date) — both already worked, contrary to older notes claiming otherwise.
- **Progress**: real FK-based count AND colored segmented bar (found and fixed a real flexbox sizing bug that made the bar's fill invisible for the entire life of the feature until this session).
- **Release link (S1.4)**: new `release_id` FK column on `ph_jira_sprints` → `ph_releases`, one release per sprint (Vikram's explicit call — no many-to-many). List column + create/edit picker both live.
- **Definition of Done (S2.1)**: per-work-item-type done-status picker, scoped to types actually present in the sprint (via the `sprint_id` FK), no hardcoded "Done" default — deliberately, because live data proved that assumption wrong for real types (Story's real terminal status is "In Production", not "Done"). Uses `@atlaskit/select` populated from each type's real live workflow catalog.
- **Awaiting-approval trigger (S2.2a)**: DB trigger (`fn_sprint_check_dod`) auto-flips `active` → `awaiting_approval` the instant every item in the sprint is at its configured done status. Never auto-completes.
- **Approval decisions (S2.2b/2.3)**: Approve/Reject buttons on the Approvers card, first-person only (can't click someone else's row), policy-aware (any/all/quorum — quorum defined as strict majority, a new explicit decision, not specified anywhere before). Rejection reopens to `active`; policy-satisfied approval completes the sprint.
- **Native lifecycle menu (S2.2c)**: the status dropdown used to only offer legacy Release/Archive verbs for sprints. Now offers the real native transitions (Start sprint, Cancel sprint, Archive) and — importantly — deliberately does NOT expose "awaiting_approval" or "completed" as manual dropdown targets, so nobody can accidentally bypass the DoD/approval gate you just built.

## Bugs found and fixed this session (all merged, all verified)
1. Sprint name rendering at 11px instead of 14px (typography bug, root cause of the original complaint that started this session).
2. Row-actions kebab icon invisible + its menu opening in the wrong corner of the screen (two separate bugs, both in the same cell).
3. "Issue not found" opening any work item from the Backlog page — root cause was 21 wrongly-soft-deleted `ph_issues` rows, cross-checked against live Jira before restoring. Fixed on a background-task branch, merged in, verified live (BAU-13 opens correctly now).
4. Work-item status changes appearing not to persist — root cause was a missing cache-invalidation key, not a failed write. Fixed on a background-task branch, merged in, verified live (approve button now updates the UI instantly with zero manual intervention).
5. Progress bar's colored fill never rendering for anyone, ever — a flexbox sizing bug present since the feature's original build, invisible until this session because no sprint had real in-progress/done data before.

None of these were part of the original ask — all found incidentally while building, all fixed, all confirmed with a live screenshot.

## What is NOT done (Phase 3 — the actual next work)
- **AI sprint summary** — cached by structural hash, per the original objective (S3.1).
- **Sprint health score** (S3.4) — there's an adjacent, separate feature folder `CAT-HEALTH-ENGINE-20260702-001` that may already cover part of this; check it before building from scratch.
- **Time-in-status / efficiency analytics** (S3.5) — gated on D-007's three proofs; two were met as of the last check (native transitions now accrue thanks to this session's DoD/approval triggers actually firing), the third (FK as sole membership read path) should already hold from Phase 0 — worth a quick re-verification rather than assuming.
- **Scope-change history** (S3.3).
- **Dependencies** (S3.2).
- All of Phase 3 is explicitly gated in the original objective doc (`01_OBJECTIVE.md`) behind proof that transition data is real and complete — now that DoD/approval actually write real transitions (this session's work), that gate is more plausibly open than it's ever been. Verify, don't assume.

## Known non-blocking gaps (not part of Phase 3, just noted for completeness)
- Some work-item types have any-to-any status transitions, others have a strictly guarded transition graph — a pre-existing data/workflow-design inconsistency, not something to silently "fix" without a product decision on which is correct per type.
- The "Product" label on the sprint list's Group filter is inherited from the shared release-filter component and is technically inaccurate (it actually groups by Project) — cosmetic only.
- Everything in this feature is staging-only (`cyijbdeuehohvhnsywig`). Prod (`lmqwtldpfacrrlvdnmld`) has no `ph_jira_sprints` table at all — this was true before this session and is still true now. Don't claim anything is "live for real users" without addressing this first.

## Next exact action
1. Read `01_OBJECTIVE.md` and `09_DECISIONS.md` (especially D-007, the three-proof gate for analytics) before writing any Phase 3 code.
2. Check `CAT-HEALTH-ENGINE-20260702-001`'s folder for prior art on sprint health before building it fresh.
3. Re-verify D-007's proofs against current live data (native transition rows should now exist from this session's DoD/approval work — confirm the count, don't assume).
4. Get a Plan Lock re-approved for the Phase 3 slice before writing code, per the standing contract.
5. Follow the same working pattern this session established: check real data before assuming a UI/schema detail (it caught at least three wrong assumptions before they became bugs), and screenshot every tangible piece before calling it done.

## Next prompt
`continue feature CAT-SPRINTS-NATIVE-20260702-002`
