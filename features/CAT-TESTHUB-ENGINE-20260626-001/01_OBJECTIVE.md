# 01 — OBJECTIVE

## Goal
Prove and complete a strong, native Catalyst Test Management Suite with real DB wiring, validated through the UI.

## In scope
- Repository: Folders (tree, system folders), Test Cases (Details/Steps/Versions/Datasets), Case Types/Priorities/Statuses.
- Sets: reusable case groupings, version-pinned membership.
- Cycles: create, add cases/sets, assignees, planning.
- Execution: run a case in a cycle, step-level results, 5-status percolation, evidence, effort timer, cycle rollups. **Key prove-it surface.**
- Defects: project QA-bug work items (`ph_issues`) in a JiraTable with project filter; raise/link from execution.
- Traceability: link a case to ANY project work-item type; coverage matrix.
- Admin module: customization (statuses/priorities/types/run-statuses/custom fields/permissions) + Access-Management module wiring.
- Native SVG icon set for test entities via the icon registry.
- Fresh DB seed (wipe existing `tm_*` test data on cyij, reseed curated realistic data). Do NOT wipe `ph_issues`/`profiles`/`releases`.

## Out of scope (explicit)
- Reports (`/testhub/reports/*`).
- Dashboard (`/testhub/dashboard`).

## Definition of done (per phase)
Vertical slice: a working frontend surface + proof the read/write wiring hits the live DB (DOM/network/SQL evidence), screenshot acceptance, user sign-off.
