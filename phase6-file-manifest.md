# Phase 6: Light Surface Fix — File Manifest

**Date:** 2026-06-28  
**Feature:** CAT-DESIGN-ADS-PARITY-20260628-001  
**Phase:** 6 (Light Surfaces)  
**Duration:** 2 hours  
**Status:** In Progress  

---

## Summary

Phase 6 focuses on establishing proper light mode surface hierarchy according to ADS compliance standards. The light surface hierarchy must use ADS tokens and create clear visual distinction between:

- Level 1: Page background (`var(--ds-surface)` #FFFFFF)
- Level 2: Navigation/overlay (`var(--ds-surface-overlay)`)
- Level 3: Cards/panels (`var(--ds-elevation-surface-raised)`)
- Level 4: Inputs (`var(--ds-background-input)` + `var(--ds-border-input)`)

---

## Files Reviewed (No Changes Needed)

### Shell & Layout Components
- **Status:** ✅ VERIFIED — Already ADS-compliant

| File | Current Token | Light Value | Status |
|------|---------------|-------------|--------|
| `src/components/ads/AtlaskitPageShell.tsx` | `cp(adsTokens.bg.surface)` | #FFFFFF | ✅ Correct |
| `src/components/layout/CatalystShell.tsx` | `--cp-bg-elevated` | #FFFFFF | ✅ Correct |
| `src/components/shared/PageShell.tsx` | TBD | TBD | Requires verification |

---

## Files with Potential Light Mode Issues

### Input Components
- `src/components/auth/ui/CatalystInput.tsx` — Uses `--input-bg`, `--input-border`, `--input-text`
  - Status: Needs verification of CSS variable definitions
  - Action: Ensure CSS variables use ADS tokens

### Navigation Components
- Navigation bars and sidebars
  - Status: Needs audit for muddy gray surfaces
  - Action: Ensure use of `var(--ds-surface-overlay)`

### Card/Panel Components
- Various card wrappers and panel containers
  - Status: Needs audit for proper elevation
  - Action: Ensure use of elevation tokens

### Form Components
- Input fields, text areas, selects
  - Status: ~145 instances to verify
  - Action: Audit for ADS compliance

---

## Known Token Definitions

From `src/theme/atlassian/tokens.ts`:

```typescript
bg: {
  page:    { light: 'var(--ds-surface, #FFFFFF)' },          // Page BG
  hubPage: { light: 'var(--ds-surface, #FFFFFF)' },          // Hub page BG
  surface: { light: 'var(--ds-surface, #FFFFFF)' },          // Main surface
  overlay: { light: 'var(--ds-surface-sunken, #F8FAFC)' },   // ⚠️ NEEDS REVIEW
  inset:   { light: 'var(--cp-bg-sunken, #F1F5F9)' },        // Sunken/alt
  hover:   { light: 'var(--ds-shadow-raised, rgba(0,0,0,0.04))' }, // Hover
  selected:{ light: 'var(--ds-background-information, rgba(37,99,235,0.08))' }, // Selected
}
```

### Issue Identified
- `overlay` token uses `var(--ds-surface-sunken)` which is darker (#F8FAFC) than page surface (#FFFFFF)
- For proper light mode hierarchy, overlay should be at least same level as surface or lighter
- This may need correction in token definitions

---

## CSS Variables in index.css

Input styling uses:
- `--input-bg`: Background color (currently uses `--cp-bg-elevated` with fallback to `--ds-surface`)
- `--input-border`: Border color
- `--input-text`: Text color

These need verification to ensure they use proper ADS tokens.

---

## Validation Checklist

- [ ] Shell components use correct tokens
- [ ] Navigation components have proper background
- [ ] Card/panel components are visually distinct
- [ ] Input components have border + background
- [ ] Hover states use `var(--ds-background-neutral-hovered)`
- [ ] Tab selection states are clear
- [ ] Light mode surfaces distinct from each other
- [ ] No muddy gray surfaces remain
- [ ] Dark mode unchanged (no regression)
- [ ] Screenshot validation passes

---

## Phase 6 Completion Criteria

✅ Light mode surfaces visually distinct  
✅ No muddy gray surfaces (all use tokens)  
✅ Cards clearly elevated from page background  
✅ Inputs clearly interactive (border + background)  
✅ Hover states visible and consistent  
✅ Tab selection states clear  
✅ Dark mode unchanged (no regression)  
✅ Light mode screenshots validate parity  

---

## Next Steps

1. **Verify** CSS variable definitions in index.css
2. **Audit** input components for ADS compliance
3. **Fix** any components using arbitrary colors
4. **Test** light mode at 1440x900 and 1920x1080
5. **Screenshot** validation
6. **Commit** Phase 6 changes

---

## Notes

- Phase 5 (Token Foundation) is complete
- Phase 7 (Dark Surfaces) has been started
- This phase focuses exclusively on light mode
- No typography or spacing changes in this phase
- All changes should use ADS tokens, not arbitrary colors
