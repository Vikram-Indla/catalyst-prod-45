# /4 Evidence — Dependency Canvas Parity (Jira Plans)

Date: 2026-06-24. Source of truth: 4 Jira screenshots (digital-transformation.atlassian.net Plans → Dependencies). Live DOM probe of Jira not possible (MCP tab cannot cross-origin into the SSO'd instance; navigation bounces to localhost). Spec extracted from images + current-surface probe.

## BEFORE — current Catalyst surface (probed `/project-hub/BAU/dependencies`)

| Element | Measured |
|---|---|
| Canvas | 1388×688, bg #FFFFFF |
| Frames | **3 status swimlanes** (To Do / In Progress / Done) |
| Cards | 4, width **196px**, parented to lanes (`extent:'parent'` → constrained drag) |
| Edge labels | all **"blocks"** (3) — no direction logic |
| Card kebab | **none** (`hasKebab:false`) |
| Edge-click popup | **none** |
| Add dependency btn | **solid blue** |

## TARGET — Jira Plans (from images)

### A. Frame — ONE swimlane (image 1, 4)
- Single rounded rectangle per Group-by value. Group by: **Space** → one frame **"MM Support"**.
- Header top-left: space icon (color square) + name, ~16px/600.
- bg light gray (~`#EBECF0`/`--ds-surface-sunken`); contains ALL cards.
- Cards positioned by **free graph layout** (NOT status columns).
- **Frame draggable** — drag the whole rectangle to pan; cards individually draggable too.
- Requirement: canvas **wider**, shows **project name** in the frame header.

### B. Cards (image 1) — clean
- White, radius ~8px, subtle border + shadow. Width ~**280px** (wider than current 196).
- Row1: `[type icon] KEY`(blue link) … `⋯`(kebab, top-right).
- Row2: summary (one line).
- Row3: `Start date`/`End date` stacked label(11px gray)+value(13px); real dates or `-`.
- Status lozenge bottom-right (`TO DO`, `IN DEVELOP…` truncated).

### C. Edges (image 1)
- Smooth bezier, arrowhead. Neutral gray idle; **blue when selected** (image 2/3).
- Label = **"blocks" OR "blocked by"** per direction (gray pill `#F4F5F7`, 11px).
- Bidirectional = two separate edges (MMS-13⇄MMS-54).

### D. Edge-click → relationship popup (image 2)
- White rounded popup + shadow.
- Row1: `[type icon] SOURCE-KEY`(blue) summary.
- Row2: `[link glyph in dark circle] blocks` … `[unlink/broken-chain glyph]` (right; click = **unlink/remove dependency**).
- Row3: `[type icon] TARGET-KEY`(blue) summary (truncated).

### E. Card kebab ⋯ menu (image 3)
- Items: **Add dependency** (active) · *Filter by this work item* (disabled) · *Highlight related work item ›* (disabled, submenu) · **Locate work item in timeline** (active).
- Card gets **blue selection border** when menu open.

### F. Toolbar (image 4)
- Chips L→R: `Roll-up to: Story ⌄`(blue outline) · `Group by: Space ⌄`(blue outline) · `Space ⌄` · `Sprint ⌄` · `Work item`(disabled) · `Issue link type ⌄` · `Reset`(text).
- Right: `+ Add dependency` — **OUTLINED** (white bg + border, NOT solid blue).

### G. Zoom bar (image 3)
- `☐ Zoom on scroll | ⊖ ⊕ 80% | Fit | Reset`. Current: missing **Reset**; −/+ should be magnifier glyphs.

## DELTA → build list (priority)

| # | Requirement | Current | Build |
|---|---|---|---|
| 1 | ONE frame w/ project name, free-layout draggable cards | 3 status lanes | replace lanes → single frame node (project name+icon); free graph layout; `nodesDraggable` on cards; frame pan |
| 2 | Edge label blocks/blocked-by per direction | all "blocks" | derive label from dependency_type direction |
| 3 | Edge-click relationship popup + unlink glyph | none | onEdgeClick → popup (src/tgt cards + unlink) |
| 4 | Card ⋯ kebab menu (4 items) | none | kebab on card → portal menu |
| 5 | Outlined Add dependency button | solid blue | `appearance="default"` outlined |
| 6 | Wider canvas + clean cards | 196px cards | cards ~280px, refine spacing |
| 7 | Zoom bar Reset + glyphs | partial | add Reset, magnifier icons |

## Package note
Jira Plans is a private Atlassian React app (not a public npm graph lib). `@xyflow/react` (React Flow v12, already installed) replicates every element above — frame = single group node, drag = `nodesDraggable`+pan, popup = onEdgeClick, kebab = portal menu. No new dependency needed.
