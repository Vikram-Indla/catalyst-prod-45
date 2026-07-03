# Session 001 — Discovery, Council, Implementation

**Date:** 2026-07-03

## Sequence

1. Discovery-only sweep of Incident Hub (no code) — mapped folder structure, routing, DB schema, components, risks.
2. Ran /council (5 advisors + peer review + chairman) on: should the dormant native `incidents` table be activated, and how.
3. Chairman went further than the advisors and actually verified files — found the real state was worse/different than any advisor assumed: two live routed surfaces, one real (152-row Jira mirror), one dead-in-data-but-live-in-code (native `incidents`, 0 rows, open RLS).
4. Verified via staging SQL: confirmed 0 rows, no split-brain (code existed, data didn't).
5. RLS lockdown applied (staging only) — closed blanket `qual=true` write policies.
6. Built DB trigger model: major-incident auto-flag, SLA recalc on severity change, committee vote aggregation + auto-transition. Verified each via SQL end-to-end.
7. Fixed dead/wrong client-side priority & SLA constants in `incidentLifecycle.ts` (unused, diverged from DB truth).
8. User directed: "anybody can create incidents", "committee approval auto-transitions status", "don't worry about Jira sync", "assume there's always data", "build a model" (necessary calculations) → confirmed DB-trigger-layer scope via AskUserQuestion.
9. Attempted full migration scoping off `ph_issues` → discovered `ph_issues` is the universal work-item spine (~180 files), not incident-specific. Stopped, reported finding, reversed the "native becomes canonical" call to an **extension model** instead.
10. User: "don't worry about time constraint, deliver best feature within guardrails" → confirmed extension model, built it: `ph_issue_id` FK, backfilled 152 real incidents, auto-extend trigger for future rows.
11. Hit and fixed two real bugs during backfill: (a) filtered on `type_key` instead of actual `issue_type` string (0 rows silently), (b) SLA breach view trusted a column that defaults `false` on insert (false negative on all breaches), (c) blanket `status='open'` default made every historical incident look like it was breaching — fixed using real `status_category`.
12. Wired `useIncidentHub.ts` read path to real governance data instead of client-side heuristics.
13. User: "build [committee queue], this is the best of my UX" → discovered a fully-built `useCommitteeQueue.ts` + `CommitteeQueueTable.tsx` + `CommitteeQueueDrawer.tsx` already existed, correctly implementing veto/majority logic, but `CommitteeQueuePage.tsx` was wired to a different, broken, hardcoded-stub hook. Real bug was a wiring mismatch, not missing code.
14. Found the committee-queue route had been deliberately deprecated same-day (code comments referencing today's date). Flagged conflict to user before reviving — confirmed proceed.
15. Fixed ADS color-law violations in the two components being activated (Tailwind color utils + legacy hex-fallback alias tokens → `var(--ds-*)`).
16. Verified live in browser: real data renders, drawer works, no console errors, no regressions on adjacent pages (Dashboard errors present were pre-existing/unrelated).

## Key lesson for future sessions

Every "this looks broken/dormant" claim in this codebase turned out to need direct verification before acting — twice this session, what looked like a missing feature was actually a wiring bug (broken hook reference), not absent code. Grep for existing hooks/components by domain name before building anything new.
