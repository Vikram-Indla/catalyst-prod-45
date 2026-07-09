# REQUIREMENTS register — STRATA foundation gap closure

All `state: to-be` unless noted. Source SRC-001 = locked goal; SRC-A/B/C = discovery agent reports (repo evidence) in 02_CANONICAL_DISCOVERY.md. Priorities: P0 = acceptance-criteria blocking, P1 = required deliverable, P2 = hygiene.

> Headline: the STRATA model already exists (Cycle→Theme→Objective→OKR→Project Card; BSC; VMO; Governance — all live). These REQs close the residual gaps between the live module and the 20 acceptance criteria. NO greenfield build.

## Terminology (goal rules 1–8)

- **REQ-001 (P0)** Remove "Play" from STRATA-facing code/UI: rename UI label "Play charter"→"Theme charter" (`StrataStrategyRoomPage` 486/1092, `StrataStrategyMapPage` 551, element detail), TS type `StrataPlayCharter`→`StrataThemeCharter`, hook `usePlayCharters`→`useThemeCharters`, domain methods. AC: repo grep for `Play` in `src/modules/strata` returns only Atlaskit icon imports; UI shows "Theme charter". [SRC-001 rule 2; SRC-A §A4; CON-001]
- **REQ-002 (P1, DECIDED CON-001: full rename)** DB rename `strata_play_charters`→`strata_theme_charters`, RPC `strata_upsert_play_charter`→`strata_upsert_theme_charter` via safe migration (ALTER TABLE RENAME + drop/recreate RPC keeping grants/RLS; preserve IDs/data). AC: old names absent from `information_schema` except migration history; data row-count unchanged. [SRC-001 rules 2, impl-8; CON-001]
- **REQ-003 (P1)** Terminology guard: vitest (or lint script) failing on the literal "Play " string in STRATA UI-facing files (whitelist Atlaskit icon imports). AC: test exists, passes post-REQ-001, fails when a "Play charter" label is reintroduced. [SRC-001 deliverable 14]

## Information architecture (goal deliverable 10; AC 1, 2, 12, 15, 16)

- **REQ-004 (P0)** Regroup STRATA sidebar (`EnterpriseSidebar.tsx` L28-57 or a new dedicated `StrataSidebar` on `SidebarBase`) into the four canonical areas under the active Strategy Cycle: **Strategy Execution** (Strategy Room, Strategy Map, Execution/Project Cards), **Balanced Scorecard** (Scorecards, KPI Library), **Value Management Office** (Portfolio & Value), **Governance** (Reviews & Decisions, Data & Lineage) + Configuration. Routes unchanged. AC: sidebar renders 4 area groups with those exact labels; all links resolve (no dead links). [SRC-001 linkage 1, 16–18; SRC-C §C1-7; CON-004]
- **REQ-005 (P1)** `routeRegistry.ts` page titles/breadcrumbs updated to canonical names (e.g. "Value Management Office", "Governance — Reviews"). AC: 13 STRATA entries reflect canonical area names. [SRC-001 impl-9; SRC-C §C1-8]
- **REQ-006 (P1)** Strategy Cycle prominence: `/strata` Command Center and area pages show active Cycle context (StrataProvider already provides it). AC: cycle name + period visible on the 4 area landing pages. [SRC-001 AC1-2; SRC-A §A2]

## Linkage model (goal rules 5–15; AC 5–11)

- **REQ-007 (P0)** Add Project Card → Strategic Objective linkage (VERIFIED ABSENT 2026-07-09: `strata_project_cards` has `theme_id` only). Add nullable `objective_element_id` FK (CHECK: element_type='objective', context='theme') or typed `execution_link ('project_card'→'element','supports_objective')`, with validation that the objective belongs to the card's theme. AC: a card can reference exactly one strategic objective; DB rejects a non-objective element; UI card detail shows linked Theme + Objective. [SRC-001 rules 5–6; CON-005]
- **REQ-008 (P1, downgraded — edge VERIFIED EXISTS)** Project Objective → Strategic Objective edge already DB-enforced: `strata_create_project_objective` sets `strategy_elements.parent_id` with theme-context check (`20260706191000` §3). Remaining work: smoke-test coverage + drilldown UI from strategic objective listing supporting project objectives. AC: negative test (non-theme parent rejected) passes; drilldown works on seed. [SRC-001 rule 8; CON-005; ASM-002 verified]
- **REQ-009 (P1, downgraded — edge VERIFIED EXISTS)** Project KPI → OKR linkage exists: `strata_create_project_kpi` writes `('kpi','rolls_up_to')` edge to Theme KPI (`20260706191000` §4) and `strata_key_results.kpi_id` links KR↔KPI. Remaining work: confirm UI enumerations (from an OKR → supporting project KPIs; from a card → its KPIs' OKRs) + smoke test. AC: both enumerations work on seed data. [SRC-001 rules 9–10; CON-005; ASM-002 verified]
- **REQ-010 (P0)** Codify the Theme↔Portfolio ban (already absent by design): (a) DB trigger/CHECK on `strata_portfolio_memberships` locking `member_type ∈ ('initiative','project_card')` (verify existing CHECK; tighten to drop 'initiative' when reconciliation completes), (b) comment/constraint preventing any future theme edge, (c) smoke test asserting insert of a theme member fails. AC: negative test passes; rule documented in DATA model docs. [SRC-001 rules 12–15; SRC-B §B5]
- **REQ-011 (P1)** Blockers as first-class on Project Card: confirm current representation (`risk_summary`/`dependency_summary`/optional_fields) and expose explicit Blockers (list or status) on card detail. AC: card detail shows Milestones, Dependencies, Risks, Blockers distinctly; empty states render nothing fabricated (zero-assumption rule). [SRC-001 §Project Card; SRC-B §B3]

## Balanced Scorecard (AC 12–14)

- **REQ-012 (P0)** Represent **CEO Scorecard** = enterprise-scope `strata_scorecard_model` instance, and **Sector / CXO Scorecard** as the single combined concept for `owner_scope_type ∈ (sector, function)` — labels in UI/config/seed use "Sector / CXO Scorecard". AC: Scorecards page groups CEO vs Sector/CXO; no separate "Sector Scorecard"/"CXO Scorecard" labels. [SRC-001 rule 6, AC13-14; ASM-003]
- **REQ-013 (P1)** CEO rollup drilldown path verified: enterprise → sector/CXO instance → measure detail → related Project Cards/benefits/evidence/commentary (existing `ref_type ∈ kpi/objective/benefit` lines + calc RPCs). AC: drilldown clickthrough works on seed data. [SRC-001 §BSC; SRC-B §B1]

## VMO & Governance (AC 15–16)

- **REQ-014 (P1)** VMO area labeled "Value Management Office" (nav, page titles, empty states); portfolio page shows linked Project Cards, Benefits with Planned/Forecast/Realized/Validated values (existing `strata_benefit_values.value_kind` + validation_status), Value Gates, Assumptions, Attribution Rules. AC: labels correct; benefit detail shows the four value kinds. [SRC-001 §VMO; SRC-B §B2]
- **REQ-015 (P1)** Governance area labeled "Governance" grouping Reviews & Decisions + Data & Lineage; review-cadence surfaced from cycle/period config (ASM-007). AC: labels correct; snapshot→decision→action chain visible from Reviews page. [SRC-001 §Governance; SRC-B §B4]

## Consolidation & hygiene (AC 19–20)

- **REQ-016 (P1, DECIDED CON-002: decommission + migrate)** Delete dead `StrategyCockpit` (zero importers) and retire `modules/objectives`, `modules/okr-v2`, `components/okr/` as user-facing strategy surfaces once REQ-022/023 complete. AC: decision recorded in 00_admin/DECISIONS.md; dead code removed; no duplicate strategy hierarchy presented to users. [SRC-001 AC19; SRC-A §A6; CON-002]
- **REQ-022 (P1, NEW from CON-002)** Data migration: map legacy enterprise objectives/OKR rows (tables behind `modules/objectives` + `okr-v2`) into `strata_strategy_elements`/`strata_key_results`/`strata_kpis`, preserving IDs where possible (goal impl-8), with a committed reversible migration + row-count reconciliation report. Pre-req: build-phase inventory of the legacy tables and live row counts (they were NOT probed this phase). AC: every migrated legacy row traceable to a strata row; counts reconcile; migration file committed per ledger discipline. [SRC-001 AC19, impl-7/8; CON-002; ASM-001]
- **REQ-023 (P1, NEW from CON-002)** Route retirement: `/enterprise/objectives` (and any okr-v2 routes) redirect to the corresponding `/strata` surface; nav entries removed; no dead links. AC: old URLs 30x-redirect in-app; smoke test asserts no route renders the legacy stacks. [SRC-001 AC19–20; CON-002]
- **REQ-017 (P2, DECIDED CON-006: delete)** Remove orphaned `src/modules/strategy/astryx/`; update CLAUDE.md Astryx section to match reality (doctrine touch approved at Gate R2). AC: directory gone; CLAUDE.md no longer claims an active Astryx ring-fence. [SRC-A §A6; SRC-C §C4; CON-006]
- **REQ-018 (P2)** Drop dead legacy `public.scorecards` table (zero refs) via migration, or explicitly defer. [SRC-B §B1]
- **REQ-019 (P1)** Finish Initiative→Project Card reconciliation seams flagged in migration comments (initiatives out of active Execution UI; memberships/benefits favor project_card paths). AC: Execution UI shows only Project Cards; no UI writes to `strata_initiatives`. [SRC-B §B3/B6]

## Seed & verification (goal deliverables 11–12)

- **REQ-020 (P0)** Seed slice (idempotent, following `20260705100600` conventions) demonstrating the full canonical chain: Cycle → Theme → Objective → OKR/KR → Project Card (+Project Objective, Project KPI, milestones, dependencies, risks, blockers) → Portfolio membership → Benefit (4 value kinds) → Gate → Snapshot → Decision → Action → Board Pack ref. AC: one query path per linkage rule returns seeded rows. [SRC-001 deliverable 11; ASM-004]
- **REQ-021 (P0)** Smoke tests under `src/modules/strata/__tests__/`: (a) hierarchy trigger 2-tier enforcement, (b) Theme↔Portfolio ban negative test (REQ-010), (c) card→objective linkage validation, (d) terminology guard (REQ-003), (e) nav renders 4 areas with resolvable links. AC: `vitest` green in CI. [SRC-001 deliverable 12; SRC-C §C8]
