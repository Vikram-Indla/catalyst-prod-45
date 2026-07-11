# CONTRACT — CAT-STRATA-FOUNDATION-20260709-001 (frozen at Gate R1, 2026-07-09)

- **Subject**: Canonical STRATA product foundation — locked hierarchy, terminology, linkage model, navigation, data model, seeds, validation, smoke tests.
- **Goal of THIS phase**: research-only, implementation-ready baseline. NO source or DB changes.
- **Supplied sources**: SRC-001 = the user's locked STRATA goal text (authority: user-stated, to-be truth). Repo evidence = as-is truth (highest authority for current state).
- **Audience**: Vikram + future Claude Code build sessions (cold-start capable).
- **Source of truth**: SRC-001 for the to-be model; the repo (code + supabase/migrations) for as-is.
- **Exclusions**: no external/web research (spec is locked and self-contained); no live prod/staging DB queries this phase (repo migrations are the schema evidence; live verification deferred to build phase pre-flight); no UI mockups yet (mockup-first contract fires at build phase).
- **Outputs**: 02_CANONICAL_DISCOVERY.md (as-is map), 20_analysis (conflicts/assumptions), 40_requirements (REQ register + TRACE.csv), 60_delivery/FEASIBILITY (waves), 90_handoff (HANDOFF, IMPLEMENTATION-PROMPT, BACKLOG outline).
- **Definition of complete**: cold-start-capable handoff pack; every to-be requirement traced to SRC-001; every as-is claim traced to a file path; mechanical trace check passing; gaps/conflicts explicitly registered; Plan Lock NOT included (separate approval per operating contract).
- **Packaging**: latest-only, in-place updates.

## Amendments
- **A2 (2026-07-09, post-R3, user-directed)**: Design-discovery lane added — Mobbin MCP research authorized (exception to the 0-web-budget exclusion, MCP-only). Output: `50_design/DESIGN-DIRECTION.md` ("Command Room" direction, SRC-M1..M7). Build session must follow the approved direction; canonical-component gate still applies to every pattern.
- **A1 (2026-07-09, Gate R2)**: CON-002 answered "Decommission + migrate" — scope now includes migrating `/enterprise/objectives` (modules/objectives, modules/okr-v2, components/okr) data into `strata_*` and retiring those surfaces. Explicit user selection = re-approval of the scope growth. Research artifacts extended with REQ-022/023; implementation remains out of this phase.
