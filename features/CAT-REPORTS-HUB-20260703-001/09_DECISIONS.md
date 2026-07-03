# DECISIONS — CAT-REPORTS-HUB-20260703-001

## D-001 (2026-07-03) — Kill-decisions approved by Vikram ("proceed")

1. **Reports Lab shell = the single reporting chassis.** Standalone report pages die after their data hooks are ported into the report registry.
2. **ReportDetailPage.tsx (1366 LOC) dies.** Its 22 report calculators become registry entries rendered in the chassis. No hand-rolled `<table>` survives.
3. **Sidebar: one "Reports" entry.** ✦ glyph deleted. Old 9 routes redirect to `/testhub/reports/:reportSlug`.
4. **Incident content leaves TestHub** → `/incident-hub/reports` (CRE Grid A: Production Incident → INCIDENT module). TestHub keeps a defects-only quality report.
5. **ECharts deferred behind proof gate.** Recharts 3 + `--ds-chart-categorical-1…8` ADS tokens are the chart engine. ECharts 6 admitted only when a named wired report measurably breaks recharts.
6. **AI narratives per-report, only after that report's data is PROVEN.** Cross-module AI narratives wait for Phase 4 traceability tables. No AI on unproven or mock data (zero-assumption law).

Rationale + evidence: `COUNCIL_VERDICT_AND_PLAN.md` (13-agent council, 2026-07-03). This entry resolves the b56e927d1/6a1aacc07 deprecate-revert fork permanently.

## D-002 (2026-07-03) — Phase 0 authorized

S0.1 DATE_SOURCES proof (staging cyij, read-only), S0.2 gap verdicts, S0.3 disposition matrix. Implementation beyond Phase 0 requires Plan Lock approval.

## D-003 (2026-07-03) — Full-program autonomy

Vikram: "make best of the decisions for me run all the phases with no interruption."
- Plan Lock approved as amended; Phases 1–3 + light Phase 4 run end-to-end.
- Per-slice screenshot signoff waived → per-phase automated gates (tsc, lint:colors:gate, audit:ads:gate) + end-of-run evidence.
- Commits per phase on current branch catalyst/infallible-lewin-2f8a58, explicit file staging only.

## D-004 (2026-07-03) — Status-history capture DDL DEFERRED

Only true schema gap (transition dates; changelog empty). Adding ph_issue_status_history mid-program = migration risk during a large UI push. Deferred to its own feature. Consequence stands: MTTR / closure-trend / governance-timing reports stay CUT.

## D-005 (2026-07-03) — Phase 4 scope (light)

No DDL. Ship: consume existing ph_issue_links in traceability reports; defect→release derivation via parent_key/sprint_release; cross-links between Reports hub ↔ Incident Hub ↔ Project Hub dashboards. ECharts stays proof-gated (not admitted this program).
