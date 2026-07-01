# Session 002 — Phase 2: DB Migrations

**Date:** 2026-07-01
**Feature Work ID:** CAT-SLUGS-UNIVERSAL-20260701-001

## What was done
- Verified actual table names: `boards`, `sprints` (project_id not project_key), `releases`, `teams`
- Confirmed existing display keys: `programs.key`, `tm_test_cycles.cycle_key`, `incidents.incident_key`
- Applied via `supabase db query --linked` (migration history out of sync, `db push` fails)
- `catalyst_slugify()` shared SQL function created
- `boards.slug` — 8 rows backfilled, 3 "Primary Board" deduped (primary-board, primary-board-2, primary-board-3), UNIQUE INDEX + trigger
- `sprints.slug` — 0 rows on staging, UNIQUE INDEX (project_id, slug) + trigger
- `releases.slug` — 0 rows on staging, UNIQUE INDEX + trigger
- `teams.slug` — 0 rows on staging, UNIQUE INDEX + trigger

## Verified on staging (cyij)
- `pg_indexes` confirms all 4 slug unique indexes: boards_slug_unique, sprints_project_slug_unique, releases_slug_unique, teams_slug_unique
- All 4 tables have slug triggers

## Key correction
- `sprints.project_key` does not exist — sprints uses `project_id` (UUID FK to projects)
- Migration files updated to match actual applied SQL

## Next: Phase 3
Route param updates + resolution hooks + call-site migration.
Requires separate Plan Lock review before starting.
High-risk phase (touches FullAppRoutes.tsx + 310+ call sites).
