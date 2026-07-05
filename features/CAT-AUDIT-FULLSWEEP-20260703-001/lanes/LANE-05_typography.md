# LANE 5 — Typography Audit

**Feature Work ID:** CAT-AUDIT-FULLSWEEP-20260703-001
**Lane:** 05 — Typography
**Date:** 2026-07-03
**Mode:** READ-ONLY sweep (greps + `npm run audit:ads`), no code modified
**ID range:** CAT-AUDIT-0400 … 0415

---

## 1. Audit tool result

`npm run audit:ads` (Typography Enforcer category):

```
⚠️  Typography Enforcer: 1658 violations found
Breakdown: tokens 27316 | typography 1658 | spacing 1 | fontImports 0
```

- **Typography category: 1,658 — exactly at the committed baseline (1,658).** Ratchet gate passes; zero net progress since baseline was cut.
- Enforcer buckets observed in output: `HARDCODED_FONTSIZE` (e.g. `WorkListStates.tsx:59`) and `UPPERCASE_LABEL` (e.g. `AiCommandComposer.tsx:29/62`, `AiSidePanels.tsx:39`, `TriggerTable.tsx:176–191`).
- Full tail saved to scratch: `scratchpad/audit-ads-tail.txt`.
- Note: the enforcer's 1,658 is far narrower than raw grep reality (below) — it does not count CSS-file font-size literals, numeric fontWeight, or Tailwind arbitrary utilities comprehensively.

## 2. Canonical reference (CRE Grid H)

`src/lib/catalyst-rules/RULE_TABLE.md` — Grid H, Row Typography Contract:

- **H1** — Issue KEY = `var(--ds-font-size-300)` / `var(--ds-line-height-body)` (13px/20px); TITLE/summary = `var(--ds-font-size-400)` / `var(--ds-line-height-body)` (14px/20px). Applies to every row/table surface rendering a work item.
- **H2** — Hardcoded `lineHeight` literals (`1`, `1.4`, `1.5`, `leading-[...]`) BANNED in row/table cell components. Enforcement grep over `src/components/shared/JiraTable/` + `src/pages/project-hub/` must return **zero results outside documented exceptions**.
- **H3** — Kanban card exception documented (WorkItemCard density scale); non-table surfaces out of Grid H scope.
- Canonical implementation: `src/components/shared/JiraTable/cells.tsx` (lines 320, 337 correctly use `lineHeight: 'var(--ds-line-height-body)'`).
- Token defined at `src/styles/theme-tokens.css:24` → `--ds-line-height-body: 20px;`.

## 3. Grep occurrence totals (src/, excluding dormant/graveyard/stories/tests)

| Pattern | Occurrences |
|---|---|
| `fontSize:` px/rem literal in TS/TSX style objects | **570** |
| `font-size:` px/rem literal in CSS (incl. CSS-in-TS templates) | **1,883** |
| `fontWeight:` numeric literal (400–900) in TS/TSX | **4,354** |
| `font-weight:` numeric literal in CSS | **1,476** |
| Tailwind `text-[NNpx/rem]` arbitrary | **2,276** |
| Tailwind `font-[NNN]` arbitrary weight | **11** |
| Tailwind `leading-[...]` arbitrary | **23** |
| Tailwind `tracking-[...]` arbitrary | **63** |
| `lineHeight:` numeric/px literal in TS/TSX | **704** |
| **Core typography-literal total** | **11,360** |
| Raw `<h1>`–`<h6>` with custom className | **823** |
| **Grand total occurrences** | **12,183** |

### Per top-level directory (`src/<dir>`)

| Directory | fontSize JS | font-size CSS | fontWeight JS | font-weight CSS | text-[px] | leading-[ ] | tracking-[ ] | lineHeight JS | raw h1–h6 |
|---|---|---|---|---|---|---|---|---|---|
| components | 323 | 568 | 2,550 | 423 | 1,456 | 8 | 56 | 441 | 470 |
| pages | 192 | 81 | 1,095 | 50 | 358 | 0 | 5 | 144 | 166 |
| modules | 26 | 524 | 478 | 373 | 396 | 13 | 2 | 52 | 170 |
| styles | 0 | 537 | 0 | 520 | — | — | — | — | — |
| features | 2 | 105 | 214 | 55 | 59 | 0 | 0 | 63 | 17 |
| services | 24 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| index.css | — | 64 | — | 51 | — | — | — | — | — |
| other (lib/utils/spaces/routes/…) | 3 | 4 | 17 | 4 | 7 | 2 | 0 | 4 | 0 |

### @atlaskit/heading adoption

- Files importing `@atlaskit/heading`: **33** (mostly `src/pages/admin/**`, `src/pages/dev/**`, `src/components/for-you/**`, `src/components/ads/Heading.tsx` wrapper, `CatalystPageHeader.tsx`).
- Raw `<h1>`–`<h6>` with custom className: **823 instances** — a 25:1 raw-to-canonical file ratio. Heading typography is effectively unmanaged outside admin/dev surfaces.

---

## 4. Findings

### CAT-AUDIT-0400 — Typography ratchet frozen at baseline 1,658; zero paydown
- **Category:** Typography / Governance
- **Severity:** Low (informational)
- **Surface:** Repo-wide governance
- **Route:** n/a
- **Component:** `scripts` audit + `design-governance/audit-baseline.json`
- **File Path:** design-governance/audit-baseline.json
- **Mode:** n/a (mode-agnostic)
- **CRE:** n/a — **ADS:** typography tokens — **Typography:** YES — **Performance:** n/a — **Accessibility:** indirect
- **Evidence:** `npm run audit:ads` → `Typography Enforcer: 1658 violations` — identical to committed baseline 1,658.
- **Why:** Increase-only ratchet prevents regression but no slice has reduced the count; debt is static.
- **Recommended Fix:** After any cluster below lands, run `node scripts/ads-audit-gate.cjs --update` to ratchet the typography baseline down; baselines only move down.
- **Regression Risk:** None (baseline file only).
- **Validation Required:** `npm run audit:ads:gate` green with lower number.
- **Suggested PR:** Fold into each fix PR below.

### CAT-AUDIT-0401 — Grid H canonical files (cells.tsx / editors.tsx) violate Grid H2 themselves
- **Category:** Typography / CRE
- **Severity:** High
- **Surface:** All JiraTable row surfaces (Board, Backlog, All Work, Sprint)
- **Route:** /project/:key/board, /project/:key/backlog, all-work views
- **Component:** JiraTable cells + editors (canonical Grid H reference)
- **File Path:** src/components/shared/JiraTable/cells.tsx; src/components/shared/JiraTable/editors.tsx
- **Mode:** Both (mode-agnostic)
- **CRE:** Grid H2 violated — **ADS:** `--ds-line-height-body` exists and is partially used — **Typography:** YES — **Performance:** n/a — **Accessibility:** n/a
- **Evidence:**
  - `cells.tsx:320,337` correctly use `lineHeight: 'var(--ds-line-height-body)'` — but `cells.tsx:628` → `lineHeight: "16px"`, `cells.tsx:847,885,942` → `lineHeight: "20px"` (hard literals).
  - `editors.tsx:863` → `lineHeight: 1.4` (explicitly named as banned in H2); `editors.tsx:1291,1451` → `lineHeight: '20px'`.
- **Why:** H2's own enforcement grep (`src/components/shared/JiraTable/`) is non-zero in the file the rule names as canonical. `"20px"` renders identically to the token today but silently forks if the token ever changes; `1.4` is an outright banned literal.
- **Recommended Fix:** Replace the three `"20px"` literals in cells.tsx and two in editors.tsx with `var(--ds-line-height-body)`; `cells.tsx:628` (16px) should reference the token pair its font-size uses (per the H3 precedent: `calc()`-anchor or density-derive, never bare literal); `editors.tsx:863` → `var(--ds-line-height-body)` or documented exception entry in RULE_TABLE.md.
- **Regression Risk:** Very low — same rendered values; DOM computed-style probe confirms.
- **Validation Required:** H2 enforcement grep → zero in JiraTable/; Chrome MCP computed-style probe on Board/Backlog rows (13px/20px key, 14px/20px title).
- **Suggested PR:** `fix(typography): Grid H2 — tokenize lineHeight literals in canonical JiraTable cells/editors`

### CAT-AUDIT-0402 — Grid H2 enforcement scope (project-hub pages) has 12 further lineHeight literals
- **Category:** Typography / CRE
- **Severity:** Medium
- **Surface:** Project Hub (board header, all-work list, status mapping, board settings, filters)
- **Route:** /project/:key/* (project-hub)
- **Component:** Multiple project-hub pages
- **File Path:** src/pages/project-hub/MapStatusesPage.tsx (61, 89, 194, 274); src/pages/project-hub/jira-list/ProjectAllWorkView.tsx (1038, 1054); src/pages/project-hub/jira-list/components/WorkListPanel.tsx (349); src/pages/project-hub/BoardSettingsPage.tsx (140); src/pages/project-hub/FilterDashboardPage.tsx (98, 404); src/pages/project-hub/ProjectBoardPage.tsx (144); src/components/shared/JiraTable/JiraTable.tsx (2535)
- **Mode:** Both
- **CRE:** Grid H2 scope grep explicitly includes `src/pages/project-hub/` — **ADS:** `--ds-line-height-body` — **Typography:** YES — **Performance:** n/a — **Accessibility:** n/a
- **Evidence:** 19 total hits in the H2 grep scope (incl. 0401's 7). Examples: `MapStatusesPage.tsx:61` `lineHeight: '20px'`; `WorkListPanel.tsx:349` `lineHeight: '20px'`; `ProjectAllWorkView.tsx:1038,1054` `lineHeight: '20px'`; `BoardSettingsPage.tsx:140` `lineHeight: '28px'`.
- **Why:** H2 demands zero results outside documented exceptions; none of these are documented. Some (`lineHeight: 1` on the JiraTable "+" glyph at 2535, `lineHeight: 0` icon wrapper at FilterDashboardPage:404, `lineHeight: 1.1` mono badge at ProjectBoardPage:144) are plausibly legitimate icon/glyph-centering cases → should become *documented exceptions*, not silent drift.
- **Recommended Fix:** Tokenize the '20px' row-text cases; add a documented-exceptions list to RULE_TABLE.md Grid H2 for the glyph-centering cases (lineHeight: 0/1 on non-text glyphs).
- **Regression Risk:** Low; same rendered geometry.
- **Validation Required:** H2 grep zero-or-documented; screenshot of MapStatuses + AllWork rows.
- **Suggested PR:** `fix(typography): Grid H2 sweep — project-hub lineHeight literals`

### CAT-AUDIT-0403 — AllWorkView (work-hub) row surface bypasses Grid H via Tailwind arbitrary utilities
- **Category:** Typography / CRE
- **Severity:** High
- **Surface:** All Work view (work-hub module)
- **Route:** all-work (work-hub)
- **Component:** AllWorkView
- **File Path:** src/modules/work-hub/views/AllWorkView.tsx
- **Mode:** Both
- **CRE:** Grid H1 + H2 — this is a work-item row surface — **ADS:** `--ds-font-size-300/400`, `--ds-line-height-body` — **Typography:** YES — **Performance:** n/a — **Accessibility:** 10–11px text below readable minimum
- **Evidence:** 68 typography-literal hits in one file. `AllWorkView.tsx:108` `text-[11px] leading-[16px]`; `:126` `text-[10px] leading-[14px] font-semibold uppercase`; `:148` `text-[13px] leading-[20px]` — Tailwind arbitrary equivalents of the exact values Grid H says must come from tokens; `leading-[...]` is named as banned by H2.
- **Why:** A work-item row surface re-implementing the canonical 13/20 pair as arbitrary utilities is precisely the "per-surface reinvention" Grid H prohibits; it also carries `uppercase` labels (feeds the UPPERCASE_LABEL enforcer count).
- **Recommended Fix:** Move row key/title text to `var(--ds-font-size-300/400)` + `var(--ds-line-height-body)` (style prop or CSS module), matching cells.tsx:320/337 pattern; sentence-case the uppercase chips or route them through `@atlaskit/lozenge`.
- **Regression Risk:** Medium — 68 call sites in a live list view; needs screenshot pass in both modes.
- **Validation Required:** Chrome MCP computed-style probe (key 13/20, title 14/20); screenshots light+dark; audit:ads typography count decreases.
- **Suggested PR:** `fix(typography): AllWorkView — Grid H token pair, drop tw arbitrary text/leading`

### CAT-AUDIT-0404 — task10 module CSS: 509 hardcoded font literals, heavy `!important`
- **Category:** Typography
- **Severity:** Medium
- **Surface:** Tasks module (task10)
- **Route:** /tasks/*
- **Component:** task10 stylesheet trio
- **File Path:** src/modules/task10/styles/task10.css (266); src/modules/task10/styles/task10-v2.css (126); src/modules/task10/styles/task10-detail.css (117)
- **Mode:** Both
- **CRE:** n/a (non-row CSS) — **ADS:** typography tokens — **Typography:** YES — **Performance:** `!important` cascade fights — **Accessibility:** 10px floor (`task10-detail.css:71` `font-size: 10px`)
- **Evidence:** `task10.css:152` `font-size: 14px !important`; `:215` `font-size: 13px !important`; `task10-v2.css:1689` `font-size: 28px !important`; `task10-detail.css:51` `font-size: 32px`.
- **Why:** Worst single cluster in the repo (509 occurrences, 4.2% of all typography literals); `!important` on font-size indicates the stylesheet is overriding component-owned typography — double drift.
- **Recommended Fix:** Sweep to `var(--ds-font-size-*)` scale; remove `!important` where the specificity fight is against Catalyst canonical components (fix the source instead). 28px/32px headings → `@atlaskit/heading` sizes.
- **Regression Risk:** Medium — module-wide stylesheet; slice per file (2-hour rule).
- **Validation Required:** Screenshot checklist across Tasks list/detail/v2 board; audit baseline ratchet down.
- **Suggested PR:** `fix(typography): task10 styles — tokenize font-size/weight (3 slices)`

### CAT-AUDIT-0405 — Chat/Caty surfaces: 349 literals across 4 stylesheets incl. rem + `!important` overrides
- **Category:** Typography
- **Severity:** Medium
- **Surface:** Chat dock, Caty AI widget
- **Route:** global overlay (chat dock), all routes
- **Component:** chat.css, caty-panel.css, CatyWidget.css, CatyOverrides.css
- **File Path:** src/components/chat/chat.css (130); src/components/chat/dock/caty-panel.css (58); src/components/caty-ai/CatyWidget.css (91); src/components/caty-ai/CatyOverrides.css (70)
- **Mode:** Both
- **CRE:** n/a — **ADS:** typography tokens — **Typography:** YES — **Performance:** override cascade — **Accessibility:** `chat.css:106` 11px labels
- **Evidence:** `chat.css:106` `.cc-navitem__lbl { font-size: 11px; font-weight: 500; line-height: 1; }`; `CatyWidget.css:164` `font-size: 1.25rem !important`; `CatyOverrides.css:106,123,252` rem literals with `!important`.
- **Why:** Chat is a global overlay rendered on every route — its drift is visible everywhere. The Widget/Overrides pair re-declares the same rem values twice (`1.25rem`, `0.8125rem`), confirming copy-paste divergence risk.
- **Recommended Fix:** Map rem/px values onto `--ds-font-size-*`; consolidate CatyWidget/CatyOverrides duplicate declarations; keep `line-height` on token.
- **Regression Risk:** Medium (global surface) — dark-mode screenshots mandatory per JK preference.
- **Validation Required:** Screenshots of chat dock + Caty panel, light and dark.
- **Suggested PR:** `fix(typography): chat + caty stylesheets — token scale`

### CAT-AUDIT-0406 — AIStrategyIntelligencePanel.tsx: worst single TSX offender (142+ hits, arbitrary weights, unitless line-heights)
- **Category:** Typography
- **Severity:** High
- **Surface:** Strategy Intelligence AI panel
- **Route:** strategy hub
- **Component:** AIStrategyIntelligencePanel
- **File Path:** src/components/strategy/intelligence/AIStrategyIntelligencePanel.tsx
- **Mode:** Light-biased (hardcoded `text-slate-900` pairs — dark mode breakage; overlaps Lane 2/4)
- **CRE:** n/a — **ADS:** font-size/weight tokens — **Typography:** YES — **Performance:** n/a — **Accessibility:** contrast risk in dark mode
- **Evidence:** 79 style-object hits + 63 Tailwind-arbitrary hits in one file. `:100` `text-[15px] font-[700]`; `:449,551` `text-[17px] font-[800] text-slate-900`; `:391` `lineHeight: 1.8`; `:400` `lineHeight: 1.6`; `:247` `text-[12px] font-[700] … uppercase tracking-wider`. Note `:391/:400` already use `var(--ds-font-size-400/300)` for size but pair them with literal line-heights — half-migrated.
- **Why:** Single-file record holder; `font-[800]`/17px/15px are off-scale values with no ADS equivalent mapping; mixes three styling systems (tokens, arbitrary Tailwind, literals) in the same component.
- **Recommended Fix:** Rewrite the panel's markdown-render styles onto the token scale (`--ds-font-size-*` + `--ds-line-height-body`); headings via `@atlaskit/heading`; drop `font-[700/800]` for `fontWeight: var(--ds-font-weight-*)`/`font-semibold` per ADS scale; sentence-case the "AI INSIGHT" label.
- **Regression Risk:** Medium — AI-rendered rich text; verify with a long AI response fixture.
- **Validation Required:** Screenshot light+dark of a populated panel.
- **Suggested PR:** `fix(typography): AIStrategyIntelligencePanel token rewrite`

### CAT-AUDIT-0407 — fontWeight numeric literal epidemic: 5,830 occurrences, zero weight-token usage pattern
- **Category:** Typography
- **Severity:** Medium (breadth, low per-instance impact)
- **Surface:** Repo-wide
- **Route:** all
- **Component:** 5,830 declarations (4,354 TSX + 1,476 CSS)
- **File Path:** src/components (2,973), src/pages (1,145), src/styles (520), src/modules (851), src/features (269), src/index.css (51)
- **Mode:** Both
- **CRE:** n/a — **ADS:** `--ds-font-weight-regular/medium/semibold/bold` — **Typography:** YES — **Performance:** n/a — **Accessibility:** n/a
- **Evidence:** e.g. `src/styles/product-backlog.css:198` `font-weight: 700`; `:206` `font-weight: 400`; `:229` `font-weight: 500`; `AIStrategyIntelligencePanel.tsx:184` `fontWeight: 500`.
- **Why:** Numeric weights render fine today but bypass the ADS weight scale entirely; any future brand weight change (e.g. 600→653 variable-font tuning) becomes a 5,830-site migration.
- **Recommended Fix:** Do NOT sweep in one PR. Adopt the rule for new code (extend the audit enforcer), and convert opportunistically inside each surface-fix slice above. Values 400/500/600/700 map 1:1 to `--ds-font-weight-regular/medium/semibold/bold`.
- **Regression Risk:** None if mapped 1:1.
- **Validation Required:** audit:ads ratchet.
- **Suggested PR:** rider on each surface PR; enforcer extension in `scripts/`.

### CAT-AUDIT-0408 — Raw h1–h6 headings (823) vs @atlaskit/heading (33 files): heading system unmanaged
- **Category:** Typography / Canonical component
- **Severity:** Medium
- **Surface:** Repo-wide; worst: chat features, modules, pages
- **Route:** all
- **Component:** 823 raw heading instances
- **File Path:** e.g. src/features/chat/components/sidebar/ConversationSidebar.tsx:257 (`<h1 className="c-sb-head__title">`); src/features/chat/components/activity/ActivitySurface.tsx:433; src/features/all-releases/components/AIInsightsDrawer.tsx:96 (`<h2 className="font-semibold text-sm text-slate-900">`); src/components/strategy/intelligence/AIStrategyIntelligencePanel.tsx:100,385,449,551
- **Mode:** Both
- **CRE:** Canonical hierarchy rule (CLAUDE.md: ADS primitive before hand-rolled) — **ADS:** `@atlaskit/heading` — **Typography:** YES — **Performance:** n/a — **Accessibility:** YES — `<h1>` inside a sidebar (ConversationSidebar:257) breaks document outline; heading levels chosen for style not structure
- **Evidence:** 823 raw headings with custom classes vs 33 files importing `@atlaskit/heading` (plus local wrapper `src/components/ads/Heading.tsx` exists and is underused).
- **Why:** Heading size/weight consistency and a11y outline are both delegated to 823 ad-hoc class combos; the canonical wrapper already exists.
- **Recommended Fix:** New-code rule: headings via `src/components/ads/Heading.tsx` / `@atlaskit/heading`. Backfill per-surface within slices; fix outline-level misuse (h1 in sidebars → h2 + size prop).
- **Regression Risk:** Low per surface; visual size shifts possible — screenshot per slice.
- **Validation Required:** axe/outline check per touched surface.
- **Suggested PR:** per-surface riders + lint proposal.

### CAT-AUDIT-0409 — src/styles/ legacy sheets: 1,057 font literals across 6 page-level CSS files
- **Category:** Typography
- **Severity:** Medium
- **Surface:** Request detail panel, R360, Budget, AI intelligence, Product backlog, TestHub, AllWork
- **Route:** multiple
- **Component:** global stylesheets
- **File Path:** src/styles/request-detail-panel.css (125); src/styles/r360.css (94); src/styles/budget-module.css (90); src/styles/ai-intelligence.css (85); src/styles/product-backlog.css (79); src/styles/testhub.css (63); src/styles/allwork.css (60)
- **Mode:** Both
- **CRE:** allwork.css/product-backlog.css style row surfaces → Grid H adjacency — **ADS:** typography tokens — **Typography:** YES — **Performance:** n/a — **Accessibility:** 11px floors (`ai-intelligence.css:85`)
- **Evidence:** `r360.css:22` `.r3-title { font-size: 24px; font-weight: 700; … letter-spacing: -0.5px; }`; `request-detail-panel.css:190` `font-size: 13px`; `budget-module.css:193` `font-size: 14px`.
- **Why:** `src/styles/` holds 537 font-size + 520 font-weight literals — the second-largest cluster. These sheets predate the token contract; `allwork.css` and `product-backlog.css` style work-item rows and should converge on Grid H values when touched.
- **Recommended Fix:** One slice per sheet: map px onto `--ds-font-size-*`, weights onto ADS scale; row-surface sheets must land on the 13/20 + 14/20 Grid H pair.
- **Regression Risk:** Medium; screenshot per surface.
- **Validation Required:** audit ratchet + per-surface screenshots.
- **Suggested PR:** `fix(typography): styles/ token sweep — <sheet>` series.

### CAT-AUDIT-0410 — index.css global layer: 115 font literals in the app-wide entry stylesheet
- **Category:** Typography
- **Severity:** Medium
- **Surface:** Global
- **Route:** all
- **Component:** src/index.css
- **File Path:** src/index.css (64 font-size + 51 font-weight)
- **Mode:** Both
- **CRE:** n/a — **ADS:** typography tokens — **Typography:** YES — **Performance:** n/a — **Accessibility:** `index.css:116` `font-size: 11px`
- **Evidence:** `index.css:116` `font-size: 11px`; `:581` `font-size: 14px`; `:593` `font-size: 12px`.
- **Why:** Globals cascade everywhere; literals here silently anchor every surface that doesn't override.
- **Recommended Fix:** Tokenize; 11px utility classes should justify themselves or move to `--ds-font-size-100`.
- **Regression Risk:** Medium-high (global cascade) — do last, with broad screenshot pass.
- **Validation Required:** Smoke screenshots of top 5 routes light+dark.
- **Suggested PR:** `fix(typography): index.css token pass`

### CAT-AUDIT-0411 — Enterprise/Releases pages: dense Tailwind text-[NNpx] with sub-11px sizes
- **Category:** Typography
- **Severity:** Medium
- **Surface:** Demand Summary (enterprise), Defect Detail, All Releases, Release drawers
- **Route:** /enterprise/demand-summary, /releases/*
- **Component:** DemandSummaryPage, DefectDetailPage, AllReleasesPage, ReleaseDrawer, ChgDrawer
- **File Path:** src/pages/enterprise/DemandSummaryPage.tsx (67 tw hits); src/pages/releases/DefectDetailPage.tsx (62); src/pages/releases/AllReleasesPage.tsx (65 combined); src/components/releasehub/ReleaseDrawer.tsx (44); src/components/releasehub/ChgDrawer.tsx (34)
- **Mode:** DemandSummaryPage is hard-dark (`text-white/50`, `text-amber-400` — Lane 2/4 overlap)
- **CRE:** n/a — **ADS:** font-size tokens — **Typography:** YES — **Performance:** n/a — **Accessibility:** `text-[10px]` body text below minimum (DemandSummaryPage:203,372,373)
- **Evidence:** `DemandSummaryPage.tsx:372` `text-[10px] font-semibold` badge; `:203` `text-[10px] sm:text-xs text-white/50`.
- **Why:** 10px text at normal weight fails readability; these pages also mix responsive arbitrary sizes that the token scale already covers.
- **Recommended Fix:** `text-[10px/11px]` → `var(--ds-font-size-100)` (11px) minimum; badges → `@atlaskit/badge`/`lozenge` (component-owned type).
- **Regression Risk:** Low-medium.
- **Validation Required:** Screenshots; a11y font-size check.
- **Suggested PR:** `fix(typography): enterprise+releases arbitrary text sizes`

### CAT-AUDIT-0412 — FeatureViewPage.module.css: 102 literals in a single page module
- **Category:** Typography
- **Severity:** Medium
- **Surface:** Feature view (project)
- **Route:** /project/:key/feature/:id
- **Component:** FeatureViewPage
- **File Path:** src/pages/project/FeatureViewPage.module.css
- **Mode:** Both
- **CRE:** n/a — **ADS:** typography tokens — **Typography:** YES — **Performance:** n/a — **Accessibility:** 12px density
- **Evidence:** `:23,114` `font-size: 12px`; `:122` `font-size: 20px`.
- **Why:** Third-worst page-scoped file; a detail surface that should match the story-detail canonical typography.
- **Recommended Fix:** Token sweep in one 2-hour slice; 20px heading → `@atlaskit/heading` size.
- **Regression Risk:** Low (scoped module).
- **Validation Required:** Feature view screenshot light+dark.
- **Suggested PR:** `fix(typography): FeatureViewPage.module.css tokens`

### CAT-AUDIT-0413 — R360 surfaces: 186 literals incl. blanket `!important` on member card text
- **Category:** Typography
- **Severity:** Medium
- **Surface:** Resource 360 ring + member cards
- **Route:** /resource360
- **Component:** r360.css, r360-member.css
- **File Path:** src/styles/r360.css (94); src/components/resource360/r360-member.css (92)
- **Mode:** Both
- **CRE:** R360 ring geometry previously corrupted by spacing codemod (memory: spacing-codemod-corrupts-geometry) — treat with care — **ADS:** typography tokens — **Typography:** YES — **Performance:** `!important` — **Accessibility:** 11px floor (`r360-member.css:72`)
- **Evidence:** `r360-member.css:49` `font-size: 12px !important`; `:72` `font-size: 11px !important`; `r360.css:22` `.r3-title { font-size: 24px; font-weight: 700; … }`.
- **Why:** `!important` font sizing on member cards fights component-owned typography; this surface already has a history of codemod damage, so any automated fix is banned here — manual slice only.
- **Recommended Fix:** Manual tokenization; do not run codemods over r360 files (standing lesson). Remove `!important` by fixing specificity.
- **Regression Risk:** Medium — geometry-sensitive surface; screenshot the ring + member card.
- **Validation Required:** R360 ring visual diff light+dark.
- **Suggested PR:** `fix(typography): r360 token sweep (manual, no codemod)`

### CAT-AUDIT-0414 — Arbitrary tracking-[...] (63) and font-[NNN] (11): off-system letter-spacing/weights
- **Category:** Typography
- **Severity:** Low
- **Surface:** SectionHeader, contract-horizon timeline, strategy intelligence
- **Route:** multiple
- **Component:** SectionHeader, TimelineHeader, AIStrategyIntelligencePanel
- **File Path:** src/components/ui/catalyst/SectionHeader.tsx:18 (`tracking-[0.08em]` + `text-[11px] … uppercase`); src/components/contract-horizon/TimelineHeader.tsx:27,45,50 (`text-[9px] … tracking-[0.1em]`, `tracking-[-0.03em]`); src/components/strategy/intelligence/AIStrategyIntelligencePanel.tsx (all 11 `font-[NNN]` hits)
- **Mode:** Both
- **CRE:** n/a — **ADS:** ADS type scale defines letter-spacing per size; arbitrary tracking diverges — **Typography:** YES — **Performance:** n/a — **Accessibility:** `text-[9px]` (TimelineHeader:27) is the smallest text found in the sweep
- **Evidence:** as file paths above.
- **Why:** 9px uppercase tracked text is illegible; `font-[800]` has no ADS mapping.
- **Recommended Fix:** 9–10px labels → 11px minimum token; drop custom tracking except where ADS heading style specifies; `font-[NNN]` → standard weight utilities/tokens.
- **Regression Risk:** Low.
- **Validation Required:** Screenshot of contract-horizon header.
- **Suggested PR:** rider on 0406/0411 PRs.

### CAT-AUDIT-0415 — login-styles.css: 99 literals on pre-auth surface
- **Category:** Typography
- **Severity:** Low
- **Surface:** Login / auth marketing page
- **Route:** /login
- **Component:** login-styles.css
- **File Path:** src/components/auth/login/login-styles.css
- **Mode:** Own palette (pre-shell, uses `--clmp-*` custom vars)
- **CRE:** n/a — **ADS:** partially exempt (marketing-styled pre-auth surface) — **Typography:** YES — **Performance:** n/a — **Accessibility:** ok (≥13px)
- **Evidence:** `:141` `font-size: 14px; font-weight: 700;`; `:164` `font-size: 18px; letter-spacing: -.4px`.
- **Why:** Lowest priority — outside the ADS-token shell; still counts against the audit total. Decide explicitly: exempt (scanner-ignore with rationale) or tokenize.
- **Recommended Fix:** Vikram decision: mark exempt-with-comment or fold into token scale. Don't silently choose (contract rule).
- **Regression Risk:** Low.
- **Validation Required:** n/a until decided.
- **Suggested PR:** deferred pending decision.

---

## 5. Cluster + Occurrence Appendix

### Clusters (fix-order proposal)

| Cluster | Findings | Occurrences (approx) | Effort |
|---|---|---|---|
| C1 Grid H canonical + scope (HIGH, contract-critical) | 0401, 0402, 0403 | ~94 | 2 slices |
| C2 Worst single files | 0406, 0412, 0411 | ~450 | 4 slices |
| C3 Module stylesheets | 0404, 0405, 0413 | ~1,044 | 6 slices |
| C4 styles/ + global layer | 0409, 0410 | ~1,172 | 7 slices (index.css last) |
| C5 Systemic/new-code rules | 0407 (weights), 0408 (headings), 0414 | ~6,727 | enforcer + riders, no big-bang |
| C6 Decisions needed | 0415 (login exempt?) | 99 | decision only |

### Occurrence totals

| Metric | Count |
|---|---|
| audit:ads typography category | 1,658 (= baseline, no delta) |
| fontSize/font-size literals (JS+CSS) | 2,453 |
| fontWeight/font-weight numeric (JS+CSS) | 5,830 |
| Tailwind arbitrary (text-[px] + font-[N] + leading-[ ] + tracking-[ ]) | 2,373 |
| lineHeight JS literals | 704 |
| **Core literal total** | **11,360** |
| Raw h1–h6 with className | 823 |
| **Grand total** | **12,183** |
| Grid H2 scope violations (JiraTable + project-hub) | 19 (7 in canonical cells/editors) |
| @atlaskit/heading adopting files | 33 |

Raw hit lists preserved in scratchpad: `hits-*.txt`, `summary-by-dir.txt`, `top25-files.txt`, `samples-top20.txt`, `gridH2-scope.txt`, `audit-ads-tail.txt`.

---

## Lane Summary

Typography debt is **broad (12,183 grep occurrences across ~11k literal declarations)** but the audit ratchet only tracks a 1,658-item subset, which sits exactly at baseline — no paydown since the gate was cut. The single contract-critical result: **the Grid H canonical reference files themselves (`cells.tsx`, `editors.tsx`) and 6 project-hub pages violate Grid H2** with 19 hardcoded lineHeight literals inside the rule's own enforcement grep scope — including the explicitly banned `lineHeight: 1.4` in `editors.tsx:863`. Second: **AllWorkView (work-hub) re-implements the Grid H 13/20 row pair as Tailwind arbitrary `text-[13px] leading-[20px]`** — the exact per-surface reinvention Grid H bans. Volume-wise, the debt concentrates in 3 places: `fontWeight` numeric literals (5,830 — treat as new-code rule + riders, not a sweep), Tailwind `text-[NNpx]` (2,276, worst in components/), and legacy CSS sheets (task10 trio 509, `src/styles/` 1,057, `index.css` 115). Heading discipline is near-zero: 823 raw `<h1>–<h6>` vs 33 `@atlaskit/heading` files, with outline-breaking `<h1>` in sidebars. Severities: **3 High (0401, 0403, 0406), 9 Medium, 3 Low, 1 Info.** Recommended first slice: C1 (Grid H canonical + scope, ~94 occurrences, 2 slices) — it repairs the contract's own reference implementation before any wider sweep.
