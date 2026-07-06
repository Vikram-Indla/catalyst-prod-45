# Release Ops — Phase 8: Incident / Defect Execution Linkage UX

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 8
**Date:** 2026-07-06 · **DB:** staging cyij · **Build:** `tsc` clean · `npm run build` PASS. No drawers. No migration (lineage columns already exist). No Folio/wiki files touched.

## Reuse of existing create flows (§correction)
Nothing was rebuilt. Contextual raise **reuses the existing global modals + plumbing**:
- **Incident** → renders the existing `CreateIncidentModal` and reuses `useCreateIncident` (from `@/hooks/useIncidents`); after create, `RaiseIssue` writes the Release-Ops lineage onto the new `incidents` row.
- **Defect** → renders the existing `CreateStoryModal` with `defaultWorkType='QA Bug'` (the canonical QA-Bug → `tm_defects` path) + `initialSummary` seed; on `onSuccess(issueKey)` it writes lineage onto the `tm_defects` row by key.
- The global top-nav Create Defect/Incident remain untouched.

## Files delivered
- `src/components/releasehub/issues/RaiseIssue.tsx` (new) — contextual launcher; reuses both existing modals + writes `source_release_id` / `source_change_id` / `source_sop_step_id` / `source_production_event_id` / `raised_during_change_execution` (+ defect `environment`). `defaultIssueKind()` = validation step → defect, else incident.
- `src/components/releasehub/detail/ChangeCockpitSections.tsx` — Incidents & defects card upgraded to a **ledger** (counts: incidents/defects/open/critical; per-row type/key/title/severity/status/source-SOP-step; Raise incident / Raise defect actions; educational empty state).
- `src/components/releasehub/detail/SopRunbook.tsx` — step rows show a linked-issue indicator (count + severity tone) and per-step **Raise incident / Raise defect** actions.
- `src/pages/releasehub/ChangeDetailPage.tsx` — wires RaiseIssue + builds lineage context (change/release/SOP-step/env) + `issuesByStep` map.
- `src/hooks/useReleaseHub.ts` — `useChangesList` batches incident/defect counts by `source_change_id` → `ChangeListRow.issueCount`.
- `src/pages/releasehub/ChangeExecutionBoard.tsx` — board card issue marker (⚠ count, red when incidents present).

## Incident vs defect model (§2)
Incident = operational break during/after deploy (outage, failed deploy, rollback, degradation). Defect = validation/QA/UAT/smoke failure (product issue). SOP-step-typed launch defaults accordingly (validation → defect, deploy/other → incident) but the user can still choose. Both retain release → change → SOP-step lineage; existing Incident Hub + Test Hub defect model untouched.

## Change Detail issue ledger (§5)
Counts (incidents / defects / open / critical) + rows (Incident/Defect label, key, title, "from SOP step" marker, severity, status, critical-bordered) linking to Incident Hub / defect detail; empty state explains incident-vs-defect. Verified live: INC-154 (SEV3, Open) + DEF-RO-8841 (critical) on CHG8841.

## SOP step issue linkage (§6)
Each step row shows an "N issues" indicator (severity-toned) when it has linked incidents/defects (via `source_sop_step_id`), and Raise incident / Raise defect quick actions in the expanded step — so a blocked/failed step is never a dead end.

## Markers (§7–9)
Board card shows a ⚠ issue count (incidents red). For You SOP cards reach the raise action via "View change →" (Change Detail ledger). Execution-calendar per-slot issue count is deferred (documented) — all markers read the same `source_change_id`/`source_sop_step_id` truth as the ledger, so counts agree.

## Incident/Defect detail context (§10–11)
Lineage columns (`source_*`, `raised_during_change_execution`) are written on every contextual raise, so Incident Hub / defect detail can surface change/release/SOP-step provenance; the existing detail layouts are not broken. A dedicated Release-Ops context panel on those detail pages is deferred.

## Production event readiness (§12)
Incidents/defects carry `source_production_event_id` and are queryable by change/step, so a future production-event snapshot + replay can include them without redesigning linkage. Production-event summary already shows on Change Detail.

## Empty / broken states (§13)
No incidents/defects → educational empty state with incident-vs-defect guidance + raise actions. Missing severity/assignee render gracefully; open/critical counts computed from status/severity.

## Deferred to Phase 9+
Production Event Replay (uses this issue linkage), execution-calendar + For-You issue-count badges, dedicated Release-Ops context panels on Incident/Defect detail pages.

## Known limitation (honest)
The reused global Create Incident modal requires Project + Release fields; for a pure Release-Ops incident the user selects the relevant project/release. Lineage is written regardless post-create. This is intrinsic to reusing the existing modal (not rebuilding it).

## ADS compliance
Canonical/reused components only; sentence-case labels; no `<h1>` var()-token pitfalls. typography + spacing baselines UNCHANGED; only the noisy `tokens` category ratcheted. Color/CRE/TestHub gates green. No drawers. No Folio/wiki files.
