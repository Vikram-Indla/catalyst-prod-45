# Validation evidence — CAT-STRATA-ADS-UPLIFT-20260706-001

## Gates (2026-07-06)
- `tsc -p tsconfig.app.json` → **183 errors = baseline 183** (0 new; all pre-existing, incl. broken JiraSyncPage test file).
- `npm run lint:colors:gate` → ✅ 0 = baseline 0.
- `npm run audit:ads:gate` → ❌ spacing 4 vs baseline 1 — all 4 offenders in files untouched by this branch (dock.css ×3, ComponentRegistry.stories ×1). Inherited from main; see 08_DRIFT_LOG.md D1.
- Banned-color grep on all touched files → 0 matches.

## DOM probes (Chrome MCP, localhost:8080, viewport 1600×1000)
- Breadcrumb: first crumb `STRATA` now at x=244 (content grid), fully inside the
  overflow-clip ancestor; text unclipped on every page (was: clipped to "TRATA" at
  x=240 with clip edge 244).
- KPI dictionary table: `scrollWidth 1363 == clientWidth 1363` (was 1552 vs 1363 →
  Achievement/Validator/Data source chopped).
- Portfolio tables: register + value profile inner grids = 1363 = wrapper (was 1408/1552).

## Screenshot acceptance (after IDs — see 10_SCREENSHOT_CHECKLIST.md for before)
| Screen | After | Verified |
|---|---|---|
| Command Center | ss_3235pxylq | crumb full; Type lozenges short + unclipped |
| Strategy Room | ss_71233i9de / ss_6224c8ikx | crumb full |
| Strategy Map | ss_8444atr54 | crumb full; blank MiniMap removed, all node cards visible |
| Scorecards | ss_23414mn9i | crumb full |
| Scorecard Detail | ss_2176nybxz | H2 = "CEO Scorecard · Q2 FY2026" (was "Scorecards") |
| KPI Library | ss_6584hd30d | all 9 columns fit; achievement lozenge whole; Entry tags whole |
| KPI Detail | ss_8758h464z | H2 = "Network Availability" (was "KPI library") |
| Execution | ss_6273gcyl5 | crumb full |
| Portfolio & VMO | ss_0817sq43w | Validator + Realized fully visible; Validate wraps below value |
| Data Pipeline | ss_6124q538z | crumb full |
| Reviews & Decisions | ss_0235dkt39 | crumb full |
| Administration | ss_99451iist | crumb full |
| Upload Wizard | ss_80976szho | crumb full |
| Evidence | ss_1891h73or | crumb full |

Functionality note: screenshots prove layout only; no data paths were modified
(zero RPC/hook/route changes — styling, labels, and column schema only).
