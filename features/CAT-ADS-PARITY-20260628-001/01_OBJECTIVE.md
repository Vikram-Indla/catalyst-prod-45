# Objective — CAT-ADS-PARITY-20260628-001

## What we're building

Five sequential compliance fixes to align Catalyst surfaces with Atlassian Design System (ADS) tokens, typography scale, spacing grid, canonical components, and accessibility standards.

### Phase 6: Light Surface Fix

Fix 3 failing light surface compliance checks (cards, row hover, row selected) by applying correct ADS surface tokens. Target: 95%+ audit pass (from 80%).

**Key changes:**
- Card backgrounds: `var(--ds-surface-raised)` (replace #FAFAFA, #fff, #FFFFFF, #F7F8F9)
- Row hover: `var(--ds-background-neutral-hovered)` (tokenize arbitrary colors)
- Row selected: `var(--ds-background-selected)` (tokenize)
- Verify left rail reads as sunken vs. main content area
- Verify dividers are visible against raised surfaces

**Validation:** `npm run audit:colors` — gate: all light mode surfaces pass (12/15 → 15/15)

---

### Phase 8: Typography Fix

Eliminate 100+ hardcoded px font-sizes and align to ADS type scale. Target: <80 violations (from 50% failing).

**Approved type scale:**
- Font sizes: 11 / 12 / 14 / 16 / 20 / 24 / 28 px
- Font weights: 400 / 500 / 600 / 700
- Line heights: 1.0 / 1.25 / 1.5 / 1.65
- Letter spacing: 0 (body) / 0.06em (ALL-CAPS labels only)

**Priority targets:** Chat components (highest violation density), Timeline, Task Modal, src/index.css global overrides.

**Validation:** `npm run audit:typography` — gate: count < 80

---

### Phase 9: Spacing Grid Fix

Align all spacing (padding, margin, gap, inset) to ADS 8px grid. Target: <400 violations (from 473+).

**Approved spacing scale:** 0 / 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 / 64 px (no others)

**Jira shell dimensions (non-negotiable):**
- Top nav height: 56px
- Left rail width: 240px (expanded) / 48px (collapsed)
- Search input height: 32px
- Issue row height: 40px (compact) / 48px (comfortable)

**Highest-impact target:** CatalystInput (67 components, 78% violations). Fix canonical; all 67 consumers inherit.

**Validation:** `npm run audit:spacing` — gate: count < 400

---

### Phase 11: Canonical Component Migration

Eliminate 9 duplicate shell, breadcrumb, header, form field components. Create 2 new canonical components (GlobalPageHeader, CatalystFormField). Migrate all consumers to canonical, delete deprecated.

**Keep (canonical):**
- AtlaskitPageShell
- GlobalBreadcrumb
- CatalystIconWrapper
- CatalystStatusPill
- CatalystInput

**Create (new canonical):**
- GlobalPageHeader (replaces SidebarHeader, MessagePanelHeader, DraftsAndSentHeader)
- CatalystFormField (replaces 142 orphaned label/input combos)

**Delete after migration:**
- ChatShell, ChatV2Shell
- BacklogBreadcrumb, CatalystBreadcrumbs
- SidebarHeader, MessagePanelHeader, DraftsAndSentHeader

**Validation:** `npm run audit:duplicates` — gate: 0 known deprecated imports; E2E suite passes

---

### Phase 13: Accessibility Fix

Fix all WCAG 2.2 Level A/AA violations: 23 files with missing focus rings, 50+ interactive divs without keyboard support, 40+ text contrast failures.

**Fix 1 — Missing Focus Rings (23 files):**
Replace `outline: none` with:
```css
&:focus-visible {
  outline: 2px solid var(--ds-border-focused, #0C66E4);
  outline-offset: 2px;
}
```

**Fix 2 — Interactive Divs (50+ files):**
- Convert to `<button>` when possible (preferred)
- Add ARIA role/tabIndex/onKeyDown when structure locks require it (fallback)

**Fix 3 — Text Contrast (40+ failures):**
- Upgrade --ds-text-subtlest → --ds-text-subtle where semantics allow
- Verify all normal text (< 18px) achieves ≥4.5:1
- Verify large text (≥ 18px) achieves ≥3:1

**Validation:** `npm run audit:a11y` — gate: focus ring count = 0, interactive div count = 0, contrast failure count = 0

---

## Why

Catalyst must maintain parity with Atlassian's design system to:
- Ensure consistent UX across Jira ecosystem
- Pass accessibility compliance audits (WCAG 2.2)
- Reduce maintenance debt from custom tokens/spacing/typography
- Enable Jira users to recognize Catalyst as native Jira experience
- Support dark mode contrast and visual hierarchy

---

## Acceptance criteria

- [ ] Phase 6: Light surface audit passes at 95%+ (15/15 checks)
- [ ] Phase 8: Typography violations < 80 (`npm run audit:typography`)
- [ ] Phase 9: Spacing violations < 400 (`npm run audit:spacing`)
- [ ] Phase 11: 0 duplicate deprecated components; E2E suite passes; GlobalPageHeader and CatalystFormField deployed
- [ ] Phase 13: Focus rings = 0, interactive divs = 0, contrast failures = 0 (`npm run audit:a11y`)
- [ ] All changes use ADS tokens only (no hardcoded colors, Tailwind utilities, or custom values)
- [ ] Screenshots validated for light + dark modes at 1440×900, 1920×1080
- [ ] All phases executed within 2-hour slices; no slice exceeds 2 hours
- [ ] No regressions in existing features (verified via E2E + manual smoke tests)

---

## Non-scope

- Rewriting Jira surfaces (Catalyst mirrors Jira; Jira is source of truth)
- Touching live production deployment until all gates pass
- Creating new features beyond the 2 new canonical components (GlobalPageHeader, CatalystFormField)
- Refactoring unrelated code (surgical changes only)
- Implementing hypothetical future requirements
