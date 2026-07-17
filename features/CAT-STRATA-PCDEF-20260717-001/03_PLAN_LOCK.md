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

## Deferred (remaining) — reported, not started/partial
- **PC-DEF-001** — require exactly one primary Strategic Objective on a governed project (+ safe remediation for Theme-only, no fabricated history). Column `objective_element_id` + `strata_link_card_objective` verb exist; needs a create/finalize-time governance gate + remediation surface.
- **PC-DEF-003** — governed closure prerequisites (alignment/ownership/delivery/threat/benefit/reason/actor/audit) replacing direct Planning→Completed. Needs a `strata_complete_project_card` RPC with prerequisite checks + closure evidence.
- **PC-DEF-005** — reachable governed lifecycle surfaces (submit/approve/SoD, review/decision, cancellation, benefit linkage, version/effective context, project audit history). Largely reachability/UI + a cancellation state (`cancelled` not yet a `delivery_status` picklist value — the PC-DEF-004 freeze already anticipates it).

## Safety
- No linked Supabase project in this worktree → no live DDL applied; migrations run in CI/staging under Codex regression ("zero-rows on rejected write" verified there).
- Isolated git worktree (one-session-one-worktree). Inherited SR-DEF changes preserved (branched from `origin/strata/sr-defect-pack`).
- ADS: no bare colors introduced; canonical `StrataFormModal`/`Button` reused.
