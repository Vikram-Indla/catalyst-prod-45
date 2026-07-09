# Session 009 — Legacy OKR stack deletion (REQ-016/REQ-023) (2026-07-09)

## Delivered
- Deleted (git rm, 89 files): `src/modules/objectives/`, `src/modules/okr-v2/` (incl. StrategyCockpit + OKRHubV2), `src/components/okr/`, `src/pages/enterprise/EnterpriseObjectives.tsx`. Blast radius pre-checked: zero remaining importers (pills were extracted in session 008; "ProgramBoard" name-matches elsewhere are the unrelated program-board feature).
- Route retirement (REQ-023): `/enterprise/objectives` → `<Navigate to="/strata/strategy" replace />` (same pattern as the existing roadmaps/risks retirements); routeRegistry entry removed. DOM-verified on :8081 (lands on /strata/strategy).
- Regenerated `usage-map.generated.ts` (scan-components) and `ads-violations.generated.ts` (scan-ads-violations, was stale).
- **Baseline ratchet DOWN** (per CLAUDE.md): audit-baseline tokens 23571→22464 (−1107), typography 1450→1409 (−41). The deletion removed over a thousand tracked token violations.

## Validation
- tsc clean; 24/24 tests green (strata guards + sidebar + registry-drift + usage-map); color gate 0=0; audit gate at NEW lower baseline.
- Redirect verified live; Work Tree still renders (session 008 check + registry drift green).

## Pre-existing failure surfaced (NOT from this slice — left unfixed, out of scope)
- `banned-orphans` gate: `CatalystAssessmentFeatureField` JSX at `src/stories/enterprise/CatalystViewBase.stories.tsx:42` — file last touched 2026-06-15 (predates this feature). One-line story deletion; needs its own tiny slice or fold into the next commit Vikram approves.

## REQ status after this slice
- REQ-016 ✅ (StrategyCockpit + stacks deleted) · REQ-023 ✅ (route retired + redirect) · REQ-018 moot on staging (`public.scorecards` absent; no code refs) · REQ-019 open (Execution UI seams) · REQ-022 blocked on prod row counts (query in sessions/008).
