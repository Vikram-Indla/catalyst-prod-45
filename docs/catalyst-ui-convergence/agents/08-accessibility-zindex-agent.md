# Agent 08 — Accessibility / Z-Index / Overlay Agent (LIVE DOM/CSS PROBE)

**Pass type:** LIVE BROWSER (Chrome MCP, real clicks + `javascript_tool` computed-style/focus/ARIA probes on http://localhost:8080, project BAU, dark mode)
**Date:** 2026-07-03
**Repo:** catalyst-prod-45 @ main (7437425c8)
**Inputs verified live:** Agent 06 (interaction click-through) — reused its modal/drawer/table map
**Feeds:** Agent 10 (consolidation)

---

## 1. Scope covered

Probed accessibility (focus, ARIA, keyboard), overlay stacking, and z-index across canonical vs destination surfaces:

1. Modal focus-trap / Escape / scroll-lock: canonical **CreateStoryModal** (@atlaskit) vs shadcn/Radix **NewIncidentModal** vs **CreateCycleModal** (atlaskit shell + native form controls) vs TestHub **CatalystViewTestCase** in-place detail.
2. Dropdown / popover positioning + z-index: canonical status-lozenge transition menu (backlog), releases "More actions" menu, native `<select>` inside CreateCycleModal.
3. Z-index stacking audit (fixed/absolute/sticky, z>100) with a modal open on 1 canonical + 2 destination pages.
4. Keyboard / grid semantics: canonical JiraTable (backlog) vs destination raw `<table>` (releases-management) vs TestHub repository table.
5. The **sticky BAU-4771 dialog** on `/project-hub/BAU/allwork` — root-caused as a `role=dialog aria-modal=false` non-dismissable in-place panel (shared component).
6. Narrow viewport (~800px) — attempted via `resize_window`; **viewport did not actually change** in this env, recorded as not-reliably-testable.
7. 0,0 / clipped-menu watch across all opened popovers.

## 2. Files inspected (inferred from live DOM/behavior; not code-read this pass)

- Canonical modal shell: `@atlaskit/modal-dialog` (CreateStoryModal, CreateCycleModal) — `aria-modal=true`, blanket z=500 / container z=510, focus-trap + scroll-lock present.
- Shadcn/Radix modal: `src/pages/incidenthub/components/NewIncidentModal.tsx` (per Agent 06) — Radix `Dialog` with `bg-black/75 dark:bg-black/80` Tailwind blanket.
- In-place detail panel (shared): `CatalystDetailRouter` / `CatalystViewTestCase` / work-item detail — emits `role=dialog aria-modal=false`, position:relative, z:auto, no dismiss button. Same component powers BAU-4771 on `/allwork` and TC-002 on `/testhub/repository`.
- Global floating assistant: `.cc-fab` button, `position:fixed; z-index:600`.

## 3. Routes inspected (live)

`/project-hub/BAU/backlog` (canonical JiraTable + CreateStoryModal + status-lozenge menu), `/project-hub/BAU/allwork` (BAU-4771 sticky panel), `/incident-hub/dashboard` (NewIncidentModal), `/testhub/cycles` (CreateCycleModal), `/testhub/repository` (CatalystViewTestCase in-place detail), `/release-hub/releases-management` (raw-table + More-actions menu).

## 4. Screenshots captured (Chrome MCP; reference by ID)

| ID | Route | What it shows |
|---|---|---|
| ss_6977qen9x | /backlog | Canonical CreateStoryModal open (aria-modal baseline) |
| ss_9968ljm8c | /incident-hub/dashboard | shadcn NewIncidentModal (SEV buttons, hand-rolled colors) — saved to disk |
| ss_5857008rp | /testhub/cycles | CreateCycleModal — atlaskit shell + native selects + native date inputs |
| ss_64831dgj5 | /allwork | BAU-4771 in-place detail panel (role=dialog, no close btn) — saved to disk |
| ss_468990aod | /backlog | Canonical status-lozenge transition menu (well-positioned, z=9999) |
| ss_06771oim6 | /releases-management | "More actions" menu (well-positioned, z=10001) |
| ss_1488k7frp | /testhub/repository | CatalystViewTestCase in-place detail (same non-modal-dialog pattern) |
| ss_4121r7gr0 | /releases-management | Raw `<table role=null>` releases list (no grid semantics) |

## 5. Findings count

- Surfaces probed: **6** (2 canonical modals, 1 shadcn modal, 1 mixed modal, 2 in-place "dialogs", 3 tables, 3 popovers)
- Confirmed a11y/overlay DEFECTS: **6** (2 high, 3 medium, 1 low)
- Canonical-clean baselines confirmed: **3** (CreateStoryModal focus/scroll/Escape; status-lozenge menu; releases More-actions menu)
- Not-testable (env limit): **1** (narrow-viewport resize)

## 6. High-risk findings

### HR-1 — shadcn/Radix NewIncidentModal: no `aria-modal`, focus never enters dialog, **Escape does not close**. `/incident-hub/*` global Create
Deterministic on a clean open (re-verified 2×):
- `role=dialog` present but **`aria-modal` = null** (canonical = `true`).
- **Focus stays on the "Create" trigger button** on open (`activeElInsideDialog:false`, ae = `BUTTON Create`); Tab does not move focus into the dialog.
- Because focus never enters the Radix dialog, its Escape key handler is never armed — **`dialogClosedByEsc:false`**. A keyboard-only user cannot dismiss this modal.
- Overlay + dialog **share z-index 250** (`fixed inset-0 z-[250] bg-black/75` blanket AND `z-[250]` dialog) — stacking relies on DOM order, brittle.
- ADS violation: blanket uses Tailwind color util `bg-black/75 dark:bg-black/80`; SEV buttons hand-rolled colors (SEV-1 red text, SEV-3 blue fill) — confirms Agent 06 HR-4.
- Scroll-lock IS present (`data-scroll-locked=1`, body overflow hidden) — the one thing Radix got right.
Evidence: ss_9968ljm8c. **vs** canonical CreateStoryModal which passes all four (aria-modal=true, focus INPUT inside dialog, Escape closes + restores `overflow:visible`, blanket/container z 500/510).

### HR-2 — In-place detail "dialog" is non-dismissable (shared component). `/allwork` (BAU-4771) AND `/testhub/repository` (TC-002)
Both surfaces render the same `CatalystDetailRouter` in-place panel with `role=dialog` **`aria-modal="false"`**, `position:relative`, `z-index:auto`, no blanket, no scroll-lock, and focus NOT moved into it. The panel exposes prev/next, Copy link, More actions, Open-in-full-page, Edit — but **no Close/Back/dismiss button** (`anyCloseOrBack:false` on both). Consequences:
- On `/allwork` the detail pane is auto-selected on load and **survives Escape** (`dialogSurvivesEscape:true`) and in-panel clicks (a click into the body focuses the description RTE, not a dismiss). Only a full sidebar route-change clears it (`dialogAfterNav:false`) — so "survives navigation" is really "survives everything except leaving the route."
- A `role=dialog` with no dismiss affordance and `aria-modal=false` is an ADS/WCAG mismatch: assistive tech announces "dialog" but there is no modal semantics and no documented way to close it. This is the true nature of the reported "sticky BAU-4771" bug — not a stuck overlay, but a **mislabeled, un-dismissable inline panel**, and it is systemic (repeats on every CatalystDetailRouter in-place surface).
Evidence: ss_64831dgj5 (BAU-4771), ss_1488k7frp (TC-002).

## 7. Medium / low findings

### M-1 — CreateCycleModal: native `<select>` and native date inputs with no accessible labels. `/testhub/cycles`
Modal shell is correct canonical @atlaskit (`aria-modal=true`, focus trapped in INPUT, scroll-lock, Escape-capable). But inside it: 2 native `<select>` (Sprint 1 opt, Owner 62 opts) and 2 native `<input type=date>` (`dd/mm/yyyy`), each with **`aria-label=null`, `id=""`, no `aria-labelledby`, no associated `<label for>`** — screen readers announce them unlabeled. Non-ADS hand-rolled controls inside an otherwise-canonical modal. Evidence: ss_5857008rp.

### M-2 — Incomplete ARIA-grid on the canonical JiraTable. `/backlog`
A `role="grid"` container exists but has **no `role=row`, no `role=gridcell`, no `role=columnheader`, no `aria-label`, no `tabindex`** on the grid, and BAU keys are `<span role="button">` (not links). So AT entering the grid finds no rows/cells to navigate. The TestHub repository table renders BOTH a raw `<table>` and a `role=grid` (`rawTables:1, ariaGrids:1, roleRows:0`) — double/partial semantics. Still the best of the tables, but grid role is a shell without grid children.

### M-3 — Destination raw table has zero grid semantics + no keyboard row nav. `/release-hub/releases-management`
`rawTables:1, ariaGrids:0, roleNullTables:1`; rows have **no `tabindex`, no `role`** — not arrow/Enter navigable as a grid; only the release-name link inside each row is Tab-reachable. Contrasts with the canonical JiraTable's (partial) grid role. No j/k/Enter/Esc row navigation on either canonical or destination tables (canonical grid lacks focusable rows; destination lacks any).

### L-1 — Global `.cc-fab` (assistant button) paints above modal layers. all pages
`.cc-fab` is `position:fixed; z-index:600`, above the atlaskit modal blanket (z=500) and container (z=510). `elementFromPoint` at the FAB center returns the FAB as topmost even with a modal open. In practice the FAB sits bottom-right and centered modals rarely reach it, so impact is low — but a modal that extends into the bottom-right corner (or a full-screen modal) would have the FAB punch through the blanket and steal clicks/focus. Portal-root z-index inconsistency worth normalizing.

## 8. A11y / overlay findings table

| Surface | Test | Canonical behavior | Destination behavior | Verdict | Severity |
|---|---|---|---|---|---|
| CreateStoryModal (backlog) | aria-modal / focus-trap / Escape / scroll-lock | `aria-modal=true`, focus INPUT inside, Escape closes + restores overflow, blanket/container z 500/510 | — | PASS (baseline) | — |
| NewIncidentModal (incident-hub) | same | (vs canonical) | `aria-modal=null`, focus stays on trigger, **Escape does NOT close**, overlay+dialog both z-250, Tailwind `bg-black/75` | **FAIL** | **High** |
| BAU-4771 panel (/allwork) | dismiss / modal semantics | — | `role=dialog aria-modal=false`, **no close btn**, survives Escape, non-modal, no scroll-lock | **FAIL** | **High** |
| TC-002 detail (/testhub/repository) | dismiss / modal semantics | — | same shared component — `role=dialog aria-modal=false`, no close btn | **FAIL** | **High** (same root cause as BAU-4771) |
| CreateCycleModal (/testhub/cycles) | form-control a11y | (atlaskit shell OK) | native `<select>`×2 + native date×2, all **unlabeled** (no aria-label/id/for) | FAIL (controls) | Medium |
| JiraTable grid (backlog) | grid ARIA / keyboard | `role=grid` shell but **no row/cell/columnheader roles**, keys are span role=button | — | PARTIAL | Medium |
| Releases table (releases-management) | grid ARIA / keyboard | — | raw `<table role=null>`, rows no tabindex/role, no keyboard nav | FAIL | Medium |
| Status-lozenge menu (backlog) | popover position / z | menu at 1141,265, z=9999, not clipped, not 0,0 | — | PASS | — |
| More-actions menu (releases) | popover position / z | — | menu at 1439,269, z=10001, `role=menu`, not clipped | PASS | — |
| `.cc-fab` global | z-index vs modal | z=600 > modal 510; topmost via elementFromPoint | — | RISK | Low |

## 9. Confirmed defects with z-index / focus evidence

- **NewIncidentModal (High):** `{ariaModal:null, focusOnOpenInsideDialog:false, ae:"BUTTON Create", dialogClosedByEsc:false}`; overlay `.fixed.inset-0.z-[250].bg-black/75` + dialog both `z:250`; scroll-lock `data-scroll-locked:1`.
- **BAU-4771 / CatalystDetailRouter panels (High):** `{ariaModal:"false", z:"auto", pos:"relative", bodyOverflow:"visible", anyCloseOrBack:false, dialogSurvivesEscape:true}`; aria-label `"BAU-4771 — work item details"`; identical on `/testhub/repository` TC-002.
- **CreateCycleModal native controls (Medium):** selects `{ariaLabel:null, id:"", name:"", labelledBy:null, isNative:true}` ×2; date inputs `{name:"", ariaLabel:null}` ×2.
- **JiraTable grid (Medium):** `{gridLabel:null, gridTabindex:null, roleRowsInGrid:0, gridcells:0, columnheaders:0, bauKeyTag:"SPAN", bauKeyRole:"button"}`.
- **Releases raw table (Medium):** `{rawTables:1, ariaGrids:0, roleNullTables:1, firstRowTabIndex:null, firstRowRole:null}`.
- **cc-fab (Low):** `{fabZ:"600", fabIsTopmost:true}` vs atlaskit blanket z=500 / container z=510.

## 10. Open questions

1. Should the CatalystDetailRouter in-place panel keep `role=dialog`? If it is intentionally a non-modal inline pane, it should drop `role=dialog`/`aria-modal` and use a region/complementary landmark, OR gain a Close button + Escape handler and become a true modal. Currently it is neither.
2. NewIncidentModal — is this a stale Radix `Dialog` missing `<Dialog.Content>` focus-management props, or should it be replaced wholesale with the canonical @atlaskit CreateStoryModal path (Agent 06 D-recommendation)? The Escape+focus failure is a hard a11y blocker either way.
3. JiraTable: is the `role=grid`-without-children intentional (virtualization emits roles lazily on focus) or a genuine gap? Needs a keyboard-focus probe with a screen reader to disambiguate — MCP synthetic focus could not enter grid rows.
4. Narrow-viewport responsive behavior remains UNTESTED — `resize_window` did not change `window.innerWidth` (stayed 1680) in this environment. Needs a real device-emulation pass.

## 11. Confidence level

**HIGH** for: NewIncidentModal aria-modal/focus/Escape failure (deterministic, re-verified on clean open); BAU-4771 + TC-002 non-dismissable dialog pattern (same DOM signature both routes, close-button scan empty); CreateStoryModal + CreateCycleModal canonical shell PASS; unlabeled native controls in CreateCycleModal; popover positioning PASS on both canonical + destination menus; cc-fab z=600 stacking.
**MEDIUM** for: JiraTable grid-semantics verdict (synthetic focus can't confirm lazy-ARIA vs true gap); keyboard row-nav absence (no j/k handler observed but not exhaustively key-swept).
**NOT TESTED:** narrow-viewport responsive (env resize no-op).
