# Evidence — Package/Ecosystem Probe (VERIFIED 2026-07-04)

## Headline
Every candidate package ALREADY INSTALLED with live token-compliant usage. **Install-now list: EMPTY.**

## Verdicts
- **Charts**: recharts 3.5.1 + existing TestHub ADS wrapper `src/components/testhub/reports/charts/ReportChart.tsx` themed via `src/lib/charts/adsChartTheme.ts` (var(--ds-chart-categorical-1..8) + semantic tokens; dark mode via cascade). Rule: import ReportChart only, raw recharts = review flag.
- **DnD**: @atlaskit/pragmatic-drag-and-drop 1.7.5 full suite (auto-scroll, hitbox, react-drop-indicator) — 17 files (PragmaticBoard, BacklogTable, Timeline). 3 dnd generations coexist (@hello-pangea 30 files oldest, @dnd-kit 23 files deprecating). New TestHub code: pragmatic ONLY.
- **Virtualization**: @tanstack/react-virtual 3.13.13 already inside JiraTable.tsx (+ AllWorkTable, BacklogTable, incidents VirtualizedCardList). Virtualized folder tree = useVirtualizer flattened-tree pattern. react-window DEAD (0 imports) — do not resurrect.
- **Graph**: @xyflow/react 12.10.2 live in `src/components/shared/dependencies/DependenciesDiagram.tsx`/`DependenciesView.tsx`; `TestHubDependenciesPage.tsx` already mounts it. Traceability/coverage graph = EXTEND DependenciesView, ship JiraTable list fallback for a11y. Workflow Studio = 2nd reference for custom nodes.
- **Split panes**: react-resizable-panels 2.1.9 installed, wrapper `src/components/ui/resizable.tsx` has ZERO consumers (dormant). DEFER — first consumer creates new canonical pattern → needs Vikram sign-off; token pass on handle (var(--ds-border)→--ds-border-focused) required. Prefer fixed-sidebar hub layout otherwise.

## Bundle facts
- 254 lazy() imports in FullAppRoutes.tsx — new TestHub pages must be lazy.
- vendor-atlaskit = intentional single chunk (Emotion closures break across chunks — do NOT re-split). vendor-charts isolates recharts+d3.
- Export tools all dynamic via src/lib/exportLoaders.ts. Build guard: npm run verify:sw-chunks.
- TestHub color lint exists: `npm run lint:colors:testhub`.

## Dead deps (flag, don't touch this feature)
react-window (+types), embla-carousel-react, input-otp, @popperjs/core, scrollparent, y-websocket family. html2canvas/pptxgenjs = dynamic-import loaders, NOT dead.

## Rich text
@tiptap/* v3 house editor (45 files); ADF stack present (adf-schema 52.11.4, editor-core lazy ConfluenceEditor). date-fns 263 files. @atlaskit/datetime-picker canonical date input (14 files).
