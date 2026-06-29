# Plan Lock — CAT-R360-ADS-TYPO-20260629-001

## Objective
Fix the staging-only status-pill typography regression introduced by the ADS migration so the work-item detail surface (`/for-you/r360` and all CatalystView* modals) reads clean like production.

## Root cause (confirmed in code)
- Staging = `main` @ 6ae84b310 (post ADS migration). Production = older build predating it.
- `CatalystStatusPill.tsx` hard-coded `font-weight: 700`, `letter-spacing`, `text-transform: uppercase` at the trigger (:55-57) and dropdown items (:495-497) → `IN REQUIREMENTS` / `REFINEMENT` / `BLOCKED` heavy uppercase vs production sentence-case.
- Description "bold" was a misread — body is `font-weight: 400`; the heavy wall is unparsed `\n`/`##` markdown, present in production too → OUT OF SCOPE.
- Different status *names* (REFINEMENT/BLOCKED) = per-env workflow data, not a defect → OUT OF SCOPE.

## Decision
- Pill colors: KEEP full-saturation (user confirmed 2026-06-29; honors prior guardrail).
- Typography only: `font-weight: 700 → 500`, remove `letter-spacing`, remove `text-transform: uppercase` (both occurrences). Canonical component → updates all 7 work-item types.

## Non-scope
- The 955-file spacing codemod / generic "crushed padding" — not reverted blind. Needs a specific surface + live evidence.
- Description markdown rendering (content pipeline, affects prod too).
- Pill color tier.

## Files modified
- `src/components/catalyst-detail-views/shared/sections/CatalystStatusPill.tsx` (only)

## Validation
- grep: zero `uppercase`/`700`/`letter-spacing` left in pill (group-heading letterSpacing retained, no uppercase).
- ADS color gate: unaffected (no colors added/removed).
- Live red→green DOM evidence on running app: PENDING app access.

## Stop conditions
- Commit gate: screenshot/live acceptance required before commit.
