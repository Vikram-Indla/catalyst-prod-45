# Dashboard Jira Parity — Session 2 Handover

## Date: 2026-06-08
## Branch: main
## Commits this session: 77b67bcb6, ff77184e3, a5aabb758, 2286da0ba

---

## DONE (cosmetic/chrome parity)

1. Typography sweep: 105 raw fontSize literals → dashboardTypography constants across all 11 widgets
2. Gadget title: 16px → 14px/600 (matching Jira)
3. Widget body: fixed 620px → content-driven auto height
4. Table headers: fontWeight 653→500, color→primary, padding→4px, hairline border
5. Gallery: deprecated @atlaskit/drawer → inline right sidebar panel (~400px)
6. Edit mode: auto-open gallery, layout presets dropdown, ESC to cancel
7. Card shadow: elevation.shadow.raised, borderRadius 3px
8. Header: minHeight 40px, padding 8px 16px
9. Rename "Demand Fulfilment" → "Epic Progress"
10. Remove scope banner, remove ProjectHub/IncidentHub/TestHub terminology
11. Filter pills: Lozenge uppercase → sentence-case spans
12. Summary text: bold 600 → regular 400
13. Column spacing: 1fr → 2fr/1fr split for breathing room
14. Avatar+name consistency across all widgets
15. Date format: RelativeTime → DD/Mon/YY in ProdIncidents + QADefects
16. CSS override for DynamicTable th (fontWeight 500, primary color)
17. Collapse animation removed (instant like Jira)
18. Last refreshed: 12px/400

---

## NOT DONE — CRITICAL GAPS (Vikram-flagged, session 3 scope)

### P0: Broken UI in Edit Mode
- **"Change layout" dropdown overlaps page title** — z-index/positioning issue with the DropdownMenu
- **Edit banner truncates text** when layout dropdown is open
- **Widget bodies collapse in edit mode** — only headers visible, can't see content while editing
- **DnD may not be working visually** — drag handles (⫶) are present but unclear if drop works

### P0: Missing Jira Configure Panel Features
Jira's gadget configure panel (Image 4 from Vikram) has these that Catalyst LACKS:
1. **Saved Filter dropdown** — select from saved JQL filters
2. **"Advanced Search" link** — opens JQL editor
3. **"Number of results" input** — configurable limit per gadget (max 50)
4. **"Columns to display" section** — drag-to-reorder column list with:
   - 6-dot drag handle per column
   - Column name
   - **Trash icon (🗑) to delete columns**
   - "Drag-drop to reorder the fields." helper text
5. **"Add columns to display" dropdown** — select from available fields to add
6. **"Auto refresh" checkbox** — "Update every 15 minutes"
7. **Save / Cancel buttons** at bottom

Catalyst's GadgetSettingsPanel has date/status/assignee/priority filters but NONE of the column management. This is a fundamental feature gap.

### P0: Missing Pagination
- Jira shows "1-6 of 6" pagination footer with clickable total
- Catalyst has no pagination at all — shows all rows in infinite scroll

### P0: Jira Dashboard Sub-Features NOT Researched
Vikram says: "run a very very deep research of atlaskit dashboard functionality and then jira-compare to identify 200+ sub features"

Needed research areas:
1. Jira dashboard column add/delete/reorder (the configure panel)
2. Jira dashboard saved filter integration
3. Jira dashboard gadget types (how many exist, which are relevant)
4. Jira dashboard column picker across all gadget types
5. Jira dashboard sort interaction (per-column sort arrows)
6. Jira dashboard row click → detail view behavior
7. Jira dashboard "Maximize" gadget behavior (full-page vs overlay)
8. Jira dashboard "Minimize" gadget behavior (collapse vs hide)
9. Jira dashboard gadget refresh per-gadget vs global
10. Jira dashboard column resize (drag column borders)
11. Jira dashboard row hover state
12. Jira dashboard link sharing per-gadget
13. Jira dashboard delete gadget flow (confirmation?)
14. Jira dashboard move gadget between columns
15. Jira dashboard keyboard accessibility (Tab order, arrow keys)

### Files to read for session 3:
- `src/components/project-hub/dashboard/GadgetSettingsPanel.tsx` (45K — needs column management)
- `src/components/project-hub/dashboard/WidgetWrapper.tsx` (19K — edit mode broken)
- `src/components/project-hub/dashboard/WidgetGalleryModal.tsx` (8.6K — was drawer, now sidebar)
- `src/components/project-hub/dashboard/DashboardWidgetGrid.tsx` (16K — DnD, grid)
- `src/pages/project-hub/ProjectDashboardPage.tsx` — page container, edit mode
- `src/components/project-hub/dashboard/widget-registry.ts` — widget definitions

### Vikram's exact words:
> "it is so important to run a very very deep research of atlaskit dashboard functionality and then /jira-compare to identify 200+ sub features to execute under guardrails of atlaskit"
> "for filters catalyst will use existing filter functionality"
> "the columns are important to add delete"
