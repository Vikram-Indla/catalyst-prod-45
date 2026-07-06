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

## Slice 2 — app-wide sweep evidence (2026-07-06)

Gates after slice 2: tsc 183 = baseline · lint:colors:gate 0 = baseline.

| Surface | Before | After | Verdict |
|---|---|---|---|
| Home / For you | ss_9769ku56d | — | compliant, no change |
| Projects list | ss_553099zlt | — | compliant |
| BAU Backlog | ss_6888w3bm9 | ss_2540mv6qd | compliant; pixel-identical after icon-wrapper fix (regression check) |
| BAU Board | ss_2650tmi1s | — | compliant |
| BAU Dashboard | ss_8696h4uon | — | compliant |
| BAU Timeline | ss_460906jzw | — | compliant |
| BAU Sprints | ss_9431siera (Release/Owner clipped, "O…" header) | ss_2443s79vd | FIXED |
| Products list | ss_425177zab | — | compliant (dangling "/" noted D7-adjacent, minor) |
| INV Product Backlog | ss_96329b50y | — | compliant |
| Incident Hub | ss_5380wfbm5 | — | compliant |
| Release Hub | ss_15461jq7w | — | compliant |
| Test Hub | ss_5719tg3ca | — | compliant |
| Tasks Dashboard | ss_1580zd85f ("Tasks /Dashboard" stacked header) | ss_76776b6lc | FIXED |
| Ideation Backlog | ss_7614k8ayn (floating magnifier) | ss_4308b03yz | FIXED (icon); IDEAS/IDEAS crumb logged D7 |
| Programs | ss_613365mx2 (floating magnifier) | ss_94113pmrp | FIXED |
| Issue Navigator | ss_1046np7t7 (floating magnifier) | ss_86111u4fa | FIXED |
| Admin Access | ss_5861yzjih ("PENDING SET…") | ss_73467628x | FIXED |
| Docs | ss_4597drbrs (blank content) | — | finding D6, data-path |
| Global Create modal | ss_6893p2xl0 | — | compliant |

## Slice 3 evidence (2026-07-06)

| Surface | Before | After | Verdict |
|---|---|---|---|
| Programs | ss_613365mx2 / ss_94113pmrp (Tailwind chrome) | ss_7134bxqu2 | FIXED — full ADS chrome |
| Ideation Backlog | ss_4308b03yz (IDEAS/IDEAS crumb) | ss_1919jiprp | FIXED — duplicate crumb removed |
| Products list | ss_425177zab (dangling "/") | ss_6783ovtdo | FIXED |
| STRATA Admin | ss_99451iist | ss_2422xlwc8 | tab strip scrolls on narrow viewports |
| STRATA Execution | ss_6273gcyl5 | ss_6186pzw4v | tag tooltips added (Ak Tag 180px truncation is by design) |
| Dark mode — KPI Library | — | ss_8186484dm | tokens hold; no bare-color slabs |
| Dark mode — Command Center | — | ss_1473mv2xe | tokens hold |

Gates after slice 3: tsc 183 = baseline · lint:colors:gate 0 = baseline.
/docs withdrawn as a defect (not a route — wrong-URL artifact, see 04 §17).

## Slice 4 evidence — exhaustive deep-screen sweep (2026-07-06)

| Surface | Before | After | Verdict |
|---|---|---|---|
| Incident: All Incidents | ss_5978rgvc8 | — | compliant |
| Incident: Board | ss_7006fxvnr | — | compliant |
| Incident: Analytics | ss_1821g5o67 | — | compliant; "[Chart] Resolution Trend" placeholder logged (unbuilt widget) |
| Incident: Reports | ss_55566e553 | — | compliant |
| Incident: Committee queue | ss_07573vw7k | — | compliant |
| Release: Changes | ss_9604zksv8 | — | compliant |
| Release: SOP templates | ss_8373e5uhh | — | compliant |
| Release: Sign-off queue | ss_3191dd1ax | — | compliant |
| Release: Freeze windows | ss_4493mphap | — | compliant |
| Release: Production events | ss_932742sm4 (mixed pill styles) | ss_0510eohrv | FIXED — canonical lozenges |
| Test: Repository | ss_540825c4z | — | compliant |
| Test: Plans | ss_2276ar89n | — | compliant |
| Test: Cycles | ss_45920fcyu | — | compliant |
| Test: Defects | ss_0925yw6sd | — | compliant |
| Test: Traceability | ss_95248yz3m | — | compliant |
| Test: Reports | ss_7105vj842 | — | compliant |
| Tasks: Board | ss_2972p9e5c | — | compliant |
| Ideation: Board | ss_2093knvv6 | — | compliant |
| Ideation: Analytics | ss_6895rn9pg (mono numerals) | ss_9570l7xbf | FIXED — ADS heading numerals |
| Product: Roadmap | ss_28077jcde | — | compliant |
| Product: Timeline | ss_8610e5kbp | — | compliant |
| Product: Milestones | ss_4444d8lmd | — | compliant |
| Work-item detail (/browse) | ss_7259jo2zv | — | compliant; dependency lozenge clip logged P2 |
| Starred | ss_5358nt2yh | — | compliant |
| /admin unmatched deep link | ss_1292gwa18 (silent blank) | ss_4727k6ahl | FIXED — 404 catch-all |

Gates after slice 4: tsc 183 = baseline · lint:colors:gate 0 = baseline.
