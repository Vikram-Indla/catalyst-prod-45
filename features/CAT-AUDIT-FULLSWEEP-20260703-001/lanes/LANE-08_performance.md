# LANE 8 — Performance / Bundle / Heap Audit (STATIC ONLY)

**Audit ID range:** CAT-AUDIT-0700…0799
**Date:** 2026-07-03 · **Branch:** main · **Mode:** READ-ONLY static analysis — no build, no dev server, no vite.config execution (scripts/sync-deps.js mutates package.json at config load, `vite.config.ts:23-27`).

Method notes:
- All probes are `grep`/`wc`/`ls`/`node -e require('./package.json')` — nothing executed the app or bundler.
- Sizes quoted are **source bytes** (unminified, pre-tree-shake). Real chunk weights need one supervised `npm run build` with `rollup-plugin-visualizer` — flagged per-finding as the follow-up probe.
- Positive findings (healthy, no issue raised) listed at the end before the Lane Summary.

---

## CAT-AUDIT-0701 — Unified `vendor-atlaskit` chunk ships the full editor+renderer to every user

- **Category:** Bundle / chunking
- **Severity:** Critical (largest single lever on first-load payload)
- **Surface:** every authenticated page (CatalystShell imports @atlaskit primitives → chunk loads at shell mount)
- **File Path:** `vite.config.ts:772-789` (manualChunks), `vite.config.ts:632-636` (editor lazy-load rationale), `src/components/catalyst-detail-views/shared/sections/CatalystDescriptionSection.tsx:55` (the lazy editor entry)
- **Probe method:** Read of `vite.config.ts` manualChunks fn; `grep -rn "from '@atlaskit/editor-core'" src` → 1 hit (`src/components/shared/rich-text/atlaskit/EpicDescriptionEditor.tsx:29`); traced its only mount chain: `AdfDescriptionField.tsx:18` re-export → `CatalystDescriptionSection.tsx:55` `lazy(...)`. `node -e` dep count: **52 direct `@atlaskit/*` deps**; `du -sh node_modules/@atlaskit` = **4.2 GB** installed.
- **Evidence:** `manualChunks` line 788: `if (id.includes('node_modules/@atlaskit/') || id.includes('node_modules/@emotion/')) return 'vendor-atlaskit';` — unconditional. The inline comment (lines 772-785) documents the 2026-06-08 decision: Emotion closure-scoped helpers (`isProcessableValue`, `processStyleName`) broke when `vendor-atlaskit-editor` imported `css()` from `vendor-atlaskit-ui`, so everything was fused into one ~46 MB-unminified chunk.
- **Why it matters:** The app's own editor discipline is correct — `@atlaskit/editor-core` is statically imported in exactly one file, and that file is only reachable via `React.lazy`. But manualChunks **nullifies the lazy split**: editor-core, `@atlaskit/renderer`, and the whole ADF pipeline are assigned to the same chunk as `@atlaskit/button`/`@atlaskit/icon` that CatalystShell needs at mount. Every user pays the editor download+parse cost on first shell paint, editor opened or not. Prosemirror rides along ("prosemirror is bundled here as an Atlaskit dependency", line 787).
- **Split options vs the Emotion constraint (assessment):**
  1. **Editor-family split, Emotion left unassigned** (recommended first experiment): keep `vendor-atlaskit` for UI packages, add a *preceding* branch routing `@atlaskit/editor-*`, `@atlaskit/renderer`, `@atlaskit/adf-*`, `@atlaskit/media-*`, `prosemirror-*` to `vendor-atlaskit-editor`, and **remove `@emotion/` from manualChunks entirely** so Rollup co-locates/duplicates Emotion per consumer chunk. The documented breakage came from Emotion being pinned into one chunk that the other imported; letting Rollup duplicate the tiny Emotion runtime (~50 KB) into both chunks avoids the cross-chunk closure path at the cost of double-shipping Emotion only to editor users.
  2. **Two chunks, Emotion duplicated explicitly**: function-form manualChunks returning `vendor-atlaskit-editor` for Emotion modules whose importer graph is editor-only — not expressible reliably in manualChunks(id); skip.
  3. **Do nothing** — accepted today; the chunk is cached after first hit, but first-visit and every-deploy (`buster` bump) users re-pay.
- **Expected impact:** editor+renderer+ADF+media is plausibly 40-60 % of the atlaskit chunk → first-load JS for non-editing sessions cut by several MB minified. Must be measured, not assumed.
- **Fix complexity:** Medium (config-only diff) — but validation is the real cost.
- **Regression risk:** **High** — the Emotion-closure failure mode is documented in-repo and was hit in production debugging (2026-06-08). Any split MUST be verified with a full build + live smoke of an Atlaskit-heavy surface AND the editor surface, light+dark mode.
- **Validation required:** supervised `npm run build` (accepting sync-deps side effect) + `rollup-plugin-visualizer` before/after; open `/browse/:key` and edit a description (editor path); check zero `css is not a function` / undefined-helper console errors.
- **Suggested PR:** PR1 — `perf(bundle): split vendor-atlaskit editor family behind measured guardrails`

## CAT-AUDIT-0702 — React Query `gcTime` (5 min) < `staleTime` (15 min): inversion silently defeats both the freshness window and the 30-day persistence

- **Category:** Runtime / cache correctness-performance
- **Severity:** High
- **Surface:** every query in the app (defaultOptions)
- **File Path:** `src/App.tsx:76-85` (client), `src/App.tsx:153-175` (persistOptions `maxAge: THIRTY_DAYS_MS`)
- **Probe method:** Read of `src/App.tsx`; comment archaeology lines 60-74.
- **Evidence:** `staleTime: 15 * 60 * 1000`, `gcTime: FIVE_MIN_MS`. Comment says gcTime was cut from 30 days to 5 min to stop localStorage bloat.
- **Eviction consequence (the inversion):** gcTime runs from the moment a query has **zero observers**. Any surface the user navigates away from for >5 min has its cache entry destroyed while still inside its 15-min freshness window. On return: hard cache miss → loading state + network refetch — exactly what `staleTime: 15min` was meant to prevent. Practical freshness window is therefore `min(staleTime, gcTime) = 5 min` for any unmounted surface. Second-order: the persister dehydrates the *current* cache on each write, so GC'd entries are also **removed from localStorage** within ~1 s of eviction — making `maxAge: THIRTY_DAYS_MS` (App.tsx:157) effectively "5 minutes after last unmount" for everything except queries alive at reload time. The 30-day persistence promise only survives for queries observed at the moment of the last persist.
- **Expected impact:** eliminating gratuitous refetch+spinner on back-navigation within 5-15 min; fewer Supabase round-trips.
- **Recommended fix:** `gcTime >= staleTime` (e.g. both 15 min, or gcTime 30 min). localStorage bloat is already independently controlled by `shouldDehydrateQuery` + `buster`; if bloat returns, exclude heavy keys from dehydration rather than shrinking gcTime.
- **Fix complexity:** Trivial (one constant).
- **Regression risk:** Low — memory ceiling rises slightly (entries live 15-30 min instead of 5); localStorage growth needs a one-session observation.
- **Validation required:** navigate A→B, wait 6 min, return to A: no spinner, no network call (DevTools).
- **Suggested PR:** PR2 — `perf(query): align gcTime with staleTime, stop premature cache eviction`

## CAT-AUDIT-0703 — Persister serializes the ENTIRE query cache synchronously on the main thread up to once per second

- **Category:** Runtime / main-thread jank
- **Severity:** Medium-High
- **Surface:** global — worst during fetch bursts (dashboard mount, chat dock open — the in-code comment at App.tsx:160-162 records a real "localStorage serialization spike")
- **File Path:** `src/App.tsx:110-116` (`createSyncStoragePersister`, `throttleTime: 1000`, custom `serialize`), `src/App.tsx:95-108` (rqReplacer/rqReviver walk every value)
- **Probe method:** Read of App.tsx; library behavior known: sync-storage-persister dehydrates the full client and `JSON.stringify`s it on every cache event, throttled to 1/s, synchronously (localStorage is sync).
- **Evidence:** `serialize: (data) => JSON.stringify(data, rqReplacer)` — the replacer is invoked for **every key of every cached query result** on **every persist**, not just changed queries. With multi-MB caches (multi-project sessions were the documented bloat cause, App.tsx:63) each write is a multi-ms→tens-of-ms main-thread stall repeating every second while any query settles.
- **Expected impact:** removing periodic long-task jank during data-heavy navigation; INP improvement.
- **Recommended fix (options, in order of cheapness):** (a) raise `throttleTime` to 5000-10000 ms — persistence is a reload-hydration optimization, 1 s granularity buys nothing; (b) move to `experimental_createPersister` (per-query persistence, only changed queries written) or an async IDB persister off the sync path; (c) tighten `shouldDehydrateQuery` allowlist to hydration-critical keys.
- **Fix complexity:** Trivial for (a); Medium for (b).
- **Regression risk:** Low for (a) — worst case a reload loses ≤10 s of freshly fetched cache and simply refetches.
- **Validation required:** Performance panel trace during dashboard load: `catalyst-rq-cache` write long-tasks shrink in frequency.
- **Suggested PR:** PR2 (same PR as 0702 — both are App.tsx query-cache tuning)

## CAT-AUDIT-0704 — Row virtualization is implemented in all four canonical tables but **enabled by zero call sites**

- **Category:** Runtime / rendering at scale
- **Severity:** High
- **Surface:** every JiraTable/BacklogTable/AllWorkTable/WorkItemsTable consumer (backlog, all-work, sprints, admin lists)
- **File Path:** `src/components/shared/JiraTable/JiraTable.tsx:163` (`enableVirtualization = false`), `src/components/shared/BacklogTable/BacklogTable.tsx:199`, `src/components/workhub/allwork/AllWorkTable.tsx:117` — all default `false`.
- **Probe method:** `grep -rn "enableVirtualization={" src --include="*.tsx"` → **0 production call sites** (only defaults in the table implementations and a Storybook registry string). `grep -rln "@tanstack/react-virtual" src` → 13 files have the machinery.
- **Evidence:** `useVirtualizer` is called unconditionally (JiraTable.tsx:1832, BacklogTable.tsx:2287) and the virtual body path exists (JiraTable.tsx:2384 `vItems.map`), but the prop is never passed `true` anywhere, so every table renders its full row set to the DOM. vite.config.ts:612-617 even documents the 2026-04-26 adoption ("opt-in row virtualization") — the opt-in never happened.
- **Expected impact:** on 500-row backlogs: initial render and re-render cost drop from O(rows) DOM to O(viewport); directly compounds with 0705.
- **Recommended fix:** enable per-surface starting with the largest datasets (project backlog `BacklogPage.atlaskit.tsx`, AllWork), gated by row count (e.g. `enableVirtualization={rows.length > 100}`).
- **Fix complexity:** Low per surface (prop flip) — but each surface needs scroll/sticky-header/group-header/DnD verification because the virtual path is untested in production.
- **Regression risk:** Medium — grouped rows, sticky group headers (per-group `<tbody>` trick, JiraTable.tsx:1840-1844) and drag-and-drop interact with virtualization; verify per surface.
- **Validation required:** DOM probe: row `<tr>` count ≈ viewport rows; scroll to bottom lands on last item; group headers still replace on scroll; DnD reorder still fires.
- **Suggested PR:** PR3 — `perf(tables): enable row virtualization on backlog + all-work above 100 rows`

## CAT-AUDIT-0705 — JiraTable/BacklogTable rows are unmemoized inline closures; every hover/drag/sort state change re-renders all rows

- **Category:** Runtime / re-render blast radius
- **Severity:** Medium-High
- **Surface:** all JiraTable/BacklogTable surfaces
- **File Path:** `src/components/shared/JiraTable/JiraTable.tsx:1845` (`renderBodyRow` plain closure), `:1855-1860` (per-cell `colWidthEntries.find` inside the row map), `:1999-2060` (header map with per-render inline `onClick`/`onDragStart` closures and inline `style` objects at `:1993-1996`), `src/components/shared/BacklogTable/BacklogTable.tsx` (0 `React.memo` matches in 196 KB)
- **Probe method:** `grep -n "React.memo\|= memo(" src/components/shared/JiraTable/JiraTable.tsx` → 0; same for BacklogTable.tsx, `src/features/kanban-board/components/Board.tsx`, `Column.tsx` (0 each; Column.tsx uses `forwardRef` only, line 122). Counter-example proving the pattern is known in-repo: `src/components/kanban/PragmaticBoard.tsx` → 4 memo hits.
- **Evidence:** `renderBodyRow` is re-created every render and rows are emitted inline, so component-level bailout is impossible. Interaction state that changes at pointer frequency — `hoveredResizeColId`, `dragOverId`, `resizing` — is read inside the row/cell map (JiraTable.tsx:1856-1858), so a resize-handle hover re-renders **every row × every cell**, each cell doing a linear `colWidthEntries.find` (O(rows × cells × cols) per pointer event).
- **Expected impact:** with virtualization off (0704) this is the dominant interaction-latency cost on large tables; fixing either helps, fixing both compounds.
- **Recommended fix:** extract `<JiraTableBodyRow>` wrapped in `React.memo` keyed on row data + the specific col-state slices it needs; precompute a `Map<colId, meta>` once per render instead of `.find` per cell; move drag/hover visual state to CSS attributes on the container where feasible.
- **Fix complexity:** Medium (surgical extraction inside a 149 KB canonical component).
- **Regression risk:** Medium — JiraTable is the canonical table for the whole app; memo equality bugs would show as stale cells. Needs the existing table Storybook + DOM probes.
- **Validation required:** React Profiler (dev) on backlog: hover resize handle → only header commits; sort → rows commit once.
- **Suggested PR:** PR4 — `perf(jiratable): memoized body row + O(1) column meta lookup`

## CAT-AUDIT-0706 — Monolith source files: `BacklogPage.atlaskit.tsx` 416 KB, `BacklogTable.tsx` 197 KB, `JiraTable.tsx` 150 KB

- **Category:** Bundle / parse-compile cost + maintainability drag on every perf fix above
- **Severity:** Medium
- **File Path (top of `find src -name "*.tsx" -size +50k`, 20 largest):** `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` **416,066 B**; `src/components/shared/BacklogTable/BacklogTable.tsx` 196,833; `src/components/shared/JiraTable/JiraTable.tsx` 149,922; `src/components/for-you/atlaskit/RecommendedPanel.tsx` 137,516; `src/components/shared/Timeline/TimelineView.tsx` 132,327; `src/components/filters/CanonicalFilter.tsx` 126,002; `src/pages/admin/AdminAccessPage.tsx` 104,982; `DemandFulfilmentGadget.tsx` 91,381; `TasksTaskListView.tsx` 90,985; `AllReleasesPage.tsx` 90,720; `FullAppRoutes.tsx` 87,185; `SidebarRow.tsx` 86,705; `CleanupPage.tsx` 86,633; `VercelConnectionPage.tsx` 84,171; `JiraTable/editors.tsx` 78,041; `ComponentsAdminPage.tsx` 76,007; `CreateStoryModal.tsx` 70,595; `EditableFields.tsx` 69,228; `JiraSyncPage.tsx` 64,804; `DependenciesDiagram.tsx` 63,199.
- **Probe method:** `find src -name "*.tsx" -size +50k | xargs ls -la | sort -k5 -rn`.
- **Why it matters:** a 416 KB single module is one lazy chunk — the backlog route downloads and parses it as a unit; RecommendedPanel (137 KB) sits on the default `/` For-You route. Every 0704/0705 fix lands inside these files; their size is itself a perf-work risk multiplier.
- **Recommended fix:** no big-bang refactor — extract along existing seams when touched (BacklogPage: dialogs/panels already lazy-loadable). Not a standalone PR; fold into PR3/PR4 touches.
- **Fix complexity:** Medium-High spread over time. **Regression risk:** Medium.
- **Suggested PR:** ride-along in PR3/PR4 (no dedicated PR)

## CAT-AUDIT-0707 — Two of 13 stacked providers recreate their context value every render (LanguageContext, UWVContext)

- **Category:** Runtime / context churn
- **Severity:** Low-Medium
- **Surface:** app root
- **File Path:** `src/contexts/LanguageContext.tsx:46` — `value={{ displayLang, setDisplayLang }}` inline, no `useMemo` (file imports only `createContext, useContext, useState`); `src/components/universal-work-view/UWVContext.tsx:70` — `value={{ openUWV, closeUWV }}` inline (callbacks are stable `useCallback`s but the wrapper object is new each render, so every `useUWV` consumer re-renders on each UWV open/close).
- **Probe method:** per-provider grep of `value=|useMemo|createContext` across all providers mounted in `src/App.tsx:177-301`.
- **Audited clean (memoized):** ThemeProvider (`:133 useMemo`), NavigationContext (`:101`), ProcessStepsContext (`:118`), FeatureFlagContext (`:168`), HierarchyConfigContext (`:135`), auth.tsx (`:334`). AdsThemeProvider is effect-only (no context value). Full stack for the record: ErrorBoundary → PersistQueryClientProvider → ThemeProvider → AdsThemeProvider → IntlProvider → UWVProvider → AuthProvider → HierarchyConfigProvider → LanguageProvider → FeatureFlagProvider → NavigationProvider → ProcessStepsProvider → BrowserRouter (+ VoiceFlowProvider inside).
- **Impact assessment (honest):** both providers re-render only on their own state changes, and `children` referential stability limits the blast to context *consumers*. Real but small; fix because it's two-line-cheap.
- **Recommended fix:** wrap both values in `useMemo`.
- **Fix complexity:** Trivial. **Regression risk:** None meaningful.
- **Suggested PR:** PR5 — `perf(providers): memoize LanguageContext + UWVContext values`

## CAT-AUDIT-0708 — Global CSS payload: `index.css` 277 KB / 7,787 lines (+11 @imports), 93 CSS files totalling 2.3 MB in src, 403 `!important` in index.css alone

- **Category:** Bundle / CSS
- **Severity:** Medium
- **Surface:** every route — index.css and its @import chain are global
- **File Path:** `src/index.css` (277.4 KB, 7,787 lines); `src/index.css:8-18` imports 11 module stylesheets (`capacity-module.css` 27 KB, `budget-module.css` 39 KB, `allwork.css` 54 KB, etc. — `du -ch src/styles/*.css` = 876 KB); `find src -name '*.css'` → 93 files, 2.3 MB total.
- **Probe method:** `wc -l`, `ls -la`, `du -ch`, `awk 'length>500'` (→ no base64/data-URI blobs — it is genuinely 7.8 K lines of rules), `grep -c '!important' src/index.css` → 403.
- **Why (structure sampled):** accretion layers visible in section headers — V8 module CSS imports, V12 dark-mode tokens, per-feature keyframes (wiki-pulse, ra-stage-pulse, dashboard-refresh-pulse), dated Jira-parity patches ("2026-06-09 Spec parity (Filter Results gadget v1) — TD/TH layout", DynamicTable padding fixes), StatusBadge guardrail block — all global regardless of route. Tailwind directives at :55-57 mean the utilities layer also lands here.
- **Expected impact:** module CSS (capacity/budget/allwork/task10 ≈ 150 KB+ source) charged to every page including login; CSSOM parse on first paint; 403 `!important` compounds specificity wars (see Lane 2/4 for token findings — this entry is size/scope only).
- **Recommended fix:** move the 11 module @imports out of index.css into their module entry components (Vite code-splits CSS with the importing JS chunk); no visual change expected since rules are feature-scoped selectors.
- **Fix complexity:** Low-Medium (mechanical, but load-order/specificity must be checked per module). **Regression risk:** Medium — cascade order changes when a stylesheet moves from global to chunk-scoped; needs per-module screenshot pass, light+dark.
- **Suggested PR:** PR6 — `perf(css): co-locate module stylesheets with their route chunks`

## CAT-AUDIT-0709 — Duplicate-capability dependencies: two full rich-text editor stacks, two spreadsheet libraries

- **Category:** Bundle / dependency strategy
- **Severity:** Medium
- **File Path:** `package.json` (156 deps): **18 `@tiptap/*`** packages (statically imported by the detail-view Description surface — `src/components/catalyst-detail-views/shared/sections/Description/Description.tsx` + toolbar buttons, ~10 files) **and** the Atlaskit editor family (`@atlaskit/editor-core`, `editor-common`, `editor-plugins`, `editor-toolbar` + 52 `@atlaskit/*` total). Spreadsheets: **both `exceljs` and `xlsx`** (each dynamic-imported via `src/lib/exportLoaders.ts:7-8`, split chunks `vendor-export-exceljs`/`vendor-export-xlsx` — vite.config.ts:807-808).
- **Probe method:** `node -e` over package.json; `grep -rln "@tiptap/react" src`; `grep -rln "exceljs" src` → 1 file (exportLoaders).
- **Why it matters:** two ProseMirror-based editors are maintained in parallel — the repo carries 5 vite plugins + 10 aliases + 30 dedupe entries (vite.config.ts:100-220, 477-538) purely to stop them fighting over the ProseMirror registry. Tiptap co-locates with the detail-view chunk (fine), but its 18-package tree plus the Atlaskit editor inside vendor-atlaskit means editing capability is shipped twice. exceljs+xlsx is lower stakes (both lazy) but doubles maintenance/audit surface for one capability.
- **Note (accepted stack, no issue raised):** recharts (31 files) + framer-motion (33 files) + d3-via-recharts is a deliberate, documented choice (see memory: "reuse existing timeline stack"); `vendor-charts`/`vendor-motion` chunking is correct. `d3` is not a direct dependency — the `node_modules/d3` manualChunks branch (vite.config.ts:768) matches transitive `d3-*` only if paths contain `node_modules/d3` (they do: `node_modules/d3-shape` etc. match the substring).
- **Recommended fix:** direction decision (Vikram-level): converge description editing on one stack — Atlaskit editor is the canonical direction per CLAUDE.md; schedule Tiptap Description retirement. exceljs-vs-xlsx: pick one after checking which formats each export path needs.
- **Fix complexity:** High (migration). **Regression risk:** High if rushed — decision doc first, not code.
- **Suggested PR:** PR7 (decision/spike) — `chore(deps): editor-stack convergence decision + exceljs/xlsx consolidation`

## CAT-AUDIT-0710 — Export libraries: dynamic-import discipline holds, with two stragglers (static `xlsx` in UWVExport; dead `widget-pdf.ts` with static jspdf+html2canvas)

- **Category:** Bundle / lazy-load discipline
- **Severity:** Low-Medium
- **File Path & probe:** `grep -rn "from '(exceljs|xlsx|jspdf|pptxgenjs|html2canvas)'" src` vs `import(...)`:
  - **Dynamic (correct, 15 sites):** `src/lib/exportLoaders.ts:6-10` (jspdf, xlsx, exceljs, autotable), `src/utils/exports/exportToPdf.ts:6,119`, `src/components/producthub/listing/ExportDropdown.tsx:59`, `src/components/skills-inventory/SkillsInventoryReport.tsx:4`, `src/lib/reportExportUtils.ts:4`, `src/lib/capacity-heatmap/export.ts:6`, `src/modules/capacity-planner/lib/pdf-export.ts:4`, `src/modules/tasks/utils/plannerExport.ts:9`, `src/modules/okr-v2/lib/exportAnalyticsReportToPDF.ts:6`, `src/services/ideasRoadmapPptx.ts:1` (pptxgenjs).
  - **Static #1:** `src/components/universal-work-view/UWVExport.tsx:7` — `import * as XLSX from 'xlsx'` — imported statically by `UWVToolbar.tsx:22` → `UniversalWorkView`. Mitigation already present: UniversalWorkView itself is `React.lazy` (`UWVContext.tsx:14-15`), so cost = the full `vendor-export-xlsx` chunk downloads whenever the work-view drawer **opens**, not when the user exports. Fix: switch to `await import('xlsx')` inside the export handler (pattern already exists in `ExportDropdown.tsx:59`).
  - **Static #2 (dead):** `src/lib/widget-pdf.ts:15-16` — static `jspdf` + `html2canvas`; `grep -rn "downloadWidgetAsPdf" src` → zero importers. Tree-shaken today (no bundle cost) but a static-import landmine: first future importer eagerly drags jspdf+html2canvas into its chunk. Cross-ref Lane 9 (dead code): delete or convert to dynamic loaders.
- **Fix complexity:** Trivial (both). **Regression risk:** None (UWV export is user-triggered; add a loading affordance).
- **Suggested PR:** PR8 — `perf(exports): dynamic-import xlsx in UWVExport; retire/fix widget-pdf static imports`

## CAT-AUDIT-0711 — `react-window` is a dependency + `optimizeDeps.include` entry with zero source consumers

- **Category:** Dependency hygiene with dev-perf edge
- **Severity:** Low
- **File Path:** `package.json` (react-window in deps — pre-bundled per `vite.config.ts:611`), `grep -rln "react-window" src` → **0 files** (all virtualization is `@tanstack/react-virtual`, 13 files).
- **Impact:** no production-bundle cost (tree-shaken/never imported); wasted esbuild pre-bundle work on every dev cold start + one more package in audit surface.
- **Recommended fix:** remove from package.json and vite.config `optimizeDeps.include`. ⚠ package.json edits interact with `scripts/sync-deps.js` fingerprinting — land as a normal committed change, not a hand-edit during a running dev session.
- **Fix complexity:** Trivial. **Regression risk:** None found. Cross-ref Lane 9.
- **Suggested PR:** PR8 (ride-along)

---

## Healthy findings (no issue raised — recorded so future audits don't re-litigate)

1. **Route-level code splitting is excellent.** `src/routes/FullAppRoutes.tsx`: **240 `const X = lazy(...)` page imports** (262 lazy() occurrences total incl. inline), and only **9 eager imports** — all lightweight infra (react/react-router, featureFlags, FeatureComingSoon, ModuleGate, ModuleGuard, ProtectedRoute, ErrorBoundary, RouteRoleGuard). **Zero eager heavy pages.** App.tsx keeps only login/shell/redirect surfaces semi-eager, all via lazy.
2. **Editor lazy discipline at the app layer is correct** — single static `@atlaskit/editor-core` import site behind one `React.lazy` boundary (defeated only by manualChunks, see 0701).
3. **Export-lib splitting in manualChunks (vite.config.ts:800-815) is well designed** — per-tool chunks with an accurate rationale comment.
4. **PragmaticBoard** (`src/components/kanban/PragmaticBoard.tsx`) uses React.memo (4 sites); **incidents kanban** has `VirtualizedCardList`; **features/kanban-board Column** virtualizes via `useVirtualizer` (Column.tsx:140,189). The board stack is in better shape than the table stack.
5. `shouldDehydrateQuery` exclusions + Map/Set-aware persister serializer (App.tsx:87-116) are sound engineering; only the throttle/full-dehydrate cost (0703) is at issue.

**Observation for Lane 9 (not a perf issue):** duplicate macOS-copy-suffix files exist and some are risky twins of live modules — `src/theme/ads/AdsThemeProvider 3.tsx`, `tokens 3.ts`, `index 3.ts`, `src/components/project-hub/dashboard/widget-types 2.ts`, `TeamMemberHoverCard 2.tsx`, `src/lib/jira-changelog-mapper/mapper 2.ts` (+test). Space-in-filename means they're never imported, but they confuse grep-driven work (this audit initially resolved "AdsThemeProvider" to the ` 3` copy).

---

## Lane Summary

| ID | Finding | Severity | Fix cost | Risk | PR |
|---|---|---|---|---|---|
| 0701 | vendor-atlaskit fuses editor+UI: every user downloads the full editor | Critical | M | High | PR1 |
| 0702 | gcTime 5m < staleTime 15m — cache evicted while fresh; 30-day persistence effectively voided | High | Trivial | Low | PR2 |
| 0703 | Full-cache sync JSON.stringify to localStorage up to 1×/s | Med-High | Trivial | Low | PR2 |
| 0704 | Virtualization built into 4 tables, enabled by 0 call sites | High | Low/surface | Med | PR3 |
| 0705 | JiraTable/BacklogTable rows unmemoized; pointer-state re-renders all rows×cells | Med-High | M | Med | PR4 |
| 0706 | Monoliths: BacklogPage 416 KB, BacklogTable 197 KB, JiraTable 150 KB | Med | M-H | Med | w/ PR3-4 |
| 0707 | LanguageContext + UWVContext values unmemoized (11/13 providers clean) | Low-Med | Trivial | None | PR5 |
| 0708 | index.css 277 KB global + 11 module @imports (876 KB styles/, 93 css files 2.3 MB) | Med | Low-M | Med | PR6 |
| 0709 | Dual editor stacks (18 tiptap + atlaskit editor) & exceljs+xlsx duplication | Med | High | High | PR7 |
| 0710 | Static xlsx in UWVExport; dead widget-pdf.ts w/ static jspdf+html2canvas | Low-Med | Trivial | None | PR8 |
| 0711 | react-window: dep + optimizeDeps entry, zero consumers | Low | Trivial | None | PR8 |

**Top lever order:** 0702/0703 (one-line, immediate UX win) → 0704 (backlog/all-work virtualization) → 0705 (row memoization) → 0701 (chunk split, biggest payoff but needs a supervised build to validate against the documented Emotion-closure failure). No issue was invented: every finding cites a probed file:line; all size numbers are source-byte measurements pending one supervised build for minified truth.
