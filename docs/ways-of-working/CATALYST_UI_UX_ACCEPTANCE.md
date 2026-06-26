# CATALYST UI/UX ACCEPTANCE

> Screenshot requirements, forbidden visual patterns, ADS token rules, visual rejection conditions.

---

## SCREENSHOT REQUIREMENTS

**Screenshots are mandatory for UI/UX acceptance.**

Required for every:
- Visible layout change
- Color change
- Component swap
- New surface or route
- State change (loading, empty, error, populated)

Screenshots do **not** prove functionality. Use DOM probes, API responses, and DB query results for functional validation.

**No screenshot acceptance = no UI-heavy commit.**

### Required screenshot set per feature

| Screenshot | Contents |
|---|---|
| `01_reference.png` | Canonical reference (Jira / Storybook / existing Catalyst screen) |
| `02_implementation.png` | New implementation, same viewport |
| `03_dark_mode.png` | Dark mode render (reload-into-dark, not runtime toggle) |
| `04_empty_state.png` | Empty / zero-data state |
| `05_loading_state.png` | Loading / skeleton state |
| `06_error_state.png` | Error state |
| `07_regression_adjacent.png` | Adjacent UI that must not have regressed |

---

## REFERENCE VS IMPLEMENTATION COMPARISON

Before accepting any screenshot:

1. Load the reference screenshot
2. Load the implementation screenshot
3. Compare at the same viewport size
4. Check every visual element against ADS token requirements

Accept only when: colors match tokens, spacing matches ADS grid, typography matches ADS font vars, icons match canonical registry, components match Storybook stories.

---

## DARK MODE VERIFICATION

Dark mode must be verified by:
1. Reload the app into dark mode (system-level dark mode ON, then hard reload)
2. Screenshot the surface
3. Confirm no light-metaphor artifacts (white pills with shadows, neutral palette bleeding)

**Never verify dark mode by runtime toggle** — CSS-in-JS and emotion may give false white-glare results.

---

## FORBIDDEN VISUAL PATTERNS

These patterns fail acceptance automatically — no exceptions:

| Pattern | Why banned |
|---|---|
| Bare hex colors | ADS tokens only |
| Raw `rgb()` / `rgba()` / `hsl()` | ADS tokens only |
| Tailwind color utilities | ADS tokens only |
| Custom color constants (non-ADS) | ADS tokens only |
| Lime / bright green status colors | ADS semantic tokens only |
| Yellow/orange warning slabs | ADS warning tokens only |
| Rainbow borders on non-AI controls | AI CTA carve-out only |
| Spinning / rotating containers | Enterprise UI banned |
| Pulsing glows / neon outlines | Enterprise UI banned |
| Particle effects / AI aura | Enterprise UI banned |
| Text inside a rotating wrapper | Always banned |
| Hand-rolled table | JiraTable or @atlaskit/dynamic-table |
| Hand-rolled modal | @atlaskit/modal-dialog |
| Hand-rolled dropdown/menu | @atlaskit/dropdown-menu |
| Hand-rolled avatar | @atlaskit/avatar |
| Hand-rolled rich text editor | @atlaskit/editor-core |
| Arbitrary spacing (not 4/8/16/24/32px) | ADS spacing grid |
| Non-sentence-case labels | ADS convention |
| `text-transform: uppercase` on labels | ADS convention |

---

## ADS TOKEN RULES

Every color MUST use an ADS token:

| Use case | Required token |
|---|---|
| Page / module background | `var(--ds-surface, #FFFFFF)` |
| Elevated card / modal | `var(--ds-surface-overlay, #FFFFFF)` |
| Sunken / recessed | `var(--ds-surface-sunken, #F7F8F9)` |
| Neutral fill | `var(--ds-background-neutral, #F1F2F4)` |
| Row hover | `var(--ds-background-neutral-subtle-hovered, ...)` |
| Selected / active row | `var(--ds-background-selected, #E9F2FE)` — selection only |
| Primary text | `var(--ds-text, #172B4D)` |
| Subtle text | `var(--ds-text-subtle, #42526E)` |
| Subtlest text | `var(--ds-text-subtlest, #6B778C)` |
| Border | `var(--ds-border, #DFE1E6)` |
| Brand blue | `var(--ds-link, #0052CC)` |

---

## VISUAL REJECTION CONDITIONS

A screenshot is rejected if any of the following is true:

1. Any banned color pattern appears (hex, raw rgb, Tailwind color utility)
2. Any hand-rolled UI element appears
3. Spacing deviates from 4/8/16/24/32px grid without documented justification
4. Dark mode shows white glare, white pills, or neutral palette artifacts
5. Icon uses wrong canonical type (e.g., Feature icon for a Business Request)
6. Layout does not match the reference within acceptable tolerance
7. Adjacent UI shows regression (element moved, missing, or visually broken)
8. Loading/error/empty states are missing or use non-ADS patterns

A rejected screenshot requires a fix cycle — not a workaround or a "close enough" verbal acceptance.
