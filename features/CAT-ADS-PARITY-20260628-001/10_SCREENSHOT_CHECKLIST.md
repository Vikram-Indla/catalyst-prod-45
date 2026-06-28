# Screenshot Checklist — CAT-ADS-PARITY-20260628-001

**Mandatory screenshots for UI/UX acceptance.** No screenshot = no approval. All 24 items must be accepted before phase complete.

**Acceptance rule:** Screenshots prove visual design correctness. Tests/DOM prove functionality.

---

## Phase 6 — Light Surface

| # | Item | Before (reference) | After (implementation) | Acceptance criteria | Status |
|---|---|---|---|---|---|
| 1 | Issue list (light mode) | Jira screenshot | Catalyst screenshot | Nav background is `var(--ds-surface)`, card backgrounds are `var(--ds-surface-raised)`, no hard-coded colors visible | pending |
| 2 | Card surfaces (light mode) | Jira screenshot | Catalyst screenshot | Card background token matches Jira visual (slightly raised/elevated appearance), shadows applied via ADS token | pending |
| 3 | Row hover state | Jira screenshot | Catalyst screenshot | Hover background uses `var(--ds-background-neutral-hovered)` (mid-tone), outline-offset visible, no custom hex | pending |
| 4 | Row selected state | Jira screenshot | Catalyst screenshot | Selected background uses `var(--ds-background-selected)` (blue), contrast ≥4.5:1 with text, checkbox visible | pending |
| 5 | Sidebar (light mode) | Jira screenshot | Catalyst screenshot | Sidebar background is `var(--ds-surface-sunken)` (slightly darker than main), clear visual separation from main area, no color drift | pending |

**Validation notes:**
- Use Chrome DevTools color picker to verify exact token values (copy computed background-color).
- Compare side-by-side: Jira reference + Catalyst implementation (same viewport width 1440×900).
- Dark mode check: Take dark-mode screenshot after Phase 6 to validate no visual regression (store separately).

---

## Phase 8 — Typography

| # | Item | Before | After | Acceptance criteria | Status |
|---|---|---|---|---|---|
| 6 | Typography hierarchy (light) | Jira screenshot | Catalyst screenshot | Titles: 20px/600 weight, body: 14px/400, metadata: 12px/400 or 12px/500, line-heights correct (1.0–1.65 per scale) | pending |
| 7 | Typography hierarchy (dark) | Catalyst dark baseline | Catalyst dark after fixes | All text contrast ≥4.5:1 (normal), ≥3:1 (large), no color degradation, metadata text still readable | pending |
| 8 | Ellipsis truncation | Jira screenshot | Catalyst screenshot | Issue titles truncate at container width with `…` ellipsis, no text wrap, hover tooltip shows full text | pending |

**Validation notes:**
- Measure font-size in Chrome DevTools Computed tab (e.g., `font-size: 20px`, `font-weight: 600`).
- For contrast: use WebAIM contrast checker or Chrome DevTools Lighthouse a11y check (verify ≥4.5:1).
- Truncation test: widen/narrow viewport to confirm ellipsis behavior at edge cases.

---

## Phase 9 — Spacing

| # | Item | Before | After | Acceptance criteria | Status |
|---|---|---|---|---|---|
| 9 | Nav height | Jira screenshot (56px baseline) | Catalyst screenshot | Height = 56px ± 1px (measure pixel from top of nav to bottom of nav) | pending |
| 10 | Rail width | Jira screenshot (240px baseline) | Catalyst screenshot | Width = 240px ± 1px when expanded (measure pixel from left edge to right edge of sidebar) | pending |
| 11 | Row density | Jira screenshot | Catalyst screenshot | Padding top/bottom = 8px, left/right = 16px per row, gap between rows = 4px, height ≈40–48px depending on content | pending |
| 12 | Card padding | Jira screenshot | Catalyst screenshot | Card padding = 16px on all sides (measure: 16px top, 16px right, 16px bottom, 16px left) | pending |

**Validation notes:**
- Use Chrome DevTools Inspect to measure pixel values (Styles > Box Model section shows padding/margin/border).
- Grid alignment: verify spacing snaps to 8px grid (0, 4, 8, 12, 16, 24, 32, 40, 48, 64 allowed).
- Take ruler screenshots (show DevTools ruler overlay aligned to major sections).

---

## Phase 11 — Canonical Migration

| # | Item | Before migration | After migration | Acceptance criteria | Status |
|---|---|---|---|---|---|
| 13 | Full page (before migration) | Catalyst original | — | Full-page screenshot showing all original components in light mode | pending |
| 14 | Full page (after migration) | — | Catalyst after canonical swap | Visual identity unchanged (before/after screenshots identical to user eye), E2E tests pass, no route breakage | pending |
| 15 | GlobalPageHeader (page variant) | Original SidebarHeader | Canonical GlobalPageHeader | Pixel-identical appearance (title, subtitle, icon, color), no visual regression | pending |
| 16 | GlobalPageHeader (sidebar variant) | Original MessagePanelHeader | Canonical GlobalPageHeader | Pixel-identical appearance, panel layout preserved | pending |
| 17 | GlobalPageHeader (panel variant) | Original DraftsAndSentHeader | Canonical GlobalPageHeader | Pixel-identical appearance, breadcrumb/state info preserved | pending |
| 18 | CatalystFormField (with error) | Custom form field | Canonical CatalystFormField | Error text visible (color: `var(--ds-text-danger)`), required marker (red asterisk), 2px red border | pending |
| 19 | CatalystFormField (with hint) | Custom form field | Canonical CatalystFormField | Hint text visible (color: `var(--ds-text-subtle)`, size: 12px), positioned below input, no margin collapse | pending |

**Validation notes:**
- Before/after screenshots must be pixel-identical from user perspective (use screenshot overlays to compare).
- For component migration: verify props map correctly (no prop name conflicts, variants work).
- Store before + after in same folder for comparison.

---

## Phase 13 — Accessibility

| # | Item | Baseline (reference) | After fixes | Acceptance criteria | Status |
|---|---|---|---|---|---|
| 20 | Focus rings (nav items) | Baseline screenshot | Catalyst video + screenshot | 2px solid outline visible on every nav item on Tab, outline-offset: 2px, uses `var(--ds-border-focused)` | pending |
| 21 | Focus rings (sidebar) | Baseline screenshot | Catalyst video + screenshot | Focus ring visible on all sidebar interactive elements (buttons, links, form fields) on Tab, :focus-visible only (not on click) | pending |
| 22 | Focus rings (issue list rows) | Baseline screenshot | Catalyst video + screenshot | Focus ring visible on clickable rows + action buttons, ring does not obscure content, tabbing order is logical left→right, top→bottom | pending |
| 23 | Contrast (dark mode) | Dark mode baseline | Dark mode after Phase 13 | All text ≥4.5:1 (normal), ≥3:1 (large text), background/text pairs measured via contrast analyzer | pending |
| 24 | Contrast (light mode) | Light mode baseline | Light mode after Phase 13 | All text ≥4.5:1 (normal), ≥3:1 (large text), no degradation from earlier phases | pending |

**Validation notes:**
- Video walkthrough required: record Tab sequence through all interactive zones (nav → sidebar → issue list → action buttons).
- For contrast: use Chrome DevTools Lighthouse a11y audit or WebAIM contrast checker on every text+background pair.
- Check for insufficient contrast in: metadata text (12px), placeholder text, disabled states, secondary text (subtle color).
- Dark mode regression: compare Phase 6 + Phase 8 dark screenshots against Phase 13 dark screenshot (should be identical).

---

## Screenshot Storage & Naming

Store all screenshots in:
```
sessions/<SESSION_NNN>/
  ├── phase6_light_issue_list.png          # Full issue list view (light mode)
  ├── phase6_light_cards.png               # Close-up of card surfaces (light mode)
  ├── phase6_light_row_hover.png           # Row with hover background applied
  ├── phase6_light_row_selected.png        # Row with selected background applied
  ├── phase6_light_sidebar.png             # Sidebar (light mode, sunken surface)
  ├── phase6_dark_regression_check.png     # Full page dark mode (verify no breakage)
  ├── phase8_typography_light.png          # Text hierarchy in light mode (titles, body, metadata)
  ├── phase8_typography_dark.png           # Text hierarchy in dark mode (contrast check)
  ├── phase8_truncation.png                # Issue title with ellipsis truncation
  ├── phase9_nav_height.png                # Nav bar with DevTools ruler (56px height)
  ├── phase9_rail_width.png                # Sidebar with DevTools ruler (240px width)
  ├── phase9_row_density.png               # Issue row with padding measurements
  ├── phase9_card_padding.png              # Card with padding measurements
  ├── phase11_before_migration.png         # Full page before canonical component swap
  ├── phase11_after_migration.png          # Full page after canonical component swap
  ├── phase11_globalpageheader_page.png    # GlobalPageHeader (page variant)
  ├── phase11_globalpageheader_sidebar.png # GlobalPageHeader (sidebar variant)
  ├── phase11_globalpageheader_panel.png   # GlobalPageHeader (panel variant)
  ├── phase11_formfield_error.png          # CatalystFormField with error state
  ├── phase11_formfield_hint.png           # CatalystFormField with hint text
  ├── phase13_focus_ring_nav.mp4           # Video: Tab through nav items (focus rings visible)
  ├── phase13_focus_ring_sidebar.mp4       # Video: Tab through sidebar (all interactive elements)
  ├── phase13_focus_ring_rows.mp4          # Video: Tab through issue rows + action buttons
  ├── phase13_contrast_dark.png            # Dark mode contrast audit (colors highlighted)
  └── phase13_contrast_light.png           # Light mode contrast audit (colors highlighted)
```

---

## Video Walkthrough Scripts

### Phase 13 — Focus Ring Tabbing (3 videos)

**Video 1: Nav items (90 seconds)**
```
1. Open Catalyst app in Chrome (localhost:8080)
2. Switch to light mode (if dark)
3. Press Tab (should focus first nav item — usually "Home" or dashboard link)
   → Verify 2px solid outline visible around the item
   → Verify outline-offset: 2px (ring does not touch the button)
   → Verify outline color is `var(--ds-border-focused)` (blue)
4. Continue pressing Tab through all nav items
   → Verify every interactive nav element gets a visible ring
   → Verify ring disappears immediately on mouse click (uses :focus-visible)
5. Verify no visual artifacts: ring does not overflow, does not hide text
6. Record entire sequence to phase13_focus_ring_nav.mp4
```

**Video 2: Sidebar interactive elements (120 seconds)**
```
1. Open Catalyst sidebar (if collapsed, click hamburger to expand)
2. Press Tab repeatedly to move focus into sidebar
3. Focus each sidebar section:
   → Navigation links (Projects, Dashboards, Filters, etc.) — ring visible?
   → Buttons (create issue, settings, etc.) — ring visible?
   → Form fields (if any search/filter inputs) — ring visible?
   → Nested menu items (expand/collapse triangles) — ring visible on parent + children?
4. Tabbing order should be logical: top to bottom, left to right, no random jumps
5. Verify no focus trap (Tab always moves focus forward, Shift+Tab backward)
6. Record entire sequence to phase13_focus_ring_sidebar.mp4
```

**Video 3: Issue list rows + action buttons (120 seconds)**
```
1. Open issue list (Issues tab or project board)
2. Press Tab to move into the issue list
3. Focus should land on first clickable row
   → Verify 2px ring visible around entire row
   → Verify outline does not overflow into adjacent rows
4. Continue Tab through all issue rows
   → Verify every row gets a focus ring
5. Tab into action buttons within rows (if any: edit, delete, link, etc.)
   → Verify button focus rings are visible and distinct from row focus
6. Verify logical tabbing order: top row → bottom row → action buttons, etc.
7. Record entire sequence to phase13_focus_ring_rows.mp4
```

---

## Edge Cases & Coverage

**All phases:**
- [ ] Light mode (primary test condition — run all phases in light mode first)
- [ ] Dark mode (regression check — take dark screenshot after Phase 6, Phase 8, Phase 13)
- [ ] Viewport 1440×900 (standard test resolution)
- [ ] Viewport 1920×1080 (large screen — spacing should still align to grid)
- [ ] Viewport 1024×768 (small screen — verify sidebar collapse/expand works)

**Phase 6 specific:**
- [ ] Empty state (if no issues in list — verify background colors still apply)
- [ ] Disabled rows (if any — verify color contrast ≥3:1 for disabled text)
- [ ] Hover on disabled row (should not change appearance)
- [ ] Multi-row selection (if enabled — verify all selected rows use same token)

**Phase 8 specific:**
- [ ] Very long issue titles (>100 chars — verify truncation with ellipsis)
- [ ] Short titles (1–3 words — verify no weird spacing)
- [ ] Metadata text (12px) on dark backgrounds — contrast ≥3:1?
- [ ] Placeholder text in form fields — color `var(--ds-text-subtlest)`, contrast ≥3:1?
- [ ] Code blocks / code snippets (if any — monospace, contrast check)

**Phase 9 specific:**
- [ ] Horizontal scroll (at 1024px viewport — verify no spacing breakage)
- [ ] Content with variable height (tall metadata, wrapped text — verify padding stable)
- [ ] Mobile viewport (375×667 — if applicable, verify nav/sidebar responsive)

**Phase 11 specific:**
- [ ] Component props mapping (no warnings in console, no missing prop errors)
- [ ] Route navigation (click links from old component → destination works)
- [ ] Form submission (old form field → canonical field → submit works, data captured)
- [ ] Undo/redo (if applicable — state management intact post-migration)

**Phase 13 specific:**
- [ ] Keyboard-only navigation (complete app flow using only Tab, Enter, Space, Escape)
- [ ] Shift+Tab (reverse tabbing — verify focus moves backward)
- [ ] Tab trap scenario (modal or panel open — Tab should stay inside, Escape closes)
- [ ] Disabled elements (Tab should skip disabled buttons/inputs)
- [ ] Color-contrast edge cases: text on images, text on gradients, animated backgrounds

---

## Acceptance Checklist

- [ ] Phase 6 (5 items): Light surface colors verified, dark mode baseline captured
- [ ] Phase 8 (3 items): Typography hierarchy measured, contrast audit passed, truncation works
- [ ] Phase 9 (4 items): Nav height 56px verified, rail width 240px verified, spacing on 8px grid, card padding 16px
- [ ] Phase 11 (7 items): Before/after visually identical, canonical components pixel-matched, form fields working
- [ ] Phase 13 (5 items): Focus rings visible in all zones, keyboard navigation logical, contrast ≥4.5:1 (normal) / ≥3:1 (large)
- [ ] All edge cases covered (empty states, long text, dark mode regressions, responsive layouts)
- [ ] No blockers or unflagged issues discovered
- [ ] Screenshots stored in `sessions/<SESSION_NNN>/` with standard naming
- [ ] Video walkthroughs captured for Phase 13 focus ring verification

---

## Blocker Criteria (STOP if true)

- **Broken focus ring:** Focus ring missing, not visible, or uses hard-coded color (not a token)
- **Contrast failure:** Any text ≤4.3:1 (normal) or ≤2.9:1 (large) — accessibility red flag
- **Color regression:** Hard-coded hex/rgb found in styled components (CLAUDE.md violation)
- **Component breakage:** Canonical migration causes navigation error, form submission failure, or route redirect failure
- **Dark mode breakage:** Dark mode visually different from Phase 6 baseline (regression)

**If any blocker triggered:** Stop, flag in 07_HANDOVER.md, do not approve.

---

## Notes

- **Screenshots are mandatory.** No screenshot = no approval. DOM/tests prove functionality; screenshots prove visual correctness.
- **Jira = source of truth** for light-mode color parity. Catalyst baseline used for dark-mode reference (if Jira dark screenshots unavailable).
- **Before/after must be visually identical** for migration phases (component swap should not change appearance).
- **Video required for accessibility.** Focus ring visibility is hard to prove in static screenshots; video walkthrough mandatory for Phase 13.
- **Dark mode is not optional.** Every phase must have dark-mode regression check (take screenshot, compare to previous phase's dark baseline).
