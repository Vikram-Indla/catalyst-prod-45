# Catalyst Dark Mode — Handoff for Lovable

This document is the canonical reference for dark-mode behavior in Catalyst. Lovable: read this first before making ANY change that involves color, background, border, or shadow values.

---

## 1. Executive Summary

Catalyst supports **three theme modes**: `light`, `dark`, and `system` (follows OS preference). Dark mode is implemented via TWO independent layers that must coexist:

1. **Atlaskit's bundled themes** — flips `--ds-*` CSS variables based on `<html data-theme>` and `<html data-color-mode>` attributes (Atlaskit owns these attributes; never write to them from Catalyst code).
2. **Catalyst's `.dark` class** — flips `--cp-*` CSS variables based on `<html class="dark">`. Owned by `src/providers/ThemeProvider.tsx`.

Every color, background, border, and shadow MUST resolve through ONE of these two layers. **Hardcoded hex literals do not flip with the theme** — they are the #1 source of dark-mode regressions in this codebase.

---

## 2. Architecture — Where the Theme State Lives

```
┌─────────────────────────────────────────────────────────────────┐
│  Source of truth: Supabase user_theme_preferences.theme_mode    │
│                            ↓                                    │
│  Fast cache: localStorage 'catalyst-theme'                      │
│                            ↓                                    │
│  React state: ThemeProvider (src/providers/ThemeProvider.tsx)   │
│                            ↓                                    │
│       ┌────────────────────┴────────────────────┐               │
│       ↓                                         ↓               │
│  <html class="dark">                AdsThemeProvider            │
│  (toggles --cp-* vars)              (calls @atlaskit/tokens     │
│                                      setGlobalTheme(...) which  │
│                                      writes <html data-theme>)  │
└─────────────────────────────────────────────────────────────────┘
```

**Key files:**
- `src/providers/ThemeProvider.tsx` — owns state + `.dark` class management. **DO NOT** write `data-theme` here. Atlaskit owns it.
- `src/theme/ads/AdsThemeProvider.tsx` — calls `setGlobalTheme({ light: 'light', dark: 'dark', spacing: 'spacing', typography: 'typography', colorMode })`. The `light:'light', dark:'dark'` parameters are MANDATORY — without them Atlaskit's bundled dark-theme CSS doesn't load and `--ds-*` tokens stay `unset`.
- `src/styles/theme-tokens.css` — Catalyst-specific `--cp-*` tokens with light defaults at `:root` and dark overrides at `.dark, [data-theme="dark"]`.
- `src/index.css` — global Catalyst CSS rules. Lines that match `[data-theme="dark"] X` patterns are paired with `.dark X` so dark mode engages via the `.dark` class regardless of what's in `data-theme`.

---

## 3. 🔒 Hard Guardrails — RULES Lovable MUST FOLLOW

### 3.1 NEVER hardcode color hex in inline JSX styles or CSS

**FORBIDDEN:**
```tsx
<div style={{ background: '#FFFFFF', color: '#292A2E', border: '1px solid #DFE1E6' }}>
```

**REQUIRED:**
```tsx
import { token } from '@atlaskit/tokens';

<div style={{
  background: token('elevation.surface', '#FFFFFF'),       // flips light→dark
  color: token('color.text', '#292A2E'),                    // flips light→dark
  border: `1px solid ${token('color.border', '#DFE1E6')}`,  // flips light→dark
}}>
```

The hex values inside `token('color.x', '#fallback')` are **fallback only**, used for SSR / when Atlaskit theme hasn't loaded. At runtime the resolution is theme-aware.

### 3.2 NEVER write `<html data-theme>` from Catalyst code

```tsx
// ❌ NEVER:
document.documentElement.setAttribute('data-theme', 'dark');

// ✅ Use the .dark class instead:
document.documentElement.classList.add('dark');
```

Atlaskit's `setGlobalTheme()` is the ONLY thing that writes `data-theme`. Catalyst's `ThemeProvider` only manages the `.dark` class. **Two writers for the same attribute = race condition + half-lit state.**

### 3.3 NEVER use `!important` with a hardcoded light hex

If you absolutely must use `!important` (e.g. to override an Atlaskit internal class), pair the rule with a `.dark` override:

```css
/* ❌ FORBIDDEN — light value stuck in dark mode: */
.my-row { background-color: #F4F5F7 !important; }

/* ✅ REQUIRED — paired light + dark rules: */
.my-row { background-color: #F4F5F7 !important; }
.dark .my-row { background-color: #292929 !important; }
```

### 3.4 NEVER reference "NOCTURNE" or other internal palette names in new work

NOCTURNE was an early Catalyst-specific dark palette label. **It is BANNED from new code, comments, commit messages, and design discussions.** When choosing a dark hex, cite Atlaskit's ADS palette (e.g. `color.background.neutral`, `elevation.surface.raised`, `--ds-surface` dark resolution) — never an internal palette name.

If you encounter NOCTURNE in existing code (71 historical references in `src/`), strip it opportunistically when you edit that file, replace with an ADS-grounded description (e.g. "dark elevated surface", "dark page bg", not "NOCTURNE inset value").

### 3.5 ALWAYS verify with the contrast probe before declaring done

`audit/contrast-probe.js` is a 140-line zero-dep script. Paste it into DevTools console on every surface you touched, in both light AND dark mode. Read `window.__contrastReport`:

- `failingCount` MUST be 0 (or every fail must be intentionally low-contrast like a disabled state, justified case-by-case).
- WCAG 2.1 AA thresholds: 4.5:1 for normal text, 3:1 for large (≥18.66px) or bold (≥14px @ 700+).

If anything fails AA, fix at the consumer (component using the wrong token), NOT at the token (changing the global token breaks N other consumers).

### 3.6 ALWAYS hard-reload after editing CSS-in-JS injected via useEffect

Components like `JiraTable.tsx` inject a `<style>` block via `useEffect` with an idempotent guard:

```tsx
useEffect(() => {
  if (document.getElementById('jira-table-focus-css')) return;  // ← guard
  // ... inject <style>
}, []);
```

Vite HMR doesn't re-run useEffects when their dependency array is empty. The OLD `<style>` block stays in the DOM until a hard reload. So after editing CSS-in-JS rules, **always `Cmd+Shift+R`** before claiming the fix landed. Otherwise you'll re-debug the same issue twice.

---

## 4. Token Vocabulary — When To Use Which

### 4.1 Atlaskit tokens (preferred — flip via `setGlobalTheme`)

Use these whenever an Atlaskit equivalent exists. Read via `token('name', '#fallback')`.

| Use case | Token name | Light value | Dark value |
|---|---|---|---|
| Body text | `color.text` | `#292A2E` | `#CECFD2` |
| Subtle text (labels, meta) | `color.text.subtle` | `#505258` | `#B6C2CF` |
| Subtlest text (placeholders) | `color.text.subtlest` | `#6B6E76` | `#9FADBC` |
| Inverse text (on dark buttons) | `color.text.inverse` | `#FFFFFF` | `#0A0A0A` |
| Brand text (links, accents) | `color.text.brand` | `#1868DB` | `#1868DB` |
| Card/panel surface | `elevation.surface` | `#FFFFFF` | `#1F1F21` |
| Overlay/popover surface | `elevation.surface.overlay` | `#FFFFFF` | `#1F1F21` |
| Page neutral bg | `color.background.neutral` | varies | varies |
| Hover neutral subtle | `color.background.neutral.hovered` | rgba(...) | varies |
| Default border | `color.border` | `#0B120E24` | dark variant |
| Bold border | `color.border.bold` | `#7D818A` | dark variant |
| Selected (blue) bg | `color.background.selected` | `#E9F2FE` | dark variant |
| Selected bold bg | `color.background.selected.bold` | `#1868DB` | dark variant |

### 4.2 Catalyst `--cp-*` tokens (use when no Atlaskit equivalent)

Defined in `src/styles/theme-tokens.css` and `src/index.css`. Read via `var(--cp-*, #fallback)`.

| CSS variable | Use case | Light | Dark |
|---|---|---|---|
| `--cp-bg-hub-page` | AtlaskitPageShell outer chrome (V3 white-canvas decision) | `#FFFFFF` | `#0A0A0A` |
| `--cp-bg-surface` | Catalyst card surface | `#FFFFFF` | `#1A1A1A` |
| `--cp-text-primary` | Brighter text alternative to `color.text` (Catalyst-specific) | `#0F172A` | `#EDEDED` |
| `--cp-bd` | Catalyst border alpha | `rgba(15,23,42,0.12)` | dark variant |

`--cp-*` tokens are a Catalyst-specific layer that sits ALONGSIDE Atlaskit. Don't replace `--ds-*` calls with `--cp-*` unless the value genuinely has no Atlaskit equivalent.

### 4.3 The `cp(adsTokens.*)` bridge (DEPRECATED — do not use in new code)

`src/theme/ads/tokens.ts` exports an `adsTokens` map and a `cp()` helper that returns `var(--cp-*)`. This was a transitional bridge layer; **new code uses `token()` from `@atlaskit/tokens` directly.** The bridge stays in the codebase as audit trail / for any straggler consumers.

---

## 5. The Contrast Probe — Verification Protocol

`audit/contrast-probe.js` is the regression-safe AA audit tool. Use it on EVERY PR that touches a text-bearing surface.

### Usage:

1. Run `npm run dev`, open the surface (e.g. `/project-hub/BAU/backlog`).
2. Open DevTools console.
3. Paste the contents of `audit/contrast-probe.js`.
4. Read the `console.table` of failures + `window.__contrastReport`.
5. Toggle to the other mode (use the theme toggle in the header).
6. **Hard-reload** (`Cmd+Shift+R`) — Atlaskit's `@compiled/react` snapshots `token()` at React render time and doesn't re-flow on theme toggle without a re-mount.
7. Paste the probe again.
8. Both modes MUST show `failingCount: 0` (or every fail must be intentional + justified).

### What the probe checks:

- Every `<h1..h6, p, span, div, td, th, li, a, button, label, strong, em, code, small>` with own text content
- Computes effective bg by climbing parents until non-transparent surface
- Computes WCAG 2.1 contrast ratio
- Applies the AA threshold per element (4.5:1 normal, 3:1 large/bold)
- Reports failures sorted worst-first

### What to do when a failure is reported:

1. Note the `tag`, `text` (first 60 chars), `ratio`, `fg`, `bg`, and `cls` columns.
2. Find the offending consumer (`grep -rn` on the cls or testId).
3. Inspect what color value it computes from. If it's `var(--ds-text-subtle)` and the surface is dark elevated, swap to `token('color.text')` (brighter) or elevate the surface so the existing color contrasts more.
4. Re-probe. `failingCount` should drop to 0.

---

## 6. The Pattern-First Diagnostic Rule (CRITICAL)

When a user reports a dark-mode defect ("text washed out", "panel white in dark", "row stays light"), **the cheapest debug path is exhaustive grep for the underlying pattern across ALL surfaces, NOT element-level probe-and-fix on the single instance reported.**

Theme defects almost always replicate identically across 5–50 sites because the same hardcoded literal got copy-pasted via component templates. The user's screenshot is one of N visible occurrences. Fixing only the one they pointed at leaves N-1 still broken.

### Triage block — run BEFORE editing any one file:

```bash
# 1. Identify the failing literal via DevTools (capture hex, context, !important or not)

# 2. Grep across the codebase for that exact pattern. Three queries minimum:

# Inline JSX style literals:
grep -rnE "color\s*:\s*['\"]#XXXXXX['\"]" src/ | grep -v ".fuse_hidden"
grep -rnE "background\s*:\s*['\"]#XXXXXX['\"]" src/ | grep -v ".fuse_hidden"

# CSS-in-JS template-string literals (NO quotes around hex):
grep -rnE "color\s*:\s*#XXXXXX" src/ | grep -v ".fuse_hidden"
grep -rnE "background[^:]*:\s*#XXXXXX" src/ | grep -v ".fuse_hidden"

# !important + light literal combos (THE silent killer):
grep -rnE "!important.*#[0-9A-Fa-f]{3,8}|#[0-9A-Fa-f]{3,8}[^;]*!important" src/ | grep -v ".fuse_hidden"
```

### Fix categorization — apply the right replacement per category:

| Category | Pattern | Fix |
|---|---|---|
| Inline JSX | `color: '#XXX'` | `color: token('color.x', '#XXX')` |
| CSS-in-JS template | `color: #XXX;` | `color: var(--ds-x, #XXX);` |
| Bare CSS file | same as CSS-in-JS | same |
| `!important` rule | keep light, ADD `.dark <selector>` companion | `.dark X { property: dark-value !important; }` |

### Verify pattern-wide, not just the one reported

Re-run `audit/contrast-probe.js` on every touched surface in both modes. The fix is not "1 element passes" — it's "every element of this pattern passes everywhere".

---

## 7. Common Regression Patterns — What Has Failed Before

### 7.1 Hardcoded `'#FFFFFF'` background on panels/modals/sidebars

```tsx
// ❌ Causes white panel in dark mode
<div style={{ background: '#FFFFFF', borderLeft: '1px solid #DFE1E6' }}>

// ✅ Tokenized
<div style={{
  background: token('elevation.surface', '#FFFFFF'),
  borderLeft: `1px solid ${token('color.border', '#DFE1E6')}`,
}}>
```

### 7.2 Hardcoded `!important` light bg on table row states

```css
/* ❌ Selected row stays white in dark mode */
.my-table .row-selected > td { background-color: #F4F5F7 !important; }

/* ✅ Add .dark companion */
.my-table .row-selected > td { background-color: #F4F5F7 !important; }
.dark .my-table .row-selected > td { background-color: #292929 !important; }
```

### 7.3 Atlassian Navy palette (`#172B4D`, `#42526E`, `#5E6C84`, `#6B778C`)

These are the pre-2022 Atlassian Navy values. They never had dark counterparts. Replace with:
- `#172B4D` → `token('color.text', '#172B4D')` (resolves to `--ds-text`)
- `#42526E` / `#5E6C84` / `#6B778C` → `token('color.text.subtle', '#42526E')` (resolves to `--ds-text-subtle`)

### 7.4 The `@compiled/react` stale-render quirk

After an in-page theme toggle, some Atlaskit components keep rendering the OLD theme's token values. Hard reload clears it. If a user reports "I toggled but some buttons didn't change color" — the answer is reload, not a code fix.

### 7.5 Two providers writing the same DOM attribute

`ThemeProvider` writes `<html class="dark">`. Atlaskit's `setGlobalTheme()` writes `<html data-theme>` and `<html data-color-mode>`. **Never write `data-theme` from Catalyst code.** If you need to know the current mode in JS, use `useThemeMode()` from `src/providers/ThemeProvider.tsx`, which returns `{ theme, resolvedTheme, setTheme }`.

---

## 8. Diagnostic Probes — Sanity Checks To Run When Things Look Off

### Is Atlaskit's dark theme loaded?

```js
// In DevTools console, with the app in dark mode:
getComputedStyle(document.documentElement).getPropertyValue('--ds-text').trim()
// Expected: "#CECFD2" (or similar dark text). If empty/unset, Atlaskit's bundled dark theme didn't load.
```

If `--ds-text` is empty, check `AdsThemeProvider.tsx` — `setGlobalTheme` MUST include `light: 'light', dark: 'dark', spacing: 'spacing', typography: 'typography'` parameters.

### Is Catalyst's .dark class applied?

```js
document.documentElement.classList.contains('dark')
// Expected in dark mode: true. In light mode: false.
```

### Is data-theme being clobbered?

```js
document.documentElement.getAttribute('data-theme')
// Expected: "dark:dark light:light spacing:spacing typography:typography"
//           (Atlaskit's parameterized token-list — required by its CSS rules)
// NOT EXPECTED: "dark" or "light" (plain string — means a non-Atlaskit writer is clobbering it)
```

### Find any element with a dark-mode contrast failure

Paste `audit/contrast-probe.js` and read `window.__contrastReport.worst10`.

---

## 9. Files Lovable Should Be Aware Of

### Owned by the theme system (don't change without understanding):
- `src/providers/ThemeProvider.tsx` — state + .dark class management
- `src/theme/ads/AdsThemeProvider.tsx` — Atlaskit theme loading
- `src/styles/theme-tokens.css` — `--cp-*` tokens light + dark
- `src/index.css` — global Catalyst CSS (~5500 lines, theme-related rules throughout)
- `src/components/ads/ThemeToggle.tsx` — the toggle button in the header
- `src/components/layout/ProfileMenu.tsx` — also has Theme submenu (Light/Dark/Match system)

### Theme-critical components (touch with extra care):
- `src/components/shared/JiraTable/JiraTable.tsx` — has CSS-in-JS `<style>` block with `!important` rules; needs `.dark` companions
- `src/components/catalyst-detail-views/shared/CatalystViewBase.tsx` — modal/panel/sidebar containers
- `src/components/ads/AtlaskitPageShell.tsx` — outer page shell for migrated hubs

### Audit infrastructure:
- `audit/contrast-probe.js` — the WCAG AA probe (paste into DevTools)
- `audit/baselines/light-pre-refactor-2026-04-29.json` — Phase B baseline (9 surfaces)

### Permanent rules:
- `CLAUDE.md` — top of file, look for 🔒 PERMANENT RULE entries. Read before any theme work.

---

## 10. Quick Reference — How to Add a New Component That Plays Nice With Dark Mode

```tsx
import { token } from '@atlaskit/tokens';

export function MyCard({ title, children }: Props) {
  return (
    <div
      style={{
        background: token('elevation.surface', '#FFFFFF'),       // flips
        border: `1px solid ${token('color.border', '#DFE1E6')}`, // flips
        borderRadius: 8,
        padding: 16,
      }}
    >
      <h3 style={{
        color: token('color.text', '#292A2E'),                   // flips, primary
        fontSize: 16,
        fontWeight: 700,
        margin: '0 0 8px',
      }}>
        {title}
      </h3>
      <div style={{
        color: token('color.text.subtle', '#505258'),            // flips, subtle
        fontSize: 14,
      }}>
        {children}
      </div>
    </div>
  );
}
```

Then verify:
1. Run the contrast probe in light mode → 0 fails
2. Toggle to dark, hard-reload, run probe again → 0 fails
3. Done.

---

## 11. Lovable's Dark-Mode PR Checklist

When opening a PR that touches color/bg/border:

- [ ] No hardcoded hex literals in inline JSX `style={{}}` or CSS unless wrapped in `token()` / `var(--cp-*)`
- [ ] No `data-theme` writes from Catalyst code
- [ ] If `!important` is used in CSS, paired `.dark` override exists
- [ ] No NOCTURNE references in any new code, comment, or commit message
- [ ] `audit/contrast-probe.js` returns `failingCount: 0` in BOTH light and dark on every touched surface (after hard reload)
- [ ] tsc passes
- [ ] eslint passes
- [ ] Manual smoke test in both modes on the surface I touched

---

## End of handoff

If anything in this doc is unclear or contradicts what you find in the codebase, default to what the code does AND flag the discrepancy in the PR. Don't make up tokens that don't exist — probe `getComputedStyle(html).getPropertyValue('--ds-X')` to verify what Atlaskit actually ships.

Author: Claude (Cowork session, 2026-04-29)
Last updated: end of `feat/theme-tristate-toggle` branch work
