# GAP REGISTER — CAT-TESTHUB-PROD-20260703-001

**746 gaps** across 14 domains, measured against the best-in-class composite (Xray · TestRail · Zephyr Scale · qTest · PractiTest — per D-001, NOT the AIO PDF pack). Every row: evidence (file:line) · vendor benchmark · concrete Catalyst-canonical fix · effort · phase.

## Severity totals

| Severity | Meaning | Count |
|---|---|---|
| **P0** | Broken or lying to users today | **117** |
| **P1** | Table-stakes missing vs any serious competitor | **422** |
| **P2** | Competitive differentiators | **370** |
| **P3** | Delighters | **189** |

(Counts include phase-column matches; unique gap rows = 746.)

## Shard index

| Shard | Domain | Gaps | Lead persona | Standout finding |
|---|---|---|---|---|
| [G01](gaps/G01_test_design_authoring.md) | Test design & authoring | 58 | TestRail | DB schema far ahead of UI — bulk edit, clone, labels, estimates, gherkin all built in hooks/schema with **zero UI callers** |
| [G02](gaps/G02_versioning_audit.md) | Versioning & audit | 50 | Zephyr/qTest | Runner executes LIVE steps; `locked_version` written but never read — runs lie about history; 4 parallel version writers |
| [G03](gaps/G03_planning_cycles.md) | Planning & cycles | 60 | Xray | Assignment table fabricates 85 fake rows w/ fake testers on error; clone-plan no-op stub; 7-value cycle status split-brain |
| [G04](gaps/G04_execution_ux.md) | Execution UX | 52 | TestRail | Step-result insert unchecked → success toast over missing data; offline save discards attachments; zero keyboard support |
| [G05](gaps/G05_defect_integration.md) | Defect integration | 50 | AIO | LogDefectModal is a Math.random() mock; runner has ZERO defect capability; QA-Bug vs tm_defects split-brain |
| [G06](gaps/G06_traceability_coverage.md) | Traceability & coverage | 50 | Xray | coverage_status hand-set, never computed; free-text requirement links, no picker, no FK; page ignores route project |
| [G07](gaps/G07_reporting_analytics.md) | Reporting & analytics | 53 | PractiTest | 7/10 report hooks swallow errors → fake zeros as data; default report full-scans org-wide; two analytics stacks disagree |
| [G08](gaps/G08_automation_ci.md) | Automation & CI | 50 | Xray | No JUnit/Cucumber ingestion, no API, no mapping keys — engineering-buyer credibility gate fully unmet |
| [G09](gaps/G09_ai_features.md) | AI assistance | 50 | — | Working Gemini pipeline has no auth, no quota, no usage ledger (table dropped); dead caty-* surface to remove |
| [G10](gaps/G10_admin_governance.md) | Admin & governance | 52 | — | /admin/test/* never built; CRE gate has zero TestHub entries; ModuleGuard UI-only, no backend enforcement |
| [G11](gaps/G11_ux_light_parity.md) | UX light-mode parity | 60 | Project module | 4 banned raw tables, broken sets row-click route, dynamic-table in Traceability, missing drawers/breadcrumbs/skeletons |
| [G12](gaps/G12_ux_dark_ads.md) | UX dark-mode + ADS | 55 | Color law | 95 Tailwind color hits, shadow-token-as-color ×10, unreadable .th-badge pattern, lint gate blind to all of it |
| [G13](gaps/G13_data_integrity.md) | Data integrity & wiring | 60 | — | 40 silent destructures, untyped `as any` tables, tm_cycle_sets has NO migration, race-prone defect keys |
| [G14](gaps/G14_collaboration_workflow.md) | Collaboration & review | 46 | PractiTest | No review/approval workflow, no comments/watchers/mentions on test entities despite canonical components existing |

## How to read a shard row

`| ID | Title | Severity | Current state (evidence) | Target (vendor) | Proposed fix | Effort S/M/L | Phase |`

Fixes marked `PLACEHOLDER:` need an answer (Vikram decision or cyij probe) — all collected in ARCHITECTURE_BLUEPRINT.md §8.
