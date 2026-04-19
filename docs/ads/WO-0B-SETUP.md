# WO-0b — ADS Testing Harness Setup

This document is the one-time setup guide for the Catalyst ADS Storybook +
Playwright visual-regression + axe a11y pipeline introduced in work order
WO-0b. Once the commands below have been run on a machine, every PR that
touches `src/components/ads/**` or theme tokens will gate through the harness.

---

## 1. Install dependencies

The new Storybook and Playwright devDependencies are declared in
`package.json`. `npm run dev` triggers `scripts/sync-deps.js` which installs
them automatically, but for a first-time setup the explicit command is:

```bash
npm install
```

Expected additions:

- `storybook` + `@storybook/react-vite` + addons (a11y, essentials,
  interactions, themes, test)
- `@playwright/test`
- `@axe-core/playwright`
- `eslint-plugin-storybook`

If the install is flaky on a slow network, re-run until the lockfile
matches — `sync-deps.js` is idempotent.

---

## 2. Install Playwright browsers

Playwright ships without browser binaries. Run once per machine:

```bash
npx playwright install --with-deps chromium webkit
```

`--with-deps` pulls in the OS-level libraries on Linux CI runners. On macOS
it's a no-op. We intentionally skip Firefox — adding it later is trivial if
a surface needs it, but the default matrix is Chromium + WebKit.

---

## 3. Run Storybook locally

```bash
npm run storybook
```

Storybook boots on <http://localhost:6006>. The sidebar shows two root
folders once stories exist:

- **ADS/** — canonical fixtures for every wrapper component.
- (future) **Surfaces/** — higher-order compositions as WO-1..WO-8 land.

The top-toolbar theme picker (addon-themes) toggles between light and dark
via the `html.class` attribute — the same mechanism `AdsThemeProvider` hooks
into in the app, so stories render with real NOCTURNE tokens.

---

## 4. Run visual-regression tests

First-time setup — generate baseline PNGs:

```bash
npm run test:visual:update
```

Baselines are written to `tests/ads/visual/__screenshots__/` and **must be
committed**. The screenshot filename encodes the story id and theme, e.g.
`ads-button--primary--light.png`.

On subsequent runs, verify against the committed baselines:

```bash
npm run test:visual
```

WebKit variant (optional, slower):

```bash
npm run test:visual:webkit
```

A pixel-diff failure produces an HTML report at
`playwright-report/ads/index.html` with side-by-side diff images.

### Threshold

The config pins `toHaveScreenshot` at:

- `threshold: 0.01` — per-pixel colour distance (0 = identical, 1 = any).
- `maxDiffPixelRatio: 0.001` — at most 0.1% of pixels may exceed threshold.

This is tight enough to catch NOCTURNE token drift and StatusLozenge
colour regressions at the pixel delta specified in the Phase 2 spec, while
surviving antialiasing jitter across machines.

---

## 5. Run accessibility tests

```bash
npm run test:a11y
```

Runs axe-core (WCAG 2.1 AA ruleset) against every story in both themes.
The rules `region`, `page-has-heading-one`, and `landmark-one-main` are
disabled — story canvases are fragments, not full pages, so those rules
generate noise.

Only `critical` and `serious` violations fail the run. `moderate` and
`minor` violations are logged and should be triaged during design review
but do not block CI.

---

## 6. CI wiring (forward-looking)

Both harnesses are designed to run on CI:

- `webServer` reuses an existing Storybook dev server locally
  (`reuseExistingServer: !process.env.CI`) and freshly spawns one in CI.
- `retries: 1` in CI absorbs flakes from the dev-server first-paint window.
- Reporter is `github` in CI (annotates PRs inline) and `list` locally.

A GitHub Actions workflow under `.github/workflows/ads-visual.yml` will be
added alongside WO-1 (Breadcrumb surface migration) — the first end-to-end
proof of the pipeline. Until then, run the harness locally before pushing
changes to anything under `src/components/ads/**`.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Storybook index.json fetch failed` | Storybook not running, or running on a non-default port | `npm run storybook` in another terminal |
| `Timeout waiting for #storybook-root` | Cold Vite optimize of a new Atlaskit package | Wait for the first `npm run storybook` to finish optimizing, then re-run |
| Visual diff only on a single machine | Font rendering drift (local vs CI) | Regenerate the baseline on the machine that's the reference (usually CI) via the `test:visual:update` job |
| axe `color-contrast` fires on a story | A token was bumped off-contrast | Run `grep` on the token name and fix at source — do NOT disable the rule |

---

## 8. File map

```
.storybook/
  main.ts            Framework + addons + Vite alias parity with the app
  preview.tsx        Theme bridge decorator + a11y config
  manager.ts         Sidebar branding

src/components/ads/
  *.stories.tsx      Canonical fixtures per wrapper
  README.md          Wrapper contract (8 MUST rules, add-wrapper checklist)

tests/ads/
  fixtures/
    stories.ts       Story-list loader (fetches Storybook index.json)
  visual/
    stories.visual.spec.ts    Visual-regression harness (generated per story)
    __screenshots__/          Committed baseline PNGs
  a11y/
    stories.a11y.spec.ts      axe-core harness (generated per story)

playwright.ads.config.ts       Dedicated Playwright config for ADS only
                               (separate from parity tests)
```
