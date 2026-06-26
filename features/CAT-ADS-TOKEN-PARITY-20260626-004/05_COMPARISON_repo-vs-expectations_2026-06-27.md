# 05 — COMPLETE COMPARISON: repo vs bundle expectations (2026-06-27)

Independent re-verification. Every bundle file read in full; every map-named target checked
against the live repo by grep + read (4 parallel read-only agents + direct spot-verify). Not
taken from the prior FINAL-REPORT on trust — this **confirms** it and adds new findings.

## Scoreboard (in-scope map targets)
| Map | Targets | WRAPPED-EXACT | Bare | Token differs from map |
|---|---:|---:|---:|---:|
| PR2/3 color-sweep | 21 | 19 | 0* | 2 (now use PR5 chart tokens — superseding, correct) |
| PR4 kanban | 30 | 30 | 0 | 0 |
| PR5 widgets | 5 | 5 | 0 | 0 (+ chart-token family live: 141 files use `var(--ds-chart-*)`) |
| PR6 admin | 15 | 14 | 1 | 0 |
| **Total** | **71** | **68** | **1** | **2** |

\* PR2/3 one-offs `DashboardKPIRow #fefce8` and `WhoCarriesWhatWidget #8A7CFF` are wrapped but
to the **PR5 chart tokens** (`chart-yellow-subtle`, `chart-purple-bold`) rather than the PR2/3
tokens (`background-warning`, `background-discovery-bold`). PR5 supersedes PR2/3 for these → correct.

## WIDE lane (re-confirmed)
- `catalyst-ads-parity.css` + `catalyst-ads-chart-tokens.css` byte-identical to bundle, imported
  `main.tsx:10-11` (chart AFTER parity). `workstreamColors.ts` byte-identical, consumed by the 3
  home files via `WORKSTREAM_COLORS` import (consolidation real).
- `packages/tokens/definitions.ts` — N/A (no dir). Read in full; values feed the CSS theme.

## GENUINE GAPS (bare hex still present)
All are either explicitly report-flagged as "not in any map" or fully out-of-map long-tail.
**None invented; none are regressions; none can be swept without a Claude Design mapping decision.**

| # | File:line | Bare hex | In a map? | Notes |
|---|---|---|---|---|
| G1 | `workhub/issue-view/FieldsTab.tsx:20` | `#FA8C16`, `#52C41A`, `#EB2F96` (AVATAR_COLORS) | No (these hexes are mapped as *workstream* colors, but this is a separate avatar palette) | Report already flagged "not in any map; reported, not swept". Same hexes ARE wrapped in `workstreamColors.ts`. |
| G2 | `pages/admin/workflows/CatalystWorkflowBuilder.tsx:213` | `#6B7FA3` (`2px solid`) | No (PR6 map omits it) | Report-flagged. Surrounding 11 node-theme hexes ARE wrapped. |
| G3 | `product-dashboard/widgets/StageOverviewWidget.tsx:14` | `#8A7CFF` (`PHASE_DELIVERY`) | No | Out-of-scope long-tail; same hex as the (wrapped) widget series, different semantic. |
| G4 | `features/all-releases/components/TimelineView.tsx:38` | `#fefce8` (`attention.bg`) | No | Out-of-scope; the paired `text` is already wrapped. |

## CONSISTENCY FINDING (wrapped, but divergent — NEW, not in FINAL-REPORT)
| # | What | Detail |
|---|---|---|
| C1 | `FieldsTab.tsx:17-19 PRIORITY_COLORS` disagrees with `CanonicalFilter.tsx` | Both tokenized, but different palette: FieldsTab High=`background-warning-bold,#E2B203`, Medium=`text-brand,#3B82F6`, Low=`text-success,#22C55E`, Highest=`text-danger,#EF4444`; CanonicalFilter uses danger-bold/#E15D31, warning-bold/#E4A11B, link/#2898BD, text-danger/#CD1316. The map implied FieldsTab should share CanonicalFilter's priority mapping. Only `Lowest #8C8F96 text-subtlest` agrees. |

## CROSS-FILE VALUE DELTA (informational)
| # | What | Detail |
|---|---|---|
| V1 | dark overlay tone | `definitions.ts` darkNeutral.200 = `#2C333A`; `index.css` ramp + ADS-13 use `#282E33`. `definitions.ts` is N/A (external `@catylast/tokens`), so no live conflict — but the two sources disagree on the overlay value. |

## VERDICT
Repo is **in parity with the bundle maps for every in-scope target** (68/71 wrapped-exact; 2
correctly superseded by PR5; 1 unmapped bare). The independent re-comparison **confirms** the
FINAL-REPORT. Outstanding = out-of-map long-tail (G1–G4) + one palette-consistency gap (C1),
all of which need Claude Design hex→token decisions before any change. **Do not self-invent.**
