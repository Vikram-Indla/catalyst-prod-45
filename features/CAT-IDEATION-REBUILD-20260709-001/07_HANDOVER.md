# HANDOVER — CAT-IDEATION-REBUILD-20260709-001

**Updated**: 2026-07-09 · **Resume with**: `continue feature CAT-IDEATION-REBUILD-20260709-001`

## State
- Phase 0 (design lock): ✅ EXITED. D1–D9 decided (09_DECISIONS.md). Design of record ratified = discovery folder 03 (architecture) + 04 (design pack) + 05 v2.1 (Mobbin MCP evidence).
- Phase 1 (foundations, 5 slices): **S1 ✅ · S2 ✅ · S3–S5 ⏳ pending**.
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

## Status
- **S3–S4**: Code complete. Ready for staging migration apply + validation.
- **S5**: Detailed plan created (`sessions/003_s5_shell_routes_plan.md`). Ready for implementation.

## Handoff to Next Session

**Immediate next steps**:
1. Apply S3 migration to staging (cyijbdeuehohvhnsywig) via Supabase MCP
2. Verify: scoring models, workflow, guards in DB (see validation script in S3 session log)
3. Implement S5 per `sessions/003_s5_shell_routes_plan.md` (routes, scaffold, shell integration)
4. Local smoke test (VITE_ENABLE_IDEATION=true) + flag-off validation
5. Staging readiness review + Phase 2 Plan Lock planning

**Known blockers**: None. S3 migration is idempotent; S4 is fully compatible with existing nav architecture.

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
