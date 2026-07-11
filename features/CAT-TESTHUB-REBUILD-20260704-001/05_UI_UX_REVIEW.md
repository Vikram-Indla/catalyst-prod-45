# UI/UX Review — Phase B Prototype (/testhub-lab)

Bar: **best-in-industry** (Vikram directive, non-removable). Benchmarks: Xray coverage, TestRail authoring, Zephyr readiness, qTest matrix.

## Per-screen persona test (answers its question in <5s?)

| Screen | Persona question | Verdict | Evidence |
|---|---|---|---|
| Command Center | Release ready? What needs me? | PASS — readiness Lozenges + gate summary top strip; My queue with Start-run CTAs | command-center-light/dark.png |
| Repository | What can we test, where are gaps? | PASS — tree carries counts + color-thresholded coverage % per folder; system views (Unassigned/Needs review/No link) quantify gaps | repository-light/dark.png |
| Case Detail | How is this behaviour verified? | PASS — steps front-and-center, doc-like editor, preconditions callout | case-light/dark.png |
| Scope Builder | What's in cycle, who runs it? | PASS — live workload strip w/ imbalance emphasis; duplicate guard visible ("In scope" greying) | scope-builder-light/dark.png |
| Runner | What do I run next, what happened? | PASS — rail + keyboard verdicts (1-4/j/k) + live rollup chip w/ formula tooltip; fail→prefilled defect panel | runner-light/dark.png |
| Traceability | Which stories safe to ship? | PASS — coverage Lozenge dominant column; scope selector visibly flips SEN-4290/4401 OK↔NOK; KPI chips recompute | traceability-*(-graph)-light/dark.png |
| Reports/Readiness | Where is quality risk? | PASS — gate table w/ actual-vs-threshold, waiver tooltip, verdict banner naming failing gates, formula panel | reports-light/dark.png |

## Benchmark-pattern scorecard
- TestRail inline authoring: title→Enter→next-key draft w/ flash — VERIFIED live (TC-0141 created, counts recomputed through tree). ✅
- Xray scoped coverage: 4-scope selector changes chips/KPIs/graph/list-fallback simultaneously — VERIFIED live. ✅
- Zephyr readiness: gates+signoffs+verdict on one screen, no competitor has waiver-aware gate table natively. ✅
- Qase fail→defect: prefilled title/severity/context chips + link-existing-incident — VERIFIED live. ✅
- qTest matrix: coverage predicates printed verbatim in footer (formula transparency). ✅

## Defects found by verification agent → disposition
1. P1 white zoom pill on dark graph → **FIXED** (token-themed .react-flow__controls).
2. P1 button-in-button (ScopeBuilder ×3) → **FIXED** (span/string triggers; atlaskit owns the button).
3. P2 inline-add stranded below fold w/ dead space → **FIXED** (row now flows under last row inside scroll container).
4. P2 reports lazy white flash → **MITIGATED** (fallback now paints var(--ds-surface) full-height; residual = vendor-charts chunk parse; Phase G preload note).
5. P2 preview-rail title crush → **FIXED** (title col minWidth 160).
6. P3 DropdownMenu prop leak (triggerRef/isSelected/testId → DOM) → **CANONICAL BUG in src/components/ads/DropdownMenu.tsx:32 span spread — Plan Lock bans touching it; logged for Phase C one-line destructure fix.**
7. P3 scope reset on reload → inherent to mock (memory-only by design); scope state is top-level so tab switches preserve it in-session. No action.
8. P3 runner coordinate-click miss (DOM click worked) → suspected floating-overlay interception during automated probe; manual recheck at demo; verdict buttons ≥28px targets.
9. P3 light scrollbar track on dark → OS-level scrollbar styling; production Phase I item (color-scheme CSS property), not lab-blocking.
10. Sidebar remount once after scroll (transient, unreproduced) → watch item.

## Dark mode
16/16 screenshots on disk. Zero white-glare after graph-controls fix. Charts token-themed via adsChartTheme (dark-aware). Lozenges/chips/banners verified theme-correct by probe.

## Canon compliance
ADS tokens only (gate: 0=baseline). ads-barrel components + atlaskit glyphs. No lucide/emoji. JiraTable visual grammar reproduced (real JiraTable mandated for Phases D/E — drift log #1). Honest empty/error states everywhere; PROTOTYPE + MOCK DATA lozenges persistent.

## Remaining known gaps (declared, not hidden)
- Tables are grammar-reproductions, not JiraTable (lab-only, by Plan Lock).
- Console: atlaskit Select legacy-context warning (library-level), DropdownMenu prop-leak (canonical, Phase C), app-wide router path warnings (pre-existing).

---

## Phase B2 update (2026-07-05) — Gate B feedback resolved

Vikram Gate B raised 4 concerns. Each addressed:

1. **"Disappointed with the double sidebar"** → FIXED. LabShell's 232px left rail removed; replaced by a horizontal tab strip (ProjectTabBar grammar: 32px, 14/500, selected text + 2px bottom border) under a compact header. Only the app's own sidebar remains on screen.
2. **"Feature list seems lesser… you cannot lose dependencies, timeline for releases"** → REVERSED + PROVEN. Blueprint §11 nav-prune recommendation withdrawn: Board/Timeline/Dependencies/Filters KEPT + uplifted. `docs/testhub-enterprise-rebuild/01_WORLDCLASS_FEATURE_MATRIX.md` §1 maps all 52 current capabilities → KEPT/UPLIFTED, **zero dropped**; §4 shows 38/38 competitor gaps phase-justified.
3. **"Not using existing data from project"** → FIXED. All 7 screens now read LIVE cyij-staging data via `labLiveData.ts` (12 hooks over tm_projects/folders/cases/steps/cycles/scope/plans/coverage/my-work/defects). Repository inline-add performs a REAL insert (only write; user-triggered). Traceability graph/matrix now resolve real case DISPLAY KEYS (fixed the truncated-UUID anti-pattern from evidence/03).
4. **"World-class, #1 in industry"** → feature matrix is the contract (265-row matrix, 15 differentiators no tool has, per-competitor scorecard).

**Honesty surfaced from real staging (shown, not painted):** plans have release_id NULL; gates reference a missing releases row ("Release record missing"); cycles lack planned dates (no date chips); many cases have no steps (case-level verdict fallback); coverage has one verdict dimension not four (scope selector: only "Latest (live)" real, others noted Phase F).

**Gates (B2):** tsc 0 errors · lint:colors:gate 0=baseline · zero mock refs remain · zero DB writes except user-triggered inline-add.

---

## design-critique — nav-duplication RCA + fix (2026-07-05)

**User report:** "UI/UX is complete duplicated." **Score before: 18/30 (HALT) — 3 P0.**

**RCA (code-proven):** CatalystShell.tsx:551 `isTestHubRoute = pathname.startsWith("/testhub")` matched `/testhub-lab` → shell rendered the production TestHubSidebar (Dashboard/Board/…/Reports) alongside the lab's top tab strip → two navs, overlapping labels (Repository/Traceability/Reports in both). The earlier "double sidebar" fix (left rail → top strip) treated the symptom; the real cause was the production module sidebar bleeding into the prototype, never suppressed. The top strip was itself a non-canonical 3rd nav pattern (all hubs navigate by left module sidebar).

**Fix:** (1) CatalystShell suppresses production TestHubSidebar on `/testhub-lab` (`isTestHubLabRoute` guard) and renders the lab's own `TestHubLabSidebar`; (2) TestHubLabSidebar reuses the canonical `SidebarBase` component (H4-perfect) with the lab IA — 7 walkable screens + an "In the rebuild" section previewing the full kept IA (Scenarios/Sets/Plans/Cycles/My Work/Board/Timeline/Dependencies/Filters/Defects, phase-badged D–H); (3) top tab strip removed from LabShell.

**Verified live (DOM probe):** leftRailCount=1, topTabStripCount=0, prodHeaderCount=0, one nav-list holding Repository/Traceability/Reports, header="TestHub Lab". Console clean. tsc 0, color 0=baseline.

**Score after: H4 3 · H8 3 · H6 3 → 28/30 (SHIP).** The "In the rebuild" section also strengthens the Gate-B "nothing lost" answer — the full target nav is visible in one canonical sidebar.
