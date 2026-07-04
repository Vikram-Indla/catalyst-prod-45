# COUNCIL VERDICT: Reports Hub Consolidation & Enterprise Reporting Layer

**Feature Work ID:** CAT-REPORTS-HUB-20260703-001
**Council run:** 2026-07-03 — 8 discovery agents + 5 advisory panel agents (13 total)
**Status:** VERDICT DELIVERED — Plan Lock NOT yet approved. No code until Vikram approves Phase 0.
**Related features:** CAT-TESTHUB-REPORT-REVAMP-20260627-001 (Reports Lab), CAT-WORKFLOW-STUDIO-20260702-001

---

## 0. EVIDENCE BASE (discovery summary — all verified against repo)

### The reality vs the brief

| Brief assumption | Verified reality |
|---|---|
| "Make all these reports real" | The 7 standalone reports (Project Status, Sprint Status, Tester Perf, Team Perf, Defects & Incidents, Governance, Product Status) are **already real-data** — Supabase queries against `ph_issues`, `tm_*`, `profiles`, `ph_jira_sprints`. The mock-data problem is **Reports Lab only** (21 reports, `useSeededTestReportData.ts` 525 LOC, zero DB reads). |
| "Replace every component with canonical" | Standalone reports already use JiraTable + @atlaskit/select + Lozenge, **0 hardcoded colors**. The violation surface is `ReportDetailPage.tsx` (**1366 LOC, hand-rolled HTML tables**) + hub landing tile widths + Lab shell internals. |
| "Statuses must be canonical" | Canonical source exists: `ph_workflow_statuses` (category: todo/in_progress/done) + `StatusPill` from `JiraTable/cells`. ⚠️ `ph_workflow_statuses.color` is a hex column — UI must map **category → Lozenge appearance**, never consume the hex. ⚠️ `modules/in-jira/StatusPill.tsx` is deprecated (banned Tailwind) — do not import. |
| "Use access management for assignees" | Canonical: `ProfilePicker` (`src/components/ads/ProfilePicker.tsx`, single source, replaces 8 legacy pickers) + `CatalystAvatar` + `useUserModulePermissions` (3-tier: profile override → role defaults → super-admin bypass). |
| "Move incident report to incident module" | Rule-backed: **CRE Grid A (2026-07-01): Production Incident → INCIDENT module.** Incident Hub is mature (`src/modules/incidents/` analytics+kanban+api) and has an **unmounted Reports route** (deprecated 2026-06-23) ready for re-mount. |
| "Why does Reports Lab exist" | CAT-TESTHUB-REPORT-REVAMP-20260627-001: built additive-first with **100 business rules + 38 formulas + full schema audit**, real-data wiring **deliberately deferred** because DATE_SOURCES contract is marked **ASKED not PROVEN** and UNKNOWNS_REGISTER has open items (`tm_defects.linked_work_item_id`, retest-rate schema, blocked aging). Deprecation of old landing committed b56e927d1, **reverted 4 minutes later** (6a1aacc07) — fork never resolved. |

### Assets already in repo (do NOT rebuild)

- **Widget framework:** `widget-registry.ts` + `DashboardWidgetGrid` + `dashboard_widget_config` (per-user span 1–12, drag-drop) — the pluggable-bed pattern, proven in Project Hub.
- **Persistence:** `tm_saved_reports` (report_type, parameters JSONB, tags, is_shared) + `tm_saved_filters` — already migrated.
- **Charts:** recharts 3.5.1 in 30 files; `--ds-chart-categorical-1…8` + full ADS data-viz token ramps **already shipped in @atlaskit/tokens, unused**.
- **Export:** papaparse / exceljs / jspdf(+autotable) / pptxgenjs / html2canvas behind `src/lib/exportLoaders.ts` dynamic chunks.
- **AI:** 22+ edge functions (Gemini gateway primary, Claude Haiku for post-mortem/deploy), streaming NDJSON proven in `ai-improve-story`, `release-notes-generate` + `ai-digest` + `standup-summarize` exist, `tm_ai_usage_log` audit, `ReportInsightPanel` stub already in Lab shell, `TicketKeyChip` for inline entity links in AI output.
- **Typography contract:** CRE Grid H `CANONICAL_ROW_TYPOGRAPHY` — key `var(--ds-font-size-300)`/20px, title `var(--ds-font-size-400)`/20px; reuse `makeKeyCell`/`makeSummaryCell` from `JiraTable/cells.tsx`.
- **Traceability that exists:** `defect_links`, `th_test_case_links`, `tm_defect_links`, sprint_id FKs (2026-06-26), `sprint_release` JSONB GIN-indexed, `parent_key`, `rh_release_work_items`.

### Traceability gaps (DB ceiling on enterprise reporting)

| Gap | Impact | Verdict needed |
|---|---|---|
| No normalized `ph_issue_links` (blocks/relates in raw_json only) | Dependency reports impossible | migrate or cut |
| `tm_test_cycles` ↔ sprint/release: no FK | Sprint test-readiness report degraded | add `sprint_id` FK |
| defect → release: indirect only (via parent story) | Release quality gate report degraded | derive or denormalize |
| incident → root-cause work item: missing | Incident RCA lineage report impossible | add column |
| `tm_defects.linked_work_item_id` unconfirmed | Lab defect-impact report blocked | prove in S0 |

---

## 1. WHERE THE PANEL AGREES (high-confidence signals)

1. **The premise is inverted.** This is not "make reports real" — it is "resolve the fork between two report systems." Real-thin (standalone) vs fake-rich (Lab). All five advisors converged independently.
2. **The 4-minute revert is the tell.** Nobody declared a winner. Consolidating before that decision is locked risks a third parallel system.
3. **The prettiest surface lies** (Fresh Eyes, Challenger, Root-Cause): 21 polished Lab reports with fabricated numbers behind a small chip is a trust poison. Screenshot-into-status-meeting risk is real. Zero-Assumption Data Rendering law applies to the whole Lab surface.
4. **Data contract before UI.** DATE_SOURCES = ASKED-not-PROVEN is the root blocker. Every rich report built on unproven fields is rework.
5. **AI reporting waits for real data + link tables.** AI narratives on missing traceability = confident hallucination — direct violation of zero-assumption law.
6. **Incident move is week-1 work, rule-backed, low-risk** (CRE Grid A + unmounted route waiting).
7. **The pluggable bed is 60% built** — generalize widget-registry, don't invent.

## 2. WHERE THE PANEL CLASHES

- **Root-Cause vs Action Coach on sequencing:** Root-Cause says refuse ALL UI work (incl. ReportDetailPage refactor) until the winner is declared; Action Coach schedules incident-move and skeleton work in week 1 parallel to data-proof. **Resolution:** the winner-declaration is a decision (30 min in 09_DECISIONS.md), not a workstream — make it in Phase 0 alongside S0.1, then both are satisfied.
- **Challenger vs Opportunity on AI timing:** Challenger wants AI cut until traceability lands; Opportunity wants the AI narrative in the week-1 wedge report. **Resolution:** wedge report's AI narrative uses only PROVEN single-module data (sprint scope/status/points from ph_issues) — no cross-module lineage claims. Traceability-dependent AI defers to Phase 4.
- **ECharts:** research says add now for heavy surfaces; Challenger says proof-gate it. **Council sides with Challenger:** recharts + ds-chart tokens first; ECharts admitted only when a named report with real data measurably breaks recharts.

## 3. WHAT THE PANEL CAUGHT THAT WAS MISSED

- "Project Status / Product Status / Sprint Status" under **Test** Hub are misnamed — they are test-coverage reports, not PM reports. Naming collision with Project Hub dashboards erodes trust (Fresh Eyes).
- Alphabetical default project silently shows the wrong project's data with full confidence (Fresh Eyes).
- The ✦ glyph communicates nothing; delete it.
- Three reporting surfaces (TestHub reports, Project Hub dashboard, Incident Analytics) have **zero cross-links** — the hub should link out, not absorb them.
- `TicketKeyChip` carries `var(--ds-*, rgba(...))` fallbacks — color-law violation to sweep during Phase 1.
- Report registry generalization benefits three surfaces (reports hub, project dashboards, incident analytics) — platform effect undersold in the original ask.

## 4. CATALYST-SPECIFIC FLAGS

- ⛔ `ph_workflow_statuses.color` hex column must never reach the UI — map category→Lozenge.
- ⛔ ReportDetailPage hand-rolled `<table>` violates JiraTable rule — scheduled kill.
- ⛔ ECharts canvas theming bridge (getComputedStyle) must re-read on `data-color-mode` mutation — dark-mode probe method memory applies (reload-into-dark verification).
- ⛔ New hub route must follow Slug Contract (no :id params) + CRE Grid E (CatalystListPageLayout L1 / AtlaskitPageShell L2, ProjectPageHeader trail; CatalystPageHeader banned).
- ⛔ Lab keeps a **DEMO DATA banner** (SectionMessage, warning) until each report is wired — chip is insufficient.
- ⛔ All DDL targets staging cyij; prod lmqw only on explicit instruction.
- Screenshot signoff per UI slice; `lint:colors:gate` + `audit:ads:gate` per commit; stage explicit files only.

## 5. THE RECOMMENDATION

**PROCEED WITH MODIFICATIONS.** Not a data-realness project — a **fork-resolution + consolidation program** with a wedge deliverable to prove the end-state fast.

Kill-decisions to write into 09_DECISIONS.md immediately:
1. **Reports Lab shell = the single reporting chassis.** Standalone report pages die after their data hooks are ported into the registry.
2. **ReportDetailPage.tsx (1366 LOC) dies** — its 22 report calculators become registry entries rendered in the chassis.
3. **Sidebar: one "Reports" entry.** ✦ deleted. Old routes 301-redirect.
4. **Incident content leaves TestHub** to `/incident-hub/reports` (CRE Grid A). Defects-only report stays in TestHub.
5. **ECharts deferred behind proof gate.** Recharts + `--ds-chart-*` tokens are the engine.
6. **AI narratives ship per-report only after that report's data is PROVEN**; cross-module AI waits for Phase 4 traceability.

---

## 6. ACTION PLAN (2-hour slices; done-when per slice)

### PHASE 0 — Prove or stop (blocks everything; ~3 slices)
- **S0.1 Data-contract closure.** Run real staging-cyij queries for every DATE_SOURCES field + UNKNOWNS_REGISTER item; mark each PROVEN/MISSING with query evidence pasted into the contract doc. *Done when: DATE_SOURCES has zero ASKED rows.*
- **S0.2 Gap verdicts.** For ph_issue_links / cycle↔sprint / defect→release / incident→root-cause / tm_defects.linked_work_item_id: decide migrate / derive / cut-report. Each verdict = Plan Lock line. *Done when: every gap has a written decision.*
- **S0.3 Winner declaration + report disposition matrix.** 09_DECISIONS.md entry: Lab shell wins; per-report matrix (21 Lab + 7 standalone + 22 detail types → keep/merge/cut; expect ~12–15 survivors, duplicates merged). *Done when: matrix approved by Vikram.*

### PHASE 1 — Skeleton (~5 slices, sequential)
- **S1.1 Report registry contract.** `ReportDefinition { id, label, category, module, dataFetcher, calculator, component, defaultSpan, usesDateRange, usesFilters, status }` generalizing widget-registry; renderer with Suspense + error SectionMessage + empty-state (@atlaskit/empty-state). One existing real report rendered through it. *Done when: Sprint Status renders via registry, tsc clean.*
- **S1.2 Hub shell mount.** Lab navigator + ribbon + filter bar mounted at `/testhub/reports` (single route, `:reportSlug` param per Slug Contract); sidebar collapsed to one "Reports" item; old 9 routes redirect. *Done when: screenshot signoff + redirects verified.*
- **S1.3 Canonical table sweep.** JiraTable (with `makeKeyCell`/`makeSummaryCell`, Grid H typography) replaces all hand-rolled tables inside chassis; CatalystAvatar + JiraIssueTypeIcon + ProjectIcon + StatusPill(cells) everywhere; TicketKeyChip rgba-fallback fix. *Done when: no `<table>` outside JiraTable in reports tree; lint gates clean.*
- **S1.4 Chart theming.** `ADS_SERIES` from `--ds-chart-categorical-1…8`; shared `ReportChart` wrappers (Line/Bar/Area/Pie) over recharts with token grid/axis/tooltip; dark-mode verified by reload-into-dark. *Done when: one chart screenshot in light+dark, gates clean.*
- **S1.5 Project context fix.** Default project = active project context (not alphabetical); empty-state when none. *Done when: verified behavior.*

### PHASE 2 — Wiring (3 parallel lanes, ~9 slices)
- **Lane A (3):** Port 7 standalone report hooks into registry entries; delete standalone pages + routes. *Done when: parity screenshots, old files deleted (move-not-copy).*
- **Lane B (4):** Wire surviving Lab reports to real `tm_*`/`ph_issues` queries per the 38 formulas; DEMO banner removed per report only when wired; unwired reports hidden from navigator. *Done when: `useSeededTestReportData` deleted.*
- **Lane C (2):** Incident move — mount `/incident-hub/reports`, extract incident metrics + open-incidents table + regression-gap hook into `modules/incidents/analytics`; TestHub page becomes Defects (quality) report; cross-links both ways. *Done when: incident content renders in Incident Hub, deleted from TestHub report.*

### PHASE 3 — Rich + wedge (~4 slices)
- **S3.1 WEDGE: Sprint Report end-to-end** — chassis + real data + ADS charts + AI narrative (single-module, proven fields only, streaming into ReportInsightPanel via new `report-insights` edge function logging to `tm_ai_usage_log`) + PDF/CSV export via exportLoaders. *Done when: demo-able on staging with screenshot set.*
- **S3.2–3.3** Roll AI narrative + export to remaining wired reports (template from wedge).
- **S3.4** Saved reports UX on `tm_saved_reports` (save params, shareable slug link).

### PHASE 4 — Traceability + enterprise (schema work, per S0.2 verdicts)
- Migrations (staging first): `ph_issue_links` normalized table, `tm_test_cycles.sprint_id`, incident root-cause link, defect→release derivation view.
- Unlocked marquee reports: Release Readiness, Quality Gate, Incident RCA lineage, cross-module traceability matrix.
- Cross-module AI narratives (release/project level) — only now.
- ECharts proof gate review: if a named wired report (heatmap/10k+ points) measurably breaks recharts, admit tree-shaken ECharts 6 + own wrapper + getComputedStyle bridge + `vendor-echarts` chunk. Also: drop dead `d3` dep.

### Explicitly deferred / cut
- "Enterprise re-architecture" as a standalone item — dissolved into Phases 1–4 acceptance criteria (no unfalsifiable scope).
- Tremor / Highcharts / AG Charts / @atlaskit/charts — rejected (license, paywall, Tailwind coupling, abandoned).
- Third report system of any kind.

## 7. THE ONE THING TO DO RIGHT NOW

**S0.1 — prove the DATE_SOURCES contract with real queries against staging cyij.** Two hours. Every other slice depends on it, and it is the single act that converts Reports Lab from a liability into a chassis.

---

*Council artifacts: 8 discovery reports (reports inventory, Reports Lab audit, data layer, canonical UI/CRE, incident module, TestHub bed, chart research, AI/traceability) + 5 advisor memos (Challenger, Root-Cause, Opportunity, Fresh Eyes, Action Coach) — full transcripts in session task outputs 2026-07-03.*
