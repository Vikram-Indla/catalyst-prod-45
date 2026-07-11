# STRATA E2E — QA Acceptance Checklist (independent retest)

Build under test: `main` @ `642fb16ae` · App `localhost:8080` · Supabase staging `cyijbdeuehohvhnsywig`.
Rule: **screenshots are corroboration, not proof.** Acceptance = DOM/URL/DB/console probes.
Status of every defect below: **OPEN — not closed by engineering.** QA decides pass/fail.

## Test fixtures (staging)
- Cycle: `ZZTEST-STRATA-E2E-FY27-Cycle` (URL token `zztest-strata-e2e-fy27-cycle`)
- Theme: `ZZTEST-STRATA-E2E-Service-Excellence` · Objective: `ZZTEST-STRATA-E2E-Improve-Reliability`
- Project Card: `ZZTEST-STRATA-E2E-Project-A` (`PRJ-00030`, slug `zztest-strata-e2e-project-a`)
- Milestone: `ZZTEST-STRATA-E2E-A-M1` (weight 100, progress 70, no baseline dates)
- Baseline cycle for regression: `FY2026` (the real, populated cycle)

## Pre-flight (run once, all routes)
- [ ] **Console baseline:** open DevTools console, hard-reload `/strata/strategy`. Confirm the log
  `[RouteCheck] ✅ 448 route modules loaded cleanly`. No `Boot Error`, no red errors.
- [ ] If you see `Boot Error: Failed to fetch dynamically imported module` → environment issue,
  not a defect: `rm -rf node_modules/.vite && npm run dev`, then retest.

---

## STRATA-E2E-001 — Execution cycle filter (Critical)
- **Route:** `/strata/execution?cycle=zztest-strata-e2e-fy27-cycle`
- **Acceptance:** only cards belonging to the selected cycle appear. FY27 shows **Total Project
  Cards = 1**, **Unassigned Projects = 0**; "By Strategic Theme" lists only
  `ZZTEST-STRATA-E2E-Service-Excellence`.
- **Persistence:** reload the URL → still 1 card (state derives from `?cycle=`, not memory).
- **Cross-module / propagation:** switch to each "View by" (Enterprise, LBU, Theme, PM, Delivery
  Team, Dependency) → every view's population is the same 1 card; no FY2026 card leaks into any view.
- **Regression (must check):** switch to **FY2026** → the full FY2026 population returns
  (assigned cards present, roll-ups non-empty). Confirm **no legitimately-assigned card is hidden**.
  Note the intended behaviour change: **null-theme "Unassigned" cards no longer appear under any
  specific cycle** (Vikram decision). Confirm no workflow depended on seeing them there.
- **DB probe:** a card belongs to a cycle iff its `theme_id` ∈ that cycle's themes —
  `SELECT c.name, e.cycle_id FROM strata_project_cards c JOIN strata_strategy_elements e ON e.id=c.theme_id WHERE e.cycle_id = '<FY27 cycle id>'`.
- **Console:** no new warnings on view switches.

## STRATA-E2E-002 — Strategy cycle persistence (High)
- **Route:** `/strata/strategy`
- **Acceptance:** select `ZZTEST-STRATA-E2E-FY27-Cycle` in the Cycle dropdown → URL becomes
  `?cycle=zztest-strata-e2e-fy27-cycle`; hierarchy shows the FY27 records.
- **Persistence (the defect):** hard-reload → Cycle stays on FY27 (NOT reset to FY2026),
  Period shows `Q1 ZZTEST-STRATA-E2E-FY27-Cycle`.
- **Cross-module / propagation:** with FY27 selected, navigate Strategy Room → Project Cards →
  Scorecards; confirm the active cycle stays FY27 across the module (period token is cycle-scoped —
  changing cycle clears a stale `?period=`).
- **Regression:** bookmark `?cycle=…&period=…`, reload → both rehydrate; an invalid `?cycle=`
  token falls back to the default (no crash, no blank).
- **Console:** clean.

## STRATA-E2E-003 — Linked Project Objective creation (Critical)
- **Route:** `/strata/execution/zztest-strata-e2e-project-a` → **Scope & Measures**
- **Acceptance:** as a `strategy_office` **or admin** user, "New objective" is present; create an
  objective linked to a theme-context objective → modal closes, **Project Objectives count
  increments**, the row shows the upward link. On failure the modal **stays open with a
  SectionMessage** (never silent).
- **Persistence:** reload the card → the objective is still listed.
- **Cross-module:** the created objective is a `context='project'` element in
  `strata_strategy_elements` linked via `strata_execution_links` (`has_objective`).
- **Regression / role check (the fix):** log in as `vmo_validator` or `data_steward` →
  the **"New objective" button is NOT shown** (RPC only accepts strategy_office+admin, so the
  button no longer offers an always-failing action). As strategy_office/admin it IS shown and works.
- **Console:** no swallowed error; a rejected create surfaces text in the modal.
- **Note:** the original "silent failure" was largely the corrupted Vite dep cache — retest on the
  healthy build.

## STRATA-E2E-004 — Milestone progress roll-up (Critical)
- **Route:** `/strata/execution/zztest-strata-e2e-project-a` → **Delivery**
- **Acceptance:** the card header **Actual progress = 70%** (milestone weight 100 / progress 70,
  no baseline dates). Edit the milestone progress → header recalculates on save.
- **Persistence:** reload → 70% persists (written to `strata_project_cards.actual_progress`).
- **Cross-module / propagation:** the Execution list "Average Progress" and any Theme/Scorecard
  roll-up that reads `actual_progress` reflect the value.
- **Documented behaviour (not a bug):** with **no baseline dates**, Delivery Health stays
  **"Not Available"** and Variance `—` — schedule health needs a baseline window. To get full
  health, add Baseline Start+End to the milestone (form helper now says so) and re-verify health
  moves off Not Available.
- **DB probe:** `SELECT actual_progress, calculated_health FROM strata_project_cards WHERE slug='zztest-strata-e2e-project-a'` → `70.00`, `not_available`.
  Then `SELECT public.strata_calc_execution_progress('<card id>')` → `actual_progress_pct: 70`.
- **Regression:** on a card whose milestones **do** carry baseline dates, confirm the duration-
  weighted result is unchanged (weight-fallback only fires when no baseline duration exists).

## STRATA-E2E-005 — Project Card authoring fields (High)
- **Route:** `/strata/execution` → **New project card**
- **Acceptance:** the form exposes **Leading Business Unit / Team, Delivery Team,
  Department / Sector, Portfolio** (plus the prior fields). Create a card populating them.
- **Persistence:** open the created card → the values render on Overview / Edit.
- **Cross-module / propagation:** the card is no longer forced to `Unassigned` LBU; it appears
  under its LBU/Delivery-Team groupings on Execution. **Portfolio** membership is written to
  `strata_portfolio_memberships` (visible in Portfolio & Value).
- **Regression:** creating a card **without** the new fields still succeeds; Portfolio is optional
  — if a portfolio is selected and its membership RPC fails, the card is still created and the
  error surfaces (no orphaned half-state that blocks the user).
- **DB probe:** `SELECT lead_business_unit, delivery_team, sector FROM strata_project_cards WHERE id='<new id>'` and `SELECT * FROM strata_portfolio_memberships WHERE member_id='<new id>'`.

## STRATA-E2E-006 — Risk + standalone Blocker authoring (High)
- **Route:** `/strata/execution/zztest-strata-e2e-project-a` → **Delivery**
- **Acceptance (Risk):** a **Risks** section with **New risk** (testId `strata-new-risk`). Create a
  risk (title required; likelihood/impact/status/owner/mitigation/target optional) → count
  increments, row shows likelihood/impact/status lozenges. Edit updates it.
- **Acceptance (Blocker):** **New blocker** (testId `strata-new-blocker`) opens the dependency flow
  **pre-flagged as a blocker**; on save it appears in the Blockers section. (Blockers reuse
  `strata_dependencies.is_blocker` — no separate entity by design.)
- **Persistence:** reload → risk and blocker persist.
- **RLS / regression (must check):** as a **non-writer role** (no strategy_office/vmo_validator/
  data_steward/admin) the New risk/blocker buttons are hidden AND the RPC rejects
  (`strata_create_risk` raises a role error). As a writer it works. Confirm a non-approved user
  cannot mutate via direct RPC.
- **DB probe:** `SELECT * FROM strata_risks WHERE project_card_id='<card id>'`; table has RLS
  (`strata_risks_select` approved-only, `strata_risks_write` strategy_office/vmo_validator/data_steward+admin).
- **Console:** clean during create/edit.

## STRATA-E2E-007 — Date-picker placeholder (Medium)
- **Routes:** New cycle · New project card · New milestone (any STRATA date field)
- **Acceptance:** an empty optional date field shows **"Select date"** — never `2/18/1993`.
- **Persistence / behaviour:** opening the calendar still lands on the current month; selecting a
  date stores ISO and displays it; clearing returns to "Select date".
- **Regression:** a field pre-filled with an existing date still shows that date (edit modals).
- **Console:** clean.

## STRATA-E2E-008 — Theme-under-Theme hierarchy (High)
- **Route:** `/strata/strategy` (FY2026 and all cycles)
- **Acceptance:** every **Theme is root-level**; no Theme nests under another Theme. Previously-
  nested themes (B2B Growth Engine, Network Excellence, Investor Journey Transformation,
  Investment Operations Excellence, Enterprise Expansion Play) now appear at root.
- **Persistence:** reload → still flat (data repair, not view state).
- **Cross-module / propagation (must check):** the objectives that lived under those sub-themes
  stay attached to them (objective trees intact); Scorecards / KPI roll-ups that walk the hierarchy
  still resolve. Confirm no orphaned objective and no double-count after flattening.
- **DB probe:** `SELECT count(*) FROM strata_strategy_elements WHERE element_type='theme' AND parent_id IS NOT NULL` → **0**.
- **Note:** objective-under-objective nesting is **intentional** (the model supports objective
  trees; the 003 link flow creates child objectives) — do NOT flag it as a recurrence of 008.

## STRATA-E2E-009 — Console warnings (Medium)
- **Route:** any STRATA route; watch DevTools console through a full load.
- **Acceptance:** **no** `Route path "/planhub*"` warning; **no** `Unknown token id … font.size.100/050`
  warning; **no** `FeatureGateClients … 5.8.0` version-skew warning.
- **Regression:** `[RouteCheck] ✅ 448 route modules loaded cleanly` still prints; navigation to
  `/planhub` (deprecated) still redirects to `/tasks/overview`.
- **Known residual (not a fail):** one benign `FeatureGateClients … version undefined` line
  (same-package sub-registration), plus library-level `@atlaskit` defaultProps / legacy-context and
  a Recharts sizing warning — none are app-code defects.

---

## Cross-cutting regression sweep (run after per-defect passes)
- [ ] FY2026 (the real cycle) end-to-end still works: Strategy Room, Project Cards list + a card
  detail, Scorecards — no blank panels, no console errors.
- [ ] Create → reload → value persists for each new entity (card, milestone, dependency, risk,
  blocker, objective).
- [ ] Role matrix: repeat 003 and 006 as strategy_office, vmo_validator, data_steward, and a
  read-only role; confirm buttons + RPC outcomes match the gate.
- [ ] No new migration drift: staging `schema_migrations` has exactly
  `20260711182113`, `20260711182358`, `20260711183318` for this work, each with a committed file.
