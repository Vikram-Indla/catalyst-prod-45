# jira-compare — compounding lessons

Append-only. Newest at top. Each entry: date, pattern, rule, surface.

---

## 2026-05-08 — Panel header: type icon + key replace static label; rail width 528→420
**Surface:** BacklogPage.atlaskit.tsx `railInnerContent` panel header + `AtlaskitPageShell.sideRailWidth`
**Pattern:** Panel header hardcoded "Catalyst work item" — users had no way to know which issue was open. Fix: derive `detailItem` from `items.find(it => it.id === detailItemId)` and render `<JiraIssueTypeIcon>` + issue key. `sideRailWidth={528}` was crushing the table to ~54% viewport — Jira's measured split is ~60/40 at 1440px. 420px achieves that without cramping field rows.
**Rule:** Panel header MUST show `[type icon] [issue key]` — never a static label. Rail width must be tuned to achieve ~60/40 table/panel split at 1440px. Derive the open item from the existing `items` array; do not add a separate fetch.

## 2026-05-08 — Row context menu: Open in Jira + Copy link are Jira-standard actions
**Surface:** BacklogPage rowActions
**Pattern:** Jira's "..." row menu always has "Open in Jira" (external link) and "Copy link" (clipboard). Catalyst was missing both. Added `link-external` core icon for Open in Jira (navigates to `digital-transformation.atlassian.net/browse/${r.key}`) and `link` core icon for Copy link (`navigator.clipboard.writeText` of the Catalyst deep-link URL). Jira-sourced items correctly hide Duplicate/Delete (`hidden: r.source !== 'catalyst'`).
**Rule:** Row context menu must always include Open in Jira + Copy link at the top. Hide Duplicate/Delete for Jira-sourced rows. Use `@atlaskit/icon/core/link-external` and `@atlaskit/icon/core/link` — both exist in the installed version.

## 2026-05-08 — @atlaskit/modal-dialog portal is broken on BacklogPage; use ReactDOM.createPortal
**Surface:** BacklogPage ChildCreateModal
**Pattern:** `ModalTransition`/`Modal` from `@atlaskit/modal-dialog` renders an empty portal on this surface — confirmed by React fiber inspection showing 0 children in the portal root. Root cause is likely the ADS theme context or the sticky-bottom table layout disrupting the portal mount. `ReactDOM.createPortal(content, document.body)` works reliably — same pattern as `DangerConfirmModal.tsx` and `WatchersChip.tsx`.
**Rule:** On the BacklogPage surface, never use `@atlaskit/modal-dialog`. Always use `ReactDOM.createPortal` with a backdrop `div[position:fixed inset:0]` + dialog container. Mirror `DangerConfirmModal.tsx` shape.

## 2026-05-08 — CSS display:none hover-click timing bug; use opacity/pointer-events
**Surface:** JiraTable.tsx `.jira-create-child-btn` hover affordance
**Pattern:** `display:none → display:inline-flex` toggle on `tr:hover` causes the element to be absent from the layout tree at the moment of physical mousedown, so clicks consistently miss. Switching to `opacity:0; pointer-events:none → opacity:1; pointer-events:auto` keeps the element in the layout tree at all times — only visibility/interactivity toggles. Physical click lands reliably.
**Rule:** Never use `display:none/block` toggle for hover-revealed interactive elements. Always use `opacity + pointer-events` so the element stays in layout and accepts clicks immediately on hover.

## 2026-05-08 — List table full parity: 4 implementation patterns locked in
**Surface:** BacklogPage list table (JiraTable + cells.tsx)
**Pattern:** Full end-to-end parity of Jira list view completed in 4 phases. Four patterns confirmed through live DOM probes and CRUD: (1) focused key cell border must use `display:block; width:100%` NOT inline-block (inline-block wraps text only). (2) Comment badge dot (6px absolute circle, `--ds-background-information-bold`) appears on icon whenever `n > 0`. (3) `DEFAULT_VISIBLE_COLUMNS` constant + column `defaultVisible` flag must BOTH be updated together. (4) `__drag` structural column shifts nth-child selectors — always recount after adding/removing structural columns.
**Rule:** After adding any structural column (id starts with `__`), grep all CSS nth-child selectors in JiraTable.tsx and update the column indices. Full CRUD parity (C/R/U/D green) is the only valid exit gate — visual match alone is not sufficient.

---

## 2026-05-07 — BAU has no native Jira board; use same-tenant board as reference
**Surface:** Kanban board (`/project-hub/BAU/boards`)
**Pattern:** `https://digital-transformation.atlassian.net/jira/software/projects/BAU/boards` returns 404 — BAU is a company-managed project with no native Jira board configured. Attempting to use it as Lane A Jira reference for board audits fails silently.
**Rule:** Before a Kanban board audit, confirm the Jira project has a board (`/jira/software/projects/<KEY>/boards`). If 404, use the nearest same-tenant board of the same board type (e.g. MIM Demand board 597) as the visual reference. Note the substitution in DIFF.

---
