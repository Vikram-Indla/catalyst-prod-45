# 02 — Canonical Screen / Route Discovery
Feature: CAT-STRATA-IMPL-20260712-001 (Phase 0 + Phase 1)
Agent: Canonical Screen / Route Discovery

## Tooling note
DesignSync MCP (ToolSearch "select:DesignSync") was not available in this subagent's
tool set (only Read + Bash). Design-authority anchors 01/11/12/13 + proposal §13/§14/§17
were NOT read directly — this report covers the EXISTING codebase side only (routes,
pages, sidebar, Grid E/F compliance). Anchor content comparison must be done by the
launching agent or a session with DesignSync access before Plan Lock.

---

## 1. Existing pages — route, shell, header, compliance

### Anchor 01 — Command Center → `/strata` (index, `path=""`)
- Route: `src/modules/strata/StrataRoutes.tsx:57` `<Route path="" element={<CommandCenterPage/>} />`
- Page: `src/modules/strata/pages/StrataCommandCenterPage.tsx`
- Shell: `StrataPageShell` (`src/modules/strata/components/shared.tsx:419-470`) — STRATA's own
  wrapper, NOT the literal `CatalystListPageLayout`/`AtlaskitPageShell` components named in
  Grid E. Internally it renders `ProjectPageHeader hubType="strata"` (shared.tsx:450-457) +
  `StrataContextToolbar` (model/period/state band).
- Header pattern: called with `docTitle`, `modelLabel`, `state` — **no `trail`, no `title`**,
  which is the correct **L1 index** shape per Grid E1 (`RULE_TABLE.md:117`) even though the
  literal `CatalystListPageLayout` component isn't used.
- Structure vs Phase-1 spec (`01_OBJECTIVE.md`): stat strip (Row 1) → trend + perspective health
  (Row 2) → Needs-attention JiraTable inbox (Row 3) → AI advisory (Row 4). No `My Work` link/tile
  visible in the file; no StrataSnapshotBand/StrataChainStrip/StrataLifecycleStepper components
  referenced (Phase 0 shared-foundation components not yet built — grep below).

### Anchor 12 — Scorecards Index → `/strata/scorecards`
- Route: `StrataRoutes.tsx:61` `<Route path="scorecards" element={<ScorecardsPage/>} />`
- Page: `src/modules/strata/pages/StrataScorecardsPage.tsx`
- Shell: `StrataPageShell` called with `testId` only (`StrataScorecardsPage.tsx:226`) — no
  `trail`/`title` → correct L1 shape.
- Structure: summary stat strip → Models panel (grouped CEO/Sector-CXO cards) → Instances panel
  (JiraTable, row click → `Routes.strata.scorecard(row.slug)`).

### Anchor 13 — Scorecard Detail → `/strata/scorecards/:slug`
- Route: `StrataRoutes.tsx:62` `<Route path="scorecards/:slug" element={<ScorecardDetailPage/>} />`
- Page: `src/modules/strata/pages/StrataScorecardDetailPage.tsx`
- Shell: `StrataPageShell` called with `trail={[{ text: 'Scorecards', href: Routes.strata.scorecards() }]}`
  and `title={instance.name}` (`StrataScorecardDetailPage.tsx:343-345`) — correct **L2 detail**
  shape per Grid E2 (`RULE_TABLE.md:132`), including the L1-crumb-in-trail pattern. Loading/error/
  not-found states (lines 311, 318, 327) also route through `StrataPageShell` with the same trail
  — consistent chrome across all states.
- Param: `:slug` on `strata_scorecard_instances` — Grid F1/F2 compliant (not a UUID param).

**Grid E verdict:** all three existing pages satisfy the E1/E2 *shape* contract (trail/title
present only on L2) via the STRATA-specific `StrataPageShell`, but none use the literal
`CatalystListPageLayout` / `AtlaskitPageShell` component names Grid E cites as canonical. This
deviation is pre-existing (predates this feature) and was already flagged as STRATA's accepted
chrome pattern in `features/CAT-STRATA-FOUNDATION-20260709-001/02_CANONICAL_DISCOVERY.md:154`
("Grid E: canonical L1/L2 layout ... for any new STRATA pages" — read as *pattern*, not literal
component swap, since `StrataPageShell` already encapsulates `ProjectPageHeader` correctly). Flag
for Plan Lock: confirm with Vikram whether Phase 0/1 must migrate `StrataPageShell` internals to
literally wrap `CatalystListPageLayout`/`AtlaskitPageShell`, or whether the current wrapper is the
accepted canonical STRATA shell (recommend the latter — it already centralizes the header/toolbar
and a swap risks the documented "TRATA" clipping regression noted in shared.tsx:446-448).

---

## 2. Anchor 11 — My Work (`/strata/my-work`) — GAP CONFIRMED

- No route registered in `StrataRoutes.tsx` (full route list read; no `my-work` path).
- No page file: `find … -iname "*strata*mywork*" -o -iname "*StrataMyWork*"` → zero matches (only
  `dist/` build artifacts for the 17 existing pages exist; no MyWork bundle).
- No `routeRegistry.ts` entry (`src/config/routeRegistry.ts:19-32` lists 13 STRATA paths, no
  `/strata/my-work`).
- No `Routes.strata.*` builder for it (`src/lib/routes.ts:252-284` `strataRoutes` object — no
  `myWork` key).
- No sidebar item for it (`EnterpriseSidebar.tsx:26-73` — no "My Work" entry).

**Where it must mount (L1 pattern to follow):** same as Command Center / Scorecards Index —
new `StrataMyWorkPage.tsx` in `src/modules/strata/pages/`, lazy-imported in `StrataRoutes.tsx`
alongside the other 16 `lazy(() => import(...))` declarations (insert near line 11, after
`CommandCenterPage`), new `<Route path="my-work" element={<S><MyWorkPage /></S>} />` inserted
before the catch-all `<Route path="*">` (currently line 80). Add `myWork: () => '/strata/my-work'`
to `strataRoutes` (`routes.ts:253`, alongside `root`), add a `routeRegistry.ts` entry
(`section: ''` or a new section, `pageTitle: 'My Work'`), and call `StrataPageShell` with no
`trail`/`title` (L1 shape, matching Command Center/Scorecards Index).

---

## 3. Route table — full inventory + protection + Grid F compliance

- STRATA route shell: `src/modules/strata/StrataRoutes.tsx` — 22 routes under `/strata/*`
  (full list at lines 57-80, reproduced above where relevant).
- Mount point: `src/routes/FullAppRoutes.tsx:219` (lazy import) and `:615`:
  `<Route path="/strata/*" element={<MG k="strategyhub" t="STRATA"><S><StrataRoutesShell /></S></MG>} />`
  — gated by feature-flag `strategy_hub` + role `enterprise` (per `StrataRoutes.tsx:1-4` header
  comment: "gated by MG k='strategyhub' → feature_flags.strategy_hub + role 'enterprise'").
- `/strata/strategy/map` (`StrataRoutes.tsx:60`) → `StrataStrategyMapPage` carries **no extra
  role/permission guard of its own** — grep for `MG|role|guard|Navigate` inside
  `StrataStrategyMapPage.tsx` returned no gating logic. It is protected at the same level as
  every other `/strata/*` route (the single `MG k="strategyhub"` wrapper in `FullAppRoutes.tsx`),
  not by any route-specific lock. Confirm with Plan Lock whether Phase 0/1 needs it to stay
  exactly this way (objective doc's non-scope explicitly bans touching the map's
  graph/inspector/filters/legend — no route change implied either).
- Legacy redirects: `src/routes/EnterpriseRoutesShell.tsx:29-30,39` — `roadmaps`→`/strata`,
  `risks`→`/strata`, `objectives`→`/strata/strategy` (`Navigate replace`).
- Grid F compliance (route params): every dynamic STRATA route param is slug/key-based —
  `:slug` (elements, scorecards, kpis, execution/project-card, portfolio/benefits),
  `:runKey`, `:snapshotKey`, `:section` — none end in `Id`/`UUID`. **No F1 violations found.**
  Builders exist for all of them in `strataRoutes` (`src/lib/routes.ts:252-284`) except the
  not-yet-built `myWork()` (gap above).

---

## 4. Sidebar — `EnterpriseSidebar.tsx` current IA (VISUAL-FROZEN — relabel only)

File: `src/components/layout/EnterpriseSidebar.tsx:26-73` (`strataSidebarConfig`).

Current structure (5 groups + footer):
1. `''` (unlabeled) — Command Center → `/strata`
2. `Strategy Execution` — Strategy Room (`/strata/strategy`, active-match includes
   `/strata/strategy/map`) + Project Cards (`/strata/execution`)
3. `Balanced Scorecard` — Scorecards (`/strata/scorecards`) + KPI & OKR Library (`/strata/kpis`)
4. `Value Management Office` — Portfolio & Value (`/strata/portfolio`)
5. `Governance` — Reviews & Decisions (`/strata/reviews`) + Data & Lineage (`/strata/data`)
6. Footer item — Configuration (`/strata/admin`)

Mapping to the Phase-0 target IA (Direction / Measurement / Delivery / Value / Governance +
My Work), by best-fit on existing routes (needs Plan Lock confirmation against the design
anchors, which this agent could not read):
- **Direction** ← `Strategy Execution` → Strategy Room item only (title relabel of group + item)
- **Delivery** ← Project Cards item (currently bundled into `Strategy Execution`; may need its
  own group or move under Delivery)
- **Measurement** ← `Balanced Scorecard` (Scorecards + KPI & OKR Library)
- **Value** ← `Value Management Office` (Portfolio & Value)
- **Governance** ← `Governance` (Reviews & Decisions, Data & Lineage) — unchanged group name
- **My Work** ← new top-level item, likely alongside/after Command Center (unlabeled group),
  pointing at the new `/strata/my-work` route from §2 above.

Component: `SidebarBase` (`src/components/layout/SidebarBase.tsx`, not read in depth this pass)
consumes `SidebarConfig` — relabeling `title`/`items[].title` and adding one `items` entry is a
data-only change (no restyle), consistent with "sidebar is VISUAL-FROZEN — only IA relabel +
additive routes + legacy redirects allowed."

---

## Missing information
- DesignSync anchor content (01/11/12/13 `.dc.html` + DESIGN ANNOTATIONS footers, proposal
  §13/§14/§17) was not read — this subagent had no DesignSync/ToolSearch tool available.
  A follow-up pass (or the launching agent) must diff each anchor's DESIGN ANNOTATIONS against
  the structures above before Plan Lock is written.
- `SidebarBase.tsx` internals not inspected — confirm it supports adding a group/item without
  visual changes (spacing, icon set) before touching `strataSidebarConfig`.
- Whether `StrataPageShell`'s custom wrapper (vs literal `CatalystListPageLayout`/
  `AtlaskitPageShell`) is an accepted Grid E exception needs an explicit decision logged in
  `09_DECISIONS.md` — recommend treating it as compliant-by-pattern per prior STRATA foundation
  discovery, not touching it in Phase 0/1 (out of scope, regression risk on chrome clipping).

## Recommended next step
1. Get DesignSync access (session with the MCP tool, or paste anchor DESIGN ANNOTATIONS footers
   from a session that has it) and diff against the structures documented above.
2. Log the `StrataPageShell` vs literal-Grid-E-component question as a decision before Plan Lock.
3. Confirm the Direction/Measurement/Delivery/Value/Governance mapping against anchor 01/11/12/13
   IA language (not guessed from route names) before editing `EnterpriseSidebar.tsx`.
4. Scaffold `StrataMyWorkPage.tsx` + route + `Routes.strata.myWork()` + `routeRegistry.ts` entry
   as the first concrete Phase-1 file-list item (greenfield, no existing page to break).
