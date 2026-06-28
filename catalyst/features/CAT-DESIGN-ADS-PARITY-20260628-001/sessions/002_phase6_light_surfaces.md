# Session 002 — Phase 6: Light Surface Fix

**Date:** 2026-06-28  
**User:** khan.jahanara@gmail.com  
**Branch:** claude/frosty-black-fbf71b  
**Feature:** CAT-DESIGN-ADS-PARITY-20260628-001  
**Status:** INITIATED  
**Timebox:** 2 hours  

---

## Objective

Fix light mode surface definition and visual hierarchy. Light surfaces must be clean, intentional, and ADS-compliant. Target: 80%+ light surface checks passing, no muddy gray surfaces, clear elevation hierarchy.

---

## Light Surface Hierarchy (ADS Tokens)

| Level | Purpose | Token | Light Value |
|-------|---------|-------|-------------|
| L1 | Page background | `var(--ds-surface)` | #FFFFFF |
| L2 | Navigation/sidebar | `var(--ds-surface-overlay)` | #FFFFFF (Jira uses lighter variant) |
| L3 | Cards/panels | `var(--ds-elevation-surface-raised)` | #FFFFFF (with subtle shadow) |
| L4 | Inputs/interactive | `var(--ds-background-input)` | #FFFFFF with border |

---

## Known Failures to Fix

1. **Muddy gray surfaces** (~25 files)
   - Replace arbitrary gray with proper tokens
   - Status: Requires code audit

2. **Lack of visual separation** (~40 card instances)
   - Ensure proper elevation tokens
   - Status: Requires code audit

3. **Input field confusion** (~145 inputs)
   - Apply `var(--ds-background-input)` + `var(--ds-border-input)`
   - Status: Requires code audit

4. **Hover state visibility** (~50 interactive rows)
   - Apply `var(--ds-background-neutral-hovered)` on :hover
   - Status: Requires code audit

5. **Tab selection unclear** (~20 tab groups)
   - Proper selected state tokens
   - Status: Requires code audit

6. **Sidebar visual weight** (~10 sidebar components)
   - `var(--ds-surface-overlay)` + subtle shading
   - Status: Requires code audit

---

## Implementation Plan (2-hour slice)

**Phase 6a: Shell Components (30 min)**
- AtlaskitPageShell — ensure proper light hierarchy
- CatalystShell — main background token
- PageShell — check consistency

**Phase 6b: Navigation & Sidebars (20 min)**
- Top nav backgrounds
- Sidebar backgrounds
- Tab navigation styling

**Phase 6c: Cards & Panels (20 min)**
- Card container backgrounds
- Panel backgrounds
- Modal backgrounds

**Phase 6d: Input Surfaces (20 min)**
- Input field backgrounds
- Input borders
- Focus states

**Phase 6e: Interactive States (15 min)**
- Hover backgrounds
- Selected states
- Focus rings (if needed)

**Phase 6f: Validation (5 min)**
- Light mode visual audit
- Screenshot comparison
- No dark mode regression

---

## Files to Review/Modify

### High Priority
1. `src/components/ads/AtlaskitPageShell.tsx` — Main shell hierarchy
2. `src/components/layout/CatalystShell.tsx` — Main layout
3. `src/components/shared/PageShell.tsx` — Alternative shell
4. Input components (TBD from audit)
5. Card/panel components (TBD from audit)
6. Navigation components (TBD from audit)

---

## Validation Commands

```bash
# Light mode screenshots
npm run dev

# Check for regressions
npm run lint:colors:gate
npm run audit:contrast

# Verify token usage
grep -r "var(--ds-surface)" src/components/
grep -r "var(--ds-background-input)" src/
```

---

## Progress Tracking

- [ ] Audit shell components
- [ ] Fix AtlaskitPageShell
- [ ] Fix navigation backgrounds
- [ ] Fix card/panel backgrounds
- [ ] Fix input surfaces
- [ ] Add hover/selected states
- [ ] Validate light mode
- [ ] Screenshot acceptance
- [ ] No dark mode regression

---

## Notes

- Phase 5 (Token Foundation) is complete
- Phase 7 (Dark Surfaces) has been started
- This phase focuses exclusively on light mode surface hierarchy
- No typography or spacing changes in this phase
