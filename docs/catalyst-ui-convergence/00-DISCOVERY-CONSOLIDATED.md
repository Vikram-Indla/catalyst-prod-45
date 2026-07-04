# Catalyst UI Convergence — Consolidated Discovery (Executive Artifact)

**Date:** 2026-07-03 · **Repo:** catalyst-prod-45 @ main (7437425c8)
**Method:** 10-agent evidence model — route discovery (code), canonical inventory, destination inventory, DOM probe, CSS/token probe, Chrome-MCP live interaction, component mapping, a11y/z-index probe, ADS rule engine, evidence consolidation.
**Goal:** Converge **Release Hub · Test Hub · Incident Hub · Defect surfaces** onto the **Project Hub** canonical UI.

**Full evidence + 312-gap inventory:** [`agents/10-evidence-consolidation-agent.md`](agents/10-evidence-consolidation-agent.md) (§2 = the atomic inventory; §3 = route coverage; §4 = scorecard; §5 = decision log; §6 = plan).
**Source reports:** [`agents/01`](agents/01-route-discovery-agent.md)–[`09`](agents/09-ads-rule-engine-agent.md).

---

## Headline

- **312 evidence-backed gaps** (floor of 300 met). **21 P0** · 118 P1 · 173 P2.
- **Release Hub is the epicenter** — 17 of the top-20 worst ADS-violation files; Grade **D**.
- **Incident Hub new-gen is strongest** (Grade B) but has a **P0 create split-brain** (writes `incidents`, hub reads `ph_issues`) and a **keyboard-trapped shadcn modal** (Escape can't close).
- **Deleting dead code first removes 7 of the top-20 worst files for free** — do it before converging.
- Two prior claims corrected live: legacy incident dashboard is **not** rendering mock KPIs (downgraded from P0); legacy incident stack **IS** nav-reachable (retirement needs nav rewires).

## Gap count by hub

| Hub | Gaps | P0 | Grade | One-line verdict |
|---|---:|---:|:--:|---|
| Incident Hub (new gen) | 74 | 6 | **B** | Model citizen structurally; create fork + a11y are P0. Includes 21-row legacy-retirement block. |
| Test Hub | 58 | 4 | **C+** | Top tabs canonical; board **crashes**, defect/mywork detail **dead**, cycles/sets hand-rolled. |
| Release Hub | 118 | 1 | **D** | Convergence epicenter — custom table (16px/52px rows), forked dashboard, `RH.*` parallel style system, 732 Tailwind hits. |
| Defect surfaces | 17 | 1 | **C** live / F dead-gen | Live path canonical; row-click detail **dead**; 8 dead-gen defect components (200+ Tailwind hits) → DELETE. |
| Project Hub (baseline) | 28 | 0 | — | Canonical target but not clean: BacklogTable fork, AllProjectsTable raw table, shadcn Sheet, 6 competing pills, baseline hex. |
| Cross-hub / route / a11y | 17 | 1 (systemic) | — | Un-dismissable `aria-modal=false` detail panel; dead imports; scanner-vs-contract disagreement. |
| Legacy `/release/incidents` | (in IH-74) | 4 | **F** | 9 live duplicate routes, nav-reachable — full retirement. |

## Scorecard (detail)

| Hub | Routes | Already-canonical | Gaps | P0 | Token % | Structural verdict | Grade |
|---|---:|---:|---:|---:|---:|---|:--:|
| Incident Hub (new) | 16 | 11 | 74 | 6 | ~85% | Strong thin-mounts; canonical lozenge reused | **B** |
| Test Hub | 24 | 11 | 58 | 4 | ~90% | Good tabs; interior hand-rolled; board crash | **C+** |
| Release Hub | 20 | 7 | 118 | 1 | ~55% | Weak — 17/20 worst ADS files | **D** |
| Defects (live) | 5 | 5 | 17 | 1 | ~95% | Live canonical; detail dead; dead-gen=F | **C** |
| Legacy incidents | 9 | 0 | — | 4 | ~10% | Full divergence — retire | **F** |

## The 21 P0s (must fix first)

1. **TestHub board crash** — `/testhub/board` errors "column tm_test_cases.key does not exist"; no cards render.
2. **Defect row detail DEAD** — `onOpenItem:()=>{}`; 3 live no-ops while CatalystViewDefect exists.
3. **MyWork test-case detail DEAD** — bounces to `repository?case=<UUID>`, no drawer; UUID param violates slug contract.
4. **SetDetailPage:433 stale enum** — queries dropped `tm_cycle_status` values; can 400 live.
5. **Defect "Open in side panel" no-op**.
6-10. **Incident create shadcn fork** — split-brain (`incidents` vs `ph_issues`) + `aria-modal=null` + focus never enters dialog + **Escape does not close** (keyboard trap).
11-15. **Legacy `/release/incidents` stack live + nav-reachable** — OperationsSidebar + 2 ItemsDropdown + GlobalPageHeader link to it.
16. **Systemic un-dismissable detail panel** — CatalystDetailRouter in-place = `role=dialog aria-modal=false`, no Close button (BAU-4771 + TC-002).

Full list with evidence in [10-...md §7](agents/10-evidence-consolidation-agent.md).

## Decision log (needs Vikram before execution)

| # | Question | Recommendation | Blocking? |
|---|---|---|---|
| DL-1 | Incident data model: NewIncidentModal→CreateStoryModal→ph_issues? what reads `incidents`? | (a) ph_issues, grep readers first | **YES** |
| DL-2 | Legacy `/release/incidents` — freeze or delete? (it's nav-reachable) | (a) rewire nav→redirect→delete | **YES** |
| DL-3 | Which ReleaseDetailPage wins — bespoke 8-tab or slug? | (a) slug (contract); prove parity | Partial |
| DL-4 | Test-case detail: CatalystDetailRouter everywhere, CaseDrawer create-only? | (a) yes, verify StepEditor parity | Partial |
| DL-5 | Wire `/testhub/defects/:key` → CatalystViewDefect? | (a) display-key route (no UUID) | **YES** |
| DL-6 | StepEditor parity in CatalystViewTestCase? | probe before DL-4 | Partial |
| DL-7 | Un-dismissable panel: role=region or true modal? | (a) region + Close (systemic) | **YES** (P0 a11y) |
| DL-8 | Color scanner vs CLAUDE.md hex-fallback disagreement | (a) tighten scanner to contract | Partial |
| DL-9 | Route gating: gate testhub/releases, keep project open? | (a) yes, ratify policy | Partial |
| DL-10 | BacklogTable: merge back to JiraTable or permanent fork? | destinations→JiraTable | Partial |
| DL-11 | BoardUuidRedirect: mount or delete? | (a) mount | No |

## Implementation plan (phased, ≤2hr slices, screenshot-gated)

- **Phase 0 — P0 fixes** (behavior-changing): board crash · defect detail wire · systemic dialog a11y · allwork sticky dialog · incident create canon · stale enum. *Do first.*
- **Phase 1 — Dead-code deletion** (safe-additive): `pages/releases/*` + 4 feature dirs + 8 defect components + ReleaseDrawer; dead incidenthub/unrouted pages; 5 dead imports + 4 Finder artifacts. *Removes 7 of top-20 worst files for free.*
- **Phase 2 — Legacy incident retirement** (behavior-changing, ordered): nav rewires → route redirects (+fix broken literal-param redirect) → delete files.
- **Phase 3 — Structural convergence**: pills→StatusLozenge · shadcn modals→@atlaskit · raw tables→JiraTable · release detail consolidation · avatars→CatalystAvatar · dashboards→ProjectDashboardPage + SectionMessage sweep.
- **Phase 4 — Token cleanup** (safe-additive): #E0E0E0 borders → `--ds-border` (6 surfaces, won't dark-react today) · #6B6E76 + `RH.*` parallel style system · Project Hub baseline hex · hooks color-maps + hex fallbacks.
- **Phase 5 — Polish** (safe-additive): route gating · routes.ts builder drift · JiraTable grid ARIA · Release Filters nav wiring.

**ADS ratchet:** move `color-baseline.json` / `audit-baseline.json` DOWN as each slice lands (`ads-color-gate.cjs --update` / `ads-audit-gate.cjs --update`, commit baselines). Baselines only ever move down.

## Screenshot limitation (all browser agents)

Chrome MCP `save_to_disk` writes inside the extension host; `find /` returned 0 files. All screenshot evidence is **ID-only** (in-session capture IDs like `ss_1680v6i2a`). `docs/catalyst-ui-convergence/screenshots/` remains empty pending a host-side re-capture pass.

---

Discovery complete. No implementation has started. Approval required before Activate Feature and execution.
Discovery must be performed through a multi-agent evidence model, with no more than 10 focused agents, including DOM probing, CSS/token probing, Chrome MCP interaction probing, route discovery from code, and screenshot-backed evidence consolidation.
