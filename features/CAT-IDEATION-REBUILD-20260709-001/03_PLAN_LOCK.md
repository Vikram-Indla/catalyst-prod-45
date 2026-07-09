# PLAN LOCK — Phase 0: Design Lock

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ APPROVED by Vikram 2026-07-09 (D1–D9 per recommendations; see 09_DECISIONS.md) · **Timebox**: 2h (decision session)
**Active lock is now**: `03_PLAN_LOCK_PHASE1.md` (Foundations) — awaiting approval.
**Scope**: ratify the design pack and close every open decision so Phase 1 can be Plan-Locked. **NO CODE IN THIS PHASE.**

## Objective
Approve design-of-record (03/04/05 in the discovery folder), decide D1–D9 below, and authorize drafting of the Phase 1 (Foundations) Plan Lock.

## Non-scope
No code, no migrations, no schema, no decommission, no seeds, no route changes.

## Decisions required (recommendation first — approve, override, or annotate each)

| # | Decision | Recommendation | Rationale |
|---|---|---|---|
| D1 | Dark-launch URL strategy | **Routes-only early decommission**: Phase 1 removes legacy `/ideation/*` + `/product/ideas/*` route mounts (FullAppRoutes.tsx:133-139, 571-593) and claims the prefix for the new module behind `VITE_ENABLE_IDEATION`. Full decommission (DB/components) stays Phase 8 | Avoids `/ideation-next` throwaway URLs and the collision blind spot (04 §I.10); legacy pages are unreachable-but-intact until Phase 8 |
| D2 | Legacy `ph_ideas` data disposition | **Archive then drop**: CSV/parquet snapshot of ph_ideas + satellites to cold storage before Phase 8 drop | Destructive either way; archive costs minutes and forecloses nothing. **Requires explicit sign-off — will not proceed on silence** |
| D3 | Vote model | Vote + 4-level importance (critical/important/nice/none) | Mobbin/Productboard evidence (05 §C row 12, 02 §C) |
| D4 | Default portfolio axes | Value (y) × Effort (x) from default scoring model v1 | TheyDo configurable-axes pattern; admin can re-map later |
| D5 | Campaigns in V1 | Out — P2 | Planview evidence is strong but orthogonal to the core funnel |
| D6 | Global "+ Idea" entry | V1 = sidebar button + `?create=idea` on ideation routes; shell-wide ContextSwitcher entry = P1 after shell-owner alignment | ContextSwitcher convention is per-hub (ContextSwitcher.tsx:600-605); shell touch needs coordination |
| D7 | AR translation workflow | Name a string-catalog owner; AR copy authored (not machine-translated) per surface before its Phase 7 exit | react-intl stubbed in tests; no active catalog today |
| D8 | Scoring-model publish approver | Ideation Admin publishes, SuperAdmin approves (GovernedEnvelope `approved_by`) | Mirrors STRATA governance envelope |
| D9 | Non-canonical component approvals | Approve the 5: vote-with-importance control, AI suggestion card, portfolio field chart (recharts), guard checklist, phone card-list | No canonical equivalents exist (02_CANONICAL_DISCOVERY.md); all built from Atlaskit primitives + ADS tokens |

## Resolved this phase (evidence)
- Chart library: **recharts ^3.5.1 already in package.json** — no new dependency.
- BR terminal-event source for auto-Delivered: **DB-trigger precedent** `track_epic_process_step_change()` (migration 20251211141446:1401,11918) + `useWorkItemRealtime.ts`; final wiring chosen in Phase 5 slice plan (default: trigger).
- Mobbin verification: complete via MCP (05 v2.1), all 11 surfaces image-verified.

## Canonical components / screens
Per `02_CANONICAL_DISCOVERY.md` table. Icon: `@atlaskit/icon/core/lightbulb` (+`-filled`), hub SVGs per icons.registry.

## Files to modify (Phase 0)
Docs only, this folder. **Files forbidden**: all of `src/`, `supabase/`, legacy ideation inventory.

## UI/UX & data rules
ADS tokens only (zero hex/rgb/Tailwind colors); canonical components per 02; zero-assumption rendering; slug contract on all new routes; no reads of legacy ph_ideas anywhere in new code.

## Validation
- [ ] D1–D9 each carry Vikram's explicit decision in 09_DECISIONS.md
- [ ] Design pack (03/04/05) marked APPROVED (or change-list issued)
- [ ] Phase 1 Plan Lock drafted and queued for review

## Stop conditions
Any D-item vetoed without replacement → stop, re-plan. Any request to start coding before this lock is approved → refuse, cite this file.

## Drift / rebaseline
Design-pack changes after approval = drift → log to 08_DRIFT_LOG.md + re-approve affected sections.
