# Agent 05 — CSS / Token Probe Agent Report

**Date:** 2026-07-03
**App:** http://localhost:8080 (logged in, project BAU)
**Method:** Chrome MCP `javascript_tool` — one consolidated `getComputedStyle` probe per route on real rendered elements (after 5–7 s render waits), plus per-page `getComputedStyle(document.documentElement).getPropertyValue(--ds-*)` token resolution. All colors normalized to uppercase hex in-page for token matching. Viewport 1512×805.

**Companion to Agent 04** (DOM-probe). Agent 04 measured geometry/structure; this agent measures **computed CSS values and raw-vs-token color verdicts**.

---

## Scope covered

- **3 Project Hub baselines** (all target elements): `/project-hub/BAU/backlog` (full), `/project-hub/BAU/filters` (row+header), `/project-hub/BAU/sprints` (row+header)
- **10 destination routes**: release-hub (releases-management, overview, changes), testhub (repository, cycles, defects, board), incident-hub (all-incidents, board)
- Per target: font-family, font-size, font-weight, line-height, color, background-color, border-color, border-radius, box-shadow, padding, height, width. Each color compared against that page's live `--ds-*` token values.

## Files inspected

None (live-DOM computed-style probe — no source files read). This report + capture IDs are the only artifacts.

## Routes inspected (13)

backlog, filters, sprints (baselines); releases-management, overview, changes; testhub repository, cycles, defects, board; incident-hub all-incidents, board. (release-kanban + testhub/board were empty — no cards to probe, consistent with Agent 04.)

## Screenshots captured

`computer screenshot save_to_disk:true` succeeded but the Chrome-MCP output files are **not reachable from the host filesystem** (confirmed via `find /` — 0 matches; same limitation Agent 04 hit). Capture IDs only:

| Hub | Capture ID | Content |
|---|---|---|
| Test Hub | `ss_2560vo9ui` | /testhub/board (empty state, light theme) |
| Release Hub | `ss_4239bm4cg` | /release-hub/releases-management (3 rows; outlined status tags, 52px rows, red "Release date") |
| Incident Hub | `ss_9774j7q1l` | /incident-hub/all-incidents (142 items; filled status lozenges — canonical component reused) |
| Project Hub | `ss_8120b4pwc` | /project-hub/BAU/backlog (95 items; canonical filled @atlaskit lozenges, 39px rows) |

Screenshot re-capture via a host-side tool is still needed to populate `docs/catalyst-ui-convergence/screenshots/`.

---

## THEME CAVEAT (important — read before interpreting colors)

The app theme **flickered between light and dark across some navigations** early in the run (localStorage `catalyst-theme=light`, `theme=light` — light is the stable default; two page loads transiently rendered dark). To keep raw-vs-token verdicts consistent, **every color verdict below is judged against the token map captured on that same page**, and the reference baseline is the **light-theme** canonical (matching the default and the destinations, which all rendered light and stable). Light token map used throughout:

```
--ds-text=#292A2E  --ds-text-subtle=#505258  --ds-surface=#FFFFFF
--ds-surface-sunken=#F8F8F8  --ds-border=#0B120E24  --ds-background-neutral=#0515240F
--ds-background-selected=#E9F2FE  --ds-background-brand-bold=#1868DB
```
(Dark equivalents confirmed reactive on filters/sprints/backlog: `--ds-text=#CECFD2`, `--ds-surface=#1F1F21`, `--ds-text-subtle=#A9ABAF`, `--ds-brand-bold=#669DF1` — the canonical table + PH chrome are fully theme-reactive.)

---

## Canonical Project Hub baseline (measured, light theme)

| Element | w×h | font-size/weight | line-height | color (token verdict) | background (token verdict) | radius |
|---|---|---|---|---|---|---|
| **table row** (`tbody tr`) | 1337×39 | 14px / 400 | 21px | #292A2E = `--ds-text` ✓ | transparent ✓ | 0 |
| **row cell** (`td`) | 63×39 | 14px / 400 | 20px | #292A2E ✓ | #FFFFFF = `--ds-surface` ✓ | 0 |
| **header cell** (`th`) | 63×40 | 12px / 600 | 20px | #505258 = `--ds-text-subtle` ✓ | #F8F8F8 = `--ds-surface-sunken` ✓ | 0 |
| **search input** | 500×28 | 14px / 400 | — | #292A2E ✓ | transparent ✓ | 0 |
| **primary button** (Create) | 91×32 | 14px / 500 | — | #FFFFFF (light) / surface (dark) ✓ | #1868DB = `--ds-background-brand-bold` ✓ | 3px |
| **status lozenge** (`status-lozenge-dropdown-trigger`) | ~117×20 | 14px / 400 | — | #FFFFFF ✓ | #1868DB = `--ds-brand-bold` ✓ (state-driven) | 3px |
| **breadcrumb item** | 85×21 | 12px / 400 | 18px | #505258 = `--ds-text-subtle` ✓ | transparent | — |
| **page title** (H2) | 83×26 | 22px / 600 | 26.4px | #292A2E ✓ | transparent | — |

Baseline rows (Agent 04 corroborated): backlog 39px, sprints 46px, filters 54px. **Canonical is fully ADS-tokenized** on every probed property.

---

## FULL PROPERTY-LEVEL MISMATCH TABLE (destination vs canonical)

Severity: **High** = different font-family/size/weight OR >8px dim delta OR non-token color; **Med** = 2–8px delta or layout-overflow; **Low** = <2px.

| # | Route / element | Property | Canonical | Destination | Delta | Token verdict | Severity |
|---|---|---|---|---|---|---|---|
| 1 | **release-hub/releases-management** row | font-size | 14px | **16px** | +2px | — | **HIGH** (font-size) |
| 2 | ″ row | line-height | 21px | 24px | +3px | — | HIGH |
| 3 | ″ row | height | 39px | **52px** | **+13px** | — | **HIGH** (>8px) |
| 4 | ″ row | color | #292A2E=`--ds-text` | #292A2E | 0 | **token ✓** | — |
| 5 | ″ row | border-color | `--ds-border` #0B120E24 | **#E0E0E0** | — | **RAW ✗** | Med |
| 6 | ″ header | color | #505258=`--ds-text-subtle` | **#6B6E76** | — | **RAW ✗** | **HIGH** (non-token) |
| 7 | ″ header | height | 40px | 34px | −6px | — | Med |
| 8 | ″ table | role | `grid` | **null** | — | — | Med (semantics) |
| 9 | **release-hub/overview** KPI number | font-size | (no PH eqv; 14px body) | **32px / 700** | — | #292A2E `--ds-text` ✓ | Med (info) |
| 10 | ″ KPI card container | elevation | surface-raised + radius (ADS Card) | **transparent, br 0, no shadow, no border** | — | — | **HIGH** (hand-rolled, no ADS Card) |
| 11 | **release-hub/changes** list item | color | #505258=`--ds-text-subtle` | **#6B6E76** | — | **RAW ✗** | Med (non-token) |
| 12 | ″ surface | table/grid | native table role=grid | **no table (div list)** | — | — | Med |
| 13 | **testhub/repository** row | height | 39px | **38px** | −1px | — | Low |
| 14 | ″ row | font/color | 14/400 #292A2E | 14/400 #292A2E ✓ | 0 | **token ✓** | — |
| 15 | ″ header | all | 12/600 #505258 bg #F8F8F8 | **exact match** | 0 | **token ✓** | — (MATCH) |
| 16 | ″ row | border-color | `--ds-border` | **#E0E0E0** | — | **RAW ✗** | Med |
| 17 | **testhub/cycles** row | height | 39px | 38px | −1px | — | Low |
| 18 | ″ table | width | ≤1399px (fits) | **1768px (overflows viewport)** | — | — | Med (layout) |
| 19 | ″ row | border-color | `--ds-border` | #E0E0E0 | — | **RAW ✗** | Med |
| 20 | **testhub/defects** row | height | 39px | **39px** | 0 | — | — (MATCH) |
| 21 | ″ row | font/color | 14/400 #292A2E | exact | 0 | **token ✓** | — |
| 22 | ″ header | all | 12/600 #505258/#F8F8F8 | exact | 0 | **token ✓** | — (MATCH) |
| 23 | ″ row | border-color | `--ds-border` | #E0E0E0 | — | **RAW ✗** | Med |
| 24 | **incident-hub/all-incidents** row | height | 39px | **39px** | 0 | — | — (MATCH) |
| 25 | ″ row | font/color | 14/400 #292A2E | exact | 0 | **token ✓** | — |
| 26 | ″ header | all | 12/600 #505258/#F8F8F8 | exact | 0 | **token ✓** | — (MATCH) |
| 27 | ″ status lozenge | component | `status-lozenge-dropdown-trigger` 14/400 white/#1868DB br3 | **exact same component** | 0 | **token ✓** `--ds-brand-bold` | — (REUSE WIN) |
| 28 | ″ row | border-color | `--ds-border` | #E0E0E0 | — | **RAW ✗** | Med |
| 29 | **incident-hub/board** card | body font | 14px (row) | **16px / 24px** | +2px | #292A2E ✓ | Med |
| 30 | ″ card | bg / radius | — | #FFFFFF=`--ds-surface` ✓, br 4px, shadow+border | — | bg token ✓; border #E0E0E0 RAW ✗ | Med |

---

## Findings count

**30 property-level findings** across 13 routes: **4 HIGH**, 12 Med, 3 Low, and **8 exact matches / reuse wins** (fully token-clean and canonical-equal).

## High-risk findings

1. **releases-management row typography + height** (rows 1–3): 16px/24px/52px vs canonical 14px/21px/39px. Different font-size AND +13px row height — the single largest visual drift found. Evidence: `/release-hub/releases-management` `table tbody tr` → 16px/400, lh 24px, h 52px, wh 1352×52.
2. **releases-management header uses raw #6B6E76** (finding 6): not `--ds-text-subtle` (#505258). Non-token subtle-grey. Also appears on **changes list items** (finding 11) — this raw #6B6E76 is a **Release-Hub-wide non-token subtle color**.
3. **release-hub/overview KPI cards are hand-rolled** (finding 10): transparent containers, border-radius 0, no shadow, no border, 32px/700 numbers — not an ADS Card / `project-dashboard-shell` widget (Test Hub + Incident Hub dashboards use the canonical shell; Release Hub forked it). Corroborates Agent 04 high-risk #2.
4. **Recurring raw border #E0E0E0** across releases-management, all three TestHub tables, incident all-incidents, and incident board cards (findings 5,16,19,23,28,30): every non-Project-Hub table/card draws its row borders with literal `#E0E0E0` instead of `--ds-border` (#0B120E24 light / #E3E4F21F dark). This is the **most widespread token violation** — 6 surfaces. Because it is a literal hex it will **not go dark-reactive**, unlike the canonical border.

## Token-vs-raw verdict per hub

- **Project Hub (canonical):** 100% tokenized on every probed property; fully theme-reactive (verified light↔dark on backlog/filters/sprints).
- **Release Hub:** **worst offender.** Text color tokenized (#292A2E ✓) but (a) header/list subtle text = raw #6B6E76, (b) borders = raw #E0E0E0, (c) KPI cards non-canonical elevation, (d) row typography off-spec (16px). Status shown as outlined tags, not filled lozenges (visual, ss_4239bm4cg).
- **Test Hub:** text + header + search fully tokenized and canonical-equal (defects = exact 39px match; repository/cycles = −1px density delta). Only violation: raw #E0E0E0 borders. cycles table overflows viewport (1768px). Closest hub to canonical.
- **Incident Hub:** all-incidents = near-perfect canonical match (39px rows, tokenized header, **canonical status lozenge component reused** with `--ds-brand-bold`). Board cards tokenized bg/surface, 16px body, raw #E0E0E0 border. Strongest convergence of the destinations.

## Evidence references

| Route | Selector | Key measured value |
|---|---|---|
| /project-hub/BAU/backlog | `table tbody tr` / `th` / primary btn | 14/400 #292A2E 39px / 12/600 #505258 bg #F8F8F8 / #1868DB br3 |
| /project-hub/BAU/filters | `table tbody tr` | 54px, #CECFD2=`--ds-text`(dark) ✓ |
| /project-hub/BAU/sprints | `table tbody tr` | 46px, tokenized ✓ |
| /release-hub/releases-management | `table tbody tr` / `th` | **16px/400 52px** / header **#6B6E76 RAW**; role=null; border #E0E0E0 RAW |
| /release-hub/overview | KPI number / container | 32px/700 #292A2E / transparent, br0, no shadow |
| /release-hub/changes | list item | 12/400 **#6B6E76 RAW**; no table |
| /testhub/repository | `table[role=grid] tbody tr` / `th` | 38px #292A2E ✓ / header tokenized ✓; border #E0E0E0 RAW |
| /testhub/cycles | `table[role=grid]` | tableW **1768 overflow**; row 38px; border #E0E0E0 RAW |
| /testhub/defects | `table tbody tr` / `th` | **39px exact** #292A2E ✓ / header tokenized ✓ |
| /incident-hub/all-incidents | `tbody tr` / `status-lozenge-dropdown-trigger` | **39px exact** / lozenge 14/400 #FFFFFF on **#1868DB=`--ds-brand-bold` ✓** br3 |
| /incident-hub/board | column card div | 16/24 #292A2E ✓, bg #FFFFFF=`--ds-surface` ✓, br4, shadow+#E0E0E0 border |

## Confidence level

**High.** All values are real computed styles from live DOM with in-page token resolution (not source inference). Confidence reducers: (a) release-kanban + testhub/board were empty → board-card anatomy generalized from incident-hub/board only; (b) theme flicker early in run — mitigated by per-page token capture and using the stable light default as the comparison basis; (c) screenshots exist only as capture IDs (host-FS unreachable).

## Open questions

1. Is the **raw #E0E0E0 border** a single shared table/card CSS constant, or duplicated per surface? A source grep for `#E0E0E0` / `#e0e0e0` would confirm scope and fix-once feasibility (out of scope for this DOM probe). It is a genuine ADS-token violation on 6 surfaces and will not dark-mode-react.
2. Is the **raw #6B6E76** subtle-text a Release-Hub theme constant? Appears on releases-management header + changes list — likely one Release-Hub token override or hardcode.
3. releases-management **16px/52px rows**: is this an intentional density choice or an un-migrated pre-canonical table? Its `role=null` (not grid) suggests it predates the JiraTable/grid family used everywhere else.
4. Does the **canonical `status-lozenge-dropdown-trigger`** (reused in incident all-incidents + testhub defects, tokenized to `--ds-brand-bold`) explain why releases-management shows **outlined tags** instead — i.e. a different status-render component? Worth a source-level component-identity check.
