# ADS — Catalyst wrapper layer over @atlaskit/\*

This folder is the Catalyst-owned facade over Atlassian Design System components. It exists to isolate Atlaskit's version-bump blast radius from product code so Catalyst can ship on the same codebase for the next five years without a rewrite each major.

Every Atlaskit primitive used in Catalyst is wrapped here. Product code imports only from `@/components/ads`. Nothing outside this folder or `@/theme/ads` may import `@atlaskit/*` directly — enforced by ESLint.

## Why a wrapper layer

Atlaskit releases are frequent and not always backward-compatible at the prop level. A `@atlaskit/button` major can rename `appearance` values, change the shape of `iconBefore`, or swap the focus-ring implementation. If 200 product-code call sites import `Button` from `@atlaskit/button` directly, every such change is a 200-site refactor.

With this wrapper layer, the change is a one-file patch: update the mapping inside `src/components/ads/Button.tsx`. Product code is unaffected.

This is the same pattern Atlassian itself uses internally. We are borrowing it because our longevity posture demands it.

## The wrapper contract

Every wrapper in this folder MUST:

1. **Export a stable Catalyst-owned props interface.** Product code depends on this interface; it is our public API. Breaking changes to it require a Catalyst major bump, not an Atlaskit bump.
2. **Accept `testId` and forward it to a stable DOM node.** Playwright interaction and visual-regression tests hang off these. Do NOT pass Atlaskit's `testId` through blindly — wrap and namespace so upstream renames don't break tests.
3. **Accept `aria-*` attributes and forward them.** A11y audits live or die on this.
4. **Never expose Atlaskit-specific types in its public signature.** Types like `@atlaskit/button/types` must stay internal. Export Catalyst-owned union types instead (`ButtonAppearance = 'primary' | 'subtle' | …`).
5. **Read colours via the theme bridge, not hex literals.** `cp(adsTokens.text.primary)`, never `'#0F172A'`. Enforced by `no-restricted-syntax` in the ADS ESLint profile.
6. **Have a Storybook story.** Every variant, every interaction state, plus a dark-mode toggle in the toolbar. Stories are the source of truth for visual-regression fixtures.
7. **Have a unit test.** Rendering, prop forwarding, and keyboard interaction. Vitest + Testing Library.
8. **Have a Playwright interaction test when the component has interactive state** (popups, modals, editors, pickers).

A wrapper that violates any of the above fails CI.

## Directory structure

```
src/components/ads/
  README.md                ← you are here
  index.ts                 ← barrel — the ONLY public entry point
  Button.tsx
  Button.test.tsx
  Button.stories.tsx
  Lozenge.tsx
  Lozenge.test.tsx
  Lozenge.stories.tsx
  …one folder per complex wrapper…
  Modal/
    index.tsx
    Minimise.tsx           ← Catalyst-owned extension (not in Atlaskit)
    Modal.test.tsx
    Modal.stories.tsx
  internal/                ← shared util, not re-exported
    forwardTestId.ts
    toAtlaskitAppearance.ts
```

## Adding a new wrapper

Checklist — copy into the PR description:

- [ ] The Atlaskit package is listed in `package.json` dependencies at the **last-stable 2025-Q4** version.
- [ ] The Atlaskit package is listed in `vite.config.ts` `optimizeDeps.include` so first mount is warm.
- [ ] Stable props interface defined — no leaked Atlaskit types in the exported signature.
- [ ] `testId` accepted and forwarded.
- [ ] `aria-*` accepted and forwarded.
- [ ] All colours routed through `cp(adsTokens.*)` — no hardcoded hex.
- [ ] Dark-mode tested in Storybook with the theme toolbar toggle.
- [ ] Unit test with render + prop-forward + keyboard-nav cases.
- [ ] Story with Rest / Hover / Focus / Disabled / Loading states (where applicable).
- [ ] Playwright interaction test (if the component has interactive state).
- [ ] Added to `src/components/ads/index.ts` barrel.
- [ ] No import path from product code reaches `@atlaskit/*` directly — verified by `eslint --max-warnings=0`.

## Atlaskit version bump protocol

When a monthly Atlaskit minor or patch bump lands:

1. One person runs the bump in a feature branch.
2. CI runs: typecheck, lint, unit, Playwright interaction, Playwright visual-regression (threshold 0.01), axe-core a11y, build, bundle-size.
3. Any wrapper whose visual diff exceeds 0.01 gets a pixel review — either update the wrapper to restore the previous look, or update the snapshot if Atlaskit's change is an intentional design-system improvement that Catalyst wants.
4. All changes land together in one PR titled `chore(ads): bump @atlaskit/* to <version-set>`. Never piecemeal.

When a major Atlaskit bump lands (prop renames, API changes):

1. Same as above, plus: update the internal mapping inside the affected wrapper file(s). Product code must not change. If product code would need to change, the wrapper is not abstracting enough — fix the wrapper, not the call sites.
2. Run full Playwright suite including `storydetail.full.spec.ts`, `backlog.full.spec.ts`, `linked-items.modal.spec.ts`.
3. Ship behind the Atlaskit feature flag for a 7-day canary on Vikram's account before opening to BAU project.

## Forbidden patterns inside wrappers

- Direct hex literals — use the token bridge.
- `!important` in inline styles or module CSS — use the theme bridge properly; Atlaskit already handles cascade.
- Ref forwarding to internal Atlaskit DOM nodes without a Catalyst-owned type — expose a stable HTMLElement type or wrap in our own ref type.
- Re-exporting `@atlaskit/*` types from `index.ts` — the barrel exports only Catalyst-owned types.
- Hoisting Atlaskit `ThemeProvider` inside a wrapper — the single `AdsThemeProvider` at app root owns theme state.

## Forbidden patterns outside this folder

Enforced by ESLint (`no-restricted-imports`):

- `import … from '@atlaskit/<anything>'` outside `src/components/ads/**` or `src/theme/ads/**`.
- `import … from '@/components/ads/<specific-file>'` — use the barrel (`@/components/ads`).
- Mixing shadcn/ui and ADS primitives in the same migrated surface. A surface is either shadcn or ADS, never both.

## Fall-back: when a wrapper doesn't yet exist

If a surface needs an Atlaskit primitive that isn't wrapped yet, the PR that adds the surface MUST also add the wrapper. Never bypass with a direct `@atlaskit/*` import — the ESLint rule will block CI and the review will be rejected.

If a wrapper is genuinely impossible (e.g. Atlaskit exports a JSX escape hatch with dozens of slots), document the exception in this README under "Exceptions" with a link to the issue tracker item and a schedule for proper wrapping. There are currently zero such exceptions and we intend to keep it that way.

## Exceptions

_None._
