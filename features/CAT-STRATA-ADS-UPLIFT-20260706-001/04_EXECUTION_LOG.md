# Execution log — CAT-STRATA-ADS-UPLIFT-20260706-001

## Slice 1 — systemic fixes (2026-07-06)

1. **shared.tsx / StrataPageShell** — removed the `-24px` horizontal negative
   margin that overhung the HubSurface `overflow: clip` wrapper (root cause of
   the "TRATA" breadcrumb clip on all 14 pages, DOM-probed); header now aligns
   to the content grid via `paddingX={0}`; kept a `-12px` top pull only.
   Added scoped `.strata-page-shell .jira-table-grid { overflow-x: auto }`
   safety net and `overflowX: auto` on noPadding StrataPanel bodies.
2. **StrataCommandCenterPage** — new `ATTENTION_TYPE_LABEL` short-label map for
   needs-attention lozenges (raw rule keys labelized into strings too long for
   the 16-unit column, e.g. "PENDING BENEFIT VALIDATION" → "BENEFIT VALIDATION");
   unknown keys still fall back to labelize (zero-assumption).
3. **StrataKpiLibraryPage** — KPI name column: flex → fixed 32 units (JiraTable
   reserves a hard 640px floor for flex columns, forcing h-scroll and chopping
   trailing columns); rebalanced fixed columns 88→75 units; direction labels
   shortened ("Higher is better" → "Higher", arrow carries semantics); data
   source cell gains ellipsis; table now fits: scrollWidth == clientWidth.
4. **StrataPortfolioVmoPage** — value-profile kind columns 19→16 units with
   flex-wrap in the pending cell (value / PENDING / Validate no longer clip);
   register category/lifecycle/realization 14/14/14 → 12/12/13.
5. **StrataKpiDetailPage / StrataScorecardDetailPage** — pass `title={entity.name}`
   (H2 was falling back to route word: "KPI library" / "Scorecards"); trail now
   ends at the parent index crumb.
6. **StrataStrategyMapPage** — removed `<MiniMap />` (rendered as a blank white
   panel overlapping the rightmost node card with custom node types) + its CSS.

All verified live via Chrome MCP after HMR + full navigations; evidence in
06_VALIDATION_EVIDENCE.md.

## Slice 2 — app-wide sweep (2026-07-06, scope expansion D5)

Crawled: Home/For-you, Projects list, BAU Backlog/Board/Dashboard/Timeline/
Sprints, Products list, INV Backlog, Incident Hub, Release Hub, Test Hub,
Tasks Dashboard, Ideation Backlog, Programs, Issue Navigator, Admin Access,
Docs, global Create modal. Verdicts + fixes:

7. **src/lib/atlaskit-icons.tsx** — mkCore/mkGlyph forwarded className/style to
   @atlaskit/icon components, which silently DROP them (not in the Ak API).
   81 call sites position icons with `className="absolute left-3 top-1/2…"` —
   every such search field rendered its magnifier floating above the input
   (Programs, Ideation, Issue Navigator, filter bars, pickers, modals). Fixed
   by carrying className/style on a wrapper span only when provided (zero DOM
   change otherwise). Verified: Programs, Ideation, Issue Navigator repaired;
   BAU Backlog pixel-identical (no regression).
8. **TasksPageHeader** — stacked "Tasks /Dashboard" + duplicate H1 replaced
   with the hub-standard inline crumb + 22px H2 (matches ProjectPageHeader).
9. **AdminAccessPage** — Status column 128→148px ("PENDING SETUP" lozenge
   clipped to "PENDING SET…" on every pending row); Email 220→200.
10. **sprints/cells.tsx** — Sprint name column flex→fixed 30 units (640px flex
    floor pushed Release/Owner past the viewport); Owner 4→5 units ("O…"
    header). Verified: full "BAU - Sprint 4.1" + "Owner" header visible.

Compliant as-is (no change): Home, Projects, Backlog, Board, Dashboard,
Timeline, Products, Product Backlog, Incident Hub, Release Hub, Test Hub,
Issue Navigator table, global Create modal, Access page structure.
