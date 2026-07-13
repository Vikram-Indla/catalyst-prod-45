# 03 — PLAN LOCK · CAT-STRATA-IMPL-20260712-001 · Phase 2 (measure & direction)

> STATUS: **APPROVED — Vikram 2026-07-13: "implement the full Phase 2, nothing deferred", on
> `strata/impl-phase01`.** Execution authorized. P2-D2 (saved-views) + P2-D4 (Narrative) flipped from
> defer → BUILD (see revised decisions). P2-D1/D5 stand as recommended; P2-D3 LifecycleStepper is not
> designed into any Phase-2 anchor so it is out of "what's there" (not a defer).
> Scope: STRATA design-pack **Phase 2** only (HANDOFF "measure & direction"): anchors 06, 16, 02, 14, 15.
> Grounded in: HANDOFF build-order; anchors 06/02/14 read in full (session 004), 16/15 at annotation
> level (re-read in full at each slice start per drift protocol); 2 discovery agents (routes/current-state
> + canonical/hooks inventory); staging DB probe (schema + RPCs); Phase-0/1 decisions D-1…D-11.

## Objective
Bring the five Phase-2 surfaces to their anchors — verdict-first measure/direction pages — reusing
canonical components + `--ds-*` tokens only, extracting the deferred `StrataChainStrip`, and **leaving
the protected map (`StrataStrategyMapPage.tsx`) byte-for-byte unchanged**.

## Surfaces (all REDESIGNS of existing pages — confirmed by discovery)
| Anchor | Route | Page (LOC) |
|---|---|---|
| 06 KPI Detail | `/strata/kpis/:slug` | `StrataKpiDetailPage.tsx` (1109) |
| 16 KPI & OKR Library | `/strata/kpis` | `StrataKpiLibraryPage.tsx` (581) |
| 02 Strategy Room (Structure view) | `/strata/strategy` | `StrataStrategyRoomPage.tsx` (852) |
| 14 Element Detail | `/strata/strategy/elements/:slug` | `StrataStrategyElementDetailPage.tsx` (671) |
| 15 Evidence | `*/evidence` | `StrataEvidencePage.tsx` (607) |

## "Done" (Phase 2)
- KPI Detail answers verdict → trust → definition; trend dots evidence-linked (`?from=`); actuals table
  carries validation + commentary columns (no orphaned commentary); role-gated Submit/Validate.
- Library uses verdict-first columns + OKR accordion; bulk actions via BulkFooterBar.
- Strategy Room ships the **Structure view** (readiness band + grouped tree + inspector rail) with a
  Structure/Map toggle; **Map toggle navigates to the untouched map route** — zero map change.
- Element Detail = ViewBase anatomy (health verdict → chain strip → charter → OKRs + right rail
  details/history); draft/promotion server-validated.
- Evidence = trust-story paragraph + lineage table; live/locked; `?from=` on all three kinds.
- `StrataChainStrip` extracted + consumed by 06/14/02. Every route: skeleton/empty/restricted/error/
  partial states, both themes, keyboard paths, grayscale-distinguishable. **Map zero-change diff passes.**
- Both ADS gates GREEN (baseline unchanged or ratcheted down); `lint:cre` green.

## Non-scope (forbidden this phase)
Phases 3–5. ANY change to `StrataStrategyMapPage.tsx` or the map's graph/inspector/filters/legend/edges.
Sidebar/top-nav restyle. New design tokens. `StrataLifecycleStepper` (not in any Phase-2 anchor).
CatalystViewBase table-union extension (P2-D1 — reproduce anatomy via StrataPageShell instead).
v2/v3 concepts. (Saved-views + Narrative are IN scope now — P2-D2/D4 BUILD.)

## Canonical components (reuse-first — verified by discovery)
Reuse as-is: `StrataPageShell`, `StrataStatStrip`, `StrataBandBar`, `StrataTrendSpark`, `StrataScoreRing`,
`StrataBandLozenge`, `StrataMetricStat`, `StrataPanel`, `StrataChipMenu`, `StrataDataStateLozenge`,
`StrataSnapshotBand`, `StrataDecisionModal`, `OkrRow`+`KeyResultsList`+`krProgressFraction` (OKR
accordion, already used by the library), `JiraTable` (selection + `BulkFooterBar` + expandable rows +
grouped rows all exist), recharts + band-toned `TrendDot` (CC idiom), `CatalystSidebarDetails` (rail
field-rows — compose inside StrataPageShell), `useBandResolver`, `fmtSarCompact`, `useStrataRoles`.
Build NEW: **`StrataChainStrip`** (extract `StrataEvidencePage.tsx:106-125` + `EvidenceRow` pattern; D-7).
Thin additive hooks as needed: `useKeyResults`, `useKpiActuals`, `useKpiCommentary`, `useElementKpisFor`
(low-risk wrappers over existing `kpiApi`/`strategyApi`/`useElementKpis` — no new data).

## PROPOSED DECISIONS (need Vikram ruling before the gated slice — recommendation first)
- **P2-D1 · Keep `StrataPageShell` for detail pages; reproduce the CatalystViewBase "body + 360px rail"
  anatomy via a 2-col grid (rail = `CatalystSidebarDetails` field-rows).** Discovery confirms
  CatalystViewBase's `coverItemTable`/`flagContext.tableName` union has ZERO STRATA tables and no STRATA
  page uses it — extending it is its own migration. Same rationale as D-1/D-2. → **Recommend CONFIRM.**
- **P2-D2 · Saved views (anchor 16) = BUILD (Vikram: no defer).** Add a `strata_saved_views` table
  (migration; staging-applied, prod parked with 20260713100000) storing per-user named column/filter
  view configs; wire into the Library JiraTable (save/select/delete view). Slice 2C.
- **P2-D3 · `StrataLifecycleStepper` — NOT in any Phase-2 anchor** (lifecycle = lozenge). Out of "what's
  there"; not built (Karpathy/D-4). No stepper appears in 06/16/02/14/15.
- **P2-D4 · Narrative view = BUILD (Vikram: no defer).** Anchor 02 designs only Structure; Narrative has
  NO chrome spec. Build the Structure/Map/Narrative toggle and a Narrative view **grounded in real data**
  (strategy themes → objectives as an executive narrative: verdict prose + coverage), not invented
  chrome. Approach shown to Vikram at slice 2D before building the Narrative body.
- **P2-D5 · Element health source — VERIFY at slice 2E start.** Anchor 14 says health is
  "server-calculated from linked measures + delivery"; no `strata_calc_element_health` RPC found. The
  current page already shows health — confirm whether it's stored/derived/RPC before wiring; if a true
  server calc is missing, render honestly (derive from linked-measure bands, labeled) or flag a backend
  task. Not a blocker to planning.

## Slices (each ≤ 2h; one commit; stop/split rule per CLAUDE.md)

### Slice 2A — `StrataChainStrip` (new canonical component) [D-7]
- Extract `ChainItem`/`ChainEmpty` + `chainMetaStyle`/`chainListStyle` (`StrataEvidencePage.tsx:106-125`)
  + the `EvidenceRow` render pattern into `StrataChainStrip` in `shared.tsx`, param'd by segments
  `[{ icon?, label, items: [{ lozenge?, name, onNav?, meta? }] | emptyText }]`. Refactor EvidencePage to
  consume it **behavior-preserving** (no visual change — diff the page before/after).
- Files: `src/modules/strata/components/shared.tsx`, `src/modules/strata/pages/StrataEvidencePage.tsx`.

### Slice 2B — KPI Detail (`StrataKpiDetailPage.tsx`, anchor 06) — SPLIT
- **2B-1** verdict band (StrataStatStrip hero + StrataBandBar + composed prose) + 12-month trend
  (recharts + band-toned TrendDot, "every point drills to evidence" `?from=`) + `StrataChainStrip` +
  trust strip. Verdict → trust order; docTitle; skeleton/restricted.
- **2B-2** Actuals & validation JiraTable (Period·Actual·Target·Band·Validation·Commentary·Lineage —
  commentary as a COLUMN, no orphaned section); progressive-reveal Definition/Formula/Audit; role-gated
  Submit actual (owner) / Validate (validator → attestation modal, submitter≠validator server-enforced,
  `kpiApi.attestActual`); Viewer no ghosts. Per-panel errors.

### Slice 2C — KPI & OKR Library (`StrataKpiLibraryPage.tsx`, anchor 16)
- Verdict-first columns: KPI · Achievement bar · Actual vs Target · Trend spark (`StrataTrendSpark`) ·
  Validation · Owner · Freshness — replacing field-dump rows. OKR accordion (reuse OkrRow/KeyResultsList).
  BulkFooterBar (reuse; verbs TBD — read-only-safe). Role-aware empty/restricted, skeleton, docTitle.
  **Saved views (P2-D2 BUILD):** `strata_saved_views` migration + save/select/delete named view configs
  (columns + filters) on the Library JiraTable. May be its own sub-slice (2C-2) if 2C exceeds 2h.

### Slice 2D — Strategy Room Structure view (`StrataStrategyRoomPage.tsx`, anchor 02) — SPLIT
- **2D-1** View toggle (Structure active · Map → `navigate(Routes.strata.strategyMap())` · Narrative →
  peer view, P2-D4 BUILD) in headerActions; **Direction-readiness band** (4 coverage tiles: objectives w/ measures,
  w/ owners, execution coverage, draft elements — client-derived from elements+element_kpis+cards+
  benefits); **Strategic-structure JiraTable grouped rows** (theme = group header; Element·Owner·Health·
  KPIs·Cards·Benefits; coverage-gap chips NO MEASURES/NO OWNER; "show gaps only" filter; draft rows).
- **2D-2** Inspector rail (360px sticky, right; selected element → chip, name, description,
  `StrataChainStrip`, owner/lifecycle/health/since, attention callout, "Open full page →"); shared
  selection with the tree; Esc closes + focus returns to row; <1280 → overlay drawer.
- **HARD:** map component never imported/touched; "Manage cycle"/"New element" reach existing modals only.

### Slice 2E — Element Detail (`StrataStrategyElementDetailPage.tsx`, anchor 14)
- ViewBase anatomy via StrataPageShell + 2-col grid: left body [health verdict (composed) → `StrataChainStrip`
  → Charter (Intent + Scope/Assumptions, versioned) → OKRs table (Key result·Owner·Progress·Status via
  OkrRow/KeyResultsList)] + 360px right rail [`CatalystSidebarDetails` field rows (Owner/Lifecycle/
  Perspective/Theme weight/Cadence/Charter) + History from `strata_audit_events`]. Draft/promotion
  ("Promote to active", server-validated `strategyApi.promoteElement`, lists requirements). Themes reuse
  shell (theme charter + child-objective list replacing OKRs). Restricted read-only; locked snapshot band.
  (P2-D5 health-source verified at slice start.)

### Slice 2F — Evidence anchor-15 pass (`StrataEvidencePage.tsx`)
- Trust-story opening paragraph + lineage table alignment to anchor 15; live/locked variants
  (StrataSnapshotBand when locked); confirm `?from=` "Back to [origin]" on all three kinds (KPI already;
  scorecard done in 1D; portfolio). Skeleton/restricted/error states. (Smaller — page exists; polish.)

## Files forbidden (do not touch)
`src/modules/strata/pages/StrataStrategyMapPage.tsx` and its graph/inspector/edge/filter/legend deps;
`EnterpriseSidebar.tsx` styling; top-nav styling. `src/hooks/useKeyResults.ts`/`useObjectives.ts` +
`src/components/forms/KeyResultDialog.tsx` (the NON-STRATA OKR domain — do not cross-wire).

## UI/UX rules (enforced every slice)
ADS `--ds-*` tokens only (no hex/rgb/hsl/Tailwind color util/named color/local map/hex fallback);
font-weight ∈ {400,500,600,653,700} (653 not 650); `var(--ds-space-*)` for new spacing (off-grid px
trips the ratchet). Color never alone (lozenges carry words; bars/bands add ▲▼). Layout-matched
skeletons; per-panel SectionMessage; role-aware empty; explained restricted (never bare 403). Context
spine on 100% of routes. Escape returns focus. 32/44px targets. prefers-reduced-motion. `?from=` on
every evidence drill. Commentary/counts labeled; overdue = "n days overdue"; SAR via fmtSarCompact;
tabular-nums on numerics.

## Data / backend rules
No migrations expected — discovery verified: `strata_okrs`/`strata_key_results`, `strata_kpi_actuals`
(validation lifecycle + evidence), `strata_commentary`, `strata_element_kpis`, `strata_strategy_elements`
(parent_id/element_type/status/stage/perspective_id), `strata_theme_charters`, `strata_lineage_records`,
`strata_calculated_values`, `strata_audit_events` all exist; RPCs `strata_promote_element`,
`strata_create_okr`/`_key_result`/`update_key_result`, `strata_calc_kpi_achievement`, `attestActual`
exist. FLAG-BEFORE-BUILD: saved-views table (P2-D2); element-health calc (P2-D5). RLS unchanged; every
write surfaces server rejection text (§17). Zero-assumption rendering throughout.

## Integration / wiring
KPI Detail/Library = `kpiApi` (+ thin hooks). Strategy Room/Element Detail = `strategyApi` +
`useStrategyElements`/`useElementKpis`/`useThemeCharters`/`strata_audit_events`. OKRs = `kpiApi.okrs`/
`keyResults` + create/update RPCs. Evidence = `lineageApi` + `useKpiEvidenceChain`/`useCalcValues`.
`?from=` via `routes.ts` builders only. `linkElementKpi` is on **strategyApi** (per memory), not kpiApi.

## Parallel execution plan
2A (StrataChainStrip) is the prerequisite for 2B/2E/2D-2 → then surfaces proceed in slice order (or
parallel worktrees, isolated per concurrent-session rule). One slice = one commit. Branch stays
`strata/impl-phase01` (or a new `strata/impl-phase02` off origin/main — decide at approval).

## Screenshot + probe acceptance (QA)
Per slice, light+dark, 1440/1024/640: (1) DOM/DB probe proving function (not screenshots); (2) ADS +
CRE gates green; (3) grayscale-distinguishable states; (4) keyboard-only path (validate/promote/
weight where present). **Map baseline:** screenshot + behavior probe of `/strata/strategy/map` BEFORE
2D and diff after every Phase-2 slice — zero visual/behavioral change is a HARD gate.

## Validation commands
`npx tsc --noEmit` · `npm run lint:colors:gate` · `npm run audit:ads:gate` · `npm run lint:cre`
(Vitest can't run — verify via tsc + gates + live DOM/screenshot).

## Stop conditions
Any ADS/CRE gate regression; any map diff ≠ zero; any slice exceeding 2h (split); any anchor verb
needing a migration (raise before adding — esp. saved-views, element-health); any PROPOSED decision
(P2-D1…D5) unresolved for the slice it gates.

## Drift / rebaseline
Re-read the slice's anchor in full at slice start (16/15 not yet read in full). If it contradicts this
plan, log to `08_DRIFT_LOG.md` and stop for re-decision — do not silently adapt (cf. DRIFT-4/D-9).
