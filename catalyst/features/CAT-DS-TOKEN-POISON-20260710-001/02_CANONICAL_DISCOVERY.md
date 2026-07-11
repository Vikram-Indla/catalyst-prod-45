# B. Single one-way --cp-* bridge design

Feature: CAT-DS-TOKEN-POISON-20260710-001
Source of truth: `design-governance/token-graph/graph.json` (4,070 declarations, 11,499 CSS consumers, 42,501 TS consumers, 173 undefined refs, 122 duplicate global owners).
Method: every finding below is computed from the graph, not from token names or current (poisoned) values. "Primary consumption" = occurrences where the token is the leading token of a `var()` expression (fallback-position occurrences are chain debris that dies when chains are collapsed). Category is derived from the CSS property consuming the token (`color`→text, `background*`→background, `border*/outline*`→border, `box-shadow`→shadow, `fill/stroke`→icon, `font*`→typography), including TS style-object keys and Tailwind arbitrary values (`text-[var(...)]`, `bg-[var(...)]`, `border-[var(...)]`).

## B.0 Headline numbers

| Metric | Value |
|---|---|
| App-namespace tokens with ≥1 global declaration (`:root`/`.dark`/light) | 407 |
| App-namespace tokens actually consumed (CSS or TS, any position) | 283 |
| Globally declared but never consumed → **delete-only, no bridge entry** | **151** |
| Ambiguous (multi-category consumption) → per-consumer sweep, **not bridged** | **21** |
| Legacy/palette/map-style names → sweep-to-ADS, **not bridged** | ~90 |
| Phantom tokens (referenced, never defined) | 23 (3 major) |
| **Proposed bridge entries** | **80** (8 of them mode-divergent) |
| Module-scoped redefinitions shadowing global tokens → delete in sweep | 117 declarations in 4 files |

## B.1 Consumption ranking (task 1)

Top consumed app-namespace tokens by total consumers (CSS lines + TS lines, primary position; fallback-only occurrences excluded from category math):

| Token | Primary refs | Category profile (color categories only) | Verdict |
|---|---|---|---|
| `--cp-workstream-catalyst-primary` | 1,216 | text 249 / bg 209 / border 124 / icon 10 / accent 8 | AMBIGUOUS |
| `--cp-font-body` | 1,056 | typography 1,055 | BRIDGE |
| `--cp-bg-elevated` | 952 | text 418 / bg 397 / border 5 / shadow 3 | AMBIGUOUS |
| `--cp-ink-1` | 909 | bg 183 / border 179 / text 122 | SWEEP (legacy name + ambiguous) |
| `--cp-text-secondary` | 852 | text 598 / bg 7 / border 3 (97% text) | BRIDGE |
| `--cp-bg-sunken` | 846 | border 299 / bg 279 / text 8 | AMBIGUOUS |
| `--fg-3` | 493 | text 419 (98%) | SWEEP (legacy name) |
| `--cp-text-primary` | 411 | text 341 (99%) | BRIDGE |
| `--cp-blue` | 390 | text 166 / bg 105 / border 54 | AMBIGUOUS |
| `--fg-1` | 374 | text 336 (99%) | SWEEP (legacy name) |
| `--fg-4` | 369 | text 309 (95%) | SWEEP (legacy name) |
| `--cp-border` | 355 | border 204 / bg 37 (84%, name agrees) | BRIDGE |
| `--cp-lozenge-grey-bg` | 354 | border 178 / bg 84 | AMBIGUOUS (a "bg" token used as the de-facto border gray) |
| `--cp-border-neutral` | 351 | border 178 / bg 81 | PHANTOM → sweep |
| `--cp-text-inverse` | 333 | text 271 (99%) | BRIDGE |
| `--cp-font-mono` | 296 | typography 294 | BRIDGE |
| `--cp-ink-4` | 269 | text 145 / border 9 (90% text!) | SWEEP (legacy name) |
| `--cp-border-neutral-light` | 266 | text 142 / border 9 — a "border" phantom consumed as TEXT | PHANTOM → sweep |
| `--cp-ink-3` | 249 | text 167 (98%) | SWEEP (legacy name) |
| `--fg-2` | 233 | text 195 (98%) | SWEEP (legacy name) |
| `--cp-bg-neutral` | 225 | text 135 / border 5 — a "bg" phantom consumed as TEXT | PHANTOM → sweep |
| `--cp-ink-2` | 193 | text 132 / border 16 (85%) | SWEEP (legacy name) |
| `--cp-success` | 174 | text 35 / bg 19 / icon 3 (+ TS status maps) | AMBIGUOUS |
| `--cp-warning` | 172 | text 34 / border 5 / bg 5 (+ maps) | AMBIGUOUS |
| `--bg-1` | 169 | bg 116 (85%) | SWEEP (legacy name) |
| `--cp-font-heading` | 163 | typography 161 | BRIDGE |
| `--cp-primary-60` | 144 | text 67 / bg 31 / border 17 | AMBIGUOUS |
| `--cp-danger` | 141 | text 50 / bg 12 / border 8 | AMBIGUOUS |
| `--cp-teal-60` | 131 | text 18 / bg 8 (+ maps) | AMBIGUOUS |
| `--cp-float` | 129 | bg 124 (100%) | BRIDGE |
| `--cp-bg-surface` | 126 | bg 115 (92%) | BRIDGE |

Full ranked table (283 tokens) reproducible via the analysis script; raw intermediate data preserved in the session scratchpad (`analysis.json`, `primary.json`, `ts-props.json`).

## B.2 Ambiguous tokens — per-consumer sweep, NOT bridged (task 2)

Rule applied: a token is bridged only if one color category holds ≥90% of primary color-category consumption, or ≥75% when the dominant category also matches the token's name-category. Everything else below is consumed across genuinely different categories and must be swept consumer-by-consumer (each consumer replaced with the same-category `--ds-*` token), never aliased.

| # | Token | Primary refs | Per-category counts | Sweep guidance |
|---|---|---|---|---|
| 1 | `--cp-workstream-catalyst-primary` | 1,216 | text 249, bg 209, border 124, icon 10, accent 8, shadow 2, plus ~613 TS map/className refs | Brand accent used everywhere. text→`--ds-text-brand`? No — it is the *discovery* brand: text→`--ds-text-discovery`, bg→`--ds-background-discovery-bold`, border→`--ds-border-discovery`, icon→`--ds-icon-discovery`. Needs its own slice. |
| 2 | `--cp-bg-elevated` | 952 | text 418, bg 397, border 5, shadow 3 | Deliberate "inverse text = surface color" trick. bg→`--ds-surface`; color→`--ds-text-inverse` (on bold bgs). |
| 3 | `--cp-ink-1` | 909 | bg 183, border 179, text 122 | Legacy ink scale. text→`--ds-text`; border→`--ds-border`; bg consumers are dark-mode hacks → case-by-case (`--ds-background-neutral` / `--ds-surface-*`). |
| 4 | `--cp-bg-sunken` | 846 | border 299, bg 279, text 8 | bg→`--ds-surface-sunken`; border→`--ds-border` (it was abused as the border gray). |
| 5 | `--cp-blue` | 390 | text 166, bg 105, border 54, accent 9 | text→`--ds-link` or `--ds-text-information`; bg→`--ds-background-information(-bold)`; border→`--ds-border-information`. |
| 6 | `--cp-lozenge-grey-bg` | 354 | border 178, bg 84 | border→`--ds-border`; bg→`--ds-background-neutral`. Terminal fix: `@atlaskit/lozenge`. |
| 7 | `--cp-success` | 174 | text 35, bg 19, icon 3, border 2 (+dot maps) | text→`--ds-text-success`; bg→`--ds-background-success(-bold)`; icon→`--ds-icon-success`. |
| 8 | `--cp-warning` | 172 | text 34, border 5, bg 5 (+dot maps) | text→`--ds-text-warning`; bg→`--ds-background-warning(-bold)`; border→`--ds-border-warning`. |
| 9 | `--cp-primary-60` | 144 | text 67, bg 31, border 17, accent 2, shadow 1 | text→`--ds-link`; bg→`--ds-background-brand-bold`; border→`--ds-border-brand`. |
| 10 | `--cp-danger` | 141 | text 50, bg 12, border 8 | text→`--ds-text-danger`; bg→`--ds-background-danger(-bold)`; border→`--ds-border-danger`. |
| 11 | `--cp-teal-60` | 131 | text 18, bg 8, icon 3 (+maps) | text→`--ds-text-accent-teal`; bg→`--ds-background-accent-teal-subtlest`; chart uses→`--ds-chart-teal-bold`. |
| 12 | `--cp-purple-60` | 107 | text 35, bg 6, icon 3 | text→`--ds-text-discovery`; bg→`--ds-background-discovery`. |
| 13 | `--cp-bd-zone` | 41 | bg 25, border 13 | bg→`--ds-background-neutral-subtle`; border→`--ds-border`. |
| 14 | `--cp-amber` | 29 | text 10, icon 5, border 1 | text→`--ds-text-warning`; icon→`--ds-icon-warning`. |
| 15 | `--status-success` | 19 | bg 8, text 6, border 2, icon 1 | per-consumer success family (`--ds-background-success` / `--ds-text-success` / `--ds-border-success` / `--ds-icon-success`). |
| 16 | `--status-info` | 12 | text 5, bg 3, border 2, icon 1 | information family. |
| 17 | `--cp-primary-20` | 11 | border 6, bg 4 | border→`--ds-border-brand`? (selected outlines); bg→`--ds-background-selected`. |
| 18 | `--status-danger` | 9 | icon 1, border 1, text 1 (+maps) | danger family. |
| 19 | `--cp-primary` | 6 | text 2, bg 2, border 2 | brand family per consumer. |
| 20 | `--status-warning` | 4 | text 1, bg 1 (+maps) | warning family. |
| 21 | `--status-muted` | 2 | bg 1, text 1 | neutral family. |

## B.3 The bridge — `src/styles/catalyst-semantic-aliases.css` (task 3)

One file, one-way, one line per alias. Right-hand side is always a single `--ds-*` token of the SAME category as the alias's measured consumption. No fallbacks, no hex, no `--cp-`→`--cp-` chains. Everything is declared once under `:root`; the 8 mode-divergent aliases additionally get a `.dark`/`[data-color-mode="dark"]` override (sanctioned exception — the semantic genuinely differs per mode).

### Text (19 entries)

| Alias | → ADS token | Evidence (primary text share) |
|---|---|---|
| `--cp-text-primary` | `--ds-text` | 99% text, 411 refs |
| `--cp-text-secondary` | `--ds-text-subtle` | 97% text, 852 refs |
| `--cp-text-tertiary` | `--ds-text-subtlest` | 100% text, 102 refs |
| `--cp-text-muted` | `--ds-text-subtlest` | 84% text (name agrees; 7 bg strays → cross-category sweep list) |
| `--cp-text-inverse` | `--ds-text-inverse` | 99% text, 333 refs |
| `--cp-text-link` | `--ds-link` | 92% text, 20 refs |
| `--cp-success-text` | `--ds-text-success` | 100% text |
| `--cp-warning-text` | `--ds-text-warning` | 100% text |
| `--cp-danger-text` | `--ds-text-danger` | 100% text |
| `--cp-ai-t` | `--ds-text-brand` | 100% text |
| `--cp-lozenge-grey-text` | `--ds-text-subtle` | text |
| `--cp-lozenge-blue-text` | `--ds-text-inverse` | text on bold-blue lozenge |
| `--cp-lozenge-green-text` | light `--ds-text-success` / dark `--ds-text-inverse` | MODE-DIVERGENT (lozenge goes bold in dark) |
| `--cp-lz-gy-t` | light `--ds-text-subtle` / dark `--ds-text-inverse` | MODE-DIVERGENT |
| `--cp-lz-bl-t` | `--ds-text-inverse` | text on bold-blue |
| `--cp-lz-gn-t` | light `--ds-text-success` / dark `--ds-text-inverse` | MODE-DIVERGENT |
| `--status-todo-text` | `--ds-text-inverse` | text on bold chip |
| `--status-inprogress-text` | `--ds-text-inverse` | text on bold chip |
| `--status-done-text` | `--ds-text-inverse` | text on bold chip |

### Background / surface (38 entries)

| Alias | → ADS token | Note |
|---|---|---|
| `--cp-bg-page` | light `--ds-surface` / dark `--ds-surface-sunken` | MODE-DIVERGENT (the sanctioned hub-page pattern) |
| `--cp-bg` | light `--ds-surface` / dark `--ds-surface-sunken` | MODE-DIVERGENT, same semantic as bg-page |
| `--cp-bg-surface` | `--ds-surface` | 92% bg, 126 refs |
| `--cp-float` | `--ds-surface-raised` | 100% bg, 129 refs |
| `--cp-bg-overlay` | `--ds-surface-overlay` | 100% bg |
| `--cp-interact-hover` | `--ds-background-neutral-subtle-hovered` | 100% bg |
| `--cp-interact-press` | `--ds-background-neutral-subtle-pressed` | 100% bg |
| `--cp-interact-selected` | `--ds-background-selected` | 100% bg |
| `--cp-interact-selected-hover` | `--ds-background-selected-hovered` | bg |
| `--cp-blue-wash` | `--ds-background-selected` | 100% bg, 30 refs |
| `--cp-primary-light` | `--ds-background-information` | 100% bg |
| `--cp-success-light` | `--ds-background-success` | 92% bg |
| `--cp-warning-light` | `--ds-background-warning` | bg |
| `--cp-danger-light` | `--ds-background-danger` | 88% bg |
| `--cp-success-10` | `--ds-background-success` | bg |
| `--cp-danger-10` | `--ds-background-danger` | bg |
| `--cp-bg-blue-light` | `--ds-background-information` | bg |
| `--cp-bg-teal-light` | `--ds-background-success` | bg (teal folded into success; accent-teal optional) |
| `--cp-bg-orange-light` | `--ds-background-warning` | bg |
| `--cp-bg-red-light` | `--ds-background-danger` | bg |
| `--cp-input-bg` | `--ds-background-input` | bg (fixes dark-only decl) |
| `--cp-toolbar-bg` | `--ds-background-neutral` | bg (fixes poisoned dark value = border) |
| `--cp-toolbar-bg-hover` | `--ds-background-neutral-hovered` | bg |
| `--cp-toolbar-bg-press` | `--ds-background-neutral-pressed` | bg |
| `--cp-toolbar-bg-active` | `--ds-background-selected` | bg |
| `--cp-ai-bg` | `--ds-background-information` | bg (fixes dark-only decl) |
| `--cp-lozenge-blue-bg` | `--ds-background-information-bold` | bg (was `--ds-link` = text-category poison) |
| `--cp-lozenge-green-bg` | light `--ds-background-success` / dark `--ds-background-success-bold` | MODE-DIVERGENT (was `--ds-text-success` in dark = cross-category poison) |
| `--cp-lz-gy-bg` | light `--ds-background-neutral` / dark `--ds-background-neutral-bold` | MODE-DIVERGENT |
| `--cp-lz-bl-bg` | `--ds-background-information-bold` | bg |
| `--cp-lz-gn-bg` | light `--ds-background-success` / dark `--ds-background-success-bold` | MODE-DIVERGENT |
| `--status-todo-bg` | `--ds-background-neutral-bold` | bg (was `--ds-text-subtle` = cross-category poison) |
| `--status-inprogress-bg` | `--ds-background-information-bold` | bg (was `--ds-link`) |
| `--status-done-bg` | `--ds-background-success-bold` | bg |
| `--status-success-bg` | `--ds-background-success` | 100% bg |
| `--status-info-bg` | `--ds-background-information` | bg |
| `--status-warning-bg` | `--ds-background-warning` | bg |
| `--status-danger-bg` | `--ds-background-danger` | bg (light decl was danger-BOLD, dark was subtle — normalized to subtle) |
| `--cp-status-done-green` | `--ds-background-success-bold` | bg |

### Border / shape (18 entries)

| Alias | → ADS token | Note |
|---|---|---|
| `--cp-border` | `--ds-border` | 84% border, name agrees; kills the self-reference cycle at index.css:201 |
| `--cp-border-default` | `--ds-border` | 94% border (was `--ds-shadow-overlay` = cross-category poison) |
| `--cp-border-subtle` | `--ds-border` | 79% border, name agrees (was shadow-overlay poison) |
| `--cp-border-strong` | `--ds-border-bold` | 74% border, name agrees (was shadow-overlay poison) |
| `--cp-bd` | `--ds-border` | 100% border |
| `--cp-focus-ring` | `--ds-border-focused` | 100% border |
| `--cp-input-border` | `--ds-border-input` | border |
| `--cp-input-border-hover` | `--ds-border-input` | border (ADS has no input-hover token; component owns hover) |
| `--cp-ai-bd` | `--ds-border-information` | border |
| `--status-success-border` | `--ds-border-success` | 100% border |
| `--status-info-border` | `--ds-border-information` | border |
| `--status-warning-border` | `--ds-border-warning` | border |
| `--status-danger-border` | `--ds-border-danger` | border |
| `--cp-radius-sm` | `--ds-border-radius-050` | shape; 3px→2px delta accepted |
| `--cp-radius-md` | `--ds-border-radius-100` | 4px exact |
| `--cp-radius-default` | `--ds-border-radius-100` | 6px→4px delta accepted |
| `--cp-radius-lg` | `--ds-border-radius-200` | 8px exact |
| `--cp-radius-full` | `--ds-border-radius-circle` | shape |

### Shadow (2 entries)

| Alias | → ADS token |
|---|---|
| `--cp-shadow-xs` | `--ds-shadow-raised` |
| `--cp-shadow-overlay` | `--ds-shadow-overlay` |

### Typography (3 entries)

| Alias | → ADS token | Evidence |
|---|---|---|
| `--cp-font-body` | `--ds-font-family-body` | 1,055 font-family refs; `--ds-font-family-body` already used 338× in repo |
| `--cp-font-heading` | `--ds-font-family-heading` | 161 refs |
| `--cp-font-mono` | `--ds-font-family-code` | 294 refs; `--ds-font-family-code` used 151× in repo |

**Bridge total: 80 aliases** (19 text + 38 background + 18 border/shape + 2 shadow + 3 typography), of which 8 are mode-divergent (`--cp-bg-page`, `--cp-bg`, `--cp-lozenge-green-bg`, `--cp-lozenge-green-text`, `--cp-lz-gy-bg`, `--cp-lz-gy-t`, `--cp-lz-gn-bg`, `--cp-lz-gn-t`). All other 72 are single `:root` lines.

### Phantom tokens — sweep replacements, BANNED from the bridge (task 3b)

The 3 major phantoms (never defined anywhere, 920+ refs combined) appear almost exclusively in *fallback position* inside chains whose leading token is already a `--ds-*` token (e.g. `color: var(--ds-text, var(--cp-bg-neutral))`, `border: 1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral))`). Sweep rule: collapse the whole chain to the single correct same-category `--ds-*` token; where the phantom is the leading token, replace per consuming property:

| Phantom | Refs (graph undefinedRefs) | Consuming property | Replacement |
|---|---|---|---|
| `--cp-bg-neutral` | 267 refs / 75 files (consumed: color 124, -webkit-text-fill-color 1, caret-color 1, border-color 4) | `color`/text props | `--ds-text` |
| | | `border-color` | `--ds-border` |
| `--cp-border-neutral` | 379 refs / 128 files (border 23+, border-* 8, background 11) | `border*` | `--ds-border` |
| | | `background` (1px divider fills) | `--ds-border` where the chain leads with `--ds-border`, else `--ds-background-neutral` |
| `--cp-border-neutral-light` | 274 refs / 117 files (color 130+, border* 7, background 1) | `color` (chains lead with `--ds-text-subtlest`) | `--ds-text-subtlest` |
| | | `border*` | `--ds-border` |

Minor phantoms (also sweep, never bridge): `--cp-ink-muted`(4)→`--ds-text-subtlest`; `--cp-ink`(2)→`--ds-text`; `--cp-space-3/4/6`(8)→`--ds-space-075/100/150` or literal; `--cp-bg-secondary`(3)→`--ds-surface-sunken`; `--cp-shadow-popover`(2)→`--ds-shadow-overlay`; `--cp-font-ui`(1)→`--ds-font-family-body`; `--cp-drawer-z`/`--cp-drawer-width`(2)→literals; `--cp-teal-5/40/70`, `--cp-warning-40/50/70`, `--cp-bg-tertiary`, `--cp-primary-30`, `--cp-blue-muted`, `--cp-overlay-scrim` (1 each)→same-category `--ds-*` per consumer.

## B.4 Module-scoped redefinitions shadowing globals — delete in sweep (task 4)

117 scoped declarations shadow globally-declared tokens. All must be deleted (the bridge becomes the only owner):

| File | Scope selector | Shadowed tokens (count) |
|---|---|---|
| `src/styles/product-backlog.css` | `[data-module="product-backlog"]` (+ `.dark` variants) | **50** — `--cp-bg-page`, `--cp-bg-surface`, `--cp-bg-sunken`, `--cp-bg-elevated`, `--cp-text-primary/secondary/tertiary/muted/inverse/link`, `--cp-primary-60/70/80/5`, `--cp-teal-60`, `--cp-success-60/10`, `--cp-warning-60/10`, `--cp-danger-60/10`, `--cp-purple-60`, `--cp-border-subtle/default/strong`, `--cp-interact-*`, `--cp-lozenge-*`, `--cp-shadow-xs`, … |
| `src/styles/theme-tokens.css` | `:root, [data-theme="light"]` (compound → classified scoped, effectively a competing global owner) | **57** — `--cp-bg`, `--cp-bg-canvas`, `--cp-bg-sidebar-hdr`, `--cp-bg-sunken`, `--cp-float`, `--cp-bg-overlay`, `--cp-t1..t4`, `--cp-bd`, `--cp-bd-zone`, `--cp-blue*`, `--cp-ok*`, `--cp-warn*`, `--cp-err*`, `--cp-lz-*`, `--cp-chart-1..8`, `--cp-hover`, `--cp-press`, `--cp-focus-ring`, … — this entire file is superseded by the bridge |
| `src/components/resource360/r360-member.css` | `#r360-root` | **6** — `--cp-interact-hover/press/selected`, `--cp-shadow-xs`, `--cp-shadow-overlay`, `--cp-focus-ring` |
| `src/styles/catalyst-theme.css` | `:root, [data-theme="light"]` | **4** — `--text-1..4` |

Also delete-in-sweep: the 122 duplicate global owners (worst: `--cp-bg-sunken` 6 decls across index.css + catalyst-ads-parity.css + product-backlog.css + theme-tokens.css; `--text-1/2/3` 6 each; `--cp-bg-page`, `--cp-bg-elevated`, `--cp-bg`, `--cp-float` 5 each). After the sweep, `index.css`, `theme-tokens.css`, `catalyst-theme.css`, `catalyst-colors.css`, `catalyst-ads-parity.css`, `product-backlog.css`, `r360-member.css` contain ZERO `--cp-*`/`--status-*`/`--text-N`/`--bg-N`/`--fg-N` declarations; the bridge file is the single owner of the 80 survivors.

Genuinely module-local tokens that shadow nothing (27, e.g. `--cp-duration-fast`, `--cp-easing-standard`, `--cp-jira-status-*` in scoped module CSS) may remain module-scoped; they are outside the global bridge.

## B.5 Delete-only list — globally declared, zero consumers (task 1b)

151 tokens are declared globally but consumed by nothing (no CSS var() usage, no TS usage). They get NO bridge entry — pure deletion. Highlights (full list reproducible from graph: `globallyDeclared − consumed`):

- **index.css debt**: `--cp-primary-border`, `--cp-surface`, `--cp-card`, `--cp-bg-hub-page` (3 decls!), `--cp-bg-hover`, `--cp-bg-selected`, `--cp-layout-topnav`, `--cp-shadow-sm/md/lg/xl`, `--cp-font-weight-{regular,medium,semibold,bold}`, `--text-1-hex..--text-4-hex`, `--status-success-bg-hover`, the whole `--cp-neutral-0..80` scale (14), `--cp-primary-10/40`, `--cp-success-5/80`, `--cp-warning-5/80`, `--cp-danger-5/80`, `--cp-purple-10`, `--cp-info-60`
- **catalyst-colors.css debt**: entire `--cp-severity-{critical,high,medium,low,major,minor,trivial}-{dot,bg,text,border}` (28), entire `--cp-defect-status-{new,open,triaged,fixed,verified,resolved,closed,rejected,reopened}-{bg,text,border}` (27), `--cp-defect-priority-{high,medium,low}-*` (9), `--cp-workstream-{mim,tahommona}-*` (10), `--cp-workstream-{backlog,planned,in-progress,review}` (4)
- **theme-tokens.css debt**: `--cp-bg-inset`, `--cp-text-disabled`, `--cp-bd-hover`, `--cp-bd-table`, `--cp-press`, `--cp-lz-rd-bg/t`, `--cp-chart-1..8`, `--cp-blue-link`, `--cp-ok-bg`, `--cp-warn/-bg`, `--cp-err/-text`, `--cp-prg-bg`, `--cp-bg-canvas`

Note: `--cp-bg-hub-page` — named in the target architecture as the mode-divergent example — currently has **zero consumers**; it is delete-only unless a consumer is introduced. The mode-divergent pattern it exemplifies is carried by `--cp-bg-page`/`--cp-bg` in the bridge.

## B.6 Bridge sanity check + legacy-name dispositions (task 5)

**Cross-category mappings in proposed bridge: 0.** Every text alias → `--ds-text*`/`--ds-link`; every background alias → `--ds-surface*`/`--ds-background-*`; every border alias → `--ds-border*` (radius→`--ds-border-radius-*` shape); shadow→`--ds-shadow-*`; typography→`--ds-font-family-*`.
**`--cp-`→`--cp-` chains: 0.** Every right-hand side is a single `--ds-*` token, no fallbacks, no hex.
**Duplicate aliases: 0.** Each of the 80 aliases appears exactly once in `:root` (mode-divergent ones get exactly one additional `.dark` override — same token, different mode, per the sanctioned exception).

Legacy ambiguous names — ALL sweep-to-ADS, none bridged:

| Legacy token | Primary refs | Dominant use | Sweep target |
|---|---|---|---|
| `--cp-ink-1` | 909 | mixed (bg 183/border 179/text 122) | per-consumer: text→`--ds-text`, border→`--ds-border`, bg→case-by-case |
| `--fg-3` | 493 | text 98% | `--ds-text-subtlest` |
| `--fg-1` | 374 | text 99% | `--ds-text` |
| `--fg-4` | 369 | text 95% | `--ds-text-disabled` |
| `--cp-ink-4` | 269 | text 90% | `--ds-text-disabled` (border strays→`--ds-border`) |
| `--cp-ink-3` | 249 | text 98% | `--ds-text-subtlest` |
| `--fg-2` | 233 | text 98% | `--ds-text-subtle` |
| `--cp-bg-neutral` (phantom) | 225 | TEXT 96% (!) | `--ds-text` (see B.3 phantom table) |
| `--cp-ink-2` | 193 | text 85% | `--ds-text-subtle` |
| `--bg-1` | 169 | bg 85% | `--ds-surface-sunken` |
| `--text-1` | 111 | text 100% | `--ds-text` |
| `--text-2` | 87 | text 99% | `--ds-text-subtle` |
| `--text-3` | 87 | text 100% | `--ds-text-subtlest` |
| `--bg-2` | 44 | bg 84% | `--ds-surface-sunken` |
| `--bg-3` | 35 | bg 87% | `--ds-background-neutral` |
| `--text-4` | 24 | text 100% | `--ds-text-disabled` |
| `--bg-0` | 17 | bg 100% | `--ds-surface` |
| `--cp-t1` | 9 | text 100% | `--ds-text` |
| `--cp-ink-muted` (phantom) | 4 | text 100% | `--ds-text-subtlest` |
| `--cp-t3` | 4 | text 75% | `--ds-text-subtlest` |
| `--cp-t4` | 4 | text 100% | `--ds-text-disabled` |
| `--cp-t2` | 3 | text 100% | `--ds-text-subtle` |
| `--bg-4` | 3 | bg 100% | `--ds-surface-overlay` |
| `--bg-5` | 2 | bg 100% | `--ds-background-neutral` |
| `--cp-ink` (phantom) | 2 | text 100% | `--ds-text` |

Also sweep-to-ADS, not bridged (palette/map-style names, mostly 1–10 TS-map consumers each): the `--cp-color-{slate,grey,teal,blue,red,orange}-*` palette (~45 tokens, consumed only via TS color maps in `catalyst-colors.css`-backed components), `--cp-theme-{senaei-bau,innovation,inspection,international,mim,senaei-ops,sectorial,tahommena,data-platform,unassigned}-{bg,text,accent}` (~30), `--cp-workstream-{catalyst,data-ai,delivery,senaei}-{primary,light,border,text-primary,text-dark}` (~20), `--cp-status-{passed,failed,blocked,in-progress,not-started}-{bg,text,border}` (15), `--cp-priority-{critical,high,medium,low}-{bg,text}` (8), `--cp-defect-priority-critical-*` (3), plus one-consumer stragglers `--cp-ok`, `--cp-blue-text`(→`--ds-link`), `--cp-hover`(→`--ds-background-neutral-subtle-hovered`), `--cp-err-bg`(→`--ds-background-danger`), `--cp-bg-sidebar-hdr`(→`--ds-surface`), `--cp-scroll`(→`--ds-background-neutral-bold`), `--cp-resize-handle-hover`(→`--ds-text-subtlest`), `--cp-primary-hover`(→`--ds-link-pressed`), `--cp-primary-5`(→`--ds-background-selected`), `--cp-primary-70`(→`--ds-background-brand-bold-hovered`), `--cp-primary-80`(→`--ds-background-brand-bold-pressed`), `--cp-danger-60`(→`--ds-text-danger`), `--cp-layout-sidebar`(240px→literal or scoped), `--cp-shadow-focus`(composite → `outline: 2px solid var(--ds-border-focused)` pattern), `--cp-focus-offset`, `--cp-jira-fixver-*` (module-scoped, leave).

## B.7 Execution order recommendation

1. Land `src/styles/catalyst-semantic-aliases.css` with the 80 aliases (pure addition — bridge wins the cascade only after step 2).
2. Delete the 117 shadowing scoped decls + 122-owner duplicate global decls + 151 delete-only decls (theme-tokens.css and catalyst-colors.css shrink to ~nothing; index.css loses its token zoo).
3. Phantom sweep (collapse `--cp-bg-neutral` / `--cp-border-neutral` / `--cp-border-neutral-light` chains to single `--ds-*` refs) — zero visual risk since phantoms never resolved anyway.
4. Legacy-name sweeps (`--fg-N`, `--text-N`, `--bg-N`, `--cp-ink-*`, `--cp-t1..4`) — mechanical, single-category.
5. Ambiguous-token per-consumer sweeps (B.2, worst-first) — each its own 2-hour slice with screenshot signoff.

# A. App-authored --ds-* removal spec (summary; full text lost to a write race — authoritative per-decl data in design-governance/token-graph/graph.json appDsDecls)

Counts per file (217 decls / 104 unique): catalyst-ads-parity.css 98 · catalyst-ads-chart-tokens.css 50 · index.css 39 · catalyst-typography.css 17 · theme-tokens.css 10 · features/chat-v2/tokens.css 3. jira-parity-overrides.css: 16 consumptions, 0 declarations — no action. Plus TicketBreadcrumbs.tsx:182 — self-reference cycle for --ds-text-subtle inside scoped <style> (guaranteed-invalid; deletion is a bug fix).

Cascade verdict: Atlaskit's runtime <style> (html[data-color-mode][data-theme~=…], appended last) beats every app block on specificity+order; app [data-theme="dark"] exact-match selectors never match at all. Exceptions where app wins: (1) index.css !important dark ramp — 19 real-token values byte-identical to atlassian-dark → deletion is a no-op; (2) subtree-scoped blocks (dark lozenge wrapper index.css:7395–7412, chat-v2 shell, breadcrumbs); (3) app-invented names.

App-invented --ds-* names (21, absent from token-names): --ds-font-size-50…800 + --ds-line-height-body (~7,970 fallback-less consumers — PRESERVE until typography sweep); --ds-border-subtle (40 consumers → --ds-border); --ds-font-family-monospaced (3 → --ds-font-family-code); --ds-chart-yellow-subtle (1 → --ds-background-warning); --ds-chart-{blue,green,red,purple}-subtle, --ds-chart-categorical-9/-10, --ds-blanket-bold/-subtle (0 consumers).

Material rendered change on deletion: only the .dark [data-cp-lozenge-jira-parity] block (success #1b7f37→#94C748, warning #7f4f01→#FBC828, danger #8e1a12→#F87168, text-polarity flip — moves TO canonical ADS dark values) + chat-v2 fonts if deleted rather than kept. FOUC risk: close by calling setGlobalTheme at module scope in main.tsx before React mounts.

# C. R5 cross-category slice plan (2026-07-11, main session)
221 declarations; top files: index.css 70, catalyst-colors.css 22, planner-calendar.css 12, task-list.css 12, caty.css 11, strategy-tokens.css 11. Pair distribution: border→background 50, text→background 40, border→text 39, background→text 20, background→border 17, shadow→background 10, icon→text 10, chart→text 8, chart→background 5, others ≤5.
Fix rules, in priority order:
1. DARK-BLOCK DELETION FIRST: if the mismatch lives in a .dark/[data-theme dark]/media-dark override of a module token whose light/root definition already references a theme-aware --ds-* token of the CORRECT category, delete the dark override outright (ADS themes make it redundant — this was the pre-remediation dark hack). Expect this to clear the majority (surface→text, border→text-family dark blocks in task-list/planner-calendar/caty/users/capacity/request-detail/strategy-tokens).
2. Otherwise remap to same-category ADS token by name intent: *-border/bd/divider→--ds-border (light/subtle→border, strong/bold→--ds-border-bold, focus→--ds-border-focused, semantic→--ds-border-{danger,warning,success,information}); *-text/fg→--ds-text ladder or --ds-text-{danger,...}; *-bg/surface→--ds-surface*/--ds-background-*; icon→--ds-icon*; chart→--ds-chart-* (categorical/semantic per usage); shadow→--ds-shadow-*.
3. Bold-chip exceptions: tokens consumed as bold-lozenge/chip text on colored fill map text→--ds-text-inverse, bg→--ds-background-*-bold (mirror bridge decisions).
4. Never leave a cross-category pair; never add fallbacks/hex; verify with gate --filter=R5 → 0 and npm run test:tokens still green.

# D. R9 typography slice plan (2026-07-11, main session)
Temp app tokens (theme-tokens.css): 50:11px, 100:12px, 200:12px, 300:14px, 400:14px, 500:17px, 600:18px, 700:22px, 800:28px, line-height-body:20. ADS roles available (token-names): font.body{-small,,-large}, font.heading.{xxsmall..xxlarge}, font.metric.{small,medium,large}, font.code, font.weight.*, font.family.*.
Default conversion table (size + adjacent-weight aware; composite `font:` shorthand replaces size[+weight+line-height] decls):
- 11px → --ds-font-body-small
- 12px → weight≥600 → --ds-font-heading-xxsmall, else --ds-font-body-small (documented 1px delta)
- 14px → weight≥600 → --ds-font-heading-xsmall, else --ds-font-body
- 17px → weight≥600 → --ds-font-heading-small, else --ds-font-body-large (1px delta)
- 18px → weight≥600 → --ds-font-heading-small (2px delta), else --ds-font-body-large (2px delta)
- 22px → --ds-font-heading-medium (2px delta) [20px]
- 28px → --ds-font-heading-large (24) if container is section header, else --ds-font-heading-xlarge — default xlarge
- KPI/metric/score/hero-number contexts (name/class heuristics) → --ds-font-metric-{small,medium,large} by size
Rules: keep explicit font-weight AFTER shorthand only when it deviates from the role on purpose; drop adjacent line-height decls (role owns it); TS style objects: fontSize/fontWeight/lineHeight keys → single font key. After refs=0 delete the 10 temp tokens from theme-tokens.css (R1 10→0). Verify: gate R9=0 R1=0, tsc, gates, build, npm run test:tokens green, idempotent codemod, delta report by size-class.
