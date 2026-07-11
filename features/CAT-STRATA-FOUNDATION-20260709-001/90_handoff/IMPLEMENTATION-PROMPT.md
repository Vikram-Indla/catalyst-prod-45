# IMPLEMENTATION PROMPT — for the build session (Claude Code)

```
continue feature CAT-STRATA-FOUNDATION-20260709-001
```

Read first (in order): `00_admin/STATE.json`, `01_OBJECTIVE.md`, `02_CANONICAL_DISCOVERY.md`, `20_analysis/CONFLICTS.md`, `20_analysis/ASSUMPTIONS.md`, `40_requirements/REQUIREMENTS.md`, `60_delivery/FEASIBILITY.md`. Then write `03_PLAN_LOCK.md` for Wave W0/W1 and STOP for approval.

## Constraints (non-negotiable)

0. **Branch (CON-003 decided 2026-07-09): build from `strata-standalone`, NOT `main`.** Per `README_STRATA_ISOLATION.md`, STRATA work happens on `strata-standalone` or feature branches from it. Create a fresh worktree from `strata-standalone` (never `git switch` a shared checkout). IA target = extend `/strata/*` hub routes inside the existing shell.
1. **Refactor `src/modules/strata/` in place — never create a second strategy module or parallel terminology.**
2. Gate R2 decisions are RECORDED in `00_admin/DECISIONS.md` (2026-07-09): CON-001 = full rename incl. DB; CON-002 = decommission + migrate `/enterprise/objectives` stacks (REQ-022/023); CON-003 = strata-standalone + `/strata` IA; CON-006 = delete Astryx + update CLAUDE.md. Do not re-ask.
3. Pre-flight probes before any DDL: `cat supabase/.temp/project-ref` (staging `cyijbdeuehohvhnsywig` vs prod `lmqwtldpfacrrlvdnmld`); live `list_tables` drift check vs migrations (ASM-001). ASM-002 is RESOLVED (2026-07-09, repo evidence): `strata_execution_links` is a generic typed-edge table; project-objective→theme-objective via `strategy_elements.parent_id`, project-KPI→theme-KPI via `'rolls_up_to'` edge, KR↔KPI via `strata_key_results.kpi_id`. Only the card→strategic-objective edge is missing (REQ-007). For REQ-022, inventory the legacy enterprise-objectives tables + live row counts before writing the migration.
4. Migrations: `YYYYMMDDHHMMSS_strata_<topic>.sql`, one concern per file, unique version, RLS per §C6 pattern, slug trigger via `strata_generate_slug()`, additive/preserving (goal impl-rules 6–8).
5. UI: ADS tokens only; canonical components; mockup-first per `.claude/mockup-contract.md`; Grid E layout (`CatalystListPageLayout` / `AtlaskitPageShell flush`); screenshot signoff; zero-assumption data rendering.
5b. **Design direction is LOCKED to `50_design/DESIGN-DIRECTION.md` ("Command Room", Mobbin SRC-M1..M7)**: Strategy Map canvas as signature surface (enhance existing `StrataStrategyMapPage`), executive KPI band on every area landing, TheyDo-style scorecard grid + side panel, health-dot portfolios with segmented 4-kind value bars, Linear-style Project Card detail, editorial board-pack for Governance. Do not build plain table-first pages for area landings. Resolve the three open design items (chart primitive inventory, map connector approach, value-bar component identity) in the Plan Lock.
6. Theme↔Portfolio ban is enforced at the STRATA domain/DB layer (CRE Grid C does not cover `strata_*` entities).
7. Stage explicit files only; commit gate per CLAUDE.md.

## Wave 1 tasks (after W0 probes + Plan Lock approval)

- REQ-001/003: Play→Theme charter rename in `types.ts`, `domain/index.ts`, `useStrata.tsx`, 3 pages + terminology guard test.
- REQ-002: DB rename migration `strata_play_charters`→`strata_theme_charters` + RPC (CON-001 = full rename, decided).
- REQ-004/005/006: sidebar regroup to Strategy Execution / Balanced Scorecard / Value Management Office / Governance (EnterpriseSidebar.tsx L28-57 or new StrataSidebar on SidebarBase), routeRegistry titles, cycle context on area pages.

## Later waves (own Plan Lock slices — do NOT bundle into W1)

- REQ-007 card→objective edge + REQ-008/009 smoke coverage; REQ-010 Theme↔Portfolio ban hardening; REQ-011..015, REQ-019..021.
- REQ-022/023 (CON-002 decommission + migrate): legacy-table inventory → reversible data migration with row-count reconciliation → route redirects → stack removal (REQ-016). Highest-risk wave; runs last, its own timebox and rollback plan.
- REQ-017 Astryx deletion + CLAUDE.md correction; REQ-018 dead `public.scorecards` drop.

## Verification per wave

`npm run lint:colors`, `npm run audit:ads:gate`, `npm run lint:cre`, `vitest` (new `src/modules/strata/__tests__/`), dead-link nav sweep, seed-chain queries (REQ-020 AC), screenshots for UI acceptance. Record all evidence in `06_VALIDATION_EVIDENCE.md`.
