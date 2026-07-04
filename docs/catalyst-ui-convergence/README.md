# UI Convergence Discovery — Complete Repository

**Discovery completion date:** 2026-07-03  
**Total gaps discovered:** 312 (P0=21, P1=118, P2=173)  
**Model:** 10-agent evidence-based discovery, no implementation  

---

## Quick Navigation

### START HERE
- **[HANDOVER.md](HANDOVER.md)** — Complete handover for execution phase (decision log, phased plan, approval checklist)
- **[COPY_PASTE_NEXT_SESSION.txt](COPY_PASTE_NEXT_SESSION.txt)** — Ready-to-paste block for next Claude Code session
- **[00-DISCOVERY-CONSOLIDATED.md](00-DISCOVERY-CONSOLIDATED.md)** — Executive summary (scorecard, decision log, plan overview)

### SPECIALIST AGENT REPORTS (read in order)
All located in [`agents/`](agents/) folder:

| # | Agent | Report | Focus | Lines |
|---|---|---|---|---|
| 01 | Route Discovery | [01-route-discovery-agent.md](agents/01-route-discovery-agent.md) | ~120 routes across 4 hubs; ~10 broken/dupe/dead | 246 |
| 02 | Project Hub Canonical | [02-project-hub-canonical-agent.md](agents/02-project-hub-canonical-agent.md) | Canonical component registry (source of truth) | 224 |
| 03 | Destination Hub Inventory | [03-destination-hub-agent.md](agents/03-destination-hub-agent.md) | Per-hub surface inventory + 41 gaps | 223 |
| 04 | DOM Probe | [04-dom-probe-agent.md](agents/04-dom-probe-agent.md) | Live structure + row-height/testid deltas | 181 |
| 05 | CSS/Token Probe | [05-css-token-probe-agent.md](agents/05-css-token-probe-agent.md) | Computed-style mismatches (raw colors, deltas) | 152 |
| 06 | Chrome Interaction | [06-chrome-mcp-interaction-agent.md](agents/06-chrome-mcp-interaction-agent.md) | Dead interactions, forks, live bugs | 129 |
| 07 | Component Mapping | [07-component-mapping-agent.md](agents/07-component-mapping-agent.md) | 57 mappings + ~45-file delete list | 230 |
| 08 | A11y/Z-index | [08-accessibility-zindex-agent.md](agents/08-accessibility-zindex-agent.md) | A11y defects (aria-modal=false, focus traps) | 121 |
| 09 | ADS Rule Engine | [09-ads-rule-engine-agent.md](agents/09-ads-rule-engine-agent.md) | 952 Tailwind utils, 253 rgb, 36 raw tables | 168 |
| 10 | Evidence Consolidation | [10-evidence-consolidation-agent.md](agents/10-evidence-consolidation-agent.md) | 312-gap inventory, route table, scorecard, plan | 731 |

---

## Gap Summary by Hub

### Release Hub (118 gaps) — **D grade**
**Top 3 worst files:**
1. `src/pages/releases/DefectDetailPage.tsx` — 130 ADS violations
2. `src/features/all-releases/components/ReleaseCard.tsx` — 47
3. `src/features/all-releases/components/EnterpriseTableView.tsx` — 46

**Key issues:**
- 6 local pill components (HealthPill×2, RiskPill×2, StatusPill, ResultBadge) → consolidate on StatusLozenge
- Raw table structure (role=null, 52-66px rows vs 39px canon, no testids)
- Bespoke ReleaseDetailPage (8-tab, 314L) — duplicate detail surface
- Token violations (raw #6B6E76 subtle text, #E0E0E0 borders, 732 Tailwind color utils)
- Hand-rolled CommandCenterPage dashboard, modals, avatars

**Quick win:** Delete `src/pages/releases/*` (12 files) + dead-gen feature folders → frees 7 of top-20 ADS files.

### Test Hub (58 gaps) — **C+ grade**
**Key issues:**
- Raw &lt;table&gt; elements (CycleDetailPage:424, SetDetailPage:600/663) → replace with JiraTable
- Detail split (CaseDrawer in MyWork/Board vs CatalystDetailRouter in Repository) → unify
- Dead interactions (defect row click inert, mywork row-click bounces to UUID-param `?case=`)
- Modals with unlabeled native &lt;select&gt; (CreateCycleModal, AddCasesModal)
- Raw #E0E0E0 borders on 6 surfaces

**Live bug:** `/testhub/board` crashes — column `tm_test_cases.key` does not exist (stale query).

### Incident Hub (74 gaps) — **B grade** (strongest new-gen)
**Key issues:**
- Incident create fork (shadcn NewIncidentModal vs canonical CreateStoryModal)
  - Writes `incidents` table (new) vs `ph_issues` (canonical) → data-model split
  - aria-modal=null (keyboard-trap failure), not scroll-locked
- Legacy `/release/incidents/*` stack (10 routed surfaces) still live + nav-reachable
  - OperationsSidebar + 2 ItemsDropdowns point to legacy incident UI
  - Full retirement needed (routes + nav rewire)
- Systemic `aria-modal=false` un-dismissable panel (detail panels on new-gen too)
- New-gen surfaces (all-incidents, dashboard, board) already canonical → solid foundation

### Defects (17 gaps) — **C live / F dead**
**Live (5):** defect list, CreateStoryModal isDefect branch, canonical structure
**Dead (12):** `src/pages/releases/*` defect surfaces, DefectsPage 657L, DefectDetailPage 1,052L with 18 bare Tailwind colors

### Project Hub baseline (28 gaps)
- Bare hex in details (StoryDetailPage, IssueDetailPage, wizard, phStyles.css)
- BacklogTable fork (shares types but maintains separate impl)

### Cross-hub / A11y (17 gaps) — **critical**
- aria-modal=false un-dismissable panel (affects multiple detail views)
- Focus-trap failures (NewIncidentModal, unlabeled controls in modals)
- JiraTable grid ARIA incomplete (no row/cell roles, no keyboard nav)

---

## Blocking Decision Log (Requires Vikram Approval)

| ID | Decision | Blocking? | Recommendation |
|---|---|---|---|
| **DL-1** | Incident data model: converge `incidents` → `ph_issues` | YES | Converge (eliminates fork, unifies create) |
| **DL-2** | Legacy `/release/incidents/*` stack: delete or freeze | YES | Delete (10 files, full retirement, nav rewire) |
| **DL-4** | Test-case detail: unify CaseDrawer → CatalystDetailRouter | YES | Unify (MyWork/Board detail is dead) |
| **DL-5** | Wire `/testhub/defects/:key` detail (currently inert) | YES | Wire it (blocked detail view) |
| **DL-7** | Fix systemic `aria-modal=false` (keyboard trap) | YES | Retrofit (a11y defect) |
| DL-3 | Which ReleaseDetailPage wins | PARTIAL | Consolidate, retire bespoke |
| DL-6 | StepEditor parity in CatalystViewTestCase | PARTIAL | Verify post-TestHub-canon |
| DL-8 | Color-scanner vs CLAUDE.md hex-fallback | NO (technical) | Ban fallbacks, update scanner |
| DL-9 | Route gating (ModuleGuard on TestHub/ProjectHub) | NO (aspirational) | Leave ungated for MVP |

---

## Execution Phases (Phased plan in HANDOVER.md)

### Phase P0: Correctness + A11y (6 slices, ~12 hours)
Fixes critical bugs, a11y defects, broken interactions.
- Defect detail wiring
- Test-case detail unification
- aria-modal fix (systemic)
- testhub/board crash fix
- Incident create unification
- Legacy incident retirement + nav rewire

### Phase P1: Dead code + Structural (8 slices, ~16 hours)
Deletion (frees 7 top-20 ADS files), tables, pills, avatars, modals.
- Delete `src/pages/releases/*`, dead-gen features
- Delete `src/components/releases/defects/*`
- Raw tables → JiraTable (Cycles, Sets)
- Pills consolidation (6 pill types → StatusLozenge)
- Avatars → CatalystAvatar
- Modals → @atlaskit/modal + labeled controls
- ReleaseDetailPage consolidation
- Dashboard canonicalization

### Phase P2: Token cleanup (6 slices, ~12 hours)
Final polish, dark-mode reactive.
- Borders (#E0E0E0 → --ds-border)
- Subtle text (#6B6E76 → --ds-text-subtle)
- Tailwind color utils → --ds-* tokens (per hub)
- Bare hex bases (Project Hub)

---

## Key Notes for Execution

**RTK + Caveman mode:** activate early (see COPY_PASTE_NEXT_SESSION.txt)

**Parallel execution strategy:**
- P0 slices 1-6 can run in **parallel** (no file conflicts)
- P1 slices 1-2 (delete) must run **sequentially** (both touch same dirs)
- P1 slices 3-8 can run after deletion (no conflicts)
- P2 slices 1-6 can all run in **parallel** (token-only edits)

**ADS ratchet baselines** must be downraced after deletion:
```bash
npm run lint:colors:gate --update
npm run audit:ads:gate --update
```

**Screenshot limitation:** all evidence is ID-only (Chrome MCP host-FS issue). If visuals needed for PR, re-capture from localhost:8080.

---

## Related Docs

- **Repo CLAUDE.md:** `/Users/vikramindla/Documents/GitHub/catalyst-prod-45/CLAUDE.md` (baseline rules, color law, canonical components, commit gate)
- **Catalyst feature OS:** `docs/ways-of-working/CATALYST_OPERATING_SYSTEM.md`
- **Parallel agents guide:** `docs/ways-of-working/CATALYST_PARALLEL_AGENTS.md`

---

## Session Count & Token Usage

**Discovery phase:** 10 agents, 9 reports, ~1.5M tokens (mixed Fable/Opus/Haiku)

**Execution phase (projected):** 18+ parallel/sequential agents across P0/P1/P2, estimated 2-3M tokens (depends on agent model + slice complexity)

---

**End of README. Start with HANDOVER.md for execution guidance.**
