# LANE-04 — ADS Compliance (shadcn vs Atlaskit census)

Audit: CAT-AUDIT-FULLSWEEP-20260703-001 · Lane 4 · Captured 2026-07-03 · READ-ONLY sweep
Method: grep census over `src/` (`*.ts`/`*.tsx`), inspection of `eslint.config.js`, `design-governance/*.json` baselines, and the two generated registries under `src/registry/`. No files regenerated, no code touched.

---

## 1. shadcn census — importing files per primitive (ranked by migration size)

890 unique files import from `@/components/ui/*` (2,647 import statements). shadcn is BANNED in new code (eslint.config.js §20.2 — warn-only). Atlaskit mapping per primitive:

| Rank | Primitive | Importing files | Atlaskit canonical replacement |
|---|---|---|---|
| 1 | button | 586 | `@atlaskit/button` (via `@/components/ads` Button) |
| 2 | input | 275 | `@atlaskit/textfield` (ads Textfield) |
| 3 | select | 227 | `@atlaskit/select` (ads Select) |
| 4 | dialog | 192 | `@atlaskit/modal-dialog` (ads Modal) |
| 5 | label | 177 | `@atlaskit/form` (Label) |
| 6 | card | 155 | `@atlaskit/primitives` Box/Stack (no 1:1; ads wrapper needed) |
| 7 | dropdown-menu | 127 | `@atlaskit/dropdown-menu` (ads DropdownMenu) |
| 8 | checkbox | 114 | `@atlaskit/checkbox` (ads Checkbox) |
| 9 | textarea | 97 | `@atlaskit/textarea` |
| 10 | popover | 90 | `@atlaskit/popup` (ads Popup) |
| 11 | skeleton | 85 | `@atlaskit/spinner` / skeleton pattern in ads |
| 12 | scroll-area | 85 | native overflow + ADS tokens (no Atlaskit primitive) |
| 13 | alert-dialog | 54 | `@atlaskit/modal-dialog` (appearance=danger) |
| 14 | tabs | 45 | `@atlaskit/tabs` |
| 15 | progress | 45 | `@atlaskit/progress-bar` (ads ProgressBar) |
| 16 | table | 38 | `JiraTable` / `@atlaskit/dynamic-table` (ads DynamicTable) |
| 17 | sheet | 35 | `@atlaskit/drawer` (ads CatalystDrawer) |
| 18 | switch | 33 | `@atlaskit/toggle` |
| 19 | calendar | 26 | `@atlaskit/calendar` / `@atlaskit/datetime-picker` |
| 20 | alert | 24 | `@atlaskit/section-message` (ads SectionMessage) |
| 21 | catalyst-date-picker | 23 | `@atlaskit/datetime-picker` |
| 22 | CatyPulseIcon | 21 | Catalyst signature icon — keep (canonical) |
| 23 | separator | 20 | ADS token border / `@atlaskit/menu` Section |
| 24 | radio-group | 13 | `@atlaskit/radio` |
| 25 | collapsible | 13 | disclosure pattern (`@atlaskit/side-navigation` / custom w/ ads) |
| 26 | slider | 12 | `@atlaskit/range` |
| 27 | command | 9 | `@atlaskit/dropdown-menu` + Textfield (command palette pattern) |
| 28 | AIIntelligenceButton | 9 | canonical Catalyst AI CTA — keep |
| 29 | form | 8 | `@atlaskit/form` |
| 30 | user-picker | 7 | `@atlaskit/user-picker` (ads ProfilePicker) |
| 31 | context-menu | 7 | `@atlaskit/dropdown-menu` |
| 32 | sonner | 5 | `@atlaskit/flag` (ads Flag) |
| 33 | unified-toolbar | 3 | ads composition |
| 34 | SyncStatusIndicator | 3 | keep (Catalyst canonical) |
| 35 | CatyIconCTA | 3 | keep (Catalyst canonical) |
| 36 | segmented-tabs | 2 | `@atlaskit/tabs` |
| 37 | lookup-select | 2 | `@atlaskit/select` |
| 38 | catalyst-table | 2 | `JiraTable` |
| 39 | branded-checkbox | 2 | `@atlaskit/checkbox` |
| 40–46 | toast / resizable / hover-card / breadcrumb / accordion / EmptyState / CatalystToast | 1 each | flag / — / `@atlaskit/profilecard` / ads Breadcrumbs / disclosure / ads EmptyState / ads Flag |
| 47–49 | use-toast / toggle / drawer | 0 | dead shadcn files — delete |

Note: no `tooltip.tsx`, `badge.tsx`, or `avatar.tsx` remain in `src/components/ui/` — those shadcn primitives are already retired.

---

## 2. Tailwind color utility heatmap (bare-color ban)

Pattern: `(bg|text|border|ring|fill|stroke|from|to|via|divide|outline|decoration|shadow|accent|caret|placeholder)-(<palette>)-N`.
**Total: 7,383 occurrences** (task brief estimated ~6,876; this scan's prefix set is slightly broader).

| Directory | Occurrences | Share |
|---|---|---|
| src/components/ | 3,853 | 52.2% |
| src/modules/ | 2,421 | 32.8% |
| src/pages/ | 625 | 8.5% |
| src/features/ | 417 | 5.6% |
| src/hooks/ | 19 | 0.3% |
| src/config/ | 19 | 0.3% |
| src/types/ | 16 | 0.2% |
| src/lib/ | 7 | 0.1% |
| src/shared/ | 6 | 0.1% |

Top offender files: `src/pages/releases/DefectDetailPage.tsx` (130), `src/components/strategy/intelligence/AIStrategyIntelligencePanel.tsx` (114), `src/modules/work-hub/views/AllWorkView.tsx` (80), `src/components/budget/BudgetDataQualityTab.tsx` (80), `src/modules/task10/components/landing/T10LandingPageV3.tsx` (79), `src/components/budget/BudgetSummaryTab.tsx` (73), `src/components/budget/ScenarioDetailsModal.tsx` (69), `src/components/budget/DataQualityDetailModals.tsx` (69), `src/modules/tasks/components/insights/WeeklySummaryView.tsx` (66), `src/components/work-manager/TaskDrawer.tsx` (61). The budget suite alone (`src/components/budget/`) contributes 6 of the top 15 files.

---

## 3. Direct `@atlaskit/*` imports bypassing `src/components/ads`

The wrapper layer exists (34 wrappers in `src/components/ads/`) and `eslint.config.js` forbids direct imports — but at severity **"warn"** codebase-wide (`makeAdsForbidAtlaskit("warn")`, line 385); only the ~40 globs in `adsMigratedFiles` get "error".

**678 files** import `@atlaskit/*` directly outside `src/components/ads/` (~2,766 import statements). Per package (outside ads layer):

| Package | Imports | Wrapper exists? |
|---|---|---|
| @atlaskit/icon | 1,270 | n/a (icons intentionally direct-ish, but see `src/lib/atlaskit-icons.tsx` registry with 171 imports) |
| @atlaskit/button | 252 | ads Button ✓ |
| @atlaskit/tokens | 229 | exempted by rule (utility) |
| @atlaskit/spinner | 145 | ads Spinner ✓ |
| @atlaskit/modal-dialog | 114 | ads Modal ✓ |
| @atlaskit/textfield | 109 | ads Textfield ✓ |
| @atlaskit/lozenge | 105 | ads Lozenge ✓ |
| @atlaskit/select | 87 | ads Select ✓ |
| @atlaskit/tooltip | 66 | ads Tooltip ✓ |
| @atlaskit/checkbox | 32 | ads Checkbox ✓ |
| @atlaskit/tabs | 31 | none |
| @atlaskit/textarea | 29 | none |
| @atlaskit/primitives | 26 | none |
| @atlaskit/section-message | 25 | ads SectionMessage ✓ |
| @atlaskit/toggle | 24 | none |
| @atlaskit/heading | 23 | ads Heading ✓ |
| @atlaskit/empty-state | 21 | ads EmptyState ✓ |
| @atlaskit/badge | 20 | none |
| @atlaskit/dropdown-menu | 18 | ads DropdownMenu ✓ |
| @atlaskit/datetime-picker | 14 | none |
| (37 more packages) | 105 | — |

Worst files by direct-import count: `src/lib/atlaskit-icons.tsx` (171 — intentional icon registry), `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` (45), `src/pages/admin/FeatureFlagsPage.tsx` (30), `src/components/layout/HomeSidebar.tsx` (24), `src/modules/tasks/views/TasksTaskListView.tsx` (23), `src/lib/icons/icon-registry.ts` (22), `src/components/filters/CanonicalFilter.tsx` (22), `src/components/project-hub/dashboard/widgets/DemandFulfilmentGadget.tsx` (20).

**Hard-ban violation:** `@atlaskit/avatar`/`avatar-group` are BANNED in product code (only `src/components/ads/Avatar.tsx` + `src/components/shared/CatalystAvatar.tsx` allowed). 8 violating files: `src/components/universal-work-view/UWVToolbar.tsx`, `src/components/chat/main/AtlaskitAvatar.tsx`, `src/components/shared/JiraTable/cells.tsx`, `src/components/shared/Timeline/SidebarRow.tsx`, `src/components/shared/Timeline/TimelineView.tsx`, `src/components/projecthub/MemberStack.tsx`, `src/modules/tasks/views/TasksTaskListView.tsx`, `src/pages/project-hub/jira-list/components/AllWorkToolbar.tsx`.

---

## 4. Hand-rolled banned UI

- **Raw `<table>` elements outside JiraTable/ads/ui**: 212 occurrences in **153 files** (full list captured during sweep; heaviest areas: `src/components/budget/` (8 files), `src/components/releases|releasehub` (9), `src/pages/admin/` (17), `src/components/work-manager/` (5), `src/modules/tasks/` (5)). Direct violation of the JiraTable/table-list rule.
- **Hand-rolled menus (`role="menu"`)**: 106 occurrences outside `src/components/ui/`. Clusters: `components/shared` (24), `modules/project-work-hub` (13), `features/chat-v2` (11), `components/kanban` (8), `pages/admin` (6), `components/filters` (6), `features/kanban-board` (5, incl. `PortalMenu.tsx` — a bespoke portal-positioned menu engine), `components/catalyst-detail-views` (5).
- **Hand-rolled tooltips (`role="tooltip"`)**: 6 — `src/features/chat-v2/components/shared/ActionTooltip.tsx`, `src/components/catalyst-detail-views/shared/sections/web-links/WebLinkRow.tsx`, `src/components/chat/main/MessageReactions.tsx`, `src/components/layout/ChatProjectRow.tsx`, `src/components/shared/IssueHoverCard.tsx`, `src/components/business-requests/BRStatusEducationalPopover.tsx`.
- **Hand-rolled tabs (`role="tab"` outside ui/)**: 10 files (chat/chat-v2 ×6, kanban-board HoverToolbar, `src/components/product-dashboard/widgets/NeedsAttentionWidget.tsx`, `src/components/workhub/issue-view/activity/ActivityPanelPilot.tsx`, dormant wiki).
- **Status pills**: `CatalystStatusPill` imported by only **11 files**; `statusPalette` by 13. Meanwhile 91 occurrences of `rounded-full` + Tailwind color combos exist (pill/dot patterns), e.g. `src/components/work-manager/TaskDrawer.tsx:382` (`rounded-full bg-red-100 text-red-700`), `src/features/all-releases/components/EnterpriseTableView.tsx:287`, `src/components/releases/quality-gates/ReleaseTestSummaryPanel.tsx:137`. 308 files combine `rounded-full` with status-related code (upper bound; includes dots/avatars).

---

## 5. Generated registries (NOT regenerated — summarized as-is)

- `src/registry/ads-violations.generated.ts` — captured **2026-05-17**. Total **6** violations (P0: 3 hand-rolled-dropdown, P1: 2 deprecated-shim dynamic-table imports in `StoryBacklogPage.tsx`, P2: 1 lozenge-duplicate in `ActivityItem.tsx`). P0s: `HierarchyContextMenu.tsx:47`, `FolderPanel.tsx:77`, `TestRepositoryPage.tsx:129`. **Severely stale/undersampled** — this lane's live grep finds 106 `role="menu"` sites alone.
- `src/registry/usage-map.generated.ts` (2.0 MB) — captured **2026-05-18**. Stats header: **3,815 components observed (512 atlaskit, 3,303 internal)**. ~6.5 weeks stale.
- Ratchet baselines: `design-governance/color-baseline.json` → `hardcodedColors: 0` (Phase 5, 2026-06-28); `design-governance/audit-baseline.json` (2026-07-03) → tokens 27,316 / typography 1,658 / spacing 1 / fontImports 0. Note: **neither baseline gates Tailwind color utilities as a standalone count** — the 7,383 TW-color occurrences ride inside the noisy `tokens` category.

---

## Findings matrix (CAT-AUDIT-0300…)

Legend — Mode: Static (grep/file inspection). Route: n/a unless surface-specific.

### CAT-AUDIT-0300 — shadcn/ui still the dominant primitive layer (890 files)
| Field | Value |
|---|---|
| Category | shadcn debt |
| Severity | High |
| Surface | Codebase-wide |
| Route | n/a |
| Component | `src/components/ui/*` (49 modules) |
| File Path | src/components/ui/ + 890 consumer files |
| Mode | Static |
| CRE Rule Impact | Violates CANONICAL COMPONENT HIERARCHY + "shadcn BANNED in new code" (eslint §20.2) |
| ADS Impact | 2,647 import statements bypass Atlaskit entirely |
| Typography Impact | shadcn components carry Tailwind type scale, not ADS type tokens |
| Performance Impact | Dual component stacks (Radix + Atlaskit) shipped in bundle |
| Accessibility Impact | Mixed a11y models (Radix vs Atlaskit) across identical patterns |
| Evidence | Census table §1; `grep -rl "@/components/ui/" src` → 890 files |
| Why | Rung-3 retirement ladder stalled; warn-only lint doesn't stop new usage |
| Recommended Fix | Execute ladder top-down by table §1 rank; promote per-surface globs to `adsMigratedFiles` error list as each lands |
| Regression Risk | High (form semantics, focus traps) — per-surface slices only |
| Validation Required | Screenshot signoff + DOM probes per migrated surface; `npm run lint` |
| Suggested PR | PR1–PR6 (staged: PR1 button, PR2 input/label/textarea, PR3 select, PR4 dialog/alert-dialog/sheet, PR5 dropdown/popover, PR6 remainder) |

### CAT-AUDIT-0301 — shadcn button: 586 importing files
Category: shadcn debt · Severity: High · Surface: codebase-wide · Route: n/a · Component: `src/components/ui/button.tsx` · Mode: Static · CRE: canonical-hierarchy violation · ADS: replacement = `@atlaskit/button` via ads Button · Typography: CTA labels off ADS scale · Performance: cva+Radix Slot in bundle · Accessibility: differs from Atlaskit button focus/spacing behavior · Evidence: 586 files (§1 rank 1) · Why: largest single migration unit · Fix: codemod `@/components/ui/button` → `@/components/ads` Button, appearance-map variants · Regression Risk: High (variant→appearance mapping) · Validation: visual sweep of top 20 surfaces, lint gate · PR: PR1

### CAT-AUDIT-0302 — shadcn form-field family (input 275, label 177, textarea 97, form 8)
Category: shadcn debt · Severity: High · Surface: all forms · Route: n/a · Component: `ui/input.tsx`, `ui/label.tsx`, `ui/textarea.tsx`, `ui/form.tsx` · Mode: Static · CRE: canonical-hierarchy · ADS: `@atlaskit/textfield`, `@atlaskit/textarea`, `@atlaskit/form` · Typography: field labels off ADS scale · Performance: minor · Accessibility: Atlaskit Form wires label/field/message ids automatically; shadcn relies on manual htmlFor · Evidence: §1 ranks 2/5/9/29 · Why: 557 combined files, second-largest unit · Fix: migrate per-surface with ads Textfield wrapper · Regression Risk: High (react-hook-form coupling in `ui/form.tsx`) · Validation: form submit e2e probes · PR: PR2

### CAT-AUDIT-0303 — shadcn select + lookup-select: 229 files
Category: shadcn debt · Severity: High · Surface: all pickers · Route: n/a · Component: `ui/select.tsx`, `ui/lookup-select.tsx` · Mode: Static · CRE: canonical-hierarchy · ADS: `@atlaskit/select` (ads Select exists) · Typography: menu items off ADS scale · Performance: Radix portal stack · Accessibility: keyboard/typeahead differences · Evidence: §1 rank 3 + 37 · Why: pickers are the highest-interaction primitive · Fix: per-surface swap to ads Select; async options via Atlaskit AsyncSelect · Regression Risk: High (controlled-value shape differs) · Validation: DOM probes on option select · PR: PR3

### CAT-AUDIT-0304 — shadcn overlay family (dialog 192, alert-dialog 54, sheet 35, drawer 0)
Category: shadcn debt · Severity: High · Surface: all modals/drawers · Route: n/a · Component: `ui/dialog.tsx`, `ui/alert-dialog.tsx`, `ui/sheet.tsx` · Mode: Static · CRE: canonical-hierarchy + modal-pattern rulebook · ADS: `@atlaskit/modal-dialog`, `@atlaskit/drawer` (ads Modal/CatalystDrawer exist) · Typography: modal titles off ADS Heading · Performance: minor · Accessibility: focus-trap + ESC semantics differ · Evidence: §1 ranks 4/13/17 · Why: 281 files; modal patterns are rulebook-governed · Fix: ads Modal migration, danger appearance for alert-dialog · Regression Risk: Medium-High · Validation: screenshot + focus-trap probe · PR: PR4

### CAT-AUDIT-0305 — shadcn menu/popover family (dropdown-menu 127, popover 90, command 9, context-menu 7, hover-card 1)
Category: shadcn debt · Severity: Medium · Surface: all action menus · Route: n/a · Component: `ui/dropdown-menu.tsx` etc. · Mode: Static · CRE: HAND-ROLLED UI BANNED (menus) — shadcn menus are the sanctioned-looking version of the same debt · ADS: `@atlaskit/dropdown-menu`, `@atlaskit/popup` (ads wrappers exist) · Typography: menu type off scale · Performance: minor · Accessibility: Atlaskit handles nested submenu focus · Evidence: §1 ranks 7/10/27/31/42 · Why: 234 files · Fix: ads DropdownMenu/Popup swap · Regression Risk: Medium · Validation: menu-open DOM probes · PR: PR5

### CAT-AUDIT-0306 — shadcn selection controls (checkbox 114, switch 33, radio-group 13, slider 12, branded-checkbox 2)
Category: shadcn debt · Severity: Medium · Surface: forms/settings · Route: n/a · Component: `ui/checkbox.tsx` etc. · Mode: Static · CRE: canonical-hierarchy · ADS: `@atlaskit/checkbox`, `@atlaskit/toggle`, `@atlaskit/radio`, `@atlaskit/range` · Typography: n/a · Performance: minor · Accessibility: native-input-backed Atlaskit controls vs Radix ARIA · Evidence: §1 ranks 8/18/24/26/39 · Why: 174 files · Fix: ads Checkbox exists; add Toggle/Radio/Range wrappers first · Regression Risk: Medium · Validation: checked-state probes · PR: PR6

### CAT-AUDIT-0307 — shadcn card: 155 files with no ads wrapper mapped
Category: shadcn debt / wrapper gap · Severity: Medium · Surface: dashboards/widgets · Route: n/a · Component: `src/components/ui/card.tsx` · Mode: Static · CRE: canonical-hierarchy · ADS: no 1:1 Atlaskit card; needs ads composition (`@atlaskit/primitives` Box + tokens) or WidgetWrapper reuse · Typography: CardTitle off ADS Heading · Performance: negligible · Accessibility: low · Evidence: §1 rank 6 · Why: wrapper gap blocks migration of 155 files · Fix: author `src/components/ads/Card.tsx` (token-only) before consumer migration · Regression Risk: Low-Medium · Validation: screenshot sweep of dashboards · PR: PR6

### CAT-AUDIT-0308 — shadcn table.tsx + catalyst-table: 40 files on banned table primitives
Category: banned UI (tables) · Severity: High · Surface: list surfaces · Route: n/a · Component: `ui/table.tsx` (38), `ui/catalyst-table.tsx` (2) · Mode: Static · CRE: **JIRATABLE / TABLE-LIST RULE** direct violation · ADS: `JiraTable` mandatory for work-item surfaces; `@atlaskit/dynamic-table` (ads DynamicTable) for admin lists · Typography: header cells off scale · Performance: no virtualization · Accessibility: sort/aria handled by DynamicTable · Evidence: §1 ranks 16/38 · Why: table rule is a hard rule, not preference · Fix: per-surface JiraTable proof + migration · Regression Risk: High (column defs, sorting, persistence) · Validation: screenshot + sort/filter DOM probes · PR: PR7

### CAT-AUDIT-0309 — shadcn tabs/segmented-tabs: 47 files
Category: shadcn debt · Severity: Medium · Surface: detail views · Route: n/a · Component: `ui/tabs.tsx`, `ui/segmented-tabs.tsx` · Mode: Static · CRE: canonical-hierarchy · ADS: `@atlaskit/tabs` (no ads wrapper yet — gap) · Typography: tab labels off scale · Performance: minor · Accessibility: arrow-key nav differences · Evidence: §1 ranks 14/36 · Fix: add ads Tabs wrapper, migrate · Regression Risk: Medium · Validation: tab-switch probes · PR: PR6

### CAT-AUDIT-0310 — Tailwind color utilities: 7,383 occurrences (bare-color ban)
| Field | Value |
|---|---|
| Category | ADS tokens / bare colors |
| Severity | Critical |
| Surface | Codebase-wide; heatmap §2 |
| Route | n/a |
| Component | 52% in src/components/, 33% in src/modules/ |
| File Path | Top: src/pages/releases/DefectDetailPage.tsx (130); src/components/strategy/intelligence/AIStrategyIntelligencePanel.tsx (114); src/modules/work-hub/views/AllWorkView.tsx (80); src/components/budget/* (≈420 across 6 files) |
| Mode | Static (regex census) |
| CRE Rule Impact | "ADS TOKENS ONLY — HARD STOP" — the single most violated rule per CLAUDE.md |
| ADS Impact | 7,383 sites ignore `var(--ds-*)`; dark mode renders wrong on all of them |
| Typography Impact | co-located `text-{color}` classes often pair with off-scale `text-[10px]` etc. |
| Performance Impact | negligible |
| Accessibility Impact | contrast unverified vs ADS-token guaranteed pairs |
| Evidence | §2 heatmap; regex over src/*.ts(x) |
| Why | The hex ratchet (`color-baseline.json` = 0) gates hex but TW color utils only ride the noisy `tokens` audit category — no dedicated ratchet |
| Recommended Fix | Directory-scoped token sweeps starting with top-10 files; add a dedicated TW-color-utility count to `audit-baseline.json` so the ratchet bites |
| Regression Risk | Medium (visual only) — verify in dark mode per JK feedback |
| Validation Required | `npm run audit:ads:gate`; dark-mode screenshots of touched surfaces |
| Suggested PR | PR8 (budget suite), PR9 (releases/defects), PR10 (work-hub/tasks modules) |

### CAT-AUDIT-0311 — 678 files import @atlaskit/* directly, bypassing the ads wrapper layer
Category: wrapper bypass · Severity: Medium · Surface: codebase-wide · Route: n/a · Component: §3 per-package table · File Path: worst: `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` (45 imports), `src/pages/admin/FeatureFlagsPage.tsx` (30), `src/components/layout/HomeSidebar.tsx` (24), `src/modules/tasks/views/TasksTaskListView.tsx` (23), `src/components/filters/CanonicalFilter.tsx` (22) · Mode: Static · CRE: ads-barrel rule (eslint) — warn-only codebase-wide · ADS: version-bump blast radius un-isolated for ~2,766 import statements · Typography: n/a · Performance: n/a · Accessibility: n/a · Evidence: §3; `eslint.config.js:385` `makeAdsForbidAtlaskit("warn")` · Why: warn severity means no enforcement outside `adsMigratedFiles` globs · Fix: (a) add missing wrappers (tabs, textarea, toggle, badge, datetime-picker, primitives re-export); (b) ratchet: promote directory globs to error as swept · Regression Risk: Low (mechanical import rewrites) · Validation: `npm run lint` zero new warns in swept dirs · PR: PR11

### CAT-AUDIT-0312 — @atlaskit/avatar hard-ban violated in 8 product files
Category: banned import · Severity: High · Surface: toolbars/tables/timeline/chat · Route: n/a · Component: Avatar · File Path: `src/components/universal-work-view/UWVToolbar.tsx`, `src/components/chat/main/AtlaskitAvatar.tsx`, `src/components/shared/JiraTable/cells.tsx`, `src/components/shared/Timeline/SidebarRow.tsx`, `src/components/shared/Timeline/TimelineView.tsx`, `src/components/projecthub/MemberStack.tsx`, `src/modules/tasks/views/TasksTaskListView.tsx`, `src/pages/project-hub/jira-list/components/AllWorkToolbar.tsx` · Mode: Static · CRE: explicit BAN in eslint config (only ads/Avatar.tsx + CatalystAvatar.tsx exempt) · ADS: bypasses CDN ban + deterministic initials palette → gray-silhouette regressions · Typography: n/a · Performance: avatar CDN fetches · Accessibility: initials fallback lost · Evidence: §3 hard-ban list; eslint.config.js avatar pattern block · Why: warn-only severity let 8 files through · Fix: swap to `CatalystAvatar`/`UserAvatar`; add files to `adsMigratedFiles` · Regression Risk: Low · Validation: avatar render screenshot (colored initials, no gray) · PR: PR11

### CAT-AUDIT-0313 — 153 files render raw `<table>` outside JiraTable (212 occurrences)
Category: hand-rolled banned UI (tables) · Severity: High · Surface: admin (17 files), budget (8), releases/releasehub (9), work-manager (5), tasks module (5), + 109 more · Route: multiple (admin/*, releases/*, budget tabs, work-hub) · Component: e.g. `src/components/admin/rbac/PermissionsMatrix.tsx`, `src/components/budget/BudgetLedgerTable.tsx`, `src/components/project-hub/work-items/WorkItemsTable.tsx`, `src/pages/project-hub/jira-list/components/AllWorkTable.tsx`, `src/modules/work-hub/views/AllWorkView.tsx` · Mode: Static · CRE: JIRATABLE RULE — no custom `<table>` without written proof · ADS: bypasses JiraTable/DynamicTable sorting, ADS row styling, persistence · Typography: header cells hand-styled · Performance: no virtualization on large lists · Accessibility: missing sort announcements/scope attrs in most · Evidence: §4 bullet 1 (full 153-file list from sweep) · Why: predates rule or built during rule violations; some (adfLightRenderer, TableInteractions) are legitimate rich-text table renderers — exclude those ~4 from migration scope · Fix: triage list into (a) work-item surfaces → JiraTable, (b) admin lists → ads DynamicTable, (c) legit ADF renderers → exempt with comment · Regression Risk: High per surface · Validation: per-surface screenshot + sort probe · PR: PR7 |

### CAT-AUDIT-0314 — 106 hand-rolled `role="menu"` implementations
Category: hand-rolled banned UI (menus) · Severity: High · Surface: chat-v2 (11), components/shared (24), project-work-hub (13), kanban (13 incl. `src/features/kanban-board/components/PortalMenu.tsx` bespoke portal-menu engine), filters (6), admin (6) · Route: multiple · Component: e.g. `PortalMenu.tsx`, `SubmenuItem.tsx`, `DesignPopover.tsx`, `MessageMoreMenu.tsx`, `CatalystQuickActions.tsx` · Mode: Static · CRE: HAND-ROLLED UI BANNED (menus/dropdowns) — matches the P0 category in the generated violations registry · ADS: `@atlaskit/dropdown-menu` / `@atlaskit/menu` replacement · Typography: menu items hand-styled · Performance: each carries its own outside-click listeners · Accessibility: most lack full menu keyboard contract (typeahead, home/end) · Evidence: §4 bullet 2; registry P0s (`HierarchyContextMenu.tsx:47`, `FolderPanel.tsx:77`, `TestRepositoryPage.tsx:129`) confirm pattern predates 2026-05-17 · Why: registry scanner only caught 3 of ~106 sites · Fix: sweep by cluster starting with the 3 registry P0s + PortalMenu consumers · Regression Risk: Medium-High (submenu positioning) · Validation: menu-open/keyboard DOM probes · PR: PR12

### CAT-AUDIT-0315 — Hand-rolled tooltips (6) and tabs (10 files)
Category: hand-rolled banned UI · Severity: Medium · Surface: chat, detail views, dashboards · Route: n/a · Component: `src/features/chat-v2/components/shared/ActionTooltip.tsx`, `src/components/shared/IssueHoverCard.tsx` (role="tooltip"); hand-rolled `role="tab"` in chat/chat-v2 (6), `NeedsAttentionWidget.tsx`, `ActivityPanelPilot.tsx` · Mode: Static · CRE: HAND-ROLLED UI BANNED (tooltips, tabs) · ADS: `@atlaskit/tooltip` (ads Tooltip exists), `@atlaskit/tabs` · Typography: hand-styled · Performance: minor · Accessibility: hover-only tooltips not keyboard-reachable in several · Evidence: §4 bullets 3–4 · Fix: swap to ads Tooltip; ads Tabs wrapper then migrate · Regression Risk: Low-Medium · Validation: keyboard-focus tooltip probe · PR: PR12

### CAT-AUDIT-0316 — Status pills bypass CatalystStatusPill/statusPalette
Category: hand-rolled banned UI (status pills) · Severity: Medium · Surface: releases, work-manager, all-releases · Route: n/a · Component: `CatalystStatusPill` has only 11 importers; `statusPalette` 13 — vs 91 `rounded-full`+Tailwind-color pill/dot sites · File Path: `src/components/work-manager/TaskDrawer.tsx:382,388`, `src/features/all-releases/components/EnterpriseTableView.tsx:287`, `src/features/all-releases/components/ReleaseCard.tsx:189`, `src/components/releases/test-execution/ExecutionHeader.tsx:132-140`, `src/components/releases/quality-gates/ReleaseTestSummaryPanel.tsx:137` · Mode: Static · CRE: HAND-ROLLED UI BANNED (status pills/lozenges); pill colors must come from statusPalette.ts only (memory: pill-color-contrast) · ADS: should be CatalystStatusPill (ADS subtle tier) or `@atlaskit/lozenge` · Typography: `text-[10px]` off-scale sizes co-located · Performance: n/a · Accessibility: color-only meaning in dot indicators · Evidence: §4 bullet 5 · Fix: sweep 91 sites → CatalystStatusPill/Lozenge; dots → ads token colors minimum · Regression Risk: Low-Medium · Validation: dark-mode screenshots · PR: PR9

### CAT-AUDIT-0317 — Generated ADS registries stale (6.5 weeks) and undercounting ~18×
Category: governance/tooling drift · Severity: Medium · Surface: `src/registry/`, admin ADSViolationsPanel · Route: /admin (ADSViolationsPanel.tsx consumes it) · Component: `src/registry/ads-violations.generated.ts` (captured 2026-05-17, total 6: P0 3 / P1 2 / P2 1), `src/registry/usage-map.generated.ts` (2026-05-18, 3,815 components: 512 atlaskit / 3,303 internal) · Mode: Static · CRE: governance surfaces lie about compliance state — violates zero-assumption rendering in spirit · ADS: admin panel shows 6 violations while live grep finds 106 role="menu" sites alone · Typography: n/a · Performance: n/a · Accessibility: n/a · Evidence: §5 · Why: scanners not wired to CI/pre-commit; scanner rules narrower than CLAUDE.md bans · Fix: rerun `npm run scan:ads-violations` + `scan-components.ts` on a schedule/CI; extend scanner categories (raw table, role=menu, TW pills) · Regression Risk: None (tooling) · Validation: regenerated file diff review · PR: PR11

### CAT-AUDIT-0318 — Enforcement is warn-only: bans exist on paper, not in CI
Category: governance/enforcement gap · Severity: High · Surface: eslint.config.js · Route: n/a · Component: `makeAdsForbidAtlaskit("warn")` (line 385) governs @atlaskit/*, shadcn `@/components/ui/*`, @tiptap/*, @radix-ui/* bans; only `adsMigratedFiles` (~40 globs) get "error" · Mode: Static · CRE: every ban in this lane (shadcn, direct atlaskit, avatar, radix) is currently advisory for ~95% of src/ · ADS: new violations can merge freely · Typography: n/a · Performance: n/a · Accessibility: n/a · Evidence: eslint.config.js:32-34 ("keep the codebase-wide rule at warn"), :385 · Why: intentional during migration, but no ratchet exists on *warn count* — debt can grow silently (Tailwind colors did: 7,383) · Fix: add a lint-warn-count ratchet (same pattern as ads-color-gate) or auto-append every newly migrated dir to `adsMigratedFiles` · Regression Risk: None · Validation: CI run showing gate active · PR: PR11

---

## Cluster + occurrence appendix

| Cluster | Findings | Files | Occurrences |
|---|---|---|---|
| shadcn primitive debt | 0300–0309 | 890 unique consumers | 2,647 import statements |
| Tailwind bare-color utilities | 0310 | ~1,400 (est. from per-file counts) | 7,383 |
| Direct @atlaskit bypass (incl. avatar ban) | 0311, 0312 | 678 | ~2,766 import statements |
| Raw `<table>` outside JiraTable | 0313 | 153 | 212 |
| Hand-rolled menus | 0314 | ~60 | 106 |
| Hand-rolled tooltips/tabs | 0315 | 16 | 16 |
| Hand-rolled status pills | 0316 | ≤91 | 91 |
| Stale registries / enforcement gap | 0317, 0318 | 3 (registry ×2, eslint) | 6 registry entries |
| **Total** | **19 findings** | — | **≈13,227 occurrences** |

## Lane Summary

- **Critical: 1** (CAT-AUDIT-0310 — 7,383 Tailwind color utilities vs the ADS-tokens hard stop)
- **High: 9** (0300, 0301, 0302, 0303, 0304, 0308, 0312, 0313, 0314, 0318 → 10 listed; severity roll-up: 0300–0304 shadcn majors ×5, 0308 shadcn tables, 0312 avatar ban, 0313 raw tables, 0314 hand-rolled menus, 0318 warn-only enforcement = **10 High**)
- **Medium: 7** (0305, 0306, 0307, 0309, 0311, 0315, 0316, 0317 = **8 Medium**)
- **Low: 0**

Corrected roll-up: **19 findings — 1 Critical, 10 High, 8 Medium, 0 Low.**
Total measured occurrences: **≈13,227** (2,647 shadcn imports + 7,383 TW colors + 2,766 atlaskit-bypass imports + 212 raw tables + 106 menus + 16 tooltip/tab + 91 pills + 6 registry entries).

Top risks: the ADS-token bare-color ban is violated 7,383 times with no dedicated ratchet; shadcn remains the majority primitive layer (890 files) while its ban is warn-only; the JiraTable rule is violated by 153 files of raw `<table>`; the avatar hard-ban is breached in 8 product files; and the governance registry that the admin panel displays reports 6 violations against a live reality in the thousands.
