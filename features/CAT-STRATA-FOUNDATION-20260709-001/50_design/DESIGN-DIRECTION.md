# DESIGN DIRECTION — STRATA "Command Room" (Mobbin-evidenced)

**Date**: 2026-07-09 · **Status**: proposed to Vikram · **Contract amendment**: A2 (design-discovery lane added at user request; Mobbin MCP authorized)
**Rule**: this is a *direction*, not a license to hand-roll. Every pattern below maps to an ADS/Atlaskit primitive or an existing Catalyst canonical component; anything that doesn't goes to the canonical-component gate at Plan Lock.

## Mobbin evidence register

| ID | Source (mobbin_url) | App | What it evidences |
|---|---|---|---|
| SRC-M1 | https://mobbin.com/screens/eaadd887-210e-4651-b040-8afb8ff88103 (+ c8900b38, 964142d0) | Asana Goals — Strategy Map | Zoomable node canvas: mission node → goal cards with progress bar, status lozenge, timeframe, owner. Connector lines express the hierarchy itself. |
| SRC-M2 | https://mobbin.com/screens/354495f0-dcdb-4bf7-9f22-543ace81a330 | Asana Goal detail | Two hero stat tiles (completion %, latest status), progress area chart, weighted connected subgoals list. |
| SRC-M3 | https://mobbin.com/screens/b2e7f096-7f25-4cdb-a80e-645ed595f5a1 (+ Whop add1901d, Revolut 642f8ac1) | Mixpanel / Whop / Revolut Business | Executive KPI band: metric cards with big numeral + delta chip + sparkline; dark-surface executive analytics (Revolut). |
| SRC-M4 | https://mobbin.com/screens/434377c2-0cfa-4b5b-bf17-4441d41731db (+ da4ff4d9) | TheyDo Metrics | Scorecard grid: metric, average, last data point, change delta w/ red-green arrows, type lozenge, owner avatar — with a side detail panel holding target thresholds (More/Less than), formula, description, data points. |
| SRC-M5 | https://mobbin.com/screens/1e3a41ca-0cbd-4304-82bb-979081b94072 (+ Harvest 52f798a5) | Asana Portfolios / Harvest | Portfolio health list: colored status dot vocabulary (On track / At risk / Off track / On hold), progress %, owner; budget–spent–remaining bars for value columns. |
| SRC-M6 | https://mobbin.com/screens/c1cc22aa-69de-468c-b200-cf80f05ac1c7 | Linear initiative detail | Executive project object: timeline body + right rail of milestone groups with % complete, progress area chart, activity/audit feed. |
| SRC-M7 | https://mobbin.com/screens/adc89d4e-eea6-450a-8f9e-40199cf56a3f (+ 6930e01f) | Obvious Q1 report | Editorial board pack: numbered sections (01 — Key Metrics), oversized stat cards, narrative commentary *between* data blocks, initiative status table, contents rail. A report that reads like a document, not a dashboard. |

## The direction: one visual grammar, five signature surfaces

STRATA's flavor = **"the map is the product."** Every area leads with a visual that *is* the strategic structure, and every number carries its judgement (delta chip / RAG lozenge) inline. Tables exist one drilldown below the visual, never as the landing experience.

1. **Strategy Execution → Strategy Map canvas (SRC-M1)**. `/strata` Strategy Map page (already exists — enhance, don't rebuild) becomes the signature surface: Cycle mission node at top → Strategic Theme nodes → Objective nodes → Project Card nodes, connector lines rendered, each node = card with progress bar + health lozenge + owner + period. Zoom/pan controls bottom-right.
2. **Every area landing → Executive KPI band (SRC-M3)**. A 4-up strip of stat tiles (numeral, delta chip, sparkline) above the fold on Strategy Execution, Balanced Scorecard, VMO, Governance landings — the "are we winning?" answer before any table.
3. **Balanced Scorecard → TheyDo-style scorecard grid + side panel (SRC-M4)**. CEO scorecard = perspective-grouped grid: measure, target, actual, delta arrow, RAG lozenge, owner; clicking a measure opens a right panel with thresholds, formula, evidence, commentary, drilldown to Project Cards. Rollup drill: CEO → Sector/CXO → measure → cards.
4. **VMO → health-dot portfolio list + value bars (SRC-M5)**. Portfolios as status-dot rows; benefits render Planned→Forecast→Realized→Validated as a single segmented value bar per benefit (the four value kinds as one visual), leakage as the visible gap.
5. **Project Card → Linear-style initiative detail (SRC-M6)**. Header (health, owner, dates, budget) + milestone groups w/ %, progress chart, right rail (theme, objective, portfolio links, serving/requesting party), audit-backed activity feed. Executive object, not a task tracker.
6. **Governance → editorial board pack (SRC-M7)**. Snapshots/Board Packs are numbered, narrated documents: 01 Key Metrics (oversized stat cards) → 02 commentary prose → 03 initiative status table → decisions/actions register. This is what makes governance feel boardroom-grade instead of another dashboard.

## Why this is premium (design rationale)

- **Narrative over inventory** (Tufte/Rams): each surface answers its executive question in the first screenful — map = "are we executing?", KPI band = "are we winning?", segmented value bar = "is value real?", board pack = "what do we decide?". Ordinary trackers show lists; premium tools show judgement.
- **The hierarchy is drawn, not implied** (SRC-M1): connector lines on the map make Cycle→Theme→Objective→Card legible at a glance — the locked linkage model becomes the hero visual, which no table can do.
- **Every number carries its verdict inline** (SRC-M3/M4): delta chips, RAG lozenges, threshold-aware colors — zero-assumption rendering (dash when unknown) keeps it honest.
- **Editorial typography for governance** (SRC-M7): numbered sections + prose between data = the difference between "a screen" and "a board pack".
- **Restraint**: whitespace, one accent per status, ADS surface tokens for light/dark. Revolut's dark analytics proves executive gravitas comes from restraint + hierarchy, not decoration.

## ADS/Atlaskit mapping (canonical-first, no hand-rolling)

| Pattern | Canonical implementation |
|---|---|
| Health/RAG lozenges, delta chips | `@atlaskit/lozenge`, `@atlaskit/badge` (component-owned colors) |
| KPI stat tiles + sparklines | Existing Catalyst stat/chart canon (probe at Plan Lock); tokens `--ds-surface-raised`, `--ds-text` |
| Scorecard grid | `JiraTable`/`DynamicTable` per JIRATABLE rule; side panel = existing Catalyst detail-panel canon |
| Strategy Map canvas | EXISTING `StrataStrategyMapPage` — enhance node cards/connectors; NOT a new hand-rolled canvas |
| Milestones/right rail/feed | Atlaskit progress + existing card-detail canon; audit feed from `strata_audit_events` |
| Board pack | Typography via ADS heading tokens; stat cards on `--ds-surface-raised`; no bare colors anywhere |

Open design items for Plan Lock: chart primitive inventory (which canonical chart lib the repo already uses), map connector rendering approach in the existing page, segmented value-bar component identity (candidate: existing progress canon vs proof-of-unsuitability).
