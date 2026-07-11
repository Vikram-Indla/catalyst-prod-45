# HANDOFF — CAT-STRATA-FOUNDATION-20260709-001 (research phase complete)

## Executive summary

The locked STRATA goal (Strategy Cycle → Strategy Execution / Balanced Scorecard / VMO / Governance) is **~85–90% already implemented** in this repo as `src/modules/strata/` + 60 `strata_*` tables (built 2026-07-05/06, live at `/strata/*`, flag `strategy_hub` + role `enterprise`). The build is a **gap-closure refactor**: rename residual "Play charter" surfaces, regroup navigation into the four canonical areas, verify/add three linkage edges (card→objective, project-objective→strategic-objective, project-KPI→OKR), codify the already-absent Theme↔Portfolio ban, align BSC/VMO/Governance labels, resolve the duplicate legacy OKR stacks, seed the full chain, and add smoke tests. **Do not build a new module. Do not create parallel terminology.**

## Cold-start Q&A (from files alone)

- **What is being built and why?** → `10_sources/raw/GOAL.md` (SRC-001, verbatim locked goal) + `01_OBJECTIVE.md`.
- **What exists today?** → `02_CANONICAL_DISCOVERY.md` (full as-is map with file paths, tables, migrations).
- **Top-priority REQs with AC?** → `40_requirements/REQUIREMENTS.md` (P0: REQ-001, 004, 007–010, 012, 020, 021) + `TRACE.csv`.
- **Data model & access model?** → `02_CANONICAL_DISCOVERY.md` §A3/§B (tables, FKs, triggers, RLS pattern §C6).
- **What's wave 1?** → `60_delivery/FEASIBILITY.md` (W0 decisions/probes, then W1 terminology+IA).
- **Explicitly out of scope?** → `00_admin/CONTRACT.md` exclusions; legacy `public.projects` project-hub, Work Hub/Portfolio "Theme" collisions (unrelated concepts — untouched); ideation module.
- **Open assumptions/decisions?** → `20_analysis/ASSUMPTIONS.md` (ASM-001..008) and `20_analysis/CONFLICTS.md` (CON-001 play rename depth, CON-002 duplicate OKR stacks, CON-003 hub vs standalone, CON-006 Astryx deletion — **need Vikram**).

## Source-of-truth note

SRC-001 (locked goal) governs the to-be model. Repo code + migrations govern as-is. On any clash between this pack and the repo at build time, re-probe the repo — it may have moved (there is an active STRATA isolation workstream, `CAT-STRATA-ISOLATE-20260707-001`, and a `strata-standalone` git stash).

## Hard gates before code

Per the Catalyst Operating Contract: 03_PLAN_LOCK.md must be written and approved (it does not exist yet — deliberate); mockup-first contract for UI changes; ADS tokens only; screenshot signoff; explicit file staging; migration ledger discipline; live-DB `project-ref` check before any linked DDL.
