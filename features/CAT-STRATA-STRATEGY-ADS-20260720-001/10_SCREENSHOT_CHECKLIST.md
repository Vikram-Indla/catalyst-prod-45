# SCREENSHOT CHECKLIST — CAT-STRATA-STRATEGY-ADS-20260720-001

Authenticated Chrome MCP against `http://127.0.0.1:8081/strata/strategy`.
Confirm the 8081 dev server's cwd via `lsof` before capture (foreign-checkout hazard).
Method: DI SKILL §3 — selector-anchored SVG arrows if injection allowed; external selector-grounded
annotation if the browser API is read-only. **Never bypass browser security.**

## Baseline (before any code)
- [ ] 8 selectors annotated RED at 1280 (light) — `🔴 DI VIOLATIONS — Strategy Room — 6 in-scope open (2 deferred)`
- [ ] Same at 1280 dark

## Per-slice (after each WP, reload, re-annotate)
- [ ] WP-A green: selector 1 (readiness label sentence case) — light + dark
- [ ] WP-B green: selector 7 (TypeChip gap; document old `gap:5px` → new `var(--ds-space-050)`) — Theme + Objective chips
- [ ] WP-C green: selector 6 (inspector EmptyState) — **rail ≥1280 AND drawer <1280**
- [ ] WP-D: selector 8 page-local reduction captured; **residual StrataPanel elevation noted in caption**
- [ ] WP-E green: selector 3 (ADS TabList, aria-label preserved); Map navigates away and returns
- [ ] WP-H (only if D1 unblocks) green: selector 2 (parity ancestor + sentence case) + sibling-unchanged shot

## States
- [ ] Structure view · Narrative view · (Map navigates out)
- [ ] Empty state (no cycle / no elements)
- [ ] No-match (filters) and gaps-only
- [ ] Inspector empty (no selection) — rail + drawer
- [ ] Loading (spinner) unchanged
- [ ] Error (SectionMessage) unchanged

## Viewports × theme
- [ ] 1024 · 1280 · wide — each in light AND dark

## Regression (must be visually identical to baseline)
- [ ] Cycle/Period chips + Type/Status/Perspective filters (DEFERRED components — must NOT change)
- [ ] JiraTable rows, expand/collapse, row-action menu
- [ ] Authoring modals (New cycle / element / edit / retire / charter / KPI links)
- [ ] StrataPanel header + count (DEFERRED — must NOT change)
- [ ] One sibling STRATA page spot-check (e.g. Reviews) — must be pixel-unchanged

## Deferred selectors (expected RED — documented, not fixed)
- [ ] Selector 4 (DI-04 trigger) — RED, deferred caption
- [ ] Selector 5 (DI-05 count) — RED, deferred caption
