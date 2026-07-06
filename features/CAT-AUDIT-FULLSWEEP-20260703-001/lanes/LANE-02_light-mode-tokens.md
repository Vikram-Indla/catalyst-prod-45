# LANE 2 — Light Mode / Color-Token Drift (Static Audit)

**Feature Work ID:** CAT-AUDIT-FULLSWEEP-20260703-001
**Lane:** 02 — Light-mode / color-token drift
**Date:** 2026-07-03
**Method:** Static only. `npm run lint:colors` + raw grep sweeps over `src/` excluding `modules-dormant`, `_graveyard`, `*.stories.*`, `*.test.*`. No builds, no browser, no code modified.

**Headline:** `npm run lint:colors` reports **"No hard-coded colors found! Design system is clean"** against a baseline of 0. This is misleading. The scanner (`scripts/no-hardcoded-colors.cjs`, per `design-governance/color-baseline.json` scanner_notes) deliberately whitelists `var(--ds-*, #hex)` and `token('x', '#hex')` fallback forms — both of which CLAUDE.md explicitly bans ("hex fallbacks in var(--ds-*, #fallback) — use token-only, no fallback hex"). Raw greps find **~5,300 color-drift occurrence-lines** the gate cannot see, plus **313 escape hatches** of which the large majority do not meet the documented escape-hatch standard.

---

## ISSUE ID: CAT-AUDIT-0100
- **Category:** Governance / Tooling gap
- **Severity:** High
- **Surface:** Repo-wide (design-governance)
- **Route:** n/a
- **Component:** `scripts/no-hardcoded-colors.cjs` ratchet gate
- **File Path:** scripts/no-hardcoded-colors.cjs, design-governance/color-baseline.json
- **Mode:** Both
- **CRE Rule Impact:** None
- **ADS Impact:** Critical — the enforcement gate contradicts the CLAUDE.md rule it enforces
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** Indirect
- **Evidence:** `design-governance/color-baseline.json` — `"scanner_notes": "Updated to allow var(--ds-*, fallback) and token('x', fallback) patterns per prompts 3 guidance"`; baseline `"hardcodedColors": 0`; `"escape_hatches": []` (yet 313 exist in code). `npm run lint:colors` output 2026-07-03: "✅ No hard-coded colors found!"
- **Why This Is A Problem:** CLAUDE.md bans hex fallbacks inside `var(--ds-*, ...)` with "no exceptions", but the committed scanner whitelists exactly that pattern. Result: 2,203 `var(--ds-*, #hex)` occurrences and 101 `token('...', '#hex')` occurrences are invisible to the pre-commit and CI gates, and the baseline file falsely records zero escape hatches. New fallback-hex drift can be added indefinitely without tripping any ratchet.
- **Recommended Fix:** Either (a) amend CLAUDE.md to sanction fallbacks (decision needed from Vikram), or (b) add a second scanner category "fallback-hex" with its own down-only baseline (~2,304) so new instances are blocked. Also sync `escape_hatches` in the baseline with reality or drop the field.
- **Regression Risk:** None (tooling only).
- **Validation Required:** `npm run lint:colors` shows new category; gate fails on a deliberately added fallback hex.
- **Suggested PR:** PR1

## ISSUE ID: CAT-AUDIT-0101
- **Category:** Banned pattern — `var(--ds-*, #hex)` fallbacks (mass pattern)
- **Severity:** High
- **Surface:** Repo-wide; hotspots: index.css bridge, Caty AI, chat, resource360, allwork, project-work-hub
- **Route:** multiple (all shell routes load index.css)
- **Component:** CSS token bridge + component stylesheets
- **File Path:** see appendix A
- **Mode:** Both (fallback fires whenever the token is undefined at that scope — silent light/dark divergence)
- **CRE Rule Impact:** None
- **ADS Impact:** High — 2,203 occurrences of the exact pattern CLAUDE.md bans
- **Typography Impact:** None
- **Performance Impact:** Negligible
- **Accessibility Impact:** Contrast can silently degrade when fallback fires in the wrong theme
- **Evidence (samples):** `src/index.css:65` `--status-todo-bg: var(--ds-text-subtle, #42526e);` · `src/components/hierarchy/WorkItemTable.tsx:187` `background: 'var(--ds-link, #0C66E4)'` · `src/components/project-hub/ProjectCard.tsx:36` `'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))'`
- **Why This Is A Problem:** If ADS tokens fail to load (theme init race, portal/iframe scope, storybook), every fallback renders the hard-coded **light-mode** hex regardless of active theme — classic light-mode drift. The nested `var(--ds-*, var(--cp-*, #hex))` triple chains (WorkItemTable, ProjectCard) add a second divergence layer: the `--cp-*` middle value can differ from the ADS token in dark mode.
- **Recommended Fix:** Ratchet-driven removal: strip fallbacks to token-only (`var(--ds-x)`) file-by-file, starting with component files (index.css bridge last since it IS the compat layer). Track via the new gate category from CAT-AUDIT-0100.
- **Regression Risk:** Medium — any surface currently relying on the fallback (token not defined in that scope) will lose color; verify per-file in both themes.
- **Validation Required:** Dark+light screenshots of touched surfaces; grep count decrease; gate baseline ratcheted down.
- **Suggested PR:** PR2 (component files), PR3 (styles/*.css), index.css deferred to PR11
- **Occurrences:** 2,203 total — index.css 1,002 · CatyOverrides.css 284 · chat/chat.css 245 · r360-member.css 177 · styles/allwork.css 146 · styles/r360.css 117 · SubtasksPanel.css 73 · linked-work-items.css 41 · AttachmentsSection.css 39 · CatyWidget.css 36 · r360-tokens.css 24 · HuddleScreenView.tsx 11 · WorkItemTable.tsx 8

## ISSUE ID: CAT-AUDIT-0102
- **Category:** Banned pattern — `token('color.x', '#hex')` fallbacks (mass pattern)
- **Severity:** Medium
- **Surface:** Project Hub dashboard widgets (dominant), scattered elsewhere
- **Route:** /project-hub/:key/dashboard
- **Component:** ItemsByStatusWidget, QADefectsWidget, ProductionIncidentsWidget, ReleaseConfidenceWidget, DeliveryCompositionWidget, ScopeChangeWidget, OverdueWidget, TimeInStatusWidget, TimeInStatusFullscreenModal, GadgetSettingsPanel
- **File Path:** src/components/project-hub/dashboard/**
- **Mode:** Both
- **CRE Rule Impact:** None
- **ADS Impact:** Medium — token() helper is the allowed API, but hex second args are banned fallbacks
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** Fallback `#292A2E` (dark text) on a dark surface = unreadable if it ever fires
- **Evidence:** `src/components/project-hub/dashboard/widgets/QADefectsWidget.tsx:113` `color: token('color.text', '#292A2E')` · `ItemsByStatusWidget.tsx:396` `token('color.text.disabled', '#B3B9C4')` · `GadgetSettingsPanel.tsx:550` `token('color.text.subtlest', '#97A0AF')`
- **Why This Is A Problem:** Same failure mode as 0101; additionally these fallbacks are Jira **light-palette** hexes, so dark mode gets light-mode text colors if tokens are unavailable. 101 occurrences repo-wide.
- **Recommended Fix:** Drop the second argument (`token('color.text')`) — @atlaskit/tokens works without fallback once the theme is mounted via AdsThemeProvider.
- **Regression Risk:** Low — tokens are always mounted under CatalystShell.
- **Validation Required:** Dashboard screenshots light+dark; grep `token\('color[^)]*'#` → 0 in touched files.
- **Suggested PR:** PR2
- **Occurrences:** 101

## ISSUE ID: CAT-AUDIT-0103
- **Category:** Banned pattern — raw `rgb()/rgba()` numeric channels (mass pattern)
- **Severity:** High
- **Surface:** Repo-wide; worst: capacity timeline, task10, project-work-hub dialogs, resource360, goals(dark), budget, testhub, caty, users, releases
- **Route:** multiple
- **Component:** mostly module CSS + inline styles
- **File Path:** see appendix B
- **Mode:** Both — most are shadow/overlay/tint values that are theme-blind
- **CRE Rule Impact:** None
- **ADS Impact:** High — raw rgba() is banned "even with CSS variables as arguments"
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** Alpha-tinted text/borders computed against the wrong theme background lose contrast
- **Evidence (samples):** `src/components/capacity/timeline/Timeline.module.css` (113 lines) · `src/modules/task10/styles/task10-v2.css` (60) · `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` (38 inline) · `src/types/producthub/request.ts:75` `bg: 'rgba(168,85,247,0.15)'`
- **Why This Is A Problem:** 3,228 lines with numeric-channel rgb/rgba. Shadows/tints hand-tuned for light surfaces render as muddy or invisible washes in dark mode; none respond to theme switch. This is the single largest drift category by volume.
- **Recommended Fix:** Map shadows to `var(--ds-shadow-raised/overlay/overflow)` (single source already established in catalyst-ads-parity.css per index.css comment), tints to `--ds-background-*` subtle tokens. Cluster-by-surface, one PR per hotspot file group.
- **Regression Risk:** Medium-High — shadow/tint appearance changes are visible; needs screenshot signoff per surface.
- **Validation Required:** Light+dark screenshots per touched surface; per-file rgba count → 0.
- **Suggested PR:** PR4 (capacity+timeline), PR5 (project-work-hub+task10), PR6 (styles/*.css legacy sheets)
- **Occurrences:** 3,228 (161 of these in index.css)

## ISSUE ID: CAT-AUDIT-0104
- **Category:** Escape-hatch misuse — mass copy-paste generic justification
- **Severity:** High
- **Surface:** Repo-wide (67 files)
- **Route:** multiple
- **Component:** many
- **File Path:** e.g. src/components/layout/HomeSidebar.tsx, src/components/ja/icons/WorkItemIcon.tsx, src/lib/capacity-heatmap/utils.ts, src/config/riskColors.ts
- **Mode:** Both
- **CRE Rule Impact:** None
- **ADS Impact:** High — escape hatch policy requires "intentional, documented exceptions only… (probed YYYY-MM-DD)"
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** Unreviewed colors bypass contrast review
- **Evidence:** 143 occurrences of the identical string `ads-scanner:ignore-line — intentional design color, no ADS token equivalent` — none carry a date, probe evidence, or issue ID. Several are demonstrably false: `HomeSidebar.tsx:481` `home: '#4A7FE0'` (≈ `--ds-link`), `WorkItemIcon.tsx:35` `epic: '#a060f0'` (≈ ADS purple / epic icon token), `capacity-heatmap/utils.ts:41` `text: '#7dd3fc'` (≈ `--ds-text-information` family).
- **Why This Is A Problem:** The escape hatch has been used as a bulk lint-silencer, not a documented exception mechanism. This is why the gate reads 0 while 313 hatches exist. Contrast with the compliant standard in `statusPalette.ts:105-120` ("Jira-parity bypass, no ADS token (probed 2026-06-29, confirmed #94C748 vs #B3DF72 on ksa-catalyst.com)") — that is what every hatch should look like.
- **Recommended Fix:** Re-audit all 143: replace with ADS token where an equivalent exists; where genuinely parity-bound, rewrite the comment to the dated/probed format and register in `color-baseline.json` `escape_hatches`.
- **Regression Risk:** Low-Medium per color; verify visually.
- **Validation Required:** Every remaining hatch matches regex `ignore-(next-)?line — .*(probed 20\d\d-\d\d-\d\d|CAT-[A-Z]+-)`.
- **Suggested PR:** PR7
- **Occurrences:** 143 (67 files)

## ISSUE ID: CAT-AUDIT-0105
- **Category:** Escape-hatch misuse — bare, reason-less ignores
- **Severity:** Medium
- **Surface:** chat/caty-mood SVGs, chat dock, auth/login, catalyst-detail-views, filters
- **Route:** /login, chat dock (global), detail views
- **Component:** CatyMarkFlat, CatySleepingFace, CatyHiddenEye, CatyFabIcon, CatyPanel, LoginFormPanel/LoginHeroPanel/index, CatalystViewBase, CanonicalFilter
- **File Path:** src/components/chat/caty-mood/*.tsx, src/components/chat/dock/*.tsx, src/components/auth/login/*.tsx, src/components/catalyst-detail-views/shared/CatalystViewBase.tsx:49
- **Mode:** Both
- **CRE Rule Impact:** None
- **ADS Impact:** Medium — policy requires a reason on every hatch
- **Typography Impact:** CanonicalFilter uses hatches to hide `fontSize: 7` / `fontSize: 8` (CanonicalFilter.tsx:3494, 3512) — a typography violation smuggled through the **color** scanner's ignore
- **Performance Impact:** None
- **Accessibility Impact:** 7–8px text is below any readable minimum
- **Evidence:** 48 hatches with no reason text at all, e.g. `CatyMarkFlat.tsx:44-50` four consecutive `{/* ads-scanner:ignore-next-line */}`, `auth/login/index.tsx:24`, `CatalystViewBase.tsx:49`.
- **Why This Is A Problem:** Caty mascot SVG brand art is plausibly legitimate (component-owned brand color), but undocumented hatches are indistinguishable from violations, and at least two hatches (CanonicalFilter) are being used to suppress non-color findings.
- **Recommended Fix:** Add one-line reasons ("Caty brand art — component-owned color") or lift to a file-level documented exception; remove the CanonicalFilter font-size hatches and fix the font sizes (min `--ds-font-size-050`/11px).
- **Regression Risk:** None for comments; low for font-size fix (badge layout).
- **Validation Required:** Zero reason-less hatches; CanonicalFilter chip legible at ≥11px equivalent.
- **Suggested PR:** PR7
- **Occurrences:** 48

## ISSUE ID: CAT-AUDIT-0106
- **Category:** Escape-hatched full hex+rgba palette in a types file
- **Severity:** Medium
- **Surface:** Product Hub — requests
- **Route:** /producthub/requests
- **Component:** request stage/status palette
- **File Path:** src/types/producthub/request.ts
- **Mode:** Both
- **CRE Rule Impact:** None
- **ADS Impact:** Medium — custom color constants are banned; also mixes tokens and hex in one array
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** Alpha tints (`rgba(168,85,247,0.15)`) theme-blind
- **Evidence:** `request.ts:75` `technical_validation: { color: '#A855F7', bg: 'rgba(168,85,247,0.15)', fill: 'rgba(168,85,247,0.40)' } // ads-scanner:ignore-line` · `request.ts:123` avatar palette mixing `var(--ds-link)` with `'#0369a1'` and `var(--cp-ink-2)`
- **Why This Is A Problem:** A domain palette (Tailwind purple/sky hexes, not ADS or Jira colors) hatched wholesale with no justification; the mixed token/hex array guarantees inconsistent theming across avatar chips.
- **Recommended Fix:** Map stages to `--ds-background-*`/`--ds-chart-*` pairs (or @atlaskit/lozenge appearances); replace the mixed array with an all-token list.
- **Regression Risk:** Low-Medium — request board chips change hue slightly.
- **Validation Required:** Requests board screenshots light+dark.
- **Suggested PR:** PR8
- **Occurrences:** ~12 lines

## ISSUE ID: CAT-AUDIT-0107
- **Category:** Named CSS colors in style objects — hard light-mode assumptions
- **Severity:** High
- **Surface:** Releases (analytics charts, smart assignment, add-tests), Roadmap, catalyst-detail-views
- **Route:** /releases/*, roadmap routes, detail views
- **Component:** DefectTrendChart, VelocityChart, QualityTrendChart, SmartAssignmentModal, DistributionChart, AddTestsFooter, RoadmapEngine, themeRoadmapConfig, ReleaseSection (business-request/incident/story)
- **File Path:** src/components/releases/cycle-command-center/analytics/*.tsx, src/components/releases/smart-assignment/*.tsx, src/components/roadmap/RoadmapEngine.tsx, src/config/roadmaps/themeRoadmapConfig.ts, src/components/catalyst-detail-views/*/ReleaseSection.tsx
- **Mode:** **Dark-mode breakage** — these are literal light-mode constants
- **CRE Rule Impact:** None
- **ADS Impact:** High — named colors banned ("inline style={{ color: 'green' }} or any named CSS color")
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** White tooltip bg with token-colored (light) text in dark mode → near-zero contrast
- **Evidence:** `DefectTrendChart.tsx:77` `backgroundColor: 'white'` (recharts tooltip) · `VelocityChart.tsx:80`, `QualityTrendChart.tsx:65` same · `SmartAssignmentModal.tsx:69` `style={{ backgroundColor: 'white' }}` · `RoadmapEngine.tsx:527,879` `backgroundColor: 'white'` · `themeRoadmapConfig.ts:39,44,49` `background: 'white'` · `story/ReleaseSprintSection.tsx:222` `color: 'white'`
- **Why This Is A Problem:** 80 named-color style values in scope, 19 of them `white` backgrounds. Every one renders a light-mode surface inside dark mode. Chart tooltips are the most user-visible (hover on any release analytics chart in dark mode).
- **Recommended Fix:** `white` surfaces → `var(--ds-surface-overlay)` (tooltips/popovers) or `var(--ds-surface-raised)`; `color:'white'` on bold chips → `var(--ds-text-inverse)`; semantic named colors (defectWorkflow.ts `color:'red'` etc.) → map through lozenge appearances.
- **Regression Risk:** Low — token values match current light rendering.
- **Validation Required:** Dark-mode hover screenshots of the three analytics charts + roadmap.
- **Suggested PR:** PR9
- **Occurrences:** 80 (19 white-background)

## ISSUE ID: CAT-AUDIT-0108
- **Category:** Local hex color-constant maps outside statusPalette.ts
- **Severity:** High
- **Surface:** Config, layout sidebar, work-item icons, goals, capacity heatmap, ideas-roadmap, admin, tasks, resource360
- **Route:** multiple
- **Component:** riskColors, WorkItemIcon, HomeSidebar hub accents, capacity-heatmap utils, GoalDetailDrawer/GoalsTreeView, RoadmapCard/PresentationModal, WorkflowTypePanel, SidebarFields, ChronologyView/RingViewV16, ExportWorkItems, SyncLogs, EvidencePackModal, StepDetails, BackgroundPickerItem, ProductRoadmapPage
- **File Path:** appendix C (19 files)
- **Mode:** Both
- **CRE Rule Impact:** None
- **ADS Impact:** High — "custom color constants or local color maps" explicitly banned; statusPalette.ts is the sole sanctioned palette file (per memory: change colors only in statusPalette.ts)
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** Unreviewed hues; e.g. riskColors `#922b21`/`#cb4335` are non-ADS reds
- **Evidence:** `src/config/riskColors.ts:20-21` `critical: '#922b21'`, `high: '#cb4335'` · `HomeSidebar.tsx:481-484` per-hub accent map (`home:'#4A7FE0'`, `product:'#38BDF8'`) · `WorkItemIcon.tsx:34-35` `'business-request':'#9c8466'`, `epic:'#a060f0'` · `StepDetails.tsx:220-222` severity map mixing `--ds` tokens with `#FECDD3`/`#FEFCE8`/`#FEF08A`
- **Why This Is A Problem:** 19 parallel palettes drift independently from ADS and from each other (three different "epic purple"s exist: `#a060f0`, `#8b5cf6`, ADS purple). Any theme change requires hunting 19 files.
- **Recommended Fix:** Consolidate into token-backed maps (pattern already proven in `src/lib/workstream-colors.ts`, which was migrated to `--cp-workstream-*` vars with hex only in comments). riskColors → `--ds-text-danger` ramp or Jira-parity hatch with probe evidence.
- **Regression Risk:** Medium — icon/accent hues shift slightly toward ADS.
- **Validation Required:** Screenshot pass over sidebar, work-item icons, risk badges in both themes.
- **Suggested PR:** PR8
- **Occurrences:** 19 files

## ISSUE ID: CAT-AUDIT-0109
- **Category:** index.css token bridge — raw-hex dark overrides & bridge debt
- **Severity:** Medium
- **Surface:** Global shell (index.css, 7,787 lines)
- **Route:** all
- **Component:** `--cp-*` legacy alias bridge + dark-mode override block
- **File Path:** src/index.css
- **Mode:** Dark-mode block hard-pins hexes
- **CRE Rule Impact:** None
- **ADS Impact:** Medium — bridge is transitional by design, but raw pins bypass ADS ramp
- **Typography Impact:** None
- **Performance Impact:** 7.8k-line render-blocking sheet (noted for Lane perf, not scored here)
- **Accessibility Impact:** Pinned dark hexes won't follow future ADS contrast updates
- **Evidence:** 1,055 hex lines total; 1,002 are `var(--ds-*, #hex)` bridge fallbacks (counted under 0101); **21 raw non-token hex lines**, e.g. `index.css:6127` `--cp-bg-sunken: #161A1D !important;`, `6133` `--surface-subtle: #161A1D !important;`, `6146-6151` `--cp-text-primary: #C7D1DB !important;` etc.; `6155-6162` hsl-triplet shadcn vars pinned to hex-equivalent comments. Documented Jira-parity block `240-247` (`--cat-dep-marker: #ff991f` etc.) has inline rationale but not the dated escape-hatch format. 161 raw rgba lines, 2 raw hsl.
- **Why This Is A Problem:** The dark theme block bypasses `--ds-*` for several surfaces/text aliases (`#161A1D` instead of a ds-surface token, `#C7D1DB/#9FADBC/#8C9BAB` instead of ds-text ramp), so those aliases silently diverge from ADS dark values if tokens update. `!important` also blocks any component-level correction.
- **Recommended Fix:** Point the 21 raw pins at their ds equivalents (`#161A1D` = ADS sunken dark → `var(--ds-surface-sunken)` in dark scope; text greys → `--ds-text*`); reformat the Jira-parity block comments to the dated hatch format.
- **Regression Risk:** Medium — global sheet; ship alone with full-shell dark screenshots.
- **Validation Required:** Dark-mode shell screenshot set (sidebar, header, cards, popovers).
- **Suggested PR:** PR11 (isolated)
- **Occurrences:** 21 raw hex + 161 raw rgba + 2 raw hsl (bridge fallbacks counted in 0101)

## ISSUE ID: CAT-AUDIT-0110
- **Category:** Dead duplicate theme files ("<name> 3" Finder copies) containing hex
- **Severity:** Low
- **Surface:** Theme layer
- **Route:** n/a (not imported)
- **Component:** AdsThemeProvider / ads tokens
- **File Path:** `src/theme/ads/tokens 3.ts` (11.7K), `src/theme/ads/index 3.ts`, `src/theme/ads/AdsThemeProvider 3.tsx`
- **Mode:** n/a
- **CRE Rule Impact:** None
- **ADS Impact:** Low — dead code, but pollutes every color grep/audit and risks accidental import
- **Typography Impact:** None
- **Performance Impact:** Bundled? No — unimported (imports resolve to `theme/ads` → `index.ts`); tree-shaken.
- **Accessibility Impact:** None
- **Evidence:** `ls src/theme/ads/` shows space-suffixed " 3" copies alongside originals; `tokens 3.ts:128-131` contains dark hexes `#1A3A6A`, `#DDEBFF`, `#1C3D2E`, `#B6F2D6`; no file imports the " 3" variants.
- **Why This Is A Problem:** Finder-duplicate artifacts checked into the theme directory; they will fork silently from the live tokens file and inflate every future audit count.
- **Recommended Fix:** Delete the three " 3" files.
- **Regression Risk:** None (unreferenced).
- **Validation Required:** `tsc -p tsconfig.app.json` error count unchanged (~157 baseline); build passes.
- **Suggested PR:** PR12 (hygiene)
- **Occurrences:** 3 files

## ISSUE ID: CAT-AUDIT-0111
- **Category:** Legacy `src/styles/*.css` sheets — hex + rgba debt cluster
- **Severity:** High
- **Surface:** Goals (dark), Budget, TestHub, Caty, Users, Release Hub, PlanHub, Product Kanban, Dept Intelligence, Capacity, Request Detail
- **Route:** module routes loading these sheets
- **Component:** module stylesheets
- **File Path:** src/styles/goals-dark.css, budget-module.css, testhub.css, caty.css, users-module.css, release-hub.module.css, request-detail-panel.css, catalyst-colors.css, catalyst-ads-parity.css, planhub.css, product-kanban.css, dept-intelligence.css, capacity-module.css
- **Mode:** Both; `goals-dark.css` is a hand-rolled dark theme entirely outside the ADS ramp
- **CRE Rule Impact:** None
- **ADS Impact:** High
- **Typography Impact:** None scored here
- **Performance Impact:** None
- **Accessibility Impact:** Hand-tuned dark values not contrast-verified
- **Evidence:** 481 hex-bearing lines across `src/styles/*.css`; raw-rgba hotspots: goals-dark.css 42, budget-module.css 33, testhub.css 30, caty.css 30, users-module.css 29, release-hub.module.css 24, request-detail-panel.css 23, catalyst-colors.css 23, catalyst-ads-parity.css 22, planhub.css 22, product-kanban.css 21, dept-intelligence.css 21, capacity-module.css 19
- **Why This Is A Problem:** These sheets predate the token bridge and duplicate theme logic per-module; `catalyst-colors.css` is by name a parallel color system. A module-level dark stylesheet (goals-dark.css) guarantees drift against ADS dark tokens.
- **Recommended Fix:** Per-module tokenization sweeps; retire goals-dark.css in favor of ds tokens + `[data-theme]` scoping. `catalyst-ads-parity.css` entries are the sanctioned shadow source — hatch-document its 22 rgba shadow definitions rather than remove.
- **Regression Risk:** Medium-High; one module per PR with screenshots.
- **Validation Required:** Module screenshots light+dark per sweep.
- **Suggested PR:** PR6
- **Occurrences:** 481 hex lines + ~350 raw rgba lines in this directory

## ISSUE ID: CAT-AUDIT-0112
- **Category:** Raw `hsl()` numeric values
- **Severity:** Low
- **Surface:** theme/tokens.ts, project feature view, ui/checkbox, okr-v2
- **Route:** scattered
- **Component:** tokens.ts legacy shadcn palette, FeatureViewPage.module.css, checkbox.tsx, ObjectiveDrawerV2.tsx
- **File Path:** src/theme/tokens.ts, src/pages/project/FeatureViewPage.module.css, src/components/ui/checkbox.tsx, src/modules/okr-v2/components/ObjectiveDrawerV2.tsx
- **Mode:** Both
- **CRE Rule Impact:** None
- **ADS Impact:** Low — small count; note the 764 `hsl(var(--…))` shadcn-style usages are indirection, not raw values (excluded)
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** Minor
- **Evidence:** 17 raw `hsl(<numbers>` occurrences in scope (4 in theme/tokens.ts, 4 in FeatureViewPage.module.css, 3 in checkbox.tsx, 2 in ObjectiveDrawerV2.tsx, 4 scattered)
- **Why This Is A Problem:** Raw hsl is banned; checkbox.tsx is a shared UI primitive so its 3 values propagate everywhere checkboxes render.
- **Recommended Fix:** Replace with ds tokens; checkbox should defer to @atlaskit/checkbox colors or `--ds-border/--ds-background-selected`.
- **Regression Risk:** Low.
- **Validation Required:** Checkbox states screenshot light+dark.
- **Suggested PR:** PR2
- **Occurrences:** 17 (+2 in index.css, counted in 0109)

## ISSUE ID: CAT-AUDIT-0113
- **Category:** Bare hex literals in ts/tsx (residual, non-hatched)
- **Severity:** Medium
- **Surface:** broad — project-hub (38), shared (29), layout (18), chat (18), catalyst-detail-views (18), project-work-hub (16), hierarchy (15), strategy (13), for-you (12), resource360 (9), others
- **Route:** multiple
- **Component:** many (top files: jira-issue-type-icons.tsx 20, ChannelEmptyState.tsx 17, WorkItemTable.tsx 15, SelectCoverPanel.tsx 14, HuddleScreenView.tsx 12, views.ts 11)
- **File Path:** appendix D
- **Mode:** Both
- **CRE Rule Impact:** None
- **ADS Impact:** Medium — mixture of true violations, hex-in-fallback (overlap with 0101/0102), and hex inside comments/SVG brand art
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** Case-by-case
- **Evidence:** 472 hex-bearing lines in ts/tsx in scope; 352 carry **no** ignore comment. Samples: `features/kanban-board/components/SelectCoverPanel.tsx` (14 — cover color swatches, arguably content colors), `components/strategy/room/AIExecutiveBrief.tsx` (7), `types/views.ts` (11 — view color presets).
- **Why This Is A Problem:** Everything here is invisible to the gate (either whitelisted-fallback or comment/string contexts the scanner skips). The subset that are real style values are un-themed.
- **Recommended Fix:** Triage during PR2/PR8 sweeps: token, hatch-with-evidence, or delete. Content-color pickers (cover swatches, editor text-color palette) are legitimate data, not styling — annotate as such.
- **Regression Risk:** Case-by-case.
- **Validation Required:** Per-file grep zero or documented.
- **Suggested PR:** PR2/PR8 as encountered
- **Occurrences:** 472 lines (352 non-hatched)

---

## Appendix A — `var(--ds-*, #hex)` fallback totals (2,203)
| File | Count |
|---|---|
| src/index.css | 1,002 |
| src/components/caty-ai/CatyOverrides.css | 284 |
| src/components/chat/chat.css | 245 |
| src/components/resource360/r360-member.css | 177 |
| src/styles/allwork.css | 146 |
| src/styles/r360.css | 117 |
| src/modules/project-work-hub/components/SubtasksPanel/SubtasksPanel.css | 73 |
| src/modules/project-work-hub/components/linked-work-items/linked-work-items.css | 41 |
| src/modules/project-work-hub/components/dialogs/story-detail-modules/AttachmentsSection.css | 39 |
| src/components/caty-ai/CatyWidget.css | 36 |
| src/components/resource360/r360-tokens.css | 24 |
| src/components/layout/HuddleScreenView.tsx | 11 |
| src/components/hierarchy/WorkItemTable.tsx | 8 |

## Appendix B — raw rgb/rgba numeric hotspots (of 3,228)
Timeline.module.css 113 · task10-v2.css 60 · story-detail-extensions.css 43 · r360-member.css 43 · goals-dark.css 42 · BacklogPage.atlaskit.tsx 38 · budget-module.css 33 · SubtasksPanel.css 31 · RAJiraSidePanel.tsx 31 · JiraBasicFilter.css 31 · testhub.css 30 · caty.css 30 · AllReleasesPage.tsx 30 · login-styles.css 30 · users-module.css 29 · AttachmentsSection.css 29 · release-hub.module.css 24 · RecommendedPanel.tsx 24 · request-detail-panel.css 23 · catalyst-colors.css 23 · catalyst-ads-parity.css 22 · FeatureFlagsPage.tsx 22 · planhub.css 22 · ReqAssistLibrary.tsx 21 · product-kanban.css 21 · dept-intelligence.css 21 · VoiceFloatingCapsule.tsx 20 · theme-utils.ts 20 · capacity-module.css 19 · JiraTable.tsx 19

## Appendix C — hex color-constant map files outside statusPalette.ts (19)
src/config/riskColors.ts · src/components/catalyst-detail-views/shared/sections/Description/_components/TableInteractions/BackgroundPickerItem.tsx · src/components/goals/GoalDetailDrawer.tsx · src/components/goals/GoalsTreeView.tsx · src/components/ja/icons/WorkItemIcon.tsx · src/components/layout/HomeSidebar.tsx · src/components/resources/ExportWorkItems.tsx · src/components/admin/WorkflowTypePanel.tsx · src/components/resource360/ChronologyView.tsx · src/components/resource360/RingViewV16.tsx · src/components/kanban/WorkItemCard.tsx · src/components/ideas-roadmap/PresentationModal.tsx · src/components/ideas-roadmap/RoadmapCard.tsx · src/components/project-hub/wizard/StepDetails.tsx · src/lib/capacity-heatmap/utils.ts · src/modules/workhub/admin/components/SyncLogs.tsx · src/modules/tasks/components/TaskDetailDrawer/SidebarFields.tsx · src/pages/ProductRoadmapPage.tsx · src/pages/dev/components/EvidencePackModal.tsx

## Appendix D — bare hex in ts/tsx by directory (352 non-hatched lines)
components/project-hub 38 · components/shared 29 · components/layout 18 · components/chat 18 · components/catalyst-detail-views 18 · modules/project-work-hub 16 · components/hierarchy 15 · components/strategy 13 · components/for-you 12 · components/resource360 9 · theme/atlassian 8 · stories/enterprise 7 · theme/ads 6 · components/goals 6 · components/catalyst-ds 6 · components/kanban 5 · components/auth 5 · pages/admin 4 · remainder scattered

## Appendix E — escape-hatch census (in scope)
Total: 313. Bare/no-reason: 48. Generic undated "intentional design color, no ADS token equivalent": 143 (67 files). Compliant dated/probed format (statusPalette.ts style, phase-6 approved exceptions in ActionTooltip.tsx, dock/chat "tokens-only stylesheet" import notes): remainder ~122 — of these, the ~20 file-level "CSS file uses only var(--c-chat-*) tokens" import hatches are reasonable but reference a non-ds `--c-chat-*` token namespace worth a follow-up look.

---

## Lane Summary

| Severity | Issues |
|---|---|
| Critical | 0 |
| High | 6 (CAT-AUDIT-0100, 0101, 0103, 0104, 0107, 0108, 0111 → 7 counting 0111) |
| Medium | 5 (0102, 0105, 0106, 0109, 0113) |
| Low | 2 (0110, 0112) |

Correction: High = 7. **Total issues: 14.**

**Occurrence totals (lines, in-scope; categories overlap where a fallback hex is counted both as hex and as fallback):**
- `var(--ds-*, #hex)` fallbacks: **2,203**
- `token('…', '#hex')` fallbacks: **101**
- Raw rgb/rgba numeric: **3,228**
- Raw hsl numeric: **19**
- Named CSS colors in style objects: **80** (19 white backgrounds)
- Bare hex lines in ts/tsx: **472** (352 non-hatched)
- Hex lines in src/styles/*.css: **481**; in index.css: **1,055** (21 raw non-token)
- Escape hatches: **313** (48 reason-less, 143 generic copy-paste)
- Distinct drift occurrence-lines (dedup estimate): **~5,300**

**Single most important finding:** the color gate reports a clean repo (baseline 0) because the scanner whitelists banned fallback patterns and 313 escape hatches — 191 of which do not meet the documented exception standard. Fix the gate (CAT-AUDIT-0100) before any sweep, or sweeps will not ratchet.
