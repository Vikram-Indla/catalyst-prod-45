# Expected Findings Summary — Baseline Evidence Analysis

**Document:** Projected audit findings based on Catalyst's current state  
**Date:** 2026-06-28  
**Feature:** CAT-DESIGN-ADS-PARITY-20260628-001  
**Scope:** Phase 0 baseline → expected findings to guide Phases 5–10 implementation

---

## EXECUTIVE SUMMARY

Based on Catalyst's existing codebase audit patterns and ADS compliance enforcement via `ads-color-gate.cjs`, we expect to find:

- **~85 hardcoded color violations** (current baseline in color gate: 709)
- **Dark mode surface flattening** (no visual separation between nav/page/cards)
- **Icon visibility issues in dark mode** (reduced opacity or insufficient contrast)
- **Typography density mismatches** (row heights ~2–4px off from Jira)
- **Spacing inconsistencies** (~15–20% of gaps not on 8px grid)
- **~12–18 canonical component gaps** (custom-built UI instead of canonical)

**Critical Finding:** Dark mode is likely the highest-cost fix (40+ files, 2+ hour slices).

---

## SECTION 1: EXPECTED CSS DEVIATIONS BY CATEGORY

### 1.1 Token and Theme

#### Expected Finding: Light/Dark Mode Provider Not Fully Wired
**Hypothesis:** Catalyst's theme provider correctly switches CSS variables, but some components have hardcoded color fallbacks.

**Evidence to look for:**
- CSS variable fallbacks with hex colors: `var(--ds-background-neutral, #F7F8F9)`
- Inline styles with hardcoded colors on specific components
- Tailwind color utilities in component files (`bg-slate-100`, `text-gray-500`)

**Quantified Expectation:**
- ~5–10 files with hardcoded fallbacks
- ~20–30 instances of Tailwind color utilities in src/components/

**Catalyst Impact:** Surfaces may not respond correctly to theme changes; dark mode may render stale light-mode colors initially.

#### Expected Finding: No Fallback to Raw RGB/HSL
**Hypothesis:** Unlikely — Catalyst has been strict about token-first approach since CLAUDE.md enforcement.

**Quantified Expectation:** 0–2 files (rare)

---

### 1.2 Light Surface Hierarchy

#### Expected Finding: Page + Nav + Cards Use Same or Similar Backgrounds
**Hypothesis:** Catalyst likely uses `var(--ds-surface)` for all elevated surfaces, lacking the depth hierarchy Jira uses.

**Evidence to look for in screenshots:**
- Page background: white (#FFFFFF)
- Nav background: white (#FFFFFF) — **same as page** (should be `var(--ds-surface-raised)` or darker)
- Card backgrounds: white (#FFFFFF) — **same as page** (should be `var(--ds-surface-raised)`)
- Sunken areas (inputs, selected rows): no clear color change visible

**Visual Impact:**
- Surfaces appear "flat" — no visual depth cues
- User cannot distinguish card boundaries without borders
- Low visual hierarchy despite correct structure

**Jira Reference:**
- Page: `var(--ds-surface)` = RGB(255, 255, 255)
- Nav: Often `var(--ds-surface-raised)` or solid color bar
- Card: `var(--ds-surface-raised)` = RGB(255, 255, 255) but with box shadow or border for depth
- Input/selected: `var(--ds-surface-sunken)` = RGB(247, 248, 249) (slightly gray)

**Catalyst Impact:** Loss of visual hierarchy makes complex pages harder to scan. Medium-severity issue; fixable with selective token upgrades.

#### Expected Finding: Hover States Use Arbitrary Colors
**Hypothesis:** List item hover might use #F5F5F5 or #FAFAFA instead of `var(--ds-background-neutral)` or `var(--ds-background-selected)`.

**Evidence to look for:**
- Hover background-color extraction shows hex like #F5F5F5, #F8F8F8
- Should be: `var(--ds-background-neutral)` = RGB(244, 245, 247) or `var(--ds-background-selected)` = RGB(222, 235, 255)

**Quantified Expectation:** 3–5 component files with custom hover colors

**Catalyst Impact:** Deviates from ADS; may not meet contrast or accessibility standards in dark mode.

---

### 1.3 Dark Surface & Hierarchy

#### Expected Finding: All Dark Surfaces Same Color (Flattening)
**Hypothesis:** Catalyst's dark mode CSS variables work, but the *intended values* may not follow ADS hierarchy. All surfaces render in same dark gray (~#1F1F1F or #22272E).

**Evidence to look for in dark mode screenshots:**
- Page background: #22272E (or similar dark)
- Nav background: #22272E (same as page — **ISSUE**)
- Cards: #22272E (same as page — **ISSUE**)
- Hover state: slightly lighter #282E38 — barely visible
- Selected state: harder to distinguish

**Visual Impact:**
- Surfaces visually flatten into one color
- No visual hierarchy; users lose context quickly
- Appears unfinished or poorly designed

**Jira Reference (Dark Mode):**
- Page/content: `var(--ds-surface)` = #22272E
- Nav: Often darker #161B22 or strategic brand color
- Cards/raised: `var(--ds-surface-raised)` = #2D333B (perceptibly lighter)
- Hover: `var(--ds-background-neutral)` = #2D333B or #373F47 (distinguishable)
- Selected: `var(--ds-background-selected)` = #22272E with blue tint/overlay

**Catalyst Impact:** **HIGHEST SEVERITY** — Dark mode unusable without fixing. Requires redesign of surface token values or strategic use of borders/shadows.

**Estimated Fix Cost:** 15–20 component files, 2–3 hours

#### Expected Finding: Icons Muted in Dark Mode
**Hypothesis:** Icons either reduced opacity (`opacity: 0.6`) or use a muted color instead of full-saturation icon color.

**Evidence to look for:**
- Icon computed color shows reduced opacity or desaturation
- Icons appear harder to read than Jira reference
- Secondary actions nearly invisible

**Visual Impact:** Secondary actions hard to find; usability degradation in dark mode.

**Estimated Fix Cost:** 5–8 files (icon wrapper component + selective icon color fixes)

---

### 1.4 Typography

#### Expected Finding: Font Sizes Off by 1–2px
**Hypothesis:** Most likely in heading level or list item label sizes. Catalyst may use 15px where Jira uses 14px, or 19px vs 20px.

**Evidence to look for:**
- Body text: Should be 14px, likely is 14px ✓
- Secondary text: Should be 12px, may be 12px or 13px
- Heading (h2/page title): Should be 20px or 24px, may be 19px or 23px
- List item label: Should be 14px, may be 15px or 13px

**Quantified Expectation:** 3–5 instances of 1–2px deviations

**Visual Impact:** Subtle but perceptible; affects scannability. Low severity but noticeable when side-by-side.

**Estimated Fix Cost:** 2–4 files, < 30 min

#### Expected Finding: Font Weight Inconsistent
**Hypothesis:** Unlikely — ADS token enforcement should catch this. But some components may use `font-weight: 600` instead of `font-weight: 500`.

**Quantified Expectation:** 1–3 files

#### Expected Finding: Line Height Off
**Hypothesis:** Catalyst may use `line-height: 1.5` where Jira uses `line-height: 1.43` (or vice versa).

**Evidence to look for:**
- Computed line-height extraction shows 1.5, 1.6 instead of 1.43, 1.5
- Row heights visually tighter or looser than Jira

**Quantified Expectation:** 2–4 component files

---

### 1.5 Spacing (8px Grid)

#### Expected Finding: ~15–20% of Gaps Not on 8px Grid
**Hypothesis:** Catalyst likely has some off-grid spacing, especially in custom components or older code.

**Evidence to look for:**
- Padding values: 10px, 12px, 14px, 15px instead of 8, 16, 24, 32
- Margin values: 6px, 10px instead of 8, 12
- Gaps between list items: 6px, 10px instead of 8, 12

**Quantified Expectation:**
- ~8–12 files with off-grid spacing
- ~20–30 distinct off-grid values

**Visual Impact:** Cumulative; surfaces appear slightly off-balance. Low individual severity but medium cumulative effect.

**Estimated Fix Cost:** 2–3 files per slice, 4–6 hours total

#### Expected Finding: Nav/Rail Heights and Widths Off
**Hypothesis:** Nav height probably correct (56px is standard), but rail width may be 230px instead of standard 240px or 248px.

**Evidence to look for:**
- Nav height: Should be 56px, likely is 56px ✓
- Rail width: Should be 240px or 256px, may be 230px or 248px
- Row height in lists: Should be 48px (Jira standard), may be 44px or 50px

**Quantified Expectation:** 1–2 dimensions off by 4–8px

---

### 1.6 Iconography

#### Expected Finding: Icons Use Canonical Source
**Hypothesis:** Catalyst likely uses correct icon library (`@atlaskit/icons` or similar), but sizing or color wrapping may be custom.

**Evidence to look for:**
- Icon source is correct (not custom SVG)
- Icon wrapper applies consistent sizing
- Icon color is tokenized (uses `var(--ds-icon)`, not hardcoded)

**Quantified Expectation:** Unlikely issue; probably passing. But 1–2 custom icon wrappers may exist.

#### Expected Finding: Icon Colors Not Tokenized in Dark Mode
**Hypothesis:** Some icon colors may use hardcoded values instead of `var(--ds-icon)`, causing visibility issues in dark mode.

**Evidence to look for:**
- Icon computed color shows hardcoded #666 instead of `var(--ds-icon)`
- Icons appear muted or hard to see in dark mode

**Quantified Expectation:** 2–5 component files

---

### 1.7 Status / Badge / Lozenge

#### Expected Finding: Not Using Canonical Components
**Hypothesis:** Catalyst may have custom status pill or badge implementation instead of using `CatyStatusPill` or `@atlaskit/badge`.

**Evidence to look for in screenshots:**
- Status pills render but may have wrong colors (non-ADS tokens)
- Badges may be custom-built divs instead of components
- Lozenge colors may not match ADS palette

**Quantified Expectation:** 1–3 custom implementations found during Phase 1 (component discovery)

**Visual Impact:** Inconsistent appearance with Jira; may fail dark mode contrast.

#### Expected Finding: Colors Not ADS Tokens
**Hypothesis:** Status pill or badge colors likely hardcoded or using old color constants.

**Evidence to look for:**
- Background color: hardcoded #DEEAFF or #F3F0FF instead of `var(--ds-background-selected)` or `var(--ds-background-information)`
- Text color: hardcoded #0052CC instead of `var(--ds-text-information)` or `var(--ds-text-selected)`

**Quantified Expectation:** 2–4 status/badge files with hardcoded colors

---

### 1.8 Behavior & Accessibility

#### Expected Finding: Dark Mode Contrast Failures
**Hypothesis:** Secondary text in dark mode likely fails WCAG AA (4.5:1) for normal text.

**Evidence to look for:**
- Secondary text color: `var(--ds-text-subtle)` = #626F86
- On dark background #22272E
- Contrast ratio: (L1 + 0.05) / (L2 + 0.05) = likely 2.5:1–3.5:1 (fails)

**Quantified Expectation:** 3–5 text elements fail contrast in dark mode

**Catalyst Impact:** Accessibility failure; WCAG AA non-compliant in dark mode.

**Estimated Fix Cost:** Redesign secondary text color token for dark mode; 1–2 hours

#### Expected Finding: Focus Rings Not Visible or Incorrect
**Hypothesis:** Unlikely major issue if using ADS components, but custom input/button wrappers may have incorrect focus styles.

**Evidence to look for:**
- Focus ring color: Should use `var(--ds-border-focused)` (blue ring)
- Focus ring may be missing or use hardcoded color

**Quantified Expectation:** 1–2 custom input/button wrappers with focus issues

#### Expected Finding: Component State Rendering Inconsistent
**Hypothesis:** Unlikely if using canonical components, but rare custom wrappers may render differently based on unexpected conditions.

**Quantified Expectation:** 0–1 instances

---

## SECTION 2: EXPECTED CANONICAL COMPONENT GAPS

Based on Catalyst's architecture and typical modern React apps, we expect:

### 2.1 Components Likely Using Canonical ADS
- Navigation (top bar) — likely `@atlaskit/navigation`
- Tabs — likely `@atlaskit/tabs`
- Buttons — likely `@atlaskit/button`
- Icons — likely `@atlaskit/icons`
- Dropdowns — likely `@atlaskit/dropdown-menu`
- Select — likely `@atlaskit/select`

### 2.2 Components Likely Custom-Built (Expected Gaps)
1. **Status Pill** — custom div with hardcoded color (should use `CatyStatusPill` or `@atlaskit/badge`)
2. **List Item Row** — custom wrapper (should use `JiraTable` or `@atlaskit/table`)
3. **Page Header** — custom wrapper (likely OK; can be wrapper over canonical)
4. **Empty State** — custom component (should use `@atlaskit/empty-state`)
5. **Loading Skeleton** — custom or old library (should use `@atlaskit/skeleton`)
6. **Tooltip** — custom or old `react-tooltip` (should use `@atlaskit/tooltip`)
7. **Modal** — may be custom (should use `@atlaskit/modal-dialog`)
8. **Drawer** — may be custom (should use `@atlaskit/drawer`)

### 2.3 Duplicates Expected
1. **Two status pill implementations** — one in legacy code, one in new surfaces
2. **Multiple empty states** — generic, no-results, error variants not unified
3. **Tab variations** — different styling for different tab contexts

---

## SECTION 3: EXPECTED DARK MODE SURFACE COLOR MAPPING

### Hypothesis: Current Catalyst Dark Mode
```
Page:     var(--ds-surface)        = #22272E (Jira standard)
Nav:      var(--ds-surface)        = #22272E ← ISSUE: should be darker or elevated
Card:     var(--ds-surface)        = #22272E ← ISSUE: should use var(--ds-surface-raised)
Input:    var(--ds-surface-sunken) = #161B22 ← probably correct
Hover:    var(--ds-background-neutral) = #2D333B ← probably correct but hard to see
Selected: var(--ds-background-selected) = depends; may be insufficient contrast
```

### Expected Jira Dark Mode (Reference)
```
Page:     var(--ds-surface)        = #22272E
Nav:      Strategic dark brand     = #161B22 or product-specific color
Card:     var(--ds-surface-raised) = #2D333B (clearly lighter than page)
Input:    var(--ds-surface-sunken) = #161B22
Hover:    var(--ds-background-neutral) = #2D333B–#373F47 (clearly visible)
Selected: var(--ds-background-selected) = #22272E + blue overlay/border
```

### Quantified Expectation
- **Catalyst** will have same color for page/nav/cards
- **Jira** will have 3–4 visually distinct surface levels
- Requires redesign or selective token value changes

---

## SECTION 4: EXPECTED COLOR BASELINE EXTRACTION

### Light Mode Expected Colors

| Element | Category | Expected (Jira) | Likely (Catalyst) | Deviation |
|---------|----------|---|---|---|
| Page BG | Surface | #FFFFFF | #FFFFFF | None ✓ |
| Nav BG | Surface | #FFFFFF or brand | #FFFFFF | May be missing depth |
| Card BG | Surface | #FFFFFF + shadow | #FFFFFF flat | Missing shadow/border |
| Primary Text | Text | #172B4D | #172B4D or #1F2937 | May be darker |
| Secondary Text | Text | #626F86 | #6B7280 or #626F86 | Likely OK ✓ |
| Subtle Text | Text | #738496 | #9CA3AF or #738496 | May be lighter |
| Icon Color | Icon | #172B4D | #374151 or #172B4D | May be desaturated |
| Hover BG | Interactive | #F7F8F9 | #F5F5F5 or #F3F3F3 | Off 2–4px in tone |
| Border | Border | #D3D8E3 | #E5E7EB or #D3D8E3 | May use Tailwind gray |
| Shadow | Elevation | 0 1px 1px rgba(9,30,66,0.13) | similar, may be less saturation | Likely OK ✓ |

### Dark Mode Expected Colors

| Element | Category | Expected (Jira) | Likely (Catalyst) | Deviation |
|---------|----------|---|---|---|
| Page BG | Surface | #22272E | #22272E | OK ✓ |
| Nav BG | Surface | #161B22 (darker) | #22272E (same as page) | **CRITICAL** |
| Card BG | Surface | #2D333B (raised) | #22272E (same as page) | **CRITICAL** |
| Primary Text | Text | #FFFFFF | #FFFFFF | OK ✓ |
| Secondary Text | Text | #B6C4D0 | #9CA3AF (lighter, low contrast) | **FAILS WCAG AA** |
| Subtle Text | Text | #738496 | #6B7280 or #738496 | May fail contrast |
| Icon Color | Icon | #B6C4D0 (light) | #9CA3AF (muted) | Reduced visibility |
| Hover BG | Interactive | #2D333B or #373F47 | #2D333B (hard to see) | Barely distinguishable |
| Border | Border | #2D333B | #374151 | Harder to see |
| Shadow | Elevation | Stronger (inverted) | May be weak | Missing depth cues |

---

## SECTION 5: EXPECTED FINDINGS BY SEVERITY

### CRITICAL (Blocks Dark Mode)
1. Dark mode surfaces all same color (page/nav/card indistinguishable)
2. Dark mode secondary text fails WCAG AA contrast
3. Dark mode icons nearly invisible

**Estimated Files:** 15–20 component files + design token config  
**Estimated Effort:** 2–3 hour slices

### HIGH (Noticeable Deviation)
1. Hover states use arbitrary colors instead of ADS tokens
2. Icons in dark mode use muted colors or reduced opacity
3. Light mode surfaces lack depth hierarchy (no shadow/border distinction)

**Estimated Files:** 8–12 component files  
**Estimated Effort:** 2–3 slices

### MEDIUM (Technical Debt)
1. Typography off by 1–2px
2. Spacing not on 8px grid (15–20% of gaps)
3. Some components have hardcoded color fallbacks
4. Custom status pill/badge instead of canonical

**Estimated Files:** 10–15 component files  
**Estimated Effort:** 3–5 slices

### LOW (Polish)
1. Border colors use hardcoded values instead of tokens
2. Rare off-grid spacing (< 5% of gaps)
3. Icon sizing inconsistent in rare cases

**Estimated Files:** 3–5 component files  
**Estimated Effort:** 1–2 slices

---

## SECTION 6: EXPECTED HARD-CODED COLOR INSTANCES

### Current Baseline (from CAT-ADS-COMPLIANCE-20260627-001)
- **Baseline count:** 709 hardcoded colors (ratchet gate set)
- **Expected reduction from audit:** 50–100 violations fixed in Phases 5–10

### Expected Hardcoded Color Locations
1. **Tailwind utilities:** 20–30 instances (`bg-slate-100`, `text-gray-500`, etc.)
2. **Inline styles:** 10–15 instances (`style={{ color: '#666' }}`)
3. **CSS files:** 30–50 instances (hex or rgb/rgba fallbacks)
4. **Component prop defaults:** 5–10 instances (e.g., `color: '#F5F5F5'`)
5. **Theme/constant files:** 20–40 instances (old color maps not migrated)

### Expected Token Mapping After Audit
| Hardcoded Color | Target Token | Files Affected |
|---|---|---|
| #F7F8F9 | var(--ds-background-neutral) | 2–3 |
| #F3F0FF | var(--ds-background-information) | 1–2 |
| #DEEAFF | var(--ds-background-selected) | 1–2 |
| #E9F2FE | var(--ds-background-brand-subtle) | 1 |
| #626F86 | var(--ds-text-subtle) | 2–3 (dark mode) |
| #D3D8E3 | var(--ds-border) | 3–5 |
| #4BCE97 | var(--ds-background-success) | 1–2 |

---

## SECTION 7: SCREENSHOT MANIFEST TEMPLATE

**What will appear in baseline-evidence.md after capture:**

```markdown
# Screenshot Manifest — Phase 0 Baseline Capture

## Jira Reference Captures

| Theme | Viewport | File | Status | Notes |
|-------|----------|------|--------|-------|
| Light | 1440x900 | jira/light/LM-1440x900.png | ✓ Captured | For-you page, home state |
| Light | 1600x900 | jira/light/LM-1600x900.png | ✓ Captured | Tests rail overflow |
| Light | 1920x1080 | jira/light/LM-1920x1080.png | ✓ Captured | Wide layout, full HD |
| Dark | 1440x900 | jira/dark/DM-1440x900.png | ✓ Captured | Dark mode, surface hierarchy visible |
| Dark | 1600x900 | jira/dark/DM-1600x900.png | ✓ Captured | Dark mode, wider viewport |
| Dark | 1920x1080 | jira/dark/DM-1920x1080.png | ✓ Captured | Dark mode, full HD |

## Catalyst Baseline Captures

| Theme | Viewport | File | Status | Notes |
|-------|----------|------|--------|-------|
| Light | 1440x900 | catalyst/light/LM-1440x900.png | ✓ Captured | Current state |
| Light | 1600x900 | catalyst/light/LM-1600x900.png | ✓ Captured | Current state |
| Light | 1920x1080 | catalyst/light/LM-1920x1080.png | ✓ Captured | Current state |
| Dark | 1440x900 | catalyst/dark/DM-1440x900.png | ✓ Captured | Dark mode, ISSUE: surfaces appear same color |
| Dark | 1600x900 | catalyst/dark/DM-1600x900.png | ✓ Captured | Dark mode surfaces flattened |
| Dark | 1920x1080 | catalyst/dark/DM-1920x1080.png | ✓ Captured | Dark mode, lack of hierarchy visible at scale |

## CSS Extraction Status
- ✓ baseline-css-extraction.json created
- ✓ 24+ selectors extracted per surface (light + dark)
- ✓ Key color values documented
- ✓ Typography metrics captured
- ✓ Spacing measurements saved
```

---

## SECTION 8: SIGN-OFF CRITERIA

Phase 0 is complete when:

- [ ] All 12 screenshots captured and saved
- [ ] CSS extraction JSON created with > 20 key selectors per surface
- [ ] baseline-evidence.md written with manifest, observations, and preliminary findings
- [ ] Dark mode findings clearly document surface flattening issue (if present)
- [ ] Visual observations include specific pixel/color deviations (e.g., hover BG is #F5F5F5 vs Jira #F7F8F9)
- [ ] All files committed to git
- [ ] No assumptions; only screenshot/DOM-backed findings

**Phase 0 Success Metric:** Evidence is reproducible, complete, and ready to guide Phases 1–4.

---

## NEXT STEPS AFTER BASELINE

1. **Phase 1 — Component Discovery:** Scan repo for all 30 component categories
2. **Phase 2 — Compliance Checklist:** Run 160-point audit against ADS rules
3. **Phase 3 — Screenshot Diff:** Measure pixel differences and color deviations
4. **Phase 4 — Fix Strategy:** Synthesize all findings into 10-lane fix plan
5. **Phases 5–10:** Implement fixes with 2-hour timebox per slice

---

**Document Status:** BASELINE PROJECTIONS  
**Date:** 2026-06-28  
**Prepared for:** Phase 0 Evidence Capture Execution
