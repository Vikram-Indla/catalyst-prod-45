# VALIDATION EVIDENCE — CAT-STRATA-STRATEGY-ADS-20260720-001

Worktree `../wt-strategy-ads`, branch `strata/strategy-ads-remediation`, off `51bb51bc4`.

## Automated — DONE (raw results)

| Check | Command | Result |
|---|---|---|
| Page-local tests (5 findings) | `vitest run …/strata-strategy-ads.test.tsx` | **9 passed (9)** |
| Regression — existing page tests | `vitest run srdef001-cycle-dates + cyclecontext.guard + gate-scope.guard + srdef003-004-objective-workspace + strata-strategy-ads` | **5 files, 36 passed (36)** |
| Raw-color scan (touched file) | `grep -E '#hex|rgb|hsl|tailwind' …` | **CLEAN — no raw colors** |
| Zero-tolerance color gate (staged) | `npm run lint:colors:changed` | **✅ clean — no hard-coded colours** |
| Design audit ratchet (increase-only) | `npm run audit:ads:gate` | **✅ no category above baseline** (tokens 19814, typography 1366, spacing 0/0, fontImports 0) |
| Dev-mode module transform | vite `GET /src/modules/strata/pages/StrataStrategyRoomPage.tsx` | **HTTP 200, valid JS, no transform/syntax error** (catches TDZ/runtime import issues) |
| Dev server boot | `npm run dev --port 8087` | **VITE ready; page route serves HTTP 200** |

### Production `npm run build` — environmentally BLOCKED (pre-existing, not this change)
`✗ Build failed`: `"listItemWithFlexibleFirstChildStage0" is not exported by @atlaskit/adf-schema`,
imported by `@atlaskit/editor-plugin-list`. **Proven pre-existing:** the clean baseline (my change
`git stash`ed) fails the build identically (exit 1, same error). This page imports none of the editor
packages. Dependency version mismatch in `node_modules`, independent of this feature.

## Live authenticated visual pass — DONE (2026-07-21, authenticated, localhost:8087)

Signed in by the user (their password manager); Chrome MCP drove the probes. No security bypass.

**Live DOM probes (real authenticated data — cycle FY2026, 8 objectives):**
- DI-01 ✅ selector 1 text `Objectives with measures`, `text-transform:none`; band reads
  `… 2 gaps … Draft elements | 7 | Draft` — all sentence case.
- DI-03 ✅ old `[role=tablist][aria-label=…]` = false; new `[data-testid=strata-strategy-view] [role=tablist]` = true;
  tabs `["Structure","Narrative"]`; Map is a `<button aria-label="Open strategy map">`, NOT in the tablist.
  Narrative tab → narrative panel renders; Structure → hierarchy returns; **Map → navigates to `/strata/strategy/map`** (protected route intact).
- DI-06 ✅ rail shows `role=heading` "No element selected", **0 buttons** (no CTA); selecting a row populates the inspector (Theme chip + Open full page + Close).
- DI-07 ✅ TypeChip inline `gap: var(--ds-space-050)` → **computed 4px**; **no `gap:5px` anywhere** on the page.
- DI-08 ✅ readiness band `background-color: rgba(0,0,0,0)` (de-raised) + border kept; inspector rail `border-width:0` + `box-shadow` raised retained.
- DI-02 ⛔ RED (blocked D1) · DI-04 ⛔ RED (deferred) · DI-05 ⛔ RED (deferred) — all confirmed unchanged.

**Annotated overlay:** all 8 selectors resolved; injected red/green arrows → **5 green (DI-01/03/06/07/08), 3 red (DI-02/04/05)**. Screenshot captured (light).
**Dark mode:** toggled — readiness/tabs/EmptyState/chips render correctly with dark tokens; no regression.
**Zero-regression interactions verified live:** tab switch, row-select→inspector, Map navigation, filters + authoring buttons present and unchanged.

### (superseded) prior PENDING note
Dev server serving THIS code is up at **http://localhost:8087/strata/strategy** (from the worktree).
Chrome MCP red→green requires an authenticated session on that origin. To run it, the user opens/logs in
to `http://localhost:8087/strata/strategy` in their connected Chrome; then the 8-selector pass can run.

### 8-selector procedure vs SELECTOR_MAP.md (to run in the live pass)
| # | Selector | Expected | Status |
|---|----------|----------|--------|
| 1 | `[data-testid="strata-direction-readiness"] > div:first-child > div:first-child` | text now sentence case | green (unit-proven) |
| 2 | gap lozenge span | still uppercase / no parity ancestor | **RED — DI-02 blocked on D1** (unchanged) |
| 3 | `[role="tablist"][aria-label="Strategy Room view"]` | **INVALIDATED → new:** `[data-testid="strata-strategy-view"] [role="tablist"]` | green (reason: ADS `TabList` doesn't accept `aria-label`; verified in `@atlaskit/tabs` source; group carries the name) |
| 4 | `button[aria-label="Filter by type"]` | unchanged | **RED — DI-04 DEFERRED** (shared component, not touched) |
| 5 | `[data-testid="strata-hierarchy-panel"] > div:first-child > span:nth-of-type(2)` | unchanged | **RED — DI-05 DEFERRED** (shared component, not touched) |
| 6 | `[data-testid="strata-inspector-rail"] > div` | now ADS compact EmptyState | green (unit-proven: rail renders EmptyState, no CTA) |
| 7 | `…span[style*="gap: 5px"]` | **INVALIDATED by design → new:** `span[style*="var(--ds-space-050)"]` | green (reason: token replaces 5px; unit-proven) |
| 8 | `[data-testid="strata-hierarchy-panel"]` | page-local containment reduced; **panel border+shadow residual is shared `StrataPanel` (D4) — reported, not fixed** | partial |

Selectors 2/4/5 are RED by design (D1 block + DI-04/DI-05 deferral) — documented, not substituted.

## Screenshot checklist — see `10_SCREENSHOT_CHECKLIST.md` (pending the authenticated pass).
