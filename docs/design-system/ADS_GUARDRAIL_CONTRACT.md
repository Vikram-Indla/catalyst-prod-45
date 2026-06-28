# ADS Guardrail Contract — Catalyst Design System

**Effective:** 2026-06-28  
**Enforced by:** Pre-commit hooks + GitHub Actions  
**Authority:** Vikram Indla + Design System Lead  

---

## Canonical Enforcement

### 1. Color Tokens Are Mandatory

**Rule:** All UI colors must use ADS tokens, never raw hex/rgb/hsl.

**Allowed:**
- `color: var(--ds-text-subtle);` ✅
- `background: var(--ds-surface);` ✅
- `@atlaskit/lozenge` (component-owned) ✅
- Documented escape hatch: `/* ads-scanner:ignore-next-line — Jira parity [CAT-ADS-GAP-001] */` ✅

**Banned:**
- `color: #44546F;` ❌
- `background: rgb(44, 54, 111);` ❌
- `bg-slate-100` (Tailwind utility) ❌
- `style={{ color: 'red' }}` ❌
- Hex fallbacks in tokens: `var(--ds-text, #44546F)` ❌

**Ratchet Baseline:** 20 hardcoded color violations (Phase 5 result, can only decrease)

**Enforcement:**
- Pre-commit: `npm run lint:colors:gate` blocks if count > baseline
- CI: `npm run lint:colors:gate` blocks PR merge if count > baseline
- Escape hatch requires issue CAT-ADS-GAP-XXX with documented reason

---

### 2. Canonical Components Are Mandatory

**Rule:** Use Catalyst/ADS canonical components, never hand-rolled.

**By category:**

| Category | Canonical | Why |
|----------|-----------|-----|
| Buttons | `@atlaskit/button` or `CatyButton` | Type-safe, accessible, token-aware |
| Status badges | `CatalystStatusPill` | 100% canonical, GOLD STANDARD |
| Icons | `CatalystIconWrapper` | Size-constrained (16/24/32), color-tokenized |
| Tables | `JiraTable` (work items) | Mandatory for Jira parity; fallback `@atlaskit/dynamic-table` |
| Modals | `@atlaskit/modal-dialog` | Accessible, token-aware, dismissible |
| Dropdowns | `@atlaskit/select` | Keyboard support, theme-aware |
| Tabs | `@atlaskit/tabs` | Accessible, canonical |
| Lozenges | `@atlaskit/lozenge` | Color token support, component-owned |
| Badges | `@atlaskit/badge` | Component-owned styling |
| Tooltips | `@atlaskit/tooltip` | Accessible, arrow/offset control |
| Date pickers | `@atlaskit/datetime-picker` | Calendar, time, range support |

**Proof of unsuitability required** for any hand-rolled component. Escalate to Vikram if canonical option doesn't fit exact requirements.

**Enforcement:**
- Code review: Reject hand-rolled buttons, badges, status pills, tables, modals, dropdowns
- Architecture: Flag any new wrapper over canonical component (suggests canonical gap)

---

### 3. Dark Mode Is Mandatory

**Rule:** All UI must work identically in light and dark mode.

**Surface hierarchy (dark mode — must be visually distinct, ≥10 lum points apart):**
- Level 1 (darkest): `var(--ds-surface)` — page background
- Level 2: `var(--ds-surface-overlay)` — floating elements (sidebar, nav overlay)
- Level 3: `var(--ds-elevation-surface-raised)` — cards, panels, modals
- Level 4: `var(--ds-background-input)` — input fields, form elements

**Requirements:**
- Surfaces must be visually distinguishable in dark mode (squint test)
- Text contrast must pass WCAG AA minimum: 4.5:1 for body text, 3:1 for UI elements
- Icons must remain visible
- Dividers must remain visible
- No invisible/flattened text in dark mode

**Testing:**
- UI changes require dark mode screenshots (1440×900 + 1920×1080)
- Screenshot comparison gate enforces parity with Jira dark mode

**Enforcement:**
- CI: `npm run audit:contrast` fails if any text < 4.5:1 or UI element < 3:1
- CR: Require dark mode screenshots for all UI changes
- Visual test: Screenshots committed to `test/snapshots/dark-mode/`

---

### 4. Accessibility Is Non-Negotiable

**Rule:** WCAG 2.2 Level A compliance minimum, Level AA where possible.

**Mandatory:**
- Focus rings on all focusable elements: use `@atlaskit/button` or `@focus-visible` with `outline: 2px solid var(--ds-border-focused);`
- Semantic HTML (no `<div onClick>` without `role="button"`)
- ARIA labels on icons: `<CatalystIconWrapper label="icon description" />`
- Form labels: `<label htmlFor="input-id">Label</label>` + `<input id="input-id" />`
- Contrast: Text ≥ 4.5:1, UI elements ≥ 3:1
- Keyboard navigation: Tab, Shift+Tab, Enter, Space, Arrow keys work
- Screen reader: Semantic elements, ARIA live regions for updates

**Banned:**
- `outline: none` without replacement focus indicator
- `<div onClick>` without role, tabindex, and keyboard handler
- Icons without aria-label or aria-hidden
- `tabIndex="-1"` on interactive elements
- Invisible text (0 opacity, hidden with `display: none`, off-canvas without purpose)
- Color-only information (must have text alternative)

**Enforcement:**
- Pre-commit: `npm run lint:accessibility` checks focus rings + semantic HTML
- CI: `npm run test:a11y` runs axe-core accessibility audit (WCAG 2.2 Level A)
- Code review: Challenge missing aria-labels, semantic violations

---

### 5. Spacing Uses 8px Grid Only

**Rule:** All spacing must align to 8px grid multiples (or officially-sanctioned exceptions).

**Allowed:** 4px (half grid), 8px, 16px, 24px, 32px, 40px, 48px

**Banned:** 6px, 10px, 13px, 14px, 15px, 20px, arbitrary spacing (unless documented with issue CAT-SPACING-XXX)

**Ratchet baseline:** Tracked in `audit-baseline.json.spacing` (currently 1,118 violations, can only decrease)

**Enforcement:**
- Ratchet baseline tracks off-grid violations
- Code review: Reject off-grid spacing
- Audit: `npm run audit:ads` flags off-grid spacing by category

---

### 6. Typography Is Canonical

**Rule:** Font sizes and weights must come from ADS token scale or be explicitly approved.

**Allowed:**
- `font-size: var(--ds-font-body);` ✅
- `font-size: var(--ds-font-heading-large);` ✅
- `font-weight: 600;` (from ADS scale) ✅
- Jira-parity font size (with escape hatch + issue) ✅

**Banned:**
- `font-size: 13px;` (arbitrary) ❌
- `font-weight: 500;` (off-spec) ❌
- `line-height: 1.3;` (arbitrary) ❌
- `letter-spacing: 0.02em;` (arbitrary) ❌

**Ratchet baseline:** Tracked in `audit-baseline.json.typography` (currently 2,133 violations, can only decrease)

**Enforcement:**
- Ratchet baseline tracks hardcoded font-size violations
- Code review: Challenge custom typography; require token reference
- Audit: `npm run audit:ads` flags typography violations

---

## Ratchet Baselines (Tracked, Can Only Decrease)

| Metric | Baseline | Unit | Direction | Last Updated | Phase |
|--------|----------|------|-----------|--------------|-------|
| Hardcoded hex colors | 20 | violations | ↓ only | 2026-06-28 | 5 |
| Typography violations | 2,133 | lines of code | ↓ only | 2026-06-28 | 5 |
| Spacing violations | 1,118 | lines of code | ↓ only | 2026-06-28 | 5 |
| Token usage | 27,531 | occurrences | ↑↓ free | 2026-06-28 | 5 |
| Contrast failures | 0 | violations | ↓ only | 2026-06-28 | 7 |
| Missing focus rings | 0 | violations | ↓ only | 2026-06-28 | 12 |
| Semantic HTML divs with onClick | 0 | violations | ↓ only | 2026-06-28 | 12 |

**Ratchet rules:**
- Baselines move down only (or stay same)
- Increases require PR block + Vikram approval + issue CAT-ADS-XXXXX
- Escape hatches documented with issue IDs: `/* ads-scanner:ignore-next-line — reason [CAT-ADS-GAP-001] */`
- Update baselines after each remediation slice: `npm run lint:colors:update-baseline` or `npm run audit:ads:update-baseline`

---

## Decision Framework

| Scenario | Decision | Who | Escalation |
|----------|----------|-----|------------|
| New color needed, not in ADS | Add to token map if possible; otherwise document gap (issue CAT-ADS-GAP-XXX) | Design Lead + PR author | Vikram |
| Can't fit spacing to 8px grid | Replan design; if impossible, justify + document + create CAT-SPACING-XXX | PR author | Vikram |
| Component unavoidable, not canonical | Proof of ADS/canonical unsuitability required (write design doc) | PR author | Vikram + Design review |
| Light/dark parity impossible | Document why, provide screenshots, create CAT-DARK-PARITY-XXX | PR author | Vikram |
| Accessibility exception needed | Document UX reason, propose alternative, create CAT-A11Y-XXXXX | PR author | Accessibility lead |

---

## Enforcement Gates

### Pre-commit (Local, Blocks Commit)
```bash
npm run lint:colors:gate       # Hardcoded colors (must be ≤20)
npm run audit:ads:gate         # ADS audit categories (must not increase)
npm run lint:accessibility     # Focus rings, semantic HTML
npx tsc --noEmit -p tsconfig.app.json  # TypeScript
```

### CI (PR, Blocks Merge)
```yaml
- npm run lint:colors:gate           # Color ratchet
- npm run audit:ads:gate             # ADS audit ratchet
- npm run audit:contrast             # WCAG AA contrast
- npm run test:a11y                  # Axe accessibility
- Screenshot diff gate (UI-heavy PRs)
- npm run test:visual                # Visual regression (dark + light)
```

### Release Checklist
- [ ] All ratchet baselines stable or decreased
- [ ] Zero escape hatches introduced without issues
- [ ] Dark mode screenshots approved
- [ ] Accessibility audit clean (Level A minimum)
- [ ] Component canonicity audit clean

---

## Guardrail Violations = Automatic Rejection

**No exceptions without written approval from Vikram.**

Violations that block commit/merge:
- New hardcoded colors (color gate fails) — fix or add escape hatch with issue
- New contrast failures (contrast gate fails) — rebalance tokens or replan surface
- New focus ring gaps (accessibility gate fails) — add focus handler or escalate
- New semantic HTML issues (accessibility gate fails) — use canonical component
- New off-grid spacing (ratchet gate fails) — grid-align or justify + issue
- Non-canonical components (code review blocks) — prove unsuitability or use canonical
- Increase in ratchet baseline (gate fails) — decrease, provide remediation plan, or escalate

---

## What Changed (Phases 5–12)

| Phase | Focus | Component | Result | Baseline Impact |
|-------|-------|-----------|--------|-----------------|
| 5 | Token Foundation | All | 709 → 20 hardcoded colors ✅ | colors: 20 |
| 6 | Light Surfaces | `CatalystStatusPill` + cards | Hierarchy established | – |
| 7 | Dark Surfaces | Surface tokens + contrast | Contrast fixed, surface hierarchy locked | contrast: 0 |
| 8 | Typography | Font scale + sizes | Standard scale defined | typography: 2,133 |
| 9 | Spacing Grid | 8px grid alignment | Grid enforcement | spacing: 1,118 |
| 10 | Icons | `CatalystIconWrapper` + registry | 25 registry + 28 SVG fixed | icons: GOLD ✅ |
| 11 | Component Canonicity | All hand-rolled review | Proof of unsuitability required | – |
| 12 | Guardrails | This contract + gates | All gates deployed, baselines locked | enforcement: LIVE ✅ |

---

## Governance

**Design System Lead:** 
- Owns token map and ADS mapping
- Maintains audit baselines and decision precedents
- Approves new canonical components
- Quarterly baseline review

**Vikram Indla:**
- Authority for guardrail exceptions
- Escalation point for design conflicts
- Approves non-canonical implementations
- Final decision on scope/trade-offs

**Team (All PR Authors):**
- Accountable for guardrail compliance
- Must understand and follow canonical hierarchy
- Escalate blockers early (don't patch)
- Document exceptions with issue IDs

---

## Support & Escalation

**Questions or blockers?**

1. Check `references/ads-token-map.md` for token definitions
2. Check `docs/design-system/CATALYST_CANONICAL_COMPONENTS.md` for component options
3. Check recent pull requests for precedent (what was approved before?)
4. Run `npm run lint:colors`, `npm run audit:ads`, `npm run audit:contrast` to see violations
5. Create an issue (`CAT-ADS-XXXXX`) and tag `@Vikram-Indla` for escalation

**Gate failures at CI?**
- `npm run lint:colors:gate` — hardcoded colors increased. Fix or add escape hatch + issue.
- `npm run audit:ads:gate` — ADS audit category increased. Decrease count or escalate.
- `npm run audit:contrast` — contrast < 4.5:1 (text) or < 3:1 (UI). Rebalance tokens or escalate.
- Screenshot diff — visual regression. Update snapshots or fix the design.

---

## Version History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-06-28 | Claude Code (Phase 12) | Initial guardrail contract + baseline initialization |

---

**Last Updated:** 2026-06-28  
**Next Review:** 2026-09-28 (quarterly baseline audit)  
**Contact:** Vikram Indla (@Vikram-Indla on Jira/GitHub)
