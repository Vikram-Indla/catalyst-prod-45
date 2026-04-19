# Catalyst Shell — Jira-Aligned Design Critique & Dimension Spec

**Date:** April 19, 2026
**Scope:** Top Nav + Left Sidebar + Logo + Favicon
**Reference systems:** Jira Cloud (current UI) + Atlassian Design System (atlassian.design)
**Source files inspected:**
- `src/components/ja/CatalystHeader.tsx`
- `src/components/layout/SidebarBase.tsx`
- `src/components/layout/CatalystShell.tsx`
- `src/components/brand/Logo.tsx` (+ `src/assets/catalyst-wordmark-3*.svg`, `catalyst-logo-mark-2*.svg`)
- `public/favicon.svg`, `public/favicon.png`
- `index.html`, `src/index.css`, `src/styles/theme-tokens.css`

---

## Phase 1 — Jira / ADS reference extraction

Used as the yardstick throughout this document.

### Typography (Jira Cloud + ADS `typography` tokens)

| Role | Size | Weight | Line-height | Tracking | Use in Jira |
|---|---|---|---|---|---|
| Nav item (global nav) | **14px** | 500 inactive / 600 active | 20px | 0 | "Your work / Projects / Filters" |
| Nav brand / logo lockup | 14–16px | 700 | 20px | -0.01em | Atlassian / product lockup |
| Sidebar item | **14px** | 500 inactive / 600 active | 20px | 0 | "Board, Backlog, Reports" |
| Section label | **11px** | 700 UPPERCASE | 16px | 0.07em | "PLANNING", "DEVELOPMENT" |
| Body | 14px | 400 | 20px | 0 | Issue descriptions |
| Small / meta | 12px | 400 | 16px | 0 | Timestamps, counts |
| Code / key | 12px | 500 | 16px | 0 | Issue keys (`BAU-5389`) |

Font family: **Atlassian Sans** (already preloaded in `index.html`). Fallbacks fine as-is.

### Color & contrast (Jira N / B scales)

| Role | Token | Hex | WCAG AA on #FFFFFF |
|---|---|---|---|
| Surface (nav / page) | `elevation.surface` | `#FFFFFF` | — |
| Surface alt | `elevation.surface.sunken` | `#F7F8F9` | — |
| Border | `color.border` (N40) | `#DFE1E6` | 1.33 (decorative only) |
| Text primary | `color.text` (N800) | `#172B4D` | 12.63:1 ✅ |
| Text subtle | `color.text.subtle` (N300) | `#6B778C` | 4.54:1 ✅ AA |
| Text disabled | N80 | `#A5ADBA` | 2.69 ❌ decorative only |
| Primary | `color.link` (B400) | `#0052CC` | 7.25:1 ✅ AAA |
| Primary hover | B500 | `#0747A6` | 10.1:1 ✅ |
| Selected bg | `color.background.selected` | `#E9F2FF` | — |
| Hover bg | `color.background.neutral.subtle.hovered` | `#091E420F` (≈ rgba(9,30,66,0.06)) | — |

### Spacing & density (ADS `space` scale, 4px base)

```
space.050 = 4px    space.100 = 8px    space.150 = 12px
space.200 = 16px   space.250 = 20px   space.300 = 24px
space.400 = 32px   space.500 = 40px
```

Density rules Jira applies:

- Global nav horizontal padding: **`space.200` (16px)** on outer edges
- Nav item inner padding: **`8px 12px`** (`space.100 space.150`)
- Nav item-to-item gap: **0px** (padding creates separation, not gaps)
- Sidebar section label top padding: **`space.150` (12px)**
- Sidebar item vertical padding: **`6px 12px`** with 32px total height
- Sidebar item-to-item gap: **0px** (flush stack)
- Section-to-section divider: **`space.100` (8px)** above + 1px rule

---

## Phase 2 — Catalyst shell critique (findings)

### 🔴 Top Nav — critical issues

| # | Finding | Severity | Evidence |
|---|---|---|---|
| TN-1 | **Font weight `450` is not a valid Inter weight.** Inter ships 400/500/600/700. `450` silently falls back to 400, making "inactive" indistinguishable from default text. | 🔴 Critical | `CatalystHeader.tsx:277`: `fontWeight: isActive ? 600 : 450` |
| TN-2 | **Nav item font is 13.5px, not a token value.** Jira nav is 14px. 13.5 is off-grid and ignores the Inter metric optimization (14/20 is where Inter hinting is tuned). | 🟡 Moderate | `CatalystHeader.tsx:276` |
| TN-3 | **3px solid underline on active nav** is visually heavier than Jira's 2px. On a 52px bar at 13.5px text, it creates a chunky "tab strip" feeling rather than Jira's precision ink. | 🟡 Moderate | `CatalystHeader.tsx:291` |
| TN-4 | **Nav items have 50px internal height** inside a 52px bar, leaving only 2px vertical breathing. The underline sits flush with the border-bottom, so the active underline visually merges with the header divider. | 🟡 Moderate | `CatalystHeader.tsx:241, 274` (`height: '50px'` then `height: '100%'`) |
| TN-5 | **Header has both a 1px border-bottom AND a box-shadow** (`0 1px 3px …`). Jira uses border-bottom OR shadow, never both. Doubled divider thickness. | 🟢 Minor | `CatalystHeader.tsx:204, 207` |
| TN-6 | **Token drift:** `--cp-layout-topnav` is declared **48px** in `theme-tokens.css` but the actual header renders at **52px** (`height: 'calc(52px + var(--app-safe-top))'`). Consumers reading the token get the wrong offset. | 🔴 Critical | `CatalystHeader.tsx:200` vs `src/styles/theme-tokens.css` |
| TN-7 | **Letter-spacing -0.01em on 13.5px** is aggressive for navigation — Jira uses 0. Combined with the sub-pixel font size this causes inconsistent subpixel positioning between browsers. | 🟢 Minor | `CatalystHeader.tsx:289` |
| TN-8 | **Nav gap is 2px**, but the buttons have no backgrounds until hover — so gap is effectively invisible. Jira uses 0px gap + padding for the same effect, cleaner. | 🟢 Minor | `CatalystHeader.tsx:231` |
| TN-9 | **Search trigger is 220px min-width / 34px height**, below Jira's 280px / 32px. Too narrow for enterprise (feels squeezed), and 34px breaks the 8-grid. | 🟡 Moderate | `CatalystHeader.tsx:571–573` |
| TN-10 | **Notification bell uses `#EF4444` badge**, not Jira's `#DE350B` (R400). Minor color drift from ADS red. | 🟢 Minor | `CatalystHeader.tsx:623` |
| TN-11 | **Avatar ring gradient** `linear-gradient(135deg, #0052CC, #6366F1)` mixes Jira B400 with indigo — indigo isn't in ADS. Should use solid B400 or N300 fallback. | 🟢 Minor | `CatalystHeader.tsx:640` |

### 🔴 Left Sidebar — critical issues

| # | Finding | Severity | Evidence |
|---|---|---|---|
| SB-1 | **Same `fontWeight: 450` bug** — silently falls back to 400. | 🔴 Critical | `SidebarBase.tsx:413` |
| SB-2 | **Item font 13.5px / text lineHeight 36px.** Setting `lineHeight: '36px'` on the `<span>` breaks baseline alignment when the text wraps; also defeats purpose of flex-centering. | 🟡 Moderate | `SidebarBase.tsx:412, 473` |
| SB-3 | **Asymmetric border-radius** `'0 6px 6px 0'` on expanded items means the active fill runs flush to the sidebar's inner edge. Jira's sidebar items use **full 6px radius** with **6px horizontal inset** from the sidebar wall, creating a hairline gutter. | 🟡 Moderate | `SidebarBase.tsx:420` |
| SB-4 | **1px `marginBottom` between items** creates micro-gaps that accumulate over 7+ items into visible stutter. Jira stacks items flush (0 gap) with padding providing air. | 🟡 Moderate | `SidebarBase.tsx:411` |
| SB-5 | **Sidebar expanded width is 240px** (SidebarBase) but token `--cp-layout-sidebar` is **232px**. 8px drift. Layout calcs using the token are wrong. | 🔴 Critical | `SidebarBase.tsx:171` vs `theme-tokens.css` |
| SB-6 | **Collapsed width 64px** is wider than Jira's 56px. Wastes horizontal canvas on every page. | 🟡 Moderate | `SidebarBase.tsx:171` |
| SB-7 | **Icon size 18×18** — Jira uses 16×16 in sidebar, 20×20 only for primary navigation "hub chooser" icons. Oversized here. | 🟢 Minor | `SidebarBase.tsx:453` |
| SB-8 | **Header (`Strategy Hub` + collapse button) is 54px tall** — taller than the 52px top nav. The sidebar header visually drops below the top-nav divider, creating a stepped corner. Jira keeps sidebar header ≤ top-nav height (48px). | 🟡 Moderate | `SidebarBase.tsx:191` |
| SB-9 | **Section labels use 0.06em tracking** — Jira / ADS uses 0.07em (closer to `wide-caps` token). Subtle but reads looser in Jira. | 🟢 Minor | `SidebarBase.tsx:300, 341` |
| SB-10 | **Always-visible star button on hover** on every item doubles the visual density. Jira shows star only on hover of the item. The code hides with `opacity:0 + group-hover:opacity-100` (correct pattern) — fine as-is, just calling out as retained. | ✅ OK | `SidebarBase.tsx:485–487` |

### 🔴 Logo — issues

| # | Finding | Severity |
|---|---|---|
| LG-1 | Wordmark uses a **teal (#0d9488) accent in "lyst"** (`src/assets/catalyst-wordmark-3.svg`). CLAUDE.md §8 reserves teal (`#0D9488`) for AI elements. Brand lockup is violating the color-reservation policy. | 🔴 Critical |
| LG-2 | Wordmark rendered at **26px height** inside a 52px bar — too tall. Jira's Atlassian wordmark is ~20px in a 56px bar (35% of bar height). Catalyst is 50% and feels oversized. | 🟡 Moderate |
| LG-3 | **Two divergent mark files** — `favicon.svg` is a blue umbrella-arc + C letterform, but the app header renders `catalyst-logo-mark-2.svg` (different file, appears green/teal in screenshot). **Brand mark is not consistent between favicon and header.** | 🔴 Critical |
| LG-4 | Stroked icon (`stroke-width: 6-8` on 80×80 viewBox) becomes **illegible at 16×16 favicon size**. Strokes collapse into a solid blob. | 🔴 Critical |
| LG-5 | Margin-right after logo is **16px** — Jira uses 24px (`space.300`) before the first nav item, giving the brand zone clear separation. | 🟢 Minor |

### 🔴 Favicon — issues

Current `public/favicon.svg` is an 80×80 stroked umbrella arc + "C" at stroke-width 6–8. At small sizes:

- **16×16:** Strokes overlap into a filled blob; arc and C become unreadable.
- **32×32:** Arc + C readable but competes with every other "C" favicon in browser tabs (Coinbase, Cisco, Chrome's own C apps). Not distinctive.
- **Dark-mode tabs:** No alternate theme. Gradient stops `#3B82F6 → #1D4ED8` render acceptably but edges fringe.

Jira's favicon is a **solid-filled Jira blue square with a white "J"** — maximum density, 1-bit recognizability at 16×16. Catalyst needs the same principle: **simple silhouette, solid fill, no strokes, no gradients at favicon sizes.**

---

## Phase 3 — Dimension spec (exact numbers, Jira-aligned)

### Top Nav — target values

| Property | Current | **Jira-aligned target** |
|---|---|---|
| Height (desktop) | 52px + safe-area | **56px** + safe-area |
| Background | `#FFFFFF` (light) / `#0A0A0A` (dark) | **Unchanged** |
| Border-bottom | `1px solid #E2E8F0` | **`1px solid #DFE1E6`** (ADS N40) |
| Box-shadow | `0 1px 3px rgba(15,23,42,0.06)` | **`none`** (border alone) |
| Padding (horizontal) | 20px | **16px** (`space.200`) |
| Padding (vertical) | 0 | **0** |
| Logo height (wordmark) | 26px | **20px** |
| Logo height (mark only) | 24×24 | **24×24** (unchanged) |
| Logo → first nav gap | 16px | **24px** (`space.300`) |
| Nav item height | 50px | **56px (full-bleed)** — underline at bottom edge |
| Nav item padding | `0 14px` | **`0 12px`** (`space.150`) |
| Nav item-to-item gap | 2px | **0px** |
| Nav font-size | 13.5px | **14px** |
| Nav font-weight (inactive) | 450 ❌ | **500** |
| Nav font-weight (active) | 600 | **600** |
| Nav letter-spacing | -0.01em | **0** |
| Nav color (inactive) | `#6B778C` | **`#44546F`** (ADS `color.text.subtle` refresh) or keep `#6B778C` |
| Nav color (hover) | `#172B4D` | **`#172B4D`** ✅ |
| Nav color (active) | `#0052CC` | **`#0052CC`** ✅ |
| Active underline | `3px solid #0052CC` | **`2px solid #0052CC`** |
| Hover treatment | border-bottom flash | **`background: rgba(9,30,66,0.06)` + bottom 2px `#C1C7D0`** |
| Search width (min) | 220px | **280px** |
| Search height | 34px | **32px** |
| Search radius | 6px | **3px** (ADS `border.radius.100`) |
| Icon buttons (settings, bell) | 36×50 / 36×36 | **32×32** square |
| Icon size | 18×18 / 20×20 mixed | **16×16** (consistent) |
| Avatar size | 32×32 | **24×24** (Jira standard) or keep 32 for clickability |

### Left Sidebar — target values

| Property | Current | **Jira-aligned target** |
|---|---|---|
| Expanded width | 240px | **240px** (align token `--cp-layout-sidebar: 240px`) |
| Collapsed width | 64px | **56px** |
| Background | `#FFFFFF` / `#0A0A0A` | **Unchanged** |
| Border-right | `1px solid #E2E8F0` | **`1px solid #DFE1E6`** |
| Header height | 54px | **48px** |
| Header padding | `14px 14px 14px 16px` | **`12px 16px`** |
| Item height | 36px | **32px** |
| Item padding | `0 12px` | **`0 12px`** ✅ (+ 6px outer inset — see below) |
| Item outer inset (from panel edge) | 0 (flush) | **6px** (so 6px radius hangs off the panel wall) |
| Item border-radius | `0 6px 6px 0` | **`6px`** (full) |
| Item-to-item gap | 1px | **0px** |
| Item font-size | 13.5px | **14px** |
| Item font-weight (inactive) | 450 ❌ | **500** |
| Item font-weight (active) | 600 | **600** |
| Item line-height | 36px on span ❌ | **20px** — let flex center it |
| Icon size | 18×18 | **16×16** |
| Icon stroke-width | 1.75 (inactive) / 2 (active) | **1.5** (inactive) / **2** (active) |
| Active bg | `#E9F2FF` | **`#E9F2FF`** ✅ |
| Active text | `#0052CC` | **`#0052CC`** ✅ |
| Active left accent | `3px × height−10` | **Remove accent OR keep 3px × full item height** — Jira choice is NO accent + bg-fill; ADS current guidance is `3px` at full height. Recommend no accent (cleaner). |
| Hover bg | `#F4F5F7` | **`#F4F5F7`** ✅ |
| Section label | 11px / 700 / 0.06em | **11px / 700 / 0.07em** |
| Section label padding | `6px 12px 6px` | **`16px 12px 4px`** (more headroom) |
| Section divider | `1px #EBECF0`, margin `8px 8px 6px` | **`1px #DFE1E6`, margin `8px 12px`** |
| Footer item (Settings) padding | `6px 8px` | **`8px 12px`** |

### Logo — target values

| Property | Current | **Target** |
|---|---|---|
| Wordmark height in nav | 26px | **20px** |
| Wordmark color | `Cata` in text color + `lyst` in teal `#0d9488` | **Single color** — `#172B4D` (light) / `#EDEDED` (dark), NO teal accent |
| Mark height when collapsed | 24×24 | **24×24** |
| Mark color | blue gradient `#3B82F6→#1D4ED8` | **Solid `#0052CC`** (Jira B400) — or keep gradient but use B400→B500 for ADS alignment |
| Brand lockup consistency | favicon ≠ header mark | **Single SVG source** — same file for favicon + `Logo.tsx` icon variant |

### Favicon — target values

| Size | Treatment |
|---|---|
| 16×16 | Solid square, `#0052CC` fill, white "C" letterform (fill, not stroke) |
| 32×32 | Same, with 4px inner padding |
| 180×180 (apple-touch) | Rounded-rect `#0052CC`, white "C" |
| Dark-mode tab variant | `<link rel="icon" media="(prefers-color-scheme: dark)">` pointing to white "C" on `#172B4D` fill |

**Principle:** at 16×16 the user should be able to read ONE letter on ONE solid color. Gradients, strokes, and decorative arcs must be removed.

---

## Phase 4 — Design system improvements (applied)

| Improvement | How |
|---|---|
| Fix silent weight fallback | Replace all `fontWeight: 450` with **`500`** |
| Token-based typography | Stop hard-coding 13.5px / 26px — use `14px` body + `20px` wordmark via token references |
| Single source of truth for dimensions | Update `--cp-layout-topnav: 56px`, `--cp-layout-sidebar: 240px` in `theme-tokens.css`, then consume in CatalystHeader / SidebarBase |
| Remove doubled divider | Drop `boxShadow` on header, keep border-bottom only |
| Restore ADS spacing scale | All paddings to 4/8/12/16/24 — no 14px, no 20px in shell |
| Consistent hover affordance | Subtle background overlay (`rgba(9,30,66,0.06)`) NOT border-color flashes |
| Consistent icon sizing | 16×16 everywhere in shell (nav icons, sidebar icons, action icons, search icon, bell) |
| Contrast | `#6B778C → #44546F` is a 5.25:1 upgrade (currently 4.54:1), gives AA headroom on very thin hairlines |

---

## Phase 5 — Logo & favicon recommendations

### Logo

1. **Remove teal accent from "lyst"** — replace with monochrome wordmark matching Jira's single-color brand behavior. Two variants suffice: dark (`#172B4D`) for light-mode nav, light (`#EDEDED`) for dark-mode nav.
2. **Reduce wordmark height** to 20px (was 26px) — matches Jira's Atlassian wordmark proportion (35% of 56px bar).
3. **Unify the mark** — the collapsed icon and the favicon must be *the same SVG*. Create `src/assets/catalyst-mark.svg` (single source), reference from both `Logo.tsx` and `public/favicon.svg`.

### Favicon

Replace `public/favicon.svg` with a **solid-filled C on Jira blue**:

```svg
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="4" fill="#0052CC"/>
  <path d="M22 11.5a6.2 6.2 0 0 0-5.4-2.5c-4.2 0-7 3-7 7s2.8 7 7 7a6.2 6.2 0 0 0 5.4-2.5"
        stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>
```

At 16×16 the rounded square reads first (color ID), the C reads second (brand ID). No arc, no gradient, no detail to lose.

Also generate `favicon-32.png`, `favicon-180.png` (apple-touch), and a dark-mode variant for prefers-color-scheme tabs:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" media="(prefers-color-scheme: light)">
<link rel="icon" type="image/svg+xml" href="/favicon-dark.svg" media="(prefers-color-scheme: dark)">
```

---

## Phase 6 — Files to modify (implementation plan)

Per `CLAUDE.md` §10 surgical-scope rule, this splits into **four atomic fixes**. Each is independently reversible.

| Fix | Files | Est. effort | Risk |
|---|---|---|---|
| **F1 — Top nav typography + density** | `src/components/ja/CatalystHeader.tsx` | 1 file | Low — visual only, no route changes |
| **F2 — Sidebar typography + density + radius** | `src/components/layout/SidebarBase.tsx` | 1 file | Low — affects every hub sidebar; verify on Strategy + Project + Plan |
| **F3 — Token reconciliation** | `src/styles/theme-tokens.css` + `src/index.css` | 2 files | Medium — `--cp-layout-topnav` / `--cp-layout-sidebar` read by ≥12 consumers (useAppHeaderOffset, fixed sub-headers). Must grep + re-verify. |
| **F4 — Logo + favicon unification** | `public/favicon.svg`, `public/favicon.png`, `src/assets/catalyst-wordmark-3.svg`, `src/assets/catalyst-wordmark-3-dark.svg`, `src/assets/catalyst-logo-mark-2.svg` (+ dark) | 5 assets | Medium — brand change; may need stakeholder sign-off |

**Recommended order:** F3 → F1 → F2 → F4. Tokens first (so F1/F2 reference correct values), favicon last (brand decision).

---

## Phase 7 — Output summary

### What works well today

- **Color palette is already Jira-aligned** — B400 `#0052CC`, N800 `#172B4D`, N300 `#6B778C`, N20 `#F4F5F7`, B50 `#E9F2FF` are all present and used correctly.
- **Atlassian Sans is preloaded** in `index.html` — just need to actually apply it (currently overridden by Inter in most style objects).
- **Hover star on sidebar** uses correct opacity-0 + group-hover pattern.
- **Dark-mode NOCTURNE tokens** are thoughtfully scoped and internally consistent.
- **Active state colors** (`#E9F2FF` bg + `#0052CC` text + `#0052CC` left accent) are exactly ADS `color.background.selected` + `color.text.selected`.

### Top 3 highest-impact changes

1. **Kill `fontWeight: 450`** across `CatalystHeader.tsx:277` and `SidebarBase.tsx:413`. This single bug is why the shell reads "lighter" than Jira across the board. One find-and-replace, instant parity lift.
2. **Reconcile the `--cp-layout-topnav` (48→56) and `--cp-layout-sidebar` (232→240) token drift.** Downstream layout calcs (`calc(100vh - var(--cp-layout-topnav))`) are silently wrong today.
3. **Replace the stroked favicon with a solid-fill mark.** The current favicon is illegible in browser tabs, which is the cheapest brand-perception lift Catalyst can ship.

### Risks & regression areas

- Changing header from `52px → 56px` shifts `useAppHeaderOffset` outputs; any `position: sticky; top: 52px` in hub pages will be off by 4px.
- Changing sidebar from `240px → 240px` (SidebarBase aligning to the token) is actually a no-op visually **for pages that read the component directly**, but pages that read `--cp-layout-sidebar: 232px` and hard-offset by it will shift by 8px. Grep required:
  ```bash
  grep -rn "cp-layout-sidebar\|cp-layout-topnav" src/
  grep -rn "useAppHeaderOffset\|app-header-h" src/
  ```
- Removing the teal accent from the wordmark is a **brand decision** — the current `#0d9488` is the "Catalyst signature" in the app's marketing. Recommend reviewing with brand stakeholders before F4.
- Sidebar item height 36→32 tightens density by 4px per row. On a hub with 10 items (e.g. Project Hub), the sidebar gets 40px shorter overall. Good — but if any hub currently uses the 36px for drag-handle affordances, verify.

---

## Appendix — Direct code references

All line numbers as of 2026-04-19.

### `CatalystHeader.tsx` hotspots

- Line 200 — header height `52px` (→ 56px)
- Line 202–203 — padding `20px` (→ 16px)
- Line 204 — border `#E2E8F0` (→ `#DFE1E6`)
- Line 207 — box-shadow (→ remove)
- Line 216 — logo `marginRight: 16px` (→ 24px)
- Line 224/226 — logo heights 24/26 (→ 24/20)
- Line 231 — nav `gap: '2px'` (→ 0)
- Lines 241–250 — disabled nav item `height: '50px'` / `fontSize: '14px'` (→ 56px / 14px)
- Line 273–291 — `navButtonStyle` (→ `fontSize: 14, fontWeight: 500/600, letterSpacing: 0, borderBottom 2px`)
- Line 571–590 — search trigger (→ min-width 280, height 32, radius 3, icon 16)
- Lines 532, 608, 614 — icon button sizes 36 / 50 (→ 32 / 32)

### `SidebarBase.tsx` hotspots

- Line 171 — `width: expanded ? '240px' : '64px'` (→ 240 / 56)
- Line 191 — header `minHeight: '54px'` (→ 48px)
- Line 193 — header padding (→ `12px 16px`)
- Line 408 — item `height: '36px'` (→ 32px)
- Line 411 — `marginBottom: '1px'` (→ 0)
- Line 412 — `fontSize: '13.5px'` (→ 14)
- Line 413 — **`fontWeight: active ? 600 : 450`** (→ `600 : 500`)
- Line 420 — `borderRadius: '0 6px 6px 0'` (→ `6px`)
- Line 422 — `letterSpacing: '-0.01em'` (→ 0)
- Line 453–454 — icon `18×18` (→ 16×16)
- Line 464 — `strokeWidth: 1.75` (→ 1.5)
- Line 473 — `lineHeight: '36px'` on span (→ 20)

### Token files to reconcile

- `src/styles/theme-tokens.css` — `--cp-layout-topnav: 48px` (→ 56px), `--cp-layout-sidebar: 232px` (→ 240px)
- `src/index.css` — verify `--app-header-h: 56px` matches

### Favicon

- `public/favicon.svg` — rewrite (see Phase 5 snippet)
- `public/favicon.png` — regenerate from new SVG at 32×32
- Add `/public/favicon-180.png` for apple-touch (currently uses 32px PNG)
- Add `/public/favicon-dark.svg` + `<link media="(prefers-color-scheme: dark)">` in `index.html`

---

**End of critique.**
