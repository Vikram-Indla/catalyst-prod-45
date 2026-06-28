# D14 — Gap List (for management-grade reporting)

> STATUS: 🟢 FIRST PASS. Gaps between current state and the revamp objective.

1. **Canonical source undefined** — no decision on tm_* vs th_* vs test_*; ph_issues vs ph_work_items. Blocks every report.
2. **Real test data absent** — tm_* near-empty; coverage/execution reports have nothing to aggregate.
3. **No Release→Sprint model** — release-level rollups (coverage, exec, defects per release) not computable.
4. **No scope resolver** — nothing maps project→release→sprint→story→test artifact into one report scope.
5. **No coverage engine** — denominator undecided; tm_requirement_links.coverage_status exists but unused at scale.
6. **No governance/mismatch detection** — no comparison of delivery status (ph_issues.status) vs test status.
7. **No personal/team reporting** — tester identity + QA-team derivation rule undefined (D13 pending).
8. **No factual AI insight layer** — none wired; lab insight panel is static.
9. **No full-width reading mode** — rails collapsible but no report focus mode; 1200px cap on detail.
10. **Traceability not surfaced upstream** — no Trace-From panels on story/feature/defect/incident views.
11. **Legacy report families not reframed** — 22 reports are flat tiles, not grouped by management query (project/release/sprint/product).
