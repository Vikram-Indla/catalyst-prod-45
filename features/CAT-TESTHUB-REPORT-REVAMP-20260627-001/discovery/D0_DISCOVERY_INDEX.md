# D0 — DISCOVERY INDEX

> Read first in any discovery iteration. Jump to the live D-file. Update status as you go.
> Rule: every D-file holds **evidence only** (file path / table / route / query / screenshot). No proposals — those go to `../blueprint/`.

| File | Scope | Status | Last touched |
|------|-------|--------|--------------|
| D1_REPORT_INVENTORY | Existing reports: name, route, component, real-vs-mock, source | 🟢 FIRST PASS | 2026-06-27 |
| D2_ROUTE_COMPONENT_INVENTORY | Test Hub routes, report pages, shell/rail viewport control | 🟢 FIRST PASS | 2026-06-27 |
| D3_TABLE_INVENTORY | DB tables: projects/releases/sprints/work-items/test-artifacts/defects/incidents | 🟢 FIRST PASS | 2026-06-27 |
| D4_TECHNICAL_ERD | Real PKs/FKs/polymorphic/enums/RLS/views/RPCs | 🔴 EMPTY (after Q-001/Q-002) | — |
| D5_FUNCTIONAL_ERD | Business relationships validated vs data | 🔴 EMPTY (after Q-001..Q-003) | — |
| D6_DATA_FLOW | source → query → component today | 🔴 EMPTY | — |
| D7_DUMMY_DATA_AUDIT | mock/seeded/placeholder vs real | 🟡 covered in D1 (lab=seeded) | — |
| D8_SPRINT_RELEASE_LINK_AUDIT | sprint+release storage, links, active-detection | 🟢 FIRST PASS | 2026-06-27 |
| D9_TEST_ARTIFACT_LINK_AUDIT | case/step/set/cycle/exec ↔ work item/sprint/release/tester | 🟢 FIRST PASS | 2026-06-27 |
| D10_DEFECT_INCIDENT_LINK_AUDIT | defect↔exec↔story, incident↔coverage | 🔴 EMPTY | — |
| D11_COVERAGE_CAPABILITY_AUDIT | computable coverage + denominator candidates | 🔴 EMPTY (gated on Q-004) | — |
| D12_TRACEABILITY_CAPABILITY_AUDIT | Trace To / Trace From feasibility | 🟡 partial in D9 | — |
| D13_PERSONAL_TEAM_REPORTING_AUDIT | tester ID, assignment storage, QA-team derivation | 🔴 EMPTY | — |
| D14_GAP_LIST | what's missing for management-grade reporting | 🟢 FIRST PASS | 2026-06-27 |
| D15_CONTRADICTION_LIST | governance mismatches discoverable today | 🔴 EMPTY (gated on STATUS_MAPPING) | — |
| D16_DATA_QUALITY_RISKS | orphans, stale, ambiguous, migration risk | 🟢 FIRST PASS | 2026-06-27 |

## Discovery method (per staging/prod memory)
- MCP Supabase is **PROD-scoped**; read STAGING via `supabase db query --linked`. Never trust MCP-perm-error / anon-RLS as "empty".
- Dev app connects to Supabase test project **cyij**, not lmqw.
- Evidence-first: a "no such table" must be a real query result, not an assumption.

## Output discipline
- Anything unproven → `../contract/UNKNOWNS_REGISTER.md` + `QUESTIONS_QUEUE.md`.
- Any relationship → `../contract/RELATIONSHIP_MAP.md` with state.
- Any status/date/formula → matching `../contract/` file.
