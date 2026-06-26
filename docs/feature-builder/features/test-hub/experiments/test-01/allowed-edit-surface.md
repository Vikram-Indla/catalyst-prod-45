# Allowed Edit Surface: test-hub / test-01

**Date:** 2026-06-26
**Type:** research

> MANDATORY — no implementation work may begin until this file is filled and reviewed.
> This is the Catalyst equivalent of Karpathy AutoResearch's constrained editable file.

---

## Experiment Type: RESEARCH — EDITABLE SOURCE SURFACE: NONE

This is a research/design experiment. No source code, routes, schema, migrations, package files, seed data, or production/staging data may be modified.

---

## Allowed Files (documentation output ONLY)

- `docs/feature-builder/features/test-hub/feature-intake.md`
- `docs/feature-builder/features/test-hub/catalyst-pattern-discovery.md`
- `docs/feature-builder/features/test-hub/current-state-audit.md`
- `docs/feature-builder/features/test-hub/external-benchmark-research.md`
- `docs/feature-builder/features/test-hub/gap-analysis.md`
- `docs/feature-builder/features/test-hub/target-catalyst-design.md`
- `docs/feature-builder/features/test-hub/experiment-roadmap.md`
- `docs/feature-builder/features/test-hub/experiments/test-01/*.md`

---

## Fixed Infrastructure (read-only)

- All `src/` files — components, pages, hooks, routes, types, utils, lib
- `supabase/migrations/` — schema changes need Gate 4
- `supabase/functions/` — edge functions need Gate 5
- `src/routes/FullAppRoutes.tsx` — route changes need Gate 6
- `src/components/layout/SidebarBase.tsx` — nav changes need human approval
- `package.json` / `package-lock.json` — dependency changes need human approval
- `CLAUDE.md` — governance doc, never modified
- All production/staging DB data, seed data, external AIO docs (read-only reference)

---

## Edit Rules

1. No `src/` file may be edited.
2. No DB queries (read or write) against production/staging.
3. Research tools allowed: Read, Bash (read-only), Grep, Glob, PDF reads.
4. No `git add`, no `git commit`, no schema changes, no DB writes.

---

## Gate Status

- [x] Allowed edit surface reviewed before work started
- [x] Research-only — zero src/ edits permitted
