# Session 004 — Slice 1C(-1) · Scorecards Index (anchor-12 card scope-chooser)

> Continuation of CAT-STRATA-IMPL-20260712-001 on `strata/impl-phase01`. 1A-4 committed (16d41e844) +
> merged/pushed to main (ab93cddd2). User: "ignore My Work and go to next" → 1C.

## Drift raised + resolved this session
- Read anchor 12 in FULL (DesignSync, parent-only). It is a card-first "scope chooser, NOT a table" —
  materially exceeds Plan Lock 1C's incremental scope. **DRIFT-4** logged; **D-9/D-10** decided by Vikram:
  full anchor-12 redesign split into 1C-1 (cards + judgment + states) and 1C-2 (ranked panel); ranked
  basis = worst-first by score + Δ-vs-prior (variance-to-plan not client-derivable → backend task_e44f1ba9).

## Done: 1C-1 IMPLEMENTED + VERIFIED (awaiting commit approval)
See 04_EXECUTION_LOG.md (Slice 1C-1) + 08_DRIFT_LOG.md DRIFT-4 + 09_DECISIONS.md D-9/D-10.
Files: `useStrata.tsx` (+useScorecardCalcs), `StrataScorecardsPage.tsx` (full rewrite). Gates green,
live-verified both themes + click-through. GitHub Desktop auto-committer still NOT paused → explicit
staging + `git log` check after commit.

## Next: 1C-2 (ranked-variance panel) then 1D (Scorecard Detail — read anchor 13 first).

## 1C-2 done (same session): ranked-variance panel
"Where attention pays" JiraTable panel below the cards — worst-score-first + Δ-vs-prior + weakest-
perspective driver (D-10; variance-to-plan deferred to backend task_e44f1ba9). Gates green, live-verified
both themes. See 04_EXECUTION_LOG.md Slice 1C-2. Anchor 12 (D-9) now COMPLETE. Next: 1D (read anchor 13).

## 1D done (same session): Scorecard Detail close-out
Anchor 13 read in full — no structural drift (page already verdict→decomposition shaped); Plan-Lock
items implemented: ?from= threading (Evidence + line ⓘ + fallback, EvidencePage prefix resolver),
role-gated Recalculate, layout-matched skeletons, whole-page restricted, partial-data label, D-6
dual-mode slug|UUID + canonical redirect. Live-verified: both evidence paths show "← Back to
Scorecard"; UUID URL canonicalizes; gates green; both themes. Anchor-13 extras (composed verdict
sentence, contribution column, roll-up footer) = optional polish, offered to Vikram, NOT built.

## Plan-variance backend done (same session, task_e44f1ba9 → D-11)
Task's naive plan-rollup proven degenerate (constant 100) → raised, Vikram approved uncapped-
achievement design. Migration 20260713100000 applied to staging (ledger 1:1), RPC verified
(CEO +0.18, B2B +6.42, locked → null), ranked panel re-based to true vs-plan. D-10 interim
basis superseded by D-11.
