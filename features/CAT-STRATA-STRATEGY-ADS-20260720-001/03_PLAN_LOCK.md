# PLAN LOCK — CAT-STRATA-STRATEGY-ADS-20260720-001

**Status:** DRAFT — **PENDING APPROVAL**
**Approved by:** _(awaiting Vikram)_
**Timebox:** ≤2 hours per slice (decomposed below)
**Baseline:** branch `strata/kpi-operating-model` @ `51bb51bc4`
**Proposed branch:** `strata/strategy-ads-remediation` (cut from baseline) — confirm at approval

> **NO CODE until this Plan Lock is approved AND decision D1 is ruled (see `09_DECISIONS.md`).**
> **PAGE-LOCAL ONLY. ZERO REGRESSION. NO SHARED-COMPONENT EDITS.**

---

## OBJECTIVE

Fix the ADS-compliance findings of the STRATA Strategy Room that can be corrected **inside the page file
alone**, delegating labels, view navigation, empty state, spacing, and same-plane containment to ADS
canonicals — with **zero regression** to data, queries, permissions, filters, authoring, JiraTable, and the
responsive rail/drawer — and **without editing any shared component, the shell, the ADS wrapper layer, global
CSS, or the protected map route**. Findings that require shared-component edits are DEFERRED and raised for a
separate decision.

---

## SCOPE LEDGER (audit finding → disposition)

| DI | Finding | Disposition | Work package | Blocked? |
|----|---------|-------------|--------------|----------|
| DI-01 | Uppercase readiness labels/badges | **IN SCOPE** (page-local) | WP-A | no |
| DI-07 | TypeChip 5px gap | **IN SCOPE** (page-local) | WP-B | no |
| DI-06 | Custom inspector empty state | **IN SCOPE** (page-local) | WP-C | no |
| DI-08 | Excessive containment | **IN SCOPE, page-local only** | WP-D | no (shared residual reported) |
| DI-03 | Hand-rolled tabs | **IN SCOPE** (page-local) | WP-E | no |
| DI-02 | Lozenge parity / casing | **CONDITIONAL, page-scoped** | WP-H | **YES — D1** |
| DI-04 | Custom dropdown trigger (`StrataChipMenu`) | **DEFERRED — shared component** | — | out of scope |
| DI-05 | Section count badge (`StrataPanel`) | **DEFERRED — shared component** | — | out of scope |

---

## NON-SCOPE (explicit)

- **DI-04 & DI-05 are OUT OF SCOPE.** They live in `components/shared.tsx` (`StrataChipMenu`, `StrataPanel`),
  consumed by ~26–30 STRATA pages. Editing them to fix this one page would risk regressing every sibling.
  They are recorded in `09_DECISIONS.md` (D2, D3) for a separate, explicitly-authorized shared-component
  feature. Not touched here.
- **DI-08 shared residual.** The hierarchy panel's own border + raised shadow is `StrataPanel`-owned. WP-D
  reduces only the surrounding page-local containment; the panel's elevation is left as-is and reported.
- No data/query/permission/filter/authoring/table/routing behavior changes.
- No new route params, no `routes.ts` change, no new hooks, no migration, no DB access.

---

## CANONICAL COMPONENTS SELECTED

| Component | File / import | Why |
|---|---|---|
| `@atlaskit/tabs` (`Tabs`,`TabList`,`Tab`) | `@atlaskit/tabs` | Canonical view switcher; precedent `DatabaseSurface.tsx:762-784` |
| ADS `EmptyState` (`size="compact"`) | `@/components/ads` (already imported) | Purpose-built compact variant for rail nesting (`EmptyState.tsx:64-132`) |
| ADS `Button` (`appearance="subtle"`) | `@/components/ads` (already imported) | Navigational Map action, button role (not a tab) |
| ADS spacing token `var(--ds-space-050)` | CSS var | 4px on-grid replacement for `5px` |
| ADS text/surface/elevation tokens | `var(--ds-*)` / `T.*` (page-local reads of the shared `T` map — read-only, no edit) | DI-01/DI-08 |

Note: `T` (from `shared.tsx`) is **read** as a token alias only; `shared.tsx` is **not modified**.

---

## FILES TO MODIFY

| File | Change type | Change summary |
|---|---|---|
| `src/modules/strata/pages/StrataStrategyRoomPage.tsx` | edit | WP-A/B/C/D/E (+WP-H if D1 unblocks) — all page-local |
| `src/modules/strata/__tests__/strata-strategy-ads.test.tsx` | add | Page-local RTL/DOM tests for each WP |

**No other file may change.**

---

## FILES FORBIDDEN (must NOT be touched)

- `src/modules/strata/components/shared.tsx` (StrataChipMenu, StrataPanel, StrataPageShell, T)
- `src/components/ads/*` (Lozenge, DropdownMenu, EmptyState, Button, Tabs — the wrapper layer)
- `src/index.css` and any global stylesheet
- `src/components/layout/*`, `ProjectPageHeader`, CatalystShell / HubSurface (the shell)
- The protected map route implementation (`/strata/strategy/map` and its component/module)
- `src/lib/routes.ts`
- Any other STRATA page or any other module

---

## WORK PACKAGES (each ≤2h, one file, screenshot-signed, committed separately)

### WP-A — Sentence-case readiness labels & badges (DI-01)
- `readiness` memo (389–405): the four `label` strings → sentence case.
- `ReadinessBand` (261): badge `` `${gaps} GAP${…}` `` → `` `${gaps} gap${…}` ``; `'DRAFT'` → `'Draft'`.
- `ReadinessBand` (265): remove `letterSpacing:'0.04em'`; keep `--ds-font-size-050`/weight.
- These are plain spans → **visibly** resolves DI-01. Makes **no** claim about lozenge casing.
- **Acceptance:** live sentence case; `text-transform:none` retained; readiness math unchanged.

### WP-B — TypeChip spacing token (DI-07)
- `TypeChip` (65): `gap: 5` → `gap: 'var(--ds-space-050)'` (4px; verify vs 8px on both chip types).
- **Acceptance:** computed gap = token, not `5px`; Theme + Objective chips no truncation/reflow.

### WP-C — Inspector empty state (DI-06)
- `inspectorBody` no-selection branch (708–713): return
  `<EmptyState size="compact" header="No element selected" description="Select an element in the hierarchy to inspect its chain and coverage." />`.
- **No `primaryAction`** (D3-prior: row-click is the truthful recovery path).
- Rail (1014–1021) and drawer (1024–1037) mounts unchanged — inner content only.
- **Acceptance:** compact EmptyState in both rail (≥1280) and drawer (<1280); select→detail→Esc-deselect cycle intact; no CTA present.

### WP-D — Page-local containment pass (DI-08, page-local only)
- `ReadinessBand` container (252–258): drop redundant outer `border`+`raised` where it abuts panels (retain internal dividers/whitespace).
- Inspector rail container (1017): reconcile doubled `border`+`boxShadow` to a single containment cue.
- **`StrataPanel` NOT touched.** Residual hierarchy-panel elevation reported (see SELECTOR_MAP #8 note).
- **Acceptance:** no two adjacent page-local containers stack full border+shadow on the same plane; hierarchy↔inspector separation preserved; no layout shift.

### WP-E — View switcher to ADS Tabs + navigational Map (DI-03)
- Replace `ViewToggle` (284–300) and call site (917–922):
  - `<Tabs id="strata-strategy-view" selected={viewMode==='narrative'?1:0} onChange={i => setViewMode(i===1?'narrative':'structure')}>`
    `<TabList aria-label="Strategy Room view"><Tab>Structure</Tab><Tab>Narrative</Tab></TabList></Tabs>`.
  - **Map** = adjacent `<Button appearance="subtle" aria-label="Open strategy map" onClick={() => navigate(Routes.strata.strategyMap())}>Map</Button>`, separated by an 8px gap + thin `var(--ds-border)` divider → reads as an action, **not** a 4th tab.
  - **Accessible naming:** TabList `aria-label="Strategy Room view"` scopes the set to Structure/Narrative only; Map has button role → not announced as a tab.
  - **Return behavior:** Map navigates to the protected route; return (back / map's own nav) re-mounts this page.
  - **URL state (decision DI-E1, resolved):** `viewMode` stays **local component state** (no URL param) — **identical to current behavior**; return resets to Structure default. No routing regression. URL-persisted view is a noted future option, not adopted.
- **Acceptance:** in-page Structure/Narrative switch; Atlaskit-owned selected + keyboard (Arrow/Home/End) + focus ring; Map navigates and is absent from the tab set; `viewMode` machine unchanged.

### WP-H — DI-02 lozenge casing (CONDITIONAL — blocked on D1)
- Only if D1 authorizes a **page-scoped** sentence-case exception. Then (page-local only):
  wrap affected lozenges (657/658/675/761–762) in `data-cp-lozenge-jira-parity` under a
  Strategy-Room-scoped container; add a page-scoped `<style>` (idiom per `shared.tsx:509`) re-enabling
  `text-transform:none`; change `gapOf` (531–536) content to `No measures`/`No owner` and reconcile the
  attention line (737). **No** edit to `components/ads/Lozenge.tsx` or global CSS.
- **Acceptance:** Strategy Room lozenges sentence case with parity ancestor (SELECTOR_MAP #2 flips);
  **sibling lozenges outside the scope render byte-identically** (proven by test); global Lozenge untouched.

---

## UI/UX RULES

- ADS tokens only (`var(--ds-*)` / `token()`); introduce **no** raw color (audit already PASSes color 3/3).
- No hand-rolled UI; use `@atlaskit/tabs`, ADS `EmptyState`, ADS `Button`.
- Spacing on 4/8/16/24/32 grid only (kills the `5px`).
- Sentence-case labels (source strings; DI-02 casing transform is D1-gated).
- Verify light **and** dark by reload-into-dark.

---

## DATA/BACKEND RULES

- **No DB access, no migration, no RLS impact, no query change.** UI-only.
- No assumption defaults; zero-assumption rendering unchanged (readiness/gap logic untouched).
- Route builders reused as-is (`Routes.strata.strategyMap` / `strategyElement`); `routes.ts` not modified.

---

## INTEGRATION/WIRING RULES

- React Query hooks: unchanged (all existing `useStrata*` hooks stay as-is).
- No new hooks, no edge functions.
- Component interface contracts unchanged; `StrataChipMenu`/`StrataPanel` consumed exactly as today (props identical).

---

## PARALLEL EXECUTION PLAN

- **Discovery/critique:** completed in planning (see `02_CANONICAL_DISCOVERY.md`; audit Brief v3.0 is the UI/UX critique of record).
- **Execution order:** WP-A → WP-B → WP-C → WP-D → WP-E, then WP-H (only if D1 unblocks). Each its own commit.
- **Validation:** QA/Screenshot per slice; full suite + gates before each commit.

---

## SCREENSHOT CHECKLIST

- [ ] Reference (red baseline, 8 selectors annotated) — 1280 light + dark
- [ ] After each slice: red→green annotated re-run at same viewport
- [ ] Dark mode
- [ ] Inspector empty state (rail ≥1280 AND drawer <1280)
- [ ] Empty / no-match / gaps-only states
- [ ] Theme + Objective TypeChips
- [ ] 1024 / 1280 / wide
- [ ] Adjacent-UI regression check (readiness band, JiraTable, filters, authoring menus unchanged)

(Full detail in `10_SCREENSHOT_CHECKLIST.md`.)

---

## VALIDATION COMMANDS

```bash
# Type/lint/gates (run before every styled commit)
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm test  # sequential; Node 22 required
npm run lint:colors:changed:ci
npm run audit:ads:gate
npm run build

# Selector re-run: authenticated Chrome MCP against 127.0.0.1:8081/strata/strategy
# (confirm the 8081 server cwd via lsof first — foreign-checkout hazard)
```

---

## 8-SELECTOR RED→GREEN (from SELECTOR_MAP.md — rerun exactly; document any old→new)

| # | Selector | Green via | After-fix validity |
|---|----------|-----------|--------------------|
| 1 | `[data-testid="strata-direction-readiness"] > div:first-child > div:first-child` | WP-A | stays valid; proof flips |
| 2 | `…[role="row"]:first-child [role="gridcell"]:first-child span:last-of-type` | WP-H (D1) | stays valid; **blocked until D1** |
| 3 | `[role="tablist"][aria-label="Strategy Room view"]` | WP-E | stays valid (aria-label preserved on new TabList) |
| 4 | `button[aria-label="Filter by type"]` | **DEFERRED (DI-04)** | unchanged — shared component not touched |
| 5 | `[data-testid="strata-hierarchy-panel"] > div:first-child > span:nth-of-type(2)` | **DEFERRED (DI-05)** | unchanged — shared component not touched |
| 6 | `[data-testid="strata-inspector-rail"] > div` | WP-C | verify direct-child depth; document if EmptyState adds a wrapper |
| 7 | `…span[style*="gap: 5px"]` | WP-B | invalidates by design → new `span[style*="var(--ds-space-050)"]` (reason: token replaces 5px) |
| 8 | `[data-testid="strata-hierarchy-panel"]` | WP-D (partial) | page-local green; **hierarchy-panel border+shadow residual is a shared `StrataPanel` dependency — reported, not fixed** |

Selectors 4 and 5 stay RED by design (deferred). This is reported honestly, not substituted.

---

## STOP CONDITIONS (RED FLAG)

Stop and raise a RED FLAG if:
- Any fix appears to need a change outside `StrataStrategyRoomPage.tsx` (+ its test) → it is out of scope.
- Any shared component, shell, ADS wrapper, global CSS, or the map route would have to change.
- Any adjacent-UI regression is detected (filters, authoring menus, table, rail/drawer, sibling pages).
- A slice exceeds 2 hours, or a canonical component doesn't fit (needs unsuitability proof).

```
RED FLAG:
1. What might regress / block
2. Why
3. Evidence
4. Safer option
5. Decision needed from Vikram
```

---

## DRIFT/REBASELINE RULES

If superseded mid-slice: stop → log in `08_DRIFT_LOG.md` → get rebaseline approval →
set this file SUPERSEDED → write a new Plan Lock.

---

## COMMIT GATE (per slice)

Feature ID confirmed · session log written · this Plan Lock approved · D1 ruled (for WP-H) ·
raw validation output pasted · screenshot acceptance · guardrails confirmed (no banned colors, no
hand-rolled UI, no shared edits) · exact file list = the two files above · commit message approved ·
explicit files staged (never `git add -A`/`.`).
