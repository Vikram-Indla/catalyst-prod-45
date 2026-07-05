# LANE 3 — Dark Mode Risk (Static Audit)

**Audit ID range:** CAT-AUDIT-0200…0299
**Date:** 2026-07-03
**Method:** Static grep sweep of `src/` (excluding `modules-dormant`, `_graveyard`, `*.stories.*`, `*.test.*`, `*.spec.*`, `__tests__`) + source read of the theme infrastructure (`src/providers/ThemeProvider.tsx`, `src/theme/atlassian/AdsThemeProvider.tsx`, `index.html` bootstrap, sampled `src/index.css`). No build, no dev server, no browser. All counts are occurrence counts from line-based grep; multi-line declarations may be slightly undercounted.

---

## CAT-AUDIT-0200 — Three writers contend for `data-theme`; documented handoff rule violated in two places

- **Category:** Theme infrastructure / sync
- **Severity:** High
- **Surface:** Global (every route)
- **Route:** * (all)
- **Component:** ThemeProvider, AdsThemeProvider, index.html bootstrap script
- **File Path:** `src/providers/ThemeProvider.tsx`, `index.html`, `src/theme/atlassian/AdsThemeProvider.tsx`
- **Mode:** Dark (and light→dark toggle)
- **CRE Rule Impact:** None direct
- **ADS Impact:** Critical — Atlaskit's dark CSS is keyed on `html[data-theme~="dark:dark"]` (token-list-contains). An exact-value write of `data-theme="dark"` kills every `--ds-*` dark rule (~460 rules per the RCA documented in `AdsThemeProvider.tsx:75-101`).
- **Typography Impact:** Indirect — `--ds-font-*` live in the same token scope
- **Performance Impact:** None
- **Accessibility Impact:** High — if the race resolves the wrong way, dark mode paints light-hex fallbacks (`#292A2E` on dark surfaces per the documented RCA), destroying contrast
- **Evidence (file:line):**
  - `index.html:92` — comment: *"`data-theme` is owned by Atlaskit's setGlobalTheme — never set it here"* — followed by `index.html:100`: `de.setAttribute('data-theme', mode);` (sets it anyway)
  - `src/providers/ThemeProvider.tsx:41` — `de.setAttribute('data-theme', resolved);` in `applyTheme()`, executed on every mount, theme change, and OS-preference change (lines 62-66, 69-79)
  - `src/theme/atlassian/AdsThemeProvider.tsx:98-101` — documented final RCA: *"Let Atlaskit own `data-theme`. Catalyst CSS keys off the `.dark` class"* — i.e. both writes above contradict the recorded fix
- **Why This Is A Problem:** Three writers touch the same attribute: the pre-paint script writes `"dark"`, ThemeProvider's `applyTheme()` writes `"dark"` again on every effect run, and Atlaskit's `setGlobalTheme` (async) writes the parameterised `"dark:dark light:light spacing:spacing typography:typography shape:shape"` string it needs. On mount and on every toggle, child effect (`setGlobalTheme`, async DOM write) races parent effect (`applyTheme`, sync write). Whichever lands last wins: if the clean `"dark"` value survives, Atlaskit's `[data-theme~="dark:dark"]` selectors stop matching and the entire `--ds-*` dark token layer dies (the exact failure the AdsThemeProvider comment block documents as "Phase 11 TRUE RCA"); if the parameterised string survives, the `[data-theme="dark"]` exact-match half of Catalyst rules dies (mostly harmless — nearly all are paired with `.dark`, see 0204). Correctness currently depends on undocumented effect-ordering + Atlaskit internal async timing.
- **Recommended Fix:** Enforce the recorded handoff rule: delete `data-theme` writes from `index.html:100` and `ThemeProvider.tsx:41` (keep `.dark` class + `data-color-mode`). Audit `src/index.css` for `[data-theme="dark"]`-only selectors first and add `.dark` twins where missing (structure scan shows they are already paired everywhere sampled).
- **Regression Risk:** Medium — any CSS rule keyed solely on `[data-theme="dark"]` would go dark-dead; must be swept before removal.
- **Validation Required:** Toggle light↔dark 5× on a live route; assert `getComputedStyle(html).getPropertyValue('--ds-text')` is non-empty in dark; assert `html.getAttribute('data-theme')` contains `dark:dark` after settle. Repeat with OS-preference flip in `system` mode.
- **Suggested PR:** PR1

---

## CAT-AUDIT-0201 — First-visit dark-OS users get a light flash (bootstrap defaults null → light)

- **Category:** Theme infrastructure / flash on load
- **Severity:** Medium
- **Surface:** Global (first visit / cleared storage)
- **Route:** * (all)
- **Component:** index.html no-flash script vs ThemeProvider default
- **File Path:** `index.html`, `src/providers/ThemeProvider.tsx`
- **Mode:** Dark (system)
- **CRE Rule Impact:** None
- **ADS Impact:** None (transient)
- **Typography Impact:** None
- **Performance Impact:** One extra full-page repaint on first load
- **Accessibility Impact:** Medium — bright white flash for users who chose a dark OS (photosensitivity, low-vision glare)
- **Evidence (file:line):**
  - `index.html:95-96` — `var t = localStorage.getItem('catalyst-theme'); var isDark = t === 'dark' || (t === 'system' && matchMedia(...))` — when `t` is `null` (first visit), `isDark` is `false` regardless of OS preference
  - `src/providers/ThemeProvider.tsx:47-51` — React state defaults missing cache to `'system'`, which resolves dark via `getSystemTheme()` (lines 25-28)
  - `src/providers/ThemeProvider.tsx:62-66` — `applyTheme` runs in `useEffect` (post-first-paint)
- **Why This Is A Problem:** The pre-paint script and the provider disagree on the default for a missing cache key. A first-time visitor with a dark OS boots light (script), first paint is light, then the provider's effect flips `.dark` on → visible light→dark flash. Same for anyone whose localStorage was cleared.
- **Recommended Fix:** In the bootstrap script treat `null` the same as `'system'`: `var isDark = t === 'dark' || ((t === 'system' || t === null) && window.matchMedia('(prefers-color-scheme: dark)').matches);`
- **Regression Risk:** Low — one-line, only changes the null branch.
- **Validation Required:** Clear localStorage, set OS dark, hard-reload; confirm no white flash (throttled CPU in DevTools makes it visible).
- **Suggested PR:** PR1

---

## CAT-AUDIT-0202 — localStorage vs Supabase theme race; no cross-tab sync

- **Category:** Theme infrastructure / state sync
- **Severity:** Medium
- **Surface:** Global
- **Route:** * (all)
- **Component:** ThemeProvider `syncFromDB` / `setTheme`
- **File Path:** `src/providers/ThemeProvider.tsx`
- **Mode:** Both
- **CRE Rule Impact:** None
- **ADS Impact:** None
- **Typography Impact:** None
- **Performance Impact:** Negligible
- **Accessibility Impact:** Low-Medium — theme silently reverts against explicit user choice
- **Evidence (file:line):**
  - `src/providers/ThemeProvider.tsx:82-113` — `syncFromDB()` fetches `user_theme_preferences` once on mount and unconditionally calls `setThemeState(mode)` + overwrites localStorage. The `cancelled` flag guards unmount only — not a user toggle that happened after mount but before the DB response.
  - `src/providers/ThemeProvider.tsx:115-131` — `setTheme` writes localStorage then fires an un-awaited upsert; no ordering guarantee vs an in-flight `syncFromDB`.
  - No `window.addEventListener('storage', …)` anywhere in the file — two open tabs diverge until reload.
  - Cross-device: localStorage says `light`, DB says `dark` → boots light (script), flips dark seconds later when the fetch lands — a delayed whole-app repaint.
- **Why This Is A Problem:** Classic last-writer-wins race: a user who toggles the theme within the first ~1-2s of load has their choice reverted by the stale DB read. The DB is declared "source of truth" (line 3) but there is no versioning/timestamp comparison and no realtime or storage-event propagation.
- **Recommended Fix:** Track a `userDirty` ref set by `setTheme`; skip `syncFromDB` application if dirty. Add a `storage` event listener to mirror changes across tabs. Optionally compare `updated_at` before applying DB value.
- **Regression Risk:** Low — additive guards.
- **Validation Required:** Throttle network to Slow 3G, toggle theme immediately after load, confirm choice sticks; open two tabs, toggle in one, confirm the other follows (after fix).
- **Suggested PR:** PR1

---

## CAT-AUDIT-0203 — MASS PATTERN: ~2,005 light-locked Tailwind utilities; ≈1,000 without a `dark:` co-variant

- **Category:** Light-only Tailwind utilities
- **Severity:** Critical (aggregate; per-instance Medium)
- **Surface:** Clustered — Tasks, Budget, Task10, Releases family, Work Hub, Strategy, OKR v2, Templates, Test Cycles, Backlog, Capacity (full table in Appendix A)
- **Route:** /tasks/*, /budget/*, /releases/*, /all-releases, /work-hub/*, /strategy/*, /okr/*, /backlog/*, /capacity/* and more
- **Component:** ~40 directories (Appendix A)
- **File Path:** mass — see Appendix A
- **Mode:** Dark
- **CRE Rule Impact:** None direct
- **ADS Impact:** Critical — direct violation of "Tailwind color utilities banned"; these bypass `--ds-*` entirely
- **Typography Impact:** `text-slate-900`/`text-gray-900` render near-black text on dark surfaces where the surface DID flip → illegible
- **Performance Impact:** None
- **Accessibility Impact:** Critical — `bg-white` card on `--ds-surface` dark page = blinding panel; `text-slate-700` on dark bg fails contrast completely
- **Evidence (file:line):** representative —
  - `src/components/budget/BudgetSummaryCards.tsx:120` — `"relative bg-white rounded-2xl border border-slate-200 …"` (no `dark:`)
  - `src/components/budget/BudgetDepartmentTabs.tsx:52` — `"border-slate-200 bg-white"` (no `dark:`)
  - `src/components/budget/BudgetExecutiveModal.tsx:329` — `text-[var(--ds-text-warning)] … bg-white` — a token color painted onto a hardcoded white bg (token flips in dark, bg doesn't)
  - Counter-example (correct pattern already in repo): `src/modules/tasks/components/PlannerCalendar.tsx:335` — `border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900`
- **Why This Is A Problem:** 2,005 occurrences of `bg-white`/`bg-gray|slate|zinc|neutral-50/100/200`/`text-black`/`text-gray|slate-700/800/900`/`border-gray|slate-100/200/300` across non-dormant `src/`. Sampling shows only ~50% of matched lines carry any `dark:` variant on the same line — ≈1,000 occurrences are light-locked. `tailwind.config.ts:5` is `darkMode: "class"`, so none of these respond to `.dark`. The blast is partially masked at runtime by the brittle global patch layer in `index.css` (see 0204), which makes static severity worse: surfaces *look* half-fixed while remaining structurally light-only.
- **Recommended Fix:** Per-cluster migration to ADS tokens (`bg-white` → `var(--ds-surface)`/`--ds-surface-raised`, `text-slate-900` → `var(--ds-text)`, `border-slate-200` → `var(--ds-border)`), riding the existing `audit:ads:gate` ratchet down per slice. Do NOT blanket-add `dark:` twins — that doubles the banned-utility count.
- **Regression Risk:** Medium per cluster — visual diffs in light mode possible where slate hues ≠ token hues; screenshot signoff per surface required.
- **Validation Required:** Per-surface dark-mode screenshots + `npm run audit:ads:gate` baseline ratchet-down per PR.
- **Suggested PR:** PR2 (tasks+task10), PR3 (budget+capacity), PR4 (releases family), PR5 (work-hub+strategy+okr-v2), PR6 (long tail)

---

## CAT-AUDIT-0204 — Brittle global dark "patch layer" in index.css masks the utility debt

- **Category:** Dark-mode architecture
- **Severity:** Medium
- **Surface:** Global
- **Route:** * (all)
- **Component:** index.css dark grammar blocks
- **File Path:** `src/index.css`
- **Mode:** Dark
- **CRE Rule Impact:** None
- **ADS Impact:** Medium — patches select on Tailwind class-name *substrings*, institutionalizing the banned utilities
- **Typography Impact:** None
- **Performance Impact:** Low-Medium — `.dark *` universal selector (line 4074) and ~20 `[class*="…"]` attribute-substring selectors evaluated against every element
- **Accessibility Impact:** Medium — masking is partial; anything the substring rules miss renders raw light values
- **Evidence (file:line):**
  - `src/index.css:4074-4076` — `.dark *, [data-theme="dark"] *` universal override
  - `src/index.css:4118-4210` — `.dark [class*="dark:bg-gray-900"]`, `.dark [class*="dark:bg-gray-800"]`, `.dark [class*="dark:text-gray-400"]`, `.dark [class*="dark:border-gray-700"]` etc. — CSS re-implementing Tailwind's own `dark:` variants by substring
  - `src/index.css:4107-4186` — `.dark table / thead / tbody tr / td` global table repaint
  - `src/index.css:3260-3281` — `:root:not(.dark) .text-gray-300…-500` light-only remaps of raw gray utilities
- **Why This Is A Problem:** Instead of fixing light-locked components, a global CSS layer re-themes them by guessing from class substrings and tag names. It fights component-level styles on specificity, silently skips any component not matching the substrings, and makes the 0203 debt invisible in casual dark-mode QA while leaving structural light-lock in place. Every new surface built with banned utilities inherits "mostly-works" dark mode by accident.
- **Recommended Fix:** Freeze this block (no additions — the file itself says "DO NOT ADD BLOCKS BELOW THIS — CONSOLIDATE ONLY" at ~line 3899); shrink it as 0203 clusters are tokenized; delete the substring rules once their target utilities are gone.
- **Regression Risk:** High if removed before 0203 is fixed — the mask is currently load-bearing.
- **Validation Required:** Dark screenshots of table-heavy surfaces (JiraTable instances) after each removal slice.
- **Suggested PR:** PR6 (tail end, after PR2-PR5)

---

## CAT-AUDIT-0205 — index.css `:root` accent/tint variables have no dark override; `.dark` block at :88 is a verbatim copy of `:root`

- **Category:** Light-only CSS variables
- **Severity:** Medium
- **Surface:** Requirement Assist, status badges, tinted KPI surfaces
- **Route:** /requirement-assist/*, any surface consuming `--cap-*`, `--quality-*`, `--tint-*`, `--primary-50`
- **Component:** index.css token blocks
- **File Path:** `src/index.css`
- **Mode:** Dark
- **CRE Rule Impact:** None
- **ADS Impact:** Medium — light hex fallbacks (`#e9f2ff`, `#dffcf0`, `#fff7d6`) violate the no-fallback-hex rule and paint light pastels if `--ds-*` is ever unset (which 0200 shows can happen)
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** Medium — pastel light tints behind dark-mode text if fallbacks fire
- **Evidence (file:line):**
  - `src/index.css:141-161` (block starting `:root` at 141) — `--cap-brd`, `--cap-translate`, `--cap-epic`, `--cap-uat`, `--quality-high/mid/low`, `--primary-50: var(--ds-background-information, #e9f2ff)`, `--teal-50`, `--violet-50`, `--warning-50` — no corresponding `.dark` redefinition anywhere
  - `src/index.css:~1506-1511` — `--tint-blue/green/red/amber` defined with light fallbacks inside the light scope
  - `src/index.css:64-88 vs 88-141` — the `.dark {` block at line 88 is byte-identical to the `:root` block at 64 (status badge tokens): a copy-paste no-op that documents intent ("dark override exists") without overriding anything
- **Why This Is A Problem:** These variables are single-sourced from `--ds-*` with *light* hex fallbacks. Dark correctness is 100% delegated to the Atlaskit token layer whose survival is race-dependent (0200). The duplicated `.dark` block gives false confidence that dark values were audited.
- **Recommended Fix:** Remove hex fallbacks (token-only per CLAUDE.md), delete the no-op `.dark` duplicate at :88, and where a distinct dark value is genuinely needed, define it once under `.dark`.
- **Regression Risk:** Low — fallbacks only fire when tokens are missing.
- **Validation Required:** Dark screenshot of Requirement Assist quality chips + status badges; grep confirms zero `var(--ds-*, #…)` in the touched blocks.
- **Suggested PR:** PR1 (with theme infra) or PR6

---

## CAT-AUDIT-0206 — 133 hardcoded `white`/`black`/`#fff`/`#000` in TSX style objects & SVG attributes

- **Category:** Hardcoded colors in components
- **Severity:** Medium (aggregate; majority are safe-by-design icon symbols)
- **Surface:** Icons (WorkItemIcon, NotificationItem), Capacity drawer, Roadmap engine, Jira-clone release page, R360, Knowledge Assist
- **Route:** various
- **Component:** 70+ files — top offenders in Appendix B
- **File Path:** see Appendix B
- **Mode:** Dark
- **CRE Rule Impact:** None
- **ADS Impact:** Medium — bare colors banned; even "safe" ones should be `var(--ds-icon-inverse)` etc.
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** Variable — `stroke="white"`/`fill="white"` on **bold colored** icon backgrounds is contrast-safe in both modes; the residual ~40-60 uses on neutral/transparent grounds are dark-mode risks
- **Evidence (file:line):**
  - Safe-pattern majority: `src/components/ja/icons/WorkItemIcon.tsx:123,130-131,138-139` (`fill="white"` symbols on bold type-color chips, 15 hits); `src/components/notifications/NotificationItem.tsx:82,110,127,140,150` (white glyphs on bold badge circles); `src/components/capacity/ResourceWorkDrawer.tsx:67-109` (white strokes on colored status chips, 13 hits)
  - Needs triage: `src/pages/jira-clone/ReleaseManagementPage.tsx` (7), `src/components/roadmap/RoadmapEngine.tsx` (7), `src/components/knowledge-assist/KnowledgeAssistPanel.tsx:169-173` (`fill="white"` decorative circles — ground unknown), `src/components/resource360/R360RingView.tsx` (5), `src/pages/admin/GovernanceSettings.tsx` (2)
- **Why This Is A Problem:** 133 grep hits of `(backgroundColor|background|color|borderColor|fill|stroke): "white"|"black"|#fff|#000` in non-dormant TSX/TS. The icon-symbol subset is visually safe but still violates the bare-color ban and would be wrong if a future theme softens the chip backgrounds. The non-icon subset (style objects on panels/pages) can paint white surfaces or black text into dark mode.
- **Recommended Fix:** Icon symbols → `var(--ds-icon-inverse)`. Style-object surfaces → appropriate `--ds-surface*/--ds-text*` tokens. Triage the ~15 non-icon files individually.
- **Regression Risk:** Low for icons (token resolves to white in both modes); Medium for surfaces.
- **Validation Required:** Dark screenshots of work-item icons, notification list, capacity drawer, roadmap engine.
- **Suggested PR:** PR7
- **Note:** Zero-assumption discipline — the "safe" classification for icon files is based on reading the SVG context (bold `fill` background rects/circles present in the same files); the triage list is *unverified* and flagged as such, not asserted broken.

---

## CAT-AUDIT-0207 — box-shadow rgba(0,0,0,…) literals: 281 matches, but ~all are token-with-fallback form

- **Category:** Shadows
- **Severity:** Low
- **Surface:** Styles layer (drawers, kanban, cards)
- **Route:** various
- **Component:** 30+ CSS files + scattered TSX
- **File Path:** see Appendix C
- **Mode:** Dark
- **CRE Rule Impact:** None
- **ADS Impact:** Low-Medium — `var(--ds-shadow-*, rgba(0,0,0,…))` fallbacks violate the token-only/no-fallback rule but are functionally correct when tokens load
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** Low
- **Evidence (file:line):**
  - `src/styles/request-detail-panel.css:85,165,452,511,576` — `box-shadow: … var(--ds-shadow-raised, rgba(0, 0, 0, 0.4))` — token-first with rgba fallback (9 in this file)
  - Only 1 non-`--ds/--cp` fallback found repo-wide: `src/components/workhub/dashboard/DashboardKPIRow.tsx:128` — `boxShadow: 'var(--wh-shadow-sm, 0 1px 3px rgba(0,0,0,0.06))'` — and `--wh-shadow-sm` IS defined as `var(--ds-shadow-raised)` in `src/styles/workhub.module.css:70` (module-scoped: verify the KPI row sits inside that scope)
  - `src/index.css:4575-4589` — `--ds-blanket*` rgba(0,0,0,…) definitions identical in light and dark blocks (blanket is black in both ADS modes — correct)
- **Why This Is A Problem:** 281 line-matches of `box-shadow …rgba(0,0,0` in non-dormant src. Filtering out `var(--ds-shadow…` / `var(--cp-shadow…` fallback forms leaves effectively one instance. So dark-mode *breakage* risk is minimal; the finding is fallback-hex debt (0200's token-death scenario would make every fallback fire at light-mode opacity on dark surfaces — invisible shadows, not broken layout).
- **Recommended Fix:** Strip rgba fallbacks to token-only per CLAUDE.md as files are touched; confirm `DashboardKPIRow` resolves `--wh-shadow-sm` (add import/scope if not).
- **Regression Risk:** Very low.
- **Validation Required:** Spot-check drawers/kanban cards in dark mode.
- **Suggested PR:** PR8 (piggyback on per-surface PRs)

---

## CAT-AUDIT-0208 — 48 hardcoded `color: white|#fff|black` declarations in `src/styles/*.css`

- **Category:** Hardcoded colors in CSS modules
- **Severity:** Low
- **Surface:** Users module, Workstreams, Caty, Budget, TaskHub, Dept Intelligence
- **Route:** /users, /workstreams, chat, /budget
- **Component:** stylesheet-level
- **File Path:** `src/styles/users-module.css` (13), `src/styles/workstreams.css` (11), `src/styles/caty.css` (7), `src/styles/budget-module.css` (4), `src/styles/taskhub-responsive.css` (3), `src/styles/dept-intelligence.css` (3), + 5 more files (Appendix C)
- **Mode:** Dark
- **CRE Rule Impact:** None
- **ADS Impact:** Medium — bare named colors banned outright
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** Low-Medium — where `color: white` sits on a token-driven background that flips light in dark mode (or vice versa), text vanishes
- **Evidence (file:line):** `src/styles/users-module.css:335,341,347,358,369,672` — `color: white;` (context: appears to be text on bold accent buttons; file does contain 44 `.dark`/`data-theme` handling refs, so the module is dark-aware but leaks bare whites)
- **Why This Is A Problem:** 48 declarations of `background/color: white|#fff|#000|black` outside `.dark`-scoped rules across `src/styles/`. Each is a coupling of foreground to an assumed background; the assumption is unchecked per-instance in this static pass.
- **Recommended Fix:** Replace with `var(--ds-text-inverse)` / `var(--ds-surface)` per context during the owning surface's PR.
- **Regression Risk:** Low.
- **Validation Required:** Dark screenshots of users module list/buttons and workstreams surfaces.
- **Suggested PR:** PR8

---

## CAT-AUDIT-0209 — Images/logos: core brand is theme-aware; hub icon bitmaps are single-variant (verify)

- **Category:** Images / logos
- **Severity:** Low
- **Surface:** Sidebar, Hub switcher, Context switcher, Home sidebar
- **Route:** shell (all)
- **Component:** SidebarBase, HubSwitcher, ContextSwitcher, HomeSidebar
- **File Path:** `src/components/layout/SidebarBase.tsx`, `src/components/layout/HubSwitcher.tsx`, `src/components/layout/ContextSwitcher.tsx`, `src/components/layout/HomeSidebar.tsx`
- **Mode:** Dark
- **CRE Rule Impact:** None
- **ADS Impact:** Low
- **Typography Impact:** None
- **Performance Impact:** None
- **Accessibility Impact:** Low — dark-on-dark icon art would reduce discoverability, not block function
- **Evidence (file:line):**
  - GOOD: `index.html:15-16` — favicon swaps via `media="(prefers-color-scheme: light|dark)"` (`favicon.svg` / `favicon-dark.svg`)
  - GOOD: `src/components/brand/Logo.tsx:44-45` — `const currentLogo = isDark ? logoDark : logoLight;` with paired assets (`src/assets/catalyst-logo-dark.svg`, `logo-light-bg.png`/`logo-dark-bg.png` etc.)
  - VERIFY: `src/components/layout/SidebarBase.tsx:412,447` — `<img src={config.badgeHubIconUrl}>` single URL, no theme branch; `src/components/layout/HubSwitcher.tsx:311,347,367` — same pattern; `src/components/layout/ContextSwitcher.tsx:638` — `HUB_ICON_REGISTRY['task']` single-variant; `src/components/layout/HomeSidebar.tsx:290` — `globalIconUrl` single-variant
- **Why This Is A Problem:** Hub badge icons are bitmap/SVG URLs rendered identically in both modes. If any registry asset uses dark strokes on transparent ground, it disappears on dark sidebar surfaces. Static audit cannot confirm the raster contents — flagged for visual verification, not asserted broken.
- **Recommended Fix:** One dark-mode visual pass over hub/context switcher icons; add dark variants to `HUB_ICON_REGISTRY` only where the pass shows failures.
- **Regression Risk:** None (verification task).
- **Validation Required:** Dark screenshots of expanded sidebar, hub switcher popover, context switcher.
- **Suggested PR:** PR9 (only if verification finds failures)

---

## Appendix A — CAT-AUDIT-0203 occurrence clusters (light-locked Tailwind utilities)

**Total: 2,005 occurrences** (grep of `bg-white`, `bg-{gray|slate|neutral|zinc}-{50|100|200}`, `text-black`, `text-{gray|slate}-{700|800|900}`, `border-{gray|slate}-{100|200|300}` in non-dormant `src/**/*.ts{x}`). ~50% of matched lines carry a `dark:` variant on the same line (999 lines measured on the core subset) → ≈1,000 light-locked occurrences.

By utility: `bg-white` 601 · `border-slate-200` 214 · `bg-slate-50` 175 · `text-slate-700` 138 · `text-slate-900` 131 · `bg-slate-100` 130 · `border-gray-200` 78 · `bg-gray-100` 69 · `border-slate-100` 66 · `bg-gray-50` 60 · `text-slate-800` 59 · `text-gray-700` 54 · `text-gray-900` 52 · `border-slate-300` 34 · `bg-slate-200` 33 · `border-gray-300` 30 · `bg-zinc-50` 21 · `border-gray-100` 20 · `bg-zinc-100` 13 · `bg-gray-200` 10 · others 27 (incl. `text-black` 2).

By directory (top 25): `src/modules/tasks` 305 · `src/components/budget` 181 · `src/modules/task10` 130 · `src/components/releases` 105 · `src/features/all-releases` 99 · `src/modules/work-hub` 90 · `src/components/strategy` 80 · `src/pages/releases` 79 · `src/modules/okr-v2` 68 · `src/components/templates` 61 · `src/components/test-cycles` 53 · `src/modules/backlog` 51 · `src/components/capacity` 48 · `src/components/skills-inventory` 39 · `src/components/requirement-assist` 39 · `src/modules/kanban` 35 · `src/features/release-calendar` 31 · `src/components/workhub` 26 · `src/modules/feature-backlog` 24 · `src/features/release-compare` 23 · `src/pages/enterprise` 21 · `src/modules/program-epics` 21 · `src/components/projecthub` 21 · `src/components/producthub` 21 · `src/components/roadmaps` 19 — long tail ≈300 across ~20 more dirs.

## Appendix B — CAT-AUDIT-0206 occurrences (hardcoded white/black in TSX)

**Total: 133 occurrences** across 70+ files. Top files: `src/components/ja/icons/WorkItemIcon.tsx` 15 (safe icon symbols) · `src/components/capacity/ResourceWorkDrawer.tsx` 13 (safe icon strokes) · `src/components/notifications/NotificationItem.tsx` 9 (safe glyphs) · `src/pages/jira-clone/ReleaseManagementPage.tsx` 7 (triage) · `src/components/roadmap/RoadmapEngine.tsx` 7 (triage) · `src/components/resource360/R360RingView.tsx` 5 (triage) · `src/components/knowledge-assist/KnowledgeAssistPanel.tsx` 5 (triage) · `src/components/ja/icons/WorkItemTypeIcon.tsx` 5 (safe) · `src/modules/project-work-hub/components/shared/WorkItemIcon.tsx` 4 · `src/components/resource360/R360ChronologyView.tsx` 4 · caty-mood faces 7 · remainder 1-3 each.

## Appendix C — CAT-AUDIT-0207/0208 occurrences (CSS)

Shadow literals (`box-shadow…rgba(0,0,0`): **281 total matches**, of which all but 1 are `var(--ds-shadow-*, rgba…)` fallback form. Files with most: `src/styles/request-detail-panel.css` 9 · `src/styles/product-kanban.css` 7 · `src/components/capacity-planner/capacity-planner-gantt.css` 5 · `src/components/caty-ai/CatyOverrides.css` 4 · `src/styles/users-module.css` 3 · `src/components/resource360/r360-member.css` 3 · ~24 more files 1-2 each. Raw literal: `src/components/workhub/dashboard/DashboardKPIRow.tsx:128` (custom-var fallback).

Hardcoded white/black color declarations in `src/styles/*.css`: **48 total** — `users-module.css` 13 · `workstreams.css` 11 · `caty.css` 7 · `budget-module.css` 4 · `taskhub-responsive.css` 3 · `dept-intelligence.css` 3 · `task-detail-modal-enterprise.css` 2 · `product-cards.css` 2 · `ai-intelligence.css` 2 · `capacity-module.css` 1.

---

## Lane Summary

| Severity | Count | IDs |
|---|---|---|
| Critical | 1 | CAT-AUDIT-0203 (mass, ~2,005 occ / ≈1,000 light-locked) |
| High | 1 | CAT-AUDIT-0200 |
| Medium | 4 | CAT-AUDIT-0201, 0202, 0204, 0205 |
| Low | 3 | CAT-AUDIT-0206*, 0207, 0208, 0209 → (0206 Medium-aggregate counted here as Low-per-instance; ledger: 0206 Medium) |

Corrected ledger: **Critical 1 · High 1 · Medium 5 (0201, 0202, 0204, 0205, 0206) · Low 3 (0207, 0208, 0209) — 10 issues total.**

**Total occurrences catalogued: ≈2,467** (2,005 Tailwind light-locked utilities + 133 hardcoded TSX whites/blacks + 281 shadow literals + 48 CSS color declarations) plus 3 infrastructure defects (data-theme contention, first-visit flash, DB sync race).

Top risk: the `data-theme` three-writer contention (0200) can silently kill the entire `--ds-*` dark token layer — every token-correct surface in the app depends on that race resolving favourably.
