# 01 — Canonical Component Discovery (Phase 0 + Phase 1)

Source: Canonical Component Discovery agent (code-grounded, file:line). UI/UX deltas → `00_anchor_specs.md`.

| Component | Status | Path | Note |
|---|---|---|---|
| StrataContextToolbar | EXTEND | `modules/strata/components/shared.tsx:331` | private/unexported; has cycle+period+data-state; NEEDS scope + freshness slot; export it. |
| StrataSnapshotBand | BUILD | — | absent everywhere; §18 new. Consumes existing `strata_snapshots`. |
| StrataChainStrip | BUILD (extract) | prior art `pages/StrataEvidencePage.tsx:107-338` | hand-rolled ChainItem/ChainEmpty → extract to shared.tsx. |
| StrataLifecycleStepper | DEFER (D-4) | — | absent; no Phase-1 consumer. Verify `components/ads/CatalystProgressTracker.tsx` before building. |
| useBandTone | REUSE | `shared.tsx:129-133` | complete. |
| State-taxonomy lozenges | REUSE | `shared.tsx:50-124`, `:798` | data-state/exec-health/band/OKR families; all ADS-pure. |
| JiraTable overflow | ADD PROP | hack at `shared.tsx:442-445`; props `JiraTable/types.ts:120-227` | no overflow prop exists; STRATA injects scoped CSS. Add `overflowX` prop, remove hack. |
| StrataScoreRing | REUSE | `shared.tsx:135-166` | `{score,bandKey?,size,strokeWidth}` token-pure SVG. |
| StrataValueBar | REUSE | `shared.tsx:170-232` | `{planned,forecast,realized,validated,periodName?}` zero-assumption. |
| JiraTable compact | REUSE | `JiraTable/types.ts:13,182` | `density='compact'` already first-class. |
| CatalystViewBase / SidebarDetails | GAP (D-2) | `components/catalyst-detail-views/...` | `coverItemTable`/`flagContext.tableName` unions have NO strata tables; STRATA pages use StrataPageShell/StrataPanel. Drawer drill deferred. |
| ProjectPageHeader hubType="strata" | REUSE | `components/layout/ProjectPageHeader.tsx:62` | wired. |
| HubSurface | REUSE (flag) | `components/layout/HubSurface.tsx:46` | uses non-`--ds-*` `var(--cp-bg-elevated)` at :44 — pre-existing, separate ticket. |
| StrataDecisionModal | REUSE | `shared.tsx:479-562` | verdict+note+server-rejection; extend for attestations/gates later phases. |

**Adjacent flag (own ticket, not this feature):** `HubSurface.tsx:44` `var(--cp-bg-elevated)` is a non-ADS token.
