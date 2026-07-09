# CREATE/EDIT FUNCTIONAL WORKFLOW VERIFICATION — session 018 (2026-07-09)

Method: code inventory (domain/index.ts RPC API + page entry points + DB RPC catalog) followed by LIVE UI exercising on :8081 (worktree app, staging DB, user with strategy_office+vmo_validator+kpi_owner roles). Disposable `ZZTEST Verify *` data created via the real UI and **fully deleted after** (0 rows remain; append-only audit events retained as history). Screenshots are in the session-018 chat. Production untouched.

## Legend
works = exercised end-to-end in the UI · works (probe) = entry point + modal verified, submit not exercised · works (DB-only) = capability exists but no UI entry point · missing = no UI and no RPC

## 1. Strategy Execution
| Workflow | Route | Entry point | Result | Evidence | Data written | Cleaned | Blocker |
|---|---|---|---|---|---|---|---|
| Create Strategy Cycle | /strata/strategy | "New cycle" | **works** (name/dates/granularity/auto-periods; ZZTEST cycle appeared in cycle picker) | chat ss | yes | yes | no |
| Create Theme | /strata/strategy | "New element" → Type=Theme | **works** (draft in active cycle; truthful CHARTER INCOMPLETE) | chat ss | yes | yes | no |
| Create Objective under Theme | /strata/strategy | "New element" → Type=Objective | **works** — parent select is Theme-restricted ("Parent (Theme)"); typeahead validation; in-modal "Action rejected · Required: Type" on missing field | chat ss | yes | yes | no |
| Edit Theme/Objective | hierarchy row hover | "Actions ▾" → Edit (also KPI links, Retire…) | **works** (rename persisted) | chat ss | yes | yes | no |
| Create Project Card | /strata/execution | "New project card" (primary) | **works** — auto PRJ-ref, slug route, "exactly one Strategic Theme" stated in modal | chat ss | yes | yes | no |
| Link card → exactly one Theme | card create modal | Strategic Theme* (single-select, required) | **works** | chat ss | yes | yes | no |
| Link card → Strategic Objective (same theme) | — | **NO UI entry point** (card Edit modal has no Theme/Objective fields; `objective_element_id` set by import/seed only) | **works (DB-only)** — same-theme UPDATE accepted; UI gap | SQL probe | yes (ZZTEST card only) | yes | no |
| Cross-theme objective link blocked? | — | — | **DB: BLOCKED** (trigger `strata_validate_card_objective` rejected cross-theme UPDATE; same-theme control accepted). **UI: N/A for this column** (no entry point). **GAP on adjacent path — see finding F1** | SQL probe | attempted+rolled back | n/a | see F1 |
| Create Project Objective | card → Scope & Measures | "New objective" | **works** | chat ss | yes | yes | no |
| Create Project KPI | card → Scope & Measures | "New KPI" (owner + validator-must-differ fields) | **works** (appears in KPI dictionary as Draft/Manual) | chat ss | yes | yes | no |
| Create Milestone | card → Delivery | "New milestone" ("milestone writes recalculate Delivery Health on the server") | **works** | chat ss | yes | yes | no |
| Create Dependency | card → Delivery + /strata/execution | "New dependency" | **works** | chat ss | yes | yes | no |
| Create Blocker | dependency modal | "This dependency blocks delivery" checkbox | **works** — surfaces in first-class Blockers section + stat | chat ss | yes | yes | no |
| Create Risk | — | — | **partial / display-only** — no first-class Risk entity; only `risk_summary` / optional `risks` text on the card (visible on Overview). | code + card Overview | no | n/a | no |

**F1 — FINDING (functional gap, cross-theme guard hole):** the "New project objective" modal's "Link to Theme Objective" select lists objectives from **all** themes, and `strata_create_project_objective` validates only that the parent is a theme-context objective — **not that it belongs to the card's theme**. A cross-theme upward link was accepted end-to-end (card in ZZTEST theme → parent "Grow B2B Revenue" in B2B Growth Engine). The sibling guard on `strata_project_cards.objective_element_id` DOES enforce same-theme. Recommended fix (not applied): filter the select options to `themeObjectives.filter(o => o.parent_id === card.theme_id)` in ProjectCardDetailView, and add the same-theme check to the RPC (one `IF NOT EXISTS` clause) via migration.

## 2. Balanced Scorecard
| Workflow | Route | Entry point | Result | Notes |
|---|---|---|---|---|
| Create CEO Scorecard (model/instance) | /strata/scorecards, /strata/admin | **none** | **missing (by design?)** | No create UI and **no create RPC** (`strata_create_scorecard_*` does not exist). Models/instances are seeded governed config; admin shows them display-only with Approve (`strata_approve_scorecard_model`). PO decision: accept as governed-config-only, or scope an authoring slice. |
| Create Sector/CXO Scorecard | same | **none** | **missing (by design?)** | same as above |
| Create Perspective | /strata/admin/perspectives | **none** | **missing (by design?)** | Display-only "versioned, approved records"; no create RPC |
| Create Measure / KPI | /strata/kpis | "+ New KPI" / "+ New OKR" / per-OKR "Add key result" | **works (probe)** — buttons + modals present; project-KPI create exercised end-to-end shares the same framework | |
| Set target / actual / owner / cadence / RAG | KPI detail | "Set target"; actuals via Data & Lineage upload or manual submit + independent "Attest"; owner/frequency on KPI create/edit; RAG = server-computed bands from governed threshold schemes | **works (probe)** — targets/attest verified in session 005–007 evidence; RAG is deliberately not user-set (governed) | |
| Link Measure → Strategic Objective/OKR | Strategy Room element → Actions ▾ → "KPI links" | "Link KPI" (weight + contribution) | **works (probe)** — panel verified session 016; `strata_link_element_kpi` | |
| Link Measure → Project Card / Project KPI | card Scope & Measures | project KPI "Roll up to Theme KPI" select | **works** (created via New KPI; rollup optional) | |
| Edit / delete-disable scorecard items | KPI rows / admin | KPI edit + Retire; scorecard lines follow model config; instances lock via snapshot | **partial** — KPIs yes; scorecard lines/models have no UI editing (governed) | |
| Entry points visible/understandable | — | — | **Scorecards page: display-only** (only global "+ Create" in header, which is platform-wide, not scorecard-specific) | |

## 3. Value Management Office
| Workflow | Entry point | Result | Notes |
|---|---|---|---|
| Create Portfolio | "New portfolio" | **works** (name/category/owner/value target) | ZZTEST portfolio created+deleted |
| Edit Portfolio | "Edit portfolio" | **works (probe)** — button + modal (`strata_update_portfolio`) | |
| Link Project Card → Portfolio | "Add member" | **works** — member type select offers **Project card / Initiative (legacy) only**; allocation % + priority | ZZTEST card added as member |
| Theme cannot link to Portfolio | member type select | **CONFIRMED (UI)** — no Theme option; **CONFIRMED (DB)** session 005 negative test: `member_type='theme'` rejected by CHECK+trigger; theme UUID smuggled as project_card rejected by referential guard | |
| Portfolio cannot link to Theme | Strategy Room / element detail | **CONFIRMED** — no portfolio linkage surface on Theme; map edges are element↔element; `strata_validate_portfolio_member` guards member side | |
| Enter Planned/Forecast/Realized/Validated | benefit "Add value" | **works (probe)** — Value kind = Baseline/Planned/Forecast/Realized; **Validated is not directly enterable**: realized values enter PENDING and require independent validation ("Validate" action; "must be validated by a different user than the submitter") — segregation of duties, matches locked design | |
| Value rollup + leakage/gap | VMO landing | **works** — Value profile segmented bar (Planned/Forecast/Realized/Validated), VALUE AT RISK stat (server-calculated + evidence link), Benefits realization % on Command Center | |
| Entry points visible | — | **yes** — New portfolio / Edit portfolio / Add member / New benefit / Add value / Add assumption / Schedule gate / Remove | |

## 4. Governance
| Workflow | Entry point | Result | Notes |
|---|---|---|---|
| Create Review Cadence | cycle create/edit ("Period granularity") | **works** — cadence derives from Strategy Cycle; Reviews shows "Review cadence: Quarter · from Strategy Cycle FY2026" | by design: no separate cadence entity |
| Create Review instance/session | "Lock snapshot" (+ "Close period") | **works (probe)** — modals with attestation guard verified sessions 013–014 (SNAP-1, SNAP-1001 exist) | |
| Create Decision | "New decision" | **works** — DEC-1101 created (server-assigned key; type/forum/owner/due fields) | created+deleted |
| Create Action | expand decision → "New action" | **works** — ACT-1101 under DEC-1101 with Start/Cancel controls | created+deleted |
| Link governance → Theme/Objective/Card/Scorecard/Portfolio | decisions carry snapshot_id + evidence_refs (frozen scorecard/KPI evidence); gates schedule against portfolio members (Schedule gate) | **partial** — linkage is via snapshot evidence + gates, not direct entity pickers on the decision | matches evidence-first design |
| Edit Governance items | "Mark decided", action Start/Cancel, `strata_update_decision/action` | **works (probe)** | |
| Entry points visible | — | **yes** | |

## Hierarchy diagram (what the user creates, in order)
```
Strategy Cycle (New cycle; owns periods + review cadence)
└─ Theme (New element; root-level only — parent select removed)
   ├─ Charter (upsert on theme; drives "Charters complete")
   ├─ Strategic Objective (New element; parent MUST be a Theme)
   │   └─ KPI links (Link KPI: weight + contribution)  ←→  KPI / OKR (KPI Library: New KPI / New OKR / Add key result)
   └─ Project Card (New project card; REQUIRED link to EXACTLY ONE Theme)
       ├─ objective_element_id → Strategic Objective  [DB trigger: SAME THEME ONLY — no UI entry point yet]
       ├─ Project Objective (context='project'; optional upward link to Theme Objective — ⚠ F1: cross-theme NOT blocked)
       ├─ Project KPI (optional roll-up to Theme KPI; validator ≠ owner)
       ├─ Milestone (drives server-calculated Delivery Health)
       └─ Dependency (+ "blocks delivery" flag → first-class Blocker)

INDEPENDENT of Theme:
Portfolio (New portfolio)
└─ members: Project Card | Initiative(legacy) ONLY  [Theme BLOCKED in UI + DB]
   └─ Benefit (New benefit) → Values: Baseline/Planned/Forecast/Realized (+ independent Validate ⇒ Validated)
      └─ Gates (Schedule gate → Decide gate)

GOVERNANCE (evidence-first, cuts across):
Cycle granularity ⇒ Review cadence → Lock snapshot (freezes scorecard/KPI evidence) → Decision (DEC-…) → Action (ACT-…) → Close period (attestation-guarded)

BLOCKED BY RULES: theme→portfolio (both layers) · cross-theme card→objective (DB) · theme-context parent for objectives ≠ theme (UI+RPC) · validated-by-submitter (segregation) · closed-period writes
GOVERNED / NO AUTHORING: Scorecard models & instances · Perspectives · Threshold schemes (admin = display + approve)
```

## Functional gaps summary (for PO)
1. **F1 (defect-grade)**: cross-theme "Link to Theme Objective" accepted on project objectives (UI unfiltered + RPC unvalidated). Small 2-part fix recommended.
2. **No UI to set/change a card's Linked Strategic Objective** (`objective_element_id`) — DB-guarded but only reachable by import/seed.
3. **Scorecard model/instance/perspective authoring absent** (no UI, no RPC) — governed-seed-only; needs explicit PO accept-or-scope.
4. **Risk is a text field, not an entity** — no risk register workflow.
