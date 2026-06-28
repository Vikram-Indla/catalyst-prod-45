# PLAN LOCK — Phase 9: Spacing Grid Fix

**Status:** APPROVED  
**Timebox:** 2 hours  
**Slice:** Phase 9 of 14 (P1 HIGH IMPACT — FINAL BLOCKER)  
**Prerequisite:** Phase 5 gate must pass ✅  
**Can run parallel with:** Phase 11  

---

## OBJECTIVE

Normalize all spacing to ADS 8px grid. Spacing violations (473+) must be aligned to: 4px, 8px, 12px, 16px, 24px, 32px multiples. Target: 80%+ spacing checks passing, no off-grid values, consistent layout rhythm matching Jira.

**Done looks like:** All spacing uses 8px grid multiples, layout rhythm matches Jira density, gap/margin/padding all aligned, no arbitrary 6px/10px/13px/14px/15px/20px values.

---

## NON-SCOPE

- Color or typography changes
- Component structure changes
- Icon or status changes
- Responsive breakpoint changes

---

## KNOWN FAILURES TO FIX

1. **Off-grid spacing** (473+ instances)
   - Banned: 6px, 10px, 13px, 14px, 15px, 20px, arbitrary px values
   - Allowed: 4px, 8px, 12px, 16px, 24px, 32px, 40px, 48px (multiples of 4)
   - Impact: 100+ files

2. **Input field spacing explosion** (67 components)
   - CatalystInput, CatalystDueDateField, etc. all have custom spacing
   - Fix: Standardize to 8px grid
   - Impact: ~58 violation reduction expected

3. **Row/list item spacing** (50+ instances)
   - Gaps between elements not aligned to grid
   - Fix: Use 8px, 12px, 16px gaps
   - Impact: Lists, tables, card grids

4. **Icon/text gap inconsistency** (30+ instances)
   - Icon-to-text spacing varies (10px, 12px, 14px, 18px)
   - Fix: Standardize to 8px or 12px
   - Impact: Buttons, nav items, list items

---

## FILES TO MODIFY

| File | Violations | Change type | Scope |
|------|-----------|------------|-------|
| src/index.css | ~50 | edit | Global spacing utilities |
| src/components/chat/*.tsx | ~30 | edit | Chat component spacing |
| src/modules/tasks/*.tsx | ~40 | edit | Task spacing |
| [Input components] | ~80 | edit | Input field padding/gaps |
| [List/row components] | ~60 | edit | Row density, gaps |
| [Icon/text components] | ~30 | edit | Icon-to-text gaps |
| [Page headers] | ~20 | edit | Header/title spacing |
| [Cards/panels] | ~40 | edit | Card padding, gaps |

---

## 8PX GRID REFERENCE

**Allowed spacing values (4px multiples):**
- 4px (micro spacing, rarely used)
- 8px (base unit, most common)
- 12px (8 + 4)
- 16px (2× base, common)
- 24px (3× base, common for section spacing)
- 32px (4× base, large spacing)
- 40px (5× base)
- 48px (6× base)

**Banned spacing values:**
- 6px, 10px, 13px, 14px, 15px, 18px, 20px, 22px, etc. (non-multiples of 4)

---

## VALIDATION COMMANDS

```bash
# After fixing, audit spacing violations
# (ratchet gate will track progress toward 0)

# Verify no new color violations
npm run lint:colors:gate

# Light/dark mode screenshots showing spacing consistency
```

---

## GATE REQUIREMENTS

**Phase 9 PASS criteria:**

- ✅ All spacing uses 4px multiples (4, 8, 12, 16, 24, 32, 40, 48)
- ✅ No off-grid values (6, 10, 13, 14, 15, 18, 20 banned)
- ✅ Input field spacing normalized
- ✅ Row/list density matches Jira
- ✅ Icon-to-text gaps consistent
- ✅ Page header spacing intentional
- ✅ Layout rhythm matches Jira reference
- ✅ Dark mode unchanged (no regression)

---

## PRIORITY ORDER

1. **src/index.css** (50 violations) — Global utilities, highest impact
2. **Input components** (80 violations) — Most frequent, user-facing
3. **List/row components** (60 violations) — High visibility
4. **Task modules** (40 violations) — Complex component spacing
5. **Chat components** (30 violations) — High-traffic area
6. **Card/panel spacing** (40 violations) — Elevation consistency
7. **Icon/text gaps** (30 violations) — Button/nav items
8. **Page headers** (20 violations) — Title/heading spacing

---

## APPROVAL

**Status:** ✅ APPROVED (execution authorized)

After Phase 9 passes → Phase 11 (Component Canonicity) can proceed in parallel.

Then: All P1 critical work complete. Optional Phase 13-14 for screenshot validation + regression testing.
