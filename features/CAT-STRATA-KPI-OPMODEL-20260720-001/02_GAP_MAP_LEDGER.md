# STRATA-KPI Operating Model — Verified 53-Row Gap Ledger

- Feature Work ID: `CAT-STRATA-KPI-OPMODEL-20260720-001`
- Baseline: `main` @ `09444187f` (fast-forwarded to `origin/main`, lossless, 0 local commits)
- Method: 5 parallel read-only investigators (sonnet), each mapping a cluster against all ~125 `*strata*` migrations + `src/modules/strata/`. Every row cites an artifact actually opened.
- Tally (baseline): **9 SATISFIED · 24 PARTIAL · 20 MISSING**
- Slices S0/S1/S2+S3 delivered this session (branch `strata/kpi-operating-model`, commits `c2bef8e3`, `a12a81655`, `ed3ff650`). Rows now BUILT (code + migration + guard test + build green), pending DB-execution proof (no local DB):
  - S0: 010, 020, 021 → SATISFIED*; 011 → mostly (withdraw/cancel UI; request-changes *state* deferred to a schema slice).
  - S1: 004, 005, 006, 022 → SATISFIED*; 023 still PARTIAL (usage-class-conditioned approver routing not built).
  - S2: 025, 026, 027 → BUILT*; 024 reinforced.
  - S3: 028, 029, 030, 031 → BUILT* (aggregation ARITHMETIC unverified — needs DB + calc/property/negative tests).
  - `*` = verified by migration-guard test + build + colour gate ONLY. DB execution / RLS / maker-checker / aggregation math NOT runtime-proven (Docker down; staging/prod forbidden).
- **Update — S4/S5/S6/S8 now ALSO built** (commits `34564feb`, `6ab88a68`):
  - S5 (013/014/016/017/018/019) → BUILT* additive bridge: optional KR→assignment link, standalone policy (existing OKRs backfilled `legacy` ⇒ no number moves), period-scoped resolution, manual-can't-override.
  - S4 (034/036/037/040) → BUILT*: `strata_project_objective_alignments` (primary/secondary+attribution), contradiction rejection, completion-gate trigger. 035/038 formalized.
  - S6 (047/048/051) → BUILT*; 049 → BUILT* scoped to NEW entities (no retroactive change to shipped check-free element retirement); 050/052 (snapshot chain, notifications) NOT built.
  - S8 (003) → BUILT* structural (effective dating + overlap EXCLUDE + `strata_resolve_kpi_formula`); calc-engine wiring is a follow-up. 009/012 NOT built.
  - `*` = 40/40 kpi-opmodel guard tests + build + colour gate. DB execution / aggregation math / contradiction logic / RLS / SoD / EXCLUDE constraint NOT runtime-proven.
- STILL NOT built: **S7 (041/042/044/046)** downstream consumers (Strategy Room readiness display, theme/element health from KR, Command Center chain, enforced review evidence) — UI-heavy + screenshot-gated + benefits from a DB; 009/012 (KR-version approval, impact preview); 050/052 (snapshot chain, notifications); calc-engine wiring of S8 resolver. BLOCKED: 007/008 (D-2, worktree).

## The gap is one coherent spine, not 44 scattered patches

Almost every MISSING/PARTIAL row traces to **one absent architectural layer** plus a few **reconciliation conflicts** with already-shipped OKR semantics:

1. **Missing governed spine** (drives 025–031, 034, 036, 037, 040, 044, 047, 048): there is no first-class *KPI Assignment* entity (Strategic / Project) with scoped targets + scoped observations, and no governed *Contribution Mapping* (`direct_component|driver|supporting_evidence|none`) feeding an *authoritative aggregation service*. Today everything rides on generic `strata_execution_links` edges + a free-text `target_note`.
2. **Missing classification layer** (005, 004, 006, 022, 023): no governed usage-class / business-category / KR-eligibility / aggregation-policy dimension on `strata_kpis` — only binary `is_strategic`.
3. **Reconciliation conflicts with shipped OKR/KR model** (013, 014, 016, 019) — **regression-sensitive, needs a ruling** (see 03_PLAN_LOCK §Decisions).
4. **Governance-completeness PARTIALs** (009,010,011,012,015,017,018,020,021).
5. **Retirement/audit/notify extensions** (047,048,049,050,051,052).
6. **Downstream re-sourcing** (041,042,044,046).
7. **007/008** depend on the **unmerged** `strata/theme-measurement-method` worktree.

## Ledger

| ID | Disposition | Evidence (artifact opened) | Missing clause |
|---|---|---|---|
| 001 | SATISFIED | `strata_kpis` sole registry (20260705100200:8); no competing registry table repo-wide | — |
| 002 | SATISFIED | `lineage_id`+`UNIQUE(lineage_id,version)`+EXCLUDE (20260716220000:30-92); resolvers (20260716230000); provenance to model_measures (20260718003000/004000) | — |
| 003 | PARTIAL | `strata_kpi_formula_versions` lifecycle (20260705100200:43-61); calc reads "latest approved wins" (20260717170000:74-76) | Formula resolution not date+scope-aware; no `effective_to`/EXCLUDE on formula_versions |
| 004 | PARTIAL | `kpi_type_id→strata_kpi_type_configs` = calc behavior (20260705100000:260-280) | No business-category or usage-class dimension (0 grep hits) |
| 005 | MISSING | Only `is_strategic bool` (20260712170000:27); `status/approved_by/approved_at` exist | No governed 5-value usage class, KR-eligibility, official-scope metadata |
| 006 | MISSING | `strata_link_element_kpi` still live unconstrained edge (20260718110000:20) | Direct Theme/Objective→KPI links never reclassified diagnostic-only / governed-contract |
| 007 | PARTIAL | Theme-owned OKR hierarchy governed (20260719171907; 172840) | "Remove competing Theme measurement-model" unmerged — only on `strata/theme-measurement-method` (3 migrations) |
| 008 | SATISFIED (base) | `createElement` RPC matches DB sig (domain/index.ts:466 ↔ 20260718000000:38-43) | `measurement_method` mutual-exclusivity rule absent on main (worktree only) |
| 009 | PARTIAL | `strata_okr_versions`+`strata_kr_versions` envelopes (171907:78; 172840:88) | No RPC approves `strata_kr_versions.status`→approved — not one atomic boundary |
| 010 | PARTIAL | `strata_okr_validate` checks theme/owner/period/KR-band (171907:163-187) | Never calls `strata_kr_validate_contract` (172840:169-203) — validator dead |
| 011 | PARTIAL | submit/approve/reject/withdraw/cancel + optimistic lock + OWNER_SOD (171907:237-341) | No "request changes" state; withdraw/cancel have no UI call sites |
| 012 | PARTIAL | version rows, `effective_from/to`, `supersedes_id`, guards (171907:78-151; 20260718009000:164-177) | No impact-preview / dry-run; no create-version UI |
| 013 | PARTIAL | `update_method`+`lifecycle` cols (172840:36,51) | `strata_kr_reportability` (20260718009000:30-38) marks `kpi_id IS NULL` KR reportable=true → not "unofficial by default" |
| 014 | MISSING | `strata_key_results.kpi_id` "LEGACY PROVENANCE ONLY… never use a KPI as identity" (172840:82-83); `strata_add_kr` has no `p_kpi_id` | KR Measurement Contract deliberately NOT linked to a Strategic KPI Assignment — **opposite of decision #14** |
| 015 | PARTIAL | `strata_kr_progress` latest validated obs; structured `reason` on KPI branch (173520:136; 20260718009000:41-55) | Obs not filtered to contract `reporting_period_id`; standalone never excluded |
| 016 | MISSING | standalone KR reportable=true unconditionally (20260718009000:36-38) | Standalone/manual KRs count toward official progress by default |
| 017 | PARTIAL | `strata_okr_official_progress_v2` baseline-aware + denominator (173520:148-253) | KPI-backed KRs never read `strata_kpi_actuals`/resolver; fall back to legacy `current_value` |
| 018 | PARTIAL | `source` field (`observation`/`legacy_current_value`/`none`) (173520:141-189) | No channel-priority guard: manual obs can supersede integration-sourced |
| 019 | MISSING | `WHERE as_of_date<=p_as_of ORDER BY DESC LIMIT 1` (173520:136; 195500:31-33) | "Merely latest value" — no reporting-period match |
| 020 | PARTIAL | simple-average fallback preserves equal weighting (173520:219-232) | `strata_okr_versions.weighting_policy` jsonb never read (dead); no tests on v2 |
| 021 | PARTIAL | add-KR blocked unless draft/rejected; check-ins/versions/reversals exist (172840:220; 174146:89) | `strata_configure_kr_source/formula/phasing` (172840:259-337) carry no OKR-status check |
| 022 | PARTIAL | `strata_kpi_submission_blockers` enforces owners/SoD/source/formula/target (20260718006000:39-96) | No usage-class req, business taxonomy, KR-eligibility gate, aggregation policy |
| 023 | PARTIAL | maker-checker + `strategy_office` role gate, validator≠submitter (20260718006000:104-122) | No usage-class-conditioned assigned-approver routing (KPIs lack the per-record approver scorecards have) |
| 024 | SATISFIED | `strata_create_project_kpi` raises PC-DEF-002 (20260718110000:109-129); reuse requires approved (51-53) | — |
| 025 | MISSING | "assignment" = generic `strata_execution_links` row `relationship_type='measures'` (20260718110000:74-82) | No `strata_(project_)kpi_assignments` table with own owner/target/period/class/status/observations |
| 026 | MISSING | `strata_kpi_actuals` UNIQUE `(kpi_id,period_id,upload_run_id)` (20260705100200:84-105) | No assignment/scope key → two projects reusing one KPI collide on the same actual |
| 027 | MISSING | target context = free-text `p_target_note`→jsonb (20260718110000:73-80; ProjectCardDetailView.tsx:1045) | Project targets are a free-text note, not real `target/band/period` columns — banned anti-pattern |
| 028 | MISSING | split across `strata_element_kpis` (weight,2-value type) + `strata_execution_links` (no weight/dates/status) | No single governed Contribution Mapping with type+rule+scope+weight+dates+approval |
| 029 | MISSING | `rolls_up_to` only ever written, never in any `strata_calc_*` WHERE (all-migration grep) | No roll-up target validation (no consumer of the rollup graph) |
| 030 | MISSING | `direct_component` = 0 grep hits; only `('direct','supporting')` exist, unread by calc | 4-value vocabulary + "only direct_component aggregates" semantics absent |
| 031 | MISSING | `strata_calc_kpi_achievement` = single-KPI single-actual (20260717120000:273-402) | No aggregation service (numerator/denominator/weights/exclusions/overlaps/provenance across contributors) |
| 032 | PARTIAL | `context` CHECK + 2-tier trigger (20260706230000) | New OKRs attach to `theme_id`, not theme-context Objectives (legacy only) |
| 033 | SATISFIED | shared `context` discriminator; `has_objective` edge preserves project ownership (20260706191000:248-252) | — |
| 034 | MISSING | `parent_id` set cross-context directly (20260706191000:233-245); no alignment table | Governed Project Objective Alignment table absent; `parent_id` still live |
| 035 | PARTIAL | card `objective_element_id` + trigger + link/unlink RPCs (20260709171000; 20260718001000) | No validated relationship between card FK and its Project Objectives' `parent_id` |
| 036 | MISSING | create-project-objective never compares to card `objective_element_id` (20260706191000:233-240) | No server-side contradiction check card-primary vs objective-primary |
| 037 | MISSING | `attribution_share` only on benefit tables; execution_links has only `confidence` | No primary/secondary distinction or attribution on objective alignments |
| 038 | PARTIAL | `trg_strata_validate_card_objective` enforces Theme integrity (20260709171000) | No governed-exception override path (integrity_exceptions scoped to scorecard only) |
| 039 | SATISFIED | maker-checker reused: OKR (171907:259-311), portfolio (20260718140000:106-124), scorecard (20260718200000:350-362) | — |
| 040 | MISSING | `strata_complete_project_card` checks milestones/risks/deps/SoD, not KPI/mappings (20260718120000:81-171) | No final Project KPI observation / active-mapping-resolution gate |
| 041 | PARTIAL | Strategy Room readiness from direct `strata_element_kpis` (StrataStrategyRoomPage.tsx:372-409, 0 okr refs) | Readiness not defined as Objective→approved OKR→reportable KR |
| 042 | MISSING | element health from direct KPI only; comment "no element-health calc exists" (StrataStrategyElementDetailPage.tsx:151-165) | No theme/element health from approved KR results |
| 043 | SATISFIED | `strata_lock_snapshot` freezes scorecard config+values (20260717120000:404-448); OKR wave untouched scorecard | — |
| 044 | PARTIAL | Card→Objective + KPI rollup via execution_links (ProjectCardDetailView.tsx:267,547-559) | No KR step; no "Strategic KPI Assignment" in the chain |
| 045 | SATISFIED | `strata_benefits.strategic_objective_id` stable FK; historical linkage "frozen, never rewritten" (20260718130000; 20260719104000:62-66) | — |
| 046 | PARTIAL | `strata_reviews`/`review_links` gate review close on locked snapshot (20260717130000; 20260718150000:234-244) | Review evidence optional-attach, not enforced precondition for KR restatement/exception/contract/mapping changes |
| 047 | MISSING | `strata_kpi_dependency_impact` queries element_kpis/model_measures/lines/KRs/initiative_kpis only (20260718007000:49-107) | Omits `strata_execution_links` assignments/mappings + KR observations; `strata_retire_kpi` never notifies |
| 048 | MISSING | same 5 COUNTs omit `strata_execution_links` (20260718007000:65-93) | Project KPI Assignments + rollup mappings not counted |
| 049 | MISSING | `strata_retire_element` = role check + status flip, no deps (20260705190000:356-372) | No dependency check at all (contrast perspective guard 20260719104000:73-92) |
| 050 | PARTIAL | scorecard config frozen per calc; KR obs append-only (20260718003000:159-186; 173520:84-98) | Measurement Contracts + Project KPI Assignments not in snapshot chain |
| 051 | PARTIAL | generic `strata_audit()` on KR versions/contributors/targets captures num/denom/exclusion (172840:150-158) | KPI-level calc has no exclusion-rule field to audit (KR-only) |
| 052 | PARTIAL | notifications for config-approval/decision/action/blocker/benefit/framework/scorecard (20260710150000; 20260719101000; 20260718200000) | No stale-measurement / KPI-KR-retirement-impact / exception notifications |
| 053 | SATISFIED | This investigation read-only @ 09444187f; all terminology mismatches documented; no staging edits | — |

## Cross-cutting facts

- Retirement/dependency engine built in 3 un-reconciled generations (generic retire = no deps; kpi_dependency_impact = 5 classes but predates execution_links; perspective guard = only blocking trigger, perspective-scoped). None cover assignments/mappings/KR observations.
- The `weighting_policy` (020), `strata_kr_validate_contract` (010), and `withdraw/cancel OKR` (011) capabilities are **built but unwired** — cheap PARTIAL→SATISFIED wins.
