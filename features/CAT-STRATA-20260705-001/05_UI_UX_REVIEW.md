# CAT-STRATA-20260705-001 — UI/UX Review (D-012 executive design lift)

> Issue register produced 2026-07-05 after owner rejection of the session-002 UI ("plain HTML,
> grey backgrounds"). 247 issues total (50 P0 / 112 P1 / 85 P2). Fix execution: shared layer
> rebuilt first (shared.tsx v2 + format.ts + useProfileNames), then per-page lift agents.
> Full per-item lists are carried in the page-lift agent briefs; status logged below as fixes land.

**Verdict (auditor):** structurally sound (tokens, zero-assumption dashes, canonical lozenges) but visually a monochrome document: ~10 duplicated hand-rolled grey chip definitions, 9 hand-rolled tables/grids, raw px typography on every heading, truncated UUIDs and snake_case keys shown to executives, and almost zero data visualization on a product whose entire job is visualizing strategy.

## Summary — issues by file and severity

| File | P0 | P1 | P2 | Total | Owner |
|---|---|---|---|---|---|
| components/shared.tsx (S-001…S-022) | 6 | 11 | 5 | 22 | main session — DONE (v2 rewrite) |
| StrataCommandCenterPage (S-023…S-042) | 5 | 11 | 4 | 20 | Agent A |
| StrataStrategyRoomPage (S-043…S-060) | 4 | 8 | 6 | 18 | Agent B |
| StrataStrategyMapPage (S-061…S-078) | 4 | 9 | 5 | 18 | Agent B |
| StrataScorecardsPage (S-079…S-094) | 2 | 7 | 7 | 16 | Agent A |
| StrataScorecardDetailPage (S-095…S-114) | 5 | 9 | 6 | 20 | Agent A |
| StrataKpiLibraryPage (S-115…S-131) | 3 | 7 | 7 | 17 | Agent C |
| StrataKpiDetailPage (S-132…S-151) | 3 | 10 | 7 | 20 | Agent C |
| StrataExecutionPage (S-152…S-171) | 2 | 10 | 8 | 20 | Agent C |
| StrataPortfolioVmoPage (S-172…S-190) | 6 | 7 | 6 | 19 | Agent D |
| StrataDataPipelinePage (S-191…S-208) | 4 | 7 | 7 | 18 | Agent D |
| StrataReviewsPage (S-209…S-227) | 4 | 8 | 7 | 19 | Agent D |
| StrataAdminConfigPage (S-228…S-247) | 2 | 8 | 10 | 20 | Agent D |
| **Total** | **50** | **112** | **85** | **247** | |

## Cross-cutting fix themes
1. One shared chip → canonical chips/lozenges; kill all ~10 page-local copies.
2. 9 hand-rolled tables → JiraTable (`@/components/shared/JiraTable`).
3. Executive-facing text: no UUIDs (useProfileNames → name or '—'), no snake_case (labelize), no "Set"/raw-JSON/dead placeholders.
4. Data-viz wherever scores/weights/progress appear: StrataScoreRing, StrataBandBar, StrataTrendSpark, recharts w/ semantic tokens; band color from governed threshold appearance only.
5. Typography: page chrome via StrataPageChrome (ads Heading), labels/captions on --ds-font-size tokens, tabular-nums display numerals; no raw 24px h1.
6. Icons (@/lib/atlaskit-icons) on panels/pages + band-colored accents to break grey-on-grey.

## Fix status log
- 2026-07-05 · shared.tsx v2 + format.ts + useProfileNames landed — S-001…S-022 addressed (S-010 kept: border+shadow matches flagship ReleaseHub chrome; S-011 shortId kept inside evidence provenance; S-022 locked-purple kept as deliberate governance accent). tsc 183 = baseline, 0 strata errors.
- 2026-07-05 · Agents A-D delivered S-023…S-247: **247/247 addressed**. Documented in-scope partials: S-044 (rebuilt tree rows in lieu of table-tree port — allowed), S-063 (perspective color system shipped; swimlane layout deferred — allowed), S-139 (band shading refused: score-scale bands on a unit axis would lie — zero-assumption; Y-axis unit + tooltip formatting shipped).
- 2026-07-05 · Main session post-lift: 26 off-grid spacing values snapped (audit ratchet back to baseline); ads DropdownMenu custom-trigger regression (menus detached at viewport corner) fixed via StrataChipMenu on the repo-proven fixed-position pattern; 5 menus rewired; wrapper bug spawned as separate task.
- Final gates: tsc 183=baseline (0 strata) · color gate 0=baseline · ads audit all categories = baseline · module banned-color grep = 0.

## Visual acceptance status
VERIFIED (session 003): all 10 surfaces re-probed in light mode, Command Center + Scorecard detail + stat strips verified in dark mode, chip menus verified anchored. Owner sign-off pending.
