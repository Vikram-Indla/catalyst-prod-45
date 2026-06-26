# Session 003 — Phase 1: Repository proper

**Date:** 2026-06-26
**Branch:** main (Phase 0 committed 519e39a18, pushed)
**Goal:** Repository CRUD — folders (tree + system-folder rules), cases (create/edit via CatalystViewBase per D4), Classic+BDD steps, versions, native case SVG icon.

## Sub-slices (each → live proof → sign-off)
- 1a: Folder tree CRUD (create/rename/delete-with-child-check/move) + system folders All/Not Assigned immutable + case_count.
- 1b: Case create/edit (CatalystViewBase), details bound to tm_case_priorities/types + status enum, Classic+BDD steps persist to tm_test_steps.
- 1c: Versions (create/list/latest) + native case SVG icon via icon registry.

## Open decision (surface in this phase)
Archive mapping: status='deprecated' vs new tm_test_cases.archived column. Needs Vikram.

## Progress
- Spawned Repository wiring-map probe.
