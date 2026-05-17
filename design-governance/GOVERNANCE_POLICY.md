# Catalyst Design System Governance Policy

**Version:** 1.0.0 | **Date:** 2026-05-18 | **Owner:** Vikram Indla

## Core Principles

1. **Atlassian Design System (ADS) v4 is the source of truth**
   - All components must use `@atlaskit/*` primitives
   - All tokens must resolve from `--ds-*` CSS variables
   - Raw hex colors and Tailwind classes are banned

2. **Typography Stack (Non-Negotiable)**
   - Font family: **Atlassian Sans (v4) Latin + Latin-ext** from CDN
   - Body: 14px / 400 / 1.5 line-height
   - Headings: 16–28px / 600 / sentence-case
   - Small text: 11–12px / 400 / secondary color

3. **Spacing Grid**
   - xs: 4px | sm: 8px | md: 16px | lg: 24px | xl: 32px
   - No hardcoded px values in component styles
   - Use token variables exclusively

4. **Component Rules**
   - All interactive elements: `@atlaskit/*`
   - All menus: `@atlaskit/dropdown-menu` (never hand-rolled)
   - All modals: `@atlaskit/modal-dialog`
   - All form inputs: `@atlaskit/textfield`, `@atlaskit/select`

## Banned Forever

### Components
- Story Points field
- MDT Ref field
- Assessment Feature field
- Service Now# field

### UI Patterns
- `text-transform: uppercase` on labels (sentence-case only)
- Hand-rolled menus/dropdowns without ARIA
- Hardcoded px spacing in inline styles
- Raw hex color literals (no `#RRGGBB`)

### Table Columns
- Standalone Type column (icon goes in Key cell only)
- Category column
- Space URL column
- Templates column

## Enforcement Mechanisms

1. **Pre-commit hook:** Runs ADS validator on staged files
2. **GitHub Actions CI:** Design system audit on every PR
3. **jira-compare:** Parity audit before merging to main
4. **design-critique:** Heuristic UX/UI scoring (≥22/30 to ship)

## Rollout Timeline

- **Phase 0 (2026-05-18):** Foundation + governance policy
- **Phase 1 (2026-05-18):** Audit validators (ADS token scanner, typography enforcer)
- **Phase 2 (2026-05-18):** GitHub Actions CI integration
- **Phase 3 (2026-05-18):** Design System CLI tool for developers
- **Phase 4 (2026-05-18):** Catalyst codebase audit + rollout

## Appendix: Font CDN Integration

Add this single line to `index.html <head>`:

```html
<link rel="preconnect" href="https://fonts.atlassian.com">
<link href="https://fonts.atlassian.com/fonts/atlassian-sans/v4/atlassian-sans.css" rel="stylesheet">
```

Set in global CSS:

```css
body, button, input, select, textarea {
  font-family: "Atlassian Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

---

**Approved by:** Vikram Indla | **Date:** 2026-05-18
