# STRATA — Claude Implementation & Retest Queue V6

**Feature Work ID:** `CAT-STRATA-V6QA-20260712-001`
**Branch:** `strata/v6-qa-remediation` (cut from `main@eb1b5be64`)
**Authoritative inputs:** STRATA-E2E-QA-FINAL-ACCEPTANCE-v6, STRATA-E2E-QA-CONSOLIDATED-RETEST-v6, STRATA-MASTER-ASSERTION-TRACEABILITY-v6, STRATA-COVERAGE-MATRIX. (V4 queue = historical background only.)
**Permitted completion state:** `FIXED — PENDING INDEPENDENT RETEST`. Nothing here is QA-closed.

---

## PHASE 0 — ENVIRONMENT & BASELINE CERTIFICATE

| Item | Verified value | Method |
|---|---|---|
| localhost:8080 process | Node **PID 78989**, `node --max-old-space-size=8192 node_modules/vite/bin/vite.js` (Vite dev server, HMR) | `lsof -iTCP:8080 -sTCP:LISTEN`; `ps` |
| Process working dir | `/Users/jahanarakhan/Documents/GitHub/catalyst-prod-45/catalyst-prod-46` | `lsof -p 78989 -d cwd` |
| Served == my worktree | **YES** — same dir; Vite HMR serves the working tree I am editing | cwd match |
| Git worktree | `/Users/jahanarakhan/Documents/GitHub/catalyst-prod-45/catalyst-prod-46` (origin checkout) | `pwd` |
| Branch (Phase 0 start) | `main` → cut remediation branch `strata/v6-qa-remediation` | `git switch -c` |
| HEAD SHA at start | **`eb1b5be6473980a2d73387914f89bcb3cc99ce94`** ("ideation") | `git rev-parse HEAD` |
| Working tree | **CLEAN** (the dirty paths noted in the V6 QA report — `.codebase-memory/*`, `DropdownMenu.tsx` — are no longer dirty here) | `git status --porcelain` empty |
| Supabase target | **No `supabase/.temp/project-ref` in this checkout** → no linked DDL target. Prod `lmqwtldpfacrrlvdnmld`, staging `cyijbdeuehohvhnsywig` per CLAUDE.md. Any DB apply is a gated decision. | `cat supabase/.temp/project-ref` (absent) |
| Applied migration state | Not queried (no linked project). Migration files present in `supabase/migrations/`; author-and-commit only, unapplied, until an approved staging step. | — |
| STRATA source root | `src/modules/strata` | `find src -iname '*strata*'` |

### ⚠ Baseline drift — CRITICAL for interpretation

The QA reports were run against **`main@014875a86`**. Current HEAD is **`eb1b5be64`**, **7 commits ahead**. Commits between the QA baseline and now already target several waves' defects, so the report's "Actual" observations may be stale and **every defect is re-verified against current code before any fix**:

| Commit | Targets | Wave |
|---|---|---|
| `01d474669` fix: zero-progress health reads Not Started | V5-OPEN-023 | 3 |
| `eda0c36ab` fix: unsaved-changes guard on authoring forms | V5-OPEN-022 | 2 |
| `268738ec6` / `6ab3642c8` / `dd5d8596a` canonical 5-perspective model + Admin CRUD | V3-OPEN-011 | 4 |

Recent migrations already authored (committed, application state unknown): `..benefit_value_reject_negative` (021), `..milestone_name_unique_per_card` (017), `..dependency_name_authoring` (006), `..health_not_started_precedence` (023), `..canonical_perspective_model` (011).

**Implication:** Wave verification must confirm/deny each of these against the live build and the schema; do not re-implement what is already delivered, and do not assume delivered == correct.

---

## QUEUE SCHEMA (per defect)

Each entry carries: defect ID · severity/priority · routes/components · confirmed root cause · DB impact · implementation plan · automated-test plan · migration & rollback plan · regression scope · status · evidence · commit SHA.

Status vocabulary: `INVESTIGATING` → `ROOT-CAUSED` → `IN PROGRESS` → `FIXED — PENDING INDEPENDENT RETEST` · or `ALREADY DELIVERED (verify)` · `BLOCKED (decision)`.

---

## WAVE 1 — CONTEXT & DATA INTEGRITY  *(active)*

Coordinated root-cause batch: STRATA-E2E-001, 002, 013, 018, V4-OPEN-020, V6-OPEN-027, V6-OPEN-029, V6-OPEN-030.

Root-cause clusters under investigation (parallel read-only agents):
- **A — Cycle/context propagation & URL state:** 001, 002, 018, V4-OPEN-020
- **B — Project Card integrity:** 027 (required Theme), 029 (duplicate names), 030 (archived exclusion)
- **C — Portfolio member selector scoping:** 013
- **Schema/RPC enforcement map** (cross-cutting reference)

_Findings and per-defect plans populated from investigation below._

### WAVE 1 defect table

| ID | Sev | Route/Component | Status | Root cause | Commit |
|---|---|---|---|---|---|
| STRATA-E2E-001 | P0 | `StrataExecutionPage.tsx`, `routes.ts`, `useStrata.tsx` | ROOT-CAUSED | (a) `elementsReady=!elementsQ.isLoading` false-passes while query disabled → unfiltered flash (~L465/485); (b) detail URL omits `?cycle=` → refresh falls back to DB-active cycle, theme drops (`themeById` from wrong cycle) | — |
| STRATA-E2E-002 | P1 | `useStrata.tsx` | ALREADY DELIVERED (`a02b9c569`); residual = 001(b) detail-nav gap | top-level `?cycle/?period` restore works | — |
| STRATA-E2E-013 | P1 | `vmoAuthoring.tsx`, `domain/index.ts:437` | **BLOCKED (D-2)** | Selector is unfiltered `select('*')`. But: no `cycle_id` on card, `organization_id` NULL on all rows (single-tenant), Vikram ruling = portfolios NOT cycle-scoped. Twin dedupe already fixed (`bea18dffd`). Cycle/tenant scoping contradicts approved decision `STRATA_E2E_PARKED_DECISIONS_013_011.md` | — |
| STRATA-E2E-018 | P1 | `StrataPortfolioVmoPage.tsx`, `routes.ts`, `useStrata.tsx` | ROOT-CAUSED (part b) | index reset already fixed (`168d7f371`); benefit route has no portfolio slot → page falls back to `portfolios[0]` → wrong benefit. `valueApi.benefitBySlug` exists but unused, no `useBenefitBySlug` hook | — |
| V4-OPEN-020 | P1 | `StrataExecutionPage.tsx` | ALREADY DELIVERED (`7d6c38cc8`) — all filters URL-persisted, clean | no residual | — |
| V6-OPEN-027 | P0 | `ProjectCardDetailView.tsx:509`, `authoring.tsx`, RPC `strata_update_project_card` | ROOT-CAUSED (UI+server) | Create form has `required:true` (`StrataExecutionPage.tsx:1007`); Edit form omits it (`ProjectCardDetailView.tsx:509`); `isClearable={!field.required}` lets it clear; `p_clear_theme` → RPC L325 sets NULL unconditionally. Fix: UI required + RPC null-guard (+ optional NOT NULL migration w/ backfill) | — |
| V6-OPEN-029 | P1 | RPC `strata_create_project_card`, `domain/index.ts` | ROOT-CAUSED (server) | no name uniqueness; `20260706101000` dropped it to a `source_key`-only partial index → manual cards unconstrained; slug auto-dedupes so dups insert; no `cycle_id` (derive via theme→cycle). Fix: uniqueness guard in RPC scoped to non-archived + cycle-via-theme; migration | — |
| V6-OPEN-030 | P1 | `domain/index.ts:437`, `shared.tsx:947`, `StrataExecutionPage.tsx:484`, `StrataStrategyElementDetailPage.tsx:188` | ROOT-CAUSED (client) | `stage='archived'` free text; list select + `computeCardRollup` + `groupCards` + theme-detail all consume unfiltered set. Fix: exclude archived at source/derivation (no migration) | — |

**Cluster A shared fix pattern:** detail-route builders (`Routes.strata.*`) + `navigate()` call sites don't carry `?cycle/?period`; destinations fall back to `cycles[active]`/`portfolios[0]`. Fix = (1) propagate context params on detail navigation, and (2) resolve governing context from the fetched entity (project card → its theme's cycle; benefit → its `portfolio_id`). Consistent with existing `usePortfolioBySlug`/`?portfolio=`.

### WAVE 1 — DELIVERY RECORD

**Status:** implemented on `strata/v6-qa-remediation`, commit **`2da235e01`**. Client fixes are HMR-live and browser-verified; server guards ship as an **unapplied** migration (D-1). All items below are `FIXED — PENDING INDEPENDENT RETEST` unless noted.

| ID | Disposition | Change | Evidence |
|---|---|---|---|
| STRATA-E2E-001 | FIXED — PENDING RETEST | (a) `isLoading` now waits on the active cycle's elements; `elementsReady=elementsQ.isSuccess` — no unfiltered flash. (b) `openCard()` appends `?cycle/?period`; Theme-detail nav appends the theme's cycle | Browser: FY27 held on spinner then rendered exactly **2** cards, no 44-flash |
| STRATA-E2E-002 | VERIFIED ALREADY DELIVERED | top-level cycle URL-persist (`a02b9c569`); detail-nav residual closed by 001(b) | — |
| STRATA-E2E-013 | **BLOCKED — D-2** | not implemented: cycle/tenant scoping contradicts approved ruling; twin dedupe already shipped | — |
| STRATA-E2E-018 | FIXED — PENDING RETEST | new `useBenefitBySlug`; benefit route resolves owning Portfolio from `portfolio_id` atomically | Browser: `/benefits/zztest-qa-portfolio-benefit` → **QA** Portfolio + members, not Growth |
| V4-OPEN-020 | VERIFIED ALREADY DELIVERED | all filters URL-persisted (`7d6c38cc8`) | — |
| V6-OPEN-027 | FIXED — PENDING RETEST | UI: `required:true` on Edit Theme field. Server: `strata_update/create_project_card` reject null-theme result (migration `20260712130000`) | UI type-checked; server unapplied (D-1) |
| V6-OPEN-029 | FIXED — PENDING RETEST | Server: normalized name uniqueness per cycle-via-theme, non-archived, in create+update RPC (migration `20260712130000`) | server unapplied (D-1); DB hard-constraint noted as follow-up (no `cycle_id` column) |
| V6-OPEN-030 | FIXED — PENDING RETEST | `filteredCards` + Theme-detail `themeCards` exclude `stage='archived'` unless Delivery Status=Archived is explicitly chosen | Browser: FY27 Total **3→2**, archived duplicate gone from counts/theme rollup |

**Files changed (client):** `StrataExecutionPage.tsx`, `StrataStrategyElementDetailPage.tsx`, `StrataPortfolioVmoPage.tsx`, `ProjectCardDetailView.tsx`, `hooks/useStrata.tsx` (exported `ctxToken`, added `useBenefitBySlug`).
**Migration (unapplied):** `supabase/migrations/20260712130000_strata_project_card_theme_required_and_name_unique.sql` — `CREATE OR REPLACE` of both project-card RPCs (identical signatures) + non-destructive reconciliation `RAISE NOTICE` reporting existing orphan-theme and duplicate-name rows.
**Validation:** `tsc --noEmit` exit 0, 0 errors; `eslint` 0 errors (pre-existing react-refresh warnings only). Browser verification: 001a, 018b, 030 confirmed live.
**Migration/rollback:** forward = `CREATE OR REPLACE` (idempotent, no schema drop); rollback = re-apply `20260706231000` definitions. No data mutated; reconciliation is report-only.
**Regression scope for retest:** Execution all six views + counts/rollups; project-card create/edit (theme-required, duplicate-name); archived history view (`Delivery Status=Archived` still lists archived); benefit deep link + Portfolio index (`?portfolio=` still governs index); cycle switch (no cross-cycle flash).

---

### WAVE 1 — Schema/RPC enforcement map (investigator reference, verified on current code)

Canonical tables: `strata_project_cards`, `strata_strategy_elements` (theme/objective, has `cycle_id NOT NULL`), `strata_cycles`, `strata_portfolios`, `strata_portfolio_memberships`, `strata_benefits`, `strata_benefit_values`, `strata_milestones`, `strata_risks`, `strata_dependencies`.

Enforcement findings driving Wave 1:
- **027 Theme:** `strata_project_cards.theme_id uuid REFERENCES strata_strategy_elements ON DELETE SET NULL`, **nullable**. Trigger `strata_validate_project_card_theme` fires only `WHERE theme_id IS NOT NULL` (type check, not presence). `strata_create/update_project_card` take `p_theme DEFAULT NULL`. → server does NOT require a Theme.
- **029 name:** no unique index/constraint on `name` at any scope. `slug` is UNIQUE but auto-deduped (`-2/-3`), so identical names both insert. **No `cycle_id` on the card table** → cycle is derived via `theme_id → strata_strategy_elements.cycle_id`. Only existing uniqueness: `(source_system, source_key) WHERE source_key IS NOT NULL` (Jira/import), manual cards unconstrained.
- **030 archived:** `stage` is free text (no CHECK). Only reference to `'archived'` is an edit-block in `strata_update_project_card`. **No** list/rollup/health RPC filters archived: `strata_calc_execution_progress` (only special-cases `on_hold`), `strata_needs_attention` project branches (10/11/12), `strata_calc_value_at_risk` all include archived. Portfolio `status='archived'` and benefit `lifecycle_stage='closed'` also never excluded from VaR.
- Health precedence (`strata_calc_execution_progress`, latest `20260712110000`): `on_hold → not_available → not_started (actual=0 & baseline>0) → forecast-delay(>30d) → variance(≥20 major / ≥10 minor) → on_track`. **V5-OPEN-023 already delivered** here.
- Already-landed server guards: negative benefit value (`20260712100000`), milestone name unique per card (`20260712101000` — real `UNIQUE INDEX (project_card_id, lower(btrim(name)))`), dependency `name` persistence (`20260712102000`).

## WAVE 2 — SAVE, PERSISTENCE & CONCURRENCY  *(active)*
STRATA-E2E-006, V6-OPEN-024, V6-OPEN-028, V6-OPEN-033, V6-OPEN-035, V5-OPEN-022 (verify — committed `eda0c36ab`).

| ID | Sev | Status | Root cause (verified current code) |
|---|---|---|---|
| V6-OPEN-035 | P1 | NOT REPRODUCIBLE (current code) | No flush bug: `FieldControl` commits every keystroke synchronously; `0`/`false` preserved (nullish-coalescing + SQL `COALESCE`); "immediate UI" is the post-write refetch, not optimistic. Outcomes #1–3 already met by architecture. A blur-before-submit fix would touch ~49 call sites for no defect (Regression Red Flag). Silent-lost-write family covered by 033 |
| STRATA-E2E-006 | P1 | NOT REPRODUCIBLE (current code) | Same path as 035; no flush/optimistic bug. First-edit-stale not reproducible statically; 033 concurrency guard converts any silent lost write into a visible conflict |
| V6-OPEN-028 | P1 | LIKELY STALE — VERIFY | Current code: Overview "Submitted Forecast End" reads `card.forecast_end` (same column Edit writes, `ProjectCardDetailView.tsx:363`); `final/system_forecast_end` computed by `strata_calc_execution_progress`. Not reproducible statically → browser-verify on HEAD. Real minor gap: project-entered `baseline_start/end` are write-only (never shown on Overview) — acceptance #4 disambiguation |
| V6-OPEN-033 | P1 | ROOT-CAUSED | `strata_update_project_card` UPDATEs unconditionally (no version check); `updated_at` exists but untyped client-side. Fix = `p_expected_updated_at` guard (DROP+CREATE migration to add param) + thread `card.updated_at` from edit modal; existing modal catch surfaces conflict msg |
| V6-OPEN-024 | P2 | ROOT-CAUSED | `run<T>()` (`domain/index.ts:24-28`) rethrows raw PG `error.message`. Fix = central `mapStrataError` mapping 23505+constraint → business copy; renders via existing `StrataFormModal` SectionMessage. Client-only |
| V5-OPEN-022 | P2 | ROOT-CAUSED | guard (`eda0c36ab`) covers modal-close + `beforeunload`, NOT SPA Back — app on `BrowserRouter`, `useBlocker` unavailable. Fix = scoped `popstate` sentinel in `authoring.tsx` (reuse `confirmDiscard`); data-router migration logged as separate follow-up (app-wide, out of scope) |

**D-3 (logged, non-blocking):** full SPA-history blocking needs migrating the app from `BrowserRouter` to a data router (`createBrowserRouter`) to use `useBlocker` — app-wide blast radius (`App.tsx:225` wraps all routes). A scoped `popstate` sentinel was trialled and **rejected**: it protected the edits (Back didn't discard) but the discard-confirm fired unreliably under React StrictMode, exactly the fragility flagged in investigation. Deferred as its own Feature Work ID.

### WAVE 2 — DELIVERY RECORD

**Status:** implemented on `strata/v6-qa-remediation` (commit pending). Client fixes HMR-live + browser-verified; 033 server guard ships **unapplied** (D-1) with its client activation **held** to avoid a PGRST202 break pre-migration.

| ID | Disposition | Change | Evidence |
|---|---|---|---|
| V6-OPEN-024 | FIXED — PENDING RETEST | Central `mapStrataError` in `run()` maps SQLSTATE 23505 (+constraint) → business copy; covers every RPC | client-only, HMR-live, tsc/eslint clean (browser-verify duplicate at retest) |
| V6-OPEN-033 | FIXED (server) — PENDING RETEST | Migration `20260712140000`: `DROP`+`CREATE` `strata_update_project_card` with `p_expected_updated_at` guard (early check + `WHERE`-clause race close). Client: `updated_at` typed, `expectedUpdatedAt` captured in edit modal; **RPC forward held** until migration applied (one-line activation) | migration unapplied (D-1); editing verified still works (no PGRST202) |
| V6-OPEN-028 | NOT REPRODUCIBLE (verified live) | Overview reads `card.forecast_end` (Submitted) + computed `final/system_forecast_end` — same columns Edit writes | Browser: Project B Overview shows Submitted & Final Forecast = 30 Jul 2026 (not blank). Minor follow-up: project-entered `baseline_start/end` are write-only |
| V6-OPEN-035 | NOT REPRODUCIBLE | see table above — no code change (would be speculative, high blast radius) | investigator verified all layers preserve 0/false; no flush bug |
| STRATA-E2E-006 | NOT REPRODUCIBLE | see table above; covered by 033 conflict detection | — |
| V5-OPEN-022 | PARTIAL | native refresh/close (`useBeforeUnload`) + sidebar/in-app (`handleRequestClose`) guard dirty forms; SPA-Back deferred (D-3). Popstate stopgap trialled then reverted | Browser: dirty Back preserved edits but confirm unreliable → reverted |
| STRATA-E2E-001 (b) | **CORRECTION** — FIXED | Wave 1's `replace_all` had patched only 1 of 5 detail-nav handlers; the other 4 views (LBU/theme/pm/team) still stripped `?cycle=`. All 5 now route through `openCard` | Browser: Details → URL carries `?cycle=&period=`; **refresh keeps FY27 + Theme** (before: flipped to FY2026, Theme dropped) |

**Files changed:** `domain/index.ts` (024 mapper + 033 patch type, forward held), `types.ts` (`updated_at`), `ProjectCardDetailView.tsx` (capture `expectedUpdatedAt`), `authoring.tsx` (022 comment; popstate reverted), `StrataExecutionPage.tsx` (001b correction — 4 handlers → `openCard`).
**Migration (unapplied):** `supabase/migrations/20260712140000_strata_project_card_optimistic_concurrency.sql`. Rollback = re-apply `20260712130000`.
**Deploy note:** 033's client RPC forward is intentionally NOT wired until the migration is applied (PGRST202 safety). Post-apply, add `p_expected_updated_at: patch.expectedUpdatedAt ?? null` to the `updateProjectCard` RPC call to activate.
**Validation:** tsc 0 errors; eslint 0 errors; color gate clean. Browser: 001b-refresh, 027-required, 028-forecast, edit-save-works confirmed live.

## WAVE 3 — HEALTH, FORECAST & ROLL-UPS  *(pending)*
V5-OPEN-023 (verify — committed `01d474669`), V6-OPEN-026, V6-OPEN-034, V6-OPEN-036.

## WAVE 4 — STRATEGY, KPI, SCORECARD & GOVERNANCE  *(pending)*
STRATA-E2E-005, 010, 011 (verify — committed 011 chain), V6-OPEN-032, Team/LBU/Dept/Sector blockers, KPI approval + FY27 Scorecard-instance blockers.

## WAVE 5 — PORTFOLIO, IMPORT, EXPORT & REMAINING P2  *(pending)*
STRATA-E2E-015, V4-OPEN-019, V6-OPEN-025, V6-OPEN-031, V6-OPEN-037, STRATA-E2E-007, 009, 017, V6-OPEN-038.

---

## DECISION LOG (product decisions that block specific items — work continues around them)

| # | Question | Affected | Status |
|---|---|---|---|
| D-1 | No Supabase project linked in this checkout and no immutable-staging target supplied. Migrations will be authored + committed **unapplied**; who applies them, to which env, and when? | all DB-backed fixes | **RESOLVED (Vikram 2026-07-12): author unapplied; Vikram/release applies.** |
| D-2 | Wave 1 outcome #5 requires the Portfolio member selector be "tenant- and cycle-scoped." Current code + a Vikram-approved ruling (`STRATA_E2E_PARKED_DECISIONS_013_011.md`) hold that (a) portfolios are canonically NOT cycle-scoped and (b) tenant scoping is impossible today (single-tenant, `organization_id` NULL everywhere, no `organizations` table) and is deferred to a separate multi-tenancy initiative. **Options:** (A) honor the existing decision — leave 013 as-is (twin dedupe already shipped), keep it parked [recommended]; (B) override the ruling and build cycle-scoping via card→theme→cycle (contradicts approved decision, changes selector semantics — a project card can legitimately belong to a portfolio across cycles); (C) fast-track the multi-tenancy initiative (large, cross-cutting, out of Wave 1 scope). **Recommendation: A.** Impact: without a decision, 013 stays BLOCKED and is not counted as fixed. | STRATA-E2E-013 | **RESOLVED (Vikram 2026-07-12): Option A — honor ruling, keep parked. 013 stays BLOCKED, not counted as fixed.** |

_(further decisions appended as encountered)_
