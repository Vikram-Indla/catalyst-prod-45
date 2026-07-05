# CAT-STRATA-20260705-001 — Karpathy Loop Log

> Karpathy Loop for Catalyst means Hypothesis → Experiment → Measure → Keep/Discard → Log.

---

## [LOOP-001] Old strategy code is dormant residue, not a live product

**Date:** 2026-07-05 · **Phase:** Discovery
**Hypothesis:** StrategyHub/Astryx code exists but is prototype residue that should be replaced, not patched.
**Experiment:** Lane 1 repo sweep for strategy/astryx/scorecard/okr across src/; route reachability check.
**Evidence:** StrategyRoom lives in `src/modules-dormant/strategy/` yet is still routed at /strategyhub; ComingSoon stubs on sub-routes; es_* types referenced but model is screen-led, not config-first.
**Decision:** KEEP hypothesis — greenfield replace; reuse only RBAC-scoping pattern + selected widget ideas.
**Next step:** Q1/Q2 owner decisions on tile repurposing and es_* decommissioning.

## [LOOP-002] Canonical component coverage is sufficient for most STRATA surfaces

**Hypothesis:** Catalyst canonical components cover STRATA's tables/pills/modals/layout; gaps limited to canvas/timeline/KPI-tile.
**Experiment:** Lane 3 component inventory + package.json dependency audit.
**Evidence:** JiraTable/StatusLozenge/EmptyState/PageContainer/pragmatic-DnD strong; @xyflow/react and react-resizable-panels already in deps but unused; gaps = KPI tile surface, canonical timeline, executive icon registry.
**Decision:** KEEP — canonical-first is viable; hand-roll list is small and goes through Phase 2 approval.
**Next step:** Query catalyst-storybook MCP in Phase 2 (blocked this session — server unauthenticated).

## [LOOP-003] A strategy map canvas requires a new dependency

**Hypothesis:** No canvas library exists; we'd need approval for a new dep.
**Experiment:** package.json + usage grep.
**Evidence:** `@xyflow/react ^12.10.2` already declared, zero usages — available without adding a dependency.
**Decision:** DISCARD hypothesis — reuse existing dep; styling must pass ADS token review.
**Next step:** Phase 2 canvas design on @xyflow with ADS tokens.

## [LOOP-004] Versioned-config-with-approval already exists somewhere in the repo

**Hypothesis:** Some module already implements governed config (version + effective dates + approval) we can lift.
**Experiment:** Lanes 2/5 sweep for version/effective_from/approval patterns in migrations.
**Evidence:** Partial precedents only — tm version pinning (20260703100623), immutable snapshots (20260703100001), release/sprint approver tables (binary, no workflow engine), no effective-dating, no config change requests, no decision register.
**Decision:** DISCARD hypothesis — STRATA must build the config governance engine new, reusing the snapshot-immutability and audit-trigger patterns.
**Next step:** Config engine is R0 foundation in Phase 3 slice plan.

## [LOOP-005] An ingestion/staging/validation pipeline exists to reuse

**Hypothesis:** Uploads with staging + row-level validation already exist end-to-end.
**Experiment:** Lane 6 sweep of upload components, edge functions, injira_*/mock_run*/ph_sync_log tables.
**Evidence:** Pieces exist (mock_runs status machine + file retention; injira manifests/diff/mappings — built but UNWIRED; ph_sync_log run counters) but no wired staged→canonical flow, no provenance columns on canonical rows, no quarantine.
**Decision:** KEEP patterns / DISCARD as-a-whole reuse — STRATA builds its own strata_upload_runs/staging/validation on these shapes.
**Next step:** Lineage pipeline design in Phase 2 screenshot #9.

## [LOOP-006] Business calculations are centralized server-side today

**Hypothesis:** Existing calc logic is mostly in DB functions/RPCs and STRATA can follow suit trivially.
**Experiment:** Lane 8 inventory of CREATE FUNCTION, RPCs, and client hooks computing metrics.
**Evidence:** Mixed — WSJF triggers + command-center KPI RPCs exist server-side, BUT health/progress/RAG logic computes client-side in hooks (useBusinessRequestHealth.ts:92–94, useReleaseHealth.ts:71–72, useFeatureProgress.ts:78).
**Decision:** DISCARD hypothesis — dominant pattern is drift-prone client compute. STRATA mandate: RPC + versioned formula metadata; UI never calculates scores.
**Next step:** Calc-engine contract in Plan Lock; Q5 confirmation.

## [LOOP-007] Existing RLS discipline is sufficient to copy verbatim

**Hypothesis:** Recent RLS conventions are safe to replicate for STRATA's sensitive data.
**Experiment:** Lane 10 sampling of policies across approval/budget/kb migrations.
**Evidence:** ~60% sound (project-membership joins, hardened sprint approvals) but USING(true) on tm_plan_approvals/transition_approvers, bare auth checks on budget items, direct client writes to financial columns (FixCTCModal.tsx:194–197), and zero approver≠submitter enforcement anywhere.
**Decision:** DISCARD hypothesis — STRATA sets a stricter bar: org/role-scoped RLS everywhere, SECURITY DEFINER RPCs for sensitive writes, DB-enforced segregation of duties.
**Next step:** Security rules section in Plan Lock; security review gate per slice.

## [LOOP-008] Jira integration can be consumed as-is by ProjectCard

**Hypothesis:** STRATA ProjectCard can read the existing ph_* Jira pipeline directly.
**Experiment:** Lane 7 end-to-end pipeline trace + coupling assessment.
**Evidence:** Coupling is tight (7/10): UI reads ph_issues directly (useKanbanData.ts:79), Jira-native columns/values throughout, normalization duplicated client/server. Blueprint §9 forbids Jira-as-schema.
**Decision:** DISCARD hypothesis — STRATA consumes Jira through a mapping seam (sync_entity_map/sync_events conventions, config-driven field mappings, confidence + mapping owner) into strata_project_cards.
**Next step:** Adapter design in Phase 3 R2 slice.

## [LOOP-009] STRATA can mount as a hub with minimal shell work

**Hypothesis:** Hub registration is low-risk plumbing.
**Experiment:** Lane 1 trace of HUBS[], FullAppRoutes MG pattern, ModuleGate/ModuleGuard, routeRegistry.
**Evidence:** One HUBS[] entry + one FullAppRoutes block + feature flag + MG_ROLE_KEY row suffice; ONE trap — Navigate inside FullAppRoutes is swallowed; redirects must mount in App.tsx outside CatalystShell (precedent App.tsx:134–138).
**Decision:** KEEP — plumbing is cheap; trap documented as R6 with day-1 test.
**Next step:** Q1 decision (repurpose Strategy Hub tile vs new tile) before Phase 2 IA is frozen.

## [LOOP-010] Default period should follow evidence, not the calendar

**Date:** 2026-07-05 · **Phase:** Validation (session 003)
**Hypothesis:** Defaulting the module to the calendar-current period is correct.
**Experiment:** Fresh load of /strata against staging seed (scorecards exist for Q1 locked, Q2 live; today = Q3).
**Evidence:** First screen an executive sees was "Enterprise score — / No scorecard for this period"; every widget empty. Switching to Q1/Q2 showed a fully-live product.
**Decision:** DISCARD hypothesis — default period = latest period WITH a scorecard instance (calendar-current only when it has one). Implemented in useStrata.tsx sharing the scorecard-instances query cache; verified Q2 FY2026 LIVE renders on first load.
**Next step:** Consider URL-persisting cycle/period (bookmarkable context) as a follow-up.

## [LOOP-011] Frozen snapshots already contain everything the locked scorecard UI needs

**Date:** 2026-07-05 · **Phase:** Validation (session 003)
**Hypothesis:** Showing per-line values on a locked scorecard requires re-running the calc engine (banned for locked instances).
**Experiment:** Inspected strata_lock_snapshot RPC — it freezes ALL calculated_values rows (including entity_type='scorecard_line') into strata_snapshot_items as to_jsonb(cv).
**Decision:** DISCARD hypothesis — hydrate lines from snapshot items client-side (read-only, immutability intact). Implemented in scorecardApi.calcResult; all 8 Q1 lines render frozen actual/target/score/band.
**Next step:** Same pattern available for perspective drill-ins and board packs.

## [LOOP-012] Atlaskit popup/dropdown positioning cannot be trusted in this shell

**Date:** 2026-07-05 · **Phase:** D-012 lift verification
**Hypothesis:** Replacing direct @atlaskit/dropdown-menu with the ads DropdownMenu wrapper is a drop-in fix for custom-trigger menus.
**Experiment:** Live click-probe of the Period chip after the swap.
**Evidence:** Menu rendered detached at the viewport top-left — the wrapper's custom-trigger path never attaches Atlaskit's triggerRef, and the repo already documents "@atlaskit/popup v4.16 renders empty portals in this codebase" (AllProjectsTable.tsx), which uses a fixed-position div + click-outside instead.
**Decision:** DISCARD hypothesis — StrataChipMenu implements the repo-proven fixed-position pattern (getBoundingClientRect + scroll/resize recompute + Escape/click-outside). Verified anchoring live. Wrapper bug handed to the design-system owner as a spawned task.
**Next step:** When the ads wrapper is fixed upstream, StrataChipMenu can optionally migrate back.
