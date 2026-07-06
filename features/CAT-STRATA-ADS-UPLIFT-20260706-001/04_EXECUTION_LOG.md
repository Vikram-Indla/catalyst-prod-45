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

## Slice 3 — remaining findings closed (2026-07-06)

11. **ProgramDirectory.tsx** — page chrome converted from shadcn/Tailwind to
    ADS: hub-standard 22px header, ads Textfield with inline search icon,
    ads Button view toggle, ads EmptyState/SectionMessage/Spinner. Card
    grid/list internals retained (0 programs in DB — unverifiable live;
    covered by ratchet).
12. **IdeasBacklogPage** — null ChromeHeader injected into the backlog data
    source: removes the redundant "IDEAS / IDEAS" crumb row (page renders its
    own header). Verified live.
13. **ProjectPageHeader** — no dangling "/" separator when the derived route
    word is empty (Products/Projects index pages). Verified live.
14. **StrataAdminConfigPage** — 11-tab strip scrolls horizontally on narrow
    viewports instead of overflowing.
15. **StrataExecutionPage** — linked-element tags (Atlaskit Tag truncates at
    ~180px by design) wrapped in Tooltip so full names stay reachable.
16. **Dark mode pass** — Command Center + KPI Library verified in dark theme
    (ss_8186484dm, ss_1473mv2xe): tokens flip cleanly, lozenges/band bars
    legible, no bare-color slabs. Light mode restored after.
17. **D6 corrected** — /docs is not a Catalyst route at all (no route entry);
    the "blank Docs page" finding was a wrong-URL artifact, withdrawn.

Slice 3 after IDs: Programs ss_7134bxqu2 · Ideation ss_1919jiprp · Products
ss_6783ovtdo · Admin ss_2422xlwc8 · Execution ss_6186pzw4v.
Gates: tsc 183 = baseline · lint:colors:gate 0 = baseline.

## Slice 4 — exhaustive deep-screen sweep (2026-07-06)

Crawled 20+ additional deep screens: Incident (All/Board/Analytics/Reports/
Committee queue), Release (Changes/SOP/Sign-off/Freeze/Production events),
Test Hub (Repository/Plans/Cycles/Defects/Traceability/Reports), Tasks Board,
Ideation (Board/Analytics), Product (Roadmap/Timeline/Milestones), work-item
detail /browse/BAU-15, Starred, admin deep links.

18. **ProductionEventsPage** — hand-rolled ResultBadge (banned inventory)
    rendered mixed sentence-case/uppercase pills depending on DB casing;
    replaced with canonical @atlaskit/lozenge + severity mapping. Verified:
    uniform PARTIAL/ROLLBACK/IN PROGRESS/SUCCESS column (ss_0510eohrv).
19. **Ideation numerals** — hero KPIs used legacy --cp-font-mono (slashed
    terminal zeros unlike every other hub); now ADS heading font +
    tabular-nums (IdeasAnalyticsPage StatCard, IdeasBacklogPage quarter
    counts). Verified ss_9570l7xbf.
20. **FullAppRoutes /admin catch-all** — unmatched /admin/* deep links (e.g.
    /admin/statuses; nav's "Statuses" actually targets /admin/workflows)
    rendered a silent blank Outlet; now a proper 404 (ss_4727k6ahl). Same
    hardening as STRATA CAT-0016.

Audited compliant (no change): Incident board/analytics/reports/committee,
Changes, SOP templates, Sign-off queue, Freeze windows, Test repository/
plans/cycles/defects/traceability/reports, Tasks board, Ideas board,
Product roadmap/timeline/milestones, /browse work-item detail, Starred.

Findings logged (not stylistic/out of scope): incident-analytics
"[Chart] Resolution Trend" placeholder widget (unbuilt feature); work-item
detail dependency-row lozenge can clip at panel edge (P2); testhub/
incident-hub unmatched child routes still blank (needs per-hub catch-alls,
route-config work — admin done as the template).

## Slice 5 — residuals closed (2026-07-06)

21. **FullAppRoutes global catch-all 404** — every stale deep link app-wide
    (/docs, /testhub/test-plans, /incident-hub/incidents, …) rendered a
    silent blank content area; now the NotFound page (ss_1543jxxve). Closes
    the per-hub blank-route finding for ALL hubs, not just /admin.
22. **IncidentAnalyticsPage** — removed the literal "[Chart] Resolution Trend
    over time" placeholder box (advertised an unbuilt widget; zero-assumption:
    render nothing until the chart exists). Verified ss_63421oiq2.
23. **LinkTypeGroup (work-item detail)** — status column 15→20 units; the
    longest workflow lozenge ("READY FOR DEVELOPMENT") was clipped by its
    overflow-hidden cell. DOM-probed after: td 175px ≥ pill 152px
    (ss_1607tad9h).
24. **ProgramDirectory card grid/list internals** — all remaining Tailwind
    color utilities (text-foreground/text-muted-foreground/border-border/
    fill-amber-400) → ADS tokens (--ds-text/-subtle/-subtlest/--ds-border/
    --ds-icon-accent-yellow). grep: 0 banned utilities left in the file.
    (Grid branch unreachable with 0 programs in DB — conversion is
    mechanical color-token substitution, gated by tsc + color gates.)

Gates: tsc 183 = baseline · lint:colors:gate 0 = baseline.
No open findings remain in this feature.
