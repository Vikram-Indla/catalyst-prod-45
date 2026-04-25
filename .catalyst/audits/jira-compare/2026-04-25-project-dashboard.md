# JIRA COMPARE — Project Hub Dashboard
Date: 2026-04-25 · Iteration: 1 · Auditor: Claude (jira-compare skill v3)

## Scope (from user's screenshot)
Whole page chrome + grid system at `/project-hub/BAU/dashboard`, against the equivalent Jira dashboard surface. Excludes individual widget body contents.

Jira ref:     https://digital-transformation.atlassian.net/jira/dashboards/10188 ("Sectorial Dashboard", 15 gadgets)
Catalyst ref: http://localhost:8080/project-hub/BAU/dashboard (BAU, 11 widgets)
Wiring list:  Edit Layout toggles isEditing · Add Widget opens gallery · Gear opens settings · Reset bulk-upserts defaults

## Executive verdict

**Catalyst's dashboard is structurally healthier than Jira 10188's**, but it's misaligned with Jira's design tokens at every chrome surface. Jira's classic dashboard ("Sectorial Dashboard") uses a single-column **multi-gadget container card** model — three large white cards stacked vertically, each containing ~5 gadgets as nested sections, with `borderRadius: 3px` and `elevation.shadow.raised`. Catalyst uses a more modern **one-card-per-widget** model in a 3-column CSS Grid. The newer Atlaskit dashboard pattern (12-column resizable grid) sits between these — and **that** is the right migration target, not Jira 10188's classic chrome.

The big P0s are typographic and elevation drift on the cards themselves: Catalyst's h1 is 20/600 vs Jira's 24/653; widget title is 14/653 vs 16/653; card has `borderRadius: 8px` + `0.55px subpixel border` + `boxShadow: none` vs Jira's 3px / no border / `elevation.shadow.raised`. The page also has **four conflicting background layers** (`body` slate-50, `main` Jira-blue `#E9F2FE`, `shell` white, `innerCard` slate-50) — a refactor artifact from the V3 flatten that didn't reach the `<main>` element. Inside-scope, the Add Widget modal and per-widget gear are still bespoke shadcn / Tailwind, both P0.

## P0 — Atlaskit mismatches + wiring breaks

| # | Element | Jira (component) | Catalyst (today) | Fix (target @atlaskit/*) | Spec | Handoff |
|---|---|---|---|---|---|---|
| 1 | Edit Layout button | hidden in page-level kebab dropdown | top-level Button with **no onClick** (dead) | Either wire to `isEditing` state, or move into `@atlaskit/dropdown-menu` with Refresh + Edit + Add inline (Jira parity) | https://atlassian.design/components/dropdown-menu | [CLAUDE CODE] |
| 2 | Add Widget gallery | (Jira hides behind kebab "Add gadget"; opens `@atlaskit/modal-dialog`) | bespoke `<div>` overlay in `WidgetGalleryModal.tsx` with hex shadow `0 20px 60px rgba(0,0,0,0.18)` and rgba overlay | Replace with `Modal` from `@/components/ads` (already wraps `@atlaskit/modal-dialog`) | https://atlassian.design/components/modal-dialog | [CLAUDE CODE] |
| 3 | Per-widget gear popover | Jira renders 32×32 kebab → `@atlaskit/dropdown-menu` (per-gadget) | shadcn `@/components/ui/popover` with hex `#7A869A` icon, 22×22 hit area | Replace with `Popup` from `@/components/ads` (wraps `@atlaskit/popup`) + 32×32 `IconButton` | https://atlassian.design/components/popup | [CLAUDE CODE] |
| 4 | Per-widget action button | Jira: 32×32 icon-only kebab | Catalyst: 22×22 gear (below 24px ADS minimum hit target) | Bump to 32×32 via `IconButton appearance="subtle"` | https://atlassian.design/components/button | [CLAUDE CODE] |
| 5 | Native checkboxes in modal | Jira: `@atlaskit/checkbox` | `<input type="checkbox" accentColor="var(--cp-primary-60)">` in `WidgetGalleryModal.tsx:106` | `Checkbox` from `@/components/ads` | https://atlassian.design/components/checkbox | [CLAUDE CODE] |
| 6 | Modal overlay | Jira: standard ADS overlay token | Hex `rgba(0,0,0,0.4)` overlay | Use `Modal` (auto-applies `--ds-blanket`) | https://atlassian.design/components/modal-dialog | [CLAUDE CODE] |
| 7 | `<main>` background | not blue (transparent) | `rgb(233,242,254)` Jira-blue wash leaking from a stale stylesheet | Strip the background rule on `<main>`, let `body` and shell own bg | n/a (CSS cleanup) | [CLAUDE CODE] |
| 8 | Refresh button | top-level toolbar `Refresh` (97×32, 14/500, `borderRadius: 3px`, testId `dashboard-internal-common.ui.dashboard-refresh-button.dashboard-refresh-button`) | **missing entirely** | Add `Button appearance="subtle"` Refresh that re-runs all widget queries | https://atlassian.design/components/button | [CLAUDE CODE] |
| 9 | Page-level kebab | `dashboard-internal-common.ui.dashboard-content.header.action-dropdown.dropdown-menu--trigger` | missing | `DropdownMenu` from `@/components/ads` housing Edit/Reset/Add | https://atlassian.design/components/dropdown-menu | [CLAUDE CODE] |
| 10 | Per-gadget kebab | per-gadget 32×32 menu | missing — Catalyst surfaces only `gear` (settings only) | Add `IconButton` + `DropdownMenu` per widget for {Configure, Refresh, Remove, Duplicate} parity | https://atlassian.design/components/dropdown-menu | [CLAUDE CODE] |

## P1 — Parity drift

### Page H1
| Property | Jira | Catalyst | Fix |
|---|---|---|---|
| fontSize | 24px | **20px** | Bump to 24px via `Heading size="medium"` |
| fontWeight | 653 | **600** | Use `--ds-font-weight-semibold` (which resolves to 653 in Atlassian Sans) |
| letterSpacing | normal | **-0.06px** | Drop the negative tracking |
| lineHeight | normal (auto) | 30px | Let Atlaskit set it via Heading |

### Widget header (h2/h3 title)
| Property | Jira | Catalyst | Fix |
|---|---|---|---|
| Tag | h2 | **h3** | Use h2 to match Jira's heading-rank (a11y consistency) |
| fontSize | 16px | **14px** | Use `Heading size="small"` (= 16/600) |
| fontWeight | 653 | 653 ✅ | match |
| Header row height | 52px | 38px | Match Jira's 52px to give breathing room |
| Header row padding | `16px 8px 16px 0px` | `10px 14px` | Match Jira |

### Card chrome
| Property | Jira | Catalyst | Fix |
|---|---|---|---|
| borderRadius | 3px | **8px** | Pick one: Jira-classic (3px) OR modern Atlaskit (8px = `border.radius.200`). Recommend 8px — consistent with rest of Catalyst. |
| border | none | **0.555px subpixel** | Drop the border; use shadow-only |
| boxShadow | `rgba(30,31,33,0.25) 0 1px 1px, rgba(30,31,33,0.31) 0 0 1px` | **none** | Add `token('elevation.shadow.raised')` |
| Card chrome model | multi-gadget container card | one-card-per-widget | **Keep one-card-per-widget** (Atlaskit's modern direction) but apply chrome above |

### Background layers (4 conflicting)
| Layer | Today | Should be |
|---|---|---|
| body | `rgb(248,250,252)` slate-50 | `token('color.background.neutral')` (~`#F4F5F7`) |
| main | `rgb(233,242,254)` Jira-blue (legacy V2 wash) | transparent (let body show through) |
| shell | white | `token('color.background.neutral')` (page tint) |
| innerCard | slate-50 | `token('elevation.surface')` white |

The visible page reads as one band of color today because shell is white inside main is blue inside body is slate-50 — the gray tint from `body` is masked by `main`'s blue. Card lift is invisible.

### Body font
| Property | Jira | Catalyst | Fix |
|---|---|---|---|
| body font-family | -apple-system stack | **Inter** (from index.css) | Atlassian Sans should win at body level via `*` selector or root |

## P2 — Polish

| # | Element | Drift | Fix |
|---|---|---|---|
| 1 | Card spacing within row | 16px gap | Bump to 24px (`space.300`) — relieves dense 3-col band, matches Jira rhythm between gadget container cards |
| 2 | Card padding | `0px 16px 16px` (Jira) | Catalyst uses `12px 16px 16px` on outer card — close enough, but pre-row gap differs |
| 3 | Skeleton state | Jira uses `@atlaskit/spinner` per gadget | Catalyst uses plain shimmer divs without `aria-busy` | [A11Y] |
| 4 | Title text on Catalyst h1 has `letterSpacing: -0.06px` | Jira: normal | drop the tracking |

## P-A11Y — Accessibility

| # | Element | Issue | Fix | Handoff |
|---|---|---|---|---|
| 1 | `WidgetGalleryModal` overlay | No `role="dialog"`, no `aria-modal`, no `aria-labelledby`. Focus moves to `panelRef` via `tabIndex={-1}` but doesn't trap. | `Modal` adds all three automatically + traps focus | [A11Y] (resolved in P0 #2) |
| 2 | Gear button hit target | 22×22 below WCAG 2.5.5 (recommended 44px) and below ADS minimum (24px) | 32×32 IconButton | [A11Y] (resolved in P0 #4) |
| 3 | Skeleton state | Plain divs without `aria-busy` or `role="status"` | Wrap skeleton in `aria-busy="true"` container | [A11Y] |
| 4 | Modal checkbox grid | 2-col `<label>` layout — Tab order is left-to-right within row, surprising for vertical reading flow | Switch to single-column or `Stack` from `@atlaskit/primitives` | [A11Y] |

## Typography sweep (page-level)

| Role | Jira (Atlaskit primitive) | Jira value | Catalyst today | Match? |
|---|---|---|---|---|
| Dashboard h1 | `@atlaskit/heading` size="medium" or large | Atlassian Sans 24/653 | Atlassian Sans 20/600 | ❌ |
| Widget header h2 | `@atlaskit/heading` size="small" | Atlassian Sans 16/653/20 | Atlassian Sans 14/653/20 (h3) | ❌ |
| Body text | `@atlaskit/primitives` `<Text>` | -apple-system stack 14/400 | Inter 14/400 | ❌ font family |
| Subtitle (· prefix) | n/a (Jira shows no per-gadget subtitle on this dashboard) | n/a | 12/400 inline `var(--cp-text-subtle)` | ❌ semantic |
| Toolbar button | `Button appearance="subtle"` | 14/500/`color.text` | 14/500/`rgb(41,42,46)` | ✅ value-match (token still missing) |

## Tab order (top→bottom of dashboard surface)

Jira's tab order on `/jira/dashboards/10188`:
1. Star Sectorial Dashboard
2. Copy link
3. Refresh
4. Page kebab dropdown trigger
5. (per gadget) gadget menu kebab × 15
6. (per gadget) refresh per gadget (where applicable)

Catalyst's tab order:
1. Add Widget
2. Edit Layout (inert — focus stops here, no action on Enter)
3. Reset
4. (per widget) gear button × 11

**Difference:** Catalyst is missing Star + Refresh + page-level kebab. The Edit/Reset paradigm is correct ergonomically but should ideally consolidate into one DropdownMenu that mirrors Jira's "More actions" pattern.

## Scroll behaviour

Both: page scrolls vertically, no inner scroll containers in the chrome. Match.

## Wiring inventory

| Interaction | Jira behaviour | Catalyst behaviour | Match? |
|---|---|---|---|
| Click "Edit Layout" | (Jira: opens edit overlay via kebab → "Edit dashboard") | **Click does nothing** — button has no `onClick` | ❌ P0 #1 |
| Click "Add Widget" | (Jira: kebab → "Add gadget" opens drawer of 60+ gadgets w/ search) | Opens 480px bespoke modal with 11 fixed widgets, group checkboxes | ⚠️ functions differ; visual P0 #2 |
| Click gear icon | (Jira: per-gadget kebab opens dropdown w/ {Edit, Refresh, Delete}) | Opens shadcn Popover w/ filter form, persists to localStorage on Apply | ⚠️ functions differ; visual P0 #3 |
| Click Reset | (Jira: not visible at top-level — buried in edit mode) | Bulk upsert all 11 widgets to default position/visibility, no confirm | ⚠️ different pattern |

## Proposed fix plan (Atlaskit-first, surgical)

Scoped to the chrome corrections (NOT the bigger 12-col grid + edit-mode rebuild — that's the user's separate prompt).

1. `src/components/project-hub/dashboard/WidgetGalleryModal.tsx` — replace bespoke overlay with `Modal`, `ModalHeader`, `ModalTitle`, `ModalBody`, `ModalFooter`, `Checkbox` from `@/components/ads`. Remove all `--cp-*` references and hex literals.
2. `src/components/project-hub/dashboard/WidgetGearButton.tsx` — replace shadcn `Popover` with `Popup` from `@/components/ads`. Replace bespoke `<button>` with `IconButton` (32×32). Remove hex `#7A869A`, `#F4F5F7`, `#0052CC`. Indicator dot via styled span using `token('color.background.brand.bold')`.
3. `src/pages/project-hub/ProjectDashboardPage.tsx` — wire `Edit Layout` to `useState<boolean>('isEditing')`. When true, swap header actions to `[Done, Cancel, Add Widget, Reset]`.
4. `src/pages/project-hub/ProjectDashboardPage.tsx` — bump h1 to `<Heading size="medium">` (24/653). Drop the `letterSpacing: -0.06px`.
5. `src/components/project-hub/dashboard/WidgetWrapper.tsx` — change borderRadius to keep at 8px (modern), add `boxShadow: token('elevation.shadow.raised')`, drop the `0.55px` border. Bump title to `<Heading as="h2" size="small">` (16/653). Bump header row height to 52px / padding `16px 8px 16px 0px`.
6. CSS audit — find the rule painting `<main>` with `#E9F2FE` (Jira-blue) and remove. Likely in `src/index.css` or `src/styles/catalyst-theme.css`. Replace with `token('color.background.neutral')` or transparent.
7. `src/index.css` — set `body` font-family to Atlassian Sans (currently Inter).
8. Add page-level Refresh button (Button appearance="subtle" with refresh icon) calling `queryClient.invalidateQueries({ queryKey: ['ph-dashboard-*'] })`.

## Research notes

None — the audit didn't surface any unknowns requiring [RESEARCH] / [ROVO]. All Atlaskit primitives are already exported from `@/components/ads`. Migration is wrapper-swap only.

## Handoff index

- [CLAUDE CODE]: 10 P0 + 8 P1 = 18 findings
- [LOVABLE]: 0 (no rebuild needed; all surgical)
- [RESEARCH]: 0
- [ROVO]: 0
- [DESIGN-CRITIQUE]: 1 (the chrome model question — multi-gadget container card vs one-card-per-widget — already addressed in this report)
- [A11Y]: 4 (3 resolved by P0 fixes, 1 standalone)

## Acceptance checks (for the human)

- [ ] All P0 rows closed — every interactive element in scope is `@atlaskit/*`
- [ ] Typography sweep: h1 = 24/653, widget h2 = 16/653, body = Atlassian Sans
- [ ] Card chrome: bg white, borderRadius 8px, no border, boxShadow `elevation.shadow.raised`
- [ ] Page background: single layer, no Jira-blue leak from `<main>`
- [ ] Tab order: Star (optional), Refresh, kebab (or Edit/Reset/Add inline)
- [ ] Wiring: Edit Layout toggles `isEditing`; gear opens Atlaskit Popup; gallery uses Atlaskit Modal
- [ ] No shadcn / Radix / bespoke Tailwind in `WidgetGalleryModal`, `WidgetGearButton`, `ProjectDashboardPage`
- [ ] DevTools: fonts & spacing resolve to `--ds-*` tokens
