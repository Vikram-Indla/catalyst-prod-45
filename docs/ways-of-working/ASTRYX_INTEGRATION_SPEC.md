# Astryx Integration — Ring-Fenced Design System Boundary

**Date**: 2026-07-04  
**Status**: Phase 0–1 Complete (Readiness Assessment)  
**Phase 2**: Implementation Ready  
**Decision**: Ring-fenced adapter (NO global npm install)

---

## TL;DR

Astryx design system is integrated as a **scoped zone** for StrategyHub and Ideation ONLY, with NO global CSS pollution.

- **What**: `src/modules/strategy/astryx/` adapter
- **Where**: `/strategy/*` and `/ideas/*` routes only
- **How**: `<AstryxZone>` wrapper + CSS token mapping
- **Not touched**: CatalystShell, AdminLayout, global navigation, ADS wrappers
- **Why**: Astryx `:root` CSS variables collide with Catalyst ADS tokens

---

## Decision: WHY Ring-Fenced, NOT Global

### Astryx Package Analysis

| Finding | Astryx | Risk |
|---------|--------|------|
| CSS distribution | `@astryxdesign/core/dist/astryx.css` | `:root` variables (global scope) |
| Variable pollution | 50+ CSS vars at `:root` level | Overwrites `--color-*`, `--font-*`, `--spacing-*` globally |
| Theme scoping | `@scope([data-astryx-theme="neutral"])` | Scoped correctly, but `:root` leaks first |
| Compatibility | Light mode only (neutral theme) | Dark mode deferred |

**Rejection reason**: `:root` variables pollute global scope → collision with Catalyst's ADS tokens, Tailwind CSS vars, and existing light/dark mode system.

---

## Architecture

### Folder Structure

```
src/modules/strategy/astryx/
  ├── index.ts                           # Barrel export
  ├── AstryxProvider.tsx                 # <AstryxZone> wrapper
  ├── AstryCSSScope.module.css          # Scoped CSS boundary
  ├── useAstryxTheme.ts                 # Theme bridge hook
  ├── components/                        # (Optional) Astryx wrappers
  │   ├── AstryxButton.tsx
  │   └── AstryxCard.tsx
  └── config/
      └── astryx-token-map.ts           # ADS ↔ Astryx token mapping
```

### Mount Points

```tsx
// src/routes/FullAppRoutes.tsx

<Route path="/strategy/*" element={
  <AstryxZone>
    <StrategyHubPages />
  </AstryxZone>
} />

<Route path="/ideas/*" element={
  <AstryxZone>
    <IdeationPages />
  </AstryxZone>
} />
```

**NOT mounted**:
- CatalystShell (root layout)
- CatalystHeader (top nav)
- AdminLayout (admin routes)
- Global navigation (side nav)

### Token Bridging

```
Astryx Design Token
    ↓
AstryxZone CSS var mapping
    ↓
Catalyst ADS Token (--ds-*)
    ↓
Rendered value (light mode)
```

Example:

```css
/* AstryCSSScope.module.css */
.astryx-zone {
  --color-text-primary: var(--ds-text, #0a1317);
  --color-background-body: var(--ds-surface-sunken, #f1f4f7);
}
```

---

## Implementation Checklist

- [x] Phase 0 — Repo discovery (complete)
- [x] Phase 1 — Package safety audit (complete)
- [x] Phase 2 — Adapter structure created
- [ ] Phase 3 — Token mapping validation
- [ ] Phase 4 — Route integration (FullAppRoutes.tsx update)
- [ ] Phase 5 — Visual regression test (npm run test:visual)
- [ ] Phase 6 — Dark mode bridge (deferred, Phase 2+)

---

## Testing Strategy

### Visual Regression (Light Mode Only)

```bash
# Test Astryx zone against baseline
npm run test:visual -- --grep "astryx-zone"

# Test Catalyst surfaces for regression
npm run test:visual -- --grep "catalyst-shell|admin-layout|nav"
```

### Token Validation

```bash
# Verify no Astryx CSS leaks globally
npm run lint:colors

# Run ADS audit
npm run audit:ads
```

### Manual Testing Checklist

- [ ] Load StrategyHub route → Astryx zone applies
- [ ] Load Ideation route → Astryx zone applies
- [ ] Load Project Hub → NO Astryx styling (regression check)
- [ ] Load Admin routes → NO Astryx styling (regression check)
- [ ] Dark mode toggle → Catalyst theme unaffected
- [ ] Light mode in Astryx zone → tokens map correctly

---

## Dark Mode (Deferred)

Currently light-mode-first. Dark mode support added later.

When implemented:

```css
/* AstryCSSScope.module.css */
@media (prefers-color-scheme: dark) {
  .astryx-zone {
    --color-text-primary: var(--ds-text-dark, #dfe2e5);
    --color-background-body: var(--ds-surface-sunken-dark, #111112);
    /* etc. */
  }
}
```

---

## Troubleshooting

### "Astryx styles not applying"
- Verify `<AstryxZone>` wraps the component tree
- Check `data-astryx-theme="neutral"` on zone element
- Inspect computed styles: `getComputedStyle(element).getPropertyValue('--color-text-primary')`

### "Catalyst styles bleeding into Astryx zone"
- Increase specificity of `.astryx-zone` scoped rules
- Check CSS import order: `astryx.module.css` must load AFTER global Catalyst CSS
- Verify no inline `style=` attributes override zone vars

### "Dark mode not working"
- Dark mode bridge not yet implemented (Phase 2+)
- Use light mode only for now, or manually test dark variant

---

## References

- Astryx docs: https://astryxdesign.com/
- Catalyst ADS token reference: see CLAUDE.md ADS_TOKENS_ONLY rule
- CSS @scope spec: https://drafts.csswg.org/css-cascade-5/#scoped-styles
- Strategy module: `src/modules-dormant/strategy/` (under review)
- Ideation module: `src/pages/producthub/Ideas*.tsx`

---

## Contacts

- **Design System** (@design-team): Astryx questions, theme specs
- **Product** (@product-team): StrategyHub, Ideation feature roadmap
- **Platform** (@platform-team): CSS governance, token registry
