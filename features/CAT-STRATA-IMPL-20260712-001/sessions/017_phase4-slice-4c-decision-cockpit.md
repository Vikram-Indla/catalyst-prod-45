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

## ⛔ NEXT = 4C-2 — decision register + actions register (anchor 10 2-col 7fr/5fr: verdict-record band + Evidence→ +
decision ancestry + follow-up footer) + compare-with-live (P4-D5) + Present/Export actions (→ 4G).
