# Allowed Edit Surface: test-hub / exp-002

**Date:** 2026-06-26
**Type:** research

> MANDATORY — filled before any work started.

---

## Allowed Files

Documentation only — no source code.

- [x] `docs/feature-builder/features/test-hub/current-state-audit.md`
- [x] `docs/feature-builder/features/test-hub/gap-analysis.md`
- [x] `docs/feature-builder/features/test-hub/target-catalyst-design.md`
- [x] `docs/feature-builder/features/test-hub/experiment-roadmap.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-002/hypothesis.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-002/allowed-edit-surface.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-002/baseline.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-002/research-notes.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-002/implementation-notes.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-002/validation-log.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-002/screenshot-notes.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-002/scorecard.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-002/decision.md`

---

## Forbidden Files

- All `src/` files — read permitted, write forbidden
- All `supabase/migrations/` files
- All `supabase/functions/` files
- All schema files
- `package.json` / `package-lock.json`
- `CLAUDE.md`
- `design-governance/`
- All route files
- All seed data files
- All production/staging data
- Any file NOT in the Allowed list above

---

## Edit Rules

1. Read access to `src/` permitted for research/discovery only — no modifications.
2. No DB queries executed.
3. No migrations run.
4. All findings go into doc files above only.

---

## Gate Status

- [x] Allowed edit surface filled before work started
- [ ] No files added mid-experiment without updating this document
