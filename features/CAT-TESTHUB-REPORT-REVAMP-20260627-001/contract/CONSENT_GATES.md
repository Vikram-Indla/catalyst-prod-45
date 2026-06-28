# CONSENT GATES

> Every invasive change needs explicit, logged user consent BEFORE it happens.

| Gate ID | Change | Class | Why | Risk | Rollback | Requested | Consent | Evidence |
|---------|--------|-------|-----|------|----------|-----------|---------|----------|
| G-001 | Seed realistic tm_* test data in **cyij (dev)** | data write | D-004: reports need data to demonstrate | overwrites/adds demo rows in cyij tm_*; dev only, never prod | delete seeded rows by tag/batch id | 2026-06-27 | **APPROVED (D-007, 2026-06-27) — Senaei BAU anchor, tagged batch REVAMP-DEMO-20260627** | pending |

> No prod writes ever. cyij only. Seed rows must be tagged (e.g. a batch marker) for clean rollback.

| G-002 | Add Trace-From (test coverage) panel to story/issue detail view | upstream view-model edit | B4 traceability — surface coverage + linked tests on the story | regression risk on shared detail component | remove the panel component + its mount line | 2026-06-28 | **APPROVED (option 3)** | ✅ built+committed b8dd0f971 |
