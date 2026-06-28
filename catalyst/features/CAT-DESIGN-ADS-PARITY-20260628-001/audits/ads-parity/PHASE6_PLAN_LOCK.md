# PLAN LOCK — Phase 6: Light Surfaces Fix

**Status:** APPROVED  
**Timebox:** 2 hours  
**Slice:** Phase 6 of 14 (P1 HIGH IMPACT)  
**Prerequisite:** Phase 5 gate must pass ✅  
**Can run parallel with:** Phase 8, 9  

---

## OBJECTIVE

Fix light mode surface definition and visual hierarchy. Light surfaces must be clean, intentional, and ADS-compliant. Target: 80%+ light surface checks passing, no muddy gray surfaces, clear elevation hierarchy.

**Done looks like:** Light mode has clean visual hierarchy (page bg, nav, cards, inputs visually distinct), all surfaces use proper ADS tokens, no muddy grays, page background is intentional.

---

## NON-SCOPE

- Dark mode fixes (Phase 7)
- Typography or spacing changes
- Icon or status badge changes
- Component migrations

---

## LIGHT SURFACE HIERARCHY

**Level 1 — Page background (neutral, clean):**
```css
background: var(--ds-surface);
```

**Level 2 — Navigation/sidebar (slightly raised):**
```css
background: var(--ds-surface-overlay);
```

**Level 3 — Cards/panels (elevated):**
```css
background: var(--ds-elevation-surface-raised);
```

**Level 4 — Inputs/alternate (interactive):**
```css
background: var(--ds-background-input);
border: 1px solid var(--ds-border-input);
```

---

## KNOWN FAILURES TO FIX

1. **Muddy gray surfaces** — Surfaces use arbitrary gray (#F5F5F5, #EFEFEF) instead of tokens
   - Fix: Replace with var(--ds-elevation-surface-raised)
   - Impact: ~25 files

2. **Lack of visual separation** — Cards don't stand out from page background
   - Fix: Ensure proper elevation tokens
   - Impact: 40+ card instances

3. **Input field confusion** — Inputs blend with background
   - Fix: var(--ds-background-input) + var(--ds-border-input)
   - Impact: 145+ inputs

4. **Hover state visibility** — Hover backgrounds not clearly visible
   - Fix: var(--ds-background-neutral-hovered) on :hover
   - Impact: 50+ interactive rows

5. **Tab selection unclear** — Selected tabs don't stand out
   - Fix: Proper selected state token
   - Impact: 20+ tab groups

6. **Sidebar visual weight** — Sidebar not clearly distinguished
   - Fix: var(--ds-surface-overlay) + subtle shading
   - Impact: 10+ sidebar components

---

## FILES TO MODIFY

| File | Violations | Change type | Scope |
|------|-----------|------------|-------|
| src/components/ads/AtlaskitPageShell.tsx | ~30 | edit | Page + nav hierarchy |
| src/components/layout/CatalystShell.tsx | ~20 | edit | Shell surfaces |
| [Card/panel components] | ~40 | edit | Elevation tokens |
| [Input components] | ~145 | edit | Input backgrounds + borders |
| [Navigation components] | ~50 | edit | Nav backgrounds + hover |
| [Sidebar components] | ~10 | edit | Sidebar elevation |
| [Tab components] | ~20 | edit | Tab selection states |

---

## VALIDATION COMMANDS

```bash
# Light mode screenshots at multiple viewports
# See PHASE-0-EXECUTION-CHECKLIST.md for process

# Verify no new color violations
npm run lint:colors:gate

# Verify contrast still passes
npm run audit:contrast

# Visual acceptance: surfaces distinct, hierarchy clear
```

---

## GATE REQUIREMENTS

**Phase 6 PASS criteria:**

- ✅ Light mode surfaces visually distinct
- ✅ No muddy gray surfaces (all use tokens)
- ✅ Cards clearly elevated from page background
- ✅ Inputs clearly interactive (border + background)
- ✅ Hover states visible and consistent
- ✅ Tab selection states clear
- ✅ Dark mode unchanged (no regression)
- ✅ Light mode screenshots validate parity

---

## APPROVAL

**Status:** ✅ APPROVED (execution authorized)

After Phase 6 passes → Phase 8 & 9 can proceed in parallel.
