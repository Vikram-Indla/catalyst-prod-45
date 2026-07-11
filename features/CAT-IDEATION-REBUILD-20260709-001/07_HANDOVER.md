# HANDOVER — CAT-IDEATION-REBUILD-20260709-001

**Updated**: 2026-07-09 · **Resume with**: `continue feature CAT-IDEATION-REBUILD-20260709-001`

## State
- Phase 0 (design lock): ✅ EXITED. D1–D9 decided (09_DECISIONS.md). Design of record ratified = discovery folder 03 (architecture) + 04 (design pack) + 05 v2.1 (Mobbin MCP evidence).
- Phase 1 (foundations, 5 slices): **S1 ✅ · S2 ✅ · S3 ✅ (staging, post DRIFT-001 repair) · S4 ✅ · S5 ✅ (validated, commit pending)**.
- Active Plan Lock: `03_PLAN_LOCK_PHASE1.md` (APPROVED — code authorized through S5).

## Commits (main)
- `0bf86b336` S1 core schema (idn_ideas + 5 satellites, race-safe IDEA-N, terminal-lock RLS)
- `e22adcf8f` S1 validation evidence (8/8 staging RLS probes)
- `5ff3856fd` S2 governance schema (scoring framework + recompute trigger, AI ledger, embeddings, conversions, br.source_idea_id) + 7/7 probes

## Staging (catalyst-staging · cyijbdeuehohvhnsywig)
- Both migrations APPLIED; ledger versions aligned 1:1 with committed files (20260709130000, 20260709150000).
- Apply path: **Supabase MCP connector** (token is staging-scoped; prod invisible). Repo checkout is NOT linked — keep it that way; do not `supabase link` the shared checkout.
- pgvector 0.8.0 enabled. All probe rows cleaned up. Key sequence currently at IDEA-2 (gap-tolerant; probes consumed 1–2).

## Commits (this session)
- **S3** `b8b865fea` — Scoring models, workflow, guards, notifications, admin roles (migration + guards registry)
- **S4** `55725710f` — Feature flag (VITE_ENABLE_IDEATION), HubSwitcher update, admin nav/roles in S3 migration

## Status (updated session 004, 2026-07-09)
- **S3**: ✅ APPLIED to staging + validated (12/12 probes, 06_VALIDATION_EVIDENCE.md) — after DRIFT-001 fix. The committed migration had 4 schema mismatches (wrong table `ph_wf_templates`, missing `notification_trigger_config`, wrong `admin_nav_modules` columns, non-existent role codes). Amended per D10–D12 (09_DECISIONS.md). **Amended migration file + feature docs not yet committed — commit approval pending.**
- **S4**: Code complete (committed `55725710f`); DB side now live via S3.
- **S3 amendment**: ✅ committed `41a6bf47c` (session 004).
- **S5**: ✅ Code complete + validated live both flag states, both themes (session 005). Routes/scaffold/sidebar/shell done; legacy /ideation/* + /product/ideas/* mounts removed (D1); flag-off nav-leak fixed (CatalystShell/HubSwitcher/HomeSidebar). Commit pending gate approval.

## Handoff to Next Session

**Immediate next steps**:
1. Land the S5 commit (if not landed this session)
2. Phase 1 exit review → Phase 2 Plan Lock (Inbox 2-pane triage, Explore list via JiraTable proof, submit form — CRUD over idn_*)
3. Env note: vitest cannot start locally (rolldown styleText vs Node 20.12) — consider Node bump; suites run in CI

**Known blockers**: None. D10 note: staging exit-criterion "notification triggers present" is waived (table absent on staging; conditional seed applies where it exists). Session-ops: GitHub Desktop switched the shared checkout mid-session — see session 005 incident note; user's strata DECISIONS.md edit is preserved in named stash@{0}.

## Next: S5 — Shell + Routes
1. Ideation workflow in `ph_wf_*` (states per discovery-03 §4: draft→submitted→screening→evaluation→decided(+approved/declined/parked/merged)→converted→delivered) — **discover ph_wf_* table shapes first** (src/lib/workflow/canonical/runtime.ts + ph_wf migrations).
2. Register 3 guards in GUARD_EVIDENCE_REGISTRY (runtime.ts:19-47): `strategy_link_present`, `scores_complete`, `duplicate_review_complete` — registry is TS code, check whether guards also need DB rows.
3. IdeationHub notification triggers (10 events, discovery-03 §8) — discover notification_trigger_config seed format (notificationTriggerService.ts + 20260704* migrations); quiet defaults: P3/P4 in-app only (04 §I.8).
4. Scoring model v1 seed: name "Default", slug default-v1, weighted_sum, drivers value(0.6,higher)/effort(0.4,lower), status approved (seed may set approved directly with change_reason 'initial seed') + INACTIVE RICE/WSJF preset models (status draft).
5. `ideation` module-role defaults in `admin_role_module_permissions` — discover row format (AdminAccessPage/useModuleAccess).
Then S4 (flag + ModuleGuard) and S5 (shell seats + legacy route-mount removal per D1 + scaffold src/modules/ideation/).

## Cautions
- Two unrelated dirty files in the checkout belong to the TestHub session (features/CAT-TESTHUB-CERT-20260708-001/DEFECT_REGISTER.md, src/pages/testhub/cycles/ExecutionPage.tsx) — never stage them.
- Discovery folder `features/CAT-IDEATION-DISCOVERY-20260709-001/` is intentionally uncommitted (not yet approved for commit).
- Zero legacy carryover rule: no reads/imports of ph_ideas, modules-dormant/ideation, useIdeation/useIdeasHub, ideationService, CatalystViewIdea. Legacy route-mount removal happens in S5 only (FullAppRoutes.tsx:133-139, 571-593).
- Ledger discipline: apply via MCP `apply_migration`, then align `supabase_migrations.schema_migrations.version` to the committed filename timestamp (done for S1/S2 — repeat for every slice).
- Model routing: schema/wiring slices OK on Sonnet; UI slices (Phase 2+) and all reviews stay Fable/Opus (delegation-guard hook enforces explicit choice).

## Drift
None. 08_DRIFT_LOG.md empty.
