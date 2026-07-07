# Catalyst UI Fixes — Dark Mode, ADS/Jira Parity, Route Sign-off Acceptance Criteria

Generated from the uploaded repository snapshot: `catalyst-prod-45-main (4)(3).zip`.

This document is designed to be pasted into Claude Code as the governing acceptance contract for a new `ui-fixes` branch. It is not a cosmetic-only prompt. It requires repo discovery, DOM/CSS probing, screenshot evidence, route-by-route pass marking, canonical fixes, and repeatable gates.

## 0. External standards to enforce

Use Atlassian Design System as the visual/design-system reference for tokens, color, typography, spacing, iconography, and component behavior. ADS describes design tokens as the repeatable decision layer for visual styling such as color, font, and spacing, and Atlassian developer guidance explicitly expects colors, spacing, and typography to be moved to design tokens.

Use WCAG contrast thresholds as hard gates: normal text below 24 px must be at least 4.5:1; large text can be 3:1; meaningful graphical objects and UI components such as icons, borders, focus indicators, and controls must be at least 3:1.

Reference URLs for Claude Code research:
- Atlassian Design System foundations: https://atlassian.design/foundations
- Atlassian Design Tokens: https://atlassian.design/tokens/design-tokens
- Atlassian color accessibility guidance: https://atlassian.design/foundations/color
- Atlassian iconography: https://atlassian.design/foundations/iconography
- Atlassian design tokens and theming for developers: https://developer.atlassian.com/platform/forge/design-tokens-and-theming/
- WCAG 2.2 contrast minimum: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- WCAG 2.2 non-text contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html

---

## 1. Repo-grounded blind spots that must be fixed or explicitly closed

| # | Blind spot | Repo evidence | Required closure |
|---:|---|---|---|
| 1 | Route coverage is not currently enforceable from screenshots alone. | I parsed 448 unique route path declarations/mentions from `src/App.tsx`, `src/routes/FullAppRoutes.tsx`, and `src/config/routeRegistry.ts`. This is a seed, not an authoritative runtime map. | Generate a live route inventory from React Router, sidebars, command/search navigation, and route registry. Resolve redirects, dynamic params, auth-gated routes, and feature-flagged routes. |
| 2 | The declared contrast audit command is broken in this snapshot. | `package.json` defines `audit:contrast` as `node scripts/ads-contrast-gate.cjs`, but `scripts/ads-contrast-gate.cjs` is absent. Running it fails with `MODULE_NOT_FOUND`. | Create/repair the contrast gate and make it route-aware, theme-aware, and CI-runnable. |
| 3 | The declared accessibility lint command is broken in this snapshot. | `package.json` defines `lint:accessibility` as `node scripts/audit-accessibility.cjs`, but `scripts/audit-accessibility.cjs` is absent. Running it fails with `MODULE_NOT_FOUND`. | Create/repair the accessibility gate and run it against real app routes, not only isolated stories. |
| 4 | Current ADS audit gate is a ratchet, not proof of compliance. | `scripts/ads-audit-gate.cjs` compares categories to `design-governance/audit-baseline.json`; strict `design-governance/rules/audit.js src` reports large token/typography violations. | Do not call the UI clean because the ratchet passes. Reduce P0/P1 violations, document remaining baseline debt, and block any new violations. |
| 5 | Color scanner can give false confidence. | `scripts/no-hardcoded-colors.cjs` allows several fallback forms; `design-governance/color-baseline.json` tracks thousands of fallback hex colors even when hardcoded color scan says clean. | Close user-visible fallback color debt on touched surfaces and ensure final DOM colors resolve to semantic tokens. |
| 6 | Theme ownership is fragile. | `src/theme/atlassian/AdsThemeProvider.tsx` says Atlaskit owns the space-separated `data-theme`; Catalyst should rely on `.dark` instead of overwriting clean `data-theme="dark"`. `src/providers/ThemeProvider.tsx` also sets `.dark`, `data-theme`, and `data-color-mode`. | Verify theme switching does not break Atlaskit token selectors. Do not introduce code that overwrites Atlaskit `data-theme` after `setGlobalTheme`. |
| 7 | Notification drawer has concrete dark-mode risk. | `src/components/notifications/NotificationPanel.tsx` maps dark `T.text1` to `var(--ds-background-neutral)` and renders the heading with that token; screenshot shows the title nearly invisible. | Use DOM computed foreground/background ratios to fix notification drawer title, labels, icons, metadata, tabs, and scroll area in dark and light mode. |
| 8 | Notification rows include non-token exceptions and focus risk. | `src/features/notifications/components/DirectNotificationRow.tsx` has dark link fallback `#6698FF`; row button has `outline: none`; reactions use very small text tokens. | Replace with tokens, add visible focus, and validate text/icon/focus contrast. |
| 9 | Tiny text and type-scale debt is widespread. | `src/styles/theme-tokens.css` defines 10 px and 11 px tokens; static scan found extensive `--ds-font-size-50`, `text-xs`, and tiny metadata usage. | No critical/user-action copy below 12 px; primary body/action copy must normally be 14 px or ADS equivalent. All exceptions need documented ADS-equivalent rationale and passing contrast. |
| 10 | Inline styles are widespread, increasing non-canonical drift. | Static scan found many `style={...}` occurrences across app pages, including admin, releases, project backlog, connections, cleanup, and component admin surfaces. | Move repeated styling into canonical primitives/classes/tokens. Inline styles allowed only for dynamic layout values that cannot be tokenized. |
| 11 | Iconography is mixed and not globally contrast-gated. | Static scan found many `lucide-react` imports; notification panel imports lucide icons directly. | Use canonical Catalyst/ADS icon wrappers or documented exceptions. Every meaningful icon must pass 3:1 contrast in all states. |
| 12 | Storybook visual/a11y tests are not enough. | `playwright.ads.config.ts` and `tests/ads/*` focus on Storybook stories, not every live app route and application state. | Add live route visual/a11y/contrast probes for the real app shell, routes, overlays, drawers, menus, modals, boards, and tables. |
| 13 | Previous dark-mode audit is stale/incomplete. | `audit/dark-theme-ads-audit-2026-04-30.md` records stale 6-route contrast baseline and blocked live probe; `audit/dark-mode-page-by-page-2026-04-30.md` only reached `/for-you`. | Run a full current audit and replace stale reports with new dated evidence. |
| 14 | Jira parity can become superficial. | Repo contains Atlaskit packages and Catalyst ADS bridge, but many pages still use ad hoc styles. | Compare pattern-level behavior against Jira using Atlassian MCP/browser reference: density, hierarchy, surfaces, tabs, drawers, tables, menus, notifications, typography, icon semantics, not private content. |
| 15 | Fixes may regress light mode, RTL, auth, or data surfaces. | Theme providers, protected shell, chat dock, admin routes, and module hubs all sit in shared app shell. | Every fix must be proven in light and dark mode, LTR/RTL where supported, and authenticated shell states. |

---

## 2. Non-negotiable branch and execution rules

1. Create a new branch named `ui-fixes`. Do not use a branch name with spaces. The human-readable initiative label may be “UI fixes”.
2. Start with discovery only. Do not implement before producing the initial route inventory, issue inventory, severity classification, and fix plan.
3. Use `/goal` and `/loop` behavior: keep looping until every route in the final matrix is `PASS`, `BLOCKED-WITH-EVIDENCE`, or `N/A-REDIRECT/DECOMMISSIONED`. `TODO`, `UNKNOWN`, and `VISUALLY OK` are not accepted final statuses.
4. Do not hide failures by deleting routes, removing features, suppressing tests, weakening thresholds, or marking route groups as out of scope.
5. No one-off page patch is acceptable when the root cause is a token, primitive, layout, typography, icon, or surface contract issue.
6. Preserve current functionality. UI fixes must not break CRUD, routing, permissions, notifications, chat dock, board behavior, release/test/admin flows, or Supabase/Jira data integration.
7. Every final claim must include evidence: file changed, route checked, screenshot path, computed contrast output, and before/after status.

---

## 3. Required reports Claude must create in the repo

Create this folder:

```text
docs/reports/ui-fixes/
```

Required files:

```text
docs/reports/ui-fixes/00-route-inventory.md
docs/reports/ui-fixes/01-blindspot-inventory.md
docs/reports/ui-fixes/02-dom-css-contrast-report.json
docs/reports/ui-fixes/03-token-and-hardcoded-color-report.md
docs/reports/ui-fixes/04-jira-pattern-parity-report.md
docs/reports/ui-fixes/05-before-after-screenshot-index.md
docs/reports/ui-fixes/06-final-route-pass-matrix.md
docs/reports/ui-fixes/07-final-signoff.md
```

Each report must be regenerated after fixes. The final signoff must explicitly state which commands were run, which failed, which passed, and which routes are blocked with evidence.

---

## 4. Severity model

| Severity | Definition | Final rule |
|---|---|---|
| P0 | Text, icon, control, navigation, table, drawer, modal, or page is unreadable/unusable in dark or light mode; blank route; broken shell; blocked primary workflow. | Must be fixed. No exception. |
| P1 | WCAG contrast failure, invisible focus, keyboard trap, broken information hierarchy, unreadable metadata, non-token color on a user-facing critical element, broken Jira parity on core surfaces. | Must be fixed before final pass unless route is blocked with evidence. |
| P2 | Density, spacing, typography, icon alignment, hover/active state, empty state, or visual hierarchy is materially below Jira/ADS standard but not blocking use. | Fix or document with rationale and backlog item. |
| P3 | Polish issue with low user impact. | May defer only with explicit evidence and backlog item. |

---

## 5. Global acceptance criteria

### 5.1 Route coverage

- Every route discovered from router files, registry, sidebar/menu navigation, and command/search navigation must appear in the final route matrix.
- Dynamic routes must be tested with real or seeded identifiers. Examples: `:key`, `:id`, `:issueKey`, `:releaseKey`, `:projectKey`.
- Wildcard routes must be expanded to representative child routes.
- Redirects may be marked `N/A-REDIRECT`, but the target route must be tested.
- Auth/permission-gated routes may be marked `BLOCKED-WITH-EVIDENCE` only if Claude provides the exact reason, screenshot/log, and what role/data would unblock it.
- A route cannot pass from source review only. It must be visited in the browser unless it is a redirect/decommissioned route.

### 5.2 DOM and CSS probe

For each visited route, run a DOM/CSS probe that collects:

- All visible text nodes with computed font size, font weight, color, background color, opacity, line height, and bounding box.
- All meaningful icons/SVGs with computed stroke/fill color, size, role/label, and nearest background.
- All interactive controls with hover, active, selected, disabled, and focus-visible states.
- All overlays: drawers, menus, popovers, tooltips, dropdowns, command palettes, date pickers, modals, toasts, notification drawer, chat dock, and side panels.
- All high-density components: tables, boards, timelines, activity streams, lists, cards, filters, breadcrumbs, status pills, avatars, and tabs.

### 5.3 Contrast thresholds

- Text under 24 px must be at least 4.5:1 against its effective background.
- Large text and non-text UI elements must be at least 3:1.
- Disabled text may be excluded only when truly disabled and non-actionable.
- Placeholder text must still be readable enough for form comprehension.
- Link text must not rely on color alone; hover/focus/visited states must remain clear.
- Icons that communicate state, navigation, or action must pass 3:1 in default, hover, active, selected, and disabled states where applicable.

### 5.4 Typography

- Replace uncontrolled tiny text with ADS/Catalyst canonical type roles.
- Primary body/action text should normally be 14 px or the ADS-equivalent token.
- Metadata may be 12 px only if contrast, line height, and hierarchy are strong.
- Avoid 10 px/11 px for user-critical copy, timestamps, statuses, labels, actions, breadcrumbs, table cells, or notification metadata.
- Use consistent title, section heading, row title, metadata, caption, and helper text roles across all modules.
- No page should mix oversized headers with tiny metadata in a way that breaks Jira-like density and hierarchy.

### 5.5 Color and tokens

- No new raw hex/rgb/rgba/hsl colors in component code unless explicitly approved as a token definition file.
- No page-level color fixes. Fix semantic tokens or canonical primitives where possible.
- No dark-only hacks that damage light mode.
- No `!important` color overrides except documented emergency compatibility shims with planned removal.
- Every surface must use semantic roles: app background, surface, surface-raised, surface-overlay, border, text, text-subtle, text-disabled, link, icon, selected, danger, warning, success, discovery, information.
- User-facing fallback hex debt on touched surfaces must be removed or converted to tokens.

### 5.6 Layout, density, and information architecture

- App shell, left nav, top bar, breadcrumbs, content width, drawers, and panels must follow a consistent Jira-like structure.
- Route content must not feel archaic, bland, random, or non-enterprise.
- Spacing must use canonical spacing tokens.
- Tables and lists must have consistent row height, divider behavior, hover states, selected states, and metadata rhythm.
- Boards must use canonical card density, status/priority visual hierarchy, and readable metadata.
- Drawers and modals must use consistent surface, border, elevation, title hierarchy, footer actions, and close behavior.
- Empty/error/loading states must be visually complete and consistent.

### 5.7 Icons, avatars, and status visuals

- Meaningful icons must have labels/tooltips where required and pass non-text contrast.
- Use canonical icon components/wrappers. Direct icon-library imports require justification and parity review.
- Status pills must use semantic color roles and must not rely on color alone.
- Avatars must have consistent size, border, fallback initials, background, and contrast.
- Activity streams and notifications must use a consistent icon grammar for issue type, assignment, transition, comment, defect, release, test, and watcher events.

### 5.8 Accessibility and keyboard

- Every route must run axe or equivalent accessibility checks in light and dark mode.
- Every interactive element must have visible focus, keyboard reachability, and no keyboard trap.
- Focus rings must pass 3:1 contrast and must not be clipped.
- Dialogs/drawers/popovers must have correct focus management and escape/close behavior.
- ARIA labels must exist for icon-only actions.
- Use semantic headings and landmarks where practical; do not suppress accessibility failures unless documented and non-user-impacting.

### 5.9 Light/dark/RTL/responsive regression

- Validate light mode and dark mode for every route.
- Validate at least these viewport classes unless the app intentionally excludes them: desktop 1440x900, laptop 1280x800, tablet 768x1024, mobile/narrow 390x844.
- Validate RTL where Catalyst supports Arabic/RTL. Mirroring, icon direction, breadcrumbs, drawers, and table overflow must be checked.
- No horizontal overflow except intentionally scrollable data tables with visible scroll affordance.

### 5.10 Functional non-regression

- Routes must load without blank screens, uncaught exceptions, or broken navigation.
- No primary CRUD function can regress on modules where test data exists.
- Notification drawer must open/close, switch Direct/Watching tabs, mark read/unread, and navigate to target entities.
- Admin pages must preserve settings, connections, workflow, role, notification, avatar, and design-governance behavior.
- Hubs must preserve project/product/release/test/incident navigation and detail flows.

---

## 6. Notification drawer specific acceptance criteria

Use the supplied screenshot as a P0 example. The notification drawer cannot be accepted until all of these pass:

- Drawer title “Notifications” is clearly readable in dark mode and light mode.
- “Only show unread,” Direct/Watching tabs, section labels, timestamps, issue keys, statuses, row titles, and update summaries pass contrast.
- Top-right icons are visible, have accessible labels, and pass 3:1 contrast.
- Row issue-type icons, bookmark/lightning icons, avatars, unread indicators, and status metadata do not create color noise.
- Row hover, active, selected, unread, read, focus-visible, and pressed states are visually distinct.
- Scrollbar and panel edge do not visually fight with the background.
- Typography scale matches Jira-like dense notification UI: readable but compact, not oversized and not tiny.
- No `outline: none` without replacement focus-visible styling.
- No raw dark link hex such as `#6698FF` remains in user-facing notification code unless moved into an approved semantic token.
- Direct and Watching tabs both pass, including empty state and grouped updates.

---

## 7. Jira/ADS parity acceptance

Claude may use Atlassian MCP/browser reference against `https://digital-transformation.atlassian.net` only to compare patterns and interaction behavior. Do not copy private Jira content. Match pattern usage:

- Notification drawer hierarchy, density, tab rhythm, timestamp placement, section grouping, row metadata, icon grammar.
- Issue/work item list and table density.
- Board card density and metadata placement.
- Breadcrumb behavior and typography.
- Modal/drawer structure and action placement.
- Status pill semantics and non-color-only differentiation.
- Avatars and user identity patterns.
- Empty/loading/error states.
- Focus, hover, selected, disabled, and active states.

Final evidence must include before/after Catalyst screenshots and Jira reference notes for each core pattern family.

---

## 8. Commands and gates Claude must run or repair

At minimum:

```bash
git checkout -b ui-fixes
npm install
npm run lint:colors
npm run audit:ads
npm run audit:ads:gate
npm run audit:contrast
npm run lint:accessibility
npm run test:visual
npm run test:a11y
npx tsc -p tsconfig.app.json --noEmit
```

If a command is missing or broken, Claude must repair the script instead of skipping it. If dependency or environment constraints block a command, Claude must document exact command, error, root cause, and workaround evidence.

Add or repair route-aware scripts if missing:

```text
scripts/ads-contrast-gate.cjs
scripts/audit-accessibility.cjs
scripts/route-inventory.cjs
scripts/route-visual-a11y-gate.cjs
```

---

## 9. Final route pass matrix rules

Claude must produce `docs/reports/ui-fixes/06-final-route-pass-matrix.md` with one row per resolved route. Every row must be marked exactly one of:

- `PASS`
- `FAIL`
- `BLOCKED-WITH-EVIDENCE`
- `N/A-REDIRECT`
- `N/A-DECOMMISSIONED`

No other final status is allowed.

Required columns:

```text
Route | Source | Route type | Sample params/data | Light screenshot | Dark screenshot | DOM/CSS probe | Contrast | Axe/a11y | Keyboard/focus | Icons | Typography | Spacing/layout | Jira parity | Functional smoke | Final status | Evidence notes
```

A route may be marked `PASS` only when:

1. It was opened in browser in light and dark mode.
2. The page is not blank and has no uncaught console error.
3. Text contrast passes.
4. Meaningful icon/control contrast passes.
5. Focus-visible is present for keyboard navigation.
6. Typography and spacing use canonical roles/tokens.
7. Major overlays on the route were opened and checked.
8. Jira/ADS parity issues are either fixed or documented as P2/P3 backlog.
9. Functional smoke test passes for the route’s core action.
10. Screenshot and DOM/CSS evidence are linked.

---

## 10. Claude Code operating prompt

Paste this into Claude Code after attaching this markdown:

```text
/goal
You are fixing Catalyst UI/UX dark-mode, contrast, typography, icon, spacing, ADS/Jira parity, and route-level production-readiness defects across the full app. Work in a new branch named ui-fixes. Start with deep discovery only. Do not implement until the route inventory, blindspot report, severity list, and plan are complete.

Read the repo first. Inspect src/App.tsx, src/routes/FullAppRoutes.tsx, src/config/routeRegistry.ts, ThemeProvider, AdsThemeProvider, ADS token bridge, theme CSS, notifications code, design-governance scripts, Playwright tests, audits, and package scripts. Use the supplied screenshot as a P0 example: dark-mode Notifications title and metadata are not readable enough.

Use Atlassian Design System and Jira as the pattern reference: tokens, typography, color, iconography, spacing, surfaces, drawers, notifications, tables, boards, modals, breadcrumbs, tabs, empty states, hover/focus/selected/disabled states. Use Atlassian MCP/browser reference only for pattern parity, not copying private content.

Create docs/reports/ui-fixes/*.md/json evidence files. Generate an authoritative route inventory from router files, registry, sidebar/menu navigation, and command/search navigation. Resolve dynamic params with real or seeded data. Visit every route in browser in light and dark mode. Expand critical overlays: notification drawer, menus, modals, popovers, chat dock, filters, boards, tables, drawers, toasts, settings panels.

Run DOM/CSS probes and screenshots. Compute effective foreground/background contrast for visible text and meaningful icons/controls. Enforce WCAG thresholds: normal text 4.5:1; large text and non-text UI 3:1. Check keyboard focus, tab order, ARIA labels, no clipped focus rings, and no keyboard traps. Check typography scale: no critical tiny text; consistent Jira-like hierarchy. Check color tokens: no new raw hex/rgb/rgba/hsl in components; fix token/primitive root causes instead of page hacks. Do not overwrite Atlaskit data-theme incorrectly; preserve .dark and Atlaskit token selector behavior.

Repair missing gates: audit:contrast and lint:accessibility must run or be replaced with working route-aware scripts. Keep existing function intact. Do not delete routes, hide failures, relax thresholds, suppress tests, or mark untested routes as pass.

/loop
Loop until docs/reports/ui-fixes/06-final-route-pass-matrix.md has every resolved route marked PASS, BLOCKED-WITH-EVIDENCE, N/A-REDIRECT, or N/A-DECOMMISSIONED. PASS requires: route opened in browser in light and dark, screenshots linked, DOM/CSS probe linked, text/icon contrast passes, axe/a11y passes or justified non-critical items, focus/keyboard passes, typography/spacing canonical, overlays checked, Jira/ADS parity accepted, functional smoke passes, no light-mode regression. Return final report only after all P0/P1 items are fixed and every route row is signed.
```

---

## 11. Seed route matrix from uploaded repo snapshot

This is a seed extracted from `src/App.tsx`, `src/routes/FullAppRoutes.tsx`, and `src/config/routeRegistry.ts`. Claude must regenerate and normalize it during live discovery. The final matrix must contain resolved, browser-tested routes, not only this seed.

| Route declaration | Type | Source evidence | Sample params/data | Light screenshot | Dark screenshot | DOM/CSS probe | Contrast | Axe/a11y | Keyboard/focus | Icons | Typography | Spacing/layout | Jira parity | Functional smoke | Final status | Evidence notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `*` | wildcard | src/App.tsx:311, src/routes/FullAppRoutes.tsx:1069, src/routes/FullAppRoutes.tsx:1161 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/*` | wildcard | src/App.tsx:307 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/admin` | absolute | src/App.tsx:288, src/routes/FullAppRoutes.tsx:997 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/admin/v2/*` | wildcard | src/routes/FullAppRoutes.tsx:1076 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/ads-validator` | absolute | src/routes/FullAppRoutes.tsx:1073 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/audit-trail` | absolute | src/App.tsx:296 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/auth` | absolute | src/App.tsx:227 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/auth/slack/callback` | absolute | src/App.tsx:228 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/backlog` | absolute | src/routes/FullAppRoutes.tsx:973 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/backlog-phase2` | absolute | src/routes/FullAppRoutes.tsx:974 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/backlog/epics` | absolute | src/routes/FullAppRoutes.tsx:894 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/browse/:issueKey` | dynamic | src/App.tsx:300 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/browse/:key` | dynamic | src/routes/FullAppRoutes.tsx:501 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/capacity` | absolute | src/routes/FullAppRoutes.tsx:925 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/catalyst/testpage` | absolute | src/App.tsx:297 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/chat` | absolute | src/routes/FullAppRoutes.tsx:490 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/cleanup` | absolute | src/App.tsx:295 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/deactivated` | absolute | src/App.tsx:232 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/dependencies` | absolute | src/routes/FullAppRoutes.tsx:916 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/doc-intelligence/*` | wildcard | src/routes/FullAppRoutes.tsx:641 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/docex` | absolute | src/routes/FullAppRoutes.tsx:863 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/docex/*` | wildcard | src/routes/FullAppRoutes.tsx:864 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/enterprise/*` | wildcard | src/routes/FullAppRoutes.tsx:655 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/epics` | absolute | src/routes/FullAppRoutes.tsx:893 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/features` | absolute | src/routes/FullAppRoutes.tsx:895 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/features/prioritization` | absolute | src/routes/FullAppRoutes.tsx:896 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/folio` | absolute | src/routes/FullAppRoutes.tsx:853 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/folio/:workspaceSlug` | dynamic | src/routes/FullAppRoutes.tsx:859 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/folio/:workspaceSlug/:pageSlug` | dynamic | src/routes/FullAppRoutes.tsx:861 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/folio/:workspaceSlug/db/:dbSlug` | dynamic | src/routes/FullAppRoutes.tsx:860 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/folio/_sandbox` | absolute | src/routes/FullAppRoutes.tsx:857 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/folio/search` | absolute | src/routes/FullAppRoutes.tsx:854 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/folio/sitemap` | absolute | src/routes/FullAppRoutes.tsx:855 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/ideation` | absolute | src/routes/FullAppRoutes.tsx:604 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/ideation/analytics` | absolute | src/routes/FullAppRoutes.tsx:609 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/ideation/backlog` | absolute | src/routes/FullAppRoutes.tsx:605 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/ideation/board` | absolute | src/routes/FullAppRoutes.tsx:606 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/ideation/intelligence` | absolute | src/routes/FullAppRoutes.tsx:612 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/ideation/matrix` | absolute | src/routes/FullAppRoutes.tsx:610 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/ideation/roadmap` | absolute | src/routes/FullAppRoutes.tsx:607 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/ideation/themes` | absolute | src/routes/FullAppRoutes.tsx:608 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/ideation/triage` | absolute | src/routes/FullAppRoutes.tsx:611 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub` | absolute | src/routes/FullAppRoutes.tsx:751 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/all-incidents` | absolute | src/routes/FullAppRoutes.tsx:752 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/analytics` | absolute | src/routes/FullAppRoutes.tsx:782 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/backlog/:key` | dynamic | src/routes/FullAppRoutes.tsx:795 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/board` | absolute | src/routes/FullAppRoutes.tsx:758 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/committee-queue` | absolute | src/routes/FullAppRoutes.tsx:787 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/dashboard` | absolute | src/routes/FullAppRoutes.tsx:779 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/dependencies` | absolute | src/routes/FullAppRoutes.tsx:772 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/filters` | absolute | src/routes/FullAppRoutes.tsx:764 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/filters/:filterId` | dynamic | src/routes/FullAppRoutes.tsx:766 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/filters/create` | absolute | src/routes/FullAppRoutes.tsx:765 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/kanban` | absolute | src/routes/FullAppRoutes.tsx:759 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/reports` | absolute | src/routes/FullAppRoutes.tsx:786 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/timeline` | absolute | src/routes/FullAppRoutes.tsx:771 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/view/:incidentKey` | dynamic | src/routes/FullAppRoutes.tsx:788 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/incident-hub/work` | absolute | src/routes/FullAppRoutes.tsx:781 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/industry/*` | wildcard | src/routes/FullAppRoutes.tsx:628 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/initiatives` | absolute | src/routes/FullAppRoutes.tsx:892 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/insights/dependency-risk` | absolute | src/routes/FullAppRoutes.tsx:994 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/insights/portfolio` | absolute | src/routes/FullAppRoutes.tsx:990 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/insights/predictability` | absolute | src/routes/FullAppRoutes.tsx:993 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/insights/program` | absolute | src/routes/FullAppRoutes.tsx:991 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/insights/team` | absolute | src/routes/FullAppRoutes.tsx:992 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/invite/accept` | absolute | src/App.tsx:230 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/issue/:issueKey` | dynamic | src/App.tsx:303 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/:type` | dynamic | src/routes/FullAppRoutes.tsx:1083 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/epics` | absolute | src/routes/FullAppRoutes.tsx:897 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/epics/:epicId/planning` | dynamic | src/routes/FullAppRoutes.tsx:904 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/epics/:epicId/requirement-hierarchy` | dynamic | src/routes/FullAppRoutes.tsx:902 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/epics/:epicId/responsibility-matrix` | dynamic | src/routes/FullAppRoutes.tsx:903 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/epics/:epicId/status-report` | dynamic | src/routes/FullAppRoutes.tsx:900 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/epics/:epicId/trace` | dynamic | src/routes/FullAppRoutes.tsx:901 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/epics/canceled` | absolute | src/routes/FullAppRoutes.tsx:899 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/epics/estimation` | absolute | src/routes/FullAppRoutes.tsx:905 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/epics/recycle-bin` | absolute | src/routes/FullAppRoutes.tsx:898 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/impediments` | absolute | src/routes/FullAppRoutes.tsx:910 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/release-vehicles` | absolute | src/routes/FullAppRoutes.tsx:911 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/success-criteria` | absolute | src/routes/FullAppRoutes.tsx:912 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/items/tasks` | absolute | src/routes/FullAppRoutes.tsx:909 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/kb-admin` | absolute | src/routes/FullAppRoutes.tsx:488 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/kb-admin-setup` | absolute | src/routes/FullAppRoutes.tsx:487 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/kb-data-audit` | absolute | src/routes/FullAppRoutes.tsx:489 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/knowledge-hub` | absolute | src/routes/FullAppRoutes.tsx:985 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/knowledge-hub/documents/:documentId` | dynamic | src/routes/FullAppRoutes.tsx:987 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/knowledge-hub/spaces/:spaceId` | dynamic | src/routes/FullAppRoutes.tsx:986 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/me` | absolute | src/routes/FullAppRoutes.tsx:1090 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/mining` | absolute | src/routes/FullAppRoutes.tsx:885 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/my-team` | absolute | src/routes/FullAppRoutes.tsx:1091 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/my-team/:resourceId` | dynamic | src/routes/FullAppRoutes.tsx:1092 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/pi-objectives` | absolute | src/routes/FullAppRoutes.tsx:924 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/pis` | absolute | src/routes/FullAppRoutes.tsx:922 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/planhub*` | wildcard | src/routes/FullAppRoutes.tsx:847 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/planner` | absolute | src/routes/FullAppRoutes.tsx:843 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/planner/*` | wildcard | src/routes/FullAppRoutes.tsx:844 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/portfolio-insights` | absolute | src/routes/FullAppRoutes.tsx:919 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/portfolio-kanban` | absolute | src/routes/FullAppRoutes.tsx:913 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/portfolio-roadmap` | absolute | src/routes/FullAppRoutes.tsx:914 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/portfolio/:portfolioKey/*` | wildcard | src/routes/FullAppRoutes.tsx:643 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub` | absolute | src/App.tsx:253 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/allwork` | dynamic | src/routes/FullAppRoutes.tsx:542 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/backlog` | dynamic | src/routes/FullAppRoutes.tsx:538 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/backlog/:issueKey` | dynamic | src/routes/FullAppRoutes.tsx:537 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/boards` | dynamic | src/routes/FullAppRoutes.tsx:539 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/boards/:boardSlug` | dynamic | src/routes/FullAppRoutes.tsx:540 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/cards` | dynamic | src/routes/FullAppRoutes.tsx:566 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/dashboard` | dynamic | src/routes/FullAppRoutes.tsx:550 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/dependencies` | dynamic | src/routes/FullAppRoutes.tsx:562 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/filters` | dynamic | src/routes/FullAppRoutes.tsx:568 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/filters/:filterId` | dynamic | src/routes/FullAppRoutes.tsx:575 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/filters/create` | dynamic | src/routes/FullAppRoutes.tsx:574 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/kanban` | dynamic | src/routes/FullAppRoutes.tsx:541 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/milestones` | dynamic | src/routes/FullAppRoutes.tsx:563 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/milestones/:milestoneId` | dynamic | src/routes/FullAppRoutes.tsx:564 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/releases` | dynamic | src/routes/FullAppRoutes.tsx:565 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/roadmap` | dynamic | src/routes/FullAppRoutes.tsx:555 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/roadmaps/:id` | dynamic | src/routes/FullAppRoutes.tsx:559 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/settings` | dynamic | src/routes/FullAppRoutes.tsx:567 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/standups` | dynamic | src/routes/FullAppRoutes.tsx:554 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/timeline` | dynamic | src/routes/FullAppRoutes.tsx:561 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/:key/timeline/:issueKey` | dynamic | src/routes/FullAppRoutes.tsx:560 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/backlog` | absolute | src/App.tsx:261 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/cards` | absolute | src/routes/FullAppRoutes.tsx:585 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/dashboard` | absolute | src/routes/FullAppRoutes.tsx:527 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/filters` | absolute | src/routes/FullAppRoutes.tsx:579 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/filters/create` | absolute | src/routes/FullAppRoutes.tsx:580 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/ideation` | absolute | src/routes/FullAppRoutes.tsx:590 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/kanban` | absolute | src/routes/FullAppRoutes.tsx:525 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/product-dashboard` | absolute | src/routes/FullAppRoutes.tsx:528 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/products` | absolute | src/routes/FullAppRoutes.tsx:521 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/reports` | absolute | src/routes/FullAppRoutes.tsx:583 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/req-assist` | absolute | src/routes/FullAppRoutes.tsx:626 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/req-assist/generate` | absolute | src/routes/FullAppRoutes.tsx:627 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/requests/:requestKey/move` | dynamic | src/routes/FullAppRoutes.tsx:1123 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/requirement-assist` | absolute | src/routes/FullAppRoutes.tsx:591 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/requirement-assist/:id` | dynamic | src/routes/FullAppRoutes.tsx:594 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/requirement-assist/categories` | absolute | src/routes/FullAppRoutes.tsx:593 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/requirement-assist/compose` | absolute | src/routes/FullAppRoutes.tsx:592 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/roadmap` | absolute | src/routes/FullAppRoutes.tsx:584 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/roadmaps` | absolute | src/routes/FullAppRoutes.tsx:581 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/roadmaps-v1` | absolute | src/routes/FullAppRoutes.tsx:582 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product-hub/table` | absolute | src/routes/FullAppRoutes.tsx:524 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product/:productId/room` | dynamic | src/routes/FullAppRoutes.tsx:887 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product/capacity` | absolute | src/routes/FullAppRoutes.tsx:888 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product/ideas/analytics` | absolute | src/routes/FullAppRoutes.tsx:622 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product/ideas/backlog` | absolute | src/routes/FullAppRoutes.tsx:619 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product/ideas/board` | absolute | src/routes/FullAppRoutes.tsx:620 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product/ideas/roadmap` | absolute | src/routes/FullAppRoutes.tsx:617 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product/ideas/roadmap-new` | absolute | src/routes/FullAppRoutes.tsx:618 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product/ideas/themes` | absolute | src/routes/FullAppRoutes.tsx:621 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product/req-assist` | absolute | src/routes/FullAppRoutes.tsx:623 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product/req-assist/generate` | absolute | src/routes/FullAppRoutes.tsx:624 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/product/room` | absolute | src/routes/FullAppRoutes.tsx:886 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/producthub` | absolute | src/App.tsx:240 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/producthub/*` | wildcard | src/App.tsx:241 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/profile` | absolute | src/routes/FullAppRoutes.tsx:1079 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/profile/archives` | absolute | src/routes/FullAppRoutes.tsx:1082 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/program` | absolute | src/routes/FullAppRoutes.tsx:644 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/program-backlog` | absolute | src/routes/FullAppRoutes.tsx:929 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/program-board` | absolute | src/routes/FullAppRoutes.tsx:923 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/program-room` | absolute | src/routes/FullAppRoutes.tsx:921 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/program/:programId/*` | wildcard | src/routes/FullAppRoutes.tsx:645 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/programs` | absolute | src/routes/FullAppRoutes.tsx:646 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/programs/:programId/*` | wildcard | src/routes/FullAppRoutes.tsx:649 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/programs/program-board` | absolute | src/routes/FullAppRoutes.tsx:647 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/programs/program-board/history` | absolute | src/routes/FullAppRoutes.tsx:648 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub` | absolute | src/App.tsx:266 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key` | dynamic | src/routes/FullAppRoutes.tsx:1104 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/allwork` | dynamic | src/routes/FullAppRoutes.tsx:1139 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/allwork/:issueKey` | dynamic | src/routes/FullAppRoutes.tsx:1138 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/backlog` | dynamic | src/routes/FullAppRoutes.tsx:1109 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/backlog/:issueKey` | dynamic | src/routes/FullAppRoutes.tsx:1110 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/board` | dynamic | src/routes/FullAppRoutes.tsx:1125 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/boards` | dynamic | src/routes/FullAppRoutes.tsx:1126 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/boards/:boardSlug` | dynamic | src/routes/FullAppRoutes.tsx:1131 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/boards/:boardSlug/map-statuses` | dynamic | src/routes/FullAppRoutes.tsx:1127 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/boards/:boardSlug/settings` | dynamic | src/routes/FullAppRoutes.tsx:1128 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/boards/:boardSlug/settings/:section` | dynamic | src/routes/FullAppRoutes.tsx:1129 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/dashboard` | dynamic | src/routes/FullAppRoutes.tsx:1105 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/dashboards/:id` | dynamic | src/routes/FullAppRoutes.tsx:1136 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/dependencies` | dynamic | src/routes/FullAppRoutes.tsx:1148 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/epic-backlog` | dynamic | src/routes/FullAppRoutes.tsx:1116 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/feature-backlog` | dynamic | src/routes/FullAppRoutes.tsx:1117 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/filters` | dynamic | src/routes/FullAppRoutes.tsx:1140 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/filters/:filterId` | dynamic | src/routes/FullAppRoutes.tsx:1142 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/filters/create` | dynamic | src/routes/FullAppRoutes.tsx:1141 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/issue-selector` | dynamic | src/routes/FullAppRoutes.tsx:1124 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/issue/:issueKey` | dynamic | src/routes/FullAppRoutes.tsx:1120 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/issue/:issueKey/convert-to-subtask` | dynamic | src/routes/FullAppRoutes.tsx:1121 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/issue/:issueKey/move` | dynamic | src/routes/FullAppRoutes.tsx:1122 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/kanban` | dynamic | src/routes/FullAppRoutes.tsx:1133 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/list` | dynamic | src/routes/FullAppRoutes.tsx:1137 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/releases` | dynamic | src/routes/FullAppRoutes.tsx:1147 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/reports` | dynamic | src/routes/FullAppRoutes.tsx:1153 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/risk-scanner` | dynamic | src/routes/FullAppRoutes.tsx:1155 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/roadmaps` | dynamic | src/routes/FullAppRoutes.tsx:1134 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/roadmaps/:id` | dynamic | src/routes/FullAppRoutes.tsx:1135 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/settings` | dynamic | src/routes/FullAppRoutes.tsx:1108 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/sprint-predictor` | dynamic | src/routes/FullAppRoutes.tsx:1154 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/sprints` | dynamic | src/routes/FullAppRoutes.tsx:1150 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/sprints/:sprintSlug` | dynamic | src/routes/FullAppRoutes.tsx:1151 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/sprints/:sprintSlug/work` | dynamic | src/routes/FullAppRoutes.tsx:1152 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/standups` | dynamic | src/routes/FullAppRoutes.tsx:1107 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/story-backlog` | dynamic | src/routes/FullAppRoutes.tsx:1118 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/story/:itemId` | dynamic | src/routes/FullAppRoutes.tsx:1119 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/timeline` | dynamic | src/routes/FullAppRoutes.tsx:1146 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/:key/timeline/:issueKey` | dynamic | src/routes/FullAppRoutes.tsx:1145 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/INV/*` | wildcard | src/App.tsx:274 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/MDT/*` | wildcard | src/App.tsx:275 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/filters` | absolute | src/routes/FullAppRoutes.tsx:1143 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/filters/create` | absolute | src/routes/FullAppRoutes.tsx:1144 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/portfolio-health` | absolute | src/routes/FullAppRoutes.tsx:1089 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/projects` | absolute | src/routes/FullAppRoutes.tsx:1086 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/projects-legacy` | absolute | src/routes/FullAppRoutes.tsx:1088 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/resource-360/:resourceId` | dynamic | src/routes/FullAppRoutes.tsx:1101 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/resource360` | absolute | src/routes/FullAppRoutes.tsx:1099 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/resource360/:id` | dynamic | src/routes/FullAppRoutes.tsx:1100 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/resources` | absolute | src/routes/FullAppRoutes.tsx:1093 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/resources-v2` | absolute | src/routes/FullAppRoutes.tsx:1095 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/resources-v2/:resourceId` | dynamic | src/routes/FullAppRoutes.tsx:1096 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project-hub/resources/:resourceId` | dynamic | src/routes/FullAppRoutes.tsx:1094 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project/:projectId/work` | dynamic | src/routes/FullAppRoutes.tsx:958 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project/:projectKey` | dynamic | src/routes/FullAppRoutes.tsx:960 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/project/all-projects` | absolute | src/routes/FullAppRoutes.tsx:1087 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projecthub` | absolute | src/routes/FullAppRoutes.tsx:936 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projecthub/resource360` | absolute | src/routes/FullAppRoutes.tsx:937 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projecthub/resource360/:id` | dynamic | src/routes/FullAppRoutes.tsx:938 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects` | absolute | src/routes/FullAppRoutes.tsx:931 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects/:projectId` | dynamic | src/routes/FullAppRoutes.tsx:945 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects/:projectId/backlog` | dynamic | src/routes/FullAppRoutes.tsx:954 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects/:projectId/boards` | dynamic | src/routes/FullAppRoutes.tsx:951 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects/:projectId/boards/:boardId` | dynamic | src/routes/FullAppRoutes.tsx:952 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects/:projectId/dependencies` | dynamic | src/routes/FullAppRoutes.tsx:956 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects/:projectId/features` | dynamic | src/routes/FullAppRoutes.tsx:942 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects/:projectId/features/:featureId` | dynamic | src/routes/FullAppRoutes.tsx:943 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects/:projectId/reports` | dynamic | src/routes/FullAppRoutes.tsx:957 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects/:projectId/roadmap` | dynamic | src/routes/FullAppRoutes.tsx:955 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects/:projectId/work` | dynamic | src/routes/FullAppRoutes.tsx:953 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects/:projectKey` | dynamic | src/routes/FullAppRoutes.tsx:932 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects/:projectKey/settings` | dynamic | src/routes/FullAppRoutes.tsx:941 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/projects/:projectKey/summary` | dynamic | src/routes/FullAppRoutes.tsx:933 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub` | absolute | src/routes/FullAppRoutes.tsx:798 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/:releaseId` | dynamic | src/routes/FullAppRoutes.tsx:826 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/calendar` | absolute | src/routes/FullAppRoutes.tsx:810 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/change-board` | absolute | src/routes/FullAppRoutes.tsx:803 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/changes` | absolute | src/routes/FullAppRoutes.tsx:814 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/changes/:changeId` | dynamic | src/routes/FullAppRoutes.tsx:815 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/command-center` | absolute | src/routes/FullAppRoutes.tsx:822 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/compare` | absolute | src/routes/FullAppRoutes.tsx:823 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/execution` | absolute | src/routes/FullAppRoutes.tsx:804 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/filters` | absolute | src/routes/FullAppRoutes.tsx:806 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/filters/:filterId` | dynamic | src/routes/FullAppRoutes.tsx:808 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/filters/create` | absolute | src/routes/FullAppRoutes.tsx:807 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/freeze-windows` | absolute | src/routes/FullAppRoutes.tsx:818 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/overview` | absolute | src/routes/FullAppRoutes.tsx:799 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/production-events` | absolute | src/routes/FullAppRoutes.tsx:808 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/production-events/:eventKey` | dynamic | src/routes/FullAppRoutes.tsx:809 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/release-kanban` | absolute | src/routes/FullAppRoutes.tsx:802 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/releases` | absolute | src/routes/FullAppRoutes.tsx:801 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/releases-management` | absolute | src/routes/FullAppRoutes.tsx:811 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/releases-management/:releaseSlug` | dynamic | src/routes/FullAppRoutes.tsx:812 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/releases-management/:releaseSlug/work` | dynamic | src/routes/FullAppRoutes.tsx:813 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/settings` | absolute | src/routes/FullAppRoutes.tsx:819 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/sign-off-queue` | absolute | src/routes/FullAppRoutes.tsx:817 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/sop-templates` | absolute | src/routes/FullAppRoutes.tsx:816 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/triage` | absolute | src/routes/FullAppRoutes.tsx:824 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-hub/work` | absolute | src/routes/FullAppRoutes.tsx:805 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/release-train-calendar` | absolute | src/routes/FullAppRoutes.tsx:928 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/releasehub` | absolute | src/routes/FullAppRoutes.tsx:829 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/releasehub/all` | absolute | src/routes/FullAppRoutes.tsx:837 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/releasehub/all-releases` | absolute | src/routes/FullAppRoutes.tsx:831 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/releasehub/changes` | absolute | src/routes/FullAppRoutes.tsx:834 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/releasehub/command-center` | absolute | src/routes/FullAppRoutes.tsx:830 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/releasehub/compare` | absolute | src/routes/FullAppRoutes.tsx:832 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/releasehub/dashboard` | absolute | src/routes/FullAppRoutes.tsx:836 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/releasehub/production-events` | absolute | src/routes/FullAppRoutes.tsx:835 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/releasehub/triage` | absolute | src/routes/FullAppRoutes.tsx:833 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/releases/*` | wildcard | src/routes/FullAppRoutes.tsx:980 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/reports/dependencies/maps` | absolute | src/routes/FullAppRoutes.tsx:917 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/req-assist/rag-audit` | absolute | src/routes/FullAppRoutes.tsx:625 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/reset-password` | absolute | src/App.tsx:229 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/resource-360/:resourceId` | dynamic | src/routes/FullAppRoutes.tsx:939 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/resource360/members/:memberId` | dynamic | src/routes/FullAppRoutes.tsx:1102 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/resources` | absolute | src/routes/FullAppRoutes.tsx:1103 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/risk-roam-report` | absolute | src/routes/FullAppRoutes.tsx:927 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/risks` | absolute | src/routes/FullAppRoutes.tsx:926 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/roadmaps` | absolute | src/routes/FullAppRoutes.tsx:915 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/s/:code` | dynamic | src/App.tsx:231 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/search` | absolute | src/routes/FullAppRoutes.tsx:631 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/sprint-board` | absolute | src/routes/FullAppRoutes.tsx:976 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/sprints` | absolute | src/routes/FullAppRoutes.tsx:975 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/starred` | absolute | src/routes/FullAppRoutes.tsx:630 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/stories` | absolute | src/routes/FullAppRoutes.tsx:977 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/strata/*` | wildcard | src/routes/FullAppRoutes.tsx:637 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/strategy-room` | absolute | src/App.tsx:245 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/strategyhub` | absolute | src/App.tsx:243 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/strategyhub/*` | wildcard | src/App.tsx:244 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/taskhub` | absolute | src/routes/FullAppRoutes.tsx:684 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/taskhub-kanban` | absolute | src/routes/FullAppRoutes.tsx:691 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/taskhub/:view` | dynamic | src/routes/FullAppRoutes.tsx:690 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/taskhub/boards` | absolute | src/routes/FullAppRoutes.tsx:685 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/taskhub/dashboard` | absolute | src/routes/FullAppRoutes.tsx:687 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/taskhub/settings` | absolute | src/routes/FullAppRoutes.tsx:689 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/taskhub/task-list` | absolute | src/routes/FullAppRoutes.tsx:686 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/tasks` | absolute | src/routes/FullAppRoutes.tsx:662 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/tasks/:view` | dynamic | src/routes/FullAppRoutes.tsx:677 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/tasks/filters` | absolute | src/routes/FullAppRoutes.tsx:674 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/tasks/filters/:filterId` | dynamic | src/routes/FullAppRoutes.tsx:676 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/tasks/filters/create` | absolute | src/routes/FullAppRoutes.tsx:675 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/tasks/my-tasks` | absolute | src/routes/FullAppRoutes.tsx:679 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/tasks/priorities/*` | wildcard | src/routes/FullAppRoutes.tsx:840 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/tasks/view/:taskKey` | dynamic | src/routes/FullAppRoutes.tsx:670 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/tasks/workstreams` | absolute | src/routes/FullAppRoutes.tsx:681 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/team-room` | absolute | src/routes/FullAppRoutes.tsx:972 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/team/:teamSlug/*` | wildcard | src/routes/FullAppRoutes.tsx:653 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/teams` | absolute | src/routes/FullAppRoutes.tsx:651 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/teams/:teamSlug/*` | wildcard | src/routes/FullAppRoutes.tsx:652 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub` | absolute | src/routes/FullAppRoutes.tsx:699 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/:projectKey/cycles/:cycleKey` | dynamic | src/routes/FullAppRoutes.tsx:707 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/:projectKey/cycles/:cycleKey/execute` | dynamic | src/routes/FullAppRoutes.tsx:708 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/:projectKey/cycles/:cycleKey/runs` | dynamic | src/routes/FullAppRoutes.tsx:709 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/board` | absolute | src/routes/FullAppRoutes.tsx:702 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/cycles` | absolute | src/routes/FullAppRoutes.tsx:706 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/cycles/:cycleKey` | dynamic | src/routes/FullAppRoutes.tsx:711 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/cycles/:cycleKey/execute` | dynamic | src/routes/FullAppRoutes.tsx:712 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/cycles/:cycleKey/runs` | dynamic | src/routes/FullAppRoutes.tsx:713 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/dashboard` | absolute | src/routes/FullAppRoutes.tsx:700 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/defects` | absolute | src/routes/FullAppRoutes.tsx:727 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/defects/:defectKey` | dynamic | src/routes/FullAppRoutes.tsx:728 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/dependencies` | absolute | src/routes/FullAppRoutes.tsx:715 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/executions` | absolute | src/routes/FullAppRoutes.tsx:723 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/executions/:executionKey` | dynamic | src/routes/FullAppRoutes.tsx:724 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/filters` | absolute | src/routes/FullAppRoutes.tsx:743 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/filters/:filterId` | dynamic | src/routes/FullAppRoutes.tsx:745 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/filters/create` | absolute | src/routes/FullAppRoutes.tsx:744 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/my-work` | absolute | src/routes/FullAppRoutes.tsx:701 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/plans` | absolute | src/routes/FullAppRoutes.tsx:719 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/plans/:planKey` | dynamic | src/routes/FullAppRoutes.tsx:721 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/reports` | absolute | src/routes/FullAppRoutes.tsx:734 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/reports-lab` | absolute | src/routes/FullAppRoutes.tsx:733 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/reports/:reportSlug` | dynamic | src/routes/FullAppRoutes.tsx:740 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/reports/defects-incidents` | absolute | src/routes/FullAppRoutes.tsx:739 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/reports/project-status` | absolute | src/routes/FullAppRoutes.tsx:735 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/reports/sprint-status` | absolute | src/routes/FullAppRoutes.tsx:736 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/reports/team-status` | absolute | src/routes/FullAppRoutes.tsx:738 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/reports/tester-status` | absolute | src/routes/FullAppRoutes.tsx:737 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/repository` | absolute | src/routes/FullAppRoutes.tsx:703 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/repository/case/:caseKey` | dynamic | src/routes/FullAppRoutes.tsx:705 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/sets` | absolute | src/routes/FullAppRoutes.tsx:718 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/sets/:setKey` | dynamic | src/routes/FullAppRoutes.tsx:725 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/timeline` | absolute | src/routes/FullAppRoutes.tsx:714 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/testhub/traceability` | absolute | src/routes/FullAppRoutes.tsx:726 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/themes` | absolute | src/routes/FullAppRoutes.tsx:890 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/themes/grid` | absolute | src/routes/FullAppRoutes.tsx:891 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/unauthorized` | absolute | src/routes/FullAppRoutes.tsx:982 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/value-stream` | absolute | src/routes/FullAppRoutes.tsx:1078 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki` | absolute | src/routes/FullAppRoutes.tsx:869 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki/:pageSlug` | dynamic | src/routes/FullAppRoutes.tsx:882 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki/analytics` | absolute | src/routes/FullAppRoutes.tsx:877 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki/articles` | absolute | src/routes/FullAppRoutes.tsx:871 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki/category/:slug` | dynamic | src/routes/FullAppRoutes.tsx:881 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki/domains` | absolute | src/routes/FullAppRoutes.tsx:879 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki/domains/:slug` | dynamic | src/routes/FullAppRoutes.tsx:880 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki/learning-paths` | absolute | src/routes/FullAppRoutes.tsx:873 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki/learning-paths/:pathId` | dynamic | src/routes/FullAppRoutes.tsx:874 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki/search` | absolute | src/routes/FullAppRoutes.tsx:870 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki/subscriptions` | absolute | src/routes/FullAppRoutes.tsx:875 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki/templates` | absolute | src/routes/FullAppRoutes.tsx:878 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki/verification` | absolute | src/routes/FullAppRoutes.tsx:876 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/wiki/whats-new` | absolute | src/routes/FullAppRoutes.tsx:872 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/work-hub-test` | absolute | src/routes/FullAppRoutes.tsx:492 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/work-items/stories` | absolute | src/routes/FullAppRoutes.tsx:978 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/work-items/subtasks` | absolute | src/routes/FullAppRoutes.tsx:979 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/work-spend-grid` | absolute | src/routes/FullAppRoutes.tsx:918 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/work-tree` | absolute | src/routes/FullAppRoutes.tsx:657 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/workhub` | absolute | src/routes/FullAppRoutes.tsx:935 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/workhub/all-work` | absolute | src/routes/FullAppRoutes.tsx:934 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `/workitems` | absolute | src/routes/FullAppRoutes.tsx:504 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `access` | relative/child | src/routes/FullAppRoutes.tsx:1010 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `ai-assistant` | relative/child | src/routes/FullAppRoutes.tsx:1065 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `ai-governance/translations` | relative/child | src/routes/FullAppRoutes.tsx:1040 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `all-work` | relative/child | src/routes/FullAppRoutes.tsx:496, src/routes/FullAppRoutes.tsx:964 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `avatars` | relative/child | src/routes/FullAppRoutes.tsx:1045 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `board` | relative/child | src/routes/FullAppRoutes.tsx:946 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `boards/kanban` | relative/child | src/routes/FullAppRoutes.tsx:965 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `boards/scrum` | relative/child | src/routes/FullAppRoutes.tsx:966 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `business-owners` | relative/child | src/routes/FullAppRoutes.tsx:1009 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `capacity-departments` | relative/child | src/routes/FullAppRoutes.tsx:1011 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `components` | relative/child | src/routes/FullAppRoutes.tsx:1007 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `connections` | relative/child | src/routes/FullAppRoutes.tsx:1022 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `connections/jira` | relative/child | src/routes/FullAppRoutes.tsx:1023 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `connections/jira/hierarchy` | relative/child | src/routes/FullAppRoutes.tsx:1025 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `connections/notion` | relative/child | src/routes/FullAppRoutes.tsx:1026 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `connections/vercel` | relative/child | src/routes/FullAppRoutes.tsx:1027 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `departments` | relative/child | src/routes/FullAppRoutes.tsx:1008 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `feature-flags` | relative/child | src/routes/FullAppRoutes.tsx:1003 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `feature-map` | relative/child | src/routes/FullAppRoutes.tsx:948 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `fields` | relative/child | src/routes/FullAppRoutes.tsx:1050 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `fields/layout` | relative/child | src/routes/FullAppRoutes.tsx:1051 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `for-you` | relative/child | src/App.tsx:282 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `for-you/:tab` | dynamic | src/App.tsx:284 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `for-you/archives` | relative/child | src/App.tsx:283 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `governance` | relative/child | src/routes/FullAppRoutes.tsx:1041 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `home` | relative/child | src/App.tsx:285 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `icons` | relative/child | src/routes/FullAppRoutes.tsx:1044 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `jira-user-sync` | relative/child | src/routes/FullAppRoutes.tsx:1035 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `list` | relative/child | src/routes/FullAppRoutes.tsx:495, src/routes/FullAppRoutes.tsx:963 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `notification-triggers` | relative/child | src/routes/FullAppRoutes.tsx:1006 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `overview` | relative/child | src/routes/FullAppRoutes.tsx:1000 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `permissions` | relative/child | src/routes/FullAppRoutes.tsx:1064 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `quarters` | relative/child | src/routes/FullAppRoutes.tsx:1018 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `release-management` | relative/child | src/routes/FullAppRoutes.tsx:968 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `release-ops` | relative/child | src/routes/FullAppRoutes.tsx:1017 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `releases` | relative/child | src/routes/FullAppRoutes.tsx:497, src/routes/FullAppRoutes.tsx:967 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `releases/:versionId` | dynamic | src/routes/FullAppRoutes.tsx:498 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `resource-assignments` | relative/child | src/routes/FullAppRoutes.tsx:1004 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `resources` | relative/child | src/routes/FullAppRoutes.tsx:1047 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `resources/:resourceId` | dynamic | src/routes/FullAppRoutes.tsx:1048 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `roles` | relative/child | src/routes/FullAppRoutes.tsx:1063 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `roles-permissions` | relative/child | src/routes/FullAppRoutes.tsx:1002 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `routing-taxonomy` | relative/child | src/routes/FullAppRoutes.tsx:1046 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `settings` | relative/child | src/routes/FullAppRoutes.tsx:969 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `settings/notifications` | relative/child | src/routes/FullAppRoutes.tsx:1005 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `storybook` | relative/child | src/routes/FullAppRoutes.tsx:1042 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `summary` | relative/child | src/routes/FullAppRoutes.tsx:494, src/routes/FullAppRoutes.tsx:962 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `test-ops` | relative/child | src/routes/FullAppRoutes.tsx:1016 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `test/case-statuses` | relative/child | src/routes/FullAppRoutes.tsx:1055 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `test/case-types` | relative/child | src/routes/FullAppRoutes.tsx:1054 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `test/case-workflow` | relative/child | src/routes/FullAppRoutes.tsx:1056 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `test/permissions` | relative/child | src/routes/FullAppRoutes.tsx:1061 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `test/priorities` | relative/child | src/routes/FullAppRoutes.tsx:1053 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `timeline` | relative/child | src/routes/FullAppRoutes.tsx:947 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `user-access` | relative/child | src/routes/FullAppRoutes.tsx:1001 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workflows` | relative/child | src/routes/FullAppRoutes.tsx:1012 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workflows/:versionId/edit` | dynamic | src/routes/FullAppRoutes.tsx:1015 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workflows/classic` | relative/child | src/routes/FullAppRoutes.tsx:1013 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workflows/hierarchy` | relative/child | src/routes/FullAppRoutes.tsx:1024 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workflows/versions` | relative/child | src/routes/FullAppRoutes.tsx:1014 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workhub` | relative/child | src/routes/FullAppRoutes.tsx:1030 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workhub-connection` | relative/child | src/routes/FullAppRoutes.tsx:1029 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workhub/*` | wildcard | src/routes/FullAppRoutes.tsx:1039 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workhub/activity-sync` | relative/child | src/routes/FullAppRoutes.tsx:1038 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workhub/hierarchy-mapping` | relative/child | src/routes/FullAppRoutes.tsx:1032 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workhub/jira-connection` | relative/child | src/routes/FullAppRoutes.tsx:1031 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workhub/jira-sync-control` | relative/child | src/routes/FullAppRoutes.tsx:1037 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workhub/sync-logs` | relative/child | src/routes/FullAppRoutes.tsx:1036 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| `workhub/user-mapping` | relative/child | src/routes/FullAppRoutes.tsx:1034 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
