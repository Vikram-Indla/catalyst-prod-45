# Allowed Edit Surface: test-hub / exp-001

**Date:** 2026-06-26
**Type:** research

> MANDATORY — filled before any work started. This is the Catalyst equivalent of Karpathy AutoResearch's constrained editable file.

---

## Allowed Files

Documentation only — no source code.

- [x] `docs/feature-builder/features/test-hub/feature-intake.md`
- [x] `docs/feature-builder/features/test-hub/catalyst-pattern-discovery.md`
- [x] `docs/feature-builder/features/test-hub/current-state-audit.md`
- [x] `docs/feature-builder/features/test-hub/external-benchmark-research.md`
- [x] `docs/feature-builder/features/test-hub/gap-analysis.md`
- [x] `docs/feature-builder/features/test-hub/target-catalyst-design.md`
- [x] `docs/feature-builder/features/test-hub/experiment-roadmap.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-001/hypothesis.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-001/allowed-edit-surface.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-001/baseline.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-001/research-notes.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-001/implementation-notes.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-001/validation-log.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-001/screenshot-notes.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-001/scorecard.md`
- [x] `docs/feature-builder/features/test-hub/experiments/exp-001/decision.md`

---

## Forbidden Files

- All `src/` files — no source code reads or writes that constitute changes
- All `supabase/migrations/` files
- All `supabase/functions/` files
- `src/routes/FullAppRoutes.tsx`
- `src/components/layout/SidebarBase.tsx`
- `package.json` / `package-lock.json`
- `CLAUDE.md`
- `design-governance/`
- Any global theme / CSS variable files
- Any seed data or production/staging data
- Any file NOT in the Allowed list above

---

## Edit Rules

1. Read access to `src/` is permitted for research/discovery only — no modifications.
2. All findings go into the doc files listed above. Never into src files.
3. If schema changes are needed: stop, request Gate 4 approval.
4. If route changes are needed: stop, request Gate 6 approval.

---

## Gate Status

- [x] Allowed edit surface filled before work started
- [ ] No files added mid-experiment without updating this document
