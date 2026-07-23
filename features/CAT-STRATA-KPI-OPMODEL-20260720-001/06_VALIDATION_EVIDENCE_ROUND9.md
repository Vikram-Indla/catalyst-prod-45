# Round 9 — KPI Assignment entry-point + Objective-owned OKR gap closure

Feature Work ID: **CAT-STRATA-KPI-OPMODEL-20260720-001**
Branch: `strata/kpi-operating-model` (HEAD `0eb9ff026` + uncommitted round-9 edits)
Environment: **staging only** (`cyijbdeuehohvhnsywig`). No push / merge / PR. Production untouched.
Date: 2026-07-21. Verified via authenticated Chrome session (localhost:8080) + Supabase MCP + Node-22 vitest.

## E13 — Post-acceptance regression fix (Aiden Round-9 finding)

**Finding (confirmed, critical):** S16 migration `20260721102019_strata_s16_objective_owned_okr.sql`
replaced `strata_okr_validate` to add Objective ownership but **dropped** the approval-stage
measurement-contract gate S0 (`20260720120000`, STRATA-KPI-010) had added — no
`strata_kr_validate_contract` / `KR_CONTRACT_INVALID` / `p_stage='approve'` gate. An OKR could be
approved with an invalid KR measurement contract. Live staging function verified to match the regression.

**Fix:** forward-only migration `20260722080416_strata_okr_validate_reconcile_objective_and_kr_contract.sql`
(ledger 1:1; version stamped by MCP, file renamed to match). Validator now preserves **both**
Objective ownership (`MISSING_OBJECTIVE`/`INVALID_OBJECTIVE`) **and** the S0 approval gate. Non-destructive:
no historical rows touched; draft/submit remain ungated.

**Behavioural proof (live staging, `strata_okr_validate`):**
| OKR | active KRs | `submit` flags contract | `approve` flags contract |
|---|---|---|---|
| Operational Efficiency FY2026 | 2 | false | **true** |
| J Theme-Owned OKR E2E | 1 (valid) | false | false |
| J OKR Full Pass | 2 | false | **true** |

approve-only gating + contract-sensitive + Objective codes preserved.

**Suite:** full KPI/OKR guard sweep **19 files / 125 tests PASS** (was 18/1-fail · 123/2-fail). The two
previously-failing S0 tests (`strata_kr_validate_contract`, `KR_CONTRACT_INVALID`, `p_stage='approve'`) now green.

## Gate summary
| Gate | Result |
|---|---|
| Full KPI/OKR guard suite (Node 22, sequential) | ✅ 19 files / 125 tests (post-E13) |
| `npm run build` (production) | ✅ exit 0 |
| `npm run lint:colors:changed:ci` | ✅ 0 changed files with hard-coded colours |
| `npm run audit:ads:gate` | ✅ no category above baseline |
| S16/S17/S18 guard tests (Node 22) | ✅ 3 files / 14 tests passed |

## Requirement-by-requirement evidence

| # | Requirement | Implementation location | DB / RPC / UI change | Authenticated test | Expected | Actual | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Replace "Add OKR on a Theme" with Objective-owned authoring | `StrataKpiLibraryPage.tsx:311`; `StrataStrategyElementDetailPage.tsx` (`createOkrV3`, `objective_id`) | UI label + `strata_create_okr_v3(objective_id)` | OKRs tab → button reads "Add OKR on an Objective"; authoring gated `isObjective && canAuthor` | Objective-owned authoring only | Button "Add OKR on an Objective" live; v3 writes `objective_id` | **PASS** |
| 2 | Preserve grandfathered Theme-owned OKRs + indicator; no silent re-parent of ambiguous/terminal | `shared.tsx:1528` + `StrataOkrDetailPage.tsx:109`; `strata_okr_objective_map` + `strata_okr_objective_exceptions` | Lozenge `objective_id IS NULL AND theme_id IS NOT NULL`; provenance map | Queried map: 3× `legacy_objective_element`, 2× `sole_child_objective` (unambiguous), 1× `is_exception=true` left unparented | Deterministic tracked backfill; ambiguous left for human | "J OKR Full Pass" `is_exception=true`, `objective_id` null; every re-parent has method+reason+timestamp; 0 rows remain grandfathered (all deterministically resolved), lozenge correctly renders on none | **PASS** |
| 3 | Complete KPI Assignment entry points (KPI detail, Strategic Objective, OKR, KR, Project Card) | `StrataKpiDetailPage` (Classify + assign), `StrataStrategyElementDetailPage`, `StrataOkrDetailPage:98`, `StrataKrDetailPage:180`, `ProjectCardDetailView:673` | Deep-links + inline `KpiAssignmentsSection` | Verified OKR + Project Card entry live; KR/Objective wired in source | Assignment reachable from every surface | All 5 entry points present + wired | **PASS** |
| 4 | Every entry preserves+displays origin context; never raw UUID | assignment form Strategy-element resolves name; breadcrumbs | `strategyElementName(id)` resolution | OKR→assignment showed Strategy element "Industrialize Core Investment Operations" (name, not UUID); breadcrumb "STRATA / Strategy / Investment Operations Excellence / …" | Names everywhere | No raw UUID surfaced | **PASS** |
| 5 | Return-to-origin via Back / browser Back-Fwd / refresh / deep link | `?from=` param; "← Back to OKR" / "← Back to …" | round-trip nav | OKR → Create Strategic Assignment (`from=/strata/okrs/operational-efficiency-fy2026`) → "← Back to OKR" returned to `/strata/okrs/operational-efficiency-fy2026` | Origin restored | Returned to exact origin | **PASS** |
| 6 | From KR, "Create eligible assignment" returns to KR + allows linking approved assignment | `StrataKrDetailPage.tsx:180` (`KrAssignmentLink`) | deep-link carries `objectiveId,okr,kr,from` | Source-verified: button builds `element=${objectiveId}&okr=${okrId}&kr=${kr.id}&from=${fromPath}` | Return to KR + relink without rediscovery | Deep-link carries kr + from | **PASS** (code-verified) |
| 7 | From OKR, preselect its Strategic Objective (not merely Theme) | `StrataOkrDetailPage.tsx:98` | `element=${okr.objective_id}&objective=${okr.objective_id}` | OKR "Operational Efficiency FY2026" → form preselected Scope=Strategic, Strategy element = owning Objective "Industrialize Core Investment Operations" | Objective preselected | Objective (not theme) preselected by name | **PASS** |
| 8 | Project Card "Add Project Objective first" path + auto-return to Scope & Measures | `ProjectCardDetailView.tsx:657-679` (prereq), `:1033-1048` (modal), `:254` (`submitAndRefresh`) | modal overlay + `invalidate()` + inline swap | Excel Import Test Project → Scope & Measures showed "Add a Project Objective first"; created objective; stayed on tab; Project Objectives 0→1; "New KPI Assignment" form appeared inline | Auto-return, no manual tab switch | Prereq panel swapped to live assignment form on same tab | **PASS** |
| 9 | Reconcile with sibling `8cfab17bb` (strata/execmodel); preserve both, discard nothing | working tree vs `8cfab17bb` content diff | — | All S16/S17/S18 migrations + RPCs + 14 guard tests preserved verbatim (0 lines missing). 4 src deltas are governed supersessions: types.ts (all S16 roles kept + 3 added), domain (approvedKpis kept + updateKpiAssignment added), KpiDetailPage (authoring union extended + `classify`), StrategyRoom (hand-rolled tablist→ADS Tabs; direct element→KPI readiness→D5 coverage RPC) | Superset, nothing lost | Working tree is a proper superset | **PASS** |
| 10 | Reconcile `StrataRole` with effective server roles (`okr_owner`, `kpi_approver`) without weakening server auth | `types.ts:189-195` | additive union `+ okr_owner, kpi_approver, okr_approver` | Server role vocab (free-text, checked via `strata_has_role`): assigned = executive_viewer/kpi_owner/strata_admin/strategy_office/vmo_validator; RPCs also reference okr_owner/kpi_owner/data_steward. Union now covers all; DB enforcement unchanged | Type documents real roles, server unchanged | Additive client type only | **PASS** |
| 11 | `strata_update_kpi_assignment` repairs draft/rejected preserving lock-version, scope, eligibility, maker-checker | `20260721110814_..._s18_kpi_assignment_repair.sql`; `domain/index.ts updateKpiAssignment`; `kpiGovernanceSections.tsx` (Repair UI) | S18 RPC + domain + repair form | Created draft `KA-00AFD100EC` (target 5) → Repair → target 8 → saved. DB: target 5→8, **lock_version 0→1**, scope_type=strategic preserved, kr_eligible preserved, still draft. Then Submit → SUBMITTED; self-Approve → **`OWNER_SOD_CONFLICT`** blocked; Retire → RETIRED | Repair works, guards intact | All preserved; SoD enforced | **PASS** |
| 12 | Resolve build dependency; green production build | — | — | `npm run build` | exit 0 | exit 0 | **PASS** |

## Full lifecycle (single authenticated run, normal navigation, KPI Assignments tab)
create draft (owner+period+target) → read → **repair** (target 5→8, lock_version 0→1) → submit → **self-approve blocked (OWNER_SOD_CONFLICT)** → retire. Owner = Ali Alshaya; submitter = browser session (Vikram); scope/identity fixed throughout.

## Staging test residue (non-destructive, on test fixtures)
- `KA-00AFD100EC` — retired test assignment (Churn Rate / Improve Customer Retention).
- "E8 Auto-Return Test Objective" — project objective on `PRJ-TEST-001` (Excel Import Test Project) test card.

## Not committed
Per round instruction: staging only, no push/merge/PR. Uncommitted src edits: `types.ts`, `domain/index.ts`, `kpiGovernanceSections.tsx`, `shared.tsx`, `StrataKpiLibraryPage.tsx`, `StrataKrDetailPage.tsx`, `StrataOkrDetailPage.tsx`. Migrations S16/S17/S18 + D4/D5 applied to staging, ledger 1:1.
