# PLAN LOCK — Phase 7: Dark Surface Fix

**Status:** PENDING  
**Will be approved:** After Phase 5 gate passes  
**Timebox:** 2 hours  
**Slice:** Phase 7 of 10 (CRITICAL BLOCKER for dark mode)  
**Prerequisite:** Phase 5 gate must pass (hex count <600) ✅ BLOCKS THIS PHASE  
**Can run parallel with:** Phase 10 (Icons) once Phase 5 passes  

---

## OBJECTIVE

Fix dark mode surface hierarchy collapse. Currently, all surfaces (page, nav, cards, inputs) use the same color (#22272E, rgb 12,17,23), making them visually indistinguishable. Jira uses 3–4 distinct levels with ≥10 luminance point separation.

**Done looks like:** Dark mode surfaces are visually distinct, text is readable at all hierarchy levels, dividers and borders visible, hover/focus states work, WCAG AA contrast passes.

---

## NON-SCOPE

- Light mode surface fixes (Phase 6)
- Icon dark visibility (Phase 10)
- Typography or spacing changes
- Component migrations

---

## DARK SURFACE HIERARCHY (REQUIRED)

**Level 1 — Page background (darkest):**
```css
background: var(--ds-surface);
```

**Level 2 — Navigation/sidebar (≥10 lum points lighter than L1):**
```css
background: var(--ds-surface-overlay);
```

**Level 3 — Cards/panels (≥10 lum points lighter than L2):**
```css
background: var(--ds-elevation-surface-raised);
```

**Level 4 — Inputs/interactive (≥5 lum points lighter than L3):**
```css
background: var(--ds-background-input);
border: 1px solid var(--ds-border-input);
```

---

## KNOWN FAILURES TO FIX

1. **Surface flattening** — All levels share #22272E
   - Fix: Assign correct token to each surface level in AtlaskitPageShell
   - Impact: 55+ instances across shells, navs, cards

2. **Invisible dividers** — 186+ Tailwind gray instances vanish in dark mode
   - Fix: Replace `border-gray-*` with `var(--ds-border)`
   - Impact: 186 violations

3. **Invisible input fields** — 145+ inputs have no dark background
   - Fix: `background: var(--ds-background-input)`
   - Impact: 145 instances

4. **No dark hover states** — 222+ elements lack `:hover` in dark mode
   - Fix: Add `background: var(--ds-background-neutral-hovered)` on hover
   - Impact: nav items, table rows, interactive elements

5. **No dark focus states** — 39+ focusable elements
   - Fix: Add `outline: 2px solid var(--ds-border-focused)` on focus
   - Impact: buttons, inputs, links

6. **Text contrast failure** — `--ds-text-subtlest` at 4.1:1 on dark bg (WCAG AA requires 4.5:1)
   - Fix: Upgrade to `var(--ds-text-subtle)` or increase surface luminance
   - Impact: 40+ text elements

7. **Status lozenge contrast** — Verify CatalystStatusPill handles dark mode (should pass via token)
   - Validation only: confirm lozenge is readable in dark mode

8. **Icon visibility** — Icons invisible on dark surfaces (full fix in Phase 10; here ensure shell icons work)
   - Validation only: confirm icons inherit surface correctly

---

## FILES TO MODIFY

| File | Violations | Change type | Scope |
|------|-----------|------------|-------|
| src/components/ads/AtlaskitPageShell.tsx | ~55 | edit | Assign 4-level hierarchy via CSS custom properties |
| src/components/layout/CatalystShell.tsx | ~30 | edit | Assign surface levels, dark mode support |
| src/components/layout/RoomContentShell.tsx | ~20 | edit | Cards/panels → var(--ds-elevation-surface-raised) |
| src/components/shared/PageShell.tsx | ~15 | edit | Page background → var(--ds-surface) |
| [All nav/sidebar components] | ~50 | edit | Nav background → var(--ds-surface-overlay) |
| [All card/panel components] | ~40 | edit | Card background → var(--ds-elevation-surface-raised) |
| [All input components] | ~145 | edit | Input bg → var(--ds-background-input) |
| [All border elements] | ~186 | edit | Borders → var(--ds-border) |
| [Hover/focus states] | ~261 | edit | Add :hover/:focus with correct tokens |

---

## FILES FORBIDDEN

- src/components/shared/CatalystStatusPill.tsx (validation only, no changes)
- Light mode components (no changes)
- Spacing or typography files
- Icon SVG source files (Phase 10)

---

## UI/UX RULES

**Dark mode surface hierarchy MUST be visible:**
- Page bg, nav, cards, inputs are each a distinct visible shade
- Squint test: hierarchy remains obvious even when squinting
- No surface should "disappear into" adjacent surface
- Minimum luminance separation: 10 points between L1–L2–L3, 5 points between L3–L4

**Text contrast MUST pass WCAG AA:**
- Primary text on dark surface: ≥7:1 ratio
- Subtle text: ≥4.5:1 ratio
- Subtlest text: ≥4.5:1 ratio (may require surface upgrade)

**Dividers and borders MUST be visible:**
- No vanishing borders
- Sufficient contrast against adjacent surfaces

---

## DATA/BACKEND RULES

- No DB changes
- No API changes
- Audit only → no data assumptions

---

## INTEGRATION/WIRING RULES

- Tokens resolve via existing CSS variable system
- No new hooks or prop interfaces
- Theme provider already handles light/dark switching (just use correct tokens)

---

## PARALLEL EXECUTION PLAN

**Single-threaded phase:**

1. **Fix AtlaskitPageShell** (20 min)
   - Canonical shell, all consumers inherit its decisions
   - Assign 4-level hierarchy on shell root
   - Screenshot validation in dark mode

2. **Fix surfaces by level** (50 min)
   - Level 1: Page backgrounds
   - Level 2: Nav/sidebar backgrounds
   - Level 3: Card/panel backgrounds
   - Level 4: Input backgrounds + borders
   - Each assignment screenshotted for validation

3. **Fix hover/focus states** (30 min)
   - Add `:hover` with var(--ds-background-neutral-hovered)
   - Add `:focus` with var(--ds-border-focused)
   - Test keyboard navigation in dark mode

4. **Text contrast audit** (10 min)
   - Verify text hierarchy passes WCAG AA
   - Upgrade any --ds-text-subtlest that fails 4.5:1

5. **Validation** (10 min)
   - Dark mode screenshots at 1440×900 + 1920×1080
   - Visual acceptance: surfaces distinguishable, text readable, no vanishing elements
   - npm run audit:contrast output

---

## SCREENSHOT CHECKLIST

- [ ] Dark mode before (reference page, 1440×900, current state)
- [ ] Dark mode after (same page, hierarchy applied, surfaces distinct)
- [ ] Dark mode before (reference page, 1920×1080, current state)
- [ ] Dark mode after (same page, 1920×1080, hierarchy applied)
- [ ] Hover state visible (nav item or row hover, clear highlight)
- [ ] Focus state visible (input or button focus, clear ring)
- [ ] Text contrast validation (all text readable)
- [ ] Status pill visible in dark mode (reference validation)

---

## VALIDATION COMMANDS

```bash
# Dark mode contrast gate:
npm run audit:contrast

# Color audit (should pass from Phase 5):
npm run audit:colors

# Visual validation:
# Take dark mode screenshots per PHASE-0-EXECUTION-CHECKLIST.md

# Keyboard navigation test:
# Tab through dark mode page, verify all focus rings visible

# Luminance verification:
# Use eyedropper tool to confirm RGB values of each surface level
# and verify ≥10 point separation
```

---

## STOP CONDITIONS

Stop and raise RED FLAG if:

- Surfaces still visually indistinguishable after fixes (hierarchy not working)
- Text contrast audit fails (WCAG AA not met)
- Light mode regresses (surfaces changed incorrectly)
- More than 5 files cannot be fixed due to missing tokens
- Phase 5 gate did not pass (cannot proceed)

RED FLAG format:
```
RED FLAG:
1. <What blocks dark mode fix>
2. <Why (missing tokens, contrast failure, etc.)>
3. <Evidence (screenshots, audit output)>
4. <Safer option>
5. <Decision needed>
```

---

## REQUIRED OUTPUTS

1. **phase7-file-manifest.md**
   - List of all files fixed
   - Before/after token assignments per file
   - Hierarchy level assignments

2. **phase7-contrast-audit.txt**
   - Output from `npm run audit:contrast`
   - All text elements must pass WCAG AA

3. **Dark mode screenshots**
   - Before + after, 1440×900 + 1920×1080
   - Surfaces distinct, text readable
   - Saved to: audits/ads-parity/screenshots/phase7-dark-before-after/

4. **Git diff summary**
   - Exact files changed, token replacements per file

---

## GATE REQUIREMENTS

**Phase 7 PASS criteria:**

- ✅ Dark mode surfaces visually distinct (squint test passes)
- ✅ Text contrast passes WCAG AA (npm run audit:contrast succeeds)
- ✅ Hover/focus states work in dark mode
- ✅ Dividers and borders visible
- ✅ Light mode unchanged (no regression)
- ✅ All 4 required outputs completed

**If gate fails:** Do not move to Phase 8+. Continue Phase 7 or request rebaseline.

---

## NOTES

This phase is the foundation for usable dark mode. Every surface level must be assigned correctly. The status pill is the reference (should already work — confirm it does). Icons inherit surface color from their context (Phase 10 ensures icons work correctly).

Focus on AtlaskitPageShell first — it is canonical and all consumers inherit its decisions.

Dark mode is not optional. 85% of checks currently fail; target 70%+ passing after this phase.

---

## APPROVAL

**Status:** PENDING (awaiting Phase 5 gate pass)

After Phase 5 passes with <600 hex count → Phase 7 can start immediately.
