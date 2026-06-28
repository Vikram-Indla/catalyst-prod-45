# CAT-TESTHUB-REPORT-REVAMP-20260627-001 — Plan Lock

> Status: **DRAFT** — Phase 1 (discovery) only. No code, no schema. Awaiting Vikram review.
> Template: docs/ways-of-working/CATALYST_PLAN_LOCK_TEMPLATE.md

## Feature Work ID
CAT-TESTHUB-REPORT-REVAMP-20260627-001

## Feature name
testhub report revamp

## Timebox
Discovery is multi-slice. Slice 1 (this Plan Lock) = **2 hours**: stand up the folder, run discovery
agents, populate `discovery/D1–D3` + sprint/release + test-artifact audits enough to draft the ERDs.

## Objective
Produce a complete, evidence-backed current-state discovery of Catalyst Test Hub reporting so the
revamp blueprint can be designed without assumption.

## Business outcome
Management can later answer release/sprint/project/product testing-status questions on real data —
but only after discovery proves the model. This slice produces the proof, not the build.

## Exact slice (what this Plan Lock covers)
- **Documentation + read-only probing only.** Populate `discovery/` and `contract/` from real evidence.
- Spawn the 7 parallel discovery agents → write results to `12_AGENT_OUTPUTS.md`.
- Read-only DB inspection (staging via `supabase db query --linked`; dev project `cyij`).
- Read-only code/route inspection of Test Hub reporting + lab.

## Non-scope (this Plan Lock does NOT cover)
- ANY schema change (table/column/view/RPC/trigger/RLS).
- ANY production or staging write.
- ANY upstream view-model change (story/feature/epic/defect/incident).
- ANY real data wiring (Phase 8).
- ANY new UI component or report build.
- Finalizing coverage formulas / status mappings (user-gated).

## Canonical components
- To be inventoried in `discovery/D2` + `02_CANONICAL_DISCOVERY.md`. JiraTable for work-item lists is mandatory candidate. No selection yet.

## Canonical screens
- Existing lab `/testhub/reports-lab` (`src/pages/testhub/reports/lab/`). Other report routes TBD in `D2`.

## Files to modify (this slice)
- `features/CAT-TESTHUB-REPORT-REVAMP-20260627-001/**` (docs only).
- No `src/` changes.

## Files forbidden
- Anything under `src/` (read-only this slice).
- Any migration / SQL file.
- The lab feature folder `CAT-TESTHUB-REPORTS-20260627-001/` (do not edit; reference only).

## UI/UX rules
- N/A this slice (no UI). Future slices: ADS tokens only, canonical components, JiraTable, no hand-rolled UI.

## Data/backend rules
- Read-only. PROD MCP must not be trusted for staging "empty" results. Cite every query.

## Integration/wiring rules
- None this slice.

## Parallel discovery agents (all run before blueprint)
Canonical Component Discovery · Canonical Screen Discovery · UI/UX Critic ·
Integration Architect · Data/Safety Guard · Implementation Planner · QA/Screenshot Validator.
→ outputs to `12_AGENT_OUTPUTS.md`.

## Karpathy loop hypotheses
- [LOOP-001] Sprint/iteration is a real stored field (not dummy) — measure by locating the table+column.
- [LOOP-002] Test cases link to stories (not directly to sprint/release) — measure by FK/link inspection.
- [LOOP-003] Coverage is computable today for at least one scope — measure by tracing a story→case→exec chain.

## Screenshot checklist
- [ ] Lab report current viewport (rails on) — baseline for the "reading mode" requirement.
- [ ] Each real report route, current state.

## Validation commands
```bash
npx tsc --noEmit        # must stay green (no src changes this slice)
npm run lint:colors:gate
```

## Regression risks
- None this slice (docs only). Risk register starts when blueprint proposes changes.

## Stop conditions
- Any unknown business meaning → log to `contract/` + `QUESTIONS_QUEUE.md`, stop and ask.
- Any temptation to change schema/src → stop.
- Banned color / hand-rolled UI / TS error in future build slices → stop.

## Rebaseline rules
After one correction loop: accept / split / rebuild / stop+revert.

## Commit rules
Stage explicit files only. Commit message references CAT-TESTHUB-REPORT-REVAMP-20260627-001.
Docs-only commit for this slice; no `git add -A`.

## Plan Lock status
**APPROVED (2026-06-27)** for Phase 1 discovery only — read-only code/DB probing + agents.
DB source of truth for discovery: **dev project cyij** (per Vikram). No code, no schema, no writes.
Subsequent build/schema slices still require fresh approval.
