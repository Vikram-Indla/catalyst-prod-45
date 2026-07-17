# Plan Lock — CAT-STRATA-PCDEF-20260717-001

**Feature:** Module 4 Project Cards confirmed P1 defects (PC-DEF-001..005)
**Branch:** `strata/project-cards-defect-pack` (base: `origin/strata/sr-defect-pack`, PR #350)
**Timebox:** 60 minutes, hard stop. Claude fixes only; Codex owns functional regression + closure.
**Evidence set:** `16_PROJECT_CARDS_MASTER_TEST_PACK.md`, `17_PROJECT_CARDS_DEFECT_REGISTER.md`, `18_PROJECT_CARDS_EXECUTION_LOG.md`, `19_PROJECT_CARDS_CROSS_MODULE_MATRIX.md`.

## Objective
Add **server-enforced** governance controls (RLS/RPC/state) for the five confirmed P1 Project Cards defects. UI hiding alone is insufficient. Do not create a second KPI/objective/benefit dictionary. Do not mutate approved definitions, locked snapshots, issued history, KPI actuals or Scorecard results. Preserve inherited SR-DEF pack changes.

## Scope delivered this timebox (server-enforced)
- **PC-DEF-004 — Terminal-state immutability** (`20260718100000_strata_pc_def_004_terminal_child_freeze.sql`).
  Table-level `BEFORE INSERT OR UPDATE` trigger `strata_guard_terminal_child()` on `strata_milestones`, `strata_risks`, `strata_dependencies` (requesting side), `strata_execution_links` (card's own edges). Rejects any child/evidence write when the owning card `stage IN ('completed','cancelled','archived')`. Directly closes the reported post-completion risk + dependency writes. Catches every write path, immune to future RPCs. DELETE/cascade unaffected. Corrections must be prospective/superseding (no reopen verb added → cannot loosen controls).
- **PC-DEF-002 — Governed KPI reuse** (`20260718110000_strata_pc_def_002_governed_kpi_reuse.sql`).
  New `strata_link_project_kpi(project, kpi, contribution, target_note, parent_theme_kpi)` — reuses an **approved** governed KPI only (mirrors `strata_link_element_kpi`), stores contribution/target context on the link `metadata`, rejects duplicates, never inserts into `strata_kpis`, never touches targets/actuals (official results unchanged). `strata_create_project_kpi` mint path **disabled** (raises + redirects). Client rewired: `executionApi.linkProjectKpi`; "New KPI" modal → approved-KPI reuse picker (canonical `StrataFormModal`, ADS-only).

## Scope delivered — slice 2 (`20260718120000_strata_pc_def_001_003_005_governed_lifecycle.sql` + client)
- **PC-DEF-001 — Strategic alignment.** Central `strata_guard_card_stage()` BEFORE UPDATE trigger requires a primary Strategic Objective (`objective_element_id`) before a card advances to `active`/`delivery`/`completed`. Theme-only cards stay in planning — no history fabricated. Client: "Set primary Strategic Objective" action wired to existing `strata_link_card_objective`.
- **PC-DEF-003 — Completion governance.** `strata_complete_project_card(project, reason)` enforces alignment + ownership (Business Owner + PM) + baselined dates + all milestones resolved + no open risks/blocking dependencies + separation of duties (completer ≠ creator) + reason + actor + audit. Direct Planning→Completed via the edit form is blocked (trigger + GUC-gated transition; terminal values removed from the editable status select). Client: governed "Complete" modal.
- **PC-DEF-005 — Governed lifecycle surfaces.** Governed `strata_cancel_project_card` (+ new `cancelled` delivery_status value), governed reversible `strata_link_benefit_project_card`/`unlink`, and terminal-immutability on the card row itself (closes the gap where a completed card's fields/objective were still editable). Client: "Cancel project" modal, terminal "Locked" state hides mutating actions; `executionApi.cardAuditHistory` (per-card audit read) added.

## Deferred (remaining) — reported
- **PC-DEF-005 sub-items:** dedicated **audit-history panel** and **benefit-linkage modal** in the detail UI (server verbs `cardAuditHistory` / `strata_link_benefit_project_card` exist and are reachable via the API; the visual panels are not yet mounted). Full **submit→approve** workflow with a distinct approver (SoD is enforced at completion; a separate approval gate is not yet modelled). **Version/effective-context** surfacing.

## Safety
- No linked Supabase project in this worktree → no live DDL applied; migrations run in CI/staging under Codex regression ("zero-rows on rejected write" verified there).
- Isolated git worktree (one-session-one-worktree). Inherited SR-DEF changes preserved (branched from `origin/strata/sr-defect-pack`).
- ADS: no bare colors introduced; canonical `StrataFormModal`/`Button` reused.
