# PLAN LOCK — Phase 10: Icon Fix

**Status:** PENDING  
**Will be approved:** After Phase 5 gate passes  
**Timebox:** 2 hours  
**Slice:** Phase 10 of 10 (CRITICAL BLOCKER for icon visibility)  
**Prerequisite:** Phase 5 gate must pass (hex count <600) ✅ BLOCKS THIS PHASE  
**Can run parallel with:** Phase 7 (Dark Surfaces) once Phase 5 passes  

---

## OBJECTIVE

Eliminate all hardcoded icon colors (25 in registry + 28 in SVG files = 53 violations). Create CatalystIconWrapper as the canonical icon mounting component. Ensure all icons remain visible and properly contrasted in both light and dark modes.

**Done looks like:** All icons use currentColor via CatalystIconWrapper, icon registry entries use token fallbacks, dark mode icons visible and readable, 53 violations eliminated.

---

## NON-SCOPE

- Icon design or new icon sets
- Non-icon SVG graphics (handled separately)
- Typography or spacing changes
- Component migrations unrelated to icons

---

## KNOWN VIOLATIONS

**Registry violations (25):**
- icons.registry.ts contains 25 hardcoded hex color fallbacks
- These are static and do not switch in dark mode
- Example: `color: '#44546F'` should be `var(--ds-icon, '#44546F')`

**SVG source violations (28):**
- 28 SVG files with hardcoded `fill="#"` or `stroke="#"` attributes
- These ignore the theme and remain visible only in one mode
- Must be replaced with `fill="currentColor"` / `stroke="currentColor"`

**Dark mode coverage gaps (19):**
- 19 icons have no dark mode treatment
- Icons become invisible or low-contrast on dark surfaces
- Fix: Use currentColor via CatalystIconWrapper with correct color token

---

## ICON COLOR TOKEN MAP

```
Default icon color:   var(--ds-icon)
Subtle / inactive:    var(--ds-icon-subtle)
Selected / active:    var(--ds-icon-selected)
Danger:               var(--ds-icon-danger)
Warning:              var(--ds-icon-warning)
Success:              var(--ds-icon-success)
Disabled:             var(--ds-icon-disabled)
On bold surface:      var(--ds-icon-inverse)
```

---

## FILES TO MODIFY

| File | Violations | Change type | Scope |
|------|-----------|------------|-------|
| src/shared/icons/icons.registry.ts | 25 | edit | Replace hex fallbacks with token fallbacks |
| src/icons/*.svg | 28 | edit | Replace fill/stroke with currentColor |
| src/components/shared/CatalystIconWrapper.tsx | N/A | create | New canonical wrapper component |
| [All components using icons] | varies | edit | Migrate usage to CatalystIconWrapper |

---

## FILES FORBIDDEN

- Icon design files (external)
- Non-icon SVG graphics
- Test files
- Components already using CatalystIconWrapper (if exists)

---

## CANONICAL COMPONENT: CatalystIconWrapper

**Create:** `src/components/shared/CatalystIconWrapper.tsx`

**Props:**
```typescript
interface CatalystIconWrapperProps {
  /**
   * Icon size: 16 | 24 | 32 pixels only.
   * Reject other values with console.error.
   */
  size: 16 | 24 | 32;

  /**
   * Icon color semantic:
   * - 'default': var(--ds-icon)
   * - 'subtle': var(--ds-icon-subtle)
   * - 'selected': var(--ds-icon-selected)
   * - 'danger': var(--ds-icon-danger)
   * - 'warning': var(--ds-icon-warning)
   * - 'success': var(--ds-icon-success)
   * - 'disabled': var(--ds-icon-disabled)
   * - 'inverse': var(--ds-icon-inverse)
   */
  color?: 'default' | 'subtle' | 'selected' | 'danger' | 'warning' | 'success' | 'disabled' | 'inverse';

  /**
   * Accessibility label (required unless aria-hidden).
   */
  label?: string;

  /**
   * Hide from screen readers (optional).
   */
  ariaHidden?: boolean;

  /**
   * The <svg> or icon component to wrap.
   */
  children: ReactNode;
}
```

**Implementation:**
```typescript
export const CatalystIconWrapper = ({
  size,
  color = 'default',
  label,
  ariaHidden,
  children,
}: CatalystIconWrapperProps) => {
  // Validate size
  if (![16, 24, 32].includes(size)) {
    console.error(`CatalystIconWrapper: invalid size ${size}. Must be 16, 24, or 32.`);
  }

  // Token map
  const colorMap: Record<string, string> = {
    default: 'var(--ds-icon)',
    subtle: 'var(--ds-icon-subtle)',
    selected: 'var(--ds-icon-selected)',
    danger: 'var(--ds-icon-danger)',
    warning: 'var(--ds-icon-warning)',
    success: 'var(--ds-icon-success)',
    disabled: 'var(--ds-icon-disabled)',
    inverse: 'var(--ds-icon-inverse)',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        color: colorMap[color],
      }}
      aria-label={label}
      aria-hidden={ariaHidden}
      role={ariaHidden ? 'presentation' : undefined}
    >
      {children}
    </span>
  );
};
```

**Styling:**
- `display: inline-flex` + center alignment
- Width/height: size px (no variation)
- `flex-shrink: 0` (prevent squishing)
- `color: <token>` (inherited by currentColor in SVG)
- Stroke weight: 1.5px uniform (ADS spec, applied via SVG)
- NO background, NO border-radius on wrapper (context provides)

---

## STEP 1: Fix icons.registry.ts

**Search for all hex fallbacks:**
```bash
grep -n "color:" src/shared/icons/icons.registry.ts | grep "#"
```

**For each entry:**
1. Look up hex in `references/ads-token-map.md`
2. Replace: `color: '#44546F'` → `color: 'var(--ds-icon-subtle, #44546F)'`
3. Use fallback (original hex) inside the token call

**Example:**
```typescript
// BEFORE
icon: {
  color: '#44546F',
  size: 16,
}

// AFTER
icon: {
  color: 'var(--ds-icon-subtle, #44546F)',
  size: 16,
}
```

---

## STEP 2: Fix SVG Source Files

**Find all hardcoded fill/stroke:**
```bash
grep -rln 'fill="#\|stroke="#' src/
```

**For each file:**
1. Replace `fill="#XXXXXX"` → `fill="currentColor"`
2. Replace `stroke="#XXXXXX"` → `stroke="currentColor"`
3. Keep `fill="none"` (transparent/outlined paths)

**Example:**
```svg
<!-- BEFORE -->
<svg>
  <path fill="#44546F" d="M..."/>
  <path stroke="#091e4224" d="M..."/>
</svg>

<!-- AFTER -->
<svg>
  <path fill="currentColor" d="M..."/>
  <path stroke="currentColor" d="M..."/>
</svg>
```

---

## STEP 3: Create CatalystIconWrapper

Create: `src/components/shared/CatalystIconWrapper.tsx`

Implementation provided above. Key points:
- Size validation (16|24|32 only)
- Color token map (8 semantic colors)
- Flex container for alignment
- currentColor inheritance for SVG fill/stroke
- Accessibility labels + aria-hidden support
- Stroke weight: 1.5px (via SVG, not wrapper)

---

## STEP 4: Migrate Existing Icon Usages

**Find raw SVG usages:**
```bash
grep -rn "<svg\|<Icon" src/components src/modules src/features --include="*.tsx" | head -20
```

**Replace with CatalystIconWrapper:**

```typescript
// BEFORE
<svg width={16} height={16} viewBox="0 0 16 16">
  <path fill="#44546F" d="M..."/>
</svg>

// AFTER
<CatalystIconWrapper size={16} color="subtle" label="icon description">
  <MyIconSvg />
</CatalystIconWrapper>
```

Focus on high-impact locations:
- Navigation icons (left rail, top nav)
- Issue type icons (issue rows)
- Status icons (badges, lozenges)
- Action icons (buttons, toolbars)

---

## STEP 5: Verify Dark Mode Visibility

**For the 19 icons identified as dark-mode invisible:**

1. Confirm they now use `currentColor` via wrapper
2. Check contrast ratio: icon color vs surface ≥ 3:1
3. Capture dark mode screenshots showing icons visible
4. Test with color blindness simulator (optional but recommended)

---

## SCREENSHOT CHECKLIST

- [ ] Light mode icon set (nav, issue types, actions) before fix
- [ ] Light mode icon set after fix (same icons, tokens applied)
- [ ] Dark mode icon set before fix (icons may be invisible/low-contrast)
- [ ] Dark mode icon set after fix (all icons visible and readable)
- [ ] Navigation icons in dark mode (contrast validation)
- [ ] Issue type icons in dark mode (visible on dark surface)
- [ ] Accessibility check (focus rings work on icon buttons)

---

## VALIDATION COMMANDS

```bash
# Color violation count (should drop from 25+28=53):
npm run audit:colors

# Contrast audit (icons must have ≥3:1 ratio on surface):
npm run audit:contrast

# No syntax errors:
npx tsc --noEmit -p tsconfig.app.json

# Test icon rendering:
# Open Storybook or live app, verify all icons visible in light/dark mode

# Screenshot validation:
# See PHASE-0-EXECUTION-CHECKLIST.md for dark mode process
```

---

## STOP CONDITIONS

Stop and raise RED FLAG if:

- Icons still invisible in dark mode after wrapper migration
- Contrast audit fails for any icon
- More than 5 SVG files cannot be fixed (missing currentColor)
- SVG stroke weight is inconsistent (not 1.5px)
- Phase 5 gate did not pass (cannot proceed)

RED FLAG format:
```
RED FLAG:
1. <What blocks icon fix>
2. <Why (missing currentColor, contrast failure, etc.)>
3. <Evidence (screenshots, audit output)>
4. <Safer option>
5. <Decision needed>
```

---

## REQUIRED OUTPUTS

1. **CatalystIconWrapper.tsx**
   - New canonical component (provided above)
   - Full implementation with validation

2. **phase10-registry-diff.md**
   - icons.registry.ts changes
   - Before/after token replacements

3. **phase10-svg-manifest.md**
   - List of 28 SVG files changed
   - fill/stroke replacements per file

4. **phase10-migration-log.md**
   - Components migrated to CatalystIconWrapper
   - Locations, before/after usage patterns

5. **Dark mode screenshots**
   - Icon visibility before + after
   - Navigation, issue types, actions
   - Saved to: audits/ads-parity/screenshots/phase10-dark-before-after/

6. **Audit outputs**
   - npm run audit:colors result (53 violations eliminated)
   - npm run audit:contrast result (contrast passes)

---

## GATE REQUIREMENTS

**Phase 10 PASS criteria:**

- ✅ CatalystIconWrapper created and exported
- ✅ icons.registry.ts hex count drops to 0
- ✅ All 28 SVG files use currentColor
- ✅ All icons visible in dark mode
- ✅ Icon contrast passes (≥3:1 on surface)
- ✅ All 6 required outputs completed

**If gate fails:** Do not merge. Continue Phase 10 or request rebaseline.

---

## REFERENCE IMPLEMENTATION

CatalystStatusPill (existing canonical component) already follows this pattern:
- Uses tokens for all colors
- Handles light/dark mode
- Provides prop-based semantic options
- Use this as reference for similar patterns

---

## APPROVAL

**Status:** PENDING (awaiting Phase 5 gate pass)

After Phase 5 passes with <600 hex count → Phase 10 can start (parallel with Phase 7).
