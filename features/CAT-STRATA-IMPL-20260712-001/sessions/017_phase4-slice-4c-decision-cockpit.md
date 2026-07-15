# Session 017 — Phase 4 · Slice 4C (Decision Cockpit, anchor 10)

**Feature Work ID:** CAT-STRATA-IMPL-20260712-001
**Date:** 2026-07-15
**Branch:** `strata/impl-phase01` (HEAD `ee46e8962` = origin/main; 4B merged)
**Goal:** Redesign the `StrataReviewsPage` DETAIL branch (`isDetail`, `/strata/reviews/:snapshotKey`) to anchor 10.

## Drift gate — DONE
- **Anchor 10 re-read IN FULL via DesignSync** (`anchors/10 Decision Cockpit & Board Pack.dc.html`). Digest:
  breadcrumb → H2 + "REVIEW IN PROGRESS" + **Present mode / Export board pack** actions → **snapshot identity band**
  (LOCKED SNAPSHOT · key · frozen ts · config vN · N KPIs · N benefits · "every number below is snapshot truth" +
  "Compare with live" / "Snapshot history (03 supersedes 02)") → **review lifecycle strip** (5-stage FULL stepper w/
  per-step notes: Readiness ✓ / Snapshot locked ✓ / Decisions ● 1 of 3 / Actions ○ / Board pack ○) → **2-col 7fr/5fr**:
  Decision register (status lozenge + snapshot-evidence prose + verdict-record band [verdict + note + Recorded by X ·
  date · against SNAP] + Evidence →) | Actions register (title + "from {decision}" ancestry + owner + due tone + footer
  "Q1 follow-ups: 4 of 5 closed · 1 overdue") → **board-pack editorial preview** (horiz-scroll page cards → anchor 24).

## Plan Lock 4C = SPLIT
- **4C-1:** snapshot identity band (extend StrataSnapshotBand) + lifecycle strip + decision register (StrataDecisionModal,
  SoD) + actions register (decision ancestry) + board-pack preview link.
- **4C-2:** compare-with-live 2-col diff (P4-D5) + Present-mode / Export-board-pack actions (→ 4G).

## Data reality (staging, probed this session)
- SNAP-1001: snapshot_items = 16 kpi + 5 perspective + 1 scorecard_instance + 8 scorecard_line (30); **0 benefit items**.
  1 decision DEC-1001 "Accelerate digital care deflection", status=**decided** (→ RECORDED), `decided_by`=NULL (→ honest
  "—"), decided_at 2026-04-08, description = evidence prose. SNAP-1: 1 kpi item, 0 decisions.
- ⇒ Identity band counts derive from snapshot_items entity_type (KPIs = count kpi; benefits = count benefit = 0 →
  render honestly). No separate verdict field — status 'decided' IS the verdict; description is the note; verdict band =
  status lozenge + description + "Recorded by {decided_by ?? —} · {decided_at} · against {snapshot_key}".

## Detail-branch map (repo-context agent) — key facts
- Detail arm `:1127-1351`: split (rail + detail column `:1152-1350`). Header `:1155-1165` (no actions slot today);
  01 Key metrics; 02 Frozen evidence; Decisions&actions (`renderDecision :825-941` — has description prose + transitions
  but NO verdict-record band, NO Evidence→ link); board packs; audit.
- `StrataSnapshotBand` (`shared.tsx:539-576`) props `{ snapshotKey, frozenAt?, basis?:ReactNode, actions?:ReactNode, testId? }`
  — `basis` is a ReactNode ⇒ identity-band counts pass through with NO component change. Not used in ReviewsPage before.
- Export path exists: `generatePack('pdf'|'pptx')` (`:623-686`) → 4C-2/4G.
- Compare-with-live: `useKpiAchievement` per-KPI feasible but unwired → 4C-2 (P4-D5).

## 4C-1 — BUILT + verified (identity band + lifecycle strip). AWAITING commit.
Files: `src/modules/strata/pages/StrataReviewsPage.tsx` only.
- Header: added derived review-stage lozenge (CLOSED/IN PROGRESS, from period.close_status) beside the snapshot-state lozenge.
- **Snapshot identity band**: reused `StrataSnapshotBand` (no component change) — snapshotKey + frozen ts + rich `basis`
  (`{items.length} frozen records · {kpiItemCount} KPIs · {benefitItemCount} benefits · every number below is snapshot truth`).
- **Review lifecycle strip**: `StrataLifecycleStepper variant="full"` w/ per-step notes; `selectedLifecycle` memo derives the
  5 stages for the selected snapshot (readiness/snapshot/decisions/actions/pack) from snapshots+decisions+actions+packs.
- New derivations: `kpiItemCount`/`benefitItemCount` (snapshot_items entity_type), `selectedStage`, `selectedLifecycle`.
- **Corrected a pre-existing mislabel** my band surfaced: header FactChip `configCount` was labeled "frozen records"
  (it's config-version domains, 3) contradicting the band's true 30 frozen records → relabeled "config version(s)".
- Preserved 01 Key metrics / 02 Frozen evidence / decisions / board-packs / audit below (band frames them; no regression).

Gates: tsc clean · lint:colors 0/0 · audit:ads 19799/19799 · CRE passed. Live-verified localhost:8080:
SNAP-1001 (rich) **light+dark** — CLOSED stage, band "30 frozen records · 16 KPIs · 0 benefits", lifecycle
Readiness✓/Snapshot✓/Decisions✓ 1of1/Actions●(orange) 1of2 closed/Board pack✓ 2; SNAP-1 (sparse) — IN PROGRESS,
"1 frozen record · 1 KPI · 0 benefits", Decisions/Actions honest **todo (gray)** "none recorded"/"none assigned".
Index branch (4B) unbroken; only StrataReviewsPage.tsx touched (map zero-change); no console errors.

## 4C-2 — BUILT + verified (decision + actions registers). AWAITING commit.
Files: `src/modules/strata/pages/StrataReviewsPage.tsx` only.
- Restructured "03 Decisions & actions" into the anchor-10 **2-col 7fr/5fr** (flex-wrap responsive: left `flex 7 1 420px`,
  right `flex 5 1 300px` — stacks when narrow).
- **Decision register** (left): reworked `renderDecision` from chevron-expand into always-visible anchor cards — status
  lozenge + key + title + **snapshot-evidence prose** (description) + **verdict-record band** (when decided/closed:
  status as verdict + "Recorded by {decided_by ?? —} · {decided_at} · against {snapshot_key}") + evidence-ref tags +
  preserved governed authoring (Mark decided / Close decision / New action, canAuthor). Dropped chevron-expand +
  `expandedDecisionId` state + ChevronDown/Right imports.
- **Actions register** (right): NEW `renderActionRow` + `snapshotActions` memo — flat list of THIS snapshot's actions
  (born from its decisions), each: title + "from {decision_key}" ancestry + owner + due tone (overdue=danger) + status +
  preserved Start/Done/Cancel transitions; footer "Follow-ups: N of M closed · K overdue".
- **Deviation (honest):** no dead "Evidence →" link — no single evidence drill target per decision; the concrete
  evidence_refs render as tags (as before). Decision OPEN lozenge kept existing `inprogress` tone (anchor uses warning).
- **BUG caught in live verify (tsc passed, runtime failed):** `snapshotActions` memo referenced `todayISO` before its
  `const` declaration (TDZ — "Cannot access 'todayISO' before initialization"). Moved `todayISO` above the first
  consumer. Lesson: tsc doesn't flag const-used-before-decl inside a memo dep array; a live load does.

Gates: tsc clean · lint:colors 0/0 · audit:ads 19799/19799 (fixed an off-grid `marginTop:2`→removed) · CRE passed.
Live-verified SNAP-1001 **light+dark**: DEC-1001 card (DECIDED + evidence prose + verdict band "Recorded by — · 8 Apr
2026, 10:30 · against SNAP-1001" + Kpi/Benefit tags + authoring); Actions register (2 rows, "from DEC-1001" ancestry,
owner —, DONE / IN PROGRESS, footer "1 of 2 closed"). Index branch unbroken; only StrataReviewsPage.tsx (map
zero-change); no console errors.

## 4C-3 — BUILT + verified + MERGED (compare-with-live, P4-D5). Auto-commit authorized (Vikram "auto-commit when green").
Files: `src/modules/strata/pages/StrataReviewsPage.tsx` only.
- Added a **"Compare with live"** toggle to the identity band's `actions` slot → reveals a **Snapshot-vs-live** panel that
  client-diffs each frozen KPI's snapshot value vs its LIVE `strata_calc_kpi_achievement` recalc over the snapshot's OWN
  period (`selected.period_id`). No RPC/migration. Batched `useQueries` over the frozen KPIs, gated `enabled` on the
  toggle (fires only when opened). Dedup 16 kpi items → 8 unique KPIs by `entity_id`. Names via `useKpis`.
- Restatement = |frozen−live achievement %| > 0.05 OR band flip. Panel: summary "N compared · M restated" + a table of
  only RESTATED rows (KPI · Snapshot value+band · Live value+band · Δ), or "Snapshot matches live" when 0 restated.
- Live-verified SNAP-1001 (closed period) light+dark: **8 KPIs compared · 0 restated → "Snapshot matches live"** (honest
  — locked period's live recalc equals frozen). New imports: `useQueries`, `kpiApi`, `useKpis`. Gates green.
- **HMR note:** a transient stale `kpisQ is not defined` console error appeared during the multi-edit sequence (usage
  compiled before the definition edit landed); a fresh reload is clean, page renders (not error boundary). Same HMR-stale
  family as DRIFT-7 / [[tsc-misses-tdz-in-memo-dep]] — the clean reload is the real gate.

## ✅ Decision Cockpit (anchor 10) COMPLETE: 4C-1 (context) + 4C-2 (registers) + 4C-3 (compare-with-live).
Present-mode + Export-board-pack remain → **4G** (board pack). ⛔ NEXT = **4D Data & Lineage Landing (anchor 19)**.
