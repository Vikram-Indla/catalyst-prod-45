# Five-Engine STRATA completion — consolidated staging evidence (for Aiden)

Feature: **CAT-STRATA-KPI-OPMODEL-20260720-001** · Branch `strata/kpi-operating-model` (HEAD `0eb9ff026` + uncommitted work).
Environment: **staging `cyijbdeuehohvhnsywig`** only. **No push / merge / PR. Production untouched.**
Developer evidence (DB-level auth via Supabase MCP, repo build/tests, authenticated browser at :8080).
Independent acceptance remains Aiden's.

---

## 1. Gates — ALL GREEN

| Gate | Command | Result |
|---|---|---|
| Production build | `npm run build` | ✅ **✓ built in 2m 52s** (exit 0) |
| Full STRATA regression | `vitest run --no-file-parallelism src/modules/strata/__tests__/` | ✅ **77 test files, 694/694 tests, 0 failures** |
| Colour gate (zero-tolerance, changed files) | `npm run lint:colors:changed:ci` | ✅ 0 changed files with hard-coded colours |
| ADS audit ratchet | `npm run audit:ads:gate` | ✅ no category above baseline (tokens 19814/19814, typography 1366/1366, spacing 0/0, fontImports 0/0) |
| Whitespace / conflict markers | `git diff --check` | ✅ clean |
| Live UUID verification | authenticated browser | ✅ retired objective resolves by name; **zero raw UUIDs** |

**Regression movement: 52 failing → 0 failing.** Test-file count is **77** (verified from the runner —
three S21 guards landed after the earlier 74-file run; the count is not 76).

### S21 Command Center guard — inspected, NO fix required
The requested change ("point the guard at the exact Project Card drill-through instead of the generic
`Routes.strata.execution()`") was **already implemented** — no stale guard exists:
- Product: `StrataCommandCenterPage.tsx:397` builds `Routes.strata.projectCard(slug)` + cycle/period/tab/from params.
- `kpi-opmodel-s21-command-center-consumer.guard.test.ts` asserts `Routes.strata.projectCard(slug)`.
- `kpi-opmodel-s21-provenance-navigation.guard.test.ts:27` additionally asserts the rollup panel does
  **NOT** match `Routes.strata.execution()` — the obsolete route is guarded against, not asserted.
- Repo-wide search: **no test references `Routes.strata.execution()`**.
- All three S21 guards pass (22/22).
No product implementation was changed and no governed assertion was weakened.

---

## 2. Baseline reconciliation (no valid work lost)

- Sibling "S19 closure" session's work **preserved and verified live on staging**: S19
  `strata_project_kpi_trace` + S20 `strata_executive_governed_rollup` (both functions live, ledger 1:1),
  the governed Project/Contribution fixture, and Command Center's inline "Governed KPI rollup" panel.
- **Zero new failures introduced this session** — proven by stashing all uncommitted work and re-running
  the failing suite against committed `0eb9ff026`: byte-identical 52 failures.
- **Integration correction (compatible, required):** the sibling hook called
  `governanceApi.executiveGovernedRollup`, but the method existed only in `kpiApi` — i.e. the tree did
  not compile. Moved it to `governanceApi` (single source), removed the duplicate. No behaviour change.

---

## 3. Regression triage — all 52 were harness drift, zero real product regressions

Three parallel investigators root-caused every failure:

| Cause | Count | Files | Fix |
|---|---|---|---|
| Missing `<MemoryRouter>` after an unrelated nav feature added `useNavigate()` to `ScorecardModelsSection` | 45 | p0-approved-model-immutable, phase5-governed-logic, scgov-lifecycle-ui, scgov-live-integrity, ac6-keyboard-weight-change | import + wrap render |
| Stale a11y label after CFG-007 added a `(required)` suffix | 6 | ac6-keyboard-decision-verbs, rd-cycle4-fixes | `Title`→`Title (required)`, `Value`→`Value (required)` |
| Stale guard asserting the de-officialised `'KPI links'` theme action still exists | 1 | gate-scope.guard | assert its intentional removal instead |

No assertion of governed behaviour was weakened; no product code was changed to make a test pass.

---

## 4. Legacy authoring-path removal (superseded paths retired)

| Removed | Location | Superseded by | Reachable? |
|---|---|---|---|
| `createOkr`, `createOkrV2` | domain/index.ts | `createOkrV3` (Objective-owned) | dead — 0 callers, 0 test refs |
| `updateKeyResult` (manual KR value bypass) | domain/index.ts | assignment-observation model | dead — 0 callers |
| `KpiStrategyLinksModal` | StrataKpiDetailPage.tsx | Objective→OKR→KR (D5) | unreachable |
| `KpiLinksModal` | StrataStrategyRoomPage.tsx | Objective→OKR→KR (D5) | unreachable |
| Stale copy/comments ("Strategy Room row menu", Theme-owned v2) | ElementDetail, KpiLibrary | governed Objective-owned model | live copy, corrected |

323 lines of dead authoring code removed; build green afterwards.

---

## 5. Per-engine capability evidence

| # | Engine | Capability | Entry point (normal nav) | Implementation | Migration / RPC | Authenticated test | Expected | Actual | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Strategic Direction | Objective-owned OKR authoring | Strategy Objective → "Add OKR on an Objective" | StrataStrategyElementDetailPage | `strata_create_okr_v3` | v3 writes `objective_id`; Theme-owned authoring absent | Objective-owned only | as expected | **PASS** |
| 2 | Strategic Direction | Grandfathered OKR preservation | OKRs list / OKR detail | shared.tsx:1528, StrataOkrDetailPage:109 | `strata_okr_objective_map` | backfill: 3 legacy-link, 2 sole-child, **1 exception left unparented** | no silent re-parent | as expected | **PASS** |
| 3 | Strategic Direction | Approval-stage KR-contract gate (E13) | governed OKR approve | `strata_okr_validate` | **20260722080416** | `approve` flags `KR_CONTRACT_INVALID` only when a KR contract is invalid; `submit` never | approve-only gate | as expected | **PASS** |
| 4 | Strategic Measurement | KPI classify → submit → approve (maker/checker) | KPI detail | strata_classify_kpi / approve_kpi | S0/S1 | CPQ KPI approved by assigned approver ≠ creator | governed | as expected | **PASS** |
| 5 | Strategic Measurement | Assignment lifecycle + repair + SoD | KPIs & OKRs → KPI Assignments | kpiGovernanceSections, S18 | `strata_*_kpi_assignment` | KA-D0D522D2F4: create→repair(lock_version 0→1)→submit→approve→retire; self-approve `OWNER_SOD_CONFLICT` | maker-checker enforced | as expected | **PASS** |
| 6 | Strategic Measurement | Two-identity approval | KPI Assignments | S2 | `strata_approve_kpi_assignment` | submitted_by=Vikram, approved_by=Jahanara, `distinct_maker_checker=true` | distinct identities | as expected | **PASS** |
| 7 | Strategic Measurement | KR reportability + official progress | KR detail | KrReportabilityBadge | `strata_kr_reportability`, `strata_okr_official_progress` | KR `assignment_backed` Reportable; OKR `reportable_krs: 1` | KPI-backed only | as expected | **PASS** |
| 8 | Strategic Measurement | Resolved-observation provenance | KR detail → Strategic KPI Assignment | **ResolvedAssignmentObservation** | — | "20 · VALIDATED · OFFICIAL SOURCE · submitted by Vikram Indla · validated by Jahanara Khan" | provenance visible | as expected | **PASS** |
| 9 | Project Execution | Project Objective prerequisite + auto-return | Project Card → Scope & Measures | ProjectCardDetailView:657 | — | "Add a Project Objective first" → create → inline assignment UI, same tab | auto-return | as expected | **PASS** |
| 10 | Project Execution | Project KPI Assignment (scope-locked) | Scope & Measures | KpiAssignmentsSection (project preset) | `strata_kpi_assignments` | KA-94FD86DD25 / KA-5BF83C2537 approved (maker→checker); lifecycle verbs (Observe/roll-up, Retire) render | governed | as expected | **PASS** |
| 11 | Project Execution | Project Objective Alignment | Scope & Measures | KpiAlignmentSection | `strata_project_objective_alignments` | "Digitize the End-to-End Investor Journey · PRIMARY · APPROVED" | named, approved | as expected | **PASS** |
| 12 | Governed Contribution | Typed contribution mappings | Scope & Measures | KpiAssignmentsSection | `strata_kpi_contribution_mappings` | direct_component + driver, both approved maker→checker | typed | as expected | **PASS** |
| 13 | Governed Contribution | Authoritative aggregation rule | S19 trace | `strata_project_kpi_trace` | **20260722100000** | 2 assignments, 1 approved alignment, **1 aggregating + 1 non-aggregating** | only approved effective direct_component aggregates | as expected | **PASS** |
| 14 | Executive Reporting | Project contribution provenance panel | Project Card → Scope & Measures | **ProjectKpiTracePanel (NEW)** | `strata_project_kpi_trace` | live: DRIVER→NON-AGGREGATING; DIRECT COMPONENT→AGGREGATES TO STRATEGIC; KPI/Objective/KR all by name | wired + UUID-free | as expected | **PASS** |
| 15 | Executive Reporting | Enterprise governed rollup | Command Center → "Governed KPI rollup" | useExecutiveGovernedRollup + inline render (reconciled) | `strata_executive_governed_rollup` (**20260722110000**) | returns 1 row; card names resolved; caption states the aggregation rule | no per-card N+1 | as expected | **PASS** |
| 16 | Cross-cutting | No raw UUIDs anywhere | Project Card, alignment, trace | `strategyElementsAll` (NEW all-status resolver) | — | retired objective previously rendered `a5a1a000`; now "Digitize the End-to-End Investor Journey"; `rawUuidPrefixStillShown: false` | names only | as expected | **PASS** |
| 17 | Downstream | Scorecards / reviews / snapshots / notifications | Command Center, Reviews & Decisions | existing | — | 3 locked snapshots · 6 reviews · 43 notifications | preserved | as expected | **PASS** |
| 18 | Downstream | Retirement + historical preservation | KPI Assignments | retire verbs | — | 7 retired assignments preserved and readable; no historical rows rewritten (`historical_rows_rewritten=false`) | non-destructive | as expected | **PASS** |

---

## 6. Environment note (resolved, not a blocker)

The :8080 dev server died mid-run and, on restart, the app booted blank. Root cause was the known
corrupt Vite optimise-cache (`node_modules/.vite`); cleared it and restarted — app booted normally and
live verification completed. No product defect.

## 7. Staging residue (non-destructive governed test records, left intact for inspection)

CPQ KPI (approved, KR-eligible) · KA-D0D522D2F4 + validated observation · child project assignments
KA-94FD86DD25 / KA-5BF83C2537 · contribution mappings (direct_component + driver) · E8 Auto-Return Test
Objective — all on the **Excel Import Test Project** fixture.

## 8. Migrations added this session (forward-only, ledger 1:1)

| Version | Purpose | Staging status |
|---|---|---|
| 20260722080416 | E13 — restore S0 approve-stage KR-contract gate alongside Objective ownership | applied, ledger 1:1 |
| 20260722100000 | S19 — project KPI trace truth (sibling; preserved) | applied, ledger 1:1 |
| 20260722110000 | S20 — executive governed rollup (sibling; preserved) | applied, ledger 1:1 |
| **20260722120000** | **S21 — full-chain aggregation eligibility**: extracts the aggregation rule into a single shared predicate `strata_contribution_aggregates(p_mapping, p_as_of)` and rewires **both** read models (`strata_project_kpi_trace`, `strata_executive_governed_rollup`) to use it — one authoritative definition of "aggregates", no drift between the per-card trace and the enterprise rollup | applied, ledger 1:1 |

**S21 post-replacement behaviour re-verified on staging** (S21 replaces both read models, so the earlier
proof was re-run): `s21_in_ledger=1`, `strata_contribution_aggregates` live, project trace still returns
**2 assignments · 1 aggregating · 1 non-aggregating**, rollup still returns **1 row** — the
direct_component-only rule is preserved exactly, driver still does not aggregate.

No constraint weakened; no historical record altered.
