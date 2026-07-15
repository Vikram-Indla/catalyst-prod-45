# Session 014 — Slice 3C · Import & Reconciliation (anchor 18, P3-D3 scoped)

**Feature Work ID:** CAT-STRATA-IMPL-20260712-001
**Date:** 2026-07-15
**Branch:** `strata/impl-phase01` (at `8855b7a69` = origin/main after 3B-3)
**Target:** Redesign `StrataExecutionImportPage.tsx` to the anchor-18 LAYOUT on the EXISTING dry-run/apply backend (P3-D3). **Last Phase-3 slice.**

## Anchor 18 re-read (DesignSync) + honest-scope reconciliation (NO drift — P3-D3 is the plan)
Anchor 18 depicts the FULL Jira reconciliation engine: DRY RUN header + Matched/Conflict/Unmatched summary
strip + conflict table (both-sides, "nothing auto-wins", Keep STRATA/Take Jira) + unmatched table (Create/Skip)
+ commitment strip with **24h undo** + run log. **None of that backend exists.**

**Reality:** `importApi.importExecutionBatch` is an **Excel batch** dry-run/apply RPC returning
`ExecutionImportResult` = per-sheet (project_cards/milestones/dependencies) `ExecutionImportRowResult[]`
(`status: valid|error`, `action: create|update`, errors[], warnings[]) + `summary{total,created,updated,rejected}`.
The current page is a working **6-step wizard** (Upload → Classify → Map fields → Preview & validate →
Confirm → Summary) with per-row validation tables already honest.

**P3-D3 scoped build (Vikram-confirmed):** bring the anchor's SIGNATURE presentation onto the honest model —
- **DRY RUN badge** in the preview header.
- **Summary strip** (`StrataStatStrip`): Will create / Will update / Rejected / Not-yet-written ("nothing is
  written until you apply") — the honest mapping of Matched/Conflict/Unmatched → created/updated/rejected.
- **Honest commitment strip** on confirm: re-import is idempotent (updates in place, never duplicates),
  full history in `strata_upload_runs` + audit — **NO 24h undo** (no revert RPC exists).
- **Role-gated Apply:** validate/confirm disabled when not an import role (owning roles named).
- **Preserve** upload/classify/map steps (data-acquisition mechanism; anchor's Jira source is aspirational)
  and the per-row `ResultTable`s (already the anchor's honest per-row validation model).
NOT built (no backend): Matched/Conflict/Unmatched three-way, both-sides conflict diff, 24h undo, run-log ledger.

## Log — DONE, gates green
- `StrataExecutionImportPage.tsx` edits (surgical, steps 0–2 upload/classify/map untouched):
  1. **Preview step (3):** DRY RUN `Lozenge` + `fileName` line + Download-error-report; **`StrataStatStrip`** summary
     (WILL CREATE[success] · WILL UPDATE[info] · REJECTED[danger when >0] · WRITTEN 0 "nothing is written until you
     apply") from `summary{created,updated,rejected}`; pass/fail `SectionMessage`. Per-row `ResultTable`s kept.
  2. **Confirm step (4):** honest **COMMITMENT** band (sunken) — apply writes in one batch; re-import idempotent
     (updates in place, never duplicates); history in upload run + audit; **NO undo** (anchor's 24h undo has no RPC).
  3. Primary buttons **role-gated** (`!hasImportRole` disables Preview & validate + Apply; owning roles named in the
     existing warning banner). "Confirm import" CTA relabelled **"Apply import"** (anchor language).
- Import to `shared`: added `StrataStatStrip`.

## Gates + verification
- `tsc` clean · `lint:colors:gate` 0=0 · `audit:ads:gate` 19799/19799 (no new offenders) · `lint:cre` passed.
- LIVE `/strata/execution/import` **upload step light + dark** — wizard shell/stepper unregressed; no console errors.
- **VERIFICATION LIMITATION (honest):** the redesigned **preview/confirm steps** (summary strip, DRY RUN badge,
  commitment band) sit behind a file upload. Chrome MCP `file_upload` only accepts user-shared paths, so a
  synthesized CSV/xlsx in the scratchpad is rejected — the preview step could NOT be driven live this session
  (same class of limit as Vitest not running). Preview-step redesign is verified by **tsc + all gates + code
  review**; all elements are proven canonical components (`StrataStatStrip`, `Lozenge`, `SectionMessage`,
  `JiraTable` `ResultTable`) with trivial count arithmetic. A live screenshot needs a user-shared STRATA import
  file. **Map zero-change.** Changed set: StrataExecutionImportPage.tsx + session 014 log.
- NOT built (no backend, P3-D3): Matched/Conflict/Unmatched three-way, both-sides conflict diff, 24h undo, run-log ledger.

## Phase 3 COMPLETE after this slice (3A·3B-0·3B-1·3B-2·3B-3·3C). Phase 4 (governance & data) = own Plan Lock.
