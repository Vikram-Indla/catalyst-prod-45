# JIRA COMPARE — BAU list (groupBy=status)
Date: 2026-04-27 · Iteration: 1 · Auditor: Claude (jira-compare skill v3)

## Scope
Full BAU list page: tinted background → white surface → avatar strip → controls toolbar → table → group rows.

Jira ref:     https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list?sortBy=key&direction=DESC&groupBy=status
Catalyst ref: http://localhost:8080/project-hub/BAU/backlog?groupBy=status
Wiring list:  row click → side panel; inline edit save; Group/Sort independence (IRP-519); group expand/collapse; hierarchy expand on Epic.

## Executive verdict
Catalyst's table chrome and inline-edit semantics are now close to parity (Lozenge group headers, Avatar group headers, sticky bottom Create, ADS-token toolbar pills, Atlaskit-only chevron — all shipped earlier in this conversation). What remains as a P0 gap is the **page-level chrome layout**: Jira's BAU list has an avatar strip + "Add people" CTA on the LEFT and the Group pill anchored on the RIGHT. Catalyst has no avatar strip and the Group pill is left-of-center. This is a layout reflow, not a primitive substitution.

The user's spec doc claimed a blue-tinted background; Jira's actual `body` background is white (`rgb(255,255,255)`) — the Catalyst surface, also white, is **already correct**. Skill mandate says match Jira, not match spec; do not paint the page blue.

## Probe summary

| Surface | Jira | Catalyst |
|---|---|---|
| Body background | `rgb(255, 255, 255)` (white) | `rgb(255, 255, 255)` (white) — ✓ |
| Page title | "Senaei BAU" | "Senaei BAU Backlog" — minor drift |
| Avatar strip | 10 avatars + `+7` chip + "Add people" CTA on left | **none** — P0 |
| Toolbar order (L→R) | Add people · avatars · `+7` · Filter ... [stretch] ... Group: Status · Settings · More actions | Filter · Group · Maximize · Manage columns | P1 reorder |
| Group: Status pill X position | x=971 (right anchor) | left, immediately after Filter | P1 |
| Page chrome top-right | "Give feedback" · "Enter full screen" | (none) | P2 |
| Column data-keys | selectRow, issuetype, key, summary, status, commentsummary, parent, assignee, duedate, priority, labels, created, updated, reporter (14) | key, summary, status, comments, parent, assignee, priority, created, updated (9) | Missing: due-date, labels, reporter (offered via column picker — acceptable) |
| Column widths (visible) | Type 110, Key 120, Summary 400, Status 120, Comments 145, Parent 395 | Key ~94, Summary ~260, Status ~130, Comments ~94, Parent ~142, Assignee ~130, Priority ~83, Created ~94, Updated ~94 | Catalyst total ~1100; Jira total ~1300 — Jira renders wider per column (esp. Parent at 395) |
| White card border-radius | 8px | 6px | minor token drift |
| Group header lozenge | per Jira's BaseTable structure (probe selector missed; visible in screenshot) | ✓ Atlaskit Lozenge with proper `appearance` |
| Bottom + Create | sticky bottom of viewport | ✓ matched |
| Type column | data-key="issuetype" with header text "Type" | icon-only, no header text | P2 — add label "Type" or keep icon-only? Jira shows the word |

## P0 — Atlaskit / structural mismatches

| # | Element | Jira | Catalyst | Fix | Spec | Handoff |
|---|---------|------|----------|-----|------|---------|
| 1 | Avatar strip + "Add people" CTA in toolbar | `Avatar` group + `+7` overflow chip + primary "Add people" button on the LEFT of the toolbar | not present | Add `@atlaskit/avatar-group` (already in deps) populated with the project's recent assignees + an "Add people" button to its left | https://atlassian.design/components/avatar-group · https://atlassian.design/components/button | [LOVABLE] |
| 2 | Group pill anchor position | Anchored to the RIGHT side of the toolbar at x≈971 (toolbar-end) | LEFT side, immediately after Filter | Add a flex spacer between Filter and Group; or move Group + view-options icons into a right-aligned cluster | Layout-only | [CLAUDE CODE] |

## P1 — Parity drift

| # | Element | Jira | Catalyst | Fix | Handoff |
|---|---------|------|----------|-----|---------|
| 3 | Toolbar layout (left/right clusters) | Left: Add people + avatars + Filter. Right: Group + Settings + More actions. | Single left-aligned cluster | Wrap the toolbar in two flex clusters with `flex: 1` spacer between them | [CLAUDE CODE] |
| 4 | Page title text | "Senaei BAU" | "Senaei BAU Backlog" | Drop " Backlog" suffix on this surface (or sync to project name) | [CLAUDE CODE] |
| 5 | Type column header label | "Type" (data-key="issuetype", visible label) | empty (`label: ''`) | Either show "Type" text or keep icon-only — prefer visible "Type" for accessibility | [CLAUDE CODE] |
| 6 | Column widths — Parent + Summary | Parent 395px, Summary 400px | Parent ~142, Summary ~260 | Re-tune defaults: bump Parent and Summary; trim Created/Updated (Jira hides them entirely by default) | [CLAUDE CODE] |
| 7 | "More actions" overflow `⋯` | Has its own button | "Manage columns" icon next to it | Keep both; make sure the kebab opens a `@atlaskit/dropdown-menu` with view-level actions (Export, Refresh, Density) | [CLAUDE CODE] |
| 8 | Settings (view-options) icon | "Settings actions on the view options" — separate icon button | `Manage columns` icon | Add a sibling icon button for view options: density, fields, layout — separate from columns | [CLAUDE CODE] |

## P2 — Polish

| # | Element | Fix | Handoff |
|---|---------|-----|---------|
| 9 | "Give feedback" / "Enter full screen" top-right CTAs | Optional; Catalyst already has its own panel-mode toggle. Skip unless user requests parity. | [DESIGN-CRITIQUE] |
| 10 | White-card `border-radius` 6px → 8px | Trivial CSS token swap on outer wrapper | [CLAUDE CODE] |
| 11 | Avatar group sizing 24×24px round (`appearance="circle"`) | Confirm `size="small"` from `@atlaskit/avatar-group` matches; sample ADS lozenge bg `rgb(239, 255, 214)` we use already aligns | spec parity | [CLAUDE CODE] |

## P-A11Y — Accessibility

| # | Element | Concern | Handoff |
|---|---------|---------|---------|
| 12 | Type column with no header text | Screen-reader users hear empty header for the issue-type cell | Add visually-hidden label "Type" on the th | [A11Y] |
| 13 | Avatar group `+7` count | Jira: probably has aria-label "7 more people". Verify after implementing the strip. | [A11Y] |

## Wiring inventory (cross-reference for Phase 8 — to run in fresh conversation)

- **Row click → side panel:** Catalyst already opens `CatalystDetailRouter` via `openDetail`. Verify on rebuild.
- **Inline edit save (Status / Priority / Summary / Assignee / Parent):** Probed earlier in this conversation, popups now render and persist. Verify after rebuild.
- **Group/Sort independence (IRP-519):** Catalyst uses separate state vars; verify clicking column header changes only sort, not group. ✓ already correct.
- **Group expand/collapse:** wired via `onToggleGroup`. ✓.
- **Epic → Story hierarchy expand:** wired via `getRowDepth` + `expandedIds`. Verify lazy-load semantics if Catalyst defers child fetch.
- **Group: Status pill (right anchor) → menu opens → URL `?groupBy=status`:** verify after toolbar reorder.

## Proposed fix plan (Atlaskit-first, surgical)

1. `BacklogPage.atlaskit.tsx` — restructure toolbar into two flex clusters (`<div style={{display:'flex'}}>` + flex spacer + right cluster). Move Group control to right cluster, alongside a new view-options icon button + the existing column picker.
2. `BacklogPage.atlaskit.tsx` — add an `<AvatarGroup>` (`@atlaskit/avatar-group` — verify in `package.json`, already present) before the "Add people" button on the left of the toolbar.
3. `BacklogPage.atlaskit.tsx` — drop " Backlog" from the page title or sync it to the Jira project name.
4. `BacklogPage.atlaskit.tsx` — add visible "Type" header label on the type column.
5. `BacklogPage.atlaskit.tsx` — re-tune Parent/Summary widths upward (Parent 12 → 16, Summary 22 → 26 if total stays ≤100, else trim Created/Updated).
6. `JiraTable.tsx` — bump white-card border-radius from 6 → 8px.
7. `BacklogPage.atlaskit.tsx` — add an "Add people" Atlaskit button + project-members data hook (likely an existing hook: `useProjectMembers`).

## Handoff index

- [LOVABLE]: 1 finding (avatar strip + Add people — design judgement on member-data source)
- [CLAUDE CODE]: 8 findings
- [DESIGN-CRITIQUE]: 1 finding
- [A11Y]: 2 findings
- [ROVO]: 0
- [RESEARCH]: 0

## Acceptance checks (for the human, after the rebuild)

- [ ] Toolbar split into left (avatars + Add people + Filter) and right (Group + Settings + More actions) clusters.
- [ ] AvatarGroup renders ≤7 visible + `+N` overflow chip.
- [ ] Group: Status pill anchors to far right of toolbar.
- [ ] Page title is "Senaei BAU" not "Senaei BAU Backlog".
- [ ] Type column header reads "Type" (or has aria-label "Type").
- [ ] Column widths: Parent ≥ 280px, Summary ≥ 360px on default viewport.
- [ ] No regression on Lozenge / Avatar / PriorityBars group-header rendering.
- [ ] No regression on inline-edit popups (Status / Priority / Assignee / Parent).
- [ ] No regression on sticky bottom + Create.
- [ ] `?groupBy=status` URL contract intact.
