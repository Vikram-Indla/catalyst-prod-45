# CAT-STRATA-20260705-001 — Execution Log

> Running log of all actions, decisions, and changes made during implementation.
> Append entries — never delete.

---

## Log entries

### 2026-07-05 — Session 002 (Phase 3 implementation, owner-approved)

**Gate state:** Owner answered Q1–Q8 in-chat and waived the Phase 2 mock gate (D-009/D-010). Plan Lock updated to APPROVED/Phase 3 scope.

**Isolation:** Git worktree `.claude/worktrees/strata-20260705`, branch `worktree-strata-20260705` off origin/main (shared checkout untouched). DB work via disposable scratch-dir link to **staging** `cyijbdeuehohvhnsywig` — project-ref verified before every batch (PreToolUse hook also asserted it).

**DB (applied to staging + committed as migrations):**
1. `20260705100000_strata_foundation_config_engine.sql` — helpers (touch/slugify/slug trigger), strata_role_assignments (6 personas), strata_is_admin/strata_has_role, immutable strata_audit_events + generic audit trigger, 7 governed config tables (perspectives, threshold schemes, value categories, gate models+stages, KPI types, upload templates, workflows) with version/status/effective-dates/approval envelope, config change requests (DB CHECK: decider ≠ requester), governance RPCs strata_submit/approve/retire_record (whitelisted tables, SoD, auto-supersede), strict RLS (draft-only client edits; status transitions RPC-only).
2. `20260705100100_strata_strategy_scorecard.sql` — cycles, periods, strategy_elements (typed, self-ref, map_position), map_edges, play_charters, element_kpis, promotion-control RPC (charter+owner+KPI required), scorecard models (+perspectives m2m with Σ=100 approval guard RPC), instances (live/draft/pending_validation/locked), polymorphic scorecard lines (CHECK single ref), RLS (lock via RPC only).
3. `20260705100200_strata_kpi_okr.sql` — KPI dictionary (5 distinct ownership roles), formula versions (no silent changes; approve RPC supersedes prior + SoD), targets (versioned), actuals (UNIQUE NULLS NOT DISTINCT (kpi,period,run); DB CHECK validator ≠ submitter), attestation RPC, KPI approval gate RPC (owner+validator+source+formula+target enforced), OKRs/KRs (KPI-linked or standalone), commentary; RLS (pending-only client edits, attestation RPC-only).
4. `20260705100300_strata_execution_value.sql` — initiatives (+element/KPI m2m), source-agnostic project_cards (source_system+source_key UNIQUE), initiative↔project mappings with confidence, milestones (weighted), dependencies (SLA/blocker), generic execution_links, portfolios (+memberships w/ allocation), benefits (9-stage lifecycle; DB CHECK validator ≠ owner), benefit_values (baseline/planned/forecast/realized; SoD CHECK), assumptions, attribution rules, gate instances + evidence, finance-validation RPC.
5. `20260705100400_strata_lineage_governance.sql` — data sources, upload runs (RUN-keys, file hash, counts, status machine), staging rows, row-level validation results, immutable lineage records, calculated_values (full provenance: formula version, inputs, source runs, config context, confidence), INSERT-only snapshots + frozen items + supersede RPC, gate-decision RPC (verdict must be a configured option; approver roles from config; subject owner cannot decide), decisions/actions (DEC-/ACT- keys), board packs (pdf+pptx per Q7), advisory-only AI outputs (reviewer ≠ author CHECK), period-close guard RPC (blocked on pending attestations/errors unless overridden with reason).
6. `20260705100500_strata_calc_engine.sql` — centralized calc RPCs (KPI achievement direction-aware incl. band+tolerance; weighted scorecard rollup line→perspective→total; YTD sum/avg/last; benefit realization index; portfolio value-at-risk with gate exposure; milestone-weighted execution progress; period batch). Two live-run bugs found and fixed during staging apply: t.threshold_scheme_id (targets carry no scheme) and plpgsql `progress` variable/column collision.
7. `20260705100600_strata_seed_salam_demo.sql` — labeled Salam demo seed (Q8), idempotent: full config set, FY2026 + quarters, strategy tree + map, 8 KPIs (formula v1, targets, Q1 manual + Q2 upload-run actuals with staging rows, 1 rejected row w/ 2 row-level errors, lineage records), CEO scorecard model/instances/lines, 3 initiatives, 4 project cards (jira/manual/upload), 10 milestones, 2 dependencies, portfolio + 3 benefits (values/assumptions/attribution), 2 gates, calc-engine executed, Q1 snapshot SNAP-1001 locked + DEC-1001 + 2 actions + pdf/pptx board-pack rows + 1 pending advisory AI output.

**Staging verification (queried):** 8 kpis · 16 actuals · 16 scorecard lines · 70 calculated values · 30 snapshot items · 8 lineage records · 174 audit events · Q2 CEO score 96.1 (green) — hand-verified against the weighted formula · portfolio VaR SAR 2,650,000. Migration ledger rows inserted 1:1 with committed files. feature_flags.strategy_hub enabled, label STRATA.

**Frontend foundation (mine):** src/modules/strata/{types.ts, domain/index.ts, hooks/useStrata.tsx, components/shared.tsx, StrataRoutes.tsx}. Locked instances read frozen snapshot payloads (never recalc); band labels/appearances resolve from governed threshold-scheme config at runtime.

**Wiring/decommission:** hubs.ts tile → STRATA `/strata`; FullAppRoutes `/strata/*` (MG k=strategyhub → role enterprise); StrategyRoom unrouted; App.tsx outside-shell redirects /strategyhub/* + /strategy-room → /strata; EnterpriseRoutesShell risk redirects → /strata; routeRegistry strata entries; EnterpriseSidebar rebuilt as STRATA IA; CatalystShell HUB_ROUTES + hub-surface detection; HubSwitcher entry un-deprecated (STRATA, purple); MobileNavigationMenu/HomeSidebar/SidebarBase labels+prefetch; HubSwitcher tests updated.

**Surfaces:** 12 pages via 6 parallel agents (Command Center+Reviews; Strategy Room+Map; Scorecards index+detail; KPI library+detail; Execution+Portfolio/VMO; Data pipeline+Admin config) under a strict shared contract (ADS tokens only, no client-side scoring, zero-assumption rendering, evidence drawers, route-first drilldowns).

**Deferred (logged, per D-009 Q2):** physical deletion of modules-dormant strategy files and es_* table drops → cleanup slice after STRATA verification; GlobalPageHeader stale '/strategyhub/risks' lookup key (dead code).

---

## Session 003 (2026-07-05) — UI evidence pass + fix-forward loop (DRIFT-001 closure, part 1)

Environment: dev server FROM the STRATA worktree on port 8081 against STAGING (cyijbdeuehohvhnsywig);
port-8080 server (main checkout, wiki branch) untouched. User logged in interactively; Chrome MCP probes + screenshots.

### Surfaces verified (all 10, light and/or dark, staging data)
1. Command Center — light + dark; period switch; evidence drawer on Enterprise score
2. Strategy Room + Strategy Map (xyflow canvas, labeled edges, filters)
3. Scorecards list (LOCKED 87.54835 / LIVE 96.05 states) + Scorecard detail (slug route)
4. KPI/OKR Library + KPI detail (formula v1, lineage to RUN-1001, ownership block, trend)
5. Execution (initiatives, Jira·NET5G project card w/ 95% mapping confidence, dependencies)
6. Portfolio/VMO (benefit register, value profile VALIDATED/PENDING, SoD note)
7. Data Pipeline + RUN-1001 detail (sha256, staged rows VALID/REJECTED, row-level errors)
8. Reviews & Decisions (SNAP-1001 frozen evidence, DEC-1001)
9. Configuration Engine — Perspectives, Scorecard models (Σ=100 WEIGHTS VALID), Change log audit trail
10. All DEMO SEED (Salam) labels present; ADS lozenges/tokens hold in dark mode

### Fix-forward corrections applied (worktree, uncommitted)
- **U-012** `components/shared.tsx` — StrataConfigContextBar dropdown triggers leaked `isSelected`/`testId`
  onto DOM `<button>` (React warnings ×2 per page). Destructured out of the spread. Verified: no new warnings.
- **U-013** `hooks/useStrata.tsx` — default period was calendar-current (Q3, empty ⇒ "No scorecard for this
  period" as first impression). Now prefers the latest period WITH a scorecard instance (shares the
  scorecard-instances query cache). Verified: Command Center lands on Q2 FY2026 LIVE, score 96.0.
- **U-005** `domain/index.ts` calcResult — locked instances returned `lines: []`; now hydrates per-line
  frozen values from snapshot items (entity_type='scorecard_line'). Verified: all 8 Q1 lines show
  actual · target, score, band (was "— no data" on every row).
- **U-001** `components/shared.tsx` — evidence drawer Inputs/Config context rendered raw JSON; now
  formatted rows (perspective rollups as name/score/weight/band; flat+one-level-nested key/values;
  UUIDs shortened). Verified on Enterprise score + line evidence.

### Gates
- `npx tsc -p tsconfig.app.json --noEmit`: **183 errors = baseline exactly; 0 in src/modules/strata/**
- Console: only pre-fix warnings remain in buffer; no new warnings after reload.
- Not run this session (no styled-color changes; runs at commit): lint:colors:gate, audit:ads:gate.

### Deferred defects (owner visibility; next slices)
- U-003 Strategy Map nodes lack owner/stage (status only)
- U-006 document.title renders slug-cased ("Ceo Scorecard Q1 Fy2026")
- U-007 scorecard detail header duplicates model chip + LOCKED lozenge
- U-008 owner UUIDs render as dashes (profile-name resolution — already in handover follow-ups)
- U-009 Reviews frozen-evidence values unrounded (83.33333333333)
- U-010 Reviews evidence rows show entity type but not entity NAME
- U-011 admin audit trail has no actor column
- Full 7-PNG sets (empty/loading/error/responsive per surface) still owed for final acceptance

---

## Session 003 continued — D-012 executive design lift (in progress)

Owner rejected session-002 UI (D-012). Executed so far:
1. Canonical discovery (2 parallel agents): component cheat-sheet (JiraTable contract, StatusLozenge/statusPalette,
   flagship stat-strip + panel chrome from src/pages/releases/CommandCenterPage.tsx, @/lib/atlaskit-icons,
   --ds-font-size scale, ads/ barrel-only rule) + 247-item UI/UX issue register (05_UI_UX_REVIEW.md).
2. Foundation rebuilt by main session (tsc 183 = baseline, 0 strata errors):
   - components/format.ts (NEW): fmtScore/fmtPct/fmtRatioPct/fmtSarCompact/fmtSar/fmtUnit/fmtDate/fmtDateTime/labelize
   - components/shared.tsx v2: StrataPageChrome (icon+title+context toolbar), StrataStatStrip (flagship joined strip
     w/ ring/spark slots), StrataScoreRing / StrataBandBar / StrataTrendSpark (token-pure SVG micro-viz; no canonical
     gauge exists), StrataPanel v2 (bordered header + icon + count), band tone resolver (governed appearance →
     semantic token), evidence drawer formatting; @atlaskit/dropdown-menu direct import replaced with ads barrel.
   - hooks/useStrata.tsx: useProfileNames() (profiles → name/avatar map; kills UUID-as-owner rendering).
3. Page lift fanned out to 4 parallel agents (A: CommandCenter+Scorecards+ScorecardDetail; B: StrategyRoom+Map;
   C: KpiLibrary+KpiDetail+Execution; D: Portfolio+DataPipeline+Reviews+AdminConfig) with the full register,
   shared API contract, JiraTable mandate, ADS-token guardrails, zero-assumption rules, per-agent tsc gate.

### D-012 lift — COMPLETE (2026-07-05, session 003)
- 4 page-lift agents delivered: 247/247 register items addressed (documented in-scope partials: S-044 table-tree
  port not needed after row rebuild, S-063 swimlane layout deferred w/ color system shipped, S-139 value-axis band
  shading refused on zero-assumption grounds — score-scale bands would misrepresent on a unit axis).
- Post-lift corrections by main session: 26 off-grid spacing values snapped to grid (ads-audit ratchet back to
  baseline), and a REGRESSION caught in live verification: ads DropdownMenu's custom-trigger path drops
  triggerRef → menus opened detached at the viewport corner. Fixed via StrataChipMenu on the repo-proven
  fixed-position pattern (AllProjectsTable precedent: @atlaskit/popup renders empty portals in this codebase);
  all 5 custom-trigger menus (context cycle/period, Strategy Room filters ×3 via filterControl, KPI status filter,
  portfolio switcher) rewired; ads wrapper bug flagged as separate task for the design-system owner.
- Visual verification: all 10 surfaces re-probed light mode + Command Center/Scorecard-detail dark mode; period
  menu anchors correctly; locked scorecard hero ring + band-colored weight bars verified in both themes.
- FINAL GATES: tsc 183 = baseline (0 strata), lint:colors:gate 0 = baseline, audit:ads:gate all categories at
  baseline (tokens 24544/24544, typography 1527/1527, spacing 1/1), banned-color grep on module = 0.

### Upload wizard + polish — DELIVERED (2026-07-05, commit cdb2c5e43 pushed)
Governed upload wizard at /strata/data/upload (4-step, xlsx/csv/paste via existing deps, display-only
pre-checks, honest RLS staging write path — run stops at 'staging'; server validation RPC = next backend
slice, stated in-UI). Caught+fixed live: @atlaskit/progress-tracker not installed (ads wrapper story-only)
→ token-pure stepper, barrel export reverted. Evidence H2 = entity name; map fitView wired. Verified live.
tsc 183 baseline. Feature folder recovered from wiki-branch commit 9ee841b4f (had been swept there) and is
now versioned ON THIS BRANCH. Remaining backlog (backend/own Plan Lock): upload validation/promote RPC,
Jira adapter, board-pack + AI engines, create flows, SoD grants, PR #322, dark-mode full sweep.

### Final closure sweep (2026-07-05): dark-mode verification of new surfaces COMPLETE (Command Center
workbench + upload wizard captured via data-color-mode toggle — flawless token flip, attribute restored);
PR #322 disposition analysis posted as PR comment (recommend close-as-superseded or rebase — owner's call);
PR #323 open with board packs + migration artifacts. Session-reachable backlog = EMPTY. Owner-gated:
PR #323 merge click, staging credential (migrations+SoD grants apply via runbook), Jira/AI service
credentials, PR #322 decision.
