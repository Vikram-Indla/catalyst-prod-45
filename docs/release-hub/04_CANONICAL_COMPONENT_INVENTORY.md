# 04 — Canonical Catalyst Component Inventory

**Date:** 2026-06-23. Reuse-first per CLAUDE.md. Use decisions: **A** = use Catalyst canonical wrapper; **B** = use `@atlaskit/*` directly (no wrapper exists); **C** = GAP — ask before building.

| UI need | Existing Catalyst component? | Exact file / import path | Atlaskit behind it | Use decision | Evidence |
|---|---|---|---|---|---|
| Page shell / app layout | ✅ | `src/components/layout/CatalystShell.tsx` | — | A | Mounts all hub routes |
| Release Operations side nav | ✅ | `src/components/layout/ReleaseHubSidebar.tsx` (`buildReleaseHubSections`) + `SidebarBase.tsx` | — | A | Owns the "Releases" item → `/release-hub/releases` |
| Per-page header (breadcrumb+title) | ✅ | `src/components/layout/ProjectPageHeader.tsx` | — | A | Already used by `ReleasesBacklogCanonical` as `ChromeHeader` |
| Work-item table (canonical) | ✅ | `src/components/shared/JiraTable/` (`index.ts` → `JiraTable.tsx`) | wraps table primitives | A | CLAUDE.md: only approved table; already live here |
| Table cell factories | ✅ | `src/components/shared/JiraTable/cells.tsx` | — | A | `makeKeyCell`, `makeStatusCell`, etc. |
| Table inline editors | ✅ | `src/components/shared/JiraTable/editors.tsx` | — | A | inline edit per cell |
| Backlog page (toolbar+search+group+columns+bulk) | ✅ | `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` | — | A | The current `/release-hub/releases` body |
| Releases data adapter | ✅ | `src/modules/project-work-hub/adapters/releasesDataSource.ts` | — | A | `useReleasesSource()` over `rh_releases` |
| Toolbar menu / kebab on table | ✅ | `src/components/shared/JiraTable/ToolbarMenuButton.tsx`, `ColumnHeaderMenu.tsx` | `@atlaskit/dropdown-menu` (portal pattern) | A | per CLAUDE.md dropdown rules |
| Button | ✅ pattern | `@atlaskit/button/new` (used directly across releasehub) | `@atlaskit/button` | B | `CreateReleaseModal.tsx` imports `@atlaskit/button/new` |
| Icon button | ✅ pattern | `@atlaskit/button` IconButton | `@atlaskit/button` | B | CLAUDE.md canonical |
| Dropdown / action menu | ⚠️ portal pattern | `@atlaskit/dropdown-menu` **only if no `overflow:hidden` ancestor**; else portal pattern (CLAUDE.md 2026-06-13) | `@atlaskit/dropdown-menu` | B (+guard) | CLAUDE.md Popper bug lesson |
| Modal / dialog | ✅ pattern (no `CatalystModal` wrapper) | `@atlaskit/modal-dialog` (`Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition`) | `@atlaskit/modal-dialog` | B | `CreateReleaseModal.tsx` |
| Existing release create/edit modal | ✅ | `src/components/releasehub/CreateReleaseModal.tsx` | modal-dialog + select + datetime-picker + textfield | A (for rh_releases create/edit) | Rich release fields |
| Form + validation | ✅ pattern | `@atlaskit/form` | `@atlaskit/form` | B | CLAUDE.md mandates Atlaskit form |
| Text field | ✅ pattern | `@atlaskit/textfield` | same | B | `CreateReleaseModal.tsx` |
| Textarea | ✅ pattern | `@atlaskit/textarea` | same | B | installed |
| Date picker | ✅ pattern | `@atlaskit/datetime-picker` (`DatePicker`) | same | B | `CreateReleaseModal.tsx`; pkg installed |
| Select | ✅ pattern | `@atlaskit/select` | same | B | `CreateReleaseModal.tsx` |
| Lozenge / status badge | ✅ | JiraTable status cell + `@atlaskit/lozenge`; `LozengeAppearance` from `@/components/shared/JiraTable` | `@atlaskit/lozenge` | A | adapter uses `LozengeAppearance` |
| Progress bar (release) | ✅ EXISTS | `src/components/releases/ReleaseProgressBar.tsx`; also `@atlaskit/progress-bar` installed | `@atlaskit/progress-bar` | A | dedicated release progress component already in repo |
| Tooltip | ✅ pattern | `@atlaskit/tooltip` | same | B | installed |
| Flag / toast | ✅ | `src/lib/catalystToast.ts` (canonical); `@atlaskit/flag` | `@atlaskit/flag` | A | CLAUDE.md: no sonner/custom |
| Empty state | ⚠️ | `@atlaskit/empty-state` installed; no `CatalystEmptyState` wrapper found | `@atlaskit/empty-state` | B | pkg present; BacklogPage has its own empty handling |
| Skeleton / loading | ✅ | `@atlaskit/spinner` (used in `ReleasesBacklogCanonical`); BacklogPage skeletons | `@atlaskit/spinner` | A/B | live |
| Detail view shell | ✅ | `src/components/catalyst-detail-views/shared/CatalystViewBase.tsx`; release detail = `ReleaseDetailPage` (8 tabs) | — | A | release detail already canonical |
| Tabs | ✅ pattern | `@atlaskit/tabs`; release detail tabs `src/components/releasehub/detail/ReleaseDetailTabs.tsx` | `@atlaskit/tabs` | A | exists |
| Breadcrumbs | ✅ | via `ProjectPageHeader` / `@atlaskit/breadcrumbs` | `@atlaskit/breadcrumbs` | A | header component |
| Checkbox / radio | ✅ pattern | `@atlaskit/checkbox`, `@atlaskit/radio` | same | B | CLAUDE.md |
| Drag & drop (reorder) | ✅ pattern | `@atlaskit/pragmatic-drag-and-drop` (+ `-react-drop-indicator`, `-auto-scroll`, `-hitbox`) | same | B | installed; @dnd-kit deprecated per memory |
| Permission guard | ✅ | `<ModuleGuard moduleCode="releases">` (org-level); `<AdminGuard>` (role) | — | A | overview route uses it; releases route does NOT |
| Work-item type icon | ✅ | `JiraIssueTypeIcon` `src/lib/jira-issue-type-icons.tsx`; adapter resolves `'Release'` | — | A | CLAUDE.md locked registry |
| i18n / RTL | ⚠️ | no dedicated release i18n found in scan | — | C (confirm scope) | needs check if in scope |
| Light/dark token pattern | ✅ | ADS `var(--ds-*)` tokens (CLAUDE.md) | `@atlaskit/tokens` | A | mandatory |
| Test pattern | ✅ | `src/components/shared/JiraTable/__tests__/`, `ReleaseHubSidebar.split.test.ts` | vitest | A | existing tests |

## Reuse rules applied

- **A first, B second, C ask.** The releases list surface is already an **A** (canonical BacklogPage/JiraTable). Do NOT hand-roll a parallel sectioned table.
- **Do not fork** `BacklogPage`/`JiraTable` to add Jira-version sections — parameterise via the existing `BacklogDataSource` adapter or a grouping prop (CLAUDE.md anti-fork rule). If the spec's sectioned UNRELEASED/RELEASED/ARCHIVED layout is wanted, decide whether JiraTable's existing group-by satisfies it before building anything new — flagged in `07` Q3.
- **`ReleaseProgressBar`** already exists — reuse, don't rebuild a segmented bar.
- **No `CatalystModal` / `CatalystEmptyState` wrappers exist** — using `@atlaskit/modal-dialog` and `@atlaskit/empty-state` directly is the established pattern (decision B), not a violation.

## Gaps (C — ask before building)

- A Jira-version-style **sectioned 3-bucket list with per-row progress + inline version create** does not exist as a component; the live page is a flat backlog table. Whether to build it is the core scope question (`07` Q2/Q3).
- No i18n/RTL layer specific to releases located — confirm whether in scope.
