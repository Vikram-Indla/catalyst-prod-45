# Phase C — Live Data Verification (cyij staging, 2026-07-05)

MCP supabase target confirmed = `https://cyijbdeuehohvhnsywig.supabase.co` (cyij).

## Root-cause fix proven: resolver picks REAL project, not seed
`useTestHubProject` ranks by active + most test cases. Live query:

| project | key | is_active | tm_test_cases |
|---|---|---|---|
| **Senaei BAU** | SENAEI-BAU | true | **92** ← resolver winner |
| Demo Project | DEMO | true | 12 (the old seed default) |
| Senaei BAU (dup) | BAU | true | 0 |

Before: pages used `useProjects()[0]` = Demo (12). After: resolver = Senaei BAU (92).
Cascade-fixes D001/D002/D003/D017/D031/D038/D051/D052/D057.

## Linkage backbone intact
- `tm_requirement_links` = 56 rows, **56/56 match ph_issues** (issue_key = external_key). Traceability + coverage panels render live, zero orphans.
- `ph_jira_sprints` = 30 (sprint pickers real). `tm_test_cycles` with sprint_id = 0 (data-absent, not a bug — new cycles via fixed CyclesPage will populate).

## Defect source unified (D038/D051)
- `ph_issues` bug/defect rows = **0** → tm_defects is the ONLY defect source. Register's "703" was stale seed data, no longer present.
- `tm_defects` total = 15 (Senaei 13, Demo 2). Both Reports + Defects page now scope to Senaei via resolver → same source, no split.
- Status breakdown: **open 8**, in_progress 3, resolved 2, closed 2.

## D052 confirmed real (Wave 3 Agent G fixing)
Summary "OPEN" was counting closed+resolved as open (would show 13). Correct open = 8.

## AI generator context data present
- Defects (regression mode): 15 rows.
- Incidents (validation mode): 153 rows.
- Work items + ACs: via ph_issues (56 linked, more unlinked).
AI edge fn `ai-generate-test-artefacts` (Claude claude-opus-4-8) built + frontend rewired; **needs deploy + ANTHROPIC_API_KEY secret to activate** (see AI_MODEL_FACTS.md).

## Sprints (user directive: "read from project module sprints section, driven by field sprint/iteration")
- Canonical = `ph_jira_sprints` (30). Story sprint now reads live `ph_issues.sprint_release` JSONB name-join (L006). Cycle sprint picker reads ph_jira_sprints only; iterations never wired (empty SAFe model).
