# PLAN LOCK — Phase 1: Foundations

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ APPROVED by Vikram 2026-07-09 — code authorized for S1–S5 within this lock.
**Design of record**: discovery folder 03/04/05 (ratified D0b). Decisions D1–D9 bind this lock.

## Objective
Ship the invisible skeleton: `idn_*` schema + RLS + seeds, module registration, shell seats, route builders, module scaffold, legacy routes-only decommission (D1) — all behind `VITE_ENABLE_IDEATION` + module key `ideation`. Exit = navigable empty module for flagged users; zero user-visible change for everyone else.

## Non-scope
No CRUD UI beyond empty-state pages (Phase 2). No workflow transitions wired (Phase 3). No AI (Phase 4). No conversion (Phase 5). No DB/component decommission beyond route mounts (Phase 8). No reads of `ph_ideas` anywhere, ever.

## Slices (each ≤2h, sequential, own session log + commit)

**S1 — Core schema.** Migration(s): `idn_ideas` (03 §3 column list), `idn_evidence`, `idn_votes` (D3: importance smallint 1–4), `idn_comments`, `idn_watchers`, `idn_audit_log`; RLS per role matrix (03 §7); slug trigger (releases precedent 20260701000009); `IDEA-N` sequencer (generateIssueKey-style, race-safe). Staging first.
**S2 — Governance schema.** `idn_scoring_models` + `idn_scoring_drivers` + `idn_idea_scores` (GovernedEnvelope, D8 approver chain), `idn_ai_suggestions`, `idn_idea_embeddings` (pgvector + index), `idn_conversions`; additive `business_requests.source_idea_id` (nullable). RLS on all.
**S3 — Seeds.** Scoring model v1 (Value/Effort drivers, D4) + inactive RICE/WSJF presets; ideation workflow in `ph_wf_*` (03 §4 states) + 3 guards registered (`strategy_link_present`, `scores_complete`, `duplicate_review_complete`) in GUARD_EVIDENCE_REGISTRY; IdeationHub notification triggers (03 §8) with quiet defaults (P3/P4 in-app only per 04 §I.8); `ideation` module-role defaults in `admin_role_module_permissions`. Idempotent; demo ideas non-prod only.
**S4 — Module registration + flag.** `ideation` module key wired through useModuleAccess/ModuleGuard; `VITE_ENABLE_IDEATION` in featureFlags.ts (default false); explicitly decoupled from ENABLE_AI.
**S5 — Shell + routes.** New sidebar config (Inbox/Explore/Portfolio + Admin; @atlaskit/icon/core lightbulb set — zero lucide); HubSwitcher.tsx:72 un-deprecate + `moduleKey:'ideation'`; CatalystShell hub-home → `/ideation`; route builders in `src/lib/routes.ts`; **remove legacy route mounts + lazy imports** (FullAppRoutes.tsx:133-139, 571-593) per D1 — legacy pages/components/tables remain untouched on disk; mount new routes behind flag + ModuleGuard; scaffold `src/modules/ideation/{types.ts,index.ts,api/,hooks/,shared/,pages/,components/,admin/}` with empty-state pages (EmptyBoardState).

## Files to modify (exact)
- `supabase/migrations/` — new `idn_*` migrations + seeds (S1–S3; ledger discipline, unique version timestamps)
- `src/lib/featureFlags.ts` (S4) · `src/hooks/useModuleAccess.ts` + module registry rows via migration (S4)
- `src/components/layout/IdeationSidebar.tsx` (config replaced), `HubSwitcher.tsx` (line 72), `CatalystShell.tsx` (hub-home map only) (S5)
- `src/routes/FullAppRoutes.tsx` (legacy mount removal + new flagged mounts) · `src/lib/routes.ts` (builders) (S5)
- `src/modules/ideation/**` (new scaffold) (S5)
- Tests: sequencer race, RLS role-matrix probes, guard registration, adapter smoke (S1–S5)

## Files forbidden
All legacy ideation inventory except the route mounts named above (pages, modules-dormant/, CatalystViewIdea, useIdeation/useIdeasHub, ideationService/ideasRoadmap*, ph_idea* tables — no edits, no imports, no reads). All prod-DB operations.

## Data/backend rules
`cat supabase/.temp/project-ref` before EVERY linked DDL batch — staging `cyijbdeuehohvhnsywig` only; prod (`lmqwtldpfacrrlvdnmld`) forbidden this phase. Migration files committed 1:1 with ledger rows. All new columns/tables additive.

## UI/UX rules
ADS tokens only (color-gate + audit-gate must pass); Atlaskit-core icons only in the new sidebar; empty states use canonical components; no hand-rolled UI.

## Validation commands
`npm run lint:colors:gate` · `npm run audit:ads:gate` · `npm test -- ideation` · `npm run build` · RLS probe script output pasted to 06_VALIDATION_EVIDENCE.md.

## Screenshot checklist (Phase 1 baseline → 10_SCREENSHOT_CHECKLIST.md)
Hub tile + sidebar (flag on); empty Inbox light + dark; empty Explore; admin skeleton; HubSwitcher entry; flag OFF: `/ideation` unreachable, no nav trace.

## Stop conditions
Any legacy-inventory import required to make something work → STOP (design error). Any prod project-ref detected → STOP. Guard registration requires runtime changes beyond the registry → STOP + RED FLAG. Slice exceeds 2h → split.

## Rollback
Flag off = invisible. Schema rollback = drop `idn_*` (no consumers yet) + revert `source_idea_id` migration. Route removal revert = git revert of S5 commit.

## Exit criteria
- [ ] All 5 slices committed (explicit file staging, no `git add -A`), each with session log
- [ ] Flagged user: hub tile → empty Inbox/Explore/Portfolio render; admin skeleton reachable
- [ ] Unflagged user: zero change (screenshot proof)
- [ ] Seeds verifiable: scoring model v1 visible in DB; workflow + guards registered; notification triggers present
- [ ] All validation commands green; screenshots accepted; RLS probes green
