# PLAN LOCK — CAT-AUDIT-FULLSWEEP-20260703-001

**Status:** ACTIVE (user consent "proceed" 2026-07-03 on the plan-mode consent gate)
**Execution allowed:** AUDIT ONLY + fix PLANNING. Code changes remain forbidden until per-PR approval.

## Objective
Full-sweep audit (see 01_OBJECTIVE.md). Audit-first; multi-PR fix strategy prepared but not executed.

## Timebox
Audit execution sliced per lane; each lane agent is one slice (<2h). Consolidation is one slice.

## Files to modify
ONLY `features/CAT-AUDIT-FULLSWEEP-20260703-001/**` (docs). Nothing else.

## Files forbidden
Everything under `src/`, `scripts/`, `design-governance/` (incl. baselines), `supabase/`, configs, CI workflows, `package.json`. Foreign dirty file `features/CAT-SPRINTS-NATIVE-20260702-002/03_PLAN_LOCK.md` untouchable.

## Method — 14 parallel audit lanes
1. CRE compliance (Grids A–I; focus under-enforced E5/F1/F3/H2)
2. Light mode / token drift (static)
3. Dark mode risk (light-only assumptions)
4. ADS compliance (shadcn vs Atlaskit census, Tailwind color utils)
5. Typography (audit:ads triage vs Grid H, Backlog/Board reference)
6. Component canonicalization (duplicates, hand-rolled UI)
7. Dialog/Drawer/Modal (419-file inventory, classification, a11y patterns)
8. Performance / bundle / heap (vite config, chunking, memoization, query cache)
9. Dead code / repo hygiene (knip/ts-prune in scratchpad, dormant/graveyard, dup page dirs)
10. Regression/QA/test coverage
11. Git/PR/CI standards
12. Cross-surface consistency (hub pattern matrix)
13. Accessibility (static + tooling)
14. Zero-assumption data rendering

## Validation commands (read-only)
`npm run lint:colors`, `npm run audit:ads`, `npm run lint:cre`, `npm run lint`, `npx tsc -p tsconfig.app.json --noEmit`, `npx knip`/`ts-prune` (scratchpad config), greps. Perf lane may run `npm run build:dev` with scratchpad outDir. No playwright (needs Storybook server), no live-browser probes this pass (no confirmed test login) — logged as coverage gap.

## Stop conditions
- Any lane requiring a write outside the feature folder → stop, log, skip.
- Any command that would touch DB/remote → forbidden.
- Context risk → write 07_HANDOVER.md and stop.

## Issue ID ranges (collision-free)
L1 0001–0099 · L2 0100–0199 · L3 0200–0299 · L4 0300–0399 · L5 0400–0499 · L6 0500–0599 · L7 0600–0699 · L8 0700–0799 · L9 0800–0899 · L10 0900–0999 · L11 1000–1049 · L12 1050–1149 · L13 1150–1249 · L14 1250–1299

## Drift / rebaseline
Any deviation from this lock → entry in 08_DRIFT_LOG.md before continuing.
